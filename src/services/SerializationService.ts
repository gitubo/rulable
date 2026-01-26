/**
 * Serialization service for converting between runtime graph state and JSON format.
 * Handles handler ID preservation, plugin validation, and orphaned connection cleanup.
 */
import { Registry } from '../core/Registry';
import { Store } from '../core/State';
import { 
  SerializedState, 
  SerializedNode, 
  SerializedHandler,
  SerializedConnection,
  SerializedNote,
  GraphState,
  NodeId,
  ConnectionId,
  HandlerId,
  NoteId,
  createNodeId,
  createConnectionId,
  createHandlerId,
  createNoteId
} from '../core/types';
import { Node } from '../domain/models/Node';
import { Connection } from '../domain/models/Connection';
import { Handler } from '../domain/models/Handler';
import { Note } from '../domain/models/Note';

/**
 * Custom error for serialization failures.
 */
export class SerializationError extends Error {
  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = 'SerializationError';
  }
}

/**
 * Custom error for deserialization failures.
 */
export class DeserializationError extends Error {
  constructor(
    message: string, 
    public readonly entityType?: string,
    public readonly entityId?: string
  ) {
    super(message);
    this.name = 'DeserializationError';
  }
}

/**
 * Service for serializing and deserializing graph state.
 * Ensures handler IDs are preserved across save/load cycles.
 * 
 * @example
 * ```typescript
 * const service = new SerializationService(registry, store);
 * 
 * // Export
 * const json = service.exportToJSON();
 * 
 * // Import
 * const state = service.importFromJSON(json);
 * store.setState(state);
 * ```
 */
export class SerializationService {
  private registry: Registry;
  private store: Store;
  
  /**
   * Creates a new SerializationService instance.
   * 
   * @param registry - Plugin registry for validation
   * @param store - State store for accessing current state
   */
  constructor(registry: Registry, store: Store) {
    this.registry = registry;
    this.store = store;
  }
  
