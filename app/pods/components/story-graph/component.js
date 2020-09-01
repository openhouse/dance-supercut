/*
STORY GRAPH
Graph visualization of all operational plans from initial state to goal
Advances with montage to focus on operations
*/
import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { isPresent } from '@ember/utils';
import { alias } from '@ember/object/computed';
import { observer } from '@ember/object';
import * as d3 from 'd3';
import dagreD3 from 'dagre-d3';
import chunk from 'chunk-text';
const { log } = console;
const goldenRatio = 0.618033988749855;

export default Component.extend({
  planner: service(),
  montage: service(),
  currentOperator: alias('montage.currentOperator'),

  // SVG element
  svg: null,
  graph: null,
  zoom: null,
  // zoom to node to dispay operator name
  async centerOperator() {
    log('d3', d3);

    let name = this.get('currentOperator.name');

    let svg = this.get('svg');
    let inner = svg.select('g');
    let g = this.get('graph');
    let node = g._nodes[name];

    //create zoom handler
    let zoom_handler = d3.zoom().on('zoom', zoom_actions);

    //specify what to do when zoom event listener is triggered
    function zoom_actions() {
      inner.attr('transform', d3.zoomTransform(svg.node()));
    }

    //add zoom behaviour to the svg element
    zoom_handler(svg);
    log('node', node);

    let sizes = {
      svg: {
        viewport: {
          // viewport coordinate system
          width: svg.node().getBoundingClientRect().width,
          height: svg.node().getBoundingClientRect().height,
          top: svg.node().getBoundingClientRect().top,
          bottom: svg.node().getBoundingClientRect().bottom,
          left: svg.node().getBoundingClientRect().top,
          right: svg.node().getBoundingClientRect().bottom,
        },
        bbox: svg.node().getBBox(), // user coordinate system { x, y, width, height }
      },
      node: {
        x: node.x,
        y: node.y,
        bbox: node.elem.getBBox(), // user coordinate system { x, y, width, height }
      },
      graph: {
        width: g.graph().width,
        height: g.graph().height,
      },
    };

    let scaleX = sizes.svg.viewport.width / sizes.node.bbox.width;
    let scaleY = sizes.svg.viewport.height / sizes.node.bbox.height;
    let scale = Math.min(scaleX, scaleY) * goldenRatio;
    // scale = 3;
    // calculate composed transform
    let transform = d3.zoomIdentity
      .scale(scale) // scale svg
      .translate(-sizes.node.x, -sizes.node.y) // center node at viewport origin
      .translate(
        // horizontally center in viewport, vertically center in viewport lower third
        sizes.svg.viewport.width / 2 / scale,
        (sizes.svg.viewport.height * (goldenRatio + (1 - goldenRatio) / 2)) /
          scale
      );

    // perform animated zoom
    svg.transition().duration(3000).call(zoom_handler.transform, transform);
  },
  currentOperatorChanged: observer('currentOperator.id', function () {
    this.centerOperator();
  }),

  splitLines(text) {
    // add line breaks to nodes
    let twoLines = Math.ceil(text.length / 2) + 4;
    let threeLines = Math.ceil(text.length / 3) + 4;
    if (twoLines > 40) {
      return chunk(text, threeLines).join('\n');
    }
    return chunk(text, twoLines).join('\n');
  },

  drawGraph(self) {
    // Create a new directed graph

    // build nodes and edges
    let svg = d3.select('svg');
    let width = svg.node().getBoundingClientRect().width;
    let top = svg.node().getBoundingClientRect().top;
    let height = svg.node().getBoundingClientRect().height - top;

    const colors = {
      transparent: 'transparent',
      darkPink: '#340c1c',
      hiPink: '#fe3d89',
      biege: 'biege',
      white: '#eeefec',
      black: '#343435',
      rgbBlack: 'black',
    };

    /*
    //create zoom handler
    let zoom_handler = d3.zoom().on('zoom', zoom_actions);

    //specify what to do when zoom event listener is triggered
    function zoom_actions() {
      inner.attr('transform', d3.zoomTransform(svg.node()));
    }

    //add zoom behaviour to the svg element
    zoom_handler(svg);
    */

    const inner = svg.select('g');

    // create the graph
    // var g = new dagreD3.graphlib.Graph().setGraph({ ranker: 'network-simplex' });
    // var g = new dagreD3.graphlib.Graph().setGraph({ ranker: 'longest-path' });
    let g = new dagreD3.graphlib.Graph().setGraph({
      ranker: 'tight-tree',
      rankdir: 'tb', //rl bt tb
      nodesep: 38,
      ranksep: 38,
    });

    // load operators
    let allPlans = self.get('planner.allPlans');
    allPlans.forEach((plan) =>
      plan.forEach((step, stepIndex) => {
        if (isPresent(step.operator)) {
          let operator = step.operator;
          // add operator and edges to next operator
          g.setNode(operator.get('id'), {
            label: this.splitLines(operator.get('name')),
            labelStyle: `font-size: 1rem; fill: ${colors.white}`,
            style: `fill: ${colors.transparent}; stroke: ${colors.transparent}`,
          });
          if (stepIndex < plan.length - 1) {
            let nextOperator = plan[stepIndex + 1].operator;
            g.setEdge(operator.get('id'), nextOperator.get('id'), {
              weight: 1,
              curve: d3.curveBasis,
              style: `stroke: ${colors.white}; fill: transparent;`,
              arrowheadStyle: `stroke: transparent; fill: ${colors.white}`,
              class: 'shadow',
            });
          }
        }
      })
    );

    // Set some general styles
    g.nodes().forEach(function (v) {
      var node = g.node(v);
      node.rx = node.ry = 3;
    });

    // Create the renderer
    var render = new dagreD3.render();

    // Run the renderer. This is what draws the final graph.
    render(inner, g);

    /*
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
    */
    svg.selectAll('g.node').on('click', function (e) {
      console.log(e);
    });

    self.set('svg', svg);
    self.set('graph', g);
    // self.set('zoom', zoom_handler);
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
