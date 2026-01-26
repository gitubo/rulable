/**
 * Default connection plugin - standard link type for workflows.
 * Provides basic connection with configurable styling.
 */
export class DefaultConnection {
    constructor() {
        this.id = '';
        this.type = 'default';
        this.sourceHandlerId = '';
        this.targetHandlerId = '';
        this.pathType = 'bezier';
        this.style = {
            stroke: '#666666',
            strokeWidth: 2
        };
        this.data = {};
        this.label = undefined;
    }
    /**
     * Returns immutable connection data.
     */
    getData() {
        return Object.freeze({
            id: this.id,
            type: this.type,
            sourceHandlerId: this.sourceHandlerId,
            targetHandlerId: this.targetHandlerId,
            pathType: this.pathType,
            label: this.label ? { ...this.label } : undefined,
            style: { ...this.style },
            data: { ...this.data }
        });
    }
}
DefaultConnection.type = 'default';
/**
 * Emphasized connection - for critical paths.
 */
export class EmphasizedConnection {
    constructor() {
        this.id = '';
        this.type = 'emphasized';
        this.sourceHandlerId = '';
        this.targetHandlerId = '';
        this.pathType = 'bezier';
        this.style = {
            stroke: '#0066cc',
            strokeWidth: 3
        };
        this.data = {};
        this.label = undefined;
    }
    getData() {
        return Object.freeze({
            id: this.id,
            type: this.type,
            sourceHandlerId: this.sourceHandlerId,
            targetHandlerId: this.targetHandlerId,
            pathType: this.pathType,
            label: this.label ? { ...this.label } : undefined,
            style: { ...this.style },
            data: { ...this.data }
        });
    }
}
EmphasizedConnection.type = 'emphasized';
//# sourceMappingURL=DefaultConnection.js.map