  /**
   * Serializes current graph state to JSON-compatible format.
   * Preserves all handler IDs and metadata.
   * 
   * @returns Serialized state object
   * @throws {SerializationError} If serialization fails
   */
  serialize(): SerializedState {
    try {
      const state = this.store.getState();
      
      return {
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          viewport: state.transform
        },
        nodes: this.serializeNodes(state.nodes),
        connections: this.serializeConnections(state.links),
        notes: this.serializeNotes(state.notes)
      };
      
    } catch (error) {
      console.error('[SerializationService] Serialization failed:', error);
      throw new SerializationError('Failed to serialize graph state', error);
    }
  }
  
  /**
   * Deserializes JSON state back to runtime graph state.
   * Validates plugins and preserves handler IDs.
   * 
   * @param data - Serialized state to restore
   * @returns Runtime graph state
   * @throws {DeserializationError} If deserialization fails
   */
  deserialize(data: SerializedState): GraphState {
    try {
      // Validate version compatibility
      if (!this.isCompatibleVersion(data.metadata.version)) {
        console.warn(
          `[SerializationService] State version ${data.metadata.version} may not be compatible with current version`
        );
      }
      
      // Deserialize in order: nodes first (to create handlers), then connections
      const nodes = this.deserializeNodes(data.nodes);
      const links = this.deserializeConnections(data.connections, nodes);
      const notes = this.deserializeNotes(data.notes || {});
      
      return {
        nodes,
        links,
        notes,
        transform: data.metadata.viewport || { k: 1, x: 0, y: 0 }
      };
      
    } catch (error) {
      console.error('[SerializationService] Deserialization failed:', error);
      throw new DeserializationError('Failed to deserialize graph state');
    }
  }
  
  /**
   * Serializes nodes to JSON format.
   * Preserves handler IDs in nested hash map.
   * 
   * @param nodes - Runtime node instances
   * @returns Serialized nodes indexed by ID
   */
  private serializeNodes(nodes: ReadonlyArray<Readonly<Node>>): Record<string, SerializedNode> {
    const result: Record<string, SerializedNode> = {};
    
    nodes.forEach(node => {
      result[node.id] = {
        id: node.id,
        type: node.type,
        label: node.label,
        note: node.note,
        data: { ...node.data },
        presentation: {
          position: { ...node.position },
          style: { ...node.style }
        },
        handles: this.serializeHandlers(node.handlers)
      };
    });
    
    return result;
  }
  
  /**
   * Serializes handlers to JSON format.
   * Critical for preserving handler IDs across save/load.
   * 
   * @param handlers - Runtime handler instances
   * @returns Serialized handlers indexed by ID
   */
  private serializeHandlers(handlers: ReadonlyArray<Readonly<Handler>>): Record<string, SerializedHandler> {
    const result: Record<string, SerializedHandler> = {};
    
    handlers.forEach(handler => {
      result[handler.id] = {
        id: handler.id,
        type: handler.type,
        label: handler.label,
        flow: handler.flow,
        presentation: {
          offset: { ...handler.offset },
          direction: handler.direction
        }
      };
    });
    
    return result;
  }
  
  /**
   * Serializes connections to JSON format.
   * 
   * @param connections - Runtime connection instances
   * @returns Serialized connections indexed by ID
   */
  private serializeConnections(
    connections: ReadonlyArray<Readonly<Connection>>
  ): Record<string, SerializedConnection> {
    const result: Record<string, SerializedConnection> = {};
    
    connections.forEach(conn => {
      result[conn.id] = {
        id: conn.id,
        type: conn.type,
        sourceHandlerId: conn.sourceHandlerId,
        targetHandlerId: conn.targetHandlerId,
        pathType: conn.pathType,
        label: conn.label ? { ...conn.label } : undefined,
        style: { ...conn.style },
        data: { ...conn.data }
      };
    });
    
    return result;
  }
  
  /**
   * Serializes notes to JSON format.
   * 
   * @param notes - Runtime note instances
   * @returns Serialized notes indexed by ID
   */
  private serializeNotes(notes: ReadonlyArray<Readonly<Note>>): Record<string, SerializedNote> {
    const result: Record<string, SerializedNote> = {};
    
    notes.forEach(note => {
      result[note.id] = {
        id: note.id,
        text: note.text,
        position: { ...note.position },
        dimensions: { ...note.dimensions }
      };
    });
    
    return result;
  }
  
  /**
   * Deserializes nodes from JSON format.
   * Validates plugin availability and restores handler IDs.
   * 
   * @param nodesData - Serialized node data
   * @returns Runtime node instances
   */
  private deserializeNodes(nodesData: Record<string, SerializedNode>): Node[] {
    const instances: Node[] = [];
    const skippedNodes: string[] = [];
    
    Object.values(nodesData).forEach(nodeData => {
      const definition = this.registry.getNodeDefinition(nodeData.type);
      
      if (!definition) {
        console.warn(
          `[SerializationService] Node type "${nodeData.type}" not registered. Skipping node ${nodeData.id}.`
        );
        skippedNodes.push(nodeData.id);
        return;
      }
      
      try {
        // Create node instance
        // Note: Handlers will be created by Node constructor based on definition
        const node = new Node(
          createNodeId(nodeData.id),
          nodeData.type,
          definition,
          nodeData.presentation.position,
          nodeData.label,
          nodeData.data
        );
        
        // Restore additional properties
        node.note = nodeData.note;
        node.style = { ...nodeData.presentation.style };
        
        // CRITICAL: Restore handler IDs from serialized data
        this.restoreHandlerIds(node, nodeData.handles);
        
        instances.push(node);
        
      } catch (error) {
        console.error(
          `[SerializationService] Failed to deserialize node ${nodeData.id}:`,
          error
        );
        skippedNodes.push(nodeData.id);
      }
    });
    
    if (skippedNodes.length > 0) {
      console.warn(
        `[SerializationService] Skipped ${skippedNodes.length} nodes due to missing plugins or errors:`,
        skippedNodes
      );
    }
    
    return instances;
  }
  
  /**
   * Restores handler IDs from serialized data.
   * Matches handlers by type and index (FIFO order).
   * 
   * CRITICAL: This preserves handler IDs so connections remain valid.
   * 
   * @param node - Node instance with newly created handlers
   * @param savedHandlers - Serialized handler data with original IDs
   */
  private restoreHandlerIds(node: Node, savedHandlers: Record<string, SerializedHandler>): void {
    const savedHandlersList = Object.values(savedHandlers);
    
    // Group saved handlers by type
    const handlersByType = new Map<string, SerializedHandler[]>();
    savedHandlersList.forEach(h => {
      if (!handlersByType.has(h.type)) {
        handlersByType.set(h.type, []);
      }
      handlersByType.get(h.type)!.push(h);
    });
    
    // Match node handlers with saved handlers by type and index
    const typeIndices = new Map<string, number>();
    
    node.handlers.forEach(handler => {
      const typeIndex = typeIndices.get(handler.type) || 0;
      typeIndices.set(handler.type, typeIndex + 1);
      
      const savedHandlersOfType = handlersByType.get(handler.type);
      if (savedHandlersOfType && savedHandlersOfType[typeIndex]) {
        const savedHandler = savedHandlersOfType[typeIndex];
        
        // Restore the original handler ID
        (handler as any).id = createHandlerId(savedHandler.id);
        
        // Restore label if it was customized
        if (savedHandler.label) {
          handler.label = savedHandler.label;
        }
      } else {
        console.warn(
          `[SerializationService] Could not match handler type "${handler.type}" at index ${typeIndex} for node ${node.id}`
        );
      }
    });
  }
  
  /**
   * Deserializes connections from JSON format.
   * Validates handler existence and skips orphaned connections.
   * 
   * @param connectionsData - Serialized connection data
   * @param nodes - Deserialized node instances (needed for validation)
   * @returns Runtime connection instances
   */
  private deserializeConnections(
    connectionsData: Record<string, SerializedConnection>,
    nodes: Node[]
  ): Connection[] {
    const instances: Connection[] = [];
    const orphanedConnections: string[] = [];
    
    Object.values(connectionsData).forEach(connData => {
      const definition = this.registry.getConnectionDefinition(connData.type);
      
      if (!definition) {
        console.warn(
          `[SerializationService] Connection type "${connData.type}" not registered. Skipping connection ${connData.id}.`
        );
        orphanedConnections.push(connData.id);
        return;
      }
      
      // Validate handler existence
      const sourceExists = this.handlerExists(connData.sourceHandlerId, nodes);
      const targetExists = this.handlerExists(connData.targetHandlerId, nodes);
      
      if (!sourceExists) {
        console.warn(
          `[SerializationService] Source handler ${connData.sourceHandlerId} not found. Skipping connection ${connData.id}.`
        );
        orphanedConnections.push(connData.id);
        return;
      }
      
      if (!targetExists) {
        console.warn(
          `[SerializationService] Target handler ${connData.targetHandlerId} not found. Skipping connection ${connData.id}.`
        );
        orphanedConnections.push(connData.id);
        return;
      }
      
      try {
        // Create connection instance
        const connection = new Connection(
          createConnectionId(connData.id),
          connData.type,
          definition,
          createHandlerId(connData.sourceHandlerId),
          createHandlerId(connData.targetHandlerId),
          connData.pathType
        );
        
        // Restore additional properties
        connection.style = { ...connData.style };
        connection.label = connData.label ? { ...connData.label } : undefined;
        connection.data = { ...connData.data };
        
        instances.push(connection);
        
      } catch (error) {
        console.error(
          `[SerializationService] Failed to deserialize connection ${connData.id}:`,
          error
        );
        orphanedConnections.push(connData.id);
      }
    });
    
    if (orphanedConnections.length > 0) {
      console.warn(
        `[SerializationService] Skipped ${orphanedConnections.length} orphaned connections:`,
        orphanedConnections
      );
    }
    
    return instances;
  }
  
  /**
   * Deserializes notes from JSON format.
   * 
   * @param notesData - Serialized note data
   * @returns Runtime note instances
   */
  private deserializeNotes(notesData: Record<string, SerializedNote>): Note[] {
    const instances: Note[] = [];
    
    Object.values(notesData).forEach(noteData => {
      try {
        const note = new Note(
          createNoteId(noteData.id),
          noteData.position,
          noteData.text,
          noteData.dimensions
        );
        
        instances.push(note);
        
      } catch (error) {
        console.error(
          `[SerializationService] Failed to deserialize note ${noteData.id}:`,
          error
        );
      }
    });
    
    return instances;
  }
  
  /**
   * Checks if a handler exists in the node list.
   * 
   * @param handlerId - Handler ID to search for
   * @param nodes - Nodes to search within
   * @returns True if handler exists
   */
  private handlerExists(handlerId: string, nodes: Node[]): boolean {
    return nodes.some(node => 
      node.handlers.some(h => h.id === handlerId)
    );
  }
  
  /**
   * Checks if a state version is compatible with current version.
   * 
   * @param version - Version string from serialized state
   * @returns True if compatible (major version matches)
   */
  private isCompatibleVersion(version: string): boolean {
    const [major] = version.split('.');
    return major === '1';
  }
  
  /**
   * Exports graph state to JSON string.
   * 
   * @returns Formatted JSON string
   */
  exportToJSON(): string {
    try {
      const state = this.serialize();
      return JSON.stringify(state, null, 2);
    } catch (error) {
      console.error('[SerializationService] Export to JSON failed:', error);
      throw error;
    }
  }
  
  /**
   * Imports graph state from JSON string.
   * 
   * @param json - JSON string to parse
   * @returns Runtime graph state
   * @throws {DeserializationError} If JSON is invalid
   */
  importFromJSON(json: string): GraphState {
    try {
      const data = JSON.parse(json) as SerializedState;
      return this.deserialize(data);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new DeserializationError('Invalid JSON format');
      }
      throw error;
    }
  }
  
  /**
   * Downloads current graph state as a JSON file.
   * 
   * @param filename - Name for downloaded file
   */
  downloadAsFile(filename: string = 'diagram.json'): void {
    try {
      const json = this.exportToJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      
      URL.revokeObjectURL(url);
      
      console.log(`[SerializationService] Downloaded as ${filename}`);
      
    } catch (error) {
      console.error('[SerializationService] Download failed:', error);
      throw new SerializationError('Failed to download file', error);
    }
  }
  
  /**
   * Loads graph state from a file.
   * 
   * @param file - File object to read
   * @returns Promise resolving to runtime graph state
   */
  async loadFromFile(file: File): Promise<GraphState> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const json = e.target?.result as string;
          const state = this.importFromJSON(json);
          console.log(`[SerializationService] Loaded from ${file.name}`);
          resolve(state);
        } catch (error) {
          reject(new DeserializationError(`Failed to load file: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new DeserializationError('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }
  
  /**
   * Validates a serialized state without deserializing.
   * Useful for pre-flight checks before import.
   * 
   * @param data - Serialized state to validate
   * @returns Validation result with warnings
   */
  validateState(data: SerializedState): {
    valid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Check version
    if (!this.isCompatibleVersion(data.metadata.version)) {
      warnings.push(`Version ${data.metadata.version} may not be compatible`);
    }
    
    // Check for missing plugins
    Object.values(data.nodes).forEach(node => {
      if (!this.registry.hasNodeType(node.type)) {
        warnings.push(`Node type "${node.type}" not registered`);
      }
    });
    
    Object.values(data.connections).forEach(conn => {
      if (!this.registry.hasConnectionType(conn.type)) {
        warnings.push(`Connection type "${conn.type}" not registered`);
      }
    });
    
    // Basic structure validation
    if (!data.metadata || !data.nodes || !data.connections) {
      errors.push('Invalid state structure');
    }
    
    return {
      valid: errors.length === 0,
      warnings,
      errors
    };
  }
}