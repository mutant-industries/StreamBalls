import React, {useState} from 'react';
import { FlowRouter } from 'meteor/kadira:flow-router'
import KeyboardEventHandler from 'react-keyboard-event-handler';
import { EventType, Bar } from '/imports/api/match';
import $ from 'jquery';
import './edit.scss';

export const Edit = (props) => {
  const [ inputs, setInputs ] = useState({});

  if ( ! props.match) {
    return <div className="center">
      <a id='match-new' onClick={() => FlowRouter.go('match.new')}/>
      <div id='match-loading'>
        { ! props.loaded ? <img src={`/icons/loader.gif`} alt='loading'/> :
          <img src={`/icons/404.png`} className='not-found'  onClick={() => FlowRouter.go('match.latest')} alt='404'/> }
      </div>
    </div>;
  }

  const newMatchCreated = inputs._id && inputs._id !== props.match._id;

  // initial form state (on page loaded / on new match created)
  if (Object.keys(inputs).length === 0 || newMatchCreated) {
    // on new match created - keep form prefilled with player names and competition name from previous match
    setInputs(newMatchCreated ? { ...props.match, p1: inputs.p1, p2: inputs.p2, competition: inputs.competition } : props.match)
  }

  // --------------------------------------------------------

  const handleInput = (e) => {
    setInputs({ ...inputs, [e.target.name]: e.target.value });
  }

  const handleMatchEdit = (e) => {
    e.preventDefault();

    Meteor.call('match.edit', props.match._id, inputs);
  };

  // --------------------------------------------------------

  const reverse = (arr) => arr.map((item, idx) => arr[arr.length - 1 - idx]);
  const stats = props.match.stats || {};
  stats.events = stats.events || [];

  // TODO trochu dementni (kazda tyc ma jen 3 event typy), ale co uz
  const summary = {
    left: { bar: [ [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ] ], own: 0 },
    right: { bar: [ [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ] ], own: 0 }
  };

  const left = stats.swap ? 2 : 1;
  const right = stats.swap ? 1 : 2;

  summary.left.name = stats.swap ? props.match.p2 : props.match.p1;
  summary.right.name = stats.swap ? props.match.p1 : props.match.p2;

  for (let event of reverse(stats.events)) {

    if (event.type === EventType.WIN) {
      break;
    }

    const side = (event.player === 1 && ! stats.swap || event.player === 2 && stats.swap) ? summary.left : summary.right;

    if (event.type === EventType.OWN_GOAL) {
      side.own++;
    }
    else {
      side.bar[event.bar][event.type]++;
    }
  }

  const handleStatsInput = (key, e) => {

    let event;

    switch (key) {
      case 'ctrl+z':
        e.preventDefault();
        stats.events.pop();
        break;
      case 'f':
        stats.swap = ! stats.swap;
        break;

      // control events
      case 'r':
        event = { player: left, type: EventType.WIN };
        break;
      case 'shift+r':
        event = { player: right, type: EventType.WIN };
        break;

      // left 3-bar
      case 'q':
        event = { player: left, bar: Bar.BAR_3, type: EventType.GOAL };
        break;
      case 'w':
        event = { player: left, bar: Bar.BAR_3, type: EventType.MISS };
        break;
      case 'e':
        event = { player: left, bar: Bar.BAR_3, type: EventType.FAIL };
        break;
      // left 5-bar
      case 'a':
        event = { player: left, bar: Bar.BAR_5, type: EventType.GOAL };
        break;
      case 's':
        event = { player: left, bar: Bar.BAR_5, type: EventType.PASS };
        break;
      case 'd':
        event = { player: left, bar: Bar.BAR_5, type: EventType.FAIL };
        break;
      // left 2-bar
      case 'z':
        event = { player: left, bar: Bar.BAR_2, type: EventType.GOAL };
        break;
      case 'x':
        event = { player: left, bar: Bar.BAR_2, type: EventType.PASS };
        break;
      case 'c':
        event = { player: left, bar: Bar.BAR_2, type: EventType.FAIL };
        break;
      // left own
      case 'v':
        event = { player: left, type: EventType.OWN_GOAL };
        break;

      // right 3-bar
      case 'shift+q':
        event = { player: right, bar: Bar.BAR_3, type: EventType.GOAL };
        break;
      case 'shift+w':
        event = { player: right, bar: Bar.BAR_3, type: EventType.MISS };
        break;
      case 'shift+e':
        event = { player: right, bar: Bar.BAR_3, type: EventType.FAIL };
        break;
      // right 5-bar
      case 'shift+a':
        event = { player: right, bar: Bar.BAR_5, type: EventType.GOAL };
        break;
      case 'shift+s':
        event = { player: right, bar: Bar.BAR_5, type: EventType.PASS };
        break;
      case 'shift+d':
        event = { player: right, bar: Bar.BAR_5, type: EventType.FAIL };
        break;
      // right 2-bar
      case 'shift+z':
        event = { player: right, bar: Bar.BAR_2, type: EventType.GOAL };
        break;
      case 'shift+x':
        event = { player: right, bar: Bar.BAR_2, type: EventType.PASS };
        break;
      case 'shift+c':
        event = { player: right, bar: Bar.BAR_2, type: EventType.FAIL };
        break;
      // right own
      case 'shift+v':
        event = { player: right, type: EventType.OWN_GOAL };
        break;
    }

    if (event) {
      stats.events.push(event);

      let eventClass = event.player === left ? 'float-start' : 'float-end';
      eventClass += ' ';
      eventClass += (event.type === EventType.GOAL || event.type === EventType.WIN) ? 'text-success' :
        (event.type === EventType.MISS || event.type === EventType.PASS) ? 'text-warning' : 'text-danger';

      let eventText = event.bar === Bar.BAR_2 ?
        '<b>2</b>-' : event.bar === Bar.BAR_5 ?
          '<b>5</b>-' : event.bar === Bar.BAR_3 ?
          '<b>3</b>-' : '';

      eventText += event.type === EventType.GOAL ? 'goal' :
        event.type === EventType.MISS ? 'miss' :
        event.type === EventType.PASS ? event.bar === Bar.BAR_2 ? 'clear' : 'pass' :
        event.type === EventType.FAIL ? 'fail' :
        event.type === EventType.WIN ? 'win' :
        event.type === EventType.OWN_GOAL ? 'own goal' : 'bar';

      $('.stats-log')
        .append('<div class="' + eventClass +'">'+ eventText + '</div>' + '<div class="clearfix"/>')
        .children().last()[0].scrollIntoView(false);
    }
    else if (key === 'ctrl+z') {
      let eventClass = 'text-center';
      let eventText = 'undo';

      $('.stats-log')
        .append('<div class="' + eventClass +'">'+ eventText + '</div>' + '<div class="clearfix"/>')
        .children().last()[0].scrollIntoView(false);
    }

    Meteor.call('match.edit', props.match._id, { stats });
  }

  // --------------------------------------------------------

  return <div className="center">
    <a id='match-new' onClick={() => FlowRouter.go('match.new')}/>
    <form id='match-edit' onSubmit={handleMatchEdit}>
      <input type="text" name="competition" placeholder="Competition" className="form-control" required
             value={ inputs.competition } onChange={handleInput}/>
      <input type="text" name="label" placeholder="date / last xx" className="form-control" required
             value={ inputs.label } onChange={handleInput}/>
      <input type="text" name="p1" placeholder="Player 1" className="form-control player" required
             value={ inputs.p1 } onChange={handleInput}/>
      <input type="text" name="p2" placeholder="Player 2" className="form-control player" required
             value={ inputs.p2 } onChange={handleInput}/>
      <button type="submit" className="d-none">submit</button>
    </form>
    <KeyboardEventHandler onKeyEvent={(key, e) => handleStatsInput(key, e)} handleKeys={[
      // left
      'q', 'w', 'e',
      'a', 's', 'd',
      'z', 'x', 'c',
      // winner
      'r',
      // own
      'v',
      // right
      'shift+q', 'shift+w', 'shift+e',
      'shift+a', 'shift+s', 'shift+d',
      'shift+z', 'shift+x', 'shift+c',
      // winner
      'shift+r',
      // own
      'shift+v',
      // swap
      'f',
      // remove last event
      'ctrl+z'
    ]}>
      <div id='stats-control' tabIndex={0}>

        <table className='stats-summary'>
          <tbody>
            <tr>
              <td/>
              <td>
                &nbsp;&nbsp;
              </td>
              <td className='player'>
                <b>{ summary.left.name.replace(/\s*\(.+?\)\s*/, '') }</b>
              </td>
              <td>
                &nbsp;-&nbsp;
              </td>
              <td className='player'>
                <b>{ summary.right.name.replace(/\s*\(.+?\)\s*/, '') }</b>
              </td>
            </tr>
            <tr>
              <td>
                <i>3-bar</i>
              </td>
              <td/>
              <td>
                <span>{ summary.left.bar[Bar.BAR_3][EventType.GOAL] } g</span>
                -
                <span>{ summary.left.bar[Bar.BAR_3][EventType.MISS] } m</span>
                -
                <span>{ summary.left.bar[Bar.BAR_3][EventType.FAIL] } f</span>
              </td>
              <td/>
              <td>
                <span>{ summary.right.bar[Bar.BAR_3][EventType.GOAL] } g</span>
                -
                <span>{ summary.right.bar[Bar.BAR_3][EventType.MISS] } m</span>
                -
                <span>{ summary.right.bar[Bar.BAR_3][EventType.FAIL] } f</span>
              </td>
            </tr>
            <tr>
              <td>
                <i>5-bar</i>
              </td>
              <td/>
              <td>
                <span>{ summary.left.bar[Bar.BAR_5][EventType.GOAL] } g</span>
                -
                <span>{ summary.left.bar[Bar.BAR_5][EventType.PASS] } p</span>
                -
                <span>{ summary.left.bar[Bar.BAR_5][EventType.FAIL] } f</span>
              </td>
              <td/>
              <td>
                <span>{ summary.right.bar[Bar.BAR_5][EventType.GOAL] } g</span>
                -
                <span>{ summary.right.bar[Bar.BAR_5][EventType.PASS] } p</span>
                -
                <span>{ summary.right.bar[Bar.BAR_5][EventType.FAIL] } f</span>
              </td>
            </tr>
            <tr>
              <td>
                <i>2-bar</i>
              </td>
              <td/>
              <td>
                <span>{ summary.left.bar[Bar.BAR_2][EventType.GOAL] } g</span>
                -
                <span>{ summary.left.bar[Bar.BAR_2][EventType.PASS] } c</span>
                -
                <span>{ summary.left.bar[Bar.BAR_2][EventType.FAIL] } f</span>
              </td>
              <td/>
              <td>
                <span>{ summary.right.bar[Bar.BAR_2][EventType.GOAL] } g</span>
                -
                <span>{ summary.right.bar[Bar.BAR_2][EventType.PASS] } c</span>
                -
                <span>{ summary.right.bar[Bar.BAR_2][EventType.FAIL] } f</span>
              </td>
            </tr>
          <tr>
            <td>

            </td>
            <td/>
            <td>
              <span>{ summary.left.own } v</span>
            </td>
            <td/>
            <td>
              <span>{ summary.right.own } v</span>
            </td>
          </tr>
          </tbody>
        </table>

        <div className='stats-log'
             onClick={ () => { $('.stats-log').empty() }}/>
      </div>
    </KeyboardEventHandler>
  </div>;
}
