import { Mongo } from 'meteor/mongo';

export const MatchCollection = new Mongo.Collection('match');

export const EventType = {
  GOAL: 0,
  MISS: 1,
  FAIL: 2,
  PASS: 3,
  OWN_GOAL: 4,

  WIN: 5
}

export const Bar = {
  BAR_3: 0,
  BAR_5: 1,
  BAR_2: 2,
}
