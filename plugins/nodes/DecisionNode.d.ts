/**
 * Decision node plugin - represents conditional branching in workflow.
 * Diamond-shaped node for if/else logic.
 */
export declare class DecisionNode {
    static type: string;
    static role: string;
    /**
     * Schema for condition configuration.
     */
    static schema: {
        condition: {
            type: string;
            label: string;
            default: string;
        };
        operator: {
            type: string;
            label: string;
            options: string[];
            default: string;
        };
    };
    /**
     * Decision nodes accept incoming connections.
     */
    hasTargetHandlers(): boolean;
    /**
     * Icon: Diamond/branch symbol.
     */
    getIconPath(): string;
    /**
     * Shape: Diamond (rhombus).
     * Creates a diamond shape centered at (80, 40).
     */
    getShapeTemplate(): string;
    /**
     * No additional attributes needed for diamond.
     */
    getShapeAttributes(): null;
}
//# sourceMappingURL=DecisionNode.d.ts.map