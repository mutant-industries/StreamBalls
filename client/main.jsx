import React from 'react';
import { Meteor } from 'meteor/meteor';
import { render } from 'react-dom';
import { App } from '/imports/ui/app';
import popper from 'popper.js'

global.Popper = global.Popper || popper
window.$ = window.jQuery = require('jquery');

import 'bootstrap/dist/js/bootstrap.bundle';

// ------------------------------------------------------------

Meteor.startup(() => {
  render(<App />, document.getElementById('root'));
});
