/**
 * Properties panel for editing node and connection attributes.
 * Dynamically renders schema-based forms and handles updates.
 */
import { EventBus } from '../core/EventBus';
import { SelectionManager } from '../core/SelectionManager';
import { DiagramAPI } from '../core/API';
import { Registry } from '../core/Registry';
import { PropertySchema, NodeData, ConnectionData } from '../core/types';

/**
 * Panel for editing properties of selected graph elements.
 * Renders different forms based on selection type and schema.
 */
export class PropertiesPanel {
  private container: HTMLElement;
  private eventBus: EventBus;
  private selectionManager: SelectionManager;
  private api: DiagramAPI;
  private registry: Registry;
  
  constructor(
    container: HTMLElement,
    eventBus: EventBus,
    selectionManager: SelectionManager,
    api: DiagramAPI,
    registry: Registry
  ) {
    this.container = container;
    this.eventBus = eventBus;
    this.selectionManager = selectionManager;
    this.api = api;
    this.registry = registry;
    
    this.subscribeToEvents();
    this.render();
  }
  
  private subscribeToEvents(): void {
    this.eventBus.on('SELECTION_CHANGED', () => {
      this.render();
    });
    
    this.eventBus.on('NODE_UPDATED', () => {
      this.render();
    });
    
    this.eventBus.on('CONNECTION_UPDATED', () => {
      this.render();
    });
  }
  
  private render(): void {
    const selection = this.selectionManager.getSelection();
    
    if (!selection) {
      this.renderEmpty();
      return;
    }
    
    if (selection.type === 'node') {
      this.renderNodeProperties(selection.id);
    } else if (selection.type === 'link') {
      this.renderLinkProperties(selection.id);
    } else if (selection.type === 'note') {
      this.renderNoteProperties(selection.id);
    }
  }
  
  private renderEmpty(): void {
    this.container.innerHTML = `
      <div class="properties-panel empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4m0-4h.01"/>
        </svg>
        <p>No selection</p>
        <p class="hint">Select a node or connection to edit properties</p>
      </div>
    `;
  }
  
  private renderNodeProperties(nodeId: string): void {
    const nodeData = this.api.queries.getNode(nodeId as any);
    if (!nodeData) {
      this.renderEmpty();
      return;
    }
    
    const definition = this.registry.getNodeDefinition(nodeData.type);
    const schema = (definition as any)?.schema;
    
    let html = '<div class="properties-panel">';
    html += '<div class="properties-header">Node Properties</div>';
    html += '<div class="properties-body">';
    
    // Basic properties
    html += `
      <div class="property-field">
        <label for="prop-label">Label</label>
        <input 
          type="text" 
          id="prop-label" 
          value="${this.escapeHtml(nodeData.label)}"
          placeholder="Node label"
        />
      </div>
      
      <div class="property-field">
        <label for="prop-note">Note</label>
        <textarea 
          id="prop-note" 
          rows="3"
          placeholder="Add a note..."
        >${this.escapeHtml(nodeData.note)}</textarea>
      </div>
    `;
    
    // Schema-based properties
    if (schema && Object.keys(schema).length > 0) {
      html += '<div class="property-divider"></div>';
      html += '<div class="property-section-title">Configuration</div>';
      html += this.renderSchemaFields(schema, nodeData.data);
    }
    
    // Style properties
    html += '<div class="property-divider"></div>';
    html += '<div class="property-section-title">Appearance</div>';
    html += `
      <div class="property-field">
        <label for="prop-fill">Fill Color</label>
        <input 
          type="color" 
          id="prop-fill" 
          value="${nodeData.style.fill || '#ffffff'}"
        />
      </div>
      
      <div class="property-field">
        <label for="prop-stroke">Stroke Color</label>
        <input 
          type="color" 
          id="prop-stroke" 
          value="${nodeData.style.stroke || '#333333'}"
        />
      </div>
    `;
    
    // Actions
    html += `
      <div class="property-divider"></div>
      <div class="property-actions">
        <button id="btn-apply" class="btn-primary">Apply</button>
        <button id="btn-delete" class="btn-danger">Delete Node</button>
      </div>
    `;
    
    html += '</div></div>';
    this.container.innerHTML = html;
    
    this.attachNodeEventListeners(nodeId);
  }
  
  /**
   * Renders schema-based form fields.
   */
  private renderSchemaFields(schema: PropertySchema, data: Record<string, unknown>): string {
    let html = '';
    
    Object.entries(schema).forEach(([key, field]) => {
      const value = data[key] ?? field.default ?? '';
      
      html += `<div class="property-field">`;
      html += `<label for="prop-${key}">${field.label}</label>`;
      
      switch (field.type) {
        case 'text':
          html += `<input type="text" id="prop-${key}" data-prop-key="${key}" value="${this.escapeHtml(String(value))}" />`;
          break;
        
        case 'number':
          html += `<input type="number" id="prop-${key}" data-prop-key="${key}" value="${value}" />`;
          break;
        
        case 'boolean':
          html += `<input type="checkbox" id="prop-${key}" data-prop-key="${key}" ${value ? 'checked' : ''} />`;
          break;
        
        case 'select':
          html += `<select id="prop-${key}" data-prop-key="${key}">`;
          (field.options || []).forEach(option => {
            const selected = option === value ? 'selected' : '';
            html += `<option value="${option}" ${selected}>${option}</option>`;
          });
          html += `</select>`;
          break;
      }
      
      html += `</div>`;
    });
    
    return html;
  }
  
