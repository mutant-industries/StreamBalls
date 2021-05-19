import React from 'react';
import OBSWebSocket from 'obs-websocket-js';
import { TimeUpdater } from "./time-updater.js";
import './control.scss';
// controls
import { AudioCrossfade } from './controls/audio-crossfade.jsx';
import { BackgroundAudio } from './controls/background-audio.jsx';
import { Output } from './controls/output.jsx';
import { Reset } from './controls/reset.jsx';
import { SceneList } from './controls/scene-list.jsx';
import { Stats } from './controls/stats.jsx';
// statusbar
import { Audio } from './status/audio.jsx';
import { Connection } from './status/connection.jsx';
import { Encoder } from './status/encoder.jsx';
import { OutputStatus } from './status/output-status.jsx';

// ----------------------------------------------------------------------------

const RECONNECT_RETRY_TIMEOUT = 2000;  // [ms]
const STATS_UPDATE_TIMEOUT = 1000;  // [ms]
const ZERO_TIMECODE = '00:00:00';

export const BACKGROUND_AUDIO_SOURCE_NAME = 'background audio';
export const CAMERA_SOURCE_NAME = 'OBS camera';
export const TEXT_SOURCE_NAME = 'text';
export const START_SCENE_NAME = 'start';

export const BACKGROUND_AUDIO_MAX_VOLUME = 0.6; // * 100 [%]

const DEFAULT_STATE = {
  connected: false,
  settingsValid: true, // expected sources check
  // recording
  recording: false,
  recordingStarting: false,
  recordingStopping: false,
  recordingPaused: false,
  recordTimecode: ZERO_TIMECODE,
  // streaming
  streaming: false,
  streamingStarting: false,
  streamingStopping: false,
  kbitsPerSec: 0,
  numDroppedFrames: 0,
  numTotalFrames: 0,
  streamTimecode: ZERO_TIMECODE,
  // stats
  fps: 0,
  renderMissedFrames: 0,   // frames missed due to rendering lag
  renderTotalFrames: 0,
  outputSkippedFrames: 0,   // frames skipped due to encoding lag
  outputTotalFrames: 0,
  cpuUsage: 0,
  memoryUsage: 0,
  // ui
  backgroundAudioPlaying: false,
  backgroundAudioLevel: 0,
  cameraAudioLevel: 0,
  sceneList: [],
  currentScene: '',
  transitionRunning: false
}

// ----------------------------------------------------------------------------

export class Control extends React.Component {

  constructor(props) {
    super(props);

    this.state = DEFAULT_STATE;

    this.obs = new OBSWebSocket();

    this.reconnectTimeout = null;
    this.statsUpdateTimeout = null;
    this.updateBackgroundAudioStateTimeout = null;

    this.streamingTimeUpdater = new TimeUpdater(this, 'streamTimecode');
    this.recordingTimeUpdater = new TimeUpdater(this, 'recordTimecode');
  }

  // ------------------------------------------------------------

  obsValidateSettings() {

    this.setState({ settingsValid: true });

    this.obs.send('GetSceneList').then((data) => {

      const expectedScenes = [START_SCENE_NAME];
      let expectedScenesNo = expectedScenes.length;

      data.scenes.forEach(value => {
        if (expectedScenes.indexOf(value.name) !== -1) {
          expectedScenesNo--;
        }
      });

      this.setState({
        currentScene: data.currentScene,
        sceneList: data.scenes,
        settingsValid: this.state.settingsValid && expectedScenesNo === 0
      });

      if (expectedScenesNo) {
        console.error(`One of expected scenes (${expectedScenes.join(', ')}) was not found.`, data.scenes);
      }
    });

    this.obs.send('GetSourcesList').then((data) => {
      const expectedSources = [BACKGROUND_AUDIO_SOURCE_NAME, CAMERA_SOURCE_NAME, TEXT_SOURCE_NAME];
      let expectedSourcesNo = expectedSources.length;

      data.sources.forEach(value => {
        if (expectedSources.indexOf(value.name) !== -1) {
          expectedSourcesNo--;
        }
      });

      this.setState({ settingsValid: this.state.settingsValid && expectedSourcesNo === 0 });

      if (expectedSourcesNo) {
        console.error(`One of expected sources (${expectedSources.join(', ')}) was not found.`, data.sources);
      }
    });
  }

