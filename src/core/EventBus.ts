/**
 * [cite_start]Type-safe Event Bus implementation[cite: 286, 287].
 */
import { EventType, EventPayloadMap, EventCallback, UnsubscribeFn } from './types';

export class EventBus {
  private listeners: Map<EventType, Set<EventCallback<any>>>;

  constructor() {
    this.listeners = new Map();
  }
  
  on<T extends EventType>(
    event: T, 
    callback: EventCallback<T>
  ): UnsubscribeFn {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }
  
  off<T extends EventType>(
    event: T, 
    callback: EventCallback<T>
  ): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }
  
  emit<T extends EventType>(
    event: T, 
    payload: EventPayloadMap[T]
  ): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }
  
  clear(): void {
    this.listeners.clear();
  }
  
  hasListeners(event: EventType): boolean {
    return this.listeners.has(event) && this.listeners.get(event)!.size > 0;
  }
}