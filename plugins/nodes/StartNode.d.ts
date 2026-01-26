/**
 * Start node plugin - represents the beginning of a workflow.
 * Entry point node with no input handlers.
 */
export declare class StartNode {
    static type: string;
    static role: string;
    /**
     * Start nodes have no input handlers (entry point).
     */
    hasTargetHandlers(): boolean;
    /**
     * Icon: Play/start arrow pointing right.
     */
    getIconPath(): string;
    /**
     * Shape: Rounded rectangle (pill shape).
     */
    getShapeTemplate(): string;
    /**
     * Rounded corners for pill-like appearance.
     */
    getShapeAttributes(): {
        rx: number;
        ry: number;
    };
}
//# sourceMappingURL=StartNode.d.ts.map