  obsConnectionReset() {
    const instance = this;

    this.streamingTimeUpdater.stop();
    this.recordingTimeUpdater.stop();

    this.setState(DEFAULT_STATE);

    this.obs.connect({ address: 'smallballs.local:4444', password: 'soboss' })
      .then(() => {

        this.setState({ connected: true });

        // ----------------------------------------------
        // --- stats - 1 second update interval

        const updateStats = () => {
          this.obs.send('GetStats')
            .then((data) => {

              this.setState({
                fps: data.stats.fps.toFixed(2),
                renderTotalFrames: data.stats['render-total-frames'],
                renderMissedFrames: data.stats['render-missed-frames'],
                outputTotalFrames: data.stats['output-total-frames'],
                outputSkippedFrames: data.stats['output-skipped-frames'],
                cpuUsage: data.stats['cpu-usage'].toFixed(2),
                memoryUsage: data.stats['memory-usage'].toFixed(0)
              });

              this.statsUpdateTimeout = setTimeout(updateStats, STATS_UPDATE_TIMEOUT);
            })
            .catch((e) => {
              // --- duplicated code ---
              this.setState({ connected: false });

              console.error('GetStats error', e);

              this.reconnectTimeout = setTimeout(() =>{
                instance.obsConnectionReset()
              }, RECONNECT_RETRY_TIMEOUT);
              // --- duplicated code ---
            });
        }

        updateStats();

        // ----------------------------------------------
        // --- streaming events, initial state

        this.obs.on('StreamStarting', () => {
          this.setState({ streamingStarting: true });
        });

        this.obs.on('StreamStarted', () => {
          this.streamingTimeUpdater.start();
          this.setState({ streamingStarting: false });
        });

        this.obs.on('StreamStopping', () => {
          this.setState({ streamingStopping: true });
        });

        this.obs.on('StreamStopped', () => {
          this.streamingTimeUpdater.stop();
          this.setState({ streamingStopping: false, streaming: false, streamTimecode: ZERO_TIMECODE });
        });

        // sent once every 2 secs when streaming
        this.obs.on('StreamStatus', (data) => {

          this.streamingTimeUpdater.start(data.streamTimecode);

          this.setState({
            streaming: data.streaming,
            kbitsPerSec: data.kbitsPerSec,
            numDroppedFrames: data.numDroppedFrames,
            numTotalFrames: data.numTotalFrames
          })
        });

        this.obs.send('GetStreamingStatus').then((data) => {
          if (data.streaming) {
            this.streamingTimeUpdater.start(data.streamTimecode);
          }

          this.setState({ streaming: data.streaming });
        });

        // ----------------------------------------------
        // --- recording events, initial state

        this.obs.on('RecordingStarting', () => {
          this.setState({ recordingStarting: true });
        });

        this.obs.on('RecordingStarted', () => {
          this.recordingTimeUpdater.start();
          this.setState({ recording: true, recordingPaused: false, recordingStarting: false });
        });

        this.obs.on('RecordingStopping', () => {
          this.setState({ recordingStopping: true });
        });

        this.obs.on('RecordingStopped', () => {
          this.recordingTimeUpdater.stop();
          this.setState({ recording: false, recordingPaused: false, recordTimecode: ZERO_TIMECODE, recordingStopping: false });
        });

        this.obs.on('RecordingPaused', () => {
          this.recordingTimeUpdater.pause();
          this.setState({ recording: true, recordingPaused: true });
        });

        this.obs.on('RecordingResumed', () => {
          this.recordingTimeUpdater.resume();
          this.setState({ recording: true, recordingPaused: false });
        });

        this.obs.send('GetRecordingStatus').then((data) => {
          if (data.isRecording) {
            this.recordingTimeUpdater.start(data.recordTimecode);

            if (data.isRecordingPaused) {
              this.recordingTimeUpdater.pause();
            }
          }

          this.setState({ recording: data.isRecording, recordingPaused: data.isRecordingPaused });
        });

        // ----------------------------------------------
        // --- media events, initial state

        this.obs.on('MediaPlaying', (data) => {
          if (data.sourceName !== BACKGROUND_AUDIO_SOURCE_NAME) {
            return;
          }

          this.setState({ backgroundAudioPlaying: true });
        });

        this.obs.on('MediaPaused', (data) => {
          if (data.sourceName !== BACKGROUND_AUDIO_SOURCE_NAME) {
            return;
          }

          this.setState({ backgroundAudioPlaying: false });
        });

        this.obs.on('MediaStopped', (data) => {
          if (data.sourceName !== BACKGROUND_AUDIO_SOURCE_NAME) {
            return;
          }

          this.setState({ backgroundAudioPlaying: false });
        });

        // triggered on next track in playlist / on stopped -> playing
        this.obs.on('MediaStarted', (data) => {
          if (data.sourceName !== BACKGROUND_AUDIO_SOURCE_NAME) {
            return;
          }

          this.setState({ backgroundAudioPlaying: true });
        });

        // MediaPlaying / MediaPaused not triggered when changing scene and
        // media configured with 'pause when not visible, unpause when visible'
        const updateBackgroundAudioState = () => {
          this.obs.send('GetMediaState', { sourceName: BACKGROUND_AUDIO_SOURCE_NAME })
            .then((data) => {
              this.setState({ backgroundAudioPlaying: data.mediaState === 'playing' });
            }).catch((e) => {
              console.error('GetMediaState error', e);
          });
        }

        updateBackgroundAudioState();

        // ----------------------------------------------
        // --- scene events, initial state

        this.obs.on('SwitchScenes', (data) => {
          this.setState({ currentScene: data.sceneName });

          // timeout (at least 500ms) for some reason needed ('pause when not visible, unpause when visible' source setting)
          this.updateBackgroundAudioStateTimeout = setTimeout(updateBackgroundAudioState, 1500);
        });

        this.obs.on('ScenesChanged', () => this.obsValidateSettings());
        this.obs.on('SceneItemAdded', () => this.obsValidateSettings());
        this.obs.on('SceneItemRemoved', () => this.obsValidateSettings());
        this.obs.on('SourceRenamed', () => this.obsValidateSettings());

        this.obsValidateSettings();

        // ----------------------------------------------
        // --- transition events

        this.obs.on('TransitionBegin', (data) => {
          this.setState({ transitionRunning: true });
        });

        this.obs.on('TransitionEnd', (data) => {
          this.setState({ transitionRunning: false });
        });

        // ----------------------------------------------
        // --- 'background audio', initial state

        this.obs.on('SourceVolumeChanged', (data) => {
          if (data.sourceName === BACKGROUND_AUDIO_SOURCE_NAME) {
            this.setState({ backgroundAudioLevel: Math.round(data.volume * 100) / 100 });
          }
          else if (data.sourceName === CAMERA_SOURCE_NAME) {
            this.setState({ cameraAudioLevel: Math.round(data.volume * 100) / 100 });
          }
        });

        this.obs.send('GetVolume', { source: BACKGROUND_AUDIO_SOURCE_NAME })
          .then((data) => {
            this.setState({ backgroundAudioLevel: data.volume });
          }).catch((e) => {
            console.error(`GetVolume ${BACKGROUND_AUDIO_SOURCE_NAME} error`, e);
          });

        this.obs.send('GetVolume', { source: CAMERA_SOURCE_NAME })
          .then((data) => {
            this.setState({ cameraAudioLevel: data.volume });
          }).catch((e) => {
            console.error(`GetVolume ${CAMERA_SOURCE_NAME} error`, e);
          });

        // ----------------------------------------------

        this.obs.on('error', (e) => {
          // --- duplicated code ---
          this.setState({ connected: false });
          // never triggered actually
          console.error('OBS socket error', e);

          this.reconnectTimeout = setTimeout(() =>{
            instance.obsConnectionReset()
          }, RECONNECT_RETRY_TIMEOUT);
          // --- duplicated code ---
        });
      })
      .catch((e) => {
        // --- duplicated code ---
        this.setState({ connected: false });

        console.error('OBS connect failed', e);

        this.reconnectTimeout = setTimeout(() =>{
          instance.obsConnectionReset()
        }, RECONNECT_RETRY_TIMEOUT);
        // --- duplicated code ---
      });
  }

