import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import { isPresent } from '@ember/utils';
const { log } = console;
export default Component.extend({
  montage: service(),
  videoDuration: alias('montage.videoDuration'),
  videoTime: alias('montage.videoTime'),
  videoMetaLoaded: alias('montage.videoMetaLoaded'),

  choiceProgressPercent: computed(
    'videoTime',
    'videoDuration',
    'choiceStart',
    function () {
      let videoTime = this.get('videoTime');
      let videoDuration = this.get('videoDuration');
      let choiceStart = this.get('choiceStart');
      if (videoTime < choiceStart) {
        return 0;
      }

      let percent =
        ((videoTime - choiceStart) / (videoDuration - choiceStart)) * 100;

      return percent;
    }
  ),

  // time in clip to start showing choices (seconds)
  choiceStart: computed('videoDuration', 'choiceTime', function () {
    let videoDuration = this.get('videoDuration');
    let choiceTime = this.get('choiceTime');
    let choiceStart = Math.max(3, videoDuration - choiceTime);
    return choiceStart;
  }),

  // how long to show choices (seconds)
  choiceTime: computed('choices', function () {
    // 120 words per minute
    let choices = this.get('choices');
    if (isPresent(choices)) {
      let allNames = choices.map((option) => {
        if (isPresent(option.operator)) {
          return option.operator.get('name');
        }
      });
      let names = allNames.join(' ');
      let words = names.split(' ');
      let wordCount = words.length;
      return wordCount * 2; // 2 seconds per word
    }
    return null;
  }),
  choices: computed('montage.choices', 'chosen', function () {
    let options = this.get('montage.choices');
    let chosen = this.get('chosen');
    let choices = [];
    if (isPresent(options)) {
      options.forEach((operator) => {
        let choice = {
          operator: operator,
          selected: false,
        };
        if (isPresent(chosen)) {
          if (chosen.get('id') == operator.get('id')) {
            choice.selected = true;
          }
        }
        choices.push(choice);
      });
    }
    return choices;
  }),

  chosen: null,
  showChoices: computed(
    'montage.showChoices',
    'choices',
    'videoTime',
    'choiceStart',
    'videoMetaLoaded',
    function () {
      let showChoices = false;
      let videoTime = this.get('videoTime');
      let choiceStart = this.get('choiceStart');

      let videoMetaLoaded = this.get('videoMetaLoaded');
      if (!videoMetaLoaded) {
        return false; // wait until duration loads
      }
      if (videoTime < choiceStart) {
        // wait until choice start time in clip
        return false;
      }
      // only show choices when more than one choice
      if (this.get('choices.length') > 1) {
        showChoices = this.get('montage.showChoices');
      }
      return showChoices;
    }
  ),

  mainClassNames: computed('showChoices', function () {
    let classes = ['frame'];
    if (this.get('showChoices')) {
      classes.push('active');
    }
    return classes.join(' ');
  }),

  actions: {
    choose(operator) {
      this.set('chosen', operator);
      this.set('montage.nextChoice', operator);
    },
  },
});
