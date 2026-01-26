/**
 * Sequential traversal strategy - executes workflow in topological order.
 * Implements depth-first traversal with cycle detection.
 */
export class SequentialStrategy {
    /**
     * Sorts nodes in topological order (dependencies first).
     * Uses depth-first search with cycle detection.
     *
     * @param nodes - All nodes in graph
     * @param links - All connections in graph
     * @returns Sorted node array
     * @throws Error if cycle is detected
     */
    sortNodes(nodes, links) {
        const sorted = [];
        const visited = new Set();
        const temp = new Set();
        /**
         * Recursive DFS visit function.
         */
        const visit = (node) => {
            if (temp.has(node.id)) {
                throw new Error('Cycle detected in graph - cannot execute sequential strategy');
            }
            if (visited.has(node.id)) {
                return;
            }
            temp.add(node.id);
            // Find all outgoing connections from this node
            const outgoing = links.filter(link => {
                const sourceNode = nodes.find(n => n.handlers.some(h => h.id === link.sourceHandlerId));
                return sourceNode && sourceNode.id === node.id;
            });
            // Visit all target nodes (dependencies)
            outgoing.forEach(link => {
                const targetNode = nodes.find(n => n.handlers.some(h => h.id === link.targetHandlerId));
                if (targetNode) {
                    visit(targetNode);
                }
            });
            temp.delete(node.id);
            visited.add(node.id);
            sorted.unshift(node); // Add to front (reverse topological order)
        };
        // Find start nodes (nodes with no incoming connections)
        const startNodes = nodes.filter(node => {
            const hasIncoming = links.some(link => {
                return node.handlers.some(h => h.id === link.targetHandlerId);
            });
            return !hasIncoming;
        });
        // If no start nodes found, start with first node
        if (startNodes.length === 0 && nodes.length > 0) {
            console.warn('[SequentialStrategy] No start nodes found, using first node');
            startNodes.push(nodes[0]);
        }
        // Visit all start nodes
        startNodes.forEach(node => visit(node));
        // Visit any remaining unvisited nodes (disconnected components)
        nodes.forEach(node => {
            if (!visited.has(node.id)) {
                visit(node);
            }
        });
        return sorted;
    }
    /**
     * Returns visitor functions for each node type.
     * Visitors process nodes and accumulate results.
     */
    getVisitors() {
        return {
            'start': this.visitStart.bind(this),
            'end': this.visitEnd.bind(this),
            'task': this.visitTask.bind(this),
            'decision': this.visitDecision.bind(this)
        };
    }
    /**
     * Returns initial aggregator state.
     * Accumulates execution log and results.
     */
    getInitialAggregator() {
        return {
            executionLog: [],
            errors: [],
            results: {},
            startTime: Date.now(),
            metadata: {
                strategy: 'sequential',
                version: '1.0.0'
            }
        };
    }
    /**
     * Visits a start node.
     */
    visitStart(node, agg, context) {
        agg.executionLog.push({
            timestamp: Date.now(),
            nodeId: node.id,
            type: node.type,
            label: node.label,
            action: 'workflow_started'
        });
        console.log(`[SequentialStrategy] Workflow started at node: ${node.label || node.id}`);
    }
    /**
     * Visits an end node.
     */
    visitEnd(node, agg, context) {
        const duration = Date.now() - agg.startTime;
        agg.executionLog.push({
            timestamp: Date.now(),
            nodeId: node.id,
            type: node.type,
            label: node.label,
            action: 'workflow_completed',
            duration: duration
        });
        agg.results.totalDuration = duration;
        agg.results.status = agg.errors.length > 0 ? 'completed_with_errors' : 'success';
        console.log(`[SequentialStrategy] Workflow completed in ${duration}ms`);
    }
    /**
     * Visits a task node - simulates task execution.
     */
    visitTask(node, agg, context) {
        const startTime = Date.now();
        try {
            // Extract configuration from node data
            const timeout = node.data.timeout || 5000;
            const retries = node.data.retries || 3;
            const mode = node.data.mode || 'sync';
            // Simulate task execution
            const executionTime = Math.random() * 1000; // Random 0-1000ms
            const success = Math.random() > 0.1; // 90% success rate
            agg.executionLog.push({
                timestamp: Date.now(),
                nodeId: node.id,
                type: node.type,
                label: node.label,
                action: 'task_executed',
                config: {
                    timeout,
                    retries,
                    mode
                },
                result: success ? 'success' : 'failed',
                executionTime: executionTime
            });
            if (success) {
                agg.results[node.id] = {
                    status: 'success',
                    duration: executionTime,
                    output: `Task "${node.label || node.id}" completed successfully`
                };
            }
            else {
                agg.errors.push({
                    nodeId: node.id,
                    message: `Task "${node.label || node.id}" failed`,
                    timestamp: Date.now()
                });
                agg.results[node.id] = {
                    status: 'failed',
                    duration: executionTime,
                    error: 'Simulated task failure'
                };
            }
            console.log(`[SequentialStrategy] Task executed: ${node.label || node.id} (${success ? 'success' : 'failed'})`);
        }
        catch (error) {
            agg.errors.push({
                nodeId: node.id,
                message: error.message,
                timestamp: Date.now()
            });
        }
    }
    /**
     * Visits a decision node - evaluates condition.
     */
    visitDecision(node, agg, context) {
        try {
            const condition = node.data.condition || '';
            const operator = node.data.operator || 'equals';
            // Simulate condition evaluation
            const result = Math.random() > 0.5; // Random true/false
            agg.executionLog.push({
                timestamp: Date.now(),
                nodeId: node.id,
                type: node.type,
                label: node.label,
                action: 'condition_evaluated',
                condition: condition,
                operator: operator,
                result: result ? 'true' : 'false'
            });
            agg.results[node.id] = {
                status: 'evaluated',
                condition: condition,
                result: result,
                branch: result ? 'true_branch' : 'false_branch'
            };
            console.log(`[SequentialStrategy] Decision evaluated: ${node.label || node.id} -> ${result}`);
        }
        catch (error) {
            agg.errors.push({
                nodeId: node.id,
                message: error.message,
                timestamp: Date.now()
            });
        }
    }
}
SequentialStrategy.type = 'sequential';
//# sourceMappingURL=SequentialStrategy.js.map