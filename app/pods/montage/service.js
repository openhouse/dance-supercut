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
  planIndex: null,
  playing: false,
  init() {
    this._super(...arguments);
    this.set('planIndex', 0);
    this.set('playing', false);
  },
  currentPlan: computed('allPlans', 'planIndex', function () {
    let allPlans = this.get('allPlans');
    if (isPresent(allPlans)) {
      return allPlans[this.get('planIndex') % allPlans.length];
    }
    return null;
  }),

  // actions
  video: null,
  currentClip: null,
  currentOperator: null,
  currentClips: null,
  currentClipsSorting: Object.freeze(['playCount', 'position']),
  currentClipsSorted: sort('currentClips', 'currentClipsSorting'),

  incrementPlan() {
    // increment plan on each play
    let planIndex = this.get('planIndex');
    if (isPresent(planIndex)) {
      planIndex = planIndex + 1;
    } else {
      planIndex = 0;
    }
    this.set('planIndex', planIndex);
  },

  async clipEnded() {
    let vid = this.get('video');
    return new Promise(function (resolve) {
      vid.addEventListener('ended', () => {
        resolve();
      });
    });
  },

  async process(plan) {
    let vid = this.get('video');
    for (const step of plan) {
      let { newAdditions, operator } = step;
      if (isPresent(operator) && isPresent(operator.get('name'))) {
        // update graph focus
        this.set('currentOperator', operator);
      }
      if (isPresent(newAdditions)) {
        for (const proposition of newAdditions) {
          let clips = proposition.get('clips');
          if (isPresent(clips)) {
            this.set('currentClips', clips);
            let clipsSorted = this.get('currentClipsSorted');
            let clip = clipsSorted.get('firstObject');
            this.set('currentClip', clip);
            vid.pause(); // Pause the video before switching the source.
            vid.src = clip.get('src');
            vid.currentTime = 0;
            vid.play();
            // wait while clip plays
            await this.clipEnded();

            // increment clip play count
            clip.set('playCount', clip.get('playCount') + 1);
          }
        }
      }
    }
  },

  async playPlan() {
    // increment plan on each play
    this.incrementPlan();

    // play plan
    this.set('playing', true);
    let currentPlan = this.get('currentPlan');
    await this.process(currentPlan);
  },
  videoReady(videoElement) {
    this.set('video', videoElement);
    this.playPlan();
  },
});
