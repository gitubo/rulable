/**
 * Renders connections using the Geometry engine.
 */
import * as d3 from 'd3';
import { Connection } from '../domain/models/Connection';
import { Node } from '../domain/models/Node';
import { Registry } from '../core/Registry';
import { Store } from '../core/State';
import { PathCalculator } from './geometry/PathCalculator';
import { Config } from '../core/Config';
import { Selection, Position, HandlerId } from '../core/types';

export class LinkRenderer {
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
    connections: ReadonlyArray<Connection>,
    nodes: ReadonlyArray<Node>
  ): void {
    // Get handler positions from store cache
    const handlerPositions = this.getHandlerPositions();
    
    // Bind data
    const linkGroups = container
      .selectAll<SVGGElement, Connection>('g.connection')
      .data(connections as Connection[], (d: Connection) => d.id);
      
    // EXIT
    linkGroups.exit().remove();
    
    // ENTER
    const enterGroups = linkGroups.enter()
      .append('g')
      .attr('class', 'connection')
      .attr('data-connection-id', d => d.id);
      
    // Create link structure
    enterGroups.each((d, i, elements) => {
      const group = d3.select(elements[i]);
      this.createLinkStructure(group);
    });
    
    // UPDATE
    const allGroups = enterGroups.merge(linkGroups);
    
    allGroups.each((d, i, elements) => {
      const group = d3.select(elements[i]);
      this.updateLinkContent(group, d, nodes as Node[], handlerPositions);
    });
    
    // Update selection styles
    this.updateSelectionStyles(allGroups);
  }
  
  renderGhost(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    sourceHandlerId: string,
    targetPosition: { x: number; y: number }
  ): void {
    container.selectAll('.ghost-connection').remove();
    
    const sourcePos = this.store.getHandlerAbsolutePosition(sourceHandlerId as HandlerId);
    if (!sourcePos) return;
    
    const ghostGroup = container.append('g')
      .attr('class', 'ghost-connection');
      
    ghostGroup.append('path')
      .attr('class', 'ghost-path')
      .attr('d', `M ${sourcePos.x},${sourcePos.y} L ${targetPosition.x},${targetPosition.y}`)
      .style('stroke', Config.GHOST_CONNECTION_COLOR)
      .style('stroke-width', 2)
      .style('stroke-dasharray', '5,5')
      .style('fill', 'none')
      .style('pointer-events', 'none');
  }
  
  clearGhost(container: d3.Selection<SVGGElement, unknown, null, undefined>): void {
    container.selectAll('.ghost-connection').remove();
  }
  
  private createLinkStructure(
    group: d3.Selection<SVGGElement, Connection, null, undefined>
  ): void {
    // Invisible hit area for easier clicking
    group.append('path')
      .attr('class', 'connection-hitarea')
      .style('stroke', 'transparent')
      .style('stroke-width', 10)
      .style('fill', 'none')
      .style('cursor', 'pointer');
      
    // Visible path
    group.append('path')
      .attr('class', 'connection-path')
      .style('fill', 'none')
      .style('pointer-events', 'none');
      
    // Label group (optional)
    const labelGroup = group.append('g')
      .attr('class', 'connection-label')
      .style('display', 'none');
      
    labelGroup.append('rect')
      .attr('class', 'label-background')
      .attr('rx', 4)
      .attr('ry', 4);
      
    labelGroup.append('text')
      .attr('class', 'label-text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle');
  }
  
  private updateLinkContent(
    group: d3.Selection<SVGGElement, Connection, null, undefined>,
    connection: Connection,
    nodes: Node[],
    handlerPositions: Map<string, Position>
  ): void {
    // Calculate path
    const pathString = PathCalculator.calculatePath(connection, nodes, handlerPositions);
    
    // Update paths
    group.select('.connection-hitarea').attr('d', pathString);
    
    group.select('.connection-path')
      .attr('d', pathString)
      .style('stroke', connection.style.stroke || Config.DEFAULT_LINK_STROKE)
      .style('stroke-width', connection.style.strokeWidth || Config.DEFAULT_LINK_WIDTH)
      .style('stroke-dasharray', connection.style.strokeDasharray || null);
      
    // Update label if present
    if (connection.label) {
      this.renderLabel(group, connection, nodes, handlerPositions);
    } else {
      group.select('.connection-label').style('display', 'none');
    }
  }
  
  private renderLabel(
    group: d3.Selection<SVGGElement, Connection, null, undefined>,
    connection: Connection,
    nodes: Node[],
    handlerPositions: Map<string, Position>
  ): void {
    if (!connection.label) return;
    
    const labelGroup = group.select('.connection-label');
    labelGroup.style('display', null);
    
    // Calculate position along path
    const position = PathCalculator.calculatePositionAlongPath(
      connection,
      connection.label.offset,
      nodes,
      handlerPositions
    );
    
    if (!position) return;
    
    labelGroup.attr('transform', `translate(${position.x},${position.y})`);
    
    // Update text
    const text = labelGroup.select('.label-text')
      .text(connection.label.text)
      .style('font-size', connection.label.fontSize || 12)
      .style('fill', connection.label.color || '#333333');
      
    // Update background
    const bbox = (text.node() as SVGTextElement).getBBox();
    const padding = 4;
    
    labelGroup.select('.label-background')
      .attr('x', bbox.x - padding)
      .attr('y', bbox.y - padding)
      .attr('width', bbox.width + padding * 2)
      .attr('height', bbox.height + padding * 2)
      .style('fill', connection.label.bgColor || '#ffffff')
      .style('stroke', '#cccccc')
      .style('stroke-width', 1);
  }
  
  private updateSelectionStyles(
    groups: d3.Selection<SVGGElement, Connection, null, undefined>
  ): void {
    groups.each((d, i, elements) => {
      const group = d3.select(elements[i]);
      const isSelected = this.selectionState?.type === 'link' && 
                        this.selectionState?.id === d.id;
      
      group.select('.connection-path')
        .classed('selected', isSelected)
        .style('stroke', 
               isSelected ? Config.SELECTION_COLOR : 
               (d.style.stroke || Config.DEFAULT_LINK_STROKE))
        .style('stroke-width', isSelected ? 
               (d.style.strokeWidth || Config.DEFAULT_LINK_WIDTH) + 1 : 
               (d.style.strokeWidth || Config.DEFAULT_LINK_WIDTH));
    });
  }
  
  private getHandlerPositions(): Map<string, Position> {
    const map = new Map<string, Position>();
    const nodes = this.store.getAllNodes();
    
    nodes.forEach(node => {
      node.handlers.forEach(handler => {
        const pos = this.store.getHandlerAbsolutePosition(handler.id);
        if (pos) {
          map.set(handler.id, pos);
        }
      });
    });
    
    return map;
  }
}