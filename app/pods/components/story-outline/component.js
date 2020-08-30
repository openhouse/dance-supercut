import Component from '@ember/component';
import { inject as service } from '@ember/service';
const { log } = console;

export default Component.extend({
  planner: service(),
  plan: null,
  actions: {
    getOutline() {
      let planner = this.get('planner');
      let [success, state, plan] = planner.plan(
        ['dream-manifest'],
        ['dreamer-appears']
      ); // Change this line for your operators.
      log(plan);
      this.set('plan', plan);
    },
  },
});
