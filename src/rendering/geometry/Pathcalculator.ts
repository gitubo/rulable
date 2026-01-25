/**
 * Main entry point for path calculation logic with comprehensive error handling.
 */
import { Connection } from '../../domain/models/Connection';
import { Node } from '../../domain/models/Node';
import { Handler } from '../../domain/models/Handler';
import { Position, Vector2D, Direction, ConnectionPathType } from '../../core/types';
import { CoordinateTransform } from '../../utils/CoordinateTransform';
import { BezierPathStrategy } from './BezierPath';
import { OrthogonalPathStrategy } from './OrthogonalPath';
import { StraightPathStrategy } from './StraightPath';

export interface PathEndpoint {
  position: Position;
  direction: Direction;
  vector: Vector2D;
}

export interface PathStrategy {
  calculate(source: PathEndpoint, target: PathEndpoint): string;
}

/**
 * Custom error for path calculation failures.
 */
export class PathCalculationError extends Error {
  constructor(message: string, public readonly connectionId: string, public readonly reason: string) {
    super(message);
    this.name = 'PathCalculationError';
  }
}

/**
 * Calculates SVG paths for connections using configurable strategies.
 * Provides robust error handling and fallback behaviors.
 */
export class PathCalculator {
  // Strategy Registry
  private static strategies: Record<ConnectionPathType, PathStrategy> = {
    [ConnectionPathType.BEZIER]: new BezierPathStrategy(),
    [ConnectionPathType.SMOOTH_STEP]: new OrthogonalPathStrategy(),
    [ConnectionPathType.STRAIGHT]: new StraightPathStrategy()
  };

  /**
   * Calculates the SVG path string for a connection.
   * Returns empty string on failure (safe degradation).
   * 
   * @param connection - Connection to calculate path for
   * @param nodes - All nodes in graph (needed to locate handlers)
   * @param handlerPositions - Cached absolute handler positions
   * @returns SVG path string or empty string if calculation fails
   * @throws {PathCalculationError} Only if configured for strict mode
   */
  static calculatePath(
    connection: Connection,
    nodes: Node[],
    handlerPositions: Map<string, Position>
  ): string {
    try {
      const endpoints = this.resolveEndpoints(connection, nodes, handlerPositions);
      
      if (!endpoints) {
        console.warn(
          `[PathCalculator] Cannot resolve endpoints for connection ${connection.id}. ` +
          `Source: ${connection.sourceHandlerId}, Target: ${connection.targetHandlerId}`
        );
        return '';
      }
      
      const strategy = this.strategies[connection.pathType];
      
      if (!strategy) {
        console.error(
          `[PathCalculator] Unknown path type "${connection.pathType}" for connection ${connection.id}. ` +
          `Falling back to STRAIGHT.`
        );
        return this.strategies[ConnectionPathType.STRAIGHT].calculate(endpoints.source, endpoints.target);
      }
      
      const path = strategy.calculate(endpoints.source, endpoints.target);
      
      if (!path || path.length === 0) {
        console.warn(`[PathCalculator] Strategy returned empty path for connection ${connection.id}`);
        // Fallback to straight line
        return `M ${endpoints.source.position.x},${endpoints.source.position.y} L ${endpoints.target.position.x},${endpoints.target.position.y}`;
      }
      
      return path;
      
    } catch (error) {
      console.error(`[PathCalculator] Error calculating path for connection ${connection.id}:`, error);
      return ''; // Safe degradation
    }
  }

  /**
   * Calculates a position along the connection path at parameter t.
   * Uses linear interpolation (MVP). Production would sample actual curve.
   * 
   * @param connection - Connection to calculate position on
   * @param t - Parameter from 0.0 (source) to 1.0 (target)
   * @param nodes - All nodes in graph
   * @param handlerPositions - Cached handler positions
   * @returns Position at parameter t, or null if calculation fails
   */
  static calculatePositionAlongPath(
    connection: Connection,
    t: number,
    nodes: Node[],
    handlerPositions: Map<string, Position>
  ): Position | null {
    // Clamp t to valid range
    const clampedT = Math.max(0, Math.min(1, t));
    
    try {
      const endpoints = this.resolveEndpoints(connection, nodes, handlerPositions);
      if (!endpoints) {
        console.warn(`[PathCalculator] Cannot calculate position along path: endpoints not found for ${connection.id}`);
        return null;
      }
      
      // Linear interpolation (simplified for MVP)
      const { source, target } = endpoints;
      
      return {
        x: source.position.x + (target.position.x - source.position.x) * clampedT,
        y: source.position.y + (target.position.y - source.position.y) * clampedT
      };
      
    } catch (error) {
      console.error(`[PathCalculator] Error calculating position along path for ${connection.id}:`, error);
      return null;
    }
  }

