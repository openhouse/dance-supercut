import Model, { attr, hasMany } from '@ember-data/model';

export default Model.extend({
  // ATTRIBUTES
  name: attr(),

  // RELATIONSHIPS
  preconditions: hasMany('situation', { inverse: 'asPreconditions' }),
  additions: hasMany('situation', { inverse: 'asAdditions' }),
  deletions: hasMany('situation', { inverse: 'asDeletions' }),
});
