/**
 * Standard handler plugins - connection points for nodes.
 * Provides input, output, and bidirectional handlers.
 */
/**
 * Input handler - accepts incoming connections.
 */
export declare class InputHandler {
    static type: string;
    static flow: string;
    static dimensions: {
        width: number;
        height: number;
    };
    /**
     * Shape: Small square.
     */
    getShapeTemplate(): string;
    /**
     * Slightly rounded corners.
     */
    getShapeAttributes(): {
        rx: number;
        ry: number;
    };
}
/**
 * Output handler - creates outgoing connections.
 */
export declare class OutputHandler {
    static type: string;
    static flow: string;
    static dimensions: {
        width: number;
        height: number;
    };
    /**
     * Shape: Small square.
     */
    getShapeTemplate(): string;
    /**
     * Slightly rounded corners.
     */
    getShapeAttributes(): {
        rx: number;
        ry: number;
    };
}
/**
 * Bidirectional handler - both input and output.
 */
export declare class BiHandler {
    static type: string;
    static flow: string;
    static dimensions: {
        width: number;
        height: number;
    };
    /**
     * Shape: Circle to indicate bidirectional.
     */
    getShapeTemplate(): string;
    /**
     * No additional attributes for circle.
     */
    getShapeAttributes(): null;
}
/**
 * Any-directional handler - universal connector.
 */
export declare class AnyHandler {
    static type: string;
    static flow: string;
    static dimensions: {
        width: number;
        height: number;
    };
    /**
     * Shape: Diamond to indicate universal.
     */
    getShapeTemplate(): string;
    /**
     * No additional attributes.
     */
    getShapeAttributes(): null;
}
//# sourceMappingURL=StandardHandler.d.ts.map