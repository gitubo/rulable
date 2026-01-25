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

// Mock Registry interface for getPath signature to avoid circular dependency
// In real implementation, this would import the Registry class
interface RegistryStub {
  [key: string]: any;
}

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
  
  getPath(nodes: NodeInstance[], registry: RegistryStub): string {
    // To be implemented in geometry phase using PathCalculator
    return '';
  }
  
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