import Component from '@ember/component';
import { computed } from '@ember/object';
import { isPresent } from '@ember/utils';
import { htmlSafe } from '@ember/template';

export default Component.extend({
  percent: 0,
  value: 0,
  max: 100,
  width: computed('percent', function () {
    let percent = this.get('percent');
    return htmlSafe(`width: ${percent}%;`);
  }),
});
