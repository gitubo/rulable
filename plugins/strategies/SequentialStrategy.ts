/**
 * Sequential traversal strategy - executes workflow in topological order.
 * Implements depth-first traversal with cycle detection.
 */
export class SequentialStrategy {
  static type = 'sequential';
  
  sortNodes(nodes: any[], links: any[]): any[] {
    const sorted: any[] = [];
    const visited = new Set();
    const temp = new Set();
    
    const visit = (node: any): void => {
      if (temp.has(node.id)) {
        throw new Error('Cycle detected in graph - cannot execute sequential strategy');
      }
      
      if (visited.has(node.id)) {
        return;
      }
      
      temp.add(node.id);
      
      const outgoing = links.filter((link: any) => {
        const sourceNode = nodes.find((n: any) => 
          n.handlers.some((h: any) => h.id === link.sourceHandlerId)
        );
        return sourceNode && sourceNode.id === node.id;
      });
      
      outgoing.forEach((link: any) => {
        const targetNode = nodes.find((n: any) => 
          n.handlers.some((h: any) => h.id === link.targetHandlerId)
        );
        if (targetNode) {
          visit(targetNode);
        }
      });
      
      temp.delete(node.id);
      visited.add(node.id);
      sorted.unshift(node);
    };
    
    const startNodes = nodes.filter((node: any) => {
      const hasIncoming = links.some((link: any) => {
        return node.handlers.some((h: any) => h.id === link.targetHandlerId);
      });
      return !hasIncoming;
    });
    
    if (startNodes.length === 0 && nodes.length > 0) {
      console.warn('[SequentialStrategy] No start nodes found, using first node');
      startNodes.push(nodes[0]);
    }
    
    startNodes.forEach((node: any) => visit(node));
    
    nodes.forEach((node: any) => {
      if (!visited.has(node.id)) {
        visit(node);
      }
    });
    
    return sorted;
  }
  
  getVisitors() {
    return {
      'start': this.visitStart.bind(this),
      'end': this.visitEnd.bind(this),
      'task': this.visitTask.bind(this),
      'decision': this.visitDecision.bind(this)
    };
  }
  
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
  
  visitStart(node: any, agg: any, context: any): void {
    agg.executionLog.push({
      timestamp: Date.now(),
      nodeId: node.id,
      type: node.type,
      label: node.label,
      action: 'workflow_started'
    });
    
    console.log(`[SequentialStrategy] Workflow started at node: ${node.label || node.id}`);
  }
  
  visitEnd(node: any, agg: any, context: any): void {
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
  
  visitTask(node: any, agg: any, context: any): void {
    const startTime = Date.now();
    
    try {
      const timeout = node.data.timeout || 5000;
      const retries = node.data.retries || 3;
      const mode = node.data.mode || 'sync';
      
      const executionTime = Math.random() * 1000;
      const success = Math.random() > 0.1;
      
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
      } else {
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
      
    } catch (error: any) {
      agg.errors.push({
        nodeId: node.id,
        message: error.message,
        timestamp: Date.now()
      });
    }
  }
  
  visitDecision(node: any, agg: any, context: any): void {
    try {
      const condition = node.data.condition || '';
      const operator = node.data.operator || 'equals';
      
      const result = Math.random() > 0.5;
      
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
      
    } catch (error: any) {
      agg.errors.push({
        nodeId: node.id,
        message: error.message,
        timestamp: Date.now()
      });
    }
  }
}