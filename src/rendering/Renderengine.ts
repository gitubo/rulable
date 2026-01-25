/**
 * Main orchestrator for the rendering loop and layer management.
 */
import * as d3 from 'd3';
import { Store } from '../core/State';
import { Registry } from '../core/Registry';
import { EventBus } from '../core/EventBus';
import { SelectionManager } from '../core/SelectionManager';
import { NodeRenderer } from './NodeRenderer';
import { LinkRenderer } from './LinkRenderer';
import { Grid } from './Grid';
import { Transform, NodeId } from '../core/types';

interface RenderState {
  isDirty: boolean;
  isGhostDirty: boolean;
  rafId: number | null;
}

export class RenderEngine {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private layers: {
    grid: Grid;
    notes: d3.Selection<SVGGElement, unknown, null, undefined>;
    links: d3.Selection<SVGGElement, unknown, null, undefined>;
    nodes: d3.Selection<SVGGElement, unknown, null, undefined>;
    overlay: d3.Selection<SVGGElement, unknown, null, undefined>;
  };
  
  private store: Store;
  private registry: Registry;
  private eventBus: EventBus;
  private selectionManager: SelectionManager;
  
  private nodeRenderer: NodeRenderer;
  private linkRenderer: LinkRenderer;
  
  private state: RenderState;
  
  constructor(
    svgElement: SVGSVGElement,
    store: Store,
    registry: Registry,
    eventBus: EventBus,
    selectionManager: SelectionManager
  ) {
    this.svg = d3.select(svgElement);
    this.store = store;
    this.registry = registry;
    this.eventBus = eventBus;
    this.selectionManager = selectionManager;
    
    this.state = {
      isDirty: true,
      isGhostDirty: false,
      rafId: null
    };
    
    this.nodeRenderer = new NodeRenderer(registry, store);
    this.linkRenderer = new LinkRenderer(registry, store);
    
    // Initialize Layers needs to be called after assignment
    this.layers = this.initializeLayers();
    this.subscribeToEvents();
  }
  
  private initializeLayers() {
    // Clear existing content
    this.svg.selectAll('*').remove();
    
    // Add defs
    this.svg.append('defs');
    
    // Create layers in Z-index order
    const grid = new Grid(this.svg.node()!);
    const notes = this.svg.append('g').attr('class', 'notes-layer');
    const links = this.svg.append('g').attr('class', 'links-layer');
    const nodes = this.svg.append('g').attr('class', 'nodes-layer');
    const overlay = this.svg.append('g').attr('class', 'overlay-layer');
    
    return { grid, notes, links, nodes, overlay };
  }
  
  private subscribeToEvents(): void {
    // Set dirty flag on any state change
    this.eventBus.on('RENDER_REQUESTED', () => this.requestRender());
    
    this.eventBus.on('SELECTION_CHANGED', (selection) => {
      this.nodeRenderer.setSelection(selection);
      this.linkRenderer.setSelection(selection);
      this.requestRender();
    });
  }
  
  startRenderLoop(): void {
    this.renderLoop();
  }
  
  stopRenderLoop(): void {
    if (this.state.rafId !== null) {
      cancelAnimationFrame(this.state.rafId);
      this.state.rafId = null;
    }
  }
  
  private renderLoop = (): void => {
    if (this.state.isDirty) {
      this.render();
      this.state.isDirty = false;
    }
    
    if (this.state.isGhostDirty) {
      this.renderGhost();
      this.state.isGhostDirty = false;
    }
    
    this.state.rafId = requestAnimationFrame(this.renderLoop);
  };
  
  requestRender(): void {
    this.state.isDirty = true;
  }
  
  requestGhostRender(): void {
    this.state.isGhostDirty = true;
  }
  
  render(): void {
    const nodes = this.store.getAllNodes();
    const links = this.store.getAllLinks();
    const transform = this.store.getTransform();
    
    // Update transform on all layers
    this.updateTransform(transform);
    
    // Render in layer order
    // Notes rendering would go here (omitted for MVP focus on Node/Link)
    
    this.linkRenderer.render(this.layers.links, links, nodes);
    this.nodeRenderer.render(this.layers.nodes, nodes);
  }
  
  renderGhost(): void {
    // Ghost rendering generally handled by specific transient interactions
    // This hook allows for additional frame-sync logic if needed
  }
  
  updateTransform(transform: Transform): void {
    const transformString = `translate(${transform.x},${transform.y}) scale(${transform.k})`;
    
    this.layers.grid.update(transform);
    this.layers.notes.attr('transform', transformString);
    this.layers.links.attr('transform', transformString);
    this.layers.nodes.attr('transform', transformString);
  }
  
  updateLinksOnly(nodeId?: NodeId): void {
    const nodes = this.store.getAllNodes();
    const links = nodeId 
      ? this.store.getLinksForNode(nodeId)
      : this.store.getAllLinks();
      
    this.linkRenderer.render(this.layers.links, links, nodes);
  }
  
  showGhostConnection(sourceHandlerId: string, targetPosition: { x: number; y: number }): void {
    const transform = this.store.getTransform();
    
    // Transform target position to graph coordinates to match SVG coordinate space
    const graphPosition = {
      x: (targetPosition.x - transform.x) / transform.k,
      y: (targetPosition.y - transform.y) / transform.k
    };
    
    this.linkRenderer.renderGhost(this.layers.overlay, sourceHandlerId, graphPosition);
  }
  
  clearGhostConnection(): void {
    this.linkRenderer.clearGhost(this.layers.overlay);
  }
  
  destroy(): void {
    this.stopRenderLoop();
    this.svg.selectAll('*').remove();
  }
}