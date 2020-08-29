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
    Infer elements
    Add to store
    Return operators, elements, clips as ember data
  */
  model() {
    let store = this.get('store');
    let promises = {
      operators: fetch('/operators.json'),
      clips: fetch('/clips.json'),
    };
    return hash(promises).then(function (results) {
      log(results);

      // collect elements referenced in results
      let elements = [];
      let addElement = (element) => {
        if (!elements.includes(element)) {
          elements.push(element);
        }
      };

      // collect data as JSONapi objects
      let data = [];

      // operators have elements as preconditions, additions, deletions
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
        operator.preconditions.forEach((element) => {
          item.relationships.preconditions.data.push({
            type: 'element',
            id: element,
          });
          addElement(element);
        });
        operator.additions.forEach((element) => {
          item.relationships.additions.data.push({
            type: 'element',
            id: element,
          });
          addElement(element);
        });
        operator.deletions.forEach((element) => {
          item.relationships.deletions.data.push({
            type: 'element',
            id: element,
          });
          addElement(element);
        });

        data.push(item);
      });

      // clips belong to elements
      results.clips.forEach((clip) => {
        let item = {
          type: 'clip',
          id: clip.slug,
          attributes: {
            slug: clip.slug,
          },
        };
        if (isPresent(clip.element)) {
          item.relationships = {
            element: {
              data: {
                type: 'element',
                id: clip.element,
              },
            },
          };
          addElement(clip.element);
        }
        data.push(item);
      });

      // add elements
      elements.forEach((element) => {
        let item = {
          type: 'element',
          id: element,
          attributes: {
            slug: element,
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
        clips: store.peekAll('clip'),
      };
    });
  },
});
