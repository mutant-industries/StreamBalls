import React from 'react';


export class Audio extends React.Component {

  render() {
    return <div className='statusbar-group float-start'>
      <span className={ 'status' }>
        VOL: { Math.round(this.props.backgroundAudioLevel * 100) }% - { Math.round(this.props.cameraAudioLevel * 100) }%
      </span>
    </div>
  }
}
