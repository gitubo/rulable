/**
 * Standard handler plugins - connection points for nodes.
 * Provides input, output, and bidirectional handlers.
 */
/**
 * Input handler - accepts incoming connections.
 */
export class InputHandler {
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
InputHandler.type = 'input';
InputHandler.flow = 'in';
InputHandler.dimensions = { width: 12, height: 12 };
/**
 * Output handler - creates outgoing connections.
 */
export class OutputHandler {
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
OutputHandler.type = 'output';
OutputHandler.flow = 'out';
OutputHandler.dimensions = { width: 12, height: 12 };
/**
 * Bidirectional handler - both input and output.
 */
export class BiHandler {
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
BiHandler.type = 'bi';
BiHandler.flow = 'bi';
BiHandler.dimensions = { width: 12, height: 12 };
/**
 * Any-directional handler - universal connector.
 */
export class AnyHandler {
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
AnyHandler.type = 'any';
AnyHandler.flow = 'any';
AnyHandler.dimensions = { width: 12, height: 12 };
//# sourceMappingURL=StandardHandler.js.map