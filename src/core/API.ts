/**
 * Command-Query API Facade implementing strict CQS separation.
 * Provides the public interface for external consumers with comprehensive validation.
 */
import { EventBus } from './EventBus';
import { Store } from './State';
import { Registry } from './Registry';
import { SelectionManager } from './SelectionManager';
import { HistoryManager } from '../services/HistoryManager';
import { SerializationService } from '../services/SerializationService';
import { 
  WidgetAPI,
  WidgetCommands,
  WidgetQueries,
  CreateNodePayload,
  UpdateNodePayload,
  SpawnConnectedPayload,
  UpdateLinkPayload,
  TraversePayload,
  NodeMetadata,
  NodeData,
  ConnectionData,
  SerializedState,
  NodeId,
  ConnectionId,
  HandlerId,
  NoteId,
  createNodeId,
  createConnectionId,
  createHandlerId,
  createNoteId
} from './types';
import { Node } from '../domain/models/Node';
import { Connection } from '../domain/models/Connection';
import { Note } from '../domain/models/Note';
import { Config } from './Config';

/**
 * Custom error for API command failures.
 */
export class CommandError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'CommandError';
  }
}

/**
 * Main API facade implementing Command-Query Separation.
 * Commands mutate state and return void (effects communicated via events).
 * Queries return immutable data copies with no side effects.
 * 
 * @example
 * ```typescript
 * const api = new DiagramAPI(eventBus, store, registry, ...);
 * 
 * // Commands
 * api.commands.createNode({ type: 'task', x: 100, y: 100 });
 * api.commands.undo();
 * 
 * // Queries
 * const node = api.queries.getNode(nodeId);
 * const state = api.queries.getGraphData();
 * ```
 */
export class DiagramAPI implements WidgetAPI {
  readonly commands: WidgetCommands;
  readonly queries: WidgetQueries;
  
  constructor(
    private eventBus: EventBus,
    private store: Store,
    private registry: Registry,
    private selectionManager: SelectionManager,
    private historyManager: HistoryManager,
    private serializationService: SerializationService
  ) {
    this.commands = this.createCommandsAPI();
    this.queries = this.createQueriesAPI();
  }
  
