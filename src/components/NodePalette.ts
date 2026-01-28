/**
 * Node palette showing available node types grouped by role.
 * Supports click-to-create and drag-and-drop.
 */
import { Registry } from '../core/Registry';
import { DiagramAPI } from '../core/API';
import { NodeRole } from '../core/types';

/**
 * Palette widget displaying available node types.
 * Nodes are grouped by role category and support both click and drag interactions.
 * 
 * @example
 * ```typescript
 * const palette = new NodePalette(container, registry, api);
 * palette.refresh(); // Update after plugins load
 * ```
 */
export class NodePalette {
  private container: HTMLElement;
  private registry: Registry;
  private api: DiagramAPI;
  
  /**
   * Creates a new NodePalette instance.
   * 
   * @param container - HTML element to render palette into
   * @param registry - Plugin registry for accessing node definitions
   * @param api - Diagram API for creating nodes
   */
  constructor(container: HTMLElement, registry: Registry, api: DiagramAPI) {
    this.container = container;
    this.registry = registry;
    this.api = api;
    
    this.render();
  }
  
  /**
   * Refreshes the palette display.
   * Should be called after plugins are loaded or unloaded.
   */
  refresh(): void {
    this.render();
  }
  
  /**
   * Renders the complete palette with all registered node types.
   */
  private render(): void {
    const roleGroups = this.groupNodesByRole();
    
    let html = '<div class="node-palette">';
    html += '<div class="palette-header">Node Types</div>';
    
    // Render each role group
    Object.entries(roleGroups).forEach(([role, definitions]) => {
      if (definitions.length === 0) return;
      
      html += `<div class="palette-group">`;
      html += `<div class="palette-group-title">${role}</div>`;
      html += `<div class="palette-nodes">`;
      
      definitions.forEach(def => {
        const ctor = (def as any).constructor;
        const type = ctor.type;
        const iconPath = def.getIconPath();
        
        html += `
          <div 
            class="palette-node" 
            data-node-type="${type}" 
            draggable="true"
            title="${this.formatTypeName(type)}"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" class="palette-node-icon">
              <path d="${iconPath}" fill="currentColor"/>
            </svg>
            <span class="palette-node-label">${this.formatTypeName(type)}</span>
          </div>
        `;
      });
      
      html += `</div></div>`;
    });
    
    if (Object.values(roleGroups).every(defs => defs.length === 0)) {
      html += `
        <div class="palette-empty">
          <p>No node types available</p>
          <p class="palette-empty-hint">Load plugins to add node types</p>
        </div>
      `;
    }
    
    html += '</div>';
    this.container.innerHTML = html;
    
    this.attachEventListeners();
  }
  
  /**
   * Groups node definitions by their role category.
   * 
   * @returns Map of role to node definitions
   */
  private groupNodesByRole(): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    
    // Initialize all role groups
    Object.values(NodeRole).forEach(role => {
        groups[role as string] = this.registry.getNodesByRole(role);
    });
    
    return groups;
  }
  
  /**
   * Formats a node type identifier for display.
   * Converts snake_case to Title Case.
   * 
   * @param type - Node type identifier
   * @returns Formatted display name
   */
  private formatTypeName(type: string): string {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
  
  /**
   * Attaches event listeners for click and drag interactions.
   */
  private attachEventListeners(): void {
    this.container.querySelectorAll('.palette-node').forEach(el => {
      // Drag start - store node type
      el.addEventListener('dragstart', (e: Event) => {
        const dragEvent = e as DragEvent;
        const nodeType = (e.currentTarget as HTMLElement).getAttribute('data-node-type');
        if (nodeType && dragEvent.dataTransfer) {
          dragEvent.dataTransfer.setData('application/node-type', nodeType);
          dragEvent.dataTransfer.effectAllowed = 'copy';
          
          (e.currentTarget as HTMLElement).classList.add('dragging');
        }
      });
      
      el.addEventListener('dragend', (e: Event) => {
        (e.currentTarget as HTMLElement).classList.remove('dragging');
      });
      
      // Click - create node at center of viewport
      el.addEventListener('click', (e: Event) => {
        const nodeType = (e.currentTarget as HTMLElement).getAttribute('data-node-type');
        if (!nodeType) return;
        
        // Create at center (400, 300) - will be adjusted by viewport transform
        this.api.commands.createNode({
          type: nodeType,
          x: 400,
          y: 300
        });
        
        console.log(`[NodePalette] Created node via click: ${nodeType}`);
      });
    });
  }
  
  /**
   * Cleans up the palette.
   */
  destroy(): void {
    this.container.innerHTML = '';
  }
}