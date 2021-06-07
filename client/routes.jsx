import { Meteor } from "meteor/meteor";
import React from 'react'
import { FlowRouter } from 'meteor/kadira:flow-router'
import { mount } from 'react-mounter'

import { App } from '/imports/ui/app'
import { Text } from "/imports/ui/match/text.jsx";
import { Stats } from "/imports/ui/match/stats.jsx";
import { Stream } from "/imports/ui/match/stream.jsx";

FlowRouter.route('/', {
  name: 'match.latest',
  action() {
    Meteor.call('match.latest', (err, match) => {
      FlowRouter.go('match.stream', match);
    })
  }
})

FlowRouter.route('/matches/new', {
  name: 'match.new',
  action() {
    Meteor.call('match.new', (err, _id) => {
      FlowRouter.go('match.stream', { _id });
    })
  }
})

FlowRouter.route('/matches/:_id/stream', {
  name: 'match.stream',
  action(params) {
    mount(App, {
      content: <Stream  matchId={params._id}/>
    })
  }
})

FlowRouter.route('/matches/:_id/text', {
  name: 'match.text',
  action(params) {
    mount(App, {
      content: <Text matchId={params._id}/>
    })
  }
})

FlowRouter.route('/matches/:_id/stats', {
  name: 'match.stats',
  action(params) {
    mount(App, {
      content: <Stats matchId={params._id}/>
    })
  }
})
