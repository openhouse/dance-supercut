import Component from '@ember/component';
import * as d3 from 'd3';
import dagreD3 from 'dagre-d3';
import chunk from 'chunk-text';
import { isPresent } from '@ember/utils';
const { log } = console;

export default Component.extend({
  splitLines: function (text) {
    return chunk(text, 22).join('\n');
  },
  svg: null,
  graph: null,
  drawGraph(self) {
    // build nodes and edges
    let svg = d3.select('svg');
    let width = svg.node().getBoundingClientRect().width;
    let top = svg.node().getBoundingClientRect().top;
    let height = svg.node().getBoundingClientRect().height - top;

    const colors = {
      green: '#79c039',
      yellow: '#ffce50',
      orange: '#ffb101',
      red: '#d04667',
      purple: '#977db5',
      blue: '#1098d9',
      sky: '#5dd2fd',
      lime: '#bdeacb',
      pink: '#fe3d89',
      black: '#343435',
    };

    //create zoom handler
    var zoom_handler = d3.zoom().on('zoom', zoom_actions);

    //specify what to do when zoom event listener is triggered
    function zoom_actions() {
      inner.attr('transform', d3.zoomTransform(svg.node()));
    }

    //add zoom behaviour to the svg element
    zoom_handler(svg);

    const inner = svg.select('g');

    //  tcp-state-diagram EXAMPLE
    //
    // Create a new directed graph
    // var g = new dagreD3.graphlib.Graph().setGraph({ ranker: 'network-simplex' });

    // var g = new dagreD3.graphlib.Graph().setGraph({ ranker: 'longest-path' });
    var g = new dagreD3.graphlib.Graph().setGraph({
      ranker: 'tight-tree',
      rankdir: 'tb', //rl bt tb
      nodesep: 38,
      ranksep: 38,
    });

    // load operators
    let operators = self.get('operators');
    let nodes = [];
    let edges = [];
    operators.forEach((operator) => {
      g.setNode(operator.id, {
        label: this.splitLines(operator.name),
        labelStyle: 'font-size: 1em; fill: #a7a8a6;',
        style: 'fill: #080d0a; stroke: #080d0a;',
      });
      operator.preconditions.forEach((situation) => {
        g.setNode(situation.id, {
          label: this.splitLines(situation.slug),
          labelStyle: 'font-size: 1em; fill: #a7a8a6;',
          style: 'fill: #080d0a; stroke: #080d0a;',
        });
        g.setEdge(situation.id, operator.id, {
          weight: 1,
          curve: d3.curveBasis,
          style: 'stroke: #7b7b7b; fill: transparent;',
          arrowheadStyle: 'stroke: transparent; fill: #7b7b7b;',
        });
      });
      operator.additions.forEach((situation) => {
        g.setNode(situation.id, {
          label: this.splitLines(situation.slug),
          labelStyle: 'font-size: 1em; fill: #a7a8a6;',
          style: 'fill: #080d0a; stroke: #080d0a;',
        });
        g.setEdge(operator.id, situation.id, {
          weight: 1,
          curve: d3.curveBasis,
          style: 'stroke: #7b7b7b; fill: transparent;',
          arrowheadStyle: 'stroke: transparent; fill: #7b7b7b;',
        });
      });
    });

    // Set some general styles
    g.nodes().forEach(function (v) {
      var node = g.node(v);
      node.rx = node.ry = 3;
    });

    // Create the renderer
    var render = new dagreD3.render();

    // Run the renderer. This is what draws the final graph.
    render(inner, g);

    // Center the graph
    var initialScale = 0.75;
    zoom_handler.transform(svg, d3.zoomIdentity);

    let gHeight = g.graph().height;
    let gWidth = g.graph().width;

    let _height = height - gHeight;
    let _width = width - gWidth;

    let heightScale = height / gHeight;
    let widthScale = width / gWidth;
    let scale = heightScale;
    if (heightScale > widthScale) {
      scale = widthScale;
    }

    svg
      .call(zoom_handler.translateBy, _width / 2, _height / 2)
      // .call(zoom_handler.scaleBy, scale * 0.618033988749855);
      // .call(zoom_handler.scaleBy, scale * 0.7639320225);
      .call(zoom_handler.scaleBy, scale * 0.854101966249722);

    svg.selectAll('g.node').on('click', function (e) {
      console.log(e);
    });

    self.set('svg', svg);
    self.set('graph', g);
  },

  reframe() {
    let g = this.get('g');
    let svg = this.get('svg');

    let width = svg.node().getBoundingClientRect().width;
    let top = svg.node().getBoundingClientRect().top;
    let height = svg.node().getBoundingClientRect().height - top;
  },

  didRender() {
    this._super(...arguments);
    this.drawGraph(this);
  },
});
