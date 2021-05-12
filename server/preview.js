import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { StateCollection, PREVIEW_STREAM_READY_KEY } from '/imports/api/state';
import { config } from './config';

const mediasoup = require('mediasoup');
const { exec } = require('child_process');
const grandiose = require('grandiose');

// ----------------------------------------------------------------------------

const AUDIO_SSRC = 1111;
const AUDIO_PT = 97;
const VIDEO_SSRC = 2222;
const VIDEO_PT = 96;

let worker;
let router;
let ffmpeg;
const producer = {};
const clients = [];

// ----------------------------------------------------------------------------

Meteor.startup(async () => {
  // preview stream ready state
  if (StateCollection.find({ key: PREVIEW_STREAM_READY_KEY }).count() === 0) {
    StateCollection.insert({ key: PREVIEW_STREAM_READY_KEY, value: false });
  }

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
});

Meteor.publish('state', function (key) {
  check(key, String);

  return StateCollection.find({ key });
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
  getRouterRtpCapabilities() {
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

  const command = `ffmpeg -hide_banner 
        -init_hw_device qsv=hw -hwaccel qsv 
        -f libndi_newtek 
        -i "${ndiDevice.name}"
        -map 0:a:0 
        -c:a libopus -b:a 12k -vbr off 
        -application lowdelay -frame_duration 20 -apply_phase_inv false 
        -map 0:v:0 
        -c:v h264_qsv 
        -vf vpp_qsv=w=iw/2:h=ih/2 
        -r 30 -g 60 
        -b:v 1400K -minrate 1400K -maxrate 1400K -bufsize 50 
        -preset veryfast -profile:v baseline -look_ahead 0 
        -f tee 
        "[select=a:f=rtp:ssrc=${AUDIO_SSRC}:payload_type=${AUDIO_PT}]rtp://${ip}:${producer.audioTransport.tuple.localPort}?rtcpport=${producer.audioTransport.rtcpTuple.localPort}|[select=v:f=rtp:ssrc=${VIDEO_SSRC}:payload_type=${VIDEO_PT}]rtp://${ip}:${producer.videoTransport.tuple.localPort}?rtcpport=${producer.videoTransport.rtcpTuple.localPort}"`;

  ffmpeg = exec(command.replace(/\n|\r/g, ''));

  console.log('ffmpeg source:', ndiDevice, 'command:', command);

  ffmpeg.stdout.on('data', function (data) {
    // console.log(data.toString());
  });

  ffmpeg.stderr.on('data', function (data) {
    // console.log(data.toString());
  });

  ffmpeg.on('exit', function (code) {
    console.log(`ffmpeg ended, exit code: ${code}`);

    ffmpegServiceReset();
  });

  setPreviewStreamReady(true);
}

function ffmpegServiceReset() {
  console.log('calling ffmpegServiceReset');

  setPreviewStreamReady(false);

  grandiose.find({
    showLocalSources: true
    // extraIPs: [ "192.168.87.9"]
  }, 30000)
    .then(async (result) => {
      for (const device of result) {
        if (device.name.match(/\(OBS\)/) !== null) {
          return ffmpegRun(device);
        }
      }

      console.log('no OBS NDI source found', result);
      // avoid stack overflow
      setTimeout(ffmpegServiceReset, 0);
    })
    .catch((err) => {
      console.log('NDI find failed', err);
      // avoid stack overflow
      setTimeout(ffmpegServiceReset, 0);
    });
}

process.on('exit', () => {
  ffmpeg && process.kill(-ffmpeg.pid);
})

// ----------------------------------------------------------------------------

async function createWebRtcTransport() {
  return router.createWebRtcTransport({
    listenIps: config.mediasoup.webRtcTransport.listenIps,
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