  /**
   * Finds the closest parameter t on the path to a given point.
   * Uses iterative binary search for precision.
   * 
   * @param connection - Connection to search on
   * @param targetPoint - Point to find closest position to
   * @param nodes - All nodes in graph
   * @param handlerPositions - Cached handler positions
   * @param precision - Initial search precision (default: 0.01)
   * @returns Parameter t (0.0 to 1.0) of closest point
   */
  static findClosestTOnPath(
    connection: Connection,
    targetPoint: Position,
    nodes: Node[],
    handlerPositions: Map<string, Position>,
    precision: number = 0.01
  ): number {
    try {
      let minT = 0;
      let maxT = 1;
      let bestT = 0.5;
      let bestDistance = Infinity;
      
      // 20 iterations gives high precision
      for (let i = 0; i < 20; i++) {
        for (let t = minT; t <= maxT; t += precision) {
          const point = this.calculatePositionAlongPath(connection, t, nodes, handlerPositions);
          if (!point) continue;
          
          const distance = CoordinateTransform.distance(point, targetPoint);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestT = t;
          }
        }
        
        // Narrow search range around bestT
        minT = Math.max(0, bestT - precision);
        maxT = Math.min(1, bestT + precision);
        precision /= 2;
      }
      
      return bestT;
      
    } catch (error) {
      console.error(`[PathCalculator] Error finding closest t on path for ${connection.id}:`, error);
      return 0.5; // Return midpoint as safe fallback
    }
  }

  /**
   * Resolves connection endpoints with positions, directions, and vectors.
   * 
   * @param connection - Connection to resolve endpoints for
   * @param nodes - All nodes in graph
   * @param handlerPositions - Cached handler positions
   * @returns Endpoint data or null if handlers not found
   */
  private static resolveEndpoints(
    connection: Connection,
    nodes: Node[],
    handlerPositions: Map<string, Position>
  ): { source: PathEndpoint; target: PathEndpoint } | null {
    const sourcePos = handlerPositions.get(connection.sourceHandlerId);
    const targetPos = handlerPositions.get(connection.targetHandlerId);
    
    if (!sourcePos) {
      console.warn(`[PathCalculator] Source handler position not found: ${connection.sourceHandlerId}`);
      return null;
    }
    
    if (!targetPos) {
      console.warn(`[PathCalculator] Target handler position not found: ${connection.targetHandlerId}`);
      return null;
    }
    
    const sourceHandler = this.findHandler(connection.sourceHandlerId, nodes);
    const targetHandler = this.findHandler(connection.targetHandlerId, nodes);
    
    if (!sourceHandler) {
      console.warn(`[PathCalculator] Source handler not found in nodes: ${connection.sourceHandlerId}`);
      return null;
    }
    
    if (!targetHandler) {
      console.warn(`[PathCalculator] Target handler not found in nodes: ${connection.targetHandlerId}`);
      return null;
    }
    
    return {
      source: {
        position: sourcePos,
        direction: sourceHandler.direction,
        vector: this.calculateHandlerVector(sourceHandler, sourcePos, targetPos)
      },
      target: {
        position: targetPos,
        direction: targetHandler.direction,
        vector: this.calculateHandlerVector(targetHandler, targetPos, sourcePos)
      }
    };
  }

  /**
   * Finds a handler by ID within the node list.
   * 
   * @param handlerId - Handler ID to search for
   * @param nodes - Nodes to search within
   * @returns Handler instance or null if not found
   */
  private static findHandler(handlerId: string, nodes: Node[]): Handler | null {
    for (const node of nodes) {
      const handler = node.handlers.find(h => h.id === handlerId);
      if (handler) return handler;
    }
    return null;
  }

  /**
   * Calculates the directional vector for a handler.
   * For OMNI handlers, calculates vector pointing toward other endpoint.
   * 
   * @param handler - Handler to calculate vector for
   * @param handlerPos - Absolute position of this handler
   * @param otherPos - Absolute position of the other endpoint
   * @returns Normalized direction vector
   */
  private static calculateHandlerVector(
    handler: Handler,
    handlerPos: Position,
    otherPos: Position
  ): Vector2D {
    if (handler.direction === Direction.OMNI) {
      // Calculate vector pointing toward other endpoint
      const dx = otherPos.x - handlerPos.x;
      const dy = otherPos.y - handlerPos.y;
      
      // Avoid division by zero
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) {
        console.warn(`[PathCalculator] Zero-length vector for OMNI handler ${handler.id}, using default RIGHT`);
        return { x: 1, y: 0 };
      }
      
      return CoordinateTransform.normalize({ x: dx, y: dy });
    }
    
    return CoordinateTransform.getDirectionVector(handler.direction);
  }
}