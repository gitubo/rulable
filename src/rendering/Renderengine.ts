/**
 * Main orchestrator for the rendering loop and layer management.
 * FIXED: Accepts graph coordinates for ghost connection
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
    
    this.layers = this.initializeLayers();
    this.subscribeToEvents();
  }
  
  private initializeLayers() {
    this.svg.selectAll('*').remove();
    
    this.svg.append('defs');
    
    const grid = new Grid(this.svg.node()!);
    const notes = this.svg.append('g').attr('class', 'notes-layer');
    const links = this.svg.append('g').attr('class', 'links-layer');
    const nodes = this.svg.append('g').attr('class', 'nodes-layer');
    const overlay = this.svg.append('g').attr('class', 'overlay-layer');
    
    return { grid, notes, links, nodes, overlay };
  }
  
  private subscribeToEvents(): void {
    this.eventBus.on('RENDER_REQUESTED', () => this.requestRender());
    
    this.eventBus.on('SELECTION_CHANGED', (selection: any) => {
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
    
    this.updateTransform(transform);
    
    this.linkRenderer.render(this.layers.links, links as any, nodes as any);
    this.nodeRenderer.render(this.layers.nodes, nodes as any);
  }
  
  renderGhost(): void {
    // Ghost rendering handled by specific methods
  }
  
  updateTransform(transform: Transform): void {
    const transformString = `translate(${transform.x},${transform.y}) scale(${transform.k})`;
    
    this.layers.grid.update(transform);
    this.layers.notes.attr('transform', transformString);
    this.layers.links.attr('transform', transformString);
    this.layers.nodes.attr('transform', transformString);
    this.layers.overlay.attr('transform', transformString);
  }
  
  updateLinksOnly(nodeId?: NodeId): void {
    const nodes = this.store.getAllNodes();
    const links = nodeId 
      ? this.store.getLinksForNode(nodeId)
      : this.store.getAllLinks();
      
    this.linkRenderer.render(this.layers.links, links as any, nodes as any);
  }
  
  showGhostConnection(sourceHandlerId: string, targetGraphPosition: { x: number; y: number }): void {
    // FIXED: Input is already in graph coordinates, just pass it through
    this.linkRenderer.renderGhost(this.layers.overlay, sourceHandlerId, targetGraphPosition);
  }
  
  clearGhostConnection(): void {
    this.linkRenderer.clearGhost(this.layers.overlay);
  }
  
  destroy(): void {
    this.stopRenderLoop();
    this.svg.selectAll('*').remove();
  }
}