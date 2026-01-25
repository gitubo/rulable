/**
 * Input handling system using State pattern for interaction modes.
 * Manages mouse/keyboard events and coordinates with rendering and state systems.
 */
import * as d3 from 'd3';
import { Store } from '../core/State';
import { Registry } from '../core/Registry';
import { EventBus } from '../core/EventBus';
import { SelectionManager } from '../core/SelectionManager';
import { RenderEngine } from '../rendering/RenderEngine';
import { InlineEditor } from '../components/InlineEditor';
import { Position, NodeId, HandlerId, Transform } from '../core/types';
import { CoordinateTransform } from '../utils/CoordinateTransform';
import { Config } from '../core/Config';

// ========== STATE INTERFACES ==========

/**
 * Base class for interaction states.
 * Each state handles mouse/keyboard events differently.
 */
abstract class InteractionState {
  constructor(protected context: InputSystem) {}
  
  onMouseDown(event: MouseEvent): void {}
  onMouseMove(event: MouseEvent): void {}
  onMouseUp(event: MouseEvent): void {}
  onDoubleClick(event: MouseEvent): void {}
  onKeyDown(event: KeyboardEvent): void {}
  
  enter(): void {}
  exit(): void {}
}

// ========== IDLE STATE ==========

/**
 * Default state when no interaction is active.
 * Handles clicks for selection and initiates drag/creation operations.
 */
class IdleState extends InteractionState {
  onMouseDown(event: MouseEvent): void {
    const target = event.target as SVGElement;
    
    // Check what was clicked
    const nodeElement = target.closest('[data-node-id]') as SVGElement | null;
    const handlerElement = target.closest('[data-handler-id]') as SVGElement | null;
    const linkElement = target.closest('[data-connection-id]') as SVGElement | null;
    
    if (handlerElement && event.button === 0) {
      // Start connection creation
      const handlerId = handlerElement.getAttribute('data-handler-id')!;
      this.context.setState(new ConnectionCreationState(this.context, handlerId));
      return;
    }
    
    if (nodeElement && event.button === 0) {
      // Start node drag
      const nodeId = nodeElement.getAttribute('data-node-id')!;
      const node = this.context.store.getNode(nodeId as NodeId);
      if (!node) return;
      
      const mousePos = this.context.getMousePosition(event);
      this.context.selectionManager.selectNode(nodeId as NodeId);
      this.context.setState(new NodeDragState(
        this.context,
        nodeId as NodeId,
        { ...node.position },
        mousePos
      ));
      return;
    }
    
    if (linkElement && event.button === 0) {
      // Select link
      const linkId = linkElement.getAttribute('data-connection-id')!;
      this.context.selectionManager.selectLink(linkId as any);
      return;
    }
    
    // Click on background - clear selection
    this.context.selectionManager.clearSelection();
  }
  
  onDoubleClick(event: MouseEvent): void {
    const target = event.target as SVGElement;
    const nodeElement = target.closest('[data-node-id]') as SVGElement | null;
    
    if (nodeElement) {
      const nodeId = nodeElement.getAttribute('data-node-id')!;
      this.context.startNodeLabelEdit(nodeId as NodeId, event);
    }
  }
}

// ========== NODE DRAG STATE ==========

/**
 * State for dragging nodes around the canvas.
 * Provides smooth movement with grid snapping on release.
 */
class NodeDragState extends InteractionState {
  private hasMoved = false;
  
  constructor(
    context: InputSystem,
    private nodeId: NodeId,
    private initialPosition: Position,
    private startMouse: Position
  ) {
    super(context);
  }
  
  enter(): void {
    // Disable zoom/pan during drag
    this.context.setZoomEnabled(false);
    document.body.style.cursor = 'grabbing';
  }
  
  exit(): void {
    this.context.setZoomEnabled(true);
    document.body.style.cursor = '';
    
    // Commit to history if moved
    if (this.hasMoved) {
      this.context.eventBus.emit('HISTORY_CHANGED', {
        canUndo: true,
        canRedo: false
      });
    }
  }
  
