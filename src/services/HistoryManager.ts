/**
 * History management system using delta patching for efficient undo/redo.
 * Stores only changed properties instead of full state snapshots.
 */
import { EventBus } from '../core/EventBus';
import { SerializedState, NodeData, ConnectionData, Transform } from '../core/types';
import { deepClone } from '../utils/DeepClone';

/**
 * Delta patch representing changes between two states.
 * Stores old and new values for changed properties only.
 */
interface StateDelta {
  nodes: Record<string, { old?: NodeData; new?: NodeData }>;
  connections: Record<string, { old?: ConnectionData; new?: ConnectionData }>;
  viewport?: { old?: Transform; new?: Transform };
}

/**
 * Manages undo/redo history using forward/backward delta patches.
 * Implements stack-based history with configurable depth limit.
 * 
 * @example
 * ```typescript
 * const history = new HistoryManager(
 *   50, // max depth
 *   () => serializationService.serialize(),
 *   (state) => store.setState(deserialize(state)),
 *   eventBus
 * );
 * 
 * // After each mutation
 * history.save();
 * 
 * // Undo/redo
 * history.undo();
 * history.redo();
 * ```
 */
export class HistoryManager {
  private undoStack: StateDelta[];
  private redoStack: StateDelta[];
  private headState: SerializedState | null;
  private maxDepth: number;
  private eventBus: EventBus;
  private serialize: () => SerializedState;
  private deserialize: (data: SerializedState) => void;
  
  /**
   * Creates a new HistoryManager instance.
   * 
   * @param maxDepth - Maximum number of undo steps to retain
   * @param serialize - Function to serialize current state
   * @param deserialize - Function to restore serialized state
   * @param eventBus - Event bus for publishing history status changes
   */
  constructor(
    maxDepth: number,
    serialize: () => SerializedState,
    deserialize: (data: SerializedState) => void,
    eventBus: EventBus
  ) {
    this.maxDepth = maxDepth;
    this.serialize = serialize;
    this.deserialize = deserialize;
    this.eventBus = eventBus;
    
    this.undoStack = [];
    this.redoStack = [];
    this.headState = null;
  }
  
  /**
   * Saves current state to history.
   * Calculates delta from previous state and pushes to undo stack.
   * Clears redo stack (new mutations invalidate redo history).
   */
  save(): void {
    try {
      const newState = this.serialize();
      
      if (!this.headState) {
        // First save - just store the state
        this.headState = deepClone(newState);
        this.emitHistoryStatus();
        return;
      }
      
      const delta = this.diff(this.headState, newState);
      
      // Ignore if no changes
      if (this.isEmptyPatch(delta)) {
        return;
      }
      
      this.undoStack.push(delta);
      
      // Limit stack depth (FIFO eviction)
      if (this.undoStack.length > this.maxDepth) {
        this.undoStack.shift();
      }
      
      // Clear redo stack on new mutation
      this.redoStack = [];
      
      this.headState = deepClone(newState);
      this.emitHistoryStatus();
      
    } catch (error) {
      console.error('[HistoryManager] Error saving state:', error);
    }
  }
  
  /**
   * Undoes the last change.
   * Applies inverse patch to restore previous state.
   * 
   * @returns True if undo was successful, false if stack is empty
   */
  undo(): boolean {
    if (!this.canUndo()) {
      console.warn('[HistoryManager] Cannot undo: stack is empty');
      return false;
    }
    
    try {
      const delta = this.undoStack.pop()!;
      
      // Apply inverse patch
      const prevState = this.applyInversePatch(this.headState!, delta);
      
      // Save forward patch to redo stack
      this.redoStack.push(delta);
      
      // Apply state
      this.deserialize(prevState);
      this.headState = prevState;
      
      this.emitHistoryStatus();
      console.log('[HistoryManager] Undo applied');
      return true;
      
    } catch (error) {
      console.error('[HistoryManager] Error during undo:', error);
      return false;
    }
  }
  
  /**
   * Redoes the last undone change.
   * Applies forward patch to restore next state.
   * 
   * @returns True if redo was successful, false if stack is empty
   */
  redo(): boolean {
    if (!this.canRedo()) {
      console.warn('[HistoryManager] Cannot redo: stack is empty');
      return false;
    }
    
    try {
      const delta = this.redoStack.pop()!;
      
      // Apply forward patch
      const nextState = this.applyPatch(this.headState!, delta);
      
      // Move to undo stack
      this.undoStack.push(delta);
      
      // Apply state
      this.deserialize(nextState);
      this.headState = nextState;
      
      this.emitHistoryStatus();
      console.log('[HistoryManager] Redo applied');
      return true;
      
    } catch (error) {
      console.error('[HistoryManager] Error during redo:', error);
      return false;
    }
  }
  
  /**
   * Checks if undo is available.
   * 
   * @returns True if there are changes to undo
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  
  /**
   * Checks if redo is available.
   * 
   * @returns True if there are changes to redo
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  
  /**
   * Clears all history.
   * WARNING: This cannot be undone.
   */
  reset(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.headState = null;
    this.emitHistoryStatus();
    console.log('[HistoryManager] History cleared');
  }
  