  /**
   * Creates the Commands API namespace.
   * All commands are void-returning and emit events on completion.
   */
  private createCommandsAPI(): WidgetCommands {
    return {
      loadPlugins: (url?: string) => {
        // Will be implemented in plugin loader phase
        console.log('[API] loadPlugins:', url);
        // Emit event for plugin loader to handle
        this.eventBus.emit('PLUGINS_LOADED', undefined);
      },
      
      createNode: (payload: CreateNodePayload) => {
        try {
          this.validateCreateNodePayload(payload);
          
          const definition = this.registry.getNodeDefinition(payload.type);
          if (!definition) {
            throw new CommandError(
              `Node type "${payload.type}" not registered`,
              'createNode',
              { availableTypes: this.registry.getAllNodeDefinitions().map(d => (d as any).constructor.type) }
            );
          }
          
          // Generate unique ID
          const nodeId = createNodeId(`node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
          
          const node = new Node(
            nodeId,
            payload.type,
            definition,
            { x: payload.x, y: payload.y },
            payload.label || '',
            payload.data || {}
          );
          
          this.store.addNode(node);
          this.historyManager.save();
          
          console.log(`[API] Node created: ${nodeId}`);
          
        } catch (error) {
          console.error('[API] createNode failed:', error);
          throw error instanceof CommandError ? error : new CommandError(
            'Failed to create node',
            'createNode',
            error
          );
        }
      },
      
      deleteNode: (id: NodeId) => {
        try {
          const node = this.store.getNode(id);
          if (!node) {
            console.warn(`[API] Cannot delete node ${id}: not found`);
            return;
          }
          
          this.store.removeNode(id);
          this.historyManager.save();
          
          console.log(`[API] Node deleted: ${id}`);
          
        } catch (error) {
          console.error('[API] deleteNode failed:', error);
          throw new CommandError('Failed to delete node', 'deleteNode', error);
        }
      },
      
      updateNode: (payload: UpdateNodePayload) => {
        try {
          this.validateUpdateNodePayload(payload);
          
          const node = this.store.getNode(payload.id);
          if (!node) {
            throw new CommandError(
              `Node ${payload.id} not found`,
              'updateNode'
            );
          }
          
          this.store.updateNode(payload.id, payload);
          this.historyManager.save();
          
          console.log(`[API] Node updated: ${payload.id}`);
          
        } catch (error) {
          console.error('[API] updateNode failed:', error);
          throw error instanceof CommandError ? error : new CommandError(
            'Failed to update node',
            'updateNode',
            error
          );
        }
      },
      
      spawnNodeConnected: (payload: SpawnConnectedPayload) => {
        try {
          this.validateSpawnConnectedPayload(payload);
          
          const definition = this.registry.getNodeDefinition(payload.type);
          if (!definition) {
            throw new CommandError(
              `Node type "${payload.type}" not registered`,
              'spawnNodeConnected'
            );
          }
          
          // Create new node
          const nodeId = createNodeId(`node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
          
          const node = new Node(
            nodeId,
            payload.type,
            definition,
            { x: payload.x, y: payload.y },
            '',
            {}
          );
          
          this.store.addNode(node);
          
          // Find first input handler on new node
          const targetHandler = node.handlers.find(h => 
            h.flow === 'in' || h.flow === 'any'
          );
          
          if (targetHandler) {
            // Get default connection type
            const connDef = this.registry.getConnectionDefinition('default') || 
                           this.registry.getAllConnectionDefinitions()[0];
            
            if (connDef) {
              const connId = createConnectionId(`conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
              
              const connection = new Connection(
                connId,
                'default',
                connDef,
                createHandlerId(payload.sourceHandlerId),
                targetHandler.id
              );
              
              this.store.addLink(connection);
            }
          }
          
          this.historyManager.save();
          
          console.log(`[API] Node spawned and connected: ${nodeId}`);
          
        } catch (error) {
          console.error('[API] spawnNodeConnected failed:', error);
          throw error instanceof CommandError ? error : new CommandError(
            'Failed to spawn connected node',
            'spawnNodeConnected',
            error
          );
        }
      },
      
      createLink: (sourceHandlerId: HandlerId, targetHandlerId: HandlerId) => {
        try {
          // Validate handlers exist
          const sourcePos = this.store.getHandlerAbsolutePosition(sourceHandlerId);
          const targetPos = this.store.getHandlerAbsolutePosition(targetHandlerId);
          
          if (!sourcePos) {
            throw new CommandError(
              `Source handler ${sourceHandlerId} not found`,
              'createLink'
            );
          }
          
          if (!targetPos) {
            throw new CommandError(
              `Target handler ${targetHandlerId} not found`,
              'createLink'
            );
          }
          
          // Prevent self-connection
          if (sourceHandlerId === targetHandlerId) {
            throw new CommandError(
              'Cannot connect handler to itself',
              'createLink'
            );
          }
          
          // Get default connection type
          const connDef = this.registry.getConnectionDefinition('default') || 
                         this.registry.getAllConnectionDefinitions()[0];
          
          if (!connDef) {
            throw new CommandError(
              'No connection type available',
              'createLink'
            );
          }
          
          const connId = createConnectionId(`conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
          
          const connection = new Connection(
            connId,
            'default',
            connDef,
            sourceHandlerId,
            targetHandlerId
          );
          
          this.store.addLink(connection);
          this.historyManager.save();
          
          console.log(`[API] Link created: ${connId}`);
          
        } catch (error) {
          console.error('[API] createLink failed:', error);
          throw error instanceof CommandError ? error : new CommandError(
            'Failed to create link',
            'createLink',
            error
          );
        }
      },
      
      deleteLink: (id: ConnectionId) => {
        try {
          const link = this.store.getLink(id);
          if (!link) {
            console.warn(`[API] Cannot delete link ${id}: not found`);
            return;
          }
          
          this.store.removeLink(id);
          this.historyManager.save();
          
          console.log(`[API] Link deleted: ${id}`);
          
        } catch (error) {
          console.error('[API] deleteLink failed:', error);
          throw new CommandError('Failed to delete link', 'deleteLink', error);
        }
      },
      
      updateLink: (payload: UpdateLinkPayload) => {
        try {
          this.validateUpdateLinkPayload(payload);
          
          const link = this.store.getLink(payload.id);
          if (!link) {
            throw new CommandError(
              `Link ${payload.id} not found`,
              'updateLink'
            );
          }
          
          this.store.updateLink(payload.id, payload);
          this.historyManager.save();
          
          console.log(`[API] Link updated: ${payload.id}`);
          
        } catch (error) {
          console.error('[API] updateLink failed:', error);
          throw error instanceof CommandError ? error : new CommandError(
            'Failed to update link',
            'updateLink',
            error
          );
        }
      },
      
      createNote: (x: number, y: number) => {
        try {
          const noteId = createNoteId(`note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
          
          const note = new Note(
            noteId,
            { x, y },
            'New Note'
          );
          
          this.store.addNote(note);
          this.historyManager.save();
          
          console.log(`[API] Note created: ${noteId}`);
          
        } catch (error) {
          console.error('[API] createNote failed:', error);
          throw new CommandError('Failed to create note', 'createNote', error);
        }
      },
      
      deleteNote: (id: NoteId) => {
        try {
          const note = this.store.getNote(id);
          if (!note) {
            console.warn(`[API] Cannot delete note ${id}: not found`);
            return;
          }
          
          this.store.removeNote(id);
          this.historyManager.save();
          
          console.log(`[API] Note deleted: ${id}`);
          
        } catch (error) {
          console.error('[API] deleteNote failed:', error);
          throw new CommandError('Failed to delete note', 'deleteNote', error);
        }
      },
      
      undo: () => {
        try {
          const success = this.historyManager.undo();
          if (success) {
            console.log('[API] Undo performed');
          }
        } catch (error) {
          console.error('[API] undo failed:', error);
          throw new CommandError('Failed to undo', 'undo', error);
        }
      },
      
      redo: () => {
        try {
          const success = this.historyManager.redo();
          if (success) {
            console.log('[API] Redo performed');
          }
        } catch (error) {
          console.error('[API] redo failed:', error);
          throw new CommandError('Failed to redo', 'redo', error);
        }
      },
      
      zoomIn: () => {
        try {
          const transform = this.store.getTransform();
          const newScale = Math.min(Config.ZOOM_MAX, transform.k + Config.ZOOM_STEP);
          this.store.setTransform({ ...transform, k: newScale });
          
          console.log(`[API] Zoom in: ${newScale.toFixed(2)}x`);
        } catch (error) {
          console.error('[API] zoomIn failed:', error);
        }
      },
      
      zoomOut: () => {
        try {
          const transform = this.store.getTransform();
          const newScale = Math.max(Config.ZOOM_MIN, transform.k - Config.ZOOM_STEP);
          this.store.setTransform({ ...transform, k: newScale });
          
          console.log(`[API] Zoom out: ${newScale.toFixed(2)}x`);
        } catch (error) {
          console.error('[API] zoomOut failed:', error);
        }
      },
      
      zoomReset: () => {
        try {
          const transform = this.store.getTransform();
          this.store.setTransform({ ...transform, k: 1 });
          
          console.log('[API] Zoom reset: 1.00x');
        } catch (error) {
          console.error('[API] zoomReset failed:', error);
        }
      },
      
      zoomFit: () => {
        try {
          // TODO: Calculate bounds and fit
          // For now, just reset to 1:1
          this.store.setTransform({ k: 1, x: 0, y: 0 });
          
          console.log('[API] Zoom fit (placeholder)');
        } catch (error) {
          console.error('[API] zoomFit failed:', error);
        }
      },
      
      selectObject: (type: 'node' | 'link', id: string) => {
        try {
          if (type === 'node') {
            this.selectionManager.selectNode(createNodeId(id));
          } else if (type === 'link') {
            this.selectionManager.selectLink(createConnectionId(id));
          }
          
          console.log(`[API] Selected ${type}: ${id}`);
        } catch (error) {
          console.error('[API] selectObject failed:', error);
        }
      },
      
      deselectAll: () => {
        try {
          this.selectionManager.clearSelection();
          console.log('[API] Selection cleared');
        } catch (error) {
          console.error('[API] deselectAll failed:', error);
        }
      },
      
      importState: (data: SerializedState) => {
        try {
          const state = this.serializationService.deserialize(data);
          this.store.setState(state);
          this.historyManager.reset();
          this.historyManager.save();
          
          console.log('[API] State imported');
        } catch (error) {
          console.error('[API] importState failed:', error);
          throw new CommandError('Failed to import state', 'importState', error as Error);
        }
      },
      
      traverseDiagram: async (payload: TraversePayload) => {
        try {
          this.validateTraversePayload(payload);
          
          const strategy = this.registry.getStrategy(payload.strategy);
          if (!strategy) {
            this.eventBus.emit('TRAVERSE_ERROR', {
              message: `Strategy "${payload.strategy}" not found`,
              code: 'STRATEGY_NOT_FOUND'
            });
            return;
          }
          
          const nodes = this.store.getAllNodes();
          const links = this.store.getAllLinks();
          
          // Sort nodes according to strategy
          const sortedNodes = strategy.sortNodes([...nodes as any], [...links as any]);
          
          // Get visitors
          const visitors = strategy.getVisitors();
          
          // Initialize aggregator
          let aggregator = strategy.getInitialAggregator();
          
          // Traverse
          for (const node of sortedNodes) {
            const visitor = visitors[node.type];
            if (visitor) {
              visitor(node, aggregator, { nodes, links });
            }
          }
          
          this.eventBus.emit('TRAVERSE_COMPLETED', {
            strategy: payload.strategy,
            result: aggregator
          });
          
          console.log(`[API] Traversal completed: ${payload.strategy}`);
          
        } catch (error) {
          console.error('[API] traverseDiagram failed:', error);
          this.eventBus.emit('TRAVERSE_ERROR', {
            message: error.message || 'Traversal failed',
            code: 'TRAVERSAL_ERROR'
          });
        }
      }
    };
  }
  
  /**
   * Creates the Queries API namespace.
   * All queries return immutable data copies.
   */
  private createQueriesAPI(): WidgetQueries {
    return {
      getNode: (id: NodeId): Readonly<NodeData> | null => {
        try {
          const node = this.store.getNode(id);
          return node ? node.getData() : null;
        } catch (error) {
          console.error('[API] getNode failed:', error);
          return null;
        }
      },
      
      getAllNodesDefinition: (): ReadonlyArray<NodeMetadata> => {
        try {
          return this.registry.getAllNodeDefinitions().map(def => {
            const ctor = (def as any).constructor;
            return Object.freeze({
              type: ctor.type,
              role: ctor.role
            });
          });
        } catch (error) {
          console.error('[API] getAllNodesDefinition failed:', error);
          return [];
        }
      },
      
      getNodeIconPathData: (type: string): string => {
        try {
          const def = this.registry.getNodeDefinition(type);
          return def ? def.getIconPath() : '';
        } catch (error) {
          console.error('[API] getNodeIconPathData failed:', error);
          return '';
        }
      },
      
      getLink: (id: ConnectionId): Readonly<ConnectionData> | null => {
        try {
          const link = this.store.getLink(id);
          return link ? link.getData() : null;
        } catch (error) {
          console.error('[API] getLink failed:', error);
          return null;
        }
      },
      
      getGraphData: (): Readonly<SerializedState> => {
        try {
          return Object.freeze(this.serializationService.serialize());
        } catch (error) {
          console.error('[API] getGraphData failed:', error);
          // Return empty state as fallback
          return Object.freeze({
            metadata: {
              version: '1.0.0',
              createdAt: new Date().toISOString(),
              viewport: { k: 1, x: 0, y: 0 }
            },
            nodes: {},
            connections: {},
            notes: {}
          });
        }
      }
    };
  }
  
  // ========== VALIDATION HELPERS ==========
  
  private validateCreateNodePayload(payload: CreateNodePayload): void {
    if (!payload.type || typeof payload.type !== 'string') {
      throw new CommandError('Node type is required', 'createNode');
    }
    
    if (typeof payload.x !== 'number' || typeof payload.y !== 'number') {
      throw new CommandError('Valid x and y coordinates required', 'createNode');
    }
    
    if (isNaN(payload.x) || isNaN(payload.y)) {
      throw new CommandError('Coordinates must be valid numbers', 'createNode');
    }
  }
  
  private validateUpdateNodePayload(payload: UpdateNodePayload): void {
    if (!payload.id) {
      throw new CommandError('Node ID is required', 'updateNode');
    }
  }
  
  private validateSpawnConnectedPayload(payload: SpawnConnectedPayload): void {
    if (!payload.type || typeof payload.type !== 'string') {
      throw new CommandError('Node type is required', 'spawnNodeConnected');
    }
    
    if (typeof payload.x !== 'number' || typeof payload.y !== 'number') {
      throw new CommandError('Valid coordinates required', 'spawnNodeConnected');
    }
    
    if (!payload.sourceHandlerId) {
      throw new CommandError('Source handler ID required', 'spawnNodeConnected');
    }
  }
  
  private validateUpdateLinkPayload(payload: UpdateLinkPayload): void {
    if (!payload.id) {
      throw new CommandError('Link ID is required', 'updateLink');
    }
  }
  
  private validateTraversePayload(payload: TraversePayload): void {
    if (!payload.strategy || typeof payload.strategy !== 'string') {
      throw new CommandError('Strategy name is required', 'traverseDiagram');
    }
  }
}