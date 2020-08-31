import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';

export default Component.extend({
  video: null,
  montage: service(),
  actions: {
    hasElement(element) {
      this.set('video', element);
      this.get('montage').videoReady(element);
    },
  },
});
