/**
 * Strategy for straight line connections.
 */
import { PathStrategy, PathEndpoint } from './PathCalculator';

export class StraightPathStrategy implements PathStrategy {
  calculate(source: PathEndpoint, target: PathEndpoint): string {
    return `M ${source.position.x},${source.position.y} L ${target.position.x},${target.position.y}`;
  }
}