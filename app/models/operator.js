import Model, { attr, hasMany } from '@ember-data/model';

export default Model.extend({
  // ATTRIBUTES
  name: attr(),

  // RELATIONSHIPS
  preconditions: hasMany('element', { inverse: 'asPreconditions' }),
  additions: hasMany('element', { inverse: 'asAdditions' }),
  deletions: hasMany('element', { inverse: 'asDeletions' }),
});
