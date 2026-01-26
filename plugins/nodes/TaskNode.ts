/**
 * Task node plugin - represents a work unit in the workflow.
 * Configurable node with input/output handlers and execution properties.
 */
export class TaskNode {
  static type = 'task';
  static role = 'Tools';
  
  /**
   * Schema defines configurable properties for tasks.
   */
  static schema = {
    timeout: {
      type: 'number',
      label: 'Timeout (ms)',
      default: 5000
    },
    retries: {
      type: 'number',
      label: 'Retry Count',
      default: 3
    },
    mode: {
      type: 'select',
      label: 'Execution Mode',
      options: ['sync', 'async'],
      default: 'sync'
    },
    description: {
      type: 'text',
      label: 'Description',
      default: ''
    }
  };
  
  /**
   * Task nodes accept incoming connections.
   */
  hasTargetHandlers() {
    return true;
  }
  
  /**
   * Icon: Checkbox/task list.
   */
  getIconPath() {
    return 'M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z';
  }
  
  /**
   * Shape: Standard rectangle.
   */
  getShapeTemplate() {
    return 'M 0,0 L 160,0 L 160,80 L 0,80 Z';
  }
  
  /**
   * Slightly rounded corners.
   */
  getShapeAttributes() {
    return {
      rx: 8,
      ry: 8
    };
  }
}