import React from 'react';
import { MatchCollection } from "/imports/api/match";
import { useTracker } from 'meteor/react-meteor-data';
import './text.scss';

export const Text = (props) => {

  const { match } = useTracker(() => {

    Meteor.subscribe('match', props.matchId);

    return ({
      match: MatchCollection.findOne({ _id: props.matchId })
    });
  });

  if ( ! match) {
    return '';
  }

  // --------------------------------------------------------

  return <div id='text'>
    <div className='content about text-center'>
      <div className="event_competition">{ match.competition }</div>
      <div className="event_label">{ match.label }</div>
      <br/>

      <div className="player">{ match.p1 }</div>
      <div className="against">vs.</div>
      <div className="player">{ match.p2 }</div>
    </div>
  </div>;
}
