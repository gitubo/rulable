/**
 * End node plugin - represents the completion of a workflow.
 * Terminal node with only input handlers.
 */
export class EndNode {
    /**
     * End nodes have input handlers (terminal point).
     */
    hasTargetHandlers() {
        return true;
    }
    /**
     * Icon: Stop/end square.
     */
    getIconPath() {
        return 'M6 6h12v12H6z';
    }
    /**
     * Shape: Rounded rectangle (pill shape).
     */
    getShapeTemplate() {
        return 'M 0,0 L 160,0 L 160,80 L 0,80 Z';
    }
    /**
     * Rounded corners for pill-like appearance.
     */
    getShapeAttributes() {
        return {
            rx: 40,
            ry: 40
        };
    }
}
EndNode.type = 'end';
EndNode.role = 'Core';
//# sourceMappingURL=EndNode.js.map