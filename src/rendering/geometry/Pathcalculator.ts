/**
 * Main entry point for path calculation logic.
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

export class PathCalculator {
  // Strategy Registry
  private static strategies: Record<ConnectionPathType, PathStrategy> = {
    [ConnectionPathType.BEZIER]: new BezierPathStrategy(),
    [ConnectionPathType.SMOOTH_STEP]: new OrthogonalPathStrategy(),
    [ConnectionPathType.STRAIGHT]: new StraightPathStrategy()
  };

  static calculatePath(
    connection: Connection,
    nodes: Node[],
    handlerPositions: Map<string, Position>
  ): string {
    const endpoints = this.resolveEndpoints(connection, nodes, handlerPositions);
    if (!endpoints) return '';
    
    const strategy = this.strategies[connection.pathType];
    return strategy.calculate(endpoints.source, endpoints.target);
  }

  static calculatePositionAlongPath(
    connection: Connection,
    t: number, // 0.0 to 1.0
    nodes: Node[],
    handlerPositions: Map<string, Position>
  ): Position | null {
    const endpoints = this.resolveEndpoints(connection, nodes, handlerPositions);
    if (!endpoints) return null;
    
    // For MVP, simple linear interpolation is used.
    // In a production environment, this would need to sample the actual SVG path string 
    // (e.g. using SVGSVGElement.createSVGPoint and getPointAtLength) or implement
    // the mathematical Bezier/Orthogonal functions for t.
    const { source, target } = endpoints;
    
    return {
      x: source.position.x + (target.position.x - source.position.x) * t,
      y: source.position.y + (target.position.y - source.position.y) * t
    };
  }

  static findClosestTOnPath(
    connection: Connection,
    targetPoint: Position,
    nodes: Node[],
    handlerPositions: Map<string, Position>,
    precision: number = 0.01
  ): number {
    // Binary/Iterative search for closest t
    let minT = 0;
    let maxT = 1;
    let bestT = 0.5;
    let bestDistance = Infinity;
    
    // 20 iterations gives high enough precision
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
  }

  private static resolveEndpoints(
    connection: Connection,
    nodes: Node[],
    handlerPositions: Map<string, Position>
  ): { source: PathEndpoint; target: PathEndpoint } | null {
    const sourcePos = handlerPositions.get(connection.sourceHandlerId);
    const targetPos = handlerPositions.get(connection.targetHandlerId);
    
    if (!sourcePos || !targetPos) return null;
    
    const sourceHandler = this.findHandler(connection.sourceHandlerId, nodes);
    const targetHandler = this.findHandler(connection.targetHandlerId, nodes);
    
    if (!sourceHandler || !targetHandler) return null;
    
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

  private static findHandler(handlerId: string, nodes: Node[]): Handler | null {
    for (const node of nodes) {
      const handler = node.handlers.find(h => h.id === handlerId);
      if (handler) return handler;
    }
    return null;
  }

  private static calculateHandlerVector(
    handler: Handler,
    handlerPos: Position,
    otherPos: Position
  ): Vector2D {
    if (handler.direction === Direction.OMNI) {
      // Calculate vector pointing toward other endpoint
      const dx = otherPos.x - handlerPos.x;
      const dy = otherPos.y - handlerPos.y;
      return CoordinateTransform.normalize({ x: dx, y: dy });
    }
    return CoordinateTransform.getDirectionVector(handler.direction);
  }
}