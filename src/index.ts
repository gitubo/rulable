/**
 * Main entry point for the Diagram Editor Widget.
 * Exports public API and type definitions.
 */

// Main widget class
export { DAGWidget } from './core/Widget';

// Type exports for external consumers
export type {
  WidgetConfig,
  WidgetAPI,
  WidgetCommands,
  WidgetQueries,
  CreateNodePayload,
  UpdateNodePayload,
  SpawnConnectedPayload,
  UpdateLinkPayload,
  TraversePayload,
  NodeMetadata,
  NodeData,
  HandlerData,
  ConnectionData,
  SerializedState,
  EventType,
  EventCallback,
  UnsubscribeFn
} from './core/types';

// Enum exports
export { 
  NodeRole, 
  FlowType, 
  Direction, 
  ConnectionPathType 
} from './core/types';

// Plugin interface exports for extension
export type {
  NodePluginDefinition,
  HandlerPluginDefinition,
  StrategyPluginDefinition,
  ConnectionPluginDefinition,
  PropertySchema,
  PropertyFieldDefinition
} from './core/types';

// Version info
export const VERSION = '1.0.0';