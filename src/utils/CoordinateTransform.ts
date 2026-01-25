/**
 * Utilities for converting between screen and graph coordinates and vector math.
 */
import { Position, Transform, Vector2D, Direction } from '../core/types';
import { Config } from '../core/Config';

export class CoordinateTransform {
  /**
   * Convert screen coordinates (DOM) to graph coordinates (Canvas)
   */
  static screenToGraph(
    screenX: number,
    screenY: number,
    transform: Transform
  ): Position {
    return {
      x: (screenX - transform.x) / transform.k,
      y: (screenY - transform.y) / transform.k
    };
  }
  
  /**
   * Convert graph coordinates (Canvas) to screen coordinates (DOM)
   */
  static graphToScreen(
    graphX: number,
    graphY: number,
    transform: Transform
  ): Position {
    return {
      x: graphX * transform.k + transform.x,
      y: graphY * transform.k + transform.y
    };
  }
  
  /**
   * Snap position to grid
   */
  static snapToGrid(position: Position, gridSize: number = Config.GRID_SIZE): Position {
    return {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize
    };
  }
  
  /**
   * Calculate Euclidian distance between two points
   */
  static distance(p1: Position, p2: Position): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Calculate midpoint between two positions
   */
  static midpoint(p1: Position, p2: Position): Position {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    };
  }
  
  /**
   * Normalize a vector to length 1
   */
  static normalize(vector: Vector2D): Vector2D {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (length === 0) return { x: 0, y: 0 };
    return {
      x: vector.x / length,
      y: vector.y / length
    };
  }
  
  /**
   * Calculate dot product of two vectors
   */
  static dotProduct(v1: Vector2D, v2: Vector2D): number {
    return v1.x * v2.x + v1.y * v2.y;
  }
  
  /**
   * Get unit vector from Direction enum
   */
  static getDirectionVector(direction: Direction): Vector2D {
    switch (direction) {
      case Direction.LEFT:
        return { x: -1, y: 0 };
      case Direction.RIGHT:
        return { x: 1, y: 0 };
      case Direction.TOP:
        return { x: 0, y: -1 };
      case Direction.BOTTOM:
        return { x: 0, y: 1 };
      case Direction.OMNI:
        return { x: 0, y: 0 };
      default:
        return { x: 0, y: 0 };
    }
  }
}