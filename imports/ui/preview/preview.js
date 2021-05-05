import { Meteor } from 'meteor/meteor';
import { StateCollection, PREVIEW_STREAM_READY_KEY } from '../../api/state';

const mediasoup = require('mediasoup-client');
const EventEmitter = require('events');

// -----------------------------------------------------------------

// state change events
Meteor.subscribe('state', PREVIEW_STREAM_READY_KEY);

StateCollection.find({ key: PREVIEW_STREAM_READY_KEY }).observe({
  changed(newDoc, oldDoc) {
    if ( ! oldDoc.value && newDoc.value) {
      previewInstance.reset();
    }
  }
});

// -----------------------------------------------------------------

class Preview extends EventEmitter {

  constructor(resetOnLoad = false) {
    super();

    const instance = this;

    instance.device = new mediasoup.Device();
    instance.stream = null;
    instance.transport = null;
    instance.ready = false;
    instance.resetOnLoad = resetOnLoad;

    // connected event
    Meteor.call('getRouterRtpCapabilities', async (error, data) => {
      await instance.device.load({ routerRtpCapabilities: data });

      // auto-connect, consumers must be resumed
      if (instance.resetOnLoad) {
        this.reset();
      }
    });
  }

  // ------------------------------------------

  reset() {

    // cannot createRecvTransport() before device is loaded
    if ( ! this.device.loaded) {
      this.resetOnLoad = true;
      return;
    }

    // resources cleanup on reset
    if (this.transport) {
      this.transport.close();
    }

    Meteor.call('createConsumerTransport', { forceTcp: false }, async (error, data) => {
      this.stream = new MediaStream();
      this.transport = this.device.createRecvTransport(data);

      this.transport.on('connect', ({ dtlsParameters }, callback, errback) => {
        Meteor.call('connectConsumerTransport', {transportId: this.transport.id, dtlsParameters}, (error) => {
          error ? errback(error) : callback();
        });
      });

      this.transport.on('connectionstatechange', async (state) => {

        this.ready = false;

        switch (state) {
          case 'connected':
            // this.stream ready to be used as srcObject
            this.ready = true;

            break;

          case 'failed':
            this.transport.close();

            break;
        }

        this.emit('readyStateChange', this.ready);
      });

      await this.consume('Video');
      await this.consume('Audio');
    });
  }

  // ------------------------------------------

  setPaused(paused) {
    if ( ! this.ready) {
      throw new Meteor.Error("invalid state");
    }

    Meteor.call('setPaused', paused);
  }

  getStream() {
    return this.stream;
  }

  // ------------------------------------------

  async consume(kind) {
    const { rtpCapabilities } = this.device;

    Meteor.call(`consume${kind}`, { rtpCapabilities }, async (error, data) => {

      if (error) {
        console.error(error);
        return;
      }

      const consumer = await this.transport.consume({
        id: data.id,
        producerId: data.producerId,
        kind: data.kind,
        rtpParameters: data.rtpParameters
      });

      this.stream.addTrack(consumer.track);
    });
  }
}

// -----------------------------------------------------------------

export const previewInstance = new Preview();
