/**
 * Infinite grid background implementation using SVG patterns.
 */
import * as d3 from 'd3';
import { Transform } from '../core/types';
import { Config } from '../core/Config';

export class Grid {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private gridGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private defs: d3.Selection<SVGDefsElement, unknown, null, undefined>;
  
  constructor(svg: SVGSVGElement) {
    this.svg = d3.select(svg);
    
    // Create defs for pattern if not exists
    const existingDefs = this.svg.select<SVGDefsElement>('defs');
    this.defs = existingDefs.empty() 
      ? this.svg.append('defs')
      : existingDefs;
    
    // Create grid group (lowest layer)
    this.gridGroup = this.svg.append('g')
      .attr('class', 'grid-layer')
      .lower(); // Ensure it's at the bottom
    
    this.createGridPattern();
    this.renderGrid();
  }
  
  private createGridPattern(): void {
    // Remove existing pattern if any
    this.defs.select('#grid-pattern').remove();
    
    const pattern = this.defs.append('pattern')
      .attr('id', 'grid-pattern')
      .attr('width', Config.GRID_SIZE)
      .attr('height', Config.GRID_SIZE)
      .attr('patternUnits', 'userSpaceOnUse');
      
    // Small dots at grid intersections
    pattern.append('circle')
      .attr('cx', 1)
      .attr('cy', 1)
      .attr('r', 1)
      .attr('fill', Config.GRID_COLOR);
  }
  
  private renderGrid(): void {
    this.gridGroup.selectAll('*').remove();
    
    // Huge rectangle to cover visible area (simulating infinite)
    // In a real infinite canvas, this might need dynamic resizing based on viewport
    this.gridGroup.append('rect')
      .attr('class', 'grid-background')
      .attr('x', -50000)
      .attr('y', -50000)
      .attr('width', 100000)
      .attr('height', 100000)
      .attr('fill', 'url(#grid-pattern)');
  }
  
  update(transform: Transform): void {
    this.gridGroup.attr('transform', 
      `translate(${transform.x},${transform.y}) scale(${transform.k})`
    );
  }
  
  setVisible(visible: boolean): void {
    this.gridGroup.style('display', visible ? null : 'none');
  }
}