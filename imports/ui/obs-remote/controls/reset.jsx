import React from 'react';
import { FlowRouter } from 'meteor/kadira:flow-router'
import { ABOUT_SOURCE_NAME, BACKGROUND_AUDIO_SOURCE_NAME, CAMERA_SOURCE_NAME, START_SCENE_NAME } from "../control.jsx";


export class Reset extends React.Component {

  handleResetToDefault() {
    this.props.obs.send('StopStreaming');
    this.props.obs.send('StopRecording');
    this.props.obs.send('StopMedia', { sourceName: BACKGROUND_AUDIO_SOURCE_NAME });
    this.props.obs.send('SetVolume', { source: BACKGROUND_AUDIO_SOURCE_NAME, volume: 0 });
    this.props.obs.send('SetMute', { source: BACKGROUND_AUDIO_SOURCE_NAME, mute: false });
    this.props.obs.send('SetVolume', { source: CAMERA_SOURCE_NAME, volume: 0 });
    this.props.obs.send('SetMute', { source: CAMERA_SOURCE_NAME, mute: false });
    this.props.obs.send('SetCurrentScene', { "scene-name": START_SCENE_NAME });

    this.handleResetSources();
  }

  handleResetSources() {
    this.props.obs.send('SetSourceSettings', { sourceName: ABOUT_SOURCE_NAME, sourceSettings: {
        css: "body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }",
        fps_custom: false,
        is_local_file: false,
        shutdown: false,
        // TODO jebator
        url: location.origin + FlowRouter.path('/matches/:_id/about', { _id: this.props.matchId }),
        width: 1280
      }});

    this.props.obs.send('GetSourceSettings', { sourceName: CAMERA_SOURCE_NAME })
      .then((data) => {

        console.log('GetSourceSettings', data);

        this.props.obs.send('SetSourceSettings', {
          sourceName: CAMERA_SOURCE_NAME,
          sourceSettings: data.sourceSettings
        });
      });
  }

  handleResetPreviewEncoder() {
    Meteor.call('resetFfmpegService');
  }

  // ------------------------------------------------------------

  render() {
    return <div className="btn-group m-1" role="group">
      <button type="button"
             onClick={() => this.handleResetToDefault()}
              className='btn btn-secondary btn-dark'>
        reset
      </button>
      <button type="button"
              onClick={() => this.handleResetSources()}
              className='btn btn-secondary btn-dark'>
        - sources
      </button>
      <button type="button"
              onClick={() => this.handleResetPreviewEncoder()}
              className='btn btn-secondary btn-dark'>
        - preview
      </button>
    </div>
  }
}
