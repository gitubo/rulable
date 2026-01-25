/**
 * Strategy for orthogonal (Manhattan) routing with rounded corners.
 */
import { PathStrategy, PathEndpoint } from './PathCalculator';
import { Position, Direction } from '../../core/types';
import { Config } from '../../core/Config';

export class OrthogonalPathStrategy implements PathStrategy {
  calculate(source: PathEndpoint, target: PathEndpoint): string {
    const points = this.buildOrthogonalPoints(source, target);
    const optimized = this.filterColinearPoints(points);
    return this.applyRoundedCorners(optimized, Config.CORNER_RADIUS);
  }
  
  private buildOrthogonalPoints(
    source: PathEndpoint,
    target: PathEndpoint
  ): Position[] {
    const points: Position[] = [source.position];
    
    // Determine routing based on handler directions
    const sourceAxis = this.getAxis(source.direction);
    const targetAxis = this.getAxis(target.direction);
    
    if (sourceAxis === 'horizontal' && targetAxis === 'horizontal') {
      this.routeHorizontalHorizontal(source, target, points);
    } else if (sourceAxis === 'vertical' && targetAxis === 'vertical') {
      this.routeVerticalVertical(source, target, points);
    } else if (sourceAxis === 'horizontal' && targetAxis === 'vertical') {
      this.routeHorizontalVertical(source, target, points);
    } else {
      this.routeVerticalHorizontal(source, target, points);
    }
    
    points.push(target.position);
    return points;
  }
  
  private getAxis(direction: Direction): 'horizontal' | 'vertical' {
    return (direction === Direction.LEFT || direction === Direction.RIGHT) ? 'horizontal' : 'vertical';
  }
  
  private routeHorizontalHorizontal(
    source: PathEndpoint,
    target: PathEndpoint,
    points: Position[]
  ): void {
    const midX = (source.position.x + target.position.x) / 2;
    points.push({ x: midX, y: source.position.y });
    points.push({ x: midX, y: target.position.y });
  }
  
  private routeVerticalVertical(
    source: PathEndpoint,
    target: PathEndpoint,
    points: Position[]
  ): void {
    const midY = (source.position.y + target.position.y) / 2;
    points.push({ x: source.position.x, y: midY });
    points.push({ x: target.position.x, y: midY });
  }
  
  private routeHorizontalVertical(
    source: PathEndpoint,
    target: PathEndpoint,
    points: Position[]
  ): void {
    // Exit horizontally, arrive vertically
    // Use clearance to ensure we leave the source node cleanly
    const escapeX = source.position.x + source.vector.x * Config.CLEARANCE;
    points.push({ x: escapeX, y: source.position.y });
    points.push({ x: escapeX, y: target.position.y });
  }
  
  private routeVerticalHorizontal(
    source: PathEndpoint,
    target: PathEndpoint,
    points: Position[]
  ): void {
    // Exit vertically, arrive horizontally
    const escapeY = source.position.y + source.vector.y * Config.CLEARANCE;
    points.push({ x: source.position.x, y: escapeY });
    points.push({ x: target.position.x, y: escapeY });
  }
  
  private filterColinearPoints(points: Position[]): Position[] {
    if (points.length < 3) return points;
    const filtered: Position[] = [points[0]];
    
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      
      // Check if current point is colinear with prev and next
      const isColinear = 
        (Math.abs(prev.x - curr.x) < 0.1 && Math.abs(curr.x - next.x) < 0.1) ||
        (Math.abs(prev.y - curr.y) < 0.1 && Math.abs(curr.y - next.y) < 0.1);
      
      if (!isColinear) {
        filtered.push(curr);
      }
    }
    
    filtered.push(points[points.length - 1]);
    return filtered;
  }
  
  private applyRoundedCorners(points: Position[], radius: number): string {
    if (points.length < 2) return '';
    let path = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      
      // Calculate approach and exit vectors
      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      
      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      
      // Limit radius to half the length of the shortest segment
      const actualRadius = Math.min(radius, len1 / 2, len2 / 2);
      
      if (actualRadius < 1) {
          // Segment too short for corner, just line to it
          path += ` L ${curr.x},${curr.y}`;
          continue;
      }

      const approachX = curr.x - (dx1 / len1) * actualRadius;
      const approachY = curr.y - (dy1 / len1) * actualRadius;
      
      const exitX = curr.x + (dx2 / len2) * actualRadius;
      const exitY = curr.y + (dy2 / len2) * actualRadius;
      
      path += ` L ${approachX},${approachY} Q ${curr.x},${curr.y} ${exitX},${exitY}`;
    }
    
    path += ` L ${points[points.length - 1].x},${points[points.length - 1].y}`;
    return path;
  }
}