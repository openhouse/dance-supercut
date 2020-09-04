import Model, { attr, hasMany } from '@ember-data/model';
import { computed } from '@ember/object';
import { equal } from '@ember/object/computed';
import { guidFor } from '@ember/object/internals';
import { inject as service } from '@ember/service';

export default Model.extend({
  montage: service(),

  // ATTRIBUTES
  name: attr(),
  position: attr('number', { defaultValue: 0 }),
  useCount: attr('number', { defaultValue: 0 }),

  // RELATIONSHIPS
  preconditions: hasMany('proposition', { inverse: 'asPreconditions' }),
  additions: hasMany('proposition', { inverse: 'asAdditions' }),
  deletions: hasMany('proposition', { inverse: 'asDeletions' }),

  // COMPUTED PROPERTIES
  guid: computed('name', function () {
    return guidFor(this.get('id'));
  }),
  isCurrentOperator: equal('name', 'montage.currentOperator.name'),
});
