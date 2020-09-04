import Component from '@ember/component';
import { computed } from '@ember/object';
import { isPresent } from '@ember/utils';

export default Component.extend({
  percent: 0,
  value: 0,
  max: 100,
  width: computed('percent', 'value', 'max', function () {
    let percent = this.get('percent');
    let value = this.get('value');
    let max = this.get('max');

    if (isPresent(value) && isPresent(max)) {
      return (value / max) * 100;
    }
    return percent;
  }),
});
