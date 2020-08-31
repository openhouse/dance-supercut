import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
const { log } = console;

export default Component.extend({
  video: null,
  montage: service(),
  currentClip: alias('montage.currentClip'),

  canPlay(video) {
    this.get('montage').playing();
    video.classList.remove('opacity-0');
    video.classList.add('opacity-100');
    video.play();
  },
  ended() {
    this.get('montage').nextTick();
  },

  actions: {
    hasElement(element) {
      this.set('video', element);

      element.addEventListener(
        'canplay',
        () => {
          this.canPlay(element);
        },
        { once: true }
      );
      element.addEventListener('ended', () => {
        this.ended(element);
      });
    },
    canplay(e) {
      this.set('video', e.srcElement);
    },
    ended(e) {
      log('end');
    },
    nextClip() {},
  },
});
