import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { StateCollection, PREVIEW_STREAM_ACTIVE_KEY, PREVIEW_STREAM_READY_KEY } from '/imports/api/state';
import { config } from './config';

const ni = require('network-interfaces');
const mediasoup = require('mediasoup');
const os = require('os');
const { spawn } = require('child_process');

// ----------------------------------------------------------------------------

const AUDIO_SSRC = 1111;
const AUDIO_PT = 97;
const VIDEO_SSRC = 2222;
const VIDEO_PT = 96;

let worker;
let router;
let ffmpeg;
let started;
const producer = {};
const clients = [];

// start OBS preview encoder only when active
let ffmpegServiceActive;

// ----------------------------------------------------------------------------

let ffmpeg_accel_device_params = [`-init_hw_device`, `qsv=hw`, `-hwaccel`, `qsv`];
let ffmpeg_encoder_params = [`-map`, `0:a:0`,
  `-c:a`, `libopus`, `-b:a`, `12k`, `-vbr`, `off`,
  `-application`, `lowdelay`, `-frame_duration`, `20`, `-apply_phase_inv`, `false`,
  `-map`, `0:v:0`,
  `-c:v`, `h264_qsv`,
  `-vf`, `hwupload=extra_hw_frames=64,vpp_qsv=w=iw/2:h=ih/2`,
  `-r`, `30`, `-g`, `60`,
  `-b:v`, `1400K`, `-minrate`, `1400K`, `-maxrate`, `1400K`, `-bufsize`, `50`,
  `-preset`, `veryfast`, `-profile:v`, `baseline`, `-look_ahead`, `0`];

if (os.platform() === "linux") {
  ffmpeg_accel_device_params = [`-init_hw_device`, `vaapi=acce:/dev/dri/renderD128`, `-hwaccel`, `vaapi`,
    `-hwaccel_output_format`, `vaapi`, `-hwaccel_device`, `acce`, `-filter_hw_device`, `acce`];
  ffmpeg_encoder_params = [`-map`, `0:a:0`,
    `-c:a`, `libopus`, `-b:a`, `12k`, `-vbr`, `off`,
    `-application`, `lowdelay`, `-frame_duration`, `20`, `-apply_phase_inv`, `false`,
    `-map`, `0:v:0`,
    `-c:v`, `h264_vaapi`,
    `-vf`, `hwupload,scale_vaapi=w=iw/2:h=ih/2:format=nv12`,
    `-r`, `30`, `-g`, `60`,
    `-rc_mode`, `CQP`, `-profile:v`, `constrained_baseline`,
    `-level`, `4.0`, `-qp:v`, `32`, `-bf`, `0`];
}

// ----------------------------------------------------------------------------

Meteor.startup(async () => {

  started = new Promise(async (resolve) => {
    // preview stream active state
    if (StateCollection.find({ key: PREVIEW_STREAM_ACTIVE_KEY }).count() === 0) {
      StateCollection.insert({ key: PREVIEW_STREAM_ACTIVE_KEY, value: true });
    }

    // preview stream ready state
    if (StateCollection.find({ key: PREVIEW_STREAM_READY_KEY }).count() === 0) {
      StateCollection.insert({ key: PREVIEW_STREAM_READY_KEY, value: false });
    }

    ffmpegServiceActive = StateCollection.findOne({ key: PREVIEW_STREAM_ACTIVE_KEY }).value;

    // mediasoup worker, router
    worker = await mediasoup.createWorker({
      logLevel: config.mediasoup.worker.logLevel,
      logTags: config.mediasoup.worker.logTags,
      rtcMinPort: config.mediasoup.worker.rtcMinPort,
      rtcMaxPort: config.mediasoup.worker.rtcMaxPort
    });

    worker.on('died', () => {
      console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
      setTimeout(() => process.exit(1), 2000);
    });

    const { mediaCodecs } = config.mediasoup.router;

    router = await worker.createRouter({ mediaCodecs });

    // encoder start
    ffmpegServiceReset();

    resolve();
  });
});

Meteor.publish('state', function (key) {
  check(key, String);

  return StateCollection.find({ key });
});

