import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker'
import React from 'react';
import { previewInstance } from "./preview.js";
import './preview.scss'

export class Preview extends React.Component {

  componentDidMount() {
    const instance = this;

    // DDP client connected status
    this.connected = false;
    this.stateTracker = null;

    previewInstance.on("readyStateChange", (ready) => {
      if (ready) {
        this.video.srcObject = previewInstance.getStream();
      }
    });

    this.stateTracker = Tracker.autorun(() => {
      // workaround, DDP.onReconnect() cannot be unregistered
      if ( ! instance.connected && Meteor.status().connected) {
        // reset and wait for ready
        previewInstance.reset();
      }

      instance.connected = Meteor.status().connected;
    });
  }

  componentWillUnmount() {
    this.stateTracker.stop();
  }

  shouldComponentUpdate() {
    return false;
  }

  render() {
    return (
      <video id="remote_video" className='ratio-16x9'
             ref={video => { this.video = video }}
             controls
             playsInline
             onPause={() => previewInstance.setPaused(true)}
             onPlay={() => previewInstance.setPaused(false)}/>
    );
  }
}
