import React from 'react';


export class SceneList extends React.Component {

  handleSceneChange = (e) => {
    e.preventDefault();

    this.props.obs.send('SetCurrentScene', { "scene-name": e.target.name });
  }

  // ------------------------------------------------------------

  render() {
    return <div>
      { this.props.sceneList.map((scene, index) => (
        <button type="button"
               onClick={this.handleSceneChange}
               name={ scene.name }
               key={ index }
               disabled={ this.props.transitionRunning }
               className={`m-1 btn ${scene.name === this.props.currentScene ? 'btn-light' : 'btn-dark'}`}>
          { scene.name }
        </button>
      )) }
    </div>
  }
}
