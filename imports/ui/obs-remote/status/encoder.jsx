import React from 'react';


export class Encoder extends React.Component {

  render() {
    return <div className='statusbar-group'>
      fps: {this.props.fps} -
      rendering lag: {this.props.renderMissedFrames} / {this.props.renderTotalFrames} -
      encoding lag: {this.props.outputSkippedFrames} / {this.props.outputTotalFrames} -
      CPU: {this.props.cpuUsage} %
      {/*memoryUsage: {this.props.memoryUsage}*/}
    </div>
  }
}
