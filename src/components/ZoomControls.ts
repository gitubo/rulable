/**
 * Zoom and history control widget with real-time button state management.
 */
import { EventBus } from '../core/EventBus';
import { DiagramAPI } from '../core/API';

/**
 * UI widget providing zoom controls and undo/redo buttons.
 * Subscribes to history events to update button states.
 */
export class ZoomControls {
  private container: HTMLElement;
  private api: DiagramAPI;
  private eventBus: EventBus;
  private canUndo: boolean = false;
  private canRedo: boolean = false;
  
  constructor(container: HTMLElement, api: DiagramAPI, eventBus: EventBus) {
    this.container = container;
    this.api = api;
    this.eventBus = eventBus;
    
    this.render();
    this.subscribeToEvents();
  }
  
  private render(): void {
    this.container.innerHTML = `
      <div class="zoom-controls">
        <div class="control-group">
          <button id="btn-undo" class="control-btn" title="Undo (Ctrl+Z)" disabled>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 0 0-7 7h2a5 5 0 0 1 5-5V1zm0 14a7 7 0 0 0 7-7h-2a5 5 0 0 1-5 5v2z"/>
              <path d="M3 8l3-3v2h4v2H6v2l-3-3z"/>
            </svg>
          </button>
          <button id="btn-redo" class="control-btn" title="Redo (Ctrl+Shift+Z)" disabled>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 0 1 7 7h-2a5 5 0 0 0-5-5V1zM8 15a7 7 0 0 1-7-7h2a5 5 0 0 0 5 5v2z"/>
              <path d="M13 8l-3-3v2H6v2h4v2l3-3z"/>
            </svg>
          </button>
        </div>
        <div class="control-divider"></div>
        <div class="control-group">
          <button id="btn-zoom-in" class="control-btn" title="Zoom In (+)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
          </button>
          <button id="btn-zoom-out" class="control-btn" title="Zoom Out (-)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 8h12" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
          </button>
          <button id="btn-zoom-reset" class="control-btn" title="Reset Zoom (1:1)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="10" font-weight="bold">1:1</text>
            </svg>
          </button>
          <button id="btn-zoom-fit" class="control-btn" title="Fit to Screen">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M4 4L6 6M12 4L10 6M4 12L6 10M12 12L10 10"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    
    this.attachEventListeners();
  }
  
  private attachEventListeners(): void {
    this.container.querySelector('#btn-undo')?.addEventListener('click', () => {
      if (this.canUndo) this.api.commands.undo();
    });
    
    this.container.querySelector('#btn-redo')?.addEventListener('click', () => {
      if (this.canRedo) this.api.commands.redo();
    });
    
    this.container.querySelector('#btn-zoom-in')?.addEventListener('click', () => {
      this.api.commands.zoomIn();
    });
    
    this.container.querySelector('#btn-zoom-out')?.addEventListener('click', () => {
      this.api.commands.zoomOut();
    });
    
    this.container.querySelector('#btn-zoom-reset')?.addEventListener('click', () => {
      this.api.commands.zoomReset();
    });
    
    this.container.querySelector('#btn-zoom-fit')?.addEventListener('click', () => {
      this.api.commands.zoomFit();
    });
  }
  
  private subscribeToEvents(): void {
    this.eventBus.on('HISTORY_CHANGED', (status) => {
      this.canUndo = status.canUndo;
      this.canRedo = status.canRedo;
      this.updateButtonStates();
    });
  }
  
  private updateButtonStates(): void {
    const undoBtn = this.container.querySelector('#btn-undo') as HTMLButtonElement | null;
    const redoBtn = this.container.querySelector('#btn-redo') as HTMLButtonElement | null;
    
    if (undoBtn) {
      undoBtn.disabled = !this.canUndo;
      undoBtn.style.opacity = this.canUndo ? '1' : '0.3';
    }
    
    if (redoBtn) {
      redoBtn.disabled = !this.canRedo;
      redoBtn.style.opacity = this.canRedo ? '1' : '0.3';
    }
  }
  
  destroy(): void {
    this.container.innerHTML = '';
  }
}