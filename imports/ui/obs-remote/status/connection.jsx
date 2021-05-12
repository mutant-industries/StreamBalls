import React from 'react';


export class Connection extends React.Component {

  render() {
    return <div className='statusbar-group'>
      connected: {String(this.props.connected)} -
      settingsValid: {String(this.props.settingsValid)}
    </div>
  }
}
