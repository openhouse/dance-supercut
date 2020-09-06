import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import { A } from '@ember/array';
const { log } = console;

export default Component.extend({
  planner: service(),
  currentPlan: alias('planner.currentPlan'),

  actions: {
    getOutline() {
      let planner = this.get('planner');
      //
      // let [success, state, plan] =
      //planner.plan(['dream-manifest'], ['dreamer-appears']); // Change this line for your operators.
      // goal, currentState, currentPlan, currentOperatorsUsed
      let result = planner.plan(['dream-manifest'], ['dreamer-appears']);
      log(result);
      return result;
    },
  },
});
