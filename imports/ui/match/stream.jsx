import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker'
import React from 'react';
import { MatchCollection } from "/imports/api/match";
import { Control } from '/imports/ui/obs-remote/control.jsx';
import { Preview } from '/imports/ui/obs-remote/preview.jsx';
import { Edit } from '/imports/ui/match/edit.jsx';
import './stream.scss';


export class Stream extends React.Component {

  constructor(props, context) {
    super(props, context);

    this.state = {
      match: null,
      loaded: false
    };
  }

  // ------------------------------------------------------------

  resetMatchSubscription(matchId) {
    const instance = this;

    this.stateTracker && this.stateTracker.stop();
    this.matchSubscription && this.matchSubscription.stop();

    this.stateTracker = Tracker.autorun(() => {
      instance.matchSubscription = Meteor.subscribe('match', matchId, {
        onReady: () => { instance.setState({ loaded: true }) }
      });

      instance.setState({
        match: MatchCollection.findOne({ _id: matchId })
      });
    });
  }

  // ------------------------------------------------------------

  componentDidMount() {
    this.resetMatchSubscription(this.props.matchId);
  }

  shouldComponentUpdate(nextProps, nextState, nextContext) {

    if (this.props.matchId !== nextProps.matchId) {
      this.resetMatchSubscription(nextProps.matchId);
    }

    return true;
  }

  componentWillUnmount() {
    this.stateTracker.stop();
    this.matchSubscription.stop();
  }

  // ------------------------------------------------------------

  render() {
    return <div className="stream-wrapper">
      <Preview/>
      <Edit match={this.state.match} loaded={this.state.loaded}/>
      <Control match={this.state.match}/>
    </div>;
  }
}
