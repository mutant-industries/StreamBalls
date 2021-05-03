import { Meteor } from 'meteor/meteor';
import { StateCollection, PREVIEW_STREAM_READY_KEY } from '/imports/api/state';

const mediasoup = require('mediasoup');
const { exec } = require('child_process');
const grandiose = require('grandiose');
const config = require('./config');

// ----------------------------------------------------------------------------
let worker;
const producerResources = {};
const consumerResources = [];
let mediasoupRouter;

const AUDIO_SSRC = 1111;
const AUDIO_PT = 97;
const VIDEO_SSRC = 2222;
const VIDEO_PT = 96;

// ----------------------------------------------------------------------------

Meteor.publish('state', function (key) {
  return StateCollection.find({key});
});

const setPreviewStreamReady = Meteor.bindEnvironment((ready) => {
  const stateDoc = StateCollection.findOne({key: PREVIEW_STREAM_READY_KEY});

  StateCollection.update(stateDoc._id, {
    $set: { value: ready }
  });
});

Meteor.startup(() => {
  if (StateCollection.find({key: PREVIEW_STREAM_READY_KEY}).count() === 0) {
    StateCollection.insert({key: PREVIEW_STREAM_READY_KEY, value: false});
  }

  setPreviewStreamReady(false);
});

// ----------------------------------------------------------------------------

function ffmpegServiceReset() {
  console.log('calling ffmpegServiceReset');

  grandiose.find({
    showLocalSources: true
    // extraIPs: [ "192.168.87.9"]
  }, 30000)
    .then(async function (result) {
      for (const device of result) {
        if (device.name.match(/\(OBS\)/) !== null) {
          return ffmpegRun(device.name);
        }
      }

      console.log('no OBS NDI source found: ', result);

      ffmpegServiceReset();
    })
    .catch(function (err) {
      console.log('NDI find failed: ', err);
      // console.error(err);
      ffmpegServiceReset();
    });
}

async function ffmpegRun(ndiHost) {
  await createFfmpegProducers();

  const listenIps = config.mediasoup.webRtcTransport.listenIps[0];
  const ip = listenIps.announcedIp || listenIps.ip;

  const command = `ffmpeg -hide_banner 
        -init_hw_device qsv=hw -hwaccel qsv 
        -f libndi_newtek 
        -i "${ndiHost}"
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
        "[select=a:f=rtp:ssrc=${AUDIO_SSRC}:payload_type=${AUDIO_PT}]rtp://${ip}:${producerResources.audioParams.port}?rtcpport=${producerResources.audioParams.RTCP_port}|[select=v:f=rtp:ssrc=${VIDEO_SSRC}:payload_type=${VIDEO_PT}]rtp://${ip}:${producerResources.videoParams.port}?rtcpport=${producerResources.videoParams.RTCP_port}"`;

  const ffmpeg = exec(command.replace(/\n|\r/g, ''));

  console.log('----- ffmpeg started:');
  console.log(command);

  ffmpeg.stdout.on('data', function (data) {
    // console.log(data.toString());
  });

  ffmpeg.stderr.on('data', function (data) {
    // console.log(data.toString());
  });

  ffmpeg.on('exit', function (code) {
    console.log(`ffmpeg ended, exit code: ${code}`);

    setPreviewStreamReady(false);

    ffmpegServiceReset();
  });

  setPreviewStreamReady(true);
  // socketServer.emit('resumed');
}

(async () => {
  try {
    await runMediasoupWorker();
    ffmpegServiceReset();
  } catch (err) {
    console.error(err);
  }
})();

Meteor.onConnection(function (connection) {
  console.log(`client connected: ${connection.id}`);

  consumerResources[connection.id] = {};

  connection.onClose(function () {
    console.log(`client disconnected: ${connection.id}`);

    // resources cleanup on disconnect
    if (consumerResources[connection.id].consumerTransport && consumerResources[connection.id].consumerTransport.closed === false) {
      consumerResources[connection.id].consumerTransport.close();
    }

    delete consumerResources[connection.id];
  });
});

