/**
 * Context menu component for right-click interactions.
 * Provides contextual actions based on clicked element.
 */
import { DiagramAPI } from '../core/API';
import { Position } from '../core/types';

/**
 * Menu item definition.
 */
interface MenuItem {
  label: string;
  icon?: string;
  action: () => void;
  divider?: boolean;
  disabled?: boolean;
}

/**
 * Context menu types based on clicked element.
 */
type MenuType = 'node' | 'link' | 'handler' | 'canvas';

/**
 * Context menu widget providing right-click actions.
 * Automatically positions itself and closes on click-away.
 * 
 * @example
 * ```typescript
 * const menu = new ContextMenu(container, api);
 * menu.show('node', { x: 100, y: 100 }, nodeId);
 * ```
 */
export class ContextMenu {
  private container: HTMLElement;
  private api: DiagramAPI;
  private menuElement: HTMLElement | null = null;
  private currentTarget: string | null = null;
  
  /**
   * Creates a new ContextMenu instance.
   * 
   * @param container - Parent container for menu
   * @param api - Diagram API for executing actions
   */
  constructor(container: HTMLElement, api: DiagramAPI) {
    this.container = container;
    this.api = api;
    
    // Attach global click listener for click-away detection
    document.addEventListener('click', (e) => {
      if (this.menuElement && !this.menuElement.contains(e.target as Node)) {
        this.hide();
      }
    });
  }
  
  /**
   * Shows the context menu at specified position.
   * 
   * @param type - Type of context (determines menu items)
   * @param position - Screen coordinates to show menu at
   * @param targetId - ID of clicked element (node/link)
   */
  show(type: MenuType, position: Position, targetId?: string): void {
    this.hide(); // Close any existing menu
    
    this.currentTarget = targetId || null;
    const items = this.getMenuItems(type, targetId);
    
    if (items.length === 0) return;
    
    this.menuElement = document.createElement('div');
    this.menuElement.className = 'context-menu';
    
    // Render menu items
    items.forEach(item => {
      if (item.divider) {
        const divider = document.createElement('div');
        divider.className = 'menu-divider';
        this.menuElement!.appendChild(divider);
        return;
      }
      
      const menuItem = document.createElement('div');
      menuItem.className = `menu-item ${item.disabled ? 'disabled' : ''}`;
      
      if (item.icon) {
        menuItem.innerHTML = `
          <span class="menu-icon">${item.icon}</span>
          <span class="menu-label">${item.label}</span>
        `;
      } else {
        menuItem.innerHTML = `<span class="menu-label">${item.label}</span>`;
      }
      
      if (!item.disabled) {
        menuItem.addEventListener('click', (e) => {
          e.stopPropagation();
          item.action();
          this.hide();
        });
      }
      
      this.menuElement!.appendChild(menuItem);
    });
    
    // Position menu
    this.menuElement.style.left = `${position.x}px`;
    this.menuElement.style.top = `${position.y}px`;
    
    this.container.appendChild(this.menuElement);
    
    // Adjust position if menu goes off-screen
    this.adjustPosition();
  }
  
  /**
   * Hides and removes the context menu.
   */
  hide(): void {
    if (this.menuElement) {
      this.menuElement.remove();
      this.menuElement = null;
      this.currentTarget = null;
    }
  }
  
  /**
   * Gets menu items based on context type.
   * 
   * @param type - Context type
   * @param targetId - Target element ID
   * @returns Array of menu items
   */
  private getMenuItems(type: MenuType, targetId?: string): MenuItem[] {
    switch (type) {
      case 'node':
        return this.getNodeMenuItems(targetId!);
      
      case 'link':
        return this.getLinkMenuItems(targetId!);
      
      case 'handler':
        return this.getHandlerMenuItems(targetId!);
      
      case 'canvas':
        return this.getCanvasMenuItems();
      
      default:
        return [];
    }
  }
  
