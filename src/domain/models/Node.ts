import { 
  NodeId, 
  NodeRole, 
  Position, 
  Dimensions, 
  NodeStyle,
  NodeData,
  NodePluginDefinition,
  NodeInstance,
  HandlerData
} from '../../core/types';
import { Handler } from './Handler';

/**
 * Node entity representing a graph node with handlers, data, and visual properties.
 * Nodes are the primary building blocks of the graph and contain connection points (handlers).
 * 
 * @example
 * ```typescript
 * const node = new Node(
 *   createNodeId('node_1'),
 *   'task',
 *   taskDefinition,
 *   { x: 100, y: 100 },
 *   'My Task',
 *   { timeout: 5000 }
 * );
 * ```
 */
export class Node implements NodeInstance {
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
  readonly handlers: Handler[];
  
  private definition: NodePluginDefinition;
  
  /**
   * Creates a new Node instance.
   * Handlers are created automatically based on the plugin definition.
   * 
   * @param id - Unique node identifier
   * @param type - Node type (must match registered plugin type)
   * @param definition - Plugin definition containing shape, handlers, schema
   * @param position - Graph coordinates for node placement
   * @param label - Display label (default: empty string)
   * @param data - Custom node data (default: empty object)
   * @param handlers - Pre-created handlers (default: auto-generated from definition)
   * @param width - Node width in pixels (default: 200)
   * @param height - Node height in pixels (default: 100)
   */
  constructor(
    id: NodeId,
    type: string,
    definition: NodePluginDefinition,
    position: Position,
    label: string = '',
    data: Record<string, unknown> = {},
    handlers: Handler[] = [],
    width: number = 200,
    height: number = 100
  ) {
    this.id = id;
    this.type = type;
    this.definition = definition;
    this.role = definition.role;
    this.position = position;
    this.label = label;
    this.data = data;
    this.handlers = handlers;
    this.note = '';
    this.width = width;
    this.height = height;
    this.style = {};
  }
  
  /**
   * Gets the SVG path template for rendering this node's shape.
   * Template is provided by the plugin definition.
   * 
   * @returns SVG path string defining the node body shape
   */
  getShapeTemplate(): string {
    return this.definition.getShapeTemplate();
  }
  
  /**
   * Gets additional SVG attributes for the node shape (e.g., rounded corners).
   * 
   * @returns Attribute map or null if no additional attributes needed
   * @example
   * ```typescript
   * { rx: 8, ry: 8 } // Rounded corners
   * ```
   */
  getShapeAttributes(): Record<string, unknown> | null {
    return this.definition.getShapeAttributes?.() ?? null;
  }
  
  /**
   * Gets the current dimensions of this node.
   * 
   * @returns Width and height in pixels
   */
  getDimensions(): Dimensions {
    return {
      width: this.width,
      height: this.height
    };
  }
  
  /**
   * Checks if this node has any input handlers.
   * Used to determine if the node can be a connection target.
   * 
   * @returns True if node has handlers that accept incoming connections
   */
  hasTargetHandlers(): boolean {
    return this.definition.hasTargetHandlers();
  }
  
  /**
   * Exports immutable node data snapshot.
   * All nested objects are cloned to prevent external mutation.
   * 
   * @returns Frozen node data object safe for external consumption
   */
  getData(): NodeData {
    return Object.freeze({
      id: this.id,
      type: this.type,
      label: this.label,
      note: this.note,
      position: { ...this.position },
      style: { ...this.style },
      data: { ...this.data },
      handlers: this.handlers.map(h => h.getData())
    });
  }
  
  /**
   * Creates a deep copy of this node.
   * Handlers are recursively cloned.
   * 
   * @returns New Node instance with independent data
   */
  clone(): Node {
    // Clone handlers recursively
    const clonedHandlers = this.handlers.map(h => h.clone());

    const cloned = new Node(
      this.id,
      this.type,
      this.definition,
      { ...this.position },
      this.label,
      { ...this.data },
      clonedHandlers,
      this.width,
      this.height
    );
    
    cloned.note = this.note;
    cloned.style = { ...this.style };
    return cloned;
  }
}