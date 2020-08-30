import Model, { attr, hasMany } from '@ember-data/model';
// import { computed } from '@ember/object';

export default Model.extend({
  // ATTRIBUTES
  name: attr(),
  position: attr('number', { defaultValue: 0 }),
  useCount: attr('number', { defaultValue: 0 }),

  // RELATIONSHIPS
  preconditions: hasMany('proposition', { inverse: 'asPreconditions' }),
  additions: hasMany('proposition', { inverse: 'asAdditions' }),
  deletions: hasMany('proposition', { inverse: 'asDeletions' }),
});
