import { 
  HandlerId, 
  FlowType, 
  Direction, 
  Position, 
  Dimensions,
  HandlerData,
  HandlerPluginDefinition,
  HandlerInstance
} from '../../core/types';
import * as d3 from 'd3';

/**
 * Handler entity representing a connection point on a node.
 * Manages handler position, direction, and visual properties.
 */
export class Handler implements HandlerInstance {
  readonly id: HandlerId;
  readonly type: string;
  readonly flow: FlowType;
  readonly role: 'source' | 'target' | '';
  readonly offset: Position;
  readonly direction: Direction;
  readonly dimensions: Dimensions;
  label: string;
  
  private definition: HandlerPluginDefinition;
  
  /**
   * Creates a new Handler instance.
   * @param id - Unique handler identifier
   * @param type - Handler type (references plugin registry)
   * @param definition - Plugin definition for this handler type
   * @param offset - Position offset relative to parent node
   * @param label - Optional handler label
   * @param role - Handler role (source/target/both)
   * @param direction - Explicit direction or auto-calculated from offset
   */
  constructor(
    id: HandlerId,
    type: string,
    definition: HandlerPluginDefinition,
    offset: Position,
    label: string = '',
    role: 'source' | 'target' | '' = '',
    direction?: Direction
  ) {
    this.id = id;
    this.type = type;
    this.definition = definition;
    this.offset = offset;
    this.label = label;
    this.flow = definition.flow;
    this.dimensions = definition.dimensions;
    this.role = role;
    
    // Calculate direction from offset if not explicitly provided
    this.direction = direction ?? this.calculateDirectionFromOffset(offset);
  }
  
  /**
   * Calculates handler direction based on position offset.
   * Uses heuristic: largest absolute component determines direction.
   * @param offset - Position offset from node center
   * @returns Calculated direction
   */
  private calculateDirectionFromOffset(offset: Position): Direction {
    const absX = Math.abs(offset.x);
    const absY = Math.abs(offset.y);
    
    // If roughly centered, default to OMNI
    if (absX < 10 && absY < 10) {
      return Direction.OMNI;
    }
    
    // Determine primary axis
    if (absX > absY) {
      return offset.x > 0 ? Direction.RIGHT : Direction.LEFT;
    } else {
      return offset.y > 0 ? Direction.BOTTOM : Direction.TOP;
    }
  }
  
  /**
   * Gets the SVG shape template for rendering this handler.
   * @returns SVG path string from plugin definition
   */
  getShapeTemplate(): string {
    return this.definition.getShapeTemplate();
  }
  
  /**
   * Gets additional SVG attributes for the handler shape.
   * @returns Attribute map or null if none defined
   */
  getShapeAttributes(): Record<string, unknown> | null {
    return this.definition.getShapeAttributes?.() ?? null;
  }
  
  /**
   * Renders the handler label (implemented in rendering phase).
   * @param group - D3 selection for the handler group
   */
  renderLabel(group: d3.Selection<any, any, any, any>): void {
    // To be implemented in rendering phase
  }
  
  /**
   * Renders additional UI elements (implemented in rendering phase).
   * @param group - D3 selection for the handler group
   * @param state - Current render state
   */
  renderExtras(group: d3.Selection<any, any, any, any>, state: any): void {
    // To be implemented in rendering phase
  }
  
  /**
   * Exports immutable handler data snapshot.
   * @returns Frozen handler data object
   */
  getData(): HandlerData {
    return Object.freeze({
      id: this.id,
      type: this.type,
      flow: this.flow,
      offset: { ...this.offset },
      direction: this.direction,
      label: this.label
    });
  }
  
  /**
   * Creates a deep copy of this handler.
   * @returns New Handler instance with copied data
   */
  clone(): Handler {
    return new Handler(
      this.id,
      this.type,
      this.definition,
      { ...this.offset },
      this.label,
      this.role,
      this.direction
    );
  }
}