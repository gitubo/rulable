/**
 * Input handling system using State pattern for interaction modes.
 * FIXED: Ghost connection follows mouse correctly
 */
import * as d3 from 'd3';
import { Store } from '../core/State';
import { Registry } from '../core/Registry';
import { EventBus } from '../core/EventBus';
import { SelectionManager } from '../core/SelectionManager';
import { RenderEngine } from '../rendering/RenderEngine';
import { InlineEditor } from '../components/InlineEditor';
import { Position, NodeId, HandlerId, ConnectionId, Transform, createHandlerId, createConnectionId } from '../core/types';
import { CoordinateTransform } from '../utils/CoordinateTransform';
import { Config } from '../core/Config';
import { PathCalculator } from '../rendering/geometry/PathCalculator';

// ========== STATE INTERFACES ==========

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

class IdleState extends InteractionState {
  onMouseDown(event: MouseEvent): void {
    const target = event.target as SVGElement;
    
    const labelElement = target.closest('.connection-label') as SVGElement | null;
    const nodeElement = target.closest('[data-node-id]') as SVGElement | null;
    const handlerElement = target.closest('[data-handler-id]') as SVGElement | null;
    const linkElement = target.closest('[data-connection-id]') as SVGElement | null;
    
    if (labelElement && event.button === 0) {
      event.stopPropagation();
      event.preventDefault();
      
      const connectionElement = labelElement.closest('[data-connection-id]') as SVGElement | null;
      if (connectionElement) {
        const connectionId = connectionElement.getAttribute('data-connection-id')!;
        const mousePos = this.context.getMousePosition(event);
        this.context.setState(new LabelDragState(
          this.context,
          createConnectionId(connectionId),
          mousePos
        ));
      }
      return;
    }
    
    if (handlerElement && event.button === 0) {
      event.stopPropagation();
      event.preventDefault();
      const handlerId = handlerElement.getAttribute('data-handler-id')!;
      this.context.setState(new ConnectionCreationState(this.context, createHandlerId(handlerId)));
      return;
    }
    
    if (nodeElement && event.button === 0) {
      event.stopPropagation();
      event.preventDefault();
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
      event.stopPropagation();
      const linkId = linkElement.getAttribute('data-connection-id')!;
      this.context.selectionManager.selectLink(linkId as any);
      return;
    }
    
    this.context.selectionManager.clearSelection();
  }
  
  onDoubleClick(event: MouseEvent): void {
    const target = event.target as SVGElement;
    const nodeElement = target.closest('[data-node-id]') as SVGElement | null;
    
    if (nodeElement) {
      event.stopPropagation();
      event.preventDefault();
      const nodeId = nodeElement.getAttribute('data-node-id')!;
      this.context.startNodeLabelEdit(nodeId as NodeId, event);
    }
  }
}

// ========== NODE DRAG STATE ==========

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
    this.context.setZoomEnabled(false);
    document.body.style.cursor = 'grabbing';
  }
  
  exit(): void {
    this.context.setZoomEnabled(true);
    document.body.style.cursor = '';
    
    if (this.hasMoved) {
      (this.context.eventBus as any).emit('HISTORY_SAVE_REQUESTED');
    }
  }
  
  onMouseMove(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    
    const currentMouse = this.context.getMousePosition(event);
    
    const dx = currentMouse.x - this.startMouse.x;
    const dy = currentMouse.y - this.startMouse.y;
    
    const newPosition = {
      x: this.initialPosition.x + dx,
      y: this.initialPosition.y + dy
    };
    
    this.context.store.moveNode(this.nodeId, newPosition);
    this.hasMoved = true;
    this.context.renderEngine.updateLinksOnly(this.nodeId);
  }
  
  onMouseUp(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    
    if (this.hasMoved) {
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
      this.context.store.moveNode(this.nodeId, this.initialPosition);
      this.hasMoved = false;
      this.context.setState(new IdleState(this.context));
    }
  }
}