  componentDidMount() {
    this.obsConnectionReset();
  }

  componentWillUnmount() {
    clearTimeout(this.reconnectTimeout);
    clearTimeout(this.statsUpdateTimeout);
    clearTimeout(this.updateBackgroundAudioStateTimeout);

    this.streamingTimeUpdater.stop();
    this.recordingTimeUpdater.stop();
    this.obs.disconnect();
  }

  // ------------------------------------------------------------

  render() {
    return <div className='fixed-bottom'>
      <div className='container'>
        <div className='controls'>
          <div className={ 'overlay' + (this.state.connected ? ' d-none' : '') }/>
          <Reset obs={this.obs}
                 match={this.props.match}/>
          <Output obs={this.obs}
                  streaming={this.state.streaming}
                  streamingStarting={this.state.streamingStarting}
                  streamingStopping={this.state.streamingStopping}
                  recording={this.state.recording}
                  recordingStarting={this.state.recordingStarting}
                  recordingStopping={this.state.recordingStopping}
                  recordingPaused={this.state.recordingPaused}/>
          <BackgroundAudio obs={this.obs}
                           backgroundAudioPlaying={this.state.backgroundAudioPlaying}/>
          <AudioCrossfade obs={this.obs}
                          backgroundAudioLevel={this.state.backgroundAudioLevel}
                          cameraAudioLevel={this.state.cameraAudioLevel}/>
          <Stats obs={this.obs}
                 match={this.props.match}/>
          <SceneList obs={this.obs}
                     currentScene={this.state.currentScene}
                     transitionRunning={this.state.transitionRunning}
                     sceneList={this.state.sceneList}/>
        </div>

        <div className='bg-dark bg-gradient p-2 statusbar'>
          <Connection connected={this.state.connected}
                      settingsValid={this.state.settingsValid}
                      resetHandler={ () => this.obsConnectionReset() }/>
          <Encoder fps={this.state.fps}
                   renderTotalFrames={this.state.renderTotalFrames}
                   renderMissedFrames={this.state.renderMissedFrames}
                   outputTotalFrames={this.state.outputTotalFrames}
                   outputSkippedFrames={this.state.outputSkippedFrames}
                   cpuUsage={this.state.cpuUsage}
                   memoryUsage={this.state.memoryUsage}/>
          <Audio backgroundAudioLevel={this.state.backgroundAudioLevel}
                 cameraAudioLevel={this.state.cameraAudioLevel}/>
          <OutputStatus streaming={this.state.streaming}
                        streamingStarting={this.state.streamingStarting}
                        streamingStopping={this.state.streamingStopping}
                        kbitsPerSec={this.state.kbitsPerSec}
                        numDroppedFrames={this.state.numDroppedFrames}
                        numTotalFrames={this.state.numTotalFrames}
                        streamTimecode={this.state.streamTimecode}
                        recording={this.state.recording}
                        recordingStarting={this.state.recordingStarting}
                        recordingStopping={this.state.recordingStopping}
                        recordingPaused={this.state.recordingPaused}
                        recordTimecode={this.state.recordTimecode}/>
          <div className="clearfix"/>
        </div>
      </div>
    </div>
  }
}
