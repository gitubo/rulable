/**
 * Renders connections using the Geometry engine.
 * FIXED: Labels positioned exactly on curves but always horizontal
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
    connections: ReadonlyArray<Readonly<Connection>>,
    nodes: ReadonlyArray<Readonly<Node>>
  ): void {
    const handlerPositions = this.getHandlerPositions();
    const connectionsArray = connections as any[];
    const nodesArray = nodes as any[];
    
    const linkGroups = container
      .selectAll<SVGGElement, Connection>('g.connection')
      .data(connectionsArray, (d: Connection) => d.id);
      
    linkGroups.exit().remove();
    
    const enterGroups = linkGroups.enter()
      .append('g')
      .attr('class', 'connection')
      .attr('data-connection-id', (d: Connection) => d.id);
      
    enterGroups.each((d: Connection, i: number, groups: ArrayLike<SVGGElement>) => {
      const group = d3.select(groups[i]);
      this.createLinkStructure(group as any);
    });
    
    const allGroups = enterGroups.merge(linkGroups);
    
    allGroups.each((d: Connection, i: number, groups: ArrayLike<SVGGElement>) => {
      const group = d3.select(groups[i]);
      this.updateLinkContent(group as any, d, nodesArray, handlerPositions);
    });
    
    this.updateSelectionStyles(allGroups as any);
  }
  
  renderGhost(
    container: d3.Selection<SVGGElement, unknown, null, undefined>,
    sourceHandlerId: string,
    targetPosition: { x: number; y: number }
  ): void {
    container.selectAll('.ghost-connection').remove();
    
    // CRITICAL FIX: Get the actual handler position, not node position
    const sourcePos = this.store.getHandlerAbsolutePosition(sourceHandlerId as HandlerId);
    if (!sourcePos) {
      console.warn('[LinkRenderer] Cannot render ghost: handler position not found', sourceHandlerId);
      return;
    }
    
    const ghostGroup = container.append('g')
      .attr('class', 'ghost-connection');
      
    // Draw line from handler center to target position
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
    group.append('path')
      .attr('class', 'connection-hitarea')
      .style('stroke', 'transparent')
      .style('stroke-width', 10)
      .style('fill', 'none')
      .style('cursor', 'pointer');
      
    group.append('path')
      .attr('class', 'connection-path')
      .style('fill', 'none')
      .style('pointer-events', 'none');
      
    const labelGroup = group.append('g')
      .attr('class', 'connection-label')
      .style('display', 'none')
      .style('pointer-events', 'all')
      .style('cursor', 'move');
      
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
    const pathString = PathCalculator.calculatePath(connection, nodes, handlerPositions);
    
    if (!pathString) {
      group.style('display', 'none');
      return;
    }
    
    group.style('display', null);
    
    group.select('.connection-hitarea').attr('d', pathString);
    
    const pathSelection = group.select('.connection-path')
      .attr('d', pathString)
      .style('stroke', connection.style.stroke || Config.DEFAULT_LINK_STROKE)
      .style('stroke-width', connection.style.strokeWidth || Config.DEFAULT_LINK_WIDTH);
    
    if (connection.style.strokeDasharray) {
      pathSelection.style('stroke-dasharray', connection.style.strokeDasharray);
    } else {
      pathSelection.style('stroke-dasharray', null);
    }
      
    if (connection.label && connection.label.text) {
      this.renderLabel(group, connection, nodes, handlerPositions, pathString);
    } else {
      group.select('.connection-label').style('display', 'none');
    }
  }
  
  private renderLabel(
    group: d3.Selection<SVGGElement, Connection, null, undefined>,
    connection: Connection,
    nodes: Node[],
    handlerPositions: Map<string, Position>,
    pathString: string
  ): void {
    if (!connection.label || !connection.label.text) return;
    
    const labelGroup = group.select('.connection-label');
    labelGroup.style('display', null);
    
    const offset = connection.label.offset !== undefined ? connection.label.offset : 0.5;
    
    // Get the actual rendered path element
    const pathElement = group.select('.connection-path').node() as SVGPathElement;
    if (!pathElement) return;
    
    const pathLength = pathElement.getTotalLength();
    const targetLength = pathLength * offset;
    
    // Get the EXACT point on the path
    const point = pathElement.getPointAtLength(targetLength);
    
    // FIXED: Position label at the point but keep it HORIZONTAL (no rotation)
    labelGroup.attr('transform', `translate(${point.x},${point.y})`);
    
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
      .style('stroke-width', 1)
      .style('opacity', 0.95);
  }
  
  private updateSelectionStyles(
    groups: d3.Selection<SVGGElement, Connection, null, undefined>
  ): void {
    groups.each((d: Connection, i: number, groups: ArrayLike<SVGGElement>) => {
      const group = d3.select(groups[i]);
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
    
    nodes.forEach((node: Readonly<Node>) => {
      node.handlers.forEach((handler: any) => {
        const pos = this.store.getHandlerAbsolutePosition(handler.id);
        if (pos) {
          map.set(handler.id, pos);
        }
      });
    });
    
    return map;
  }
}