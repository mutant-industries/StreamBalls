import React from 'react';


export class Audio extends React.Component {

  render() {
    return <div className='statusbar-group'>
      backgroundAudioLevel: { this.props.backgroundAudioLevel.toFixed(2) } -
      cameraAudioLevel: {this.props.cameraAudioLevel.toFixed(2) }
    </div>
  }
}
