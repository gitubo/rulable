/**
 * Event system types and payload definitions.
 */

import { NodeId, ConnectionId, NoteId, Position, GraphState } from './graph.types';
import { NodeInstance, ConnectionInstance, NoteInstance } from './api.types';

export type EventType = 
  | 'NODE_CREATED'
  | 'NODE_UPDATED'
  | 'NODE_REMOVED'
  | 'NODE_MOVED'
  | 'CONNECTION_CREATED'
  | 'CONNECTION_UPDATED'
  | 'CONNECTION_REMOVED'
  | 'SELECTION_CHANGED'
  | 'HISTORY_CHANGED'
  | 'STATE_LOADED'
  | 'PLUGINS_LOADED'
  | 'TRAVERSE_COMPLETED'
  | 'TRAVERSE_ERROR'
  | 'RENDER_REQUESTED'
  | 'NOTE_CREATED'
  | 'NOTE_UPDATED'
  | 'NOTE_REMOVED';

export interface NodeMovedPayload {
  readonly id: NodeId;
  readonly from: Position;
  readonly to: Position;
}

export interface Selection {
  readonly type: 'node' | 'link' | 'note';
  readonly id: string;
}

export interface HistoryStatus {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

export interface TraverseResult {
  readonly strategy: string;
  readonly result: unknown;
}

export interface ErrorPayload {
  readonly message: string;
  readonly code?: string;
}

// The Map linking Event Types to their Payloads
export interface EventPayloadMap {
  NODE_CREATED: NodeInstance;
  NODE_UPDATED: NodeInstance;
  NODE_REMOVED: NodeId;
  NODE_MOVED: NodeMovedPayload;
  CONNECTION_CREATED: ConnectionInstance;
  CONNECTION_UPDATED: ConnectionInstance;
  CONNECTION_REMOVED: ConnectionId;
  SELECTION_CHANGED: Selection | null;
  HISTORY_CHANGED: HistoryStatus;
  STATE_LOADED: GraphState;
  PLUGINS_LOADED: void;
  TRAVERSE_COMPLETED: TraverseResult;
  TRAVERSE_ERROR: ErrorPayload;
  RENDER_REQUESTED: void;
  NOTE_CREATED: NoteInstance;
  NOTE_UPDATED: NoteInstance;
  NOTE_REMOVED: NoteId;
}

export type EventCallback<T extends EventType> = (payload: EventPayloadMap[T]) => void;
export type UnsubscribeFn = () => void;