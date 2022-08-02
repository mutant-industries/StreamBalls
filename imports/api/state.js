import { Mongo } from 'meteor/mongo';

export const PREVIEW_STREAM_ACTIVE_KEY = 'previewStreamActive';
export const PREVIEW_STREAM_READY_KEY = 'previewStreamReady';

export const StateCollection = new Mongo.Collection('state');
