/**
 * Decision node plugin - represents conditional branching in workflow.
 * Diamond-shaped node for if/else logic.
 */
export class DecisionNode {
    /**
     * Decision nodes accept incoming connections.
     */
    hasTargetHandlers() {
        return true;
    }
    /**
     * Icon: Diamond/branch symbol.
     */
    getIconPath() {
        return 'M12 2L2 12l10 10 10-10L12 2z';
    }
    /**
     * Shape: Diamond (rhombus).
     * Creates a diamond shape centered at (80, 40).
     */
    getShapeTemplate() {
        return 'M 80,0 L 160,40 L 80,80 L 0,40 Z';
    }
    /**
     * No additional attributes needed for diamond.
     */
    getShapeAttributes() {
        return null;
    }
}
DecisionNode.type = 'decision';
DecisionNode.role = 'Logic';
/**
 * Schema for condition configuration.
 */
DecisionNode.schema = {
    condition: {
        type: 'text',
        label: 'Condition',
        default: ''
    },
    operator: {
        type: 'select',
        label: 'Operator',
        options: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains'],
        default: 'equals'
    }
};
//# sourceMappingURL=DecisionNode.js.map