import React from 'react';
import { BACKGROUND_AUDIO_SOURCE_NAME } from "../control.jsx";


export class BackgroundAudio extends React.Component {

  previousTrack() {
    this.props.obs.send('PreviousMedia', { sourceName: BACKGROUND_AUDIO_SOURCE_NAME });
  }

  nextTrack() {
    this.props.obs.send('NextMedia', { sourceName: BACKGROUND_AUDIO_SOURCE_NAME });
  }

  togglePlay() {
    this.props.obs.send('PlayPauseMedia', {
      sourceName: BACKGROUND_AUDIO_SOURCE_NAME,
      playPause: this.props.backgroundAudioPlaying
    });
  }

  // ------------------------------------------------------------

  render() {
    return <div className="btn-group m-1" role="group">
      <button type="button"
              onClick={() => this.previousTrack()}
              className='btn btn-secondary btn-dark'>
        &#x23EE;
      </button>
      <button type="button"
              onClick={() => this.togglePlay()}
              className='btn btn-secondary btn-dark'>
        { this.props.backgroundAudioPlaying ? '\u23F8' : '\u23F5' }
      </button>
      <button type="button"
              onClick={() => this.nextTrack()}
              className='btn btn-secondary btn-dark'>
        &#x23ED;
      </button>
    </div>
  }
}
