import Model, { attr, hasMany } from '@ember-data/model';

export default Model.extend({
  // ATTRIBUTES
  slug: attr(),

  // RELATIONSHIPS
  clips: hasMany('clip'),
  asPreconditions: hasMany('operator', { inverse: 'preconditions' }),
  asAdditions: hasMany('operator', { inverse: 'additions' }),
  asDeletions: hasMany('operator', { inverse: 'deletions' }),
});
