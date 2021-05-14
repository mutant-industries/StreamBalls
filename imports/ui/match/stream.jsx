import React from 'react';
import { Control } from '/imports/ui/obs-remote/control.jsx';
import { Preview } from '/imports/ui/obs-remote/preview.jsx';
import { Edit } from '/imports/ui/match/edit.jsx';
import './stream.scss';

export const Stream = (props) => {

  return <div className="stream-wrapper">
    <Preview/>
    <Edit matchId={props.matchId}/>
    <Control matchId={props.matchId}/>
  </div>;
}
