/**
 * Central registry for managing and retrieving plugins with validation.
 * Provides type-safe plugin storage and retrieval with comprehensive error handling.
 */
import { 
  NodePluginDefinition,
  HandlerPluginDefinition,
  StrategyPluginDefinition,
  ConnectionPluginDefinition,
  NodeRole
} from './types';
import { PluginValidator, PluginCategory } from './validation/PluginValidator';

/**
 * Custom error for plugin registration failures.
 */
export class PluginRegistrationError extends Error {
  constructor(
    message: string, 
    public readonly pluginType: string,
    public readonly category: PluginCategory,
    public readonly validationErrors?: string[]
  ) {
    super(message);
    this.name = 'PluginRegistrationError';
  }
}

/**
 * Registry for managing plugin lifecycle: registration, validation, retrieval.
 * Ensures all plugins implement required interfaces before registration.
 */
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
  
  /**
   * Registers a node plugin definition.
   * Validates plugin interface before registration.
   * 
   * @param definition - Node plugin instance to register
   * @throws {PluginRegistrationError} If plugin fails validation
   * @throws {TypeError} If definition is null/undefined
   */
  registerNode(definition: NodePluginDefinition): void {
    if (!definition) {
      throw new TypeError('Node plugin definition cannot be null or undefined');
    }
    
    const ctor = (definition as any).constructor;
    const type = ctor.type;
    
    if (!type || typeof type !== 'string') {
      throw new PluginRegistrationError(
        'Node plugin must have static type property',
        'unknown',
        'node'
      );
    }
    
    const validation = this.validator.validate(definition, 'node');
    if (!validation.valid && validation.error) {
      throw new PluginRegistrationError(
        `Invalid node plugin "${validation.error.plugin}": missing ${validation.error.missing.join(', ')}`,
        type,
        'node',
        validation.error.missing
      );
    }
    
    if (this.nodes.has(type)) {
      console.warn(`[Registry] Node type "${type}" is already registered. Overwriting.`);
    }
    
    this.nodes.set(type, definition);
    console.log(`[Registry] Registered node plugin: ${type}`);
  }
  
  /**
   * Retrieves a node plugin definition by type.
   * 
   * @param type - Node type identifier
   * @returns Plugin definition or null if not found
   */
  getNodeDefinition(type: string): NodePluginDefinition | null {
    const definition = this.nodes.get(type);
    
    if (!definition) {
      console.warn(`[Registry] Node type "${type}" not found`);
    }
    
    return definition || null;
  }
  
  /**
   * Gets all registered node plugin definitions.
   * 
   * @returns Array of all node plugins
   */
  getAllNodeDefinitions(): NodePluginDefinition[] {
    return Array.from(this.nodes.values());
  }
  
  /**
   * Filters node plugins by role category.
   * 
   * @param role - Node role to filter by
   * @returns Array of matching node plugins
   */
  getNodesByRole(role: NodeRole): NodePluginDefinition[] {
    return Array.from(this.nodes.values()).filter(def => {
      const ctor = (def as any).constructor;
      return ctor.role === role;
    });
  }
  
  /**
   * Checks if a node type is registered.
   * 
   * @param type - Node type to check
   * @returns True if type is registered
   */
  hasNodeType(type: string): boolean {
    return this.nodes.has(type);
  }
  
  // ========== HANDLER PLUGINS ==========
  
  /**
   * Registers a handler plugin definition.
   * 
   * @param definition - Handler plugin instance to register
   * @throws {PluginRegistrationError} If plugin fails validation
   */
  registerHandler(definition: HandlerPluginDefinition): void {
    if (!definition) {
      throw new TypeError('Handler plugin definition cannot be null or undefined');
    }
    
    const ctor = (definition as any).constructor;
    const type = ctor.type;
    
    if (!type || typeof type !== 'string') {
      throw new PluginRegistrationError(
        'Handler plugin must have static type property',
        'unknown',
        'handler'
      );
    }
    
    const validation = this.validator.validate(definition, 'handler');
    if (!validation.valid && validation.error) {
      throw new PluginRegistrationError(
        `Invalid handler plugin "${validation.error.plugin}": missing ${validation.error.missing.join(', ')}`,
        type,
        'handler',
        validation.error.missing
      );
    }
    
    if (this.handlers.has(type)) {
      console.warn(`[Registry] Handler type "${type}" is already registered. Overwriting.`);
    }
    
    this.handlers.set(type, definition);
    console.log(`[Registry] Registered handler plugin: ${type}`);
  }
  
  /**
   * Retrieves a handler plugin definition by type.
   * 
   * @param type - Handler type identifier
   * @returns Plugin definition or null if not found
   */
  getHandlerDefinition(type: string): HandlerPluginDefinition | null {
    const definition = this.handlers.get(type);
    
    if (!definition) {
      console.warn(`[Registry] Handler type "${type}" not found`);
    }
    
    return definition || null;
  }
  
  /**
   * Gets all registered handler plugin definitions.
   * 
   * @returns Array of all handler plugins
   */
  getAllHandlerDefinitions(): HandlerPluginDefinition[] {
    return Array.from(this.handlers.values());
  }
  
  /**
   * Checks if a handler type is registered.
   * 
   * @param type - Handler type to check
   * @returns True if type is registered
   */
  hasHandlerType(type: string): boolean {
    return this.handlers.has(type);
  }
  
  // ========== STRATEGY PLUGINS ==========
  
  /**
   * Registers a strategy plugin definition.
   * 
   * @param definition - Strategy plugin instance to register
   * @throws {PluginRegistrationError} If plugin fails validation
   */
  registerStrategy(definition: StrategyPluginDefinition): void {
    if (!definition) {
      throw new TypeError('Strategy plugin definition cannot be null or undefined');
    }
    
    const ctor = (definition as any).constructor;
    const type = ctor.type;
    
    if (!type || typeof type !== 'string') {
      throw new PluginRegistrationError(
        'Strategy plugin must have static type property',
        'unknown',
        'strategy'
      );
    }
    
    const validation = this.validator.validate(definition, 'strategy');
    if (!validation.valid && validation.error) {
      throw new PluginRegistrationError(
        `Invalid strategy plugin "${validation.error.plugin}": missing ${validation.error.missing.join(', ')}`,
        type,
        'strategy',
        validation.error.missing
      );
    }
    
    if (this.strategies.has(type)) {
      console.warn(`[Registry] Strategy type "${type}" is already registered. Overwriting.`);
    }
    
    this.strategies.set(type, definition);
    console.log(`[Registry] Registered strategy plugin: ${type}`);
  }
  
  /**
   * Retrieves a strategy plugin definition by type.
   * 
   * @param type - Strategy type identifier
   * @returns Plugin definition or null if not found
   */
  getStrategy(type: string): StrategyPluginDefinition | null {
    const definition = this.strategies.get(type);
    
    if (!definition) {
      console.warn(`[Registry] Strategy type "${type}" not found`);
    }
    
    return definition || null;
  }
  
  /**
   * Gets all registered strategy plugin definitions.
   * 
   * @returns Array of all strategy plugins
   */
  getAllStrategies(): StrategyPluginDefinition[] {
    return Array.from(this.strategies.values());
  }
  
  /**
   * Checks if a strategy type is registered.
   * 
   * @param type - Strategy type to check
   * @returns True if type is registered
   */
  hasStrategy(type: string): boolean {
    return this.strategies.has(type);
  }
  
  // ========== CONNECTION PLUGINS ==========
  
  /**
   * Registers a connection plugin definition.
   * 
   * @param definition - Connection plugin instance to register
   * @throws {PluginRegistrationError} If plugin fails validation
   */
  registerConnection(definition: ConnectionPluginDefinition): void {
    if (!definition) {
      throw new TypeError('Connection plugin definition cannot be null or undefined');
    }
    
    const ctor = (definition as any).constructor;
    const type = ctor.type;
    
    if (!type || typeof type !== 'string') {
      throw new PluginRegistrationError(
        'Connection plugin must have static type property',
        'unknown',
        'connection'
      );
    }
    
    const validation = this.validator.validate(definition, 'connection');
    if (!validation.valid && validation.error) {
      throw new PluginRegistrationError(
        `Invalid connection plugin "${validation.error.plugin}": missing ${validation.error.missing.join(', ')}`,
        type,
        'connection',
        validation.error.missing
      );
    }
    
    if (this.connections.has(type)) {
      console.warn(`[Registry] Connection type "${type}" is already registered. Overwriting.`);
    }
    
    this.connections.set(type, definition);
    console.log(`[Registry] Registered connection plugin: ${type}`);
  }
  
  /**
   * Retrieves a connection plugin definition by type.
   * 
   * @param type - Connection type identifier
   * @returns Plugin definition or null if not found
   */
  getConnectionDefinition(type: string): ConnectionPluginDefinition | null {
    const definition = this.connections.get(type);
    
    if (!definition) {
      console.warn(`[Registry] Connection type "${type}" not found`);
    }
    
    return definition || null;
  }
  
  /**
   * Gets all registered connection plugin definitions.
   * 
   * @returns Array of all connection plugins
   */
  getAllConnectionDefinitions(): ConnectionPluginDefinition[] {
    return Array.from(this.connections.values());
  }
  
  /**
   * Checks if a connection type is registered.
   * 
   * @param type - Connection type to check
   * @returns True if type is registered
   */
  hasConnectionType(type: string): boolean {
    return this.connections.has(type);
  }
  
  // ========== UTILITY ==========
  
  /**
   * Clears all registered plugins.
   * WARNING: This will break existing graph instances using these plugins.
   */
  clear(): void {
    this.nodes.clear();
    this.handlers.clear();
    this.strategies.clear();
    this.connections.clear();
    console.log('[Registry] All plugins cleared');
  }
  
  /**
   * Gets statistics about registered plugins.
   * 
   * @returns Count of plugins by category
   */
  getStats(): { nodes: number; handlers: number; strategies: number; connections: number } {
    return {
      nodes: this.nodes.size,
      handlers: this.handlers.size,
      strategies: this.strategies.size,
      connections: this.connections.size
    };
  }
}