/**
 * Core graph structure types, branded IDs, and value objects.
 */

// Branded Types for Safety
export type NodeId = string & { readonly __brand: 'NodeId' };
export type ConnectionId = string & { readonly __brand: 'ConnectionId' };
export type HandlerId = string & { readonly __brand: 'HandlerId' };
export type NoteId = string & { readonly __brand: 'NoteId' };

// Factory functions for IDs
export function createNodeId(value: string): NodeId { return value as NodeId; }
export function createConnectionId(value: string): ConnectionId { return value as ConnectionId; }
export function createHandlerId(value: string): HandlerId { return value as HandlerId; }
export function createNoteId(value: string): NoteId { return value as NoteId; }

// Enums
export enum NodeRole {
  CORE = 'Core',
  DATA = 'Data',
  TOOLS = 'Tools',
  LOGIC = 'Logic',
  AGENT = 'Agent'
}

export enum FlowType {
  IN = 'in',
  OUT = 'out',
  BI = 'bi',
  ANY = 'any'
}

export enum Direction {
  LEFT = 'left',
  RIGHT = 'right',
  TOP = 'top',
  BOTTOM = 'bottom',
  OMNI = 'omni'
}

export enum ConnectionPathType {
  BEZIER = 'bezier',
  SMOOTH_STEP = 'smooth_step',
  STRAIGHT = 'straight'
}

// Value Objects (Immutable)
export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface Dimensions {
  readonly width: number;
  readonly height: number;
}

export interface Vector2D {
  readonly x: number;
  readonly y: number;
}

export interface Transform {
  readonly k: number; // scale
  readonly x: number; // translate X
  readonly y: number; // translate Y
}

// Styles
export interface NodeStyle {
  readonly fontSize?: number;
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
}

export interface LinkStyle {
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly strokeDasharray?: string;
}

export interface LinkLabel {
  text: string;
  offset: number; // 0.0 to 1.0
  color?: string;
  bgColor?: string;
  fontSize?: number;
}

// Top Level State
export interface GraphState {
  readonly nodes: ReadonlyArray<any>; // Typed as NodeInstance in usage
  readonly links: ReadonlyArray<any>; // Typed as ConnectionInstance in usage
  readonly notes: ReadonlyArray<any>; // Typed as NoteInstance in usage
  readonly transform: Readonly<Transform>;
}