  onMouseMove(event: MouseEvent): void {
    const currentMouse = this.context.getMousePosition(event);
    
    const dx = currentMouse.x - this.startMouse.x;
    const dy = currentMouse.y - this.startMouse.y;
    
    const newPosition = {
      x: this.initialPosition.x + dx,
      y: this.initialPosition.y + dy
    };
    
    // Update node position (high-frequency, no history snapshot yet)
    this.context.store.moveNode(this.nodeId, newPosition);
    this.hasMoved = true;
    
    // Update only connected links for performance
    this.context.renderEngine.updateLinksOnly(this.nodeId);
  }
  
  onMouseUp(event: MouseEvent): void {
    if (this.hasMoved) {
      // Apply grid snapping
      const node = this.context.store.getNode(this.nodeId);
      if (node) {
        const snapped = CoordinateTransform.snapToGrid(node.position);
        this.context.store.moveNode(this.nodeId, snapped);
      }
    }
    
    this.context.setState(new IdleState(this.context));
  }
  
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      // Cancel drag - restore original position
      this.context.store.moveNode(this.nodeId, this.initialPosition);
      this.hasMoved = false;
      this.context.setState(new IdleState(this.context));
    }
  }
}

// ========== CONNECTION CREATION STATE ==========

/**
 * State for creating new connections by dragging from a handler.
 * Shows ghost connection and validates drop target.
 */
class ConnectionCreationState extends InteractionState {
  constructor(
    context: InputSystem,
    private sourceHandlerId: HandlerId
  ) {
    super(context);
  }
  
  enter(): void {
    this.context.setZoomEnabled(false);
    document.body.style.cursor = 'crosshair';
  }
  
  exit(): void {
    this.context.setZoomEnabled(true);
    document.body.style.cursor = '';
    this.context.renderEngine.clearGhostConnection();
  }
  
  onMouseMove(event: MouseEvent): void {
    this.context.renderEngine.showGhostConnection(this.sourceHandlerId, {
      x: event.clientX,
      y: event.clientY
    });
  }
  
  onMouseUp(event: MouseEvent): void {
    const target = event.target as SVGElement;
    const handlerElement = target.closest('[data-handler-id]') as SVGElement | null;
    
    if (handlerElement) {
      const targetHandlerId = handlerElement.getAttribute('data-handler-id')!;
      
      if (targetHandlerId !== this.sourceHandlerId) {
        // Emit event for connection creation
        // Actual creation will be handled by Command API
        this.context.eventBus.emit('RENDER_REQUESTED', undefined);
        console.log('[InputSystem] Connection requested:', this.sourceHandlerId, '->', targetHandlerId);
        
        // TODO: Call API command to create connection
        // this.context.api.commands.createLink(this.sourceHandlerId, targetHandlerId);
      }
    }
    
    this.context.setState(new IdleState(this.context));
  }
  
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      // Cancel connection creation
      this.context.setState(new IdleState(this.context));
    }
  }
}

// ========== MAIN INPUT SYSTEM ==========

/**
 * Main input coordinator implementing state machine pattern.
 * Manages interaction modes, keyboard shortcuts, and inline editing.
 * 
 * @example
 * ```typescript
 * const inputSystem = new InputSystem(
 *   svgElement,
 *   store,
 *   registry,
 *   eventBus,
 *   selectionManager,
 *   renderEngine
 * );
 * ```
 */
export class InputSystem {
  private currentState: InteractionState;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private inlineEditor: InlineEditor;
  
  store: Store;
  registry: Registry;
  eventBus: EventBus;
  selectionManager: SelectionManager;
  renderEngine: RenderEngine;
  
  /**
   * Creates a new InputSystem instance.
   * 
   * @param svgElement - SVG element to attach listeners to
   * @param store - State store
   * @param registry - Plugin registry
   * @param eventBus - Event bus
   * @param selectionManager - Selection manager
   * @param renderEngine - Render engine
   */
  constructor(
    svgElement: SVGSVGElement,
    store: Store,
    registry: Registry,
    eventBus: EventBus,
    selectionManager: SelectionManager,
    renderEngine: RenderEngine
  ) {
    this.svg = d3.select(svgElement);
    this.store = store;
    this.registry = registry;
    this.eventBus = eventBus;
    this.selectionManager = selectionManager;
    this.renderEngine = renderEngine;
    
    this.currentState = new IdleState(this);
    this.inlineEditor = new InlineEditor(svgElement.parentElement!);
    
    this.initializeZoom();
    this.attachEvents();
  }
  
