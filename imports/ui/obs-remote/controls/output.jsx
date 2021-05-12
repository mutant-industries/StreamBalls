import React from 'react';


export class Output extends React.Component {

  toggleStreaming() {
    this.props.obs.send('StartStopStreaming');
  }

  toggleRecording() {
    // recording pause / resume not supported
    this.props.obs.send('StartStopRecording');
  }

  // ------------------------------------------------------------

  render() {
    return <div className="btn-group m-1" role="group">
      <button type="button"
              onClick={() => this.toggleStreaming()}
              disabled={ this.props.streamingStarting || this.props.streamingStopping }
              className='btn btn-secondary btn-dark'>
        { this.props.streaming ? 'stop streaming' : 'stream' }
      </button>
      <button type="button"
              onClick={() => this.toggleRecording()}
              disabled={ this.props.recordingStarting || this.props.recordingStopping }
              className='btn btn-secondary btn-dark'>
        { this.props.recording ? 'stop recording' : 'record' }
      </button>
    </div>
  }
}
