import React from 'react';


export class Streaming extends React.Component {

  render() {
    const streamingInfo = this.props.streaming === false ? '' :
      `- ${this.props.kbitsPerSec} kb/s - dropped frames: ${this.props.numDroppedFrames} / ${this.props.numTotalFrames}`

    return <div className='statusbar-group'>
      {/*streamingStarting: {String(this.props.streamingStarting)} -*/}
      {/*streamingStopping: {String(this.props.streamingStopping)} -*/}
      streaming: {String(this.props.streaming)} - {this.props.streamTimecode} {streamingInfo}
    </div>
  }
}
