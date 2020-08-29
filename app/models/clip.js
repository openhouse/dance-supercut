import Model, { attr, belongsTo } from '@ember-data/model';
import { computed } from '@ember/object';
import { isPresent } from '@ember/utils';

export default Model.extend({
  // ATTRIBUTES
  isPrologue: attr(),
  slug: attr(),
  plays: attr(),

  // RELATIONSHIPS
  signified: belongsTo('signified'),

  // COMPUTED PROPERTIES

  // src: URL Template
  src: computed('slug', function () {
    let slug = this.get('slug');
    if (isPresent(slug)) {
      return `https://vs1.ohai.us/storage/p7/480p/${slug}.mp4`;
    }
    return null;
  }),
});
