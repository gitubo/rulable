import { Position } from '../core/types';

/**
 * Configuration for the inline editor.
 */
export interface InlineEditorConfig {
  initialValue: string;
  position: Position;
  fontSize: number;
  fontFamily: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}

/**
 * Inline text editor for node labels and notes.
 * Creates a temporary HTML input overlay that matches SVG text styling.
 * 
 * @example
 * ```typescript
 * const editor = new InlineEditor(container);
 * editor.show({
 *   initialValue: 'Task Name',
 *   position: { x: 100, y: 50 },
 *   fontSize: 14,
 *   fontFamily: 'Inter, sans-serif',
 *   onCommit: (value) => updateNodeLabel(value),
 *   onCancel: () => console.log('Edit cancelled')
 * });
 * ```
 */
export class InlineEditor {
  private input: HTMLInputElement | null = null;
  private container: HTMLElement;
  
  /**
   * Creates a new InlineEditor instance.
   * 
   * @param container - Parent element to attach editor to
   */
  constructor(container: HTMLElement) {
    this.container = container;
  }
  
  /**
   * Shows the inline editor at the specified position.
   * Automatically focuses and selects the text.
   * 
   * @param config - Editor configuration
   */
  show(config: InlineEditorConfig): void {
    this.hide(); // Clean up any existing editor
    
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.value = config.initialValue;
    this.input.className = 'inline-editor';
    
    // Style to match SVG text
    Object.assign(this.input.style, {
      position: 'absolute',
      left: `${config.position.x}px`,
      top: `${config.position.y}px`,
      fontSize: `${config.fontSize}px`,
      fontFamily: config.fontFamily,
      border: '2px solid #0066cc',
      borderRadius: '4px',
      padding: '4px 8px',
      outline: 'none',
      background: '#ffffff',
      zIndex: '1000',
      minWidth: '100px'
    });
    
    this.container.appendChild(this.input);
    this.input.focus();
    this.input.select();
    
    // Event handlers
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        config.onCommit(this.input!.value);
        this.hide();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        config.onCancel();
        this.hide();
      }
    });
    
    this.input.addEventListener('blur', () => {
      // Small delay to allow click events to fire first
      setTimeout(() => {
        if (this.input) {
          config.onCommit(this.input.value);
          this.hide();
        }
      }, 100);
    });
  }
  
  /**
   * Hides and removes the inline editor.
   */
  hide(): void {
    if (this.input) {
      this.input.remove();
      this.input = null;
    }
  }
  
  /**
   * Checks if the editor is currently active.
   * 
   * @returns True if editor is shown
   */
  isActive(): boolean {
    return this.input !== null;
  }
}