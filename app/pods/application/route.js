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
    Infer signifieds
    Add to store
    Return operators, signifieds, clips as ember data
  */
  model() {
    let store = this.get('store');
    let promises = {
      operators: fetch('/operators.json'),
      clips: fetch('/clips.json'),
    };
    return hash(promises).then(function (results) {
      log(results);

      // collect signifieds referenced in results
      let signifieds = [];
      let addsignified = (signified) => {
        if (!signifieds.includes(signified)) {
          signifieds.push(signified);
        }
      };

      // collect data as JSONapi objects
      let data = [];

      // operators have signifieds as preconditions, additions, deletions
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
        operator.preconditions.forEach((signified) => {
          item.relationships.preconditions.data.push({
            type: 'signified',
            id: signified,
          });
          addsignified(signified);
        });
        operator.additions.forEach((signified) => {
          item.relationships.additions.data.push({
            type: 'signified',
            id: signified,
          });
          addsignified(signified);
        });
        operator.deletions.forEach((signified) => {
          item.relationships.deletions.data.push({
            type: 'signified',
            id: signified,
          });
          addsignified(signified);
        });

        data.push(item);
      });

      // clips belong to signifieds
      results.clips.forEach((clip) => {
        let item = {
          type: 'clip',
          id: clip.slug,
          attributes: {
            slug: clip.slug,
          },
        };
        if (isPresent(clip.signified)) {
          item.relationships = {
            signified: {
              data: {
                type: 'signified',
                id: clip.signified,
              },
            },
          };
          addsignified(clip.signified);
        }
        data.push(item);
      });

      // add signifieds
      signifieds.forEach((signified) => {
        let item = {
          type: 'signified',
          id: signified,
          attributes: {
            slug: signified,
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
        signifieds: store.peekAll('signified'),
        clips: store.peekAll('clip'),
      };
    });
  },
});