  private renderLinkProperties(linkId: string): void {
    const linkData = this.api.queries.getLink(linkId as any);
    if (!linkData) {
      this.renderEmpty();
      return;
    }
    
    let html = '<div class="properties-panel">';
    html += '<div class="properties-header">Connection Properties</div>';
    html += '<div class="properties-body">';
    
    html += `
      <div class="property-field">
        <label for="prop-label">Label</label>
        <input 
          type="text" 
          id="prop-label" 
          value="${linkData.label?.text || ''}"
          placeholder="Connection label"
        />
      </div>
      
      <div class="property-divider"></div>
      <div class="property-section-title">Appearance</div>
      
      <div class="property-field">
        <label for="prop-stroke">Color</label>
        <input 
          type="color" 
          id="prop-stroke" 
          value="${linkData.style.stroke}"
        />
      </div>
      
      <div class="property-field">
        <label for="prop-width">Width</label>
        <input 
          type="number" 
          id="prop-width" 
          min="1" 
          max="10" 
          value="${linkData.style.strokeWidth}"
        />
      </div>
      
      <div class="property-field">
        <label for="prop-path-type">Path Type</label>
        <select id="prop-path-type">
          <option value="bezier" ${linkData.pathType === 'bezier' ? 'selected' : ''}>Bezier</option>
          <option value="smooth_step" ${linkData.pathType === 'smooth_step' ? 'selected' : ''}>Smooth Step</option>
          <option value="straight" ${linkData.pathType === 'straight' ? 'selected' : ''}>Straight</option>
        </select>
      </div>
      
      <div class="property-divider"></div>
      <div class="property-actions">
        <button id="btn-apply" class="btn-primary">Apply</button>
        <button id="btn-delete" class="btn-danger">Delete Connection</button>
      </div>
    `;
    
    html += '</div></div>';
    this.container.innerHTML = html;
    
    this.attachLinkEventListeners(linkId);
  }
  
  private renderNoteProperties(noteId: string): void {
    this.container.innerHTML = `
      <div class="properties-panel">
        <div class="properties-header">Note Properties</div>
        <div class="properties-body">
          <p class="hint">Note editing coming soon</p>
        </div>
      </div>
    `;
  }
  
  private attachNodeEventListeners(nodeId: string): void {
    const applyBtn = this.container.querySelector('#btn-apply');
    const deleteBtn = this.container.querySelector('#btn-delete');
    
    applyBtn?.addEventListener('click', () => {
      const label = (this.container.querySelector('#prop-label') as HTMLInputElement)?.value || '';
      const note = (this.container.querySelector('#prop-note') as HTMLTextAreaElement)?.value || '';
      const fill = (this.container.querySelector('#prop-fill') as HTMLInputElement)?.value;
      const stroke = (this.container.querySelector('#prop-stroke') as HTMLInputElement)?.value;
      
      // Collect schema data
      const data: Record<string, unknown> = {};
      this.container.querySelectorAll('[data-prop-key]').forEach(el => {
        const key = el.getAttribute('data-prop-key');
        if (!key) return;
        
        if (el instanceof HTMLInputElement) {
          if (el.type === 'checkbox') {
            data[key] = el.checked;
          } else if (el.type === 'number') {
            data[key] = Number(el.value);
          } else {
            data[key] = el.value;
          }
        } else if (el instanceof HTMLSelectElement) {
          data[key] = el.value;
        }
      });
      
      this.api.commands.updateNode({
        id: nodeId as any,
        label,
        note,
        style: {
          fill,
          stroke
        },
        data
      });
      
      console.log(`[PropertiesPanel] Node updated: ${nodeId}`);
    });
    
    deleteBtn?.addEventListener('click', () => {
      if (confirm('Delete this node and all its connections?')) {
        this.api.commands.deleteNode(nodeId as any);
        console.log(`[PropertiesPanel] Node deleted: ${nodeId}`);
      }
    });
  }
  
  private attachLinkEventListeners(linkId: string): void {
    const applyBtn = this.container.querySelector('#btn-apply');
    const deleteBtn = this.container.querySelector('#btn-delete');
    
    applyBtn?.addEventListener('click', () => {
      const labelText = (this.container.querySelector('#prop-label') as HTMLInputElement)?.value || '';
      const stroke = (this.container.querySelector('#prop-stroke') as HTMLInputElement)?.value || '#666666';
      const width = Number((this.container.querySelector('#prop-width') as HTMLInputElement)?.value || 2);
      const pathType = (this.container.querySelector('#prop-path-type') as HTMLSelectElement)?.value as any;
      
      this.api.commands.updateLink({
        id: linkId as any,
        label: labelText ? { text: labelText, offset: 0.5 } : undefined,
        style: { stroke, strokeWidth: width }
      });
      
      console.log(`[PropertiesPanel] Link updated: ${linkId}`);
    });
    
    deleteBtn?.addEventListener('click', () => {
      if (confirm('Delete this connection?')) {
        this.api.commands.deleteLink(linkId as any);
        console.log(`[PropertiesPanel] Link deleted: ${linkId}`);
      }
    });
  }
  
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  destroy(): void {
    this.container.innerHTML = '';
  }
}