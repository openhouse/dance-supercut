import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import { computed } from '@ember/object';
const { log } = console;

export default Component.extend({
  planner: service(),
  currentPlan: alias('planner.currentPlan'),
  preconditions: computed('operators', function () {
    let operators = this.get('operators');
    let options = [];
    operators.forEach((operator) => {
      operator.get('preconditions').forEach((proposition) => {
        options.push(proposition.get('id'));
      });
    });
    options = [...new Set(options)]; // unique
    return options;
  }),
  additions: computed('operators', function () {
    let operators = this.get('operators');
    let options = [];
    operators.forEach((operator) => {
      operator.get('additions').forEach((proposition) => {
        options.push(proposition.get('id'));
      });
    });
    options = [...new Set(options)]; // unique
    return options;
  }),

  actions: {
    getOutline() {
      let planner = this.get('planner');
      //
      // let [success, state, plan] =
      planner.plan(['dream-manifest'], ['dreamer-appears']); // Change this line for your operators.
    },
  },
});
