import React from 'react';
import { Bar, EventType, MatchCollection } from "/imports/api/match";
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

  const stats = match.stats || {};
  stats.events = stats.events || [];

  // just template - deep copy done via template JSON.parse(JSON.stringify(summary_template))
  const summary_template = { bar: [ [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ] ], own: 0 };

  const summary = {
    sets: 0,
    p1: {
      name: match.p1.replace(/\s*\(.+?\)/, ''),
      points: 0,
      set: [ JSON.parse(JSON.stringify(summary_template)) ],
      total: JSON.parse(JSON.stringify(summary_template))
    },
    p2: {
      name: match.p2.replace(/\s*\(.+?\)/, ''),
      points: 0,
      set: [ JSON.parse(JSON.stringify(summary_template)) ],
      total: JSON.parse(JSON.stringify(summary_template))
    }
  };

  stats.events.forEach((event, i, arr) => {

    const side = event.player === 1  ? summary.p1 : summary.p2;

    if (event.type === EventType.WIN) {
      summary.sets++;
      side.points++;

      // if not the last event then add new set
      if (i !== arr.length - 1) {
        summary.p1.set.push(JSON.parse(JSON.stringify(summary_template)))
        summary.p2.set.push(JSON.parse(JSON.stringify(summary_template)))
      }
    }
    else {
      // get the last set summary
      const set = side.set[side.set.length - 1]

      if (event.type === EventType.OWN_GOAL) {
        set.own++;
        side.total.own++;
      }
      else {
        set.bar[event.bar][event.type]++;
        side.total.bar[event.bar][event.type]++;
      }
    }
  });

  // --------------------------------------------------------

  const createStatsRow = (statsP1, statsP2, title) => {
    let columns = [];
    let columnId = 0;

    const createPlayerStatsRow = (statsPlayer) => {
      const threeBarGoalNo = statsPlayer.bar[Bar.BAR_3][EventType.GOAL];
      const threeBarSum = statsPlayer.bar[Bar.BAR_3].reduce((a, b) => a + b, 0);

      const fiveBarGoalNo = statsPlayer.bar[Bar.BAR_5][EventType.GOAL];
      const fiveBarPassNo = statsPlayer.bar[Bar.BAR_5][EventType.PASS];
      const fiveBarSum = statsPlayer.bar[Bar.BAR_5].reduce((a, b) => a + b, 0);

      const twoBarGoalNo = statsPlayer.bar[Bar.BAR_2][EventType.GOAL];

      columns.push(<td key={columnId++}>{ threeBarGoalNo }</td>);
      columns.push(<td key={columnId++}>{ threeBarSum }</td>);
      columns.push(<td key={columnId++}>{ Math.round((threeBarGoalNo / threeBarSum) * 100 * 10) / 10 }</td>);

      columns.push(<td key={columnId++}>{ fiveBarGoalNo }</td>);
      columns.push(<td key={columnId++}>{ fiveBarPassNo }</td>);
      columns.push(<td key={columnId++}>{ fiveBarSum }</td>);
      columns.push(<td key={columnId++}>
        { Math.round((fiveBarPassNo / (fiveBarSum - fiveBarGoalNo)) * 100 * 10) / 10 }
      </td>);

      columns.push(<td key={columnId++}>{ twoBarGoalNo }</td>);
    }

    createPlayerStatsRow(statsP1);
    columns.push(<td key={columnId++}>{ title }</td>);
    createPlayerStatsRow(statsP2);

    return columns;
  }

  const createStatsTable = () => {
    let table = [];
    let rowId = 0;
    let labelColumns = [];
    let labelColumnId = 0;

    const createPlayerStatsLabel = () => {
      labelColumns.push(<td key={labelColumnId++}> G </td>);
      labelColumns.push(<td key={labelColumnId++} className='sum'> &#8721; </td>);
      labelColumns.push(<td key={labelColumnId++}> % </td>);

      labelColumns.push(<td key={labelColumnId++}> G </td>);
      labelColumns.push(<td key={labelColumnId++}> P </td>);
      labelColumns.push(<td key={labelColumnId++} className='sum'> &#8721; </td>);
      labelColumns.push(<td key={labelColumnId++}> % </td>);

      labelColumns.push(<td key={labelColumnId++}> G </td>);
    }

    createPlayerStatsLabel();
    labelColumns.push(<td key={labelColumnId++}/>);
    createPlayerStatsLabel();

    table.push(<tr className='set label' key={rowId++}>
      {labelColumns}
    </tr>);

    for (let i = 0; i < summary.sets; i++) {
      table.push(<tr className='set stats' key={rowId++}>
        {createStatsRow(summary.p1.set[i], summary.p2.set[i], 'set ' + (i + 1))}
      </tr>);
    }

    if (summary.sets > 1) {
      table.push(<tr className='set stats total' key={rowId++}>
        {createStatsRow(summary.p1.total, summary.p2.total, 'total')}
      </tr>);
    }

    return table
  };

  // --------------------------------------------------------

  return <div id='text'>
    <div className={ 'content about text-center ' + (stats.visible ? 'hidden' : 'visible') }>
      <div className="event_competition">{ match.competition }</div>
      <div className="event_label">{ match.label }</div>
      <br/>

      <div className="player">{ match.p1 }</div>
      <div className="against">vs.</div>
      <div className="player">{ match.p2 }</div>
    </div>

    <div className={ 'content stats ' + (stats.visible ? 'visible' : 'hidden') }>
      <table className='results'>
        <thead>
          <tr className='score'>
            <td colSpan='8' className='player'>
              { summary.p1.name }
            </td>
            <td>
              { summary.p1.points }:{ summary.p2.points }
            </td>
            <td colSpan='8' className='player'>
              { summary.p2.name }
            </td>
          </tr>
        </thead>
        <tbody>
          <tr className='set header'>
            <td className='bar three-bar' colSpan='3'/>
            <td className='bar five-bar' colSpan='4'/>
            <td className='bar two-bar' colSpan='1'/>
            <td/>
            <td className='bar three-bar' colSpan='3'/>
            <td className='bar five-bar' colSpan='4'/>
            <td className='bar two-bar' colSpan='1'/>
          </tr>
          { createStatsTable() }
        </tbody>
        <tfoot>
          <tr className='footnote'>
            <td colSpan='21'>
              G - počet gólů,
              P - počet prohozů,
              &#8721; - počet akcí,
              % - úspěšnost střel (trojka) / úspěšnost prohozů (pětka)
            </td>
          </tr>
        </tfoot>
      </table>

    </div>
  </div>;
}