  /**
   * Gets menu items for node context.
   */
  private getNodeMenuItems(nodeId: string): MenuItem[] {
    return [
      {
        label: 'Edit Label',
        icon: '✏️',
        action: () => {
          console.log('[ContextMenu] Edit label:', nodeId);
          // Trigger inline editor
        }
      },
      {
        label: 'Duplicate',
        icon: '📋',
        action: () => {
          console.log('[ContextMenu] Duplicate node:', nodeId);
          // TODO: Implement node duplication
        }
      },
      { label: '', divider: true, action: () => {} },
      {
        label: 'Copy',
        icon: '📄',
        action: () => {
          console.log('[ContextMenu] Copy node:', nodeId);
          // TODO: Implement clipboard
        }
      },
      {
        label: 'Cut',
        icon: '✂️',
        action: () => {
          console.log('[ContextMenu] Cut node:', nodeId);
          // TODO: Implement clipboard
        }
      },
      { label: '', divider: true, action: () => {} },
      {
        label: 'Delete',
        icon: '🗑️',
        action: () => {
          if (confirm('Delete this node?')) {
            this.api.commands.deleteNode(nodeId as any);
          }
        }
      }
    ];
  }
  
  /**
   * Gets menu items for connection context.
   */
  private getLinkMenuItems(linkId: string): MenuItem[] {
    return [
      {
        label: 'Edit Label',
        icon: '✏️',
        action: () => {
          console.log('[ContextMenu] Edit link label:', linkId);
        }
      },
      {
        label: 'Change Path Type',
        icon: '〰️',
        action: () => {
          console.log('[ContextMenu] Change path type:', linkId);
        }
      },
      { label: '', divider: true, action: () => {} },
      {
        label: 'Delete',
        icon: '🗑️',
        action: () => {
          if (confirm('Delete this connection?')) {
            this.api.commands.deleteLink(linkId as any);
          }
        }
      }
    ];
  }
  
  /**
   * Gets menu items for handler context.
   */
  private getHandlerMenuItems(handlerId: string): MenuItem[] {
    return [
      {
        label: 'Create Connection',
        icon: '🔗',
        action: () => {
          console.log('[ContextMenu] Create connection from:', handlerId);
          // TODO: Start connection creation
        }
      }
    ];
  }
  
  /**
   * Gets menu items for canvas context.
   */
  private getCanvasMenuItems(): MenuItem[] {
    return [
      {
        label: 'Add Note',
        icon: '📝',
        action: () => {
          console.log('[ContextMenu] Add note');
          // TODO: Create note at position
        }
      },
      { label: '', divider: true, action: () => {} },
      {
        label: 'Select All',
        icon: '☑️',
        action: () => {
          console.log('[ContextMenu] Select all');
          // TODO: Implement multi-select
        }
      },
      {
        label: 'Deselect All',
        icon: '☐',
        action: () => {
          this.api.commands.deselectAll();
        }
      },
      { label: '', divider: true, action: () => {} },
      {
        label: 'Zoom to Fit',
        icon: '🔍',
        action: () => {
          this.api.commands.zoomFit();
        }
      },
      {
        label: 'Reset Zoom',
        icon: '↺',
        action: () => {
          this.api.commands.zoomReset();
        }
      }
    ];
  }
  
  /**
   * Adjusts menu position to keep it on screen.
   */
  private adjustPosition(): void {
    if (!this.menuElement) return;
    
    const rect = this.menuElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Adjust horizontal position
    if (rect.right > viewportWidth) {
      const left = Math.max(0, viewportWidth - rect.width - 10);
      this.menuElement.style.left = `${left}px`;
    }
    
    // Adjust vertical position
    if (rect.bottom > viewportHeight) {
      const top = Math.max(0, viewportHeight - rect.height - 10);
      this.menuElement.style.top = `${top}px`;
    }
  }
  
  /**
   * Checks if menu is currently visible.
   */
  isVisible(): boolean {
    return this.menuElement !== null;
  }
  
  /**
   * Cleans up the context menu.
   */
  destroy(): void {
    this.hide();
  }
}