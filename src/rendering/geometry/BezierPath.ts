/**
 * Strategy for cubic Bezier curve connections.
 */
import { PathStrategy, PathEndpoint } from './PathCalculator';
import { Position } from '../../core/types';
import { CoordinateTransform } from '../../utils/CoordinateTransform';
import { Config } from '../../core/Config';

export class BezierPathStrategy implements PathStrategy {
  calculate(source: PathEndpoint, target: PathEndpoint): string {
    const controlPoints = this.calculateControlPoints(source, target);
    return `M ${source.position.x},${source.position.y} C ${controlPoints[0].x},${controlPoints[0].y} ${controlPoints[1].x},${controlPoints[1].y} ${target.position.x},${target.position.y}`;
  }
  
  private calculateControlPoints(
    source: PathEndpoint,
    target: PathEndpoint
  ): [Position, Position] {
    const distance = CoordinateTransform.distance(source.position, target.position);
    
    // Base curvature: 50% of distance
    let curvature = distance * 0.5;
    
    // Enforce minimum clearance
    curvature = Math.max(curvature, Config.CLEARANCE);
    
    // Detect backtracking (vectors pointing toward each other)
    const dotProduct = CoordinateTransform.dotProduct(source.vector, target.vector);
    
    if (dotProduct < -0.5) {
      // Boost curvature for difficult geometry to avoid overlap/kinks
      curvature = Math.max(curvature, distance * 0.75);
    }
    
    // Calculate control points along handler vectors
    const cp1: Position = {
      x: source.position.x + source.vector.x * curvature,
      y: source.position.y + source.vector.y * curvature
    };
    
    const cp2: Position = {
      x: target.position.x + target.vector.x * curvature,
      y: target.position.y + target.vector.y * curvature
    };
    
    return [cp1, cp2];
  }
}