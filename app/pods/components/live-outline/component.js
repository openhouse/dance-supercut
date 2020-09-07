import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import { A } from '@ember/array';
const { log } = console;

export default Component.extend({
  uPlanner: service(),
  currentPlan: alias('planner.currentPlan'),

  actions: {
    getOutline() {
      let uPlanner = this.get('uPlanner');
      //
      // let [success, state, plan] =
      //planner.plan(['dream-manifest'], ['dreamer-appears']); // Change this line for your operators.
      // goal, currentState, currentPlan, currentOperatorsUsed
      let result = uPlanner.startInteractive(
        ['dream-manifest'],
        ['dreamer-appears']
      );
      return result;
    },
    uTakeStep(operator) {
      let uPlanner = this.get('uPlanner');
      uPlanner.uTakeStep(A([operator]));
    },
  },
});
