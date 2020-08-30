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
    Infer propositions
    Add to store
    Return operators, propositions, clips as ember data
  */
  model() {
    let store = this.get('store');
    let promises = {
      operators: fetch('/operators.json'),
      clips: fetch('/clips.json'),
    };
    return hash(promises).then(function (results) {
      // collect propositions referenced in results
      let propositions = [];
      let addproposition = (proposition) => {
        if (!propositions.includes(proposition)) {
          propositions.push(proposition);
        }
      };

      // collect data as JSONapi objects
      let data = [];

      // operators have propositions as preconditions, additions, deletions
      results.operators.forEach((operator, position) => {
        let item = {
          type: 'operator',
          id: operator.name,
          attributes: {
            name: operator.name,
            position: position,
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
        operator.preconditions.forEach((proposition) => {
          item.relationships.preconditions.data.push({
            type: 'proposition',
            id: proposition,
          });
          addproposition(proposition);
        });
        operator.additions.forEach((proposition) => {
          item.relationships.additions.data.push({
            type: 'proposition',
            id: proposition,
          });
          addproposition(proposition);
        });
        operator.deletions.forEach((proposition) => {
          item.relationships.deletions.data.push({
            type: 'proposition',
            id: proposition,
          });
          addproposition(proposition);
        });

        data.push(item);
      });

      // clips belong to propositions
      results.clips.forEach((clip, position) => {
        let item = {
          type: 'clip',
          id: clip.slug,
          attributes: {
            slug: clip.slug,
            position: position,
          },
        };
        if (isPresent(clip.proposition)) {
          item.relationships = {
            proposition: {
              data: {
                type: 'proposition',
                id: clip.proposition,
              },
            },
          };
          addproposition(clip.proposition);
        }
        data.push(item);
      });

      // add propositions
      propositions.forEach((proposition) => {
        let item = {
          type: 'proposition',
          id: proposition,
          attributes: {
            slug: proposition,
          },
        };
        data.push(item);
      });

      // push to ember data store
      store.push({
        data: data,
      });
      return {
        operators: store.peekAll('operator'),
        propositions: store.peekAll('proposition'),
        clips: store.peekAll('clip'),
      };
    });
  },
});
