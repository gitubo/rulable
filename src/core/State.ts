/**
 * Centralized State Store with immutable API, caching, and event integration.
 * Implements strict Command-Query Separation with comprehensive error handling.
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

/**
 * Central state management for graph data.
 * Provides immutable queries and mutation commands with automatic cache management.
 * 
 * @example
 * ```typescript
 * const store = new Store(eventBus);
 * store.addNode(node); // Emits NODE_CREATED event
 * const frozen = store.getNode(id); // Returns frozen copy
 * ```
 */
export class Store {
  private state: GraphState;
  private cache: StoreCache;
  private eventBus: EventBus;

  /**
   * Creates a new Store instance.
   * 
   * @param eventBus - Event bus for publishing state changes
   * @param selectionManager - Optional selection manager for auto-clear on deletion
   */
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

    // Auto-clear selection on item removal
    if (selectionManager) {
      this.eventBus.on('NODE_REMOVED', (id) => selectionManager.handleNodeRemoved(id));
      this.eventBus.on('CONNECTION_REMOVED', (id) => selectionManager.handleLinkRemoved(id));
      this.eventBus.on('NOTE_REMOVED', (id) => selectionManager.handleNoteRemoved(id));
    }
  }

  // ========== QUERIES (Immutable) ==========
  
  /**
   * Retrieves a node by ID.
   * Returns a frozen clone to prevent external mutation.
   * 
   * @param id - Node identifier
   * @returns Frozen node copy or null if not found
   */
  getNode(id: NodeId): Readonly<Node> | null {
    try {
      const node = this.state.nodes.find(n => n.id === id);
      return node ? deepFreeze(node.clone()) : null;
    } catch (error) {
      console.error(`[Store] Error retrieving node ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Retrieves all nodes in the graph.
   * 
   * @returns Frozen array of node copies
   */
  getAllNodes(): ReadonlyArray<Readonly<Node>> {
    try {
      return deepFreeze(this.state.nodes.map(n => n.clone()));
    } catch (error) {
      console.error('[Store] Error retrieving all nodes:', error);
      return [];
    }
  }
  
  /**
   * Retrieves a connection by ID.
   * 
   * @param id - Connection identifier
   * @returns Frozen connection copy or null if not found
   */
  getLink(id: ConnectionId): Readonly<Connection> | null {
    try {
      const link = this.state.links.find(l => l.id === id);
      return link ? deepFreeze(link.clone()) : null;
    } catch (error) {
      console.error(`[Store] Error retrieving link ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Retrieves all connections in the graph.
   * 
   * @returns Frozen array of connection copies
   */
  getAllLinks(): ReadonlyArray<Readonly<Connection>> {
    try {
      return deepFreeze(this.state.links.map(l => l.clone()));
    } catch (error) {
      console.error('[Store] Error retrieving all links:', error);
      return [];
    }
  }
  
  /**
   * Retrieves a note by ID.
   * 
   * @param id - Note identifier
   * @returns Frozen note copy or null if not found
   */
  getNote(id: NoteId): Readonly<Note> | null {
    try {
      const note = this.state.notes.find(n => n.id === id);
      return note ? deepFreeze(note.clone()) : null;
    } catch (error) {
      console.error(`[Store] Error retrieving note ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Retrieves all notes in the graph.
   * 
   * @returns Frozen array of note copies
   */
  getAllNotes(): ReadonlyArray<Readonly<Note>> {
    try {
      return deepFreeze(this.state.notes.map(n => n.clone()));
    } catch (error) {
      console.error('[Store] Error retrieving all notes:', error);
      return [];
    }
  }
  
  /**
   * Gets the current viewport transform.
   * 
   * @returns Frozen transform object
   */
  getTransform(): Readonly<Transform> {
    return deepFreeze({ ...this.state.transform });
  }
  
  /**
   * Gets all connections connected to a specific node.
   * Uses cached lookup for O(1) performance.
   * 
   * @param nodeId - Node identifier
   * @returns Frozen array of connected links
   */
  getLinksForNode(nodeId: NodeId): ReadonlyArray<Readonly<Connection>> {
    try {
      const links = this.cache.nodeToLinks.get(nodeId) || [];
      return deepFreeze(links.map(l => l.clone()));
    } catch (error) {
      console.error(`[Store] Error retrieving links for node ${nodeId}:`, error);
      return [];
    }
  }
  
  /**
   * Gets the absolute position of a handler in graph coordinates.
   * Uses cached positions for performance.
   * 
   * @param handlerId - Handler identifier
   * @returns Absolute position or null if handler not found
   */
  getHandlerAbsolutePosition(handlerId: HandlerId): Position | null {
    return this.cache.handlerAbsolutePositions.get(handlerId) || null;
  }
  
  /**
   * Exports complete graph state snapshot.
   * 
   * @returns Frozen graph state
   */
  getState(): Readonly<GraphState> {
    try {
      return deepFreeze({
        nodes: this.state.nodes.map(n => n.clone()),
        links: this.state.links.map(l => l.clone()),
        notes: this.state.notes.map(n => n.clone()),
        transform: { ...this.state.transform }
      });
    } catch (error) {
      console.error('[Store] Error exporting state:', error);
      return deepFreeze({
        nodes: [],
        links: [],
        notes: [],
        transform: { k: 1, x: 0, y: 0 }
      });
    }
  }

  // ========== COMMANDS (Mutations) ==========
  
  /**
   * Adds a node to the graph.
   * Rebuilds caches and emits NODE_CREATED event.
   * 
   * @param node - Node instance to add
   * @throws {TypeError} If node is null/undefined
   */
  addNode(node: Node): void {
    if (!node) {
      throw new TypeError('Cannot add null or undefined node');
    }
    
    try {
      this.state.nodes.push(node as any);
      this.rebuildNodeToLinksCache();
      this.updateHandlerPositionCache(node);
      this.eventBus.emit('NODE_CREATED', node as any);
      this.eventBus.emit('RENDER_REQUESTED', undefined);
    } catch (error) {
      console.error('[Store] Error adding node:', error);
      throw error;
    }
  }
  
  /**
   * Removes a node from the graph.
   * Automatically removes all connected links.
   * 
   * @param id - Node identifier
   */
  removeNode(id: NodeId): void {
    try {
      const index = this.state.nodes.findIndex(n => n.id === id);
      if (index === -1) {
        console.warn(`[Store] Cannot remove node ${id}: not found`);
        return;
      }
      
      const node = this.state.nodes[index];
      
      // Remove connected links
      const connectedLinks = this.getLinksForNode(id);
      connectedLinks.forEach(link => this.removeLink(link.id));
      
      this.state.nodes.splice(index, 1);
      this.rebuildNodeToLinksCache();
      this.removeHandlerPositionsForNode(node);
      
      this.eventBus.emit('NODE_REMOVED', id);
      this.eventBus.emit('RENDER_REQUESTED', undefined);
    } catch (error) {
      console.error(`[Store] Error removing node ${id}:`, error);
    }
  }
  
  /**
   * Updates node properties.
   * Only specified properties are changed.
   * 
   * @param id - Node identifier
   * @param changes - Partial node data to merge
   */
  updateNode(id: NodeId, changes: Partial<NodeData>): void {
    try {
      const node = this.state.nodes.find(n => n.id === id);
      if (!node) {
        console.warn(`[Store] Cannot update node ${id}: not found`);
        return;
      }
      
      if (changes.label !== undefined) node.label = changes.label;
      if (changes.note !== undefined) node.note = changes.note;
      if (changes.style !== undefined) node.style = { ...node.style, ...changes.style };
      if (changes.data !== undefined) node.data = { ...node.data, ...changes.data };
      
      this.eventBus.emit('NODE_UPDATED', node as any);
      this.eventBus.emit('RENDER_REQUESTED', undefined);
    } catch (error) {
      console.error(`[Store] Error updating node ${id}:`, error);
    }
  }
  
  /**
   * Moves a node to a new position.
   * Updates handler position cache.
   * 
   * @param id - Node identifier
   * @param newPosition - New graph coordinates
   */
  moveNode(id: NodeId, newPosition: Position): void {
    try {
      const node = this.state.nodes.find(n => n.id === id);
      if (!node) {
        console.warn(`[Store] Cannot move node ${id}: not found`);
        return;
      }
      
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
    } catch (error) {
      console.error(`[Store] Error moving node ${id}:`, error);
    }
  }
  
  /**
   * Adds a connection to the graph.
   * 
   * @param link - Connection instance to add
   * @throws {TypeError} If link is null/undefined
   */
  addLink(link: Connection): void {
    if (!link) {
      throw new TypeError('Cannot add null or undefined link');
    }
    
    try {
      this.state.links.push(link as any);
      this.rebuildNodeToLinksCache();
      this.eventBus.emit('CONNECTION_CREATED', link as any);
      this.eventBus.emit('RENDER_REQUESTED', undefined);
    } catch (error) {
      console.error('[Store] Error adding link:', error);
      throw error;
    }
  }
  
  /**
   * Removes a connection from the graph.
   * 
   * @param id - Connection identifier
   */
  removeLink(id: ConnectionId): void {
    try {
      const index = this.state.links.findIndex(l => l.id === id);
      if (index === -1) {
        console.warn(`[Store] Cannot remove link ${id}: not found`);
        return;
      }
      
      this.state.links.splice(index, 1);
      this.rebuildNodeToLinksCache();
      this.eventBus.emit('CONNECTION_REMOVED', id);
      this.eventBus.emit('RENDER_REQUESTED', undefined);
    } catch (error) {
      console.error(`[Store] Error removing link ${id}:`, error);
    }
  }
  
  /**
   * Updates connection properties.
   * 
   * @param id - Connection identifier
   * @param changes - Partial connection data to merge
   */
  updateLink(id: ConnectionId, changes: Partial<ConnectionData>): void {
    try {
      const link = this.state.links.find(l => l.id === id);
      if (!link) {
        console.warn(`[Store] Cannot update link ${id}: not found`);
        return;
      }
      
      link.update(changes);
      
      this.eventBus.emit('CONNECTION_UPDATED', link as any);
      this.eventBus.emit('RENDER_REQUESTED', undefined);
    } catch (error) {
      console.error(`[Store] Error updating link ${id}:`, error);
    }
  }
  
  /**
   * Adds a note to the graph.
   * 
   * @param note - Note instance to add
   */
  addNote(note: Note): void {
    if (!note) {
      throw new TypeError('Cannot add null or undefined note');
    }
    
    try {
      this.state.notes.push(note as any);
      this.eventBus.emit('NOTE_CREATED', note as any);
      this.eventBus.emit('RENDER_REQUESTED', undefined);
    } catch (error) {
      console.error('[Store] Error adding note:', error);
      throw error;
    }
  }
  
  /**
   * Removes a note from the graph.
   * 
   * @param id - Note identifier
   */
  removeNote(id: NoteId): void {
    try {
      const index = this.state.notes.findIndex(n => n.id === id);
      if (index === -1) {
        console.warn(`[Store] Cannot remove note ${id}: not found`);
        return;
      }
      
      this.state.notes.splice(index, 1);
      this.eventBus.emit('NOTE_REMOVED', id);
      this.eventBus.emit('RENDER_REQUESTED', undefined);
    } catch (error) {
      console.error(`[Store] Error removing note ${id}:`, error);
    }
  }
  
  /**
   * Updates note properties.
   * 
   * @param id - Note identifier
   * @param changes - Partial note data to merge
   */
  updateNote(id: NoteId, changes: Partial<{ text: string; position: Position; dimensions: Dimensions }>): void {
    try {
      const note = this.state.notes.find(n => n.id === id);
      if (!note) {
        console.warn(`[Store] Cannot update note ${id}: not found`);
        return;
      }
      
      if (changes.text !== undefined) note.text = changes.text;
      if (changes.position !== undefined) note.position = changes.position;
      if (changes.dimensions !== undefined) note.dimensions = changes.dimensions;
      
      this.eventBus.emit('NOTE_UPDATED', note as any);
      this.eventBus.emit('RENDER_REQUESTED', undefined);
    } catch (error) {
      console.error(`[Store] Error updating note ${id}:`, error);
    }
  }
  
  /**
   * Sets the viewport transform.
   * 
   * @param transform - New transform (scale and translation)
   */
  setTransform(transform: Transform): void {
    try {
      (this.state.transform as any) = transform;
      this.eventBus.emit('RENDER_REQUESTED', undefined);
    } catch (error) {
      console.error('[Store] Error setting transform:', error);
    }
  }
  
  /**
   * Replaces entire graph state.
   * Rebuilds all caches.
   * 
   * @param state - New graph state
   */
  setState(state: GraphState): void {
    try {
      (this.state as any) = state;
      this.rebuildAllCaches();
      this.eventBus.emit('STATE_LOADED', this.getState());
      this.eventBus.emit('RENDER_REQUESTED', undefined);
    } catch (error) {
      console.error('[Store] Error setting state:', error);
      throw error;
    }
  }

  // ========== CACHE MANAGEMENT ==========
  
  private rebuildAllCaches(): void {
    try {
      this.rebuildNodeToLinksCache();
      this.rebuildHandlerPositionCache();
    } catch (error) {
      console.error('[Store] Error rebuilding caches:', error);
    }
  }
  
  private rebuildNodeToLinksCache(): void {
    this.cache.nodeToLinks.clear();
    this.state.links.forEach(link => {
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