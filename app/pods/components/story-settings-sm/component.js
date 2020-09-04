import Component from '@ember/component';
import { computed } from '@ember/object';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';

const { log } = console;

export default Component.extend({
  operators: null,
  planner: service(),
  customGoalId: alias('planner.customGoalId'),
  defaultGoalId: alias('planner.defaultGoalId'),

  // all unique additions sorted alphabetically
  allAdditions: computed('operators.additions.@each.slug', function () {
    let operators = this.get('operators');
    let allAdditions = [];
    operators.forEach((operator) => {
      let additions = operator.get('additions');
      additions.forEach((addition) => {
        allAdditions.push(addition.get('slug'));
      });
    });
    return allAdditions.uniq().sort();
  }),
});
