import React from 'react';
import { Preview } from '/imports/ui/preview/preview.jsx';
import { Edit } from '/imports/ui/match/edit.jsx';
import './stream.scss';

export const Stream = (props) => {

  return <div className="stream">
    <Preview/>
    <Edit matchId={props.matchId}/>
  </div>;
}
