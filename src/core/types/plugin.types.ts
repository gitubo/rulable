/**
 * Plugin system interfaces and contract definitions.
 */

import { NodeRole, FlowType, Dimensions, NodeStyle, ConnectionPathType, ConnectionData, NodeInstance, ConnectionInstance } from './index';

export interface PluginDefinition<T = unknown> {
  readonly type: string;
  readonly role?: string;
}

export interface PropertySchema {
  [key: string]: PropertyFieldDefinition;
}

export interface PropertyFieldDefinition {
  type: 'text' | 'number' | 'boolean' | 'select';
  label: string;
  default?: unknown;
  options?: string[];
}

export interface NodePluginDefinition extends PluginDefinition {
  readonly role: NodeRole;
  hasTargetHandlers(): boolean;
  getIconPath(): string;
  getShapeTemplate(): string;
  getShapeAttributes?(): Record<string, unknown> | null;
  schema?: PropertySchema;
  
  // Static factory for deserialization usually lives on the class,
  // but defined here for interface compliance
}

export interface HandlerPluginDefinition extends PluginDefinition {
  readonly flow: FlowType;
  readonly dimensions: Dimensions;
  getShapeTemplate(): string;
  getShapeAttributes?(): Record<string, unknown> | null;
}

export interface StrategyPluginDefinition extends PluginDefinition {
  sortNodes(nodes: NodeInstance[], links: ConnectionInstance[]): NodeInstance[];
  getVisitors(): VisitorMap;
  getInitialAggregator(): unknown;
}

export interface ConnectionPluginDefinition extends PluginDefinition {
  getData(): ConnectionData;
}

export type VisitorMap = Record<string, VisitorFunction>;
export type VisitorFunction = (node: NodeInstance, agg: any, context: TraverseContext) => void;

export interface TraverseContext {
  nodes: ReadonlyArray<NodeInstance>;
  links: ReadonlyArray<ConnectionInstance>;
}