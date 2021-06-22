import React from 'react';
import { BACKGROUND_AUDIO_SOURCE_NAME, BACKGROUND_AUDIO_MAX_VOLUME, CAMERA_SOURCE_NAME } from "../control.jsx";

const VOLUME_UPDATE_INTERVAL = 800;  // [ms]


export class AudioCrossfade extends React.Component {

  componentDidMount() {
    this.active = false;
    this.updateInterval = null;
    this.step = 1;  // [%]
  }

  componentWillUnmount() {
    clearInterval(this.updateInterval);
  }

  // ------------------------------------------------------------

  handleClick() {

    if (this.active) {
      this.step++;
      return;
    }

    const instance = this;

    this.active = true;
    this.initialCall = true;
    this.step = 1;
    this.directionToCamera = this.props.backgroundAudioLevel > this.props.cameraAudioLevel;

    this.updateInterval = setInterval(() => {

      let backgroundAudioLevel = instance.props.backgroundAudioLevel;
      let cameraAudioLevel = instance.props.cameraAudioLevel;

      // finished check
      if ( ! instance.initialCall && (backgroundAudioLevel === 0 && cameraAudioLevel === 1
          || backgroundAudioLevel === BACKGROUND_AUDIO_MAX_VOLUME && cameraAudioLevel === 0)) {

        clearInterval(instance.updateInterval);

        instance.active = false;
      }

      instance.initialCall = false;

      if (this.directionToCamera) {
        backgroundAudioLevel -= instance.step / 100;
        cameraAudioLevel += instance.step * (1 / BACKGROUND_AUDIO_MAX_VOLUME) / 100;

        backgroundAudioLevel = Math.max(backgroundAudioLevel, 0);
        cameraAudioLevel = Math.min(cameraAudioLevel, 1);
      }
      else {
        cameraAudioLevel -= instance.step * (1 / BACKGROUND_AUDIO_MAX_VOLUME) / 100;
        backgroundAudioLevel += instance.step / 100;

        cameraAudioLevel = Math.max(cameraAudioLevel, 0);
        backgroundAudioLevel = Math.min(backgroundAudioLevel, BACKGROUND_AUDIO_MAX_VOLUME);
      }

      instance.props.obs.send('SetVolume', { source: BACKGROUND_AUDIO_SOURCE_NAME, volume: backgroundAudioLevel })
        .catch((e) => {
          console.error('crossfade SetVolume error', e);
          // avoid interval running until forever when disconnected
          clearInterval(instance.updateInterval);
        });

      instance.props.obs.send('SetVolume', { source: CAMERA_SOURCE_NAME, volume: cameraAudioLevel })
        .catch((e) => {
          console.error('crossfade SetVolume error', e);
          // avoid interval running until forever when disconnected
          clearInterval(instance.updateInterval);
        });

    }, VOLUME_UPDATE_INTERVAL);
  }

  // ------------------------------------------------------------

  render() {
    return <div className="btn-group m-1" role="group">
      <button type="button"
              onClick={() => this.handleClick()}
              className='btn btn-secondary btn-dark'>
        <img src='/icons/crossfade.png' className='b-crossfade' alt='crossfade'/>
      </button>
    </div>
  }
}
