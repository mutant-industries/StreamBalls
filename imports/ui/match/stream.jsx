import React from 'react';
import { MatchCollection } from "/imports/api/match";
import { useTracker } from 'meteor/react-meteor-data';
import { Control } from '/imports/ui/obs-remote/control.jsx';
import { Preview } from '/imports/ui/obs-remote/preview.jsx';
import { Edit } from '/imports/ui/match/edit.jsx';
import './stream.scss';

export const Stream = (props) => {

  const { match } = useTracker(() => {
    Meteor.subscribe('match', props.matchId);

    return ({
      match: MatchCollection.findOne({ _id: props.matchId })
    });
  });

  return <div className="stream-wrapper">
    <Preview/>
    <Edit match={match}/>
    <Control match={match}/>
  </div>;
}
