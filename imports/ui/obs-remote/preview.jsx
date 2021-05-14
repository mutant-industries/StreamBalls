import React from 'react';
import { previewInstance } from "./preview.js";
import './preview.scss'

export class Preview extends React.Component {

  componentDidMount() {
    previewInstance.on("readyStateChange", (ready) => {
      if (ready) {
        this.video.srcObject = previewInstance.getStream();
      }
    });

    // reset and wait for ready
    previewInstance.reset();
  }

  componentWillUnmount() {
    clearInterval(this.updateInterval);
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
