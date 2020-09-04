import Component from '@ember/component';
import { computed } from '@ember/object';

export default Component.extend({
  selected: false,
  classes: computed('selected', function () {
    let classes = ['btn'];
    if (this.get('selected')) {
      classes.push('selected');
    }
    return classes.join(' ');
  }),
  classNameBindings: ['classes'],
});
