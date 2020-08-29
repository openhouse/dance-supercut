import Route from '@ember/routing/route';
import store from '@ember-data/store';
import fetch from 'ember-fetch/ajax';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';
import { isPresent } from '@ember/utils';
const { log } = console;

export default Route.extend({
  store: service(),
  /*
    Fetch operators and clips
    Infer situations
    Add to store
    Return operators, situations, clips as ember data
  */
  model() {
    let store = this.get('store');
    let promises = {
      operators: fetch('/operators.json'),
      clips: fetch('/clips.json'),
    };
    return hash(promises).then(function (results) {
      log(results);

      // collect situations referenced in results
      let situations = [];
      let addsituation = (situation) => {
        if (!situations.includes(situation)) {
          situations.push(situation);
        }
      };

      // collect data as JSONapi objects
      let data = [];

      // operators have situations as preconditions, additions, deletions
      results.operators.forEach((operator) => {
        let item = {
          type: 'operator',
          id: operator.name,
          attributes: {
            name: operator.name,
            /*
            // use relationships instead of attributes
            preconditions: operator.preconditions,
            additions: operator.additions,
            deletions: operator.deletions,
            */
          },
          relationships: {
            preconditions: {
              data: [],
            },
            additions: {
              data: [],
            },
            deletions: {
              data: [],
            },
          },
        };
        operator.preconditions.forEach((situation) => {
          item.relationships.preconditions.data.push({
            type: 'situation',
            id: situation,
          });
          addsituation(situation);
        });
        operator.additions.forEach((situation) => {
          item.relationships.additions.data.push({
            type: 'situation',
            id: situation,
          });
          addsituation(situation);
        });
        operator.deletions.forEach((situation) => {
          item.relationships.deletions.data.push({
            type: 'situation',
            id: situation,
          });
          addsituation(situation);
        });

        data.push(item);
      });

      // clips belong to situations
      results.clips.forEach((clip) => {
        let item = {
          type: 'clip',
          id: clip.slug,
          attributes: {
            slug: clip.slug,
          },
        };
        if (isPresent(clip.situation)) {
          item.relationships = {
            situation: {
              data: {
                type: 'situation',
                id: clip.situation,
              },
            },
          };
          addsituation(clip.situation);
        }
        data.push(item);
      });

      // add situations
      situations.forEach((situation) => {
        let item = {
          type: 'situation',
          id: situation,
          attributes: {
            slug: situation,
          },
        };
        data.push(item);
      });

      log(data);

      store.push({
        data: data,
      });
      return {
        operators: store.peekAll('operator'),
        situations: store.peekAll('situation'),
        clips: store.peekAll('clip'),
      };
    });
  },
});
