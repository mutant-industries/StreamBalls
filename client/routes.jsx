import { Meteor } from "meteor/meteor";
import React from 'react'
import { FlowRouter } from 'meteor/kadira:flow-router'
import { mount } from 'react-mounter'

import { App } from '/imports/ui/app'
import { About } from "/imports/ui/match/about.jsx";
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

FlowRouter.route('/matches/:_id/about', {
  name: 'match.about',
  action(params) {
    mount(App, {
      content: <About matchId={params._id}/>
    })
  }
})