/**
 * [cite_start]Centralized State Store with immutable API, caching, and event integration[cite: 297, 300].
 */
import { EventBus } from './EventBus';
import { SelectionManager } from './SelectionManager';
import { 
  GraphState, 
  NodeId, 
  ConnectionId, 
  HandlerId,
  NoteId,
  Position,
  Transform,
  NodeData,
  ConnectionData,
  Dimensions
} from './types';
import { Node } from '../domain/models/Node';
import { Connection } from '../domain/models/Connection';
import { Note } from '../domain/models/Note';
import { Handler } from '../domain/models/Handler';
import { deepClone, deepFreeze } from '../utils/DeepClone';

interface StoreCache {
  handlerAbsolutePositions: Map<HandlerId, Position>;
  nodeToLinks: Map<NodeId, Connection[]>;
}

export class Store {
  private state: GraphState;
  private cache: StoreCache;
  private eventBus: EventBus;

  constructor(eventBus: EventBus, selectionManager?: SelectionManager) {
    this.eventBus = eventBus;
    this.state = {
      nodes: [],
      links: [],
      notes: [],
      transform: { k: 1, x: 0, y: 0 }
    };
    this.cache = {
      handlerAbsolutePositions: new Map(),
      nodeToLinks: new Map()
    };

    [cite_start]// Auto-clear selection on item removal (Integration Requirement) [cite: 351]
    if (selectionManager) {
        this.eventBus.on('NODE_REMOVED', (id) => selectionManager.handleNodeRemoved(id));
        this.eventBus.on('CONNECTION_REMOVED', (id) => selectionManager.handleLinkRemoved(id));
        this.eventBus.on('NOTE_REMOVED', (id) => selectionManager.handleNoteRemoved(id));
    }
  }

  // ========== QUERIES (Immutable) ==========
  
  getNode(id: NodeId): Readonly<Node> | null {
    const node = this.state.nodes.find(n => n.id === id);
    return node ? deepFreeze(node.clone()) : null;
  }
  
  getAllNodes(): ReadonlyArray<Readonly<Node>> {
    return deepFreeze(this.state.nodes.map(n => n.clone()));
  }
  
  getLink(id: ConnectionId): Readonly<Connection> | null {
    const link = this.state.links.find(l => l.id === id);
    return link ? deepFreeze(link.clone()) : null;
  }
  
  getAllLinks(): ReadonlyArray<Readonly<Connection>> {
    return deepFreeze(this.state.links.map(l => l.clone()));
  }
  
  getNote(id: NoteId): Readonly<Note> | null {
    const note = this.state.notes.find(n => n.id === id);
    return note ? deepFreeze(note.clone()) : null;
  }
  
  getAllNotes(): ReadonlyArray<Readonly<Note>> {
    return deepFreeze(this.state.notes.map(n => n.clone()));
  }
  
  getTransform(): Readonly<Transform> {
    return deepFreeze({ ...this.state.transform });
  }
  
  getLinksForNode(nodeId: NodeId): ReadonlyArray<Readonly<Connection>> {
    const links = this.cache.nodeToLinks.get(nodeId) || [];
    return deepFreeze(links.map(l => l.clone()));
  }
  
  getHandlerAbsolutePosition(handlerId: HandlerId): Position | null {
    return this.cache.handlerAbsolutePositions.get(handlerId) || null;
  }
  
  getState(): Readonly<GraphState> {
    return deepFreeze({
      nodes: this.state.nodes.map(n => n.clone()),
      links: this.state.links.map(l => l.clone()),
      notes: this.state.notes.map(n => n.clone()),
      transform: { ...this.state.transform }
    });
  }

  // ========== COMMANDS (Mutations) ==========
  
  addNode(node: Node): void {
    this.state.nodes.push(node as any);
    this.rebuildNodeToLinksCache();
    this.updateHandlerPositionCache(node);
    this.eventBus.emit('NODE_CREATED', node as any);
    this.eventBus.emit('RENDER_REQUESTED', undefined);
  }
  
  removeNode(id: NodeId): void {
    const index = this.state.nodes.findIndex(n => n.id === id);
    if (index === -1) return;
    const node = this.state.nodes[index];
    
    // Remove connected links
    const connectedLinks = this.getLinksForNode(id);
    connectedLinks.forEach(link => this.removeLink(link.id));
    
    this.state.nodes.splice(index, 1);
    this.rebuildNodeToLinksCache();
    this.removeHandlerPositionsForNode(node);
    
    this.eventBus.emit('NODE_REMOVED', id);
    this.eventBus.emit('RENDER_REQUESTED', undefined);
  }
  
  updateNode(id: NodeId, changes: Partial<NodeData>): void {
    const node = this.state.nodes.find(n => n.id === id);
    if (!node) return;
    
    if (changes.label !== undefined) node.label = changes.label;
    if (changes.note !== undefined) node.note = changes.note;
    if (changes.style !== undefined) node.style = { ...node.style, ...changes.style };
    if (changes.data !== undefined) node.data = { ...node.data, ...changes.data };
    
    this.eventBus.emit('NODE_UPDATED', node as any);
    this.eventBus.emit('RENDER_REQUESTED', undefined);
  }
  
