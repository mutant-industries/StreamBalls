import {Meteor} from 'meteor/meteor';
import {StateCollection, PREVIEW_STREAM_READY_KEY} from '../imports/api/state';

const mediasoup = require('mediasoup-client');

let device;

const $ = document.querySelector.bind(document);
const $fsSubscribe = $('#fs_subscribe');
const $btnSubscribe = $('#btn_subscribe');
const $txtConnection = $('#connection_status');
const $txtSubscription = $('#sub_status');

$btnSubscribe.addEventListener('click', subscribe);

$txtConnection.innerHTML = 'Connecting...';

// connected event
async function connect() {
  $txtConnection.innerHTML = 'Connected';
  $fsSubscribe.disabled = false;

  Meteor.call('getRouterRtpCapabilities', async function (error, data) {
    console.log('caps data: ', data);

    await loadDevice(data);
  });
}

// state change events
Meteor.subscribe('state', PREVIEW_STREAM_READY_KEY);

StateCollection.find({key: PREVIEW_STREAM_READY_KEY}).observe({
  changed(newDoc, oldDoc) {
    console.log('state changed event: ', newDoc, oldDoc);

    if (newDoc.value) {
      subscribe();
    }
  }
});

// -----------------------------------------------------------------

async function loadDevice(routerRtpCapabilities) {
  try {
    device = new mediasoup.Device();
  } catch (error) {
    if (error.name === 'UnsupportedError') {
      console.error('browser not supported');
    }
  }

  await device.load({ routerRtpCapabilities });
}

async function subscribe() {
  Meteor.call('createConsumerTransport', {forceTcp: false}, async function (error, data) {

    if (error || data.error) {
      console.error(data.error);
      return;
    }

    console.log('createRecvTransport ted: ', data);

    const transport = device.createRecvTransport(data);

    transport.on('connect', ({ dtlsParameters }, callback, errback) => {
      Meteor.call('connectConsumerTransport', {transportId: transport.id, dtlsParameters}, function (error) {
        callback();
      });
    });

    transport.on('connectionstatechange', async (state) => {
      console.log(`connectionstatechange: ${state}`);

      switch (state) {
        case 'connecting':
          $txtSubscription.innerHTML = 'subscribing...';
          $fsSubscribe.disabled = true;
          break;

        case 'connected':
          document.querySelector('#remote_video').srcObject = await stream;
          $txtSubscription.innerHTML = 'subscribed';
          $fsSubscribe.disabled = true;
          break;

        case 'failed':
          transport.close();
          $txtSubscription.innerHTML = 'failed';
          $fsSubscribe.disabled = false;
          break;

        default:
          break;
      }
    });

    const stream = new MediaStream();

    await consume(transport, 'Video', stream);
    await consume(transport, 'Audio', stream);
  });
}

async function consume(transport, k, stream) {
  const { rtpCapabilities } = device;

  Meteor.call(`consume${k}`, { rtpCapabilities }, async function (error, data) {

    if (data.error) {
      console.error(data.error);
      return;
    }

    const consumer = await transport.consume({
      id: data.id,
      producerId: data.producerId,
      kind: data.kind,
      rtpParameters: data.rtpParameters
    });

    stream.addTrack(consumer.track);
  });

}


document.addEventListener('DOMContentLoaded', function (e) {
  connect();
});
