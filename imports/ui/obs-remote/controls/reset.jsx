import React from 'react';
import { FlowRouter } from 'meteor/kadira:flow-router'
import {
  BACKGROUND_AUDIO_SOURCE_NAME,
  CAMERA_SOURCE_NAME,
  STATS_SOURCE_NAME,
  TEXT_SOURCE_NAME,
  READY_SCENE_NAME,
  START_SCENE_NAME
} from "../control.jsx";


export class Reset extends React.Component {

  handleResetToDefault() {
    this.props.obs.send('StopStreaming').catch((e) => {
      if (e.error !== 'streaming not active') {
        throw e;
      }
    });
    this.props.obs.send('StopRecording').catch((e) => {
      if (e.error !== 'recording not active') {
        throw e;
      }
    });

    this.props.obs.send('StopMedia', { sourceName: BACKGROUND_AUDIO_SOURCE_NAME });
    this.props.obs.send('SetVolume', { source: BACKGROUND_AUDIO_SOURCE_NAME, volume: 0 });
    this.props.obs.send('SetMute', { source: BACKGROUND_AUDIO_SOURCE_NAME, mute: false });
    this.props.obs.send('SetVolume', { source: CAMERA_SOURCE_NAME, volume: 0 });
    this.props.obs.send('SetMute', { source: CAMERA_SOURCE_NAME, mute: false });
    this.props.obs.send('SetCurrentScene', { "scene-name": START_SCENE_NAME });

    this.handleResetSources();

    this.props.obs.send('RefreshBrowserSource', { sourceName: TEXT_SOURCE_NAME });
    this.props.obs.send('RefreshBrowserSource', { sourceName: STATS_SOURCE_NAME });

    this.props.obs.send('SetSceneItemProperties', { 'scene-name': READY_SCENE_NAME,  item: TEXT_SOURCE_NAME, visible: true });
    this.props.obs.send('SetSceneItemProperties', { 'scene-name': START_SCENE_NAME,  item: TEXT_SOURCE_NAME, visible: true });
    this.props.obs.send('SetSceneItemProperties', { 'scene-name': READY_SCENE_NAME,  item: STATS_SOURCE_NAME, visible: false });
    this.props.obs.send('SetSceneItemProperties', { 'scene-name': START_SCENE_NAME,  item: STATS_SOURCE_NAME, visible: false });
  }

  handleStreamingKeyChange() {

    const newStreamingKey = prompt('Streaming key:');

    if ( ! newStreamingKey) {
      return;
    }

    this.props.obs.send('SetStreamSettings', {
      save: true,
      settings: {
        key: newStreamingKey
      }
    });
  }

  handleResetSources() {
    this.props.obs.send('SetSourceSettings', { sourceName: TEXT_SOURCE_NAME, sourceSettings: {
        css: "body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }",
        fps_custom: false,
        is_local_file: false,
        shutdown: false,
        url: location.origin + FlowRouter.path('/matches/:_id/text', { _id: this.props.match._id }),
        width: 1280
      }});

    this.props.obs.send('SetSourceSettings', { sourceName: STATS_SOURCE_NAME, sourceSettings: {
        css: "body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }",
        fps_custom: false,
        is_local_file: false,
        shutdown: false,
        url: location.origin + FlowRouter.path('/matches/:_id/stats', { _id: this.props.match._id }),
        width: 1280
      }});

    this.props.obs.send('GetSourceSettings', { sourceName: CAMERA_SOURCE_NAME })
      .then((data) => {

        this.props.obs.send('SetSourceSettings', {
          sourceName: CAMERA_SOURCE_NAME,
          sourceSettings: data.sourceSettings
        });
      });
  }

  // ------------------------------------------------------------

  render() {
    return <div className="btn-group m-1" role="group">
      <button type="button"
              onClick={() => this.handleResetToDefault()}
              disabled={ ! this.props.match}
              className='btn btn-secondary btn-dark'>
        <img src={`/icons/reset.png`} className='b-crossfade' alt='reset'/>
      </button>
      <button type="button"
              onClick={() => this.handleStreamingKeyChange()}
              className='btn btn-secondary btn-dark'>
        <img src={`/icons/streaming-key.png`} className='b-crossfade' alt='streaming-key'/>
      </button>
      <button type="button"
              disabled={ ! this.props.match}
              onClick={() => this.handleResetSources()}
              className='btn btn-secondary btn-dark reset-sources'>
        <img src={`/icons/reset-sources.png`} className='b-crossfade' alt='reset-sources'/>
      </button>
    </div>
  }
}