  moveNode(id: NodeId, newPosition: Position): void {
    const node = this.state.nodes.find(n => n.id === id);
    if (!node) return;
    
    const oldPosition = { ...node.position };
    (node.position as any).x = newPosition.x;
    (node.position as any).y = newPosition.y;
    
    this.updateHandlerPositionCache(node);
    
    this.eventBus.emit('NODE_MOVED', {
      id,
      from: oldPosition,
      to: newPosition
    });
    this.eventBus.emit('RENDER_REQUESTED', undefined);
  }
  
  addLink(link: Connection): void {
    this.state.links.push(link as any);
    this.rebuildNodeToLinksCache();
    this.eventBus.emit('CONNECTION_CREATED', link as any);
    this.eventBus.emit('RENDER_REQUESTED', undefined);
  }
  
  removeLink(id: ConnectionId): void {
    const index = this.state.links.findIndex(l => l.id === id);
    if (index === -1) return;
    this.state.links.splice(index, 1);
    
    this.rebuildNodeToLinksCache();
    this.eventBus.emit('CONNECTION_REMOVED', id);
    this.eventBus.emit('RENDER_REQUESTED', undefined);
  }
  
  updateLink(id: ConnectionId, changes: Partial<ConnectionData>): void {
    const link = this.state.links.find(l => l.id === id);
    if (!link) return;
    link.update(changes);
    
    this.eventBus.emit('CONNECTION_UPDATED', link as any);
    this.eventBus.emit('RENDER_REQUESTED', undefined);
  }
  
  addNote(note: Note): void {
    this.state.notes.push(note as any);
    this.eventBus.emit('NOTE_CREATED', note as any);
    this.eventBus.emit('RENDER_REQUESTED', undefined);
  }
  
  removeNote(id: NoteId): void {
    const index = this.state.notes.findIndex(n => n.id === id);
    if (index === -1) return;
    this.state.notes.splice(index, 1);
    this.eventBus.emit('NOTE_REMOVED', id);
    this.eventBus.emit('RENDER_REQUESTED', undefined);
  }
  
  updateNote(id: NoteId, changes: Partial<{ text: string; position: Position; dimensions: Dimensions }>): void {
    const note = this.state.notes.find(n => n.id === id);
    if (!note) return;
    
    if (changes.text !== undefined) note.text = changes.text;
    if (changes.position !== undefined) note.position = changes.position;
    if (changes.dimensions !== undefined) note.dimensions = changes.dimensions;
    
    this.eventBus.emit('NOTE_UPDATED', note as any);
    this.eventBus.emit('RENDER_REQUESTED', undefined);
  }
  
  setTransform(transform: Transform): void {
    (this.state.transform as any) = transform;
    this.eventBus.emit('RENDER_REQUESTED', undefined);
  }
  
  setState(state: GraphState): void {
    // We need to reconstruct actual instances from the raw state data
    // For now, we assume the incoming state matches the structure. 
    // In a full implementation, we'd use serialization service to rehydrate classes.
    (this.state as any) = state; 
    
    this.rebuildAllCaches();
    this.eventBus.emit('STATE_LOADED', this.getState());
    this.eventBus.emit('RENDER_REQUESTED', undefined);
  }

  // ========== CACHE MANAGEMENT ==========
  
  private rebuildAllCaches(): void {
    this.rebuildNodeToLinksCache();
    this.rebuildHandlerPositionCache();
  }
  
  private rebuildNodeToLinksCache(): void {
    this.cache.nodeToLinks.clear();
    this.state.links.forEach(link => {
      // Find source and target nodes
      const sourceNode = this.findNodeByHandlerId(link.sourceHandlerId);
      const targetNode = this.findNodeByHandlerId(link.targetHandlerId);
      
      if (sourceNode) {
        if (!this.cache.nodeToLinks.has(sourceNode.id)) {
          this.cache.nodeToLinks.set(sourceNode.id, []);
        }
        this.cache.nodeToLinks.get(sourceNode.id)!.push(link);
      }
      
      if (targetNode && targetNode.id !== sourceNode?.id) {
        if (!this.cache.nodeToLinks.has(targetNode.id)) {
          this.cache.nodeToLinks.set(targetNode.id, []);
        }
        this.cache.nodeToLinks.get(targetNode.id)!.push(link);
      }
    });
  }
  
  private rebuildHandlerPositionCache(): void {
    this.cache.handlerAbsolutePositions.clear();
    this.state.nodes.forEach(node => {
      this.updateHandlerPositionCache(node);
    });
  }
  
  private updateHandlerPositionCache(node: Node): void {
    node.handlers.forEach(handler => {
      const absolutePosition = {
        x: node.position.x + handler.offset.x,
        y: node.position.y + handler.offset.y
      };
      this.cache.handlerAbsolutePositions.set(handler.id, absolutePosition);
    });
  }
  
  private removeHandlerPositionsForNode(node: Node): void {
    node.handlers.forEach(handler => {
      this.cache.handlerAbsolutePositions.delete(handler.id);
    });
  }
  
  private findNodeByHandlerId(handlerId: HandlerId): Node | null {
    return this.state.nodes.find(node => 
      node.handlers.some(h => h.id === handlerId)
    ) || null;
  }
}