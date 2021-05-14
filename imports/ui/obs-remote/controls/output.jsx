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
              className={`btn stream btn-secondary ${this.props.streaming ? 'btn-light' : 'btn-dark'}`}>
        <img src={`/icons/go-live${this.props.streaming ? '-active' : ''}.png`} className='b-crossfade' alt='stream'/>
      </button>
      <button type="button"
              onClick={() => this.toggleRecording()}
              disabled={ this.props.recordingStarting || this.props.recordingStopping }
              className={`btn btn-secondary ${this.props.recording ? 'btn-light' : 'btn-dark'}`}>
        <img src={`/icons/record${this.props.recording ? '-active' : ''}.png`} className='b-crossfade' alt='stream'/>
      </button>
    </div>
  }
}
