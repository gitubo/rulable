/**
 * Infinite grid background implementation using SVG patterns.
 * Provides visual reference for the canvas with dynamic sizing.
 */
import * as d3 from 'd3';
import { Transform } from '../core/types';
import { Config } from '../core/Config';

export class Grid {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private gridGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private defs: d3.Selection<SVGDefsElement, unknown, null, undefined>;
  private gridRect: d3.Selection<SVGRectElement, unknown, null, undefined> | null = null;
  
  /**
   * Creates a new Grid instance.
   * @param svg - SVG element to render grid into
   */
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
  
  /**
   * Creates the repeating grid pattern definition.
   * Uses small dots at grid intersections.
   */
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
  
  /**
   * Renders the grid background rectangle.
   * Initializes with large dimensions, updated dynamically on transform.
   */
  private renderGrid(): void {
    this.gridGroup.selectAll('*').remove();
    
    // Start with reasonable default
    this.gridRect = this.gridGroup.append('rect')
      .attr('class', 'grid-background')
      .attr('x', -10000)
      .attr('y', -10000)
      .attr('width', 20000)
      .attr('height', 20000)
      .attr('fill', 'url(#grid-pattern)')
      .attr('pointer-events', 'none');
  }
  
  /**
   * Updates grid transform and expands size based on viewport.
   * Ensures grid coverage even at extreme zoom/pan levels.
   * @param transform - Current viewport transform
   */
  update(transform: Transform): void {
    this.gridGroup.attr('transform', 
      `translate(${transform.x},${transform.y}) scale(${transform.k})`
    );
    
    // Dynamically expand grid if viewport is zoomed out significantly
    if (this.gridRect && transform.k < 0.5) {
      const expansion = 1 / transform.k;
      const size = 20000 * expansion;
      const offset = -size / 2;
      
      this.gridRect
        .attr('x', offset)
        .attr('y', offset)
        .attr('width', size)
        .attr('height', size);
    } else if (this.gridRect && transform.k >= 0.5) {
      // Reset to default size for normal zoom levels
      this.gridRect
        .attr('x', -10000)
        .attr('y', -10000)
        .attr('width', 20000)
        .attr('height', 20000);
    }
  }
  
    /**
     * Shows or hides the grid.
     * @param visible - Whether grid should be visible
     */
    setVisible(visible: boolean): void {
    this.gridGroup.style('display', visible ? 'block' : 'none');
    }
}