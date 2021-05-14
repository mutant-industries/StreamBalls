import React from 'react';


export class OutputStatus extends React.Component {

  getStreamingInfo() {
    if ( ! this.props.streaming || this.props.streamingStopping) {
      return '';
    }

    return <span>
      {/*<span className='status'>Dropped: {this.props.numDroppedFrames} ({((this.props.numDroppedFrames / (this.props.numTotalFrames + 1)) * 100).toFixed(1) }%)</span>*/}
      <span className='status'>{this.props.kbitsPerSec} kb/s</span>
    </span>;
  }

  render() {
    let statusIconClassName = 'output-status-icon ' + ((this.props.streaming || this.props.recording) ? '' : 'no-output');

    if (this.props.streaming) {
      statusIconClassName += 'stream';
    }

    if (this.props.recording) {

      if (this.props.streaming) {
        statusIconClassName += '-';
      }

      statusIconClassName += 'rec';

      if (this.props.recordingPaused) {
        statusIconClassName += '-paused';
      }
    }

    return <div className='statusbar-group float-end'>
      { this.getStreamingInfo() }
      <span className='status'>LIVE: {this.props.streamTimecode}</span>
      <span className={statusIconClassName}/>
      <span className='status'>REC: {this.props.recordTimecode}</span>

    </div>
  }
}
