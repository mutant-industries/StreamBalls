import { Meteor } from 'meteor/meteor';
import React from 'react';


export class Connection extends React.Component {

  render() {
    return <div className='statusbar-group float-start connection'>
      <span className={ 'status connection-status ' + (this.props.connected ? 'obs-connected' : 'obs-unreachable') }
            onClick={ () => this.props.resetHandler() }/>
      <span className={ 'status settings-status ' + (this.props.settingsValid ? 'settings-valid' : 'settings-invalid') }
            onClick={ () => Meteor.call('resetFfmpegService') }/>
    </div>
  }
}
