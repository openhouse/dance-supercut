/*
  Ported to Ember.js Service
  MADE INTO FORWARD STATE SEARCH FOR INTERACTIVE
  by Jamie Burkart
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
import { inject as service } from '@ember/service';
import { computed } from '@ember/object';
import { isPresent } from '@ember/utils';
import { A, isArray } from '@ember/array';
import { alias } from '@ember/object/computed';

// const { log } = console;
const log = () => {};

export default Service.extend({
  store: service(),

  planner: service(), // connect backward search
  allBackwardPlans: alias('planner.allPlans'),
  // returns array of all backward search plans and interactive plan
  allPlans: computed('allBackwardPlans', 'uPlan', function () {
    log('allPlans - START');
    let allBackwardPlans = this.get('allBackwardPlans');
    let uPlan = this.get('uPlan');
    let allPlans = A([]);
    if (isPresent(allBackwardPlans)) {
      allBackwardPlans.forEach((plan) => {
        allPlans.push(plan);
      });
    }
    if (isPresent(uPlan)) {
      allPlans.push(uPlan);
    }
    log('allPlans - END');

    return allPlans;
  }),

  defaultGoalId: 'dream-manifest',
  defaultStateIds: 'dreamer-appears',
  customGoalId: null,
  customStateIds: null,

  init() {
    this._super(...arguments);
    // set default goal and state
    this.set('defaultGoalId', 'dream-manifest');
    this.set('defaultStateIds', 'dreamer-appears');
  },

  resetPlanner() {
    this.set('operatorsUsed', []);
  },

  currentPlan: null,

  // all operators from the store
  operators: computed(function () {
    let store = this.get('store');
    return store.peekAll('operator');
  }),
  operatorsUsed: null,

  currentSelections: null,

  //
  // plan(array,array): [boolean,array,array]
  //
  // Given a currentState and a list of goals, and
  // assuming a predefined list of OPERATORS, returns
  // true, the end state, and a plan if the goals can
  // be achieved; returns false, the currentState, and
  // an invalid plan otherwise.
  uGoal: null,
  uSuccess: null,
  uState: null,
  uPlan: null,
  uOperatorsUsed: null,
  uGoalComplete: computed('uPlan', function () {
    let plan = this.get('uPlan');
    let goalId = this.get('uGoal.id');
    let complete = false;
    plan.forEach((step) => {
      if (isPresent(step) && isPresent(step.operator)) {
        log('step', step);
        if (
          step.operator
            .get('additions')
            .map((proposition) => proposition.get('id'))
            .includes(goalId)
        ) {
          complete = true;
        }
      }
    });
    return complete;
  }),
  startInteractive(goalIds, currentStateIds) {
    log('startInteractive - START:', goalIds, currentStateIds);
    let store = this.get('store');
    let goals = [];
    let currentState = [];

    // ensure goal and state are arrays
    if (isPresent(goalIds) && !isArray(goalIds)) {
      goalIds = A([goalIds]);
    }
    if (isPresent(currentStateIds) && !isArray(currentStateIds)) {
      currentStateIds = A([currentStateIds]);
    }

    goalIds.forEach((goalId) => {
      goals.push(store.peekRecord('proposition', goalId));
    });
    currentStateIds.forEach((currentStateId) => {
      currentState.push(store.peekRecord('proposition', currentStateId));
    });

    let nextState = [...currentState]; // clone currentState
    let nextOperatorsUsed = A([]);
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
      log('   ' + proposition.get('id'));
    });

    // plan with attributes
    // include initial state as newAdditions
    currentPlan.push(nextPlanItem);
    goals.forEach((goal) => {
      this.set('uGoal', goal);
      // try {
      let result = this.achieveGoal(
        goal,
        nextState,
        currentPlan,
        nextOperatorsUsed // operators used starts empty
      );
      log('result', result);
      success = false;
      if (isPresent(result)) {
        [success, nextState, currentPlan, nextOperatorsUsed] = result;
      }
      /*
      } catch (e) {
        log('error', e);
        success = false;
      }
      */
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

    this.set('currentPlan', currentPlan);
    log(
      'plan - END:',
      success,
      nextState.map((proposition) => proposition.get('id')),
      currentPlan.map((item) => item.operator)
    );

    this.setProperties({
      uSuccess: success,
      uState: nextState.uniq(),
      uPlan: currentPlan,
      uOperatorsUsed: nextOperatorsUsed,
    });
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
  achieveGoal(goal, currentState, currentPlan, currentOperatorsUsed) {
    log(
      '%c achieveGoal - START:',
      'background-color: #bada55',
      goal.get('id'),
      currentState.map((proposition) => proposition.get('id')),
      currentPlan,
      currentOperatorsUsed
    );

    let nextState = [...currentState]; // clone currentState
    let nextPlan = [...currentPlan]; // clone currentPlan
    let nextOperatorsUsed = [...currentOperatorsUsed];

    if (
      nextState
        .map((proposition) => proposition.get('id'))
        .includes(goal.get('id'))
    ) {
      log(
        '%c achieveGoal - END:',
        'background-color: #bada55',
        true,
        currentState.map((operator) => operator.get('id')),
        currentPlan
      );
      return [true, currentState, currentPlan];
    } else {
      let selections = this.selectOperators(
        goal,
        nextState,
        nextOperatorsUsed,
        nextPlan
      );
      this.set('currentSelections', selections);
    }
  },
  uTakeStep(selections) {
    let goal = this.get('uGoal');
    let currentState = this.get('uState');
    let currentPlan = this.get('uPlan');
    let currentOperatorsUsed = this.get('uOperatorsUsed');
    let nextState = [...currentState]; // clone currentState
    let nextPlan = [...currentPlan]; // clone currentPlan
    let nextOperatorsUsed = [...currentOperatorsUsed];

    if (!isPresent(selections)) {
      // if no selections, failed to reach goal
      log(
        '%c achieveGoal - END (no selections):',
        'background-color: #bada55',
        false,
        currentState.map((operator) => operator.get('id')),
        currentPlan
      );
      return [false, currentState, currentPlan, currentOperatorsUsed];
    }
    let success = false;
    selections.forEach((operator) => {
      if (!success && isPresent(operator)) {
        // use the first operator that works
        [success, nextState, nextPlan, nextOperatorsUsed] = this.applyOperator(
          goal,
          operator,
          nextState,
          nextPlan,
          nextOperatorsUsed
        );
      }
      this.setProperties({
        uSuccess: success,
        uState: nextState.uniq(),
        uPlan: nextPlan,
        uOperatorsUsed: nextOperatorsUsed,
      });
    });

    if (success) {
      log(
        '%c achieveGoal - END EVERREACHED:',
        'background-color: #bada55',
        true,
        nextState.map((operator) => operator.get('id')),
        nextPlan
      );
      return [true, nextState, nextPlan, nextOperatorsUsed];
    } else {
      log(
        '%c achieveGoal - END EVERREACHED:',
        'background-color: #bada55',
        false,
        currentState.map((operator) => operator.get('id')),
        currentPlan
      );
      return [false, currentState, currentPlan, currentOperatorsUsed];
    }
  },
  //
  // getNewAdditions(array, array): [array]
  //
  // If plan is empty, return state;
  // otherwise return new additions from latest
  // plan item
  //
  // Returns an array of propositions
  //
  getNewAdditions(nextState, nextPlan) {
    log(
      '%c getNewAdditions - START:',
      'background-color: #d0d0d0',
      nextState.map((proposition) => proposition.get('id')),
      nextPlan
    );
    if (
      isPresent(nextPlan) &&
      isPresent(nextPlan.get('lastObject.newAdditions'))
    ) {
      log(
        '%c getNewAdditions - END:',
        'background-color: #d0d0d0',
        nextPlan
          .get('lastObject.newAdditions')
          .map((proposition) => proposition.get('id'))
      );

      return nextPlan.get('lastObject.newAdditions');
    }
    log(
      '%c getNewAdditions - END:',
      'background-color: #d0d0d0',
      nextState.map((proposition) => proposition.get('id'))
    );

    return nextState;
  },

  //
  // selectOperators(string): array
  //
  // Finds all operators containing the goal in the additions list.
  //
  selectOperators(goal, nextState, nextOperatorsUsed, nextPlan) {
    log(
      '%c selectOperators - START:',
      'background-color: #da55ba',
      goal.get('id'),
      nextOperatorsUsed
    );
    let selections = A([]);
    let operators = this.get('operators');
    let usedSelections = A([]);
    let unusedSelections = A([]);
    let newAdditions = this.getNewAdditions(nextState, nextPlan);
    let lastOperator = null; // most recent operator in plan
    let planner = this.get('planner');
    let allPlansNextOperators = null;
    let lastStep = nextPlan.lastObject;
    if (isPresent(lastStep.operator)) {
      lastOperator = lastStep.operator;
      allPlansNextOperators = planner.getNextOperators(lastOperator);
    }

    /*
    Select operators with a precondition enabled by a new addition
    */
    let newAdditionOperators = A([]);
    let notNewAdditionOperators = A([]);
    operators.forEach((operator) => {
      let match = false;

      newAdditions.forEach((proposition) => {
        if (
          operator
            .get('preconditions')
            .map((precondition) => precondition.get('id'))
            .includes(proposition.get('id'))
        ) {
          match = true;
        }
      });
      if (match) {
        newAdditionOperators.push(operator);
      } else {
        notNewAdditionOperators.push(operator);
      }
    });
    let sortedOperators = newAdditionOperators.concat(notNewAdditionOperators);

    // prioritize operators from backward search
    if (isPresent(allPlansNextOperators)) {
      sortedOperators = allPlansNextOperators.concat(sortedOperators);
    }

    // preconditions are met by state
    let stateIds = nextState.map((proposition) => proposition.get('id'));
    sortedOperators.forEach((operator) => {
      // state must meet preconditions
      let matchPreconditions = true;
      operator.get('preconditions').forEach((proposition) => {
        if (!stateIds.includes(proposition.get('id'))) {
          matchPreconditions = false;
        }
      });

      // additions must add something not already in state
      let matchAdditions = false;
      operator.get('additions').forEach((proposition) => {
        if (!stateIds.includes(proposition.get('id'))) {
          matchAdditions = true;
        }
      });

      if (matchPreconditions && matchAdditions) {
        selections.push(operator);
      }
    });
    selections = selections.uniqBy('name');

    // TRY TO FILTER OUT OPERATORS WITHOUT NEW ADDITIONS
    newAdditionOperators = A([]);
    notNewAdditionOperators = A([]);
    selections.forEach((operator) => {
      let match = false;

      newAdditions.forEach((proposition) => {
        if (
          operator
            .get('preconditions')
            .map((precondition) => precondition.get('id'))
            .includes(proposition.get('id'))
        ) {
          match = true;
        }
      });
      if (match) {
        newAdditionOperators.push(operator);
      } else {
        notNewAdditionOperators.push(operator);
      }
    });
    // should filter to only new additions?
    let filterOnlyNewAdditions = true;
    // yes if new additions include at least one all plans operator
    if (isPresent(allPlansNextOperators)) {
      filterOnlyNewAdditions = false;
      let allPlansOperatorsIds = allPlansNextOperators.map((operator) =>
        operator.get('id')
      );
      newAdditionOperators.forEach((operator) => {
        if (allPlansOperatorsIds.includes(operator.get('id'))) {
          filterOnlyNewAdditions = true;
        }
      });
      newAdditionOperators = allPlansNextOperators.concat(newAdditionOperators);
    }
    // no if new additions operators array is empty
    if (newAdditionOperators.length < 1) {
      filterOnlyNewAdditions = false;
    }
    // apply filter
    if (filterOnlyNewAdditions) {
      selections = newAdditionOperators;
    } else {
      selections = newAdditionOperators.concat(notNewAdditionOperators);
    }
    selections = selections.uniqBy('name');
    /*
    selections = operators;
    if (isPresent(allPlansNextOperators)) {
      selections = allPlansNextOperators;
    }
    */
    // preconditions are met by state
    // let stateIds = nextState.map((proposition) => proposition.get('id'));
    selections = selections.filter((operator) => {
      let matchPreconditions = true;
      operator.get('preconditions').forEach((proposition) => {
        if (!stateIds.includes(proposition.get('id'))) {
          matchPreconditions = false;
        }
      });
      return matchPreconditions;
    });

    // TRY TO FILTER OUT OPERATORS WITHOUT NEW ADDITIONS

    // Any operators that have been used before are
    // moved to the end of the list.
    selections.forEach((operator) => {
      if (nextOperatorsUsed.includes(operator.get('name'))) {
        usedSelections.push(operator);
      } else {
        unusedSelections.push(operator);
      }
    });

    selections = unusedSelections.concat(usedSelections);
    log(
      '%c selectOperators - END:',
      'background-color: #da55ba',
      selections.map((operator) => operator.get('id'))
    );
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
  applyOperator(
    goal,
    operator,
    currentState,
    currentPlan,
    currentOperatorsUsed
  ) {
    /*
    log(
      '%c applyOperator - START:',
      'background-color: #55bada',
      goal.get('id'),
      operator.get('name'),
      currentState.map((proposition) => proposition.get('id')),
      currentPlan,
      currentOperatorsUsed
    );
    */
    let nextState = [...currentState];
    let nextPlan = [...currentPlan];
    let nextOperatorsUsed = [...currentOperatorsUsed];
    let success = true;

    /*
    Hypothetically apply operator
    */
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
      nextState.uniq();
    });

    // plan with attributes
    nextPlan.push(nextPlanItem);

    // increment operator.useCount
    operator.set('useCount', operator.get('useCount') + 1);

    /*

    let operatorsUsed = this.get('operatorsUsed');
    if (operatorsUsed === null) {
      operatorsUsed = [];
    }
    */
    nextOperatorsUsed.push(operator.get('name'));
    // this.set('operatorsUsed', operatorsUsed);
    let result = this.achieveGoal(goal, nextState, nextPlan, nextOperatorsUsed);
    if (isPresent(result)) {
      [success, nextState, nextPlan, nextOperatorsUsed] = result;
    }
    this.setProperties({
      uSuccess: success,
      uState: nextState.uniq(),
      uPlan: nextPlan,
      uOperatorsUsed: nextOperatorsUsed,
    });
    /*
    log(
      '%c applyOperator - END:',
      'background-color: #55bada',
      success,
      nextState.map((propsition) => propsition.get('id')),
      nextPlan,
      nextOperatorsUsed
    );
    */
    return [success, nextState, nextPlan, nextOperatorsUsed];
    /*
    // return [true, nextState, nextPlan, nextOperatorsUsed];

    // Attempt to achieve each of the preconditions.
    operator.get('additions').forEach((proposition) => {
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
      // plan with attributes
    } else {
      log(
        '%c applyOperator - END:',
        'background-color: #55bada',
        false,
        currentState.map((proposition) => proposition.get('id')),
        currentPlan
      );
      return [false, currentState, currentPlan];
    }

    */
  },
});
