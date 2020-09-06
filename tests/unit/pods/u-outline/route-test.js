import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Route | u-outline', function(hooks) {
  setupTest(hooks);

  test('it exists', function(assert) {
    let route = this.owner.lookup('route:u-outline');
    assert.ok(route);
  });
});
