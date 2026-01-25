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
  
  getShapeTemplate(): string {
    return this.definition.getShapeTemplate();
  }
  
  getShapeAttributes(): Record<string, unknown> | null {
    return this.definition.getShapeAttributes?.() ?? null;
  }
  
  getDimensions(): Dimensions {
    return {
      width: this.width,
      height: this.height
    };
  }
  
  hasTargetHandlers(): boolean {
    return this.definition.hasTargetHandlers();
  }
  
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