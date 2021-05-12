import React from 'react';


export class Recording extends React.Component {

  render() {
    return <div className='statusbar-group'>
      {/*recordingStarting: {String(this.props.recordingStarting)} -*/}
      {/*recordingStopping: {String(this.props.recordingStopping)} -*/}
      recording: {String(this.props.recording)} - {this.props.recordTimecode} -
      recordingPaused: {String(this.props.recordingPaused)}
    </div>
  }
}
