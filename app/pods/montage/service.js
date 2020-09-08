import Service from '@ember/service';
import ENV from 'let-nyc-dance/config/environment';
import { inject as service } from '@ember/service';
import { computed, observer } from '@ember/object';
import { alias, sort } from '@ember/object/computed';
import { isPresent } from '@ember/utils';
import { A } from '@ember/array';
import { next } from '@ember/runloop';

const { log } = console;

export default Service.extend({
  get defaultGoal() {
    return A([ENV.APP.defaultGoalId]);
  },
  get defaultState() {
    return A([ENV.APP.defaultStateId]);
  },
  video: null,
  videoDuration: null,
  videoTime: null,
  videoMetaLoaded: false,
  currentClip: null,
  currentStep: alias('uPlanner.uPlan.lastObject'),
  currentOperator: alias('uPlanner.uPlan.lastObject.operator'),
  currentClips: null,
  currentClipsSorting: Object.freeze(['playCount', 'position']),
  currentClipsSorted: sort('currentClips', 'currentClipsSorting'),
  nextChoice: null,
  showChoces: false,
  userHasStarted: false, // waiting on user to hit play

  uPlanner: service(),
  uPlan: alias('uPlanner.uPlan'),

  // choices of next operators for the MultiChoice UI
  choices: computed('allChoices', function () {
    let allChoices = this.get('allChoices');
    if (isPresent('allChoices')) {
      return allChoices.slice(0, 3);
    }
    return allChoices;
  }),
  allChoices: alias('uPlanner.currentSelections'),
  playing: false,

  // init
  init() {
    this._super(...arguments);
    let uPlanner = this.get('uPlanner');

    // intialize interactive plan
    uPlanner.startInteractive(
      this.get('defaultGoal'),
      this.get('defaultState')
    );
    this.set('playing', false);
    this.set('userHasStarted', false);
  },

  // actions

  // restart at end
  uGoalCompleteObserver: observer('montage.uGoalComplete', function () {
    let complete = this.get('montage.uGoalComplete');
    if (complete) {
      this.init();
    }
  }),

  async clipEnded() {
    let vid = this.get('video');
    return new Promise(function (resolve) {
      vid.addEventListener('ended', () => {
        resolve();
      });
    });
  },
  async playStep() {
    let vid = this.get('video');
    let { newAdditions, operator } = this.get('currentStep');
    let uPlanner = this.get('uPlanner');

    /*
    if (isPresent(operator) && isPresent(operator.get('name'))) {
      // update graph focus
      this.set('currentOperator', operator);
    }
    */
    let choices = this.get('choices');
    // set default next step
    this.set('nextChoice', choices.get('firstObject'));

    if (isPresent(newAdditions)) {
      for (const [index, proposition] of newAdditions.entries()) {
        // show choices for last clip in step
        if (index == newAdditions.length - 1) {
          this.set('showChoices', true);
        } else {
          this.set('showChoices', false);
        }

        let clips = proposition.get('clips');
        if (isPresent(clips)) {
          this.set('currentClips', clips);
          let clipsSorted = this.get('currentClipsSorted');
          let clip = clipsSorted.get('firstObject');
          this.set('currentClip', clip);
          vid.pause(); // Pause the video before switching the source.
          this.set('videoMetaLoaded', false); // hide choices until duration loads
          vid.src = clip.get('src');
          vid.currentTime = 0;
          vid.play();
          vid.volume = 1;
          // showing MultiChoice UI is triggered elsewhere by video element events

          // wait while clip plays
          await this.clipEnded();
          // hide choices
          this.set('showChoices', false);

          // increment clip play count
          clip.set('playCount', clip.get('playCount') + 1);
        }
      }
    }

    // END or advance to next step
    if (this.get('uPlanner.uGoalComplete')) {
      // END
      this.init();
    } else {
      // advance to next step
      let self = this;
      next(self, function () {
        // code to be executed in the next run loop,
        // which will be scheduled after the current one
        let result = uPlanner.uTakeStep(A([self.get('nextChoice')]));
        let [success, nextState, nextPlan, nextOperatorsUsed] = result;
        if (!success) {
          self.init();
        }
        log('uPlanner.uTakeStep', result);
      });
    }
  },

  durationChange() {
    let video = this.get('video');
    if (isPresent(video) && isPresent(video.duration)) {
      let duration = video.duration;
      this.set('videoDuration', duration);
      this.set('videoMetaLoaded', true);
    }
  },
  timeUpdate() {
    let video = this.get('video');
    if (isPresent(video) && isPresent(video.currentTime)) {
      let currentTime = video.currentTime;
      this.set('videoTime', currentTime);
      this.set('videoMetaLoaded', true);
    }
  },

  // DOM video element is ready
  videoReady(videoElement) {
    let self = this;

    // add video element event listeners
    videoElement.ondurationchange = function () {
      self.durationChange();
    };
    videoElement.ontimeupdate = function () {
      self.timeUpdate();
    };

    this.set('video', videoElement);
    let uPlanner = this.get('uPlanner');
    uPlanner.startInteractive(
      this.get('defaultGoal'),
      this.get('defaultState')
    );
    this.set('playing', true);
  },

  // trigger play for each new operator
  // detect when currentOperator has advanced and play operator
  onNextOperator: observer('currentStep', 'playing', function () {
    if (this.get('playing') && isPresent(this.get('currentStep'))) {
      if (this.get('userHasStarted')) {
        // user has to hit play to kick it off
        this.playStep();
      }
    }
  }),
});
