import { Meteor } from 'meteor/meteor';
import { MatchCollection } from '/imports/api/match';
import { check } from "meteor/check";

Meteor.startup(() => {
  if (MatchCollection.find().count() === 0) {
    MatchCollection.insert({
      competition: '2BLbee SmallBalls Multitable',
      p1: 'František (L - red)',
      p2: 'Petr (L - black)',
      label: 'last 32',
      created: new Date()
    });
  }
});

Meteor.publish('match', function (_id) {
  check(_id, String);

  return MatchCollection.find({ _id });
});

Meteor.methods({
  "match.new": async () => {
    return await MatchCollection.insert({
      competition: '2BLbee SmallBalls Multitable',
      p1: '', p2: '', label: '',
      created: new Date()
    });
  },
  "match.latest": async () => {
    return await MatchCollection.findOne({}, {sort: {created: 1}});
  },
  "match.edit": async (id, values) => {
    check(id, String);
    check(values, Object);
    check(values.p1, String);
    check(values.p2, String);
    check(values.label, String);

    delete values._id;

    return await MatchCollection.update(id, { $set: values});
  },
});
