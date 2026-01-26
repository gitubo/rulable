/**
 * Standard handler plugins - connection points for nodes.
 * Provides input, output, and bidirectional handlers.
 */

/**
 * Input handler - accepts incoming connections.
 */
export class InputHandler {
  static type = 'input';
  static flow = 'in';
  static dimensions = { width: 12, height: 12 };
  
  /**
   * Shape: Small square.
   */
  getShapeTemplate() {
    return 'M -6,-6 L 6,-6 L 6,6 L -6,6 Z';
  }
  
  /**
   * Slightly rounded corners.
   */
  getShapeAttributes() {
    return {
      rx: 2,
      ry: 2
    };
  }
}

/**
 * Output handler - creates outgoing connections.
 */
export class OutputHandler {
  static type = 'output';
  static flow = 'out';
  static dimensions = { width: 12, height: 12 };
  
  /**
   * Shape: Small square.
   */
  getShapeTemplate() {
    return 'M -6,-6 L 6,-6 L 6,6 L -6,6 Z';
  }
  
  /**
   * Slightly rounded corners.
   */
  getShapeAttributes() {
    return {
      rx: 2,
      ry: 2
    };
  }
}

/**
 * Bidirectional handler - both input and output.
 */
export class BiHandler {
  static type = 'bi';
  static flow = 'bi';
  static dimensions = { width: 12, height: 12 };
  
  /**
   * Shape: Circle to indicate bidirectional.
   */
  getShapeTemplate() {
    return 'M -6,0 A 6,6 0 1,0 6,0 A 6,6 0 1,0 -6,0';
  }
  
  /**
   * No additional attributes for circle.
   */
  getShapeAttributes() {
    return null;
  }
}

/**
 * Any-directional handler - universal connector.
 */
export class AnyHandler {
  static type = 'any';
  static flow = 'any';
  static dimensions = { width: 12, height: 12 };
  
  /**
   * Shape: Diamond to indicate universal.
   */
  getShapeTemplate() {
    return 'M 0,-6 L 6,0 L 0,6 L -6,0 Z';
  }
  
  /**
   * No additional attributes.
   */
  getShapeAttributes() {
    return null;
  }
}