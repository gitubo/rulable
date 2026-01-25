/**
 * Central registry for managing and retrieving plugins.
 */
import { 
  NodePluginDefinition,
  HandlerPluginDefinition,
  StrategyPluginDefinition,
  ConnectionPluginDefinition,
  NodeRole
} from './types';
import { PluginValidator, PluginCategory } from './validation/PluginValidator';

export class Registry {
  private nodes: Map<string, NodePluginDefinition>;
  private handlers: Map<string, HandlerPluginDefinition>;
  private strategies: Map<string, StrategyPluginDefinition>;
  private connections: Map<string, ConnectionPluginDefinition>;
  private validator: PluginValidator;
  
  constructor() {
    this.nodes = new Map();
    this.handlers = new Map();
    this.strategies = new Map();
    this.connections = new Map();
    this.validator = new PluginValidator();
  }
  
  // ========== NODE PLUGINS ==========
  
  registerNode(definition: NodePluginDefinition): void {
    const ctor = (definition as any).constructor;
    const type = ctor.type;
    
    if (!type) {
      throw new Error('Node plugin must have static type property');
    }
    
    const validation = this.validator.validate(definition, 'node');
    if (!validation.valid) {
      throw new Error(
        `Invalid node plugin "${validation.error!.plugin}": missing ${validation.error!.missing.join(', ')}`
      );
    }
    
    if (this.nodes.has(type)) {
      console.warn(`Node type "${type}" is already registered. Overwriting.`);
    }
    
    this.nodes.set(type, definition);
  }
  
  getNodeDefinition(type: string): NodePluginDefinition | null {
    return this.nodes.get(type) || null;
  }
  
  getAllNodeDefinitions(): NodePluginDefinition[] {
    return Array.from(this.nodes.values());
  }
  
  getNodesByRole(role: NodeRole): NodePluginDefinition[] {
    return Array.from(this.nodes.values()).filter(def => {
      const ctor = (def as any).constructor;
      return ctor.role === role;
    });
  }
  
  hasNodeType(type: string): boolean {
    return this.nodes.has(type);
  }
  
  // ========== HANDLER PLUGINS ==========
  
  registerHandler(definition: HandlerPluginDefinition): void {
    const ctor = (definition as any).constructor;
    const type = ctor.type;
    
    if (!type) {
      throw new Error('Handler plugin must have static type property');
    }
    
    const validation = this.validator.validate(definition, 'handler');
    if (!validation.valid) {
      throw new Error(
        `Invalid handler plugin "${validation.error!.plugin}": missing ${validation.error!.missing.join(', ')}`
      );
    }
    
    if (this.handlers.has(type)) {
      console.warn(`Handler type "${type}" is already registered. Overwriting.`);
    }
    
    this.handlers.set(type, definition);
  }
  
  getHandlerDefinition(type: string): HandlerPluginDefinition | null {
    return this.handlers.get(type) || null;
  }
  
  getAllHandlerDefinitions(): HandlerPluginDefinition[] {
    return Array.from(this.handlers.values());
  }
  
  hasHandlerType(type: string): boolean {
    return this.handlers.has(type);
  }
  
  // ========== STRATEGY PLUGINS ==========
  
  registerStrategy(definition: StrategyPluginDefinition): void {
    const ctor = (definition as any).constructor;
    const type = ctor.type;
    
    if (!type) {
      throw new Error('Strategy plugin must have static type property');
    }
    
    const validation = this.validator.validate(definition, 'strategy');
    if (!validation.valid) {
      throw new Error(
        `Invalid strategy plugin "${validation.error!.plugin}": missing ${validation.error!.missing.join(', ')}`
      );
    }
    
    if (this.strategies.has(type)) {
      console.warn(`Strategy type "${type}" is already registered. Overwriting.`);
    }
    
    this.strategies.set(type, definition);
  }
  
  getStrategy(type: string): StrategyPluginDefinition | null {
    return this.strategies.get(type) || null;
  }
  
  getAllStrategies(): StrategyPluginDefinition[] {
    return Array.from(this.strategies.values());
  }
  
  hasStrategy(type: string): boolean {
    return this.strategies.has(type);
  }
  
  // ========== CONNECTION PLUGINS ==========
  
  registerConnection(definition: ConnectionPluginDefinition): void {
    const ctor = (definition as any).constructor;
    const type = ctor.type;
    
    if (!type) {
      throw new Error('Connection plugin must have static type property');
    }
    
    const validation = this.validator.validate(definition, 'connection');
    if (!validation.valid) {
      throw new Error(
        `Invalid connection plugin "${validation.error!.plugin}": missing ${validation.error!.missing.join(', ')}`
      );
    }
    
    if (this.connections.has(type)) {
      console.warn(`Connection type "${type}" is already registered. Overwriting.`);
    }
    
    this.connections.set(type, definition);
  }
  
  getConnectionDefinition(type: string): ConnectionPluginDefinition | null {
    return this.connections.get(type) || null;
  }
  
  getAllConnectionDefinitions(): ConnectionPluginDefinition[] {
    return Array.from(this.connections.values());
  }
  
  hasConnectionType(type: string): boolean {
    return this.connections.has(type);
  }
  
  // ========== UTILITY ==========
  
  clear(): void {
    this.nodes.clear();
    this.handlers.clear();
    this.strategies.clear();
    this.connections.clear();
  }
  
  getStats(): { nodes: number; handlers: number; strategies: number; connections: number } {
    return {
      nodes: this.nodes.size,
      handlers: this.handlers.size,
      strategies: this.strategies.size,
      connections: this.connections.size
    };
  }
}