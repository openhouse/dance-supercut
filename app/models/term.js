import Model, { attr } from '@ember-data/model';

export default Model.extend({
  // ATTRIBUTES
  name: attr(),
  position: attr('number', { defaultValue: 0 }),
});