Meteor.methods({
  getRouterRtpCapabilities() {
    return mediasoupRouter.rtpCapabilities;
  },
  // --------------------------------
  async createConsumerTransport() {
    // this.unblock();

    try {
      const { transport, params } = await createWebRtcTransport();

      consumerResources[this.connection.id].consumerTransport = transport;
      return params;
    } catch (err) {
      console.error(err);

      return { error: err.message };
    }
  },
  async connectConsumerTransport(data) {
    // this.unblock();

    await consumerResources[this.connection.id].consumerTransport.connect({
      dtlsParameters: data.dtlsParameters
    });
  },
  async consumeAudio(data) {
    // this.unblock();

    if (producerResources.producerAudio && producerResources.producerPlainAudioTransport.closed === false) {
      return await createConsumer(this.connection.id,
        producerResources.producerAudio,
        data.rtpCapabilities);
    }
    else {
      return { error: 'wait for resumed event' };
    }
  },
  async consumeVideo(data) {
    // this.unblock();

    if (producerResources.producerVideo && producerResources.producerPlainVideoTransport.closed === false) {
      return await createConsumer(this.connection.id,
        producerResources.producerVideo,
        data.rtpCapabilities);
    }
    else {
      return { error: 'wait for resumed event' };
    }
  },
});

// ----------------------------------------------------------------------------

async function runMediasoupWorker() {
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
  mediasoupRouter = await worker.createRouter({ mediaCodecs });
}

async function createFfmpegProducers() {
  let transport;

  if (producerResources.producerPlainAudioTransport && producerResources.producerPlainAudioTransport.closed === false) {
    producerResources.producerPlainAudioTransport.close();
  }

  if (producerResources.producerPlainVideoTransport && producerResources.producerPlainVideoTransport.closed === false) {
    producerResources.producerPlainVideoTransport.close();
  }

  transport = await createPlainTransport();
  producerResources.producerPlainAudioTransport = transport.transport;
  producerResources.audioParams = transport.params;

  transport = await createPlainTransport();
  producerResources.producerPlainVideoTransport = transport.transport;
  producerResources.videoParams = transport.params;

  producerResources.producerAudio = await producerResources.producerPlainAudioTransport.produce({
    kind: 'audio',
    rtpParameters: {
      codecs: [
        {
          mimeType: 'audio/opus',
          payloadType: AUDIO_PT,
          clockRate: 48000,
          channels: 2
        }
      ],
      encodings: [
        {
          ssrc: AUDIO_SSRC
        }
      ]
    }
  });

  producerResources.producerVideo = await producerResources.producerPlainVideoTransport.produce({
    kind: 'video',
    rtpParameters: {
      codecs: [
        {
          mimeType: 'video/H264',
          payloadType: VIDEO_PT,
          clockRate: 90000,
          parameters:
                        {
                          'packetization-mode': 1,
                          'profile-level-id': '42e01f'
                        }
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

async function createWebRtcTransport() {
  const {
    initialAvailableOutgoingBitrate
  } = config.mediasoup.webRtcTransport;

  const transport = await mediasoupRouter.createWebRtcTransport({
    listenIps: config.mediasoup.webRtcTransport.listenIps,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate
  });

  return {
    transport,
    params: {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    }
  };
}

async function createPlainTransport() {
  const transport = await mediasoupRouter.createPlainTransport({
    listenIp: config.listenIp,
    // ffmpeg and gstreamer don't support RTP/RTCP multiplexing ("a=rtcp-mux" in SDP)
    rtcpMux: false,
    comedia: true,
    enableSctp: false
  });

  return {
    transport,
    params: {
      id: transport.id,
      ip: transport.tuple.localIp,
      port: transport.tuple.localPort,
      RTCP_port: transport.rtcpTuple.localPort
    }
  };
}

// ----------------------------------------------------------------------------

async function createConsumer(clientId, producer, rtpCapabilities) {
  if (!mediasoupRouter.canConsume({ producerId: producer.id, rtpCapabilities })) {
    console.error('can not consume');
    return {};
  }

  // closed on related consumerTransport close
  // reference required for pause / resume (?)
  let consumer;

  try {
    consumer = await consumerResources[clientId].consumerTransport.consume({
      producerId: producer.id,
      rtpCapabilities,
      paused: false// producer.kind === 'video',
    });
  } catch (error) {
    console.error('consume failed', error);
    return {};
  }

  return {
    producerId: producer.id,
    id: consumer.id,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters,
    type: consumer.type,
    producerPaused: consumer.producerPaused
  };
}
