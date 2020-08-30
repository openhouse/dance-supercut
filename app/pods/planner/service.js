/*
  Ported to Ember.js Service by Jamie Burkart
  August 2020

  PLANNER.JS

  Warren Sack <wsack@ucsc.edu>
  July 2020

  This is a GPS-style planner where goals and assertions
  are atomic propositions (without variables). For more
  details, see

  Newell, Alan, Simon, Herbert. 1972.
    Human Problem Solving. New York: Prentice-Hall.

  Given an array of predefined operators, an array of goals,
  and an array of assertions about the current state, the main
  function, plan(goals,currentState), returns a list of operators
  for achieving all of the goals, or it reports that it was unable
  to find a plan to achieve the goals.
*/
import Service from '@ember/service';
import store from '@ember-data/store';
import { inject as service } from '@ember/service';
import { computed } from '@ember/object';
import { sort } from '@ember/object/computed';

const { log } = console;

export default Service.extend({
  store: service(),

  // all operators from the store
  operators: computed(function () {
    let store = this.get('store');
    return store.peekAll('operator');
  }),

  /*
  keep a stack of all operators
  most used operators last
  otherwise sort by initial position
  */
  operatorsStackSorting: Object.freeze(['useCount', 'position']),
  operatorsStack: sort('operators', 'operatorsStackSorting'),

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * i);
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  },

  //
  // plan(array,array): [boolean,array,array]
  //
  // Given a currentState and a list of goals, and
  // assuming a predefined list of OPERATORS, returns
  // true, the end state, and a plan if the goals can
  // be achieved; returns false, the currentState, and
  // an invalid plan otherwise.
  plan(goalIds, currentStateIds) {
    let store = this.get('store');
    let goals = [];
    let currentState = [];

    goalIds.forEach((goalId) => {
      goals.push(store.peekRecord('proposition', goalId));
    });
    currentStateIds.forEach((currentStateId) => {
      currentState.push(store.peekRecord('proposition', currentStateId));
    });

    let nextState = [...currentState]; // clone currentState
    let currentPlan = [];
    let success = true;

    // dialectic plan with attributes
    // include initial state as additions
    let nextPlanItem = {
      operator: null,
      newAdditions: [],
    };

    log('beginning');

    // track new additions from current state
    currentState.forEach((proposition) => {
      if (
        !nextPlanItem.newAdditions
          .map((addition) => addition.get('id'))
          .includes(proposition.get('id'))
      ) {
        nextPlanItem.newAdditions.push(proposition);
      }
      log(nextPlanItem);
      log('   ' + proposition.get('id'));
    });

    // plan with attributes
    // include initial state as newAdditions
    currentPlan.push(nextPlanItem);

    goals.forEach((goal) => {
      [success, nextState, currentPlan] = this.achieveGoal(
        goal,
        nextState,
        currentPlan
      );
      if (!success) {
        log('unable to achieve goal ' + goal.get('id'));
      }
    });

    if (!success) {
      log('plan not found');
    } else {
      log('ending');
      nextState.forEach((proposition) => {
        log('   ' + proposition.get('id'));
      });
    }

    return [success, nextState, currentPlan];
  },

  //
  // achieveGoal(string,array,array): [boolean,array,array]
  //
  // If goal is in the currentState, returns immediately;
  // otherwise, operators that could achieve the goal are selected
  // and each selected is attempted.
  //
  // Returns an updated state and plan if an attempt succeeds;
  // returns the current state and plan if all fail.
  //
  achieveGoal(goal, currentState, currentPlan) {
    var nextState = [...currentState]; // clone currentState
    var nextPlan = [...currentPlan]; // clone currentPlan

    if (
      nextState
        .map((proposition) => proposition.get('id'))
        .includes(goal.get('id'))
    ) {
      return [true, currentState, currentPlan];
    } else {
      let selections = this.selectOperators(goal);
      let success = false;

      selections.forEach((operator) => {
        if (!success) {
          [success, nextState, nextPlan] = this.applyOperator(
            operator,
            nextState,
            nextPlan
          );
        }
      });

      if (success) {
        return [true, nextState, nextPlan];
      } else {
        return [false, currentState, currentPlan];
      }
    }
  },

  //
  // selectOperators(string): array
  //
  // Finds all operators containing the goal in the additions list.
  //
  selectOperators(goal) {
    let selections = [];
    let sortedOperators = this.get('operatorsStack');

    sortedOperators = this.shuffleArray(sortedOperators);
    sortedOperators.forEach((operator) => {
      if (
        operator
          .get('additions')
          .map((addition) => addition.get('id'))
          .includes(goal.get('id'))
      ) {
        selections.push(operator);
      }
    });
    log('selections.length', selections.length, selections);

    // Any operators that have been used before are
    // already at end of the sorted list.
    return selections;
  },

  //
  // applyOperator(object,array,array): [boolean,array,array]
  //
  // Returns an updated state and plan if application succeeds:
  // [true,state,plan]
  // returns the current state and plan, if it fails:
  // [false,state,plan]
  //
  applyOperator(operator, currentState, currentPlan) {
    let nextState = [...currentState];
    let nextPlan = [...currentPlan];
    let success = true;

    // Attempt to achieve each of the preconditions.
    operator.get('preconditions').forEach((proposition) => {
      if (success) {
        [success, nextState, nextPlan] = this.achieveGoal(
          proposition,
          nextState,
          nextPlan
        );
      }
    });

    // If the preconditions are solved, execute the operator by
    // deleting its deletions and adding its additions to the state.
    if (success) {
      log(operator.get('name'));

      // plan with attributes
      let nextPlanItem = {
        operator: operator,
        newAdditions: [],
      };

      if (operator.get('deletions.length') > 0) {
        log('   deleting ');
      }

      operator.get('deletions').forEach((deletion) => {
        log('       ' + deletion.get('id'));

        // remove deletion from state
        nextState = nextState.filter((proposition) => {
          return proposition.get('id') != deletion.get('id');
        });
      });

      if (operator.get('additions.length') > 0) {
        log('   adding ');
      }

      operator.get('additions').forEach((addition) => {
        log('       ' + addition.get('id'));

        // plan with attributes
        // add additions to nextPlanItem.newAdditions if not already in nextState
        if (
          !nextState
            .map((proposition) => proposition.get('id'))
            .includes(addition.get('id'))
        ) {
          nextPlanItem.newAdditions.push(addition);
        }

        nextState.push(addition);
      });

      // plan with attributes
      nextPlan.push(nextPlanItem);

      // increment operator.useCount
      operator.set('useCount', operator.get('useCount') + 1);

      return [true, nextState, nextPlan];
    } else {
      return [false, currentState, currentPlan];
    }
  },
});
