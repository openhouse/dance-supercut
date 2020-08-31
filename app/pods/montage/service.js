import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { computed } from '@ember/object';
import { alias, sort } from '@ember/object/computed';
import { isPresent } from '@ember/utils';
const { log } = console;

export default Service.extend({
  planner: service(),
  allPlans: alias('planner.allPlans'),

  // init
  planIndex: 0,
  stepIndex: 0,
  propositionIndex: 0,
  clipIndex: 0,
  hasPlayed: false,
  init() {
    this._super(...arguments);
    this.set('planIndex', 0);
    this.set('stepIndex', 0);
    this.set('propositionIndex', 0);
    this.set('clipIndex', 0);
  },

  // actions
  playing() {
    this.set('hasPlayed', true);
  },
  nextProposition() {},
  // queue management
  currentPlan: computed('allPlans', 'planIndex', function () {
    let allPlans = this.get('allPlans');
    if (isPresent(allPlans)) {
      return allPlans[this.get('planIndex') % allPlans.length];
    }
    return null;
  }),
  currentStep: computed('currentPlan', 'stepIndex', function () {
    let currentPlan = this.get('currentPlan');
    if (isPresent(currentPlan)) {
      return currentPlan[this.get('stepIndex') % currentPlan.length];
    }
    return null;
  }),
  currentPropositions: alias('currentStep.newAdditions'),
  currentProposition: computed(
    'currentPropositions',
    'propositionIndex',
    function () {
      let currentPropositions = this.get('currentPropositions');
      if (isPresent(currentPropositions)) {
        return currentPropositions[
          this.get('propositionIndex') % currentPropositions.length
        ];
      }
      return null;
    }
  ),
  currentClips: alias('currentProposition.clips'),
  currentClip: computed('currentClips', 'clipIndex', function () {
    let currentClips = this.get('currentClips');
    if (isPresent(currentClips)) {
      let currentClip = currentClips.objectAt(
        this.get('clipIndex') % currentClips.get('length')
      );
      log(currentClip);
      return currentClip;
    }
    return null;
  }),

  currentClipsSorting: Object.freeze(['playCount', 'position']),
  currentClipsSorted: sort('currentClips', 'currentClipsSorting'),
});
