/**
 * Validation logic for plugin interfaces to ensure type safety at runtime.
 */
import { 
  NodePluginDefinition, 
  HandlerPluginDefinition, 
  StrategyPluginDefinition,
  NodeRole,
  FlowType
} from '../types';

export type PluginCategory = 'node' | 'handler' | 'strategy' | 'connection';

export interface ValidationResult {
  valid: boolean;
  error?: PluginValidationError;
}

export interface PluginValidationError {
  plugin: string;
  category: PluginCategory;
  missing: string[];
}

export class PluginValidator {
  validate<T>(
    definition: T,
    category: PluginCategory
  ): ValidationResult {
    const requiredMembers = this.getRequiredMembers(category);
    const missing: string[] = [];
    
    // Check for static 'type' property (accessed via constructor)
    const ctor = (definition as any).constructor;
    if (!ctor.type || typeof ctor.type !== 'string') {
      missing.push('static type');
    }
    
    // Check for required instance/static methods
    for (const member of requiredMembers) {
      const hasInstanceMethod = typeof (definition as any)[member] === 'function';
      const hasStaticMethod = typeof ctor[member] === 'function';
      
      if (!hasInstanceMethod && !hasStaticMethod) {
        missing.push(member);
      }
    }
    
    // Category-specific validation
    if (category === 'node') {
      this.validateNodePlugin(definition as unknown as NodePluginDefinition, missing);
    } else if (category === 'handler') {
      this.validateHandlerPlugin(definition as unknown as HandlerPluginDefinition, missing);
    } else if (category === 'strategy') {
      this.validateStrategyPlugin(definition as unknown as StrategyPluginDefinition, missing);
    }
    
    if (missing.length > 0) {
      return {
        valid: false,
        error: {
          plugin: ctor.name,
          category,
          missing
        }
      };
    }
    
    return { valid: true };
  }
  
  private getRequiredMembers(category: PluginCategory): string[] {
    const interfaces: Record<PluginCategory, string[]> = {
      node: [
        'getShapeTemplate',
        'getIconPath',
        'hasTargetHandlers'
      ],
      handler: [
        'getShapeTemplate'
      ],
      strategy: [
        'sortNodes',
        'getVisitors',
        'getInitialAggregator'
      ],
      connection: [
        'getData'
      ]
    };
    return interfaces[category] || [];
  }
  
  private validateNodePlugin(definition: NodePluginDefinition, missing: string[]): void {
    const ctor = (definition as any).constructor;
    if (!ctor.role || !Object.values(NodeRole).includes(ctor.role)) {
      missing.push('static role (valid NodeRole)');
    }
  }
  
  private validateHandlerPlugin(definition: HandlerPluginDefinition, missing: string[]): void {
    const ctor = (definition as any).constructor;
    if (!ctor.flow || !Object.values(FlowType).includes(ctor.flow)) {
      missing.push('static flow (valid FlowType)');
    }
    
    if (!ctor.dimensions || typeof ctor.dimensions.width !== 'number' || typeof ctor.dimensions.height !== 'number') {
      missing.push('static dimensions { width: number, height: number }');
    }
  }
  
  private validateStrategyPlugin(definition: StrategyPluginDefinition, missing: string[]): void {
    // Strategy-specific validation if needed in future
  }
}