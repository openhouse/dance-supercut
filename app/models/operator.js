import Model, { attr, hasMany } from '@ember-data/model';
import { computed } from '@ember/object';
import { equal } from '@ember/object/computed';
import { guidFor } from '@ember/object/internals';
import { inject as service } from '@ember/service';
import { isPresent } from '@ember/utils';
import { findAll } from 'highlight-words-core';
const { log } = console;

export default Model.extend({
  montage: service(),
  store: service(),

  // ATTRIBUTES
  name: attr(),
  position: attr('number', { defaultValue: 0 }),
  useCount: attr('number', { defaultValue: 0 }),
  // highlightChunks: attr(),

  // RELATIONSHIPS
  preconditions: hasMany('proposition', { inverse: 'asPreconditions' }),
  additions: hasMany('proposition', { inverse: 'asAdditions' }),
  deletions: hasMany('proposition', { inverse: 'asDeletions' }),

  // COMPUTED PROPERTIES
  guid: computed('name', function () {
    return guidFor(this.get('id'));
  }),
  isCurrentOperator: equal('name', 'montage.currentOperator.name'),

  highlightChunks: computed('name', function () {
    let terms = this.get('store').peekAll('term');
    let name = this.get('name');
    let searchWords = [];
    terms.forEach((term) => {
      searchWords.push(term.get('name'));
    });
    if (isPresent(name) && isPresent(terms)) {
      const chunks = findAll({
        caseSensitive: false,
        searchWords: searchWords,
        textToHighlight: name,
      });
      log('chunks', chunks);
      return chunks;
    }
    return null;
  }),
  highlighted: computed('name', 'highlightChunks.@each', function () {
    let chunks = this.get('highlightChunks');
    let name = this.get('name');
    const highlightedText = chunks
      .map((chunk) => {
        const { end, highlight, start } = chunk;
        const text = name.substr(start, end - start);
        if (highlight) {
          return `<mark>${text}</mark>`;
        } else {
          return text;
        }
      })
      .join('');
    return highlightedText;
  }),
});