// ========== LABEL DRAG STATE ==========

class LabelDragState extends InteractionState {
  private initialOffset: number;
  private hasMoved = false;
  
  constructor(
    context: InputSystem,
    private connectionId: ConnectionId,
    private startMouse: Position
  ) {
    super(context);
    
    const connection = this.context.store.getLink(connectionId);
    this.initialOffset = connection?.label?.offset ?? 0.5;
  }
  
  enter(): void {
    this.context.setZoomEnabled(false);
    document.body.style.cursor = 'grabbing';
  }
  
  exit(): void {
    this.context.setZoomEnabled(true);
    document.body.style.cursor = '';
    
    if (this.hasMoved) {
      (this.context.eventBus as any).emit('HISTORY_SAVE_REQUESTED');
    }
  }
  
  onMouseMove(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    
    const currentMouse = this.context.getMousePosition(event);
    const connection = this.context.store.getLink(this.connectionId);
    if (!connection) {
      this.context.setState(new IdleState(this.context));
      return;
    }
    
    const nodes = this.context.store.getAllNodes();
    const handlerPositions = new Map<string, Position>();
    
    nodes.forEach((node: any) => {
      node.handlers.forEach((handler: any) => {
        const pos = this.context.store.getHandlerAbsolutePosition(handler.id);
        if (pos) {
          handlerPositions.set(handler.id, pos);
        }
      });
    });
    
    const t = PathCalculator.findClosestTOnPath(
      connection as any,
      currentMouse,
      nodes as any,
      handlerPositions
    );
    
    if (connection.label) {
      this.context.api.commands.updateLink({
        id: this.connectionId,
        label: {
          ...connection.label,
          offset: t
        }
      });
      
      this.hasMoved = true;
    }
  }
  
  onMouseUp(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    
    this.context.setState(new IdleState(this.context));
  }
  
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      const connection = this.context.store.getLink(this.connectionId);
      if (connection && connection.label) {
        this.context.api.commands.updateLink({
          id: this.connectionId,
          label: {
            ...connection.label,
            offset: this.initialOffset
          }
        });
      }
      
      this.hasMoved = false;
      this.context.setState(new IdleState(this.context));
    }
  }
}

// ========== CONNECTION CREATION STATE ==========

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
    event.stopPropagation();
    event.preventDefault();
    
    // FIXED: Pass graph coordinates to showGhostConnection
    const mousePos = this.context.getMousePosition(event);
    this.context.renderEngine.showGhostConnection(this.sourceHandlerId, mousePos);
  }
  
  onMouseUp(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    
    const target = event.target as SVGElement;
    const handlerElement = target.closest('[data-handler-id]') as SVGElement | null;
    
    if (handlerElement) {
      const targetHandlerId = handlerElement.getAttribute('data-handler-id')!;
      
      if (targetHandlerId !== this.sourceHandlerId) {
        try {
          this.context.api.commands.createLink(
            this.sourceHandlerId,
            createHandlerId(targetHandlerId)
          );
          console.log('[InputSystem] Connection created:', this.sourceHandlerId, '->', targetHandlerId);
        } catch (error) {
          console.error('[InputSystem] Failed to create connection:', error);
        }
      }
    }
    
    this.context.setState(new IdleState(this.context));
  }
  
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.context.setState(new IdleState(this.context));
    }
  }
}