  /**
   * Initializes D3 zoom behavior for pan and zoom.
   */
  private initializeZoom(): void {
    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([Config.ZOOM_MIN, Config.ZOOM_MAX])
      .on('zoom', (event) => {
        const transform: Transform = {
          k: event.transform.k,
          x: event.transform.x,
          y: event.transform.y
        };
        this.store.setTransform(transform);
      });
    
    this.svg.call(this.zoom);
  }
  
  /**
   * Attaches event listeners to SVG and document.
   */
  private attachEvents(): void {
    const svgNode = this.svg.node()!;
    
    svgNode.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    svgNode.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    svgNode.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    svgNode.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
    svgNode.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
    
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }
  
  private handleMouseDown(event: MouseEvent): void {
    if (this.inlineEditor.isActive()) return;
    this.currentState.onMouseDown(event);
  }
  
  private handleMouseMove(event: MouseEvent): void {
    if (this.inlineEditor.isActive()) return;
    this.currentState.onMouseMove(event);
  }
  
  private handleMouseUp(event: MouseEvent): void {
    if (this.inlineEditor.isActive()) return;
    this.currentState.onMouseUp(event);
  }
  
  private handleDoubleClick(event: MouseEvent): void {
    if (this.inlineEditor.isActive()) return;
    this.currentState.onDoubleClick(event);
  }
  
  private handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
    // Context menu implementation in UI phase
  }
  
  private handleKeyDown(event: KeyboardEvent): void {
    if (this.inlineEditor.isActive()) return;
    
    // Global shortcuts
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        // Redo
        this.eventBus.emit('RENDER_REQUESTED', undefined);
      } else {
        // Undo
        this.eventBus.emit('RENDER_REQUESTED', undefined);
      }
    }
    
    // Delete key
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selection = this.selectionManager.getSelection();
      if (selection) {
        event.preventDefault();
        if (selection.type === 'node') {
          this.store.removeNode(selection.id as NodeId);
        } else if (selection.type === 'link') {
          this.store.removeLink(selection.id as any);
        }
      }
    }
    
    this.currentState.onKeyDown(event);
  }
  
  /**
   * Transitions to a new interaction state.
   * 
   * @param newState - New state to transition to
   */
  setState(newState: InteractionState): void {
    this.currentState.exit();
    this.currentState = newState;
    this.currentState.enter();
  }
  
  /**
   * Converts screen coordinates to graph coordinates.
   * 
   * @param event - Mouse event
   * @returns Graph position
   */
  getMousePosition(event: MouseEvent): Position {
    const transform = this.store.getTransform();
    const rect = this.svg.node()!.getBoundingClientRect();
    
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    
    return CoordinateTransform.screenToGraph(screenX, screenY, transform);
  }
  
  /**
   * Enables or disables zoom/pan behavior.
   * Disabled during drag operations to prevent conflicts.
   * 
   * @param enabled - Whether zoom should be enabled
   */
  setZoomEnabled(enabled: boolean): void {
    if (enabled) {
      this.svg.call(this.zoom);
    } else {
      this.svg.on('.zoom', null);
    }
  }
  
  /**
   * Starts inline editing for a node label.
   * 
   * @param nodeId - Node to edit
   * @param event - Mouse event for positioning
   */
  startNodeLabelEdit(nodeId: NodeId, event: MouseEvent): void {
    const node = this.store.getNode(nodeId);
    if (!node) return;
    
    const rect = this.svg.node()!.getBoundingClientRect();
    const transform = this.store.getTransform();
    
    // Calculate screen position of label
    const labelPos = CoordinateTransform.graphToScreen(
      node.position.x + node.width / 2,
      node.position.y + node.height / 2,
      transform
    );
    
    this.inlineEditor.show({
      initialValue: node.label,
      position: {
        x: rect.left + labelPos.x - 100, // Center the input
        y: rect.top + labelPos.y - 15
      },
      fontSize: node.style.fontSize || Config.DEFAULT_FONT_SIZE,
      fontFamily: Config.DEFAULT_FONT_FAMILY,
      onCommit: (value) => {
        this.store.updateNode(nodeId, { label: value });
      },
      onCancel: () => {
        // Do nothing
      }
    });
  }
  
  /**
   * Cleans up event listeners and state.
   */
  destroy(): void {
    this.inlineEditor.hide();
    this.svg.on('.zoom', null);
  }
}