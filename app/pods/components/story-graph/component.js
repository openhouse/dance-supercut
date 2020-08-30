import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { isPresent } from '@ember/utils';
import * as d3 from 'd3';
import dagreD3 from 'dagre-d3';
import chunk from 'chunk-text';
const { log } = console;

export default Component.extend({
  planner: service(),

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
      white: '#eeefec',
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
    let allPlans = self.get('planner.allPlans');
    log(allPlans);
    let allNewAdditionIds = [];
    let allPlansOperators = [];

    allPlans.forEach((plan) =>
      plan.forEach((step) =>
        step.newAdditions.forEach((proposition) => {
          let id = proposition.get('id');
          log(id);
          allNewAdditionIds.push(id);
        })
      )
    );
    allPlans.forEach((plan) =>
      plan.forEach((step) => {
        if (isPresent(step.operator)) {
          allPlansOperators.push(step.operator);
        }
      })
    );
    log(allPlansOperators);
    /*
    allPlans.forEach((plan) => {
      plan.forEach();
      if (isPresent(plan.get('newAdditions'))) {
        plan.get('newAdditions').forEach((proposition) => {
          log(proposition);
        });
      }
    });*/
    log('allNewAdditionIds', allNewAdditionIds);

    let nodes = [];
    let edges = [];
    allPlans.forEach((plan) =>
      plan.forEach((step, stepIndex) => {
        if (isPresent(step.operator)) {
          let operator = step.operator;
          // add operator and edges to next operator
          g.setNode(operator.get('id'), {
            label: this.splitLines(operator.get('name')),
            labelStyle: 'font-size: 1em; fill: #a7a8a6;',
            style: `fill: ${colors.black}; stroke: ${colors.black}`,
          });
          if (stepIndex < plan.length - 1) {
            let nextOperator = plan[stepIndex + 1].operator;
            log(nextOperator);
            g.setEdge(operator.get('id'), nextOperator.get('id'), {
              weight: 1,
              curve: d3.curveBasis,
              style: 'stroke: #7b7b7b; fill: transparent;',
              arrowheadStyle: 'stroke: transparent; fill: #7b7b7b;',
            });
          }
        }
      })
    );

    /*
    allPlansOperators.forEach((operator) => {
      g.setNode(operator.get('id'), {
        label: this.splitLines(operator.get('name')),
        labelStyle: 'font-size: 1em; fill: #a7a8a6;',
        style: `fill: ${colors.black}; stroke: ${colors.black}`,
      });
      operator.preconditions.forEach((proposition) => {
        g.setNode(proposition.id, {
          label: this.splitLines(proposition.slug),
          labelStyle: 'font-size: 1em; fill: #a7a8a6;',
          style: `fill: ${colors.black}; stroke: ${colors.black}`,
        });
        g.setEdge(proposition.id, operator.id, {
          weight: 1,
          curve: d3.curveBasis,
          style: 'stroke: #7b7b7b; fill: transparent;',
          arrowheadStyle: 'stroke: transparent; fill: #7b7b7b;',
        });
      });
      operator.additions.forEach((proposition) => {
        g.setNode(proposition.id, {
          label: this.splitLines(proposition.slug),
          labelStyle: 'font-size: 1em; fill: #a7a8a6;',
          style: `fill: ${colors.black}; stroke: ${colors.black}`,
        });
        g.setEdge(operator.id, proposition.id, {
          weight: 1,
          curve: d3.curveBasis,
          style: 'stroke: #7b7b7b; fill: transparent;',
          arrowheadStyle: 'stroke: transparent; fill: #7b7b7b;',
        });
      });
    });
    */
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
