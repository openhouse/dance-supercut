import Model, { attr, hasMany } from '@ember-data/model';

export default Model.extend({
  // ATTRIBUTES
  name: attr(),

  // RELATIONSHIPS
  preconditions: hasMany('signified', { inverse: 'asPreconditions' }),
  additions: hasMany('signified', { inverse: 'asAdditions' }),
  deletions: hasMany('signified', { inverse: 'asDeletions' }),
});
