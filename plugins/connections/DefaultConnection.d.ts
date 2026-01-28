/**
 * Default connection plugin - standard link type for workflows.
 * Provides basic connection with configurable styling.
 */
export declare class DefaultConnection {
    static type: string;
    constructor();
    /**
     * Returns immutable connection data.
     */
    getData(): Readonly<{
        id: any;
        type: any;
        sourceHandlerId: any;
        targetHandlerId: any;
        pathType: any;
        label: any;
        style: any;
        data: any;
    }>;
}
/**
 * Emphasized connection - for critical paths.
 */
export declare class EmphasizedConnection {
    static type: string;
    constructor();
    getData(): Readonly<{
        id: any;
        type: any;
        sourceHandlerId: any;
        targetHandlerId: any;
        pathType: any;
        label: any;
        style: any;
        data: any;
    }>;
}
//# sourceMappingURL=DefaultConnection.d.ts.map