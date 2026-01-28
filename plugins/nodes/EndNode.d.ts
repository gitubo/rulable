/**
 * End node plugin - represents the completion of a workflow.
 * Terminal node with only input handlers.
 */
export declare class EndNode {
    static type: string;
    static role: string;
    /**
     * End nodes have input handlers (terminal point).
     */
    hasTargetHandlers(): boolean;
    /**
     * Icon: Stop/end square.
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
//# sourceMappingURL=EndNode.d.ts.map