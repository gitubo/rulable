/**
 * Sequential traversal strategy - executes workflow in topological order.
 * Implements depth-first traversal with cycle detection.
 */
export declare class SequentialStrategy {
    static type: string;
    /**
     * Sorts nodes in topological order (dependencies first).
     * Uses depth-first search with cycle detection.
     *
     * @param nodes - All nodes in graph
     * @param links - All connections in graph
     * @returns Sorted node array
     * @throws Error if cycle is detected
     */
    sortNodes(nodes: any, links: any): any[];
    /**
     * Returns visitor functions for each node type.
     * Visitors process nodes and accumulate results.
     */
    getVisitors(): {
        start: (node: any, agg: any, context: any) => void;
        end: (node: any, agg: any, context: any) => void;
        task: (node: any, agg: any, context: any) => void;
        decision: (node: any, agg: any, context: any) => void;
    };
    /**
     * Returns initial aggregator state.
     * Accumulates execution log and results.
     */
    getInitialAggregator(): {
        executionLog: never[];
        errors: never[];
        results: {};
        startTime: number;
        metadata: {
            strategy: string;
            version: string;
        };
    };
    /**
     * Visits a start node.
     */
    visitStart(node: any, agg: any, context: any): void;
    /**
     * Visits an end node.
     */
    visitEnd(node: any, agg: any, context: any): void;
    /**
     * Visits a task node - simulates task execution.
     */
    visitTask(node: any, agg: any, context: any): void;
    /**
     * Visits a decision node - evaluates condition.
     */
    visitDecision(node: any, agg: any, context: any): void;
}
//# sourceMappingURL=SequentialStrategy.d.ts.map