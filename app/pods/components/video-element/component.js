import Component from '@ember/component';

export default Component.extend({
  tagName: 'video',
  didInsertElement() {
    this._super(...arguments);
    // pass element reference to parent component
    this.hasElement(this.element);
  },
});
