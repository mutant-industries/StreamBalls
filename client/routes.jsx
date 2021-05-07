import React from 'react'
import { FlowRouter } from 'meteor/kadira:flow-router'
import { mount } from 'react-mounter'

import { App } from '/imports/ui/app'
import { Preview } from '/imports/ui/preview/preview.jsx';

FlowRouter.route('/', {
  name: 'Home',
  action(){
    mount( App, {
      content: <Preview />
    })
  }
})
