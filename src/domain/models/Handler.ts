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
import * as d3 from 'd3'; // Type import for d3 Selection

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
  
  constructor(
    id: HandlerId,
    type: string,
    definition: HandlerPluginDefinition,
    offset: Position,
    label: string = '',
    role: 'source' | 'target' | '' = ''
  ) {
    this.id = id;
    this.type = type;
    this.definition = definition;
    this.offset = offset;
    this.label = label;
    this.flow = definition.flow;
    this.dimensions = definition.dimensions;
    this.role = role;
    
    // Default direction based on offset could be calculated here, 
    // or passed in. Assuming logic handles this externally or defaults.
    this.direction = Direction.OMNI; 
  }
  
  getShapeTemplate(): string {
    return this.definition.getShapeTemplate();
  }
  
  getShapeAttributes(): Record<string, unknown> | null {
    return this.definition.getShapeAttributes?.() ?? null;
  }
  
  renderLabel(group: d3.Selection<any, any, any, any>): void {
    // To be implemented in rendering phase
  }
  
  renderExtras(group: d3.Selection<any, any, any, any>, state: any): void {
    // To be implemented in rendering phase
  }
  
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
  
  clone(): Handler {
    return new Handler(
      this.id,
      this.type,
      this.definition,
      { ...this.offset },
      this.label,
      this.role
    );
  }
}