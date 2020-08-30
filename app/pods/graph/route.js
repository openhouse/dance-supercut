import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default Route.extend({
  planner: service(),
  model() {
    return {
      planner: this.get('planner'),
    };
  },
});
