import React, {useState} from 'react';
import { MatchCollection } from "/imports/api/match";
import { FlowRouter } from 'meteor/kadira:flow-router'
import { useTracker } from 'meteor/react-meteor-data';
import './edit.scss';

export const Edit = (props) => {
  const [ inputs, setInputs ] = useState({});

  const { match } = useTracker(() => {
    Meteor.subscribe('match', props.matchId);

    return ({
      match: MatchCollection.findOne({ _id: props.matchId })
    });
  });

  if ( ! match) {
    return 'wait';
  }

  // initial form state
  if (Object.keys(inputs).length === 0) {
    setInputs(match)
  }

  // --------------------------------------------------------

  const handleInput = (e) => {
    setInputs({ ...inputs, [e.target.name]: e.target.value });
  }

  const handleMatchEdit = (e) => {
    e.preventDefault();

    Meteor.call('match.edit', match._id, inputs);
  };

  return <div className="center">
    <a id='match-new' onClick={() => FlowRouter.go('match.new')}/>
    <form id='match-edit' onSubmit={handleMatchEdit}>
      <input type="text" name="p1" placeholder="player 1" className="form-control" required
             value={ inputs.p1 } onChange={handleInput}/>
      <input type="text" name="p2" placeholder="player 2" className="form-control" required
             value={ inputs.p2 } onChange={handleInput}/>
      <input type="text" name="label" placeholder="last xx" className="form-control" required
             value={ inputs.label } onChange={handleInput}/>
      <button type="submit" className="d-none">submit</button>
    </form>
  </div>;
}
