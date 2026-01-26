/**
 * Start node plugin - represents the beginning of a workflow.
 * Entry point node with no input handlers.
 */
export class StartNode {
  static type = 'start';
  static role = 'Core';
  
  /**
   * Start nodes have no input handlers (entry point).
   */
  hasTargetHandlers() {
    return false;
  }
  
  /**
   * Icon: Play/start arrow pointing right.
   */
  getIconPath() {
    return 'M8 5v14l11-7z';
  }
  
  /**
   * Shape: Rounded rectangle (pill shape).
   */
  getShapeTemplate() {
    return 'M 0,0 L 160,0 L 160,80 L 0,80 Z';
  }
  
  /**
   * Rounded corners for pill-like appearance.
   */
  getShapeAttributes() {
    return {
      rx: 40,
      ry: 40
    };
  }
}