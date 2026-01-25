/**
 * Renders nodes, handles, and labels using D3.
 */
import * as d3 from 'd3';
import { Node } from '../domain/models/Node';
import { Handler } from '../domain/models/Handler';
import { Registry } from '../core/Registry';
import { Store } from '../core/State';
import { Config } from '../core/Config';
import { Selection } from '../core/types';

interface RenderContext {
  selection: d3.Selection<SVGGElement, Node, null, undefined>;
  node: Node;
  registry: Registry;
  store: Store;
}

export class NodeRenderer {
  private registry: Registry;
  private store: Store;
  private selectionState: Selection | null = null;
  
  constructor(registry: Registry, store: Store) {
    this.registry = registry;
    this.store = store;
  }
  
  setSelection(selection: Selection | null): void {
    this.selectionState = selection;
  }
  
  render(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    nodes: ReadonlyArray<Node>
  ): void {
    // Bind data with key function for object constancy
    const nodeGroups = container
      .selectAll<SVGGElement, Node>('g.node')
      .data(nodes as Node[], (d: Node) => d.id);
      
    // EXIT: Remove deleted nodes
    nodeGroups.exit().remove();
    
    // ENTER: Create new nodes
    const enterGroups = nodeGroups.enter()
      .append('g')
      .attr('class', 'node')
      .attr('data-node-id', d => d.id)
      .attr('data-node-type', d => d.type);
      
    // Create node structure for new elements
    enterGroups.each((d, i, nodes) => {
      const group = d3.select(nodes[i]);
      this.createNodeStructure(group, d);
    });
    
    // UPDATE: Merge enter + update selections
    const allGroups = enterGroups.merge(nodeGroups);
    
    // Update positions
    allGroups.attr('transform', d => `translate(${d.position.x},${d.position.y})`);
    
    // Update content
    allGroups.each((d, i, nodes) => {
      const group = d3.select(nodes[i]);
      this.updateNodeContent(group, d);
    });
    
    // Update selection styles
    this.updateSelectionStyles(allGroups);
  }
  
  private createNodeStructure(
    group: d3.Selection<SVGGElement, Node, null, undefined>,
    node: Node
  ): void {
    // Node body
    group.append('path')
      .attr('class', 'node-body')
      .style('cursor', 'move');
      
    // Icon container
    group.append('g')
      .attr('class', 'node-icon');
      
    // Label
    group.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .style('pointer-events', 'none')
      .style('user-select', 'none');
      
    // Handlers container
    group.append('g')
      .attr('class', 'handlers');
  }
  
  private updateNodeContent(
    group: d3.Selection<SVGGElement, Node, null, undefined>,
    node: Node
  ): void {
    const context: RenderContext = {
      selection: group,
      node,
      registry: this.registry,
      store: this.store
    };
    
    this.renderBody(context);
    this.renderIcon(context);
    this.renderLabel(context);
    this.renderHandlers(context);
  }
  
  private renderBody(context: RenderContext): void {
    const { selection, node } = context;
    const definition = this.registry.getNodeDefinition(node.type);
    if (!definition) return;
    
    const body = selection.select<SVGPathElement>('.node-body');
    
    // Get shape template and attributes
    const template = node.getShapeTemplate();
    const attributes = node.getShapeAttributes();
    
    body.attr('d', template);
    
    // Apply custom attributes
    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        body.attr(key, String(value));
      });
    }
    
    // Apply styles
    body
      .style('fill', node.style.fill || Config.DEFAULT_NODE_FILL)
      .style('stroke', node.style.stroke || Config.DEFAULT_NODE_STROKE)
      .style('stroke-width', node.style.strokeWidth || 2);
  }
  
  private renderIcon(context: RenderContext): void {
    const { selection, node } = context;
    const definition = this.registry.getNodeDefinition(node.type);
    if (!definition) return;
    
    const iconGroup = selection.select('.node-icon');
    iconGroup.selectAll('*').remove();
    
    const iconPath = definition.getIconPath();
    if (!iconPath) return;
    
    // Icon positioned at top-left with padding (Simple placement logic)
    const iconSize = 24;
    const padding = 12;
    
    iconGroup.append('path')
      .attr('d', iconPath)
      .attr('transform', `translate(${padding},${padding}) scale(${iconSize / 24})`)
      .style('fill', '#555') // Default icon color
      .style('pointer-events', 'none');
  }
  
  private renderLabel(context: RenderContext): void {
    const { selection, node } = context;
    const label = selection.select<SVGTextElement>('.node-label');
    
    // Center text based on node width/height
    label
      .attr('x', node.width / 2)
      .attr('y', node.height / 2 + 5) // Center vertically (+5 for baseline approx)
      .text(node.label)
      .style('font-size', node.style.fontSize || Config.DEFAULT_FONT_SIZE)
      .style('font-family', Config.DEFAULT_FONT_FAMILY);
      
    // Truncate if too long
    this.truncateText(label, node.width - 20);
  }
  
  private truncateText(
    textElement: d3.Selection<SVGTextElement, unknown, null, undefined>,
    maxWidth: number
  ): void {
    const node = textElement.node();
    if (!node) return;
    
    const text = textElement.text();
    let textLength = node.getComputedTextLength();
    
    if (textLength <= maxWidth) return;
    
    let truncated = text;
    while (truncated.length > 0 && textLength > maxWidth) {
      truncated = truncated.slice(0, -1);
      textElement.text(truncated + '…');
      textLength = node.getComputedTextLength();
    }
  }
  
  private renderHandlers(context: RenderContext): void {
    const { selection, node } = context;
    const handlersGroup = selection.select('.handlers');
    
    // Bind handler data
    const handlerGroups = handlersGroup
      .selectAll<SVGGElement, Handler>('g.handler')
      .data(node.handlers, (d: Handler) => d.id);
      
    // EXIT
    handlerGroups.exit().remove();
    
    // ENTER
    const enterHandlers = handlerGroups.enter()
      .append('g')
      .attr('class', 'handler')
      .attr('data-handler-id', d => d.id)
      .attr('data-handler-type', d => d.type)
      .attr('data-flow', d => d.flow);
      
    enterHandlers.append('path')
      .attr('class', 'handler-shape')
      .style('cursor', 'crosshair');
      
    enterHandlers.append('circle')
      .attr('class', 'handler-hitarea')
      .attr('r', 8)
      .style('fill', 'transparent')
      .style('cursor', 'crosshair');
      
    // UPDATE
    const allHandlers = enterHandlers.merge(handlerGroups);
    
    allHandlers.attr('transform', d => `translate(${d.offset.x},${d.offset.y})`);
    
    allHandlers.select('.handler-shape')
      .attr('d', d => d.getShapeTemplate())
      .style('fill', '#ffffff')
      .style('stroke', '#666666')
      .style('stroke-width', 2);
  }
  
  private updateSelectionStyles(
    groups: d3.Selection<SVGGElement, Node, null, undefined>
  ): void {
    groups.each((d, i, nodes) => {
      const group = d3.select(nodes[i]);
      const isSelected = this.selectionState?.type === 'node' && 
                        this.selectionState?.id === d.id;
      
      group.select('.node-body')
        .classed('selected', isSelected)
        .style('stroke', isSelected ? Config.SELECTION_COLOR : null)
        .style('stroke-width', isSelected ? 3 : null);
    });
  }
}