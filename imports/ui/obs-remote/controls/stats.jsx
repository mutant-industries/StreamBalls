import React from 'react';


export class Stats extends React.Component {

  toggleVisible() {
    const stats = this.props.match.stats || {};
    stats.visible = ! stats.visible;

    Meteor.call('match.edit', this.props.match._id, { stats });
  }

  // ------------------------------------------------------------

  render() {
    const statsVisible = this.props.match && this.props.match.stats && this.props.match.stats.visible;

    return <div className="btn-group m-1" role="group">
      <button type="button"
              onClick={() => this.toggleVisible()}
              disabled={ ! this.props.match}
              className={`btn btn-secondary ${statsVisible ? 'btn-light' : 'btn-dark'}`}>
        <img src={`/icons/stats${statsVisible ? '-active' : ''}.png`} className='b-crossfade' alt='stats'/>
      </button>
    </div>
  }
}
