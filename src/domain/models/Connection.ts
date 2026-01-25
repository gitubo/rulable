import { 
  ConnectionId, 
  HandlerId, 
  ConnectionPathType,
  LinkStyle,
  LinkLabel,
  ConnectionData,
  ConnectionPluginDefinition,
  ConnectionInstance,
  NodeInstance
} from '../../core/types';
import { Registry } from '../../core/Registry';

/**
 * Connection entity representing a link between two handlers.
 * Manages connection data, styling, and path type.
 */
export class Connection implements ConnectionInstance {
  readonly id: ConnectionId;
  readonly type: string;
  sourceHandlerId: HandlerId;
  targetHandlerId: HandlerId;
  pathType: ConnectionPathType;
  style: LinkStyle;
  label?: LinkLabel;
  data: Record<string, unknown>;
  
  private definition: ConnectionPluginDefinition;
  
  /**
   * Creates a new Connection instance.
   * @param id - Unique connection identifier
   * @param type - Connection type (references plugin registry)
   * @param definition - Plugin definition for this connection type
   * @param sourceHandlerId - Source handler ID
   * @param targetHandlerId - Target handler ID
   * @param pathType - Visual path rendering type (bezier, smooth_step, straight)
   * @param data - Custom connection data
   */
  constructor(
    id: ConnectionId,
    type: string,
    definition: ConnectionPluginDefinition,
    sourceHandlerId: HandlerId,
    targetHandlerId: HandlerId,
    pathType: ConnectionPathType = ConnectionPathType.BEZIER,
    data: Record<string, unknown> = {}
  ) {
    this.id = id;
    this.type = type;
    this.definition = definition;
    this.sourceHandlerId = sourceHandlerId;
    this.targetHandlerId = targetHandlerId;
    this.pathType = pathType;
    this.data = data;
    
    // Default style
    this.style = {
      stroke: '#666666',
      strokeWidth: 2
    };
  }
  
  /**
   * Calculates the SVG path string for this connection.
   * Delegates to PathCalculator in rendering phase.
   * @param nodes - All nodes in the graph (needed to locate handlers)
   * @param registry - Plugin registry (for accessing path calculation strategies)
   * @returns SVG path string or empty string if calculation fails
   */
  getPath(nodes: NodeInstance[], registry: Registry): string {
    // Implemented by PathCalculator in rendering phase
    return '';
  }
  
  /**
   * Updates connection properties.
   * @param changes - Partial connection data to merge
   */
  update(changes: Partial<ConnectionData>): void {
    if (changes.label !== undefined) {
      this.label = changes.label;
    }
    if (changes.style !== undefined) {
      this.style = { ...this.style, ...changes.style };
    }
    if (changes.data !== undefined) {
      this.data = { ...this.data, ...changes.data };
    }
    if (changes.pathType !== undefined) {
      this.pathType = changes.pathType;
    }
  }
  
  /**
   * Exports immutable connection data snapshot.
   * @returns Frozen connection data object
   */
  getData(): ConnectionData {
    return Object.freeze({
      id: this.id,
      type: this.type,
      sourceHandlerId: this.sourceHandlerId,
      targetHandlerId: this.targetHandlerId,
      pathType: this.pathType,
      label: this.label ? { ...this.label } : undefined,
      style: { ...this.style },
      data: { ...this.data }
    });
  }
  
  /**
   * Creates a deep copy of this connection.
   * @returns New Connection instance with copied data
   */
  clone(): Connection {
    const cloned = new Connection(
      this.id,
      this.type,
      this.definition,
      this.sourceHandlerId,
      this.targetHandlerId,
      this.pathType,
      { ...this.data }
    );
    
    cloned.style = { ...this.style };
    cloned.label = this.label ? { ...this.label } : undefined;
    
    return cloned;
  }
}