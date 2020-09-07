import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { computed, observer } from '@ember/object';
import { alias, sort } from '@ember/object/computed';
import { isPresent } from '@ember/utils';
import { A } from '@ember/array';
const { log } = console;

export default Service.extend({
  uPlanner: service(),
  uPlan: alias('uPlanner.uPlan'),
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
    uPlanner.startInteractive(['dream-manifest'], ['dreamer-appears']);
    this.set('playing', false);
  },

  // actions
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

  async clipEnded() {
    let vid = this.get('video');
    return new Promise(function (resolve) {
      vid.addEventListener('ended', () => {
        resolve();
      });
    });
  },
  async playStep() {
    log('playStep - START');
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
          vid.volume = 0;

          // show choices at min(120 words a minute, clip length)

          // wait while clip plays
          await this.clipEnded();
          // hide choices
          this.set('showChoices', false);

          // increment clip play count
          clip.set('playCount', clip.get('playCount') + 1);
        }
      }
    }

    // advance to next step
    uPlanner.uTakeStep(A([this.get('nextChoice')]));
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
    log('videoReady - START');
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
    let result = uPlanner.startInteractive(
      ['dream-manifest'],
      ['dreamer-appears']
    );
    log('result', result);
    this.set('playing', true);
    log('videoReady - END');
  },

  // detect when currentOperator has advanced and play operator
  onNextOperator: observer('currentStep', 'playing', function () {
    if (this.get('playing') && isPresent(this.get('currentStep'))) {
      this.playStep();
    }
  }),
});
