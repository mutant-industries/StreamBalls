import { Meteor } from 'meteor/meteor';
import { StateCollection, PREVIEW_STREAM_READY_KEY } from '../imports/api/state';

const mediasoup = require('mediasoup-client');

// -----------------------------------------------------------------

const $ = document.querySelector.bind(document);
const $fsSubscribe = $('#fs_subscribe');
const $btnSubscribe = $('#btn_subscribe');
const $txtConnection = $('#connection_status');
const $txtSubscription = $('#sub_status');

let device;

$btnSubscribe.addEventListener('click', subscribe);

$txtConnection.innerHTML = 'Connecting...';

// connected event
function connect() {
  $txtConnection.innerHTML = 'Connected';
  $fsSubscribe.disabled = false;

  Meteor.call('getRouterRtpCapabilities', async (error, data) => {
    device = new mediasoup.Device();

    await device.load({ routerRtpCapabilities: data });
  });
}

// state change events
Meteor.subscribe('state', PREVIEW_STREAM_READY_KEY);

StateCollection.find({ key: PREVIEW_STREAM_READY_KEY }).observe({
  changed(newDoc, oldDoc) {
    if (!oldDoc.value && newDoc.value) {
      subscribe();
    }
  }
});

// -----------------------------------------------------------------

function subscribe() {
  Meteor.call('createConsumerTransport', { forceTcp: false }, async (error, data) => {

    const transport = device.createRecvTransport(data);

    transport.on('connect', ({ dtlsParameters }, callback, errback) => {
      Meteor.call('connectConsumerTransport', {transportId: transport.id, dtlsParameters}, (error) => {
        error ? errback(error) : callback();
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

    Meteor.call('setPaused', false);
  });
}

async function consume(transport, kind, stream) {
  const { rtpCapabilities } = device;

  Meteor.call(`consume${kind}`, { rtpCapabilities }, async (error, data) => {

    if (error) {
      console.error(error);
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

// -----------------------------------------------------------------

document.addEventListener('DOMContentLoaded', (e) => {
  connect();
});
