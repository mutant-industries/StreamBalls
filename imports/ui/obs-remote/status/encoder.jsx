import React from 'react';


export class Encoder extends React.Component {

  render() {
    return <div className='statusbar-group float-start'>
      {/*fps: {this.props.fps} -*/}
      {/*rendering lag: {this.props.renderMissedFrames} / {this.props.renderTotalFrames} -*/}
      {/*encoding lag: {this.props.outputSkippedFrames} / {this.props.outputTotalFrames} -*/}
      {/*CPU: {this.props.cpuUsage} %*/}
      {/*memoryUsage: {this.props.memoryUsage}*/}

      <span className={ 'status' }>
        LAG: { this.props.renderMissedFrames } - { this.props.outputSkippedFrames }
      </span>
    </div>
  }
}
