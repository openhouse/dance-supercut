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
import ENV from 'let-nyc-dance/config/environment';
import { inject as service } from '@ember/service';
import { computed } from '@ember/object';
import { isPresent } from '@ember/utils';
import { A, isArray } from '@ember/array';

// const { log } = console;
const log = () => {};

export default Service.extend({
  store: service(),

  get defaultGoalId() {
    return ENV.APP.defaultGoalId;
  },
  get defaultStateIds() {
    return ENV.APP.defaultStateId;
  },
  /*
  defaultGoalId: 'dream-manifest',
  defaultStateIds: 'dreamer-appears',
  */
  customGoalId: null,
  customStateIds: null,
  currentPlan: null,
  operatorsUsed: null,

  init() {
    this._super(...arguments);
    // set default goal and state
    /*
    this.set('defaultGoalId', ENV.APP.defaultGoalId);
    this.set('defaultStateIds', ENV.APP.defaultStateId);
    */
  },

  resetPlanner() {
    this.set('operatorsUsed', []);
  },

  // generate array of all possible plans
  allPlansCache: null,
  // cache settings for all plans
  allPlansGoalIds: null,
  allPlansStateIds: null,

  makeAllPlans(customGoalIds, customStateIds) {
    // allow override of defaults
    let goalIds = this.get('defaultGoalId');
    let stateIds = this.get('defaultStateIds');

    // override defaults with custom
    // ensure that plan() recieves arrays as arguments
    if (isPresent(customGoalIds)) {
      if (isArray(customGoalIds)) {
        goalIds = customGoalIds;
      } else {
        goalIds = A([customGoalIds]);
      }
    }
    if (isPresent(customStateIds)) {
      if (isArray(customStateIds)) {
        stateIds = customStateIds;
      } else {
        stateIds = A([customStateIds]);
      }
    }

    // initialize
    this.resetPlanner();
    let allPlans = [];
    let allPlanIds = [];

    let running = true;
    while (running) {
      running = false;
      let [success, endState, plan] = this.plan(goalIds, stateIds);
      let planOperatorIds = plan.map((item) => {
        if (isPresent(item.operator) && isPresent(item.operator.get('id'))) {
          return item.operator.get('id');
        }
      });
      let planId = planOperatorIds.join('-');
      if (success && !allPlanIds.includes(planId)) {
        allPlans.push(plan);
        allPlanIds.push(planId);
        running = true;
      }
    }
    return allPlans;
  },

  allPlans: computed(
    'defaultGoalId',
    'defaultStateIds',
    'customGoalId',
    'customStateIds',
    function () {
      let customGoalIds = this.get('customGoalId');
      let customStateIds = this.get('customStateIds');
      if (isPresent(customGoalIds) && !isArray(customGoalIds)) {
        customGoalIds = A([customGoalIds]);
      }
      if (isPresent(customStateIds) && !isArray(customStateIds)) {
        customStateIds = A([customStateIds]);
      }

      let allPlans = this.makeAllPlans(customGoalIds, customStateIds);
      return allPlans;
    }
  ),

  /*
  planAdjacenctOperatorIds:
  from all backward search plans
  create a lookup object that maps an operator id
  to all next operator ids enroute to goal

  returns an object with operator ids as keys
  and arrays of operator ids as values
  */
  planAdjacenctOperatorIds: computed('allPlans.@each', function () {
    let allPlans = this.get('allPlans');
    let adjacencies = {};
    allPlans.forEach((plan) => {
      plan.forEach((step, stepIndex) => {
        if (isPresent(step.operator)) {
          let operator = step.operator;
          if (!isPresent(adjacencies[operator.get('id')])) {
            adjacencies[operator.get('id')] = A([]);
          }
          if (isPresent(plan[stepIndex + 1])) {
            let nextOperator = plan[stepIndex + 1].operator;
            if (
              !adjacencies[operator.get('id')].includes(nextOperator.get('id'))
            ) {
              adjacencies[operator.get('id')].push(nextOperator.get('id'));
            }
          }
        }
      });
    });
    return adjacencies;
  }),
  // return next operators for operator from all plans
  getNextOperators(operator) {
    if (isPresent(operator)) {
      let planAdjacenctOperatorIds = this.get('planAdjacenctOperatorIds');
      let operatorIds = planAdjacenctOperatorIds[operator.get('id')];
      if (isPresent(operatorIds)) {
        let operators = A([]);
        let store = this.get('store');
        operatorIds.forEach((operatorId) => {
          operators.push(store.peekRecord('operator', operatorId));
        });
        return operators;
      }
    }
    return null;
  },

  // all operators from the store
  operators: computed(function () {
    let store = this.get('store');
    return store.peekAll('operator');
  }),

  //
  // plan(array,array): [boolean,array,array]
  //
  // Given a currentState and a list of goals, and
  // assuming a predefined list of OPERATORS, returns
  // true, the end state, and a plan if the goals can
  // be achieved; returns false, the currentState, and
  // an invalid plan otherwise.
  plan(goalIds, currentStateIds) {
    log('plan - START:', goalIds, currentStateIds);
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
      try {
        [success, nextState, currentPlan] = this.achieveGoal(
          goal,
          nextState,
          currentPlan
        );
      } catch {
        success = false;
      }
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
    log(
      '%c achieveGoal - START:',
      'background-color: #bada55',
      goal,
      currentState.map((operator) => operator.get('id')),
      currentPlan
    );

    let nextState = [...currentState]; // clone currentState
    let nextPlan = [...currentPlan]; // clone currentPlan

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
        log(
          '%c achieveGoal - END:',
          'background-color: #bada55',
          true,
          nextState.map((operator) => operator.get('id')),
          nextPlan
        );
        return [true, nextState, nextPlan];
      } else {
        log(
          '%c achieveGoal - END:',
          'background-color: #bada55',
          false,
          currentState.map((operator) => operator.get('id')),
          currentPlan
        );
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
    log(
      '%c selectOperators - START:',
      'background-color: #da55ba',
      goal.get('id')
    );
    let selections = [];
    let sortedOperators = this.get('operators');
    let usedSelections = [];
    let unusedSelections = [];
    let operatorsUsed = this.get('operatorsUsed');
    if (operatorsUsed === null) {
      operatorsUsed = [];
    }

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
    // Any operators that have been used before are
    // moved to the end of the list.
    selections.forEach((operator) => {
      if (operatorsUsed.includes(operator.get('name'))) {
        usedSelections.push(operator);
      } else {
        unusedSelections.push(operator);
      }
    });

    selections = unusedSelections.concat(usedSelections);
    log(
      '%c selectOperators - END:',
      'background-color: #da55ba',
      selections.map((proposition) => proposition.get('id'))
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
  applyOperator(operator, currentState, currentPlan) {
    log(
      '%c applyOperator - START:',
      'background-color: #55bada',
      operator.get('name'),
      currentState.map((proposition) => proposition.get('id')),
      currentPlan
    );

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

      let operatorsUsed = this.get('operatorsUsed');
      if (operatorsUsed === null) {
        operatorsUsed = [];
      }
      operatorsUsed.push(operator.get('name'));
      this.set('operatorsUsed', operatorsUsed);
      log(
        '%c applyOperator - END:',
        'background-color: #55bada',
        true,
        nextState.map((proposition) => proposition.get('id')),
        nextPlan
      );
      return [true, nextState, nextPlan];
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
  },
});
