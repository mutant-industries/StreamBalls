import React from 'react';
import {READY_SCENE_NAME, START_SCENE_NAME, STATS_SOURCE_NAME, TEXT_SOURCE_NAME} from "../control.jsx";


export class Stats extends React.Component {

  toggleVisible() {
    this.props.obs.send('SetSceneItemProperties', { 'scene-name': READY_SCENE_NAME,  item: TEXT_SOURCE_NAME, visible: this.props.statsVisible });
    this.props.obs.send('SetSceneItemProperties', { 'scene-name': START_SCENE_NAME,  item: TEXT_SOURCE_NAME, visible: this.props.statsVisible });
    this.props.obs.send('SetSceneItemProperties', { 'scene-name': READY_SCENE_NAME,  item: STATS_SOURCE_NAME, visible: ! this.props.statsVisible });
    this.props.obs.send('SetSceneItemProperties', { 'scene-name': START_SCENE_NAME,  item: STATS_SOURCE_NAME, visible: ! this.props.statsVisible });
  }

  // ------------------------------------------------------------

  render() {
    return <div className="btn-group m-1" role="group">
      <button type="button"
              onClick={() => this.toggleVisible()}
              className={`btn btn-secondary ${ this.props.statsVisible ? 'btn-light' : 'btn-dark' }`}>
        <img src={`/icons/stats${ this.props.statsVisible ? '-active' : '' }.png`} className='b-crossfade' alt='stats'/>
      </button>
    </div>
  }
}