  /**
   * Gets current history statistics.
   * 
   * @returns Undo and redo stack sizes
   */
  getStats(): { undoDepth: number; redoDepth: number; maxDepth: number } {
    return {
      undoDepth: this.undoStack.length,
      redoDepth: this.redoStack.length,
      maxDepth: this.maxDepth
    };
  }
  
  /**
   * Calculates difference between two states.
   * Returns delta containing only changed properties.
   * 
   * @param oldState - Previous state
   * @param newState - Current state
   * @returns Delta patch
   */
  private diff(oldState: SerializedState, newState: SerializedState): StateDelta {
    const delta: StateDelta = {
      nodes: {},
      connections: {}
    };
    
    // Diff nodes
    const allNodeIds = new Set([
      ...Object.keys(oldState.nodes),
      ...Object.keys(newState.nodes)
    ]);
    
    allNodeIds.forEach(id => {
      const oldNode = oldState.nodes[id];
      const newNode = newState.nodes[id];
      
      if (!oldNode && newNode) {
        // Node added
        delta.nodes[id] = { new: newNode as any };
      } else if (oldNode && !newNode) {
        // Node removed
        delta.nodes[id] = { old: oldNode as any };
      } else if (oldNode && newNode) {
        // Node potentially modified
        if (JSON.stringify(oldNode) !== JSON.stringify(newNode)) {
          delta.nodes[id] = { old: oldNode as any, new: newNode as any };
        }
      }
    });
    
    // Diff connections
    const allConnIds = new Set([
      ...Object.keys(oldState.connections),
      ...Object.keys(newState.connections)
    ]);
    
    allConnIds.forEach(id => {
      const oldConn = oldState.connections[id];
      const newConn = newState.connections[id];
      
      if (!oldConn && newConn) {
        // Connection added
        delta.connections[id] = { new: newConn as any };
      } else if (oldConn && !newConn) {
        // Connection removed
        delta.connections[id] = { old: oldConn as any };
      } else if (oldConn && newConn) {
        // Connection potentially modified
        if (JSON.stringify(oldConn) !== JSON.stringify(newConn)) {
          delta.connections[id] = { old: oldConn as any, new: newConn as any };
        }
      }
    });
    
    // Diff viewport
    if (JSON.stringify(oldState.metadata.viewport) !== JSON.stringify(newState.metadata.viewport)) {
      delta.viewport = {
        old: oldState.metadata.viewport,
        new: newState.metadata.viewport
      };
    }
    
    return delta;
  }
  
  /**
   * Applies a forward patch to a state.
   * 
   * @param state - State to patch
   * @param delta - Delta to apply
   * @returns New state with changes applied
   */
  private applyPatch(state: SerializedState, delta: StateDelta): SerializedState {
    const newState = deepClone(state);
    
    // Apply node changes (forward)
    Object.entries(delta.nodes).forEach(([id, change]) => {
      if (change.new) {
        // Add or update node
        newState.nodes[id] = change.new as any;
      } else if (change.old && !change.new) {
        // Remove node
        delete newState.nodes[id];
      }
    });
    
    // Apply connection changes (forward)
    Object.entries(delta.connections).forEach(([id, change]) => {
      if (change.new) {
        // Add or update connection
        newState.connections[id] = change.new as any;
      } else if (change.old && !change.new) {
        // Remove connection
        delete newState.connections[id];
      }
    });
    
    // Apply viewport change (forward)
    if (delta.viewport?.new) {
      newState.metadata.viewport = delta.viewport.new;
    }
    
    return newState;
  }
  
  /**
   * Applies an inverse patch to a state (for undo).
   * 
   * @param state - State to patch
   * @param delta - Delta to reverse
   * @returns New state with changes reversed
   */
  private applyInversePatch(state: SerializedState, delta: StateDelta): SerializedState {
    const newState = deepClone(state);
    
    // Apply inverse node changes
    Object.entries(delta.nodes).forEach(([id, change]) => {
      if (change.old) {
        // Restore old node
        newState.nodes[id] = change.old as any;
      } else if (!change.old && change.new) {
        // Remove added node
        delete newState.nodes[id];
      }
    });
    
    // Apply inverse connection changes
    Object.entries(delta.connections).forEach(([id, change]) => {
      if (change.old) {
        // Restore old connection
        newState.connections[id] = change.old as any;
      } else if (!change.old && change.new) {
        // Remove added connection
        delete newState.connections[id];
      }
    });
    
    // Apply inverse viewport change
    if (delta.viewport?.old) {
      newState.metadata.viewport = delta.viewport.old;
    }
    
    return newState;
  }
  
  /**
   * Checks if a delta contains any changes.
   * 
   * @param delta - Delta to check
   * @returns True if delta is empty (no changes)
   */
  private isEmptyPatch(delta: StateDelta): boolean {
    return (
      Object.keys(delta.nodes).length === 0 &&
      Object.keys(delta.connections).length === 0 &&
      !delta.viewport
    );
  }
  
  /**
   * Emits HISTORY_CHANGED event with current undo/redo availability.
   */
  private emitHistoryStatus(): void {
    this.eventBus.emit('HISTORY_CHANGED', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    });
  }
}