/**
 * Public API, Commands, Queries, and Serialization types.
 */

import { 
    NodeId, ConnectionId, HandlerId, NoteId, 
    Position, Transform, NodeStyle, LinkStyle, 
    LinkLabel, NodeRole, FlowType, Direction, 
    ConnectionPathType, Dimensions 
} from './graph.types';

// Interfaces used as instances in runtime
export interface NodeInstance {
    readonly id: NodeId;
    readonly type: string;
    readonly role: NodeRole;
    label: string;
    note: string;
    readonly position: Position;
    readonly width: number;
    readonly height: number;
    style: NodeStyle;
    data: Record<string, unknown>;
    readonly handlers: HandlerInstance[];
    
    getShapeTemplate(): string;
    getShapeAttributes(): Record<string, unknown> | null;
    getDimensions(): Dimensions;
    getData(): NodeData;
}

export interface HandlerInstance {
    readonly id: HandlerId;
    readonly type: string;
    readonly flow: FlowType;
    readonly role: 'source' | 'target' | '';
    readonly offset: Position;
    readonly direction: Direction;
    readonly dimensions: Dimensions;
    label: string;
    
    getData(): HandlerData;
}

export interface ConnectionInstance {
    readonly id: ConnectionId;
    readonly type: string;
    sourceHandlerId: HandlerId;
    targetHandlerId: HandlerId;
    pathType: ConnectionPathType;
    style: LinkStyle;
    label?: LinkLabel;
    data: Record<string, unknown>;
    
    getData(): ConnectionData;
}

export interface NoteInstance {
    readonly id: NoteId;
    text: string;
    position: Position;
    dimensions: Dimensions;
    
    getData(): NoteData;
}


export interface WidgetConfig {
  container: HTMLElement | string;
  width?: string | number;
  height?: string | number;
  showDefaultUI?: boolean;
  initialZoom?: number;
  initialOffset?: { x: number; y: number };
  manifestUrl?: string;
}

// Payloads
export interface CreateNodePayload {
  type: string;
  x: number;
  y: number;
  label?: string;
  data?: Record<string, unknown>;
}

export interface UpdateNodePayload {
  id: NodeId;
  label?: string;
  note?: string;
  style?: NodeStyle;
  data?: Record<string, unknown>;
}

export interface SpawnConnectedPayload {
  type: string;
  x: number;
  y: number;
  sourceHandlerId: HandlerId;
}

export interface UpdateLinkPayload {
  id: ConnectionId;
  label?: LinkLabel;
  style?: LinkStyle;
}

export interface TraversePayload {
  strategy: string;
}

// Commands
export interface WidgetCommands {
  loadPlugins(url?: string): void;
  createNode(payload: CreateNodePayload): void;
  deleteNode(id: NodeId): void;
  updateNode(payload: UpdateNodePayload): void;
  spawnNodeConnected(payload: SpawnConnectedPayload): void;
  createLink(sourceHandlerId: HandlerId, targetHandlerId: HandlerId): void;
  deleteLink(id: ConnectionId): void;
  updateLink(payload: UpdateLinkPayload): void;
  createNote(x: number, y: number): void;
  deleteNote(id: NoteId): void;
  undo(): void;
  redo(): void;
  zoomIn(): void;
  zoomOut(): void;
  zoomReset(): void;
  zoomFit(): void;
  selectObject(type: 'node' | 'link', id: string): void;
  deselectAll(): void;
  importState(data: SerializedState): void;
  traverseDiagram(payload: TraversePayload): Promise<void>;
}

// Queries Data Objects
export interface NodeMetadata {
  readonly type: string;
  readonly role: NodeRole;
}

export interface NodeData {
  readonly id: NodeId;
  readonly type: string;
  readonly label: string;
  readonly note: string;
  readonly position: Readonly<Position>;
  readonly style: Readonly<NodeStyle>;
  readonly data: Readonly<Record<string, unknown>>;
  readonly handlers: ReadonlyArray<HandlerData>;
}

export interface HandlerData {
  readonly id: HandlerId;
  readonly type: string;
  readonly flow: FlowType;
  readonly offset: Position;
  readonly direction: Direction;
  label: string;
}

export interface ConnectionData {
  readonly id: ConnectionId;
  readonly type: string;
  readonly sourceHandlerId: HandlerId;
  readonly targetHandlerId: HandlerId;
  readonly pathType: ConnectionPathType;
  readonly label?: Readonly<LinkLabel>;
  readonly style: Readonly<LinkStyle>;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface NoteData {
    readonly id: NoteId;
    readonly text: string;
    readonly position: Position;
    readonly dimensions: Dimensions;
}

export interface WidgetQueries {
  getNode(id: NodeId): Readonly<NodeData> | null;
  getAllNodesDefinition(): ReadonlyArray<NodeMetadata>;
  getNodeIconPathData(type: string): string;
  getLink(id: ConnectionId): Readonly<ConnectionData> | null;
  getGraphData(): Readonly<SerializedState>;
}

export interface WidgetAPI {
  readonly commands: WidgetCommands;
  readonly queries: WidgetQueries;
}

// Serialization
export interface SerializedState {
  metadata: {
    version: string;
    createdAt: string;
    viewport: Transform;
  };
  nodes: Record<string, SerializedNode>;
  connections: Record<string, SerializedConnection>;
  notes?: Record<string, SerializedNote>;
}

export interface SerializedNode {
  id: NodeId;
  type: string;
  label: string;
  note: string;
  data: Record<string, unknown>;
  presentation: {
    position: Position;
    style: NodeStyle;
  };
  handles: Record<string, SerializedHandler>;
}

export interface SerializedHandler {
  id: HandlerId;
  type: string;
  label: string;
  flow: FlowType;
  presentation: {
    offset: Position;
    direction: Direction;
  };
}

export interface SerializedConnection {
  id: ConnectionId;
  type: string;
  sourceHandlerId: HandlerId;
  targetHandlerId: HandlerId;
  pathType: ConnectionPathType;
  label?: LinkLabel;
  style: LinkStyle;
  data: Record<string, unknown>;
}

export interface SerializedNote {
  id: NoteId;
  text: string;
  position: Position;
  dimensions: Dimensions;
}