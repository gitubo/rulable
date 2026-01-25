/**
 * Global configuration constants for the diagram editor.
 */
export const Config = {
  // Sizing (8px module)
  MODULE: 8,
  NODE_MIN_WIDTH: 160,
  NODE_MIN_HEIGHT: 80,
  NODE_PADDING: 16,
  HANDLER_SIZE: 12,
  HANDLER_SPACING: 24,
  
  // Grid
  GRID_SIZE: 20,
  GRID_COLOR: '#e0e0e0',
  GRID_STROKE_WIDTH: 0.5,
  
  // Zoom
  ZOOM_MIN: 0.1,
  ZOOM_MAX: 3.0,
  ZOOM_STEP: 0.1,
  
  // History
  HISTORY_MAX_DEPTH: 50,
  
  // Rendering
  CLEARANCE: 20,  // Connection clearance from nodes
  CORNER_RADIUS: 8,  // Orthogonal path corners
  
  // Colors
  DEFAULT_NODE_FILL: '#ffffff',
  DEFAULT_NODE_STROKE: '#333333',
  DEFAULT_LINK_STROKE: '#666666',
  DEFAULT_LINK_WIDTH: 2,
  SELECTION_COLOR: '#0066cc',
  GHOST_CONNECTION_COLOR: '#999999',
  
  // Text
  DEFAULT_FONT_SIZE: 14,
  DEFAULT_FONT_FAMILY: 'Inter, system-ui, sans-serif'
} as const;