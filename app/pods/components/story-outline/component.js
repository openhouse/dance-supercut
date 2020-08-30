import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
// const { log } = console;

export default Component.extend({
  planner: service(),
  currentPlan: alias('planner.currentPlan'),

  actions: {
    getOutline() {
      let planner = this.get('planner');
      //
      // let [success, state, plan] =
      planner.plan(['dream-manifest'], ['dreamer-appears']); // Change this line for your operators.
    },
  },
});
