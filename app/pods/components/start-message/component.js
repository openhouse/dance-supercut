import Component from '@ember/component';
import { inject as service } from '@ember/service';

export default Component.extend({
  montage: service(),
  actions: {
    start() {
      let montage = this.get('montage');
      montage.set('userHasStarted', true);
    },
  },
});