// ========== MAIN INPUT SYSTEM ==========

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
  api: any;
  
  constructor(
    svgElement: SVGSVGElement,
    store: Store,
    registry: Registry,
    eventBus: EventBus,
    selectionManager: SelectionManager,
    renderEngine: RenderEngine,
    api: any
  ) {
    this.svg = d3.select(svgElement);
    this.store = store;
    this.registry = registry;
    this.eventBus = eventBus;
    this.selectionManager = selectionManager;
    this.renderEngine = renderEngine;
    this.api = api;
    
    this.currentState = new IdleState(this);
    this.inlineEditor = new InlineEditor(svgElement.parentElement!);
    
    this.zoom = d3.zoom<SVGSVGElement, unknown>();
    this.initializeZoom();
    this.attachEvents();
  }
  
  private initializeZoom(): void {
    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([Config.ZOOM_MIN, Config.ZOOM_MAX])
      .filter((event: any) => {
        const target = event.target as SVGElement;
        const isNode = target.closest('[data-node-id]');
        const isHandler = target.closest('[data-handler-id]');
        const isLink = target.closest('[data-connection-id]');
        const isLabel = target.closest('.connection-label');
        
        return !isNode && !isHandler && !isLink && !isLabel;
      })
      .on('zoom', (event: any) => {
        const transform: Transform = {
          k: event.transform.k,
          x: event.transform.x,
          y: event.transform.y
        };
        this.store.setTransform(transform);
      });
    
    this.svg.call(this.zoom);
  }
  
  private attachEvents(): void {
    const svgNode = this.svg.node()!;
    
    svgNode.addEventListener('mousedown', (e) => this.handleMouseDown(e), true);
    svgNode.addEventListener('mousemove', (e) => this.handleMouseMove(e), true);
    svgNode.addEventListener('mouseup', (e) => this.handleMouseUp(e), true);
    svgNode.addEventListener('dblclick', (e) => this.handleDoubleClick(e), true);
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
  }
  
  private handleKeyDown(event: KeyboardEvent): void {
    if (this.inlineEditor.isActive()) return;
    
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        (this.eventBus as any).emit('HISTORY_REDO_REQUESTED');
      } else {
        (this.eventBus as any).emit('HISTORY_UNDO_REQUESTED');
      }
      return;
    }
    
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selection = this.selectionManager.getSelection();
      if (selection) {
        event.preventDefault();
        if (selection.type === 'node') {
          this.store.removeNode(selection.id as NodeId);
          (this.eventBus as any).emit('HISTORY_SAVE_REQUESTED');
        } else if (selection.type === 'link') {
          this.store.removeLink(selection.id as any);
          (this.eventBus as any).emit('HISTORY_SAVE_REQUESTED');
        }
      }
      return;
    }
    
    this.currentState.onKeyDown(event);
  }
  
  setState(newState: InteractionState): void {
    this.currentState.exit();
    this.currentState = newState;
    this.currentState.enter();
  }
  
  getMousePosition(event: MouseEvent): Position {
    const transform = this.store.getTransform();
    const rect = this.svg.node()!.getBoundingClientRect();
    
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    
    return CoordinateTransform.screenToGraph(screenX, screenY, transform);
  }
  
  setZoomEnabled(enabled: boolean): void {
    if (enabled) {
      this.svg.call(this.zoom);
    } else {
      this.svg.on('.zoom', null);
    }
  }
  
  startNodeLabelEdit(nodeId: NodeId, event: MouseEvent): void {
    const node = this.store.getNode(nodeId);
    if (!node) return;
    
    const rect = this.svg.node()!.getBoundingClientRect();
    const transform = this.store.getTransform();
    
    const labelPos = CoordinateTransform.graphToScreen(
      node.position.x + node.width / 2,
      node.position.y + node.height / 2,
      transform
    );
    
    this.inlineEditor.show({
      initialValue: node.label,
      position: {
        x: rect.left + labelPos.x - 100,
        y: rect.top + labelPos.y - 15
      },
      fontSize: node.style.fontSize || Config.DEFAULT_FONT_SIZE,
      fontFamily: Config.DEFAULT_FONT_FAMILY,
      onCommit: (value) => {
        this.store.updateNode(nodeId, { label: value });
        (this.eventBus as any).emit('HISTORY_SAVE_REQUESTED');
      },
      onCancel: () => {}
    });
  }
  
  destroy(): void {
    this.inlineEditor.hide();
    this.svg.on('.zoom', null);
  }
}