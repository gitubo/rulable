/**
 * Task node plugin - represents a work unit in the workflow.
 * Configurable node with input/output handlers and execution properties.
 */
export declare class TaskNode {
    static type: string;
    static role: string;
    /**
     * Schema defines configurable properties for tasks.
     */
    static schema: {
        timeout: {
            type: string;
            label: string;
            default: number;
        };
        retries: {
            type: string;
            label: string;
            default: number;
        };
        mode: {
            type: string;
            label: string;
            options: string[];
            default: string;
        };
        description: {
            type: string;
            label: string;
            default: string;
        };
    };
    /**
     * Task nodes accept incoming connections.
     */
    hasTargetHandlers(): boolean;
    /**
     * Icon: Checkbox/task list.
     */
    getIconPath(): string;
    /**
     * Shape: Standard rectangle.
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
//# sourceMappingURL=TaskNode.d.ts.map