const togglePreviewStreamActive = Meteor.bindEnvironment(() => {
  const stateDoc = StateCollection.findOne({ key: PREVIEW_STREAM_ACTIVE_KEY });

  StateCollection.update(stateDoc._id, {
    $set: { value: ! stateDoc.value }
  });

  return ! stateDoc.value;
});

const setPreviewStreamReady = Meteor.bindEnvironment((ready) => {
  const stateDoc = StateCollection.findOne({ key: PREVIEW_STREAM_READY_KEY });

  StateCollection.update(stateDoc._id, {
    $set: { value: ready }
  });
});

// ----------------------------------------------------------------------------

Meteor.onConnection(function (connection) {
  console.log(`client connected: ${connection.id}`);

  clients[connection.id] = { consumers: {} };

  connection.onClose(function () {
    console.log(`client disconnected: ${connection.id}`);

    // resources cleanup on disconnect
    if (clients[connection.id].transport) {
      clients[connection.id].transport.close();
    }

    delete clients[connection.id];
  });
});

Meteor.methods({
  async getRouterRtpCapabilities() {
    await started;

    return router.rtpCapabilities;
  },
  // --------------------------------
  async createConsumerTransport() {
    // this.unblock();

    // resources cleanup on reset
    if (clients[this.connection.id].transport) {
      clients[this.connection.id].transport.close();
    }

    const transport = await createWebRtcTransport();

    clients[this.connection.id].transport = transport;

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    };
  },
  async connectConsumerTransport(data) {
    // this.unblock();

    await clients[this.connection.id].transport.connect({
      dtlsParameters: data.dtlsParameters
    });
  },
  async consumeAudio(data) {
    // this.unblock();

    if ( ! producer.audio || producer.audioTransport.closed) {
      throw new Meteor.Error('wait for resumed event');
    }

    const consumer = await createConsumer(this.connection.id, producer.audio.id, data.rtpCapabilities);

    return {
      producerId: producer.audio.id,
      id: consumer.id,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters
    };
  },
  async consumeVideo(data) {
    // this.unblock();

    if ( ! producer.video || producer.videoTransport.closed) {
      throw new Meteor.Error('wait for resumed event');
    }

    const consumer = await createConsumer(this.connection.id, producer.video.id, data.rtpCapabilities);

    return {
      producerId: producer.video.id,
      id: consumer.id,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters
    };
  },
  async setPaused(paused) {
    // this.unblock();
    check(paused, Boolean);

    Object.values(clients[this.connection.id].consumers).forEach((consumer) => {
      paused ? consumer.pause() : consumer.resume();
    });
  },
  toggleFfmpegService() {
    ffmpegServiceActive = togglePreviewStreamActive();

    ffmpegServiceReset();
  }
});

// ----------------------------------------------------------------------------

async function createPlainTransport() {
  return router.createPlainTransport({
    listenIp: config.mediasoup.plainTransport.listenIp,
    // ffmpeg and gstreamer don't support RTP/RTCP multiplexing ("a=rtcp-mux" in SDP)
    rtcpMux: false,
    comedia: true,
    enableSctp: false
  });
}

async function createFfmpegProducers() {
  const { mediaCodecs } = config.mediasoup.router;

  if (producer.audioTransport) {
    producer.audioTransport.close();
  }

  if (producer.videoTransport) {
    producer.videoTransport.close();
  }

  producer.audioTransport = await createPlainTransport();
  producer.videoTransport = await createPlainTransport();

  producer.audio = await producer.audioTransport.produce({
    kind: 'audio',
    rtpParameters: {
      codecs: [
        {
          mimeType: mediaCodecs[0].mimeType,
          clockRate: mediaCodecs[0].clockRate,
          channels: mediaCodecs[0].channels,
          payloadType: AUDIO_PT
        }
      ],
      encodings: [
        {
          ssrc: AUDIO_SSRC
        }
      ]
    }
  });

  producer.video = await producer.videoTransport.produce({
    kind: 'video',
    rtpParameters: {
      codecs: [
        {
          mimeType: mediaCodecs[1].mimeType,
          clockRate: mediaCodecs[1].clockRate,
          parameters: mediaCodecs[1].parameters,
          payloadType: VIDEO_PT
        }
      ],
      encodings: [
        {
          ssrc: VIDEO_SSRC
        }
      ]
    }
  });
}

// ----------------------------------------------------------------------------

async function ffmpegRun(ndiDevice) {
  await createFfmpegProducers();

  const ip = config.mediasoup.plainTransport.listenIp;

  ffmpeg = spawn(`ffmpeg`, [`-hide_banner`,
    ...ffmpeg_accel_device_params, `-f`, `libndi_newtek`, `-i`, `${ndiDevice}`,  ...ffmpeg_encoder_params,
    `-f`, `tee`,
    `[select=a:f=rtp:ssrc=${AUDIO_SSRC}:payload_type=${AUDIO_PT}]rtp://${ip}:${producer.audioTransport.tuple.localPort}?rtcpport=${producer.audioTransport.rtcpTuple.localPort}|[select=v:f=rtp:ssrc=${VIDEO_SSRC}:payload_type=${VIDEO_PT}]rtp://${ip}:${producer.videoTransport.tuple.localPort}?rtcpport=${producer.videoTransport.rtcpTuple.localPort}`
  ]);

  console.log('ffmpeg source:', ndiDevice, 'PID:', ffmpeg.pid);

  const ffmpegLog = (data) => {
    const logLine = data.toString();

    // filter out standard FFMPEG output
    if (logLine.match(/^\s*(frame=\s*(.+?))\s+(fps=\s*(.+?))\s+(q=\s*(.+?))\s+(size=\s*(.+?))\s+(time=\s*(.+?))\s+(bitrate=\s*(.+?))\s+(dup=\s*(.+?))\s+(drop=\s*(.+?))\s+(speed=\s*(.+?))\s*$/)
        || logLine.match(/^\s*$/)) {
      return;
    }

    console.log(logLine.trimEnd());
  };

  ffmpeg.stdout.on('data', ffmpegLog);
  ffmpeg.stderr.on('data', ffmpegLog);

  ffmpeg.on('exit', function (code, signal) {
    console.log(`ffmpeg ended, exit code: ${code}, signal: ${signal}`);

    if (ffmpegServiceActive) {
      setTimeout(() => ffmpegServiceReset(), 500);
    }
  });

  setPreviewStreamReady(true);
}

function ffmpegServiceReset() {
  console.log('calling ffmpegServiceReset, ffmpegServiceActive: ' + ffmpegServiceActive);

  setPreviewStreamReady(false);
  let deviceFound = false;

  if ( ! ffmpegServiceActive) {
    ffmpeg && ffmpeg.kill('SIGKILL');

    return;
  }

  const ffmpeg_ndi_lookup = spawn(`ffmpeg`, [`-f`, `libndi_newtek`, `-find_sources`, `1`, `-i`, `dummy`]);

  const ffmpegOutputHandle = (data) => {
    const logLine = data.toString();

    const pattern = new RegExp(/[a-zA-Z0-9_-]+\s*\(OBS\)/);

    if (pattern.test(logLine)) {
      deviceFound = true;
      ffmpegRun(pattern.exec(logLine)[0]);
    }
  };

  ffmpeg_ndi_lookup.stdout.on('data', ffmpegOutputHandle);
  ffmpeg_ndi_lookup.stderr.on('data', ffmpegOutputHandle);

  ffmpeg_ndi_lookup.on('exit', (exitCode) => {
    if ( ! deviceFound) {
      setTimeout(() => ffmpegServiceReset(), 500);
    }
  });
}

process.on('exit', () => {
  ffmpeg && ffmpeg.kill('SIGKILL');
})

// ----------------------------------------------------------------------------

async function createWebRtcTransport() {

  const listenIps = [];
  const niOptions = { internal: false, ipVersion: 4 };

  ni.getInterfaces(niOptions).forEach((iface) => {
    ni.toIps(iface, niOptions).forEach((ip) => {
      listenIps.push({ ip, announcedIp: null });
    });
  });

  return router.createWebRtcTransport({
    listenIps,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true
  });
}

async function createConsumer(clientId, producerId, rtpCapabilities) {
  if ( ! router.canConsume({ producerId, rtpCapabilities })) {
    throw new Meteor.Error('can not consume');
  }

  // consumer closed on clients[clientId].transport.close()
  const consumer = await clients[clientId].transport.consume({
    producerId,
    rtpCapabilities,
    paused: true
  });

  return clients[clientId].consumers[consumer.kind] = consumer;
}
