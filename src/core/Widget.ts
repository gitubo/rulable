/**
 * Main Widget class - Entry point and orchestrator for the Diagram Editor.
 * Initializes all services, provides public API, and manages lifecycle.
 */
import * as d3 from 'd3';
import { EventBus } from './EventBus';
import { Store } from './State';
import { Registry } from './Registry';
import { SelectionManager } from './SelectionManager';
import { Config } from './Config';
import { DiagramAPI } from './API';
import { HistoryManager } from '../services/HistoryManager';
import { SerializationService } from '../services/SerializationService';
import { PluginLoader } from '../services/PluginLoader';
import { InputSystem } from '../services/InputSystem';
import { RenderEngine } from '../rendering/RenderEngine';
import { ZoomControls } from '../components/ZoomControls';
import { NodePalette } from '../components/NodePalette';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { WidgetConfig, WidgetAPI, EventCallback, UnsubscribeFn, EventType } from './types';

/**
 * Main Diagram Editor Widget class.
 * Provides complete graph editing functionality with plugin support.
 * 
 * @example
 * ```typescript
 * const widget = new DAGWidget({
 *   container: '#diagram-container',
 *   width: '100%',
 *   height: '600px',
 *   manifestUrl: '/plugins/manifest.json',
 *   showDefaultUI: true
 * });
 * 
 * // Use API
 * widget.api.commands.createNode({ type: 'task', x: 100, y: 100 });
 * 
 * // Subscribe to events
 * const unsub = widget.subscribe((payload) => {
 *   console.log('Event:', payload);
 * });
 * ```
 */
export class DAGWidget {
  public readonly api: WidgetAPI;
  
  private eventBus: EventBus;
  private store: Store;
  private registry: Registry;
  private selectionManager: SelectionManager;
  private historyManager: HistoryManager;
  private serializationService: SerializationService;
  private pluginLoader: PluginLoader;
  private renderEngine: RenderEngine;
  private inputSystem: InputSystem;
  
  private container: HTMLElement;
  private svg!: SVGSVGElement;
  
  private ui?: {
    zoomControls: ZoomControls;
    nodePalette: NodePalette;
    propertiesPanel: PropertiesPanel;
  };
  
  /**
   * Creates a new DAGWidget instance.
   * 
   * @param config - Widget configuration
   * @throws {Error} If container not found
   */
  constructor(config: WidgetConfig) {
    console.log('[DAGWidget] Initializing...');
    
    // Resolve container
    this.container = typeof config.container === 'string'
      ? document.querySelector(config.container)!
      : config.container;
    
    if (!this.container) {
      throw new Error(`Container not found: ${config.container}`);
    }
    
    // Initialize core services
    console.log('[DAGWidget] Creating core services...');
    this.eventBus = new EventBus();
    this.registry = new Registry();
    this.selectionManager = new SelectionManager(this.eventBus);
    this.store = new Store(this.eventBus, this.selectionManager);
    
    this.serializationService = new SerializationService(this.registry, this.store);
    
    this.historyManager = new HistoryManager(
      Config.HISTORY_MAX_DEPTH,
      () => this.serializationService.serialize(),
      (state) => {
        const deserialized = this.serializationService.deserialize(state);
        this.store.setState(deserialized);
      },
      this.eventBus
    );
    
    this.pluginLoader = new PluginLoader(this.registry, this.eventBus);
    
    // Create DOM structure
    console.log('[DAGWidget] Creating DOM structure...');
    this.createDOMStructure(config);
    
    // Initialize rendering
    console.log('[DAGWidget] Initializing render engine...');
    this.renderEngine = new RenderEngine(
      this.svg,
      this.store,
      this.registry,
      this.eventBus,
      this.selectionManager
    );
    
    // Initialize input system
    console.log('[DAGWidget] Initializing input system...');
    this.inputSystem = new InputSystem(
      this.svg,
      this.store,
      this.registry,
      this.eventBus,
      this.selectionManager,
      this.renderEngine
    );
    
    // Create API
    console.log('[DAGWidget] Creating public API...');
    const apiInstance = new DiagramAPI(
      this.eventBus,
      this.store,
      this.registry,
      this.selectionManager,
      this.historyManager,
      this.serializationService
    );
    
    this.api = apiInstance;
    
    // Load plugins if manifest URL provided
    if (config.manifestUrl) {
      console.log('[DAGWidget] Loading plugins from:', config.manifestUrl);
      this.loadPlugins(config.manifestUrl);
    }
    
    // Create UI components if requested
    if (config.showDefaultUI !== false) {
      console.log('[DAGWidget] Creating UI components...');
      this.createUIComponents();
    }
    
    // Set initial transform
    if (config.initialZoom || config.initialOffset) {
      this.store.setTransform({
        k: config.initialZoom || 1,
        x: config.initialOffset?.x || 0,
        y: config.initialOffset?.y || 0
      });
    }
    
    // Start render loop
    console.log('[DAGWidget] Starting render loop...');
    this.renderEngine.startRenderLoop();
    
    // Initialize history with current empty state
    this.historyManager.save();
    
    console.log('[DAGWidget] Initialization complete!');
  }
  
  /**
   * Creates the DOM structure for the widget.
   */
  private createDOMStructure(config: WidgetConfig): void {
    this.container.innerHTML = '';
    this.container.classList.add('diagram-widget-container');
    
    // Set container styles
    Object.assign(this.container.style, {
      position: 'relative',
      width: typeof config.width === 'number' ? `${config.width}px` : (config.width || '100%'),
      height: typeof config.height === 'number' ? `${config.height}px` : (config.height || '600px'),
      overflow: 'hidden',
      background: '#fafafa'
    });
    
    // Create SVG canvas
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.style.cursor = 'grab';
    
    this.container.appendChild(this.svg);
    
    // Create UI containers if needed
    if (config.showDefaultUI !== false) {
      const uiContainer = document.createElement('div');
      uiContainer.className = 'dag-widget-ui';
      uiContainer.innerHTML = `
        <div class="ui-top-left" id="zoom-controls-container"></div>
        <div class="ui-left" id="node-palette-container"></div>
        <div class="ui-right" id="properties-panel-container"></div>
      `;
      
      this.container.appendChild(uiContainer);
      
      // Inject UI styles if not already present
      this.injectUIStyles();
    }
  }
  
  /**
   * Creates UI components (zoom controls, palette, properties panel).
   */
  private createUIComponents(): void {
    const zoomContainer = this.container.querySelector('#zoom-controls-container') as HTMLElement;
    const paletteContainer = this.container.querySelector('#node-palette-container') as HTMLElement;
    const propertiesContainer = this.container.querySelector('#properties-panel-container') as HTMLElement;
    
    if (zoomContainer && paletteContainer && propertiesContainer) {
      this.ui = {
        zoomControls: new ZoomControls(zoomContainer, this.api as DiagramAPI, this.eventBus),
        nodePalette: new NodePalette(paletteContainer, this.registry, this.api as DiagramAPI),
        propertiesPanel: new PropertiesPanel(
          propertiesContainer,
          this.eventBus,
          this.selectionManager,
          this.api as DiagramAPI,
          this.registry
        )
      };
      
      // Refresh palette when plugins load
      this.eventBus.on('PLUGINS_LOADED', () => {
        this.ui!.nodePalette.refresh();
        console.log('[DAGWidget] Palette refreshed after plugin load');
      });
    }
  }
  
  /**
   * Injects UI styles into document head.
   */
  private injectUIStyles(): void {
    if (document.querySelector('#dag-widget-ui-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'dag-widget-ui-styles';
    style.textContent = `
      .dag-widget-ui {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
      }
      
      .dag-widget-ui > * {
        pointer-events: auto;
      }
      
      .ui-top-left {
        position: absolute;
        top: 16px;
        left: 16px;
      }
      
      .ui-left {
        position: absolute;
        top: 80px;
        left: 16px;
        max-height: calc(100% - 96px);
      }
      
      .ui-right {
        position: absolute;
        top: 16px;
        right: 16px;
        max-height: calc(100% - 32px);
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Loads plugins from manifest URL.
   */
  private async loadPlugins(manifestUrl: string): Promise<void> {
    try {
      await this.pluginLoader.loadFromManifest(manifestUrl);
      console.log('[DAGWidget] Plugins loaded successfully');
    } catch (error) {
      console.error('[DAGWidget] Failed to load plugins:', error);
    }
  }
  
  // ========== PUBLIC API ==========
  
  /**
   * Subscribes to all widget events.
   * 
   * @param callback - Event callback function
   * @returns Unsubscribe function
   */
  subscribe<T extends EventType>(callback: EventCallback<T>): UnsubscribeFn {
    const unsubscribers: UnsubscribeFn[] = [];
    
    const eventTypes: EventType[] = [
      'NODE_CREATED', 'NODE_UPDATED', 'NODE_REMOVED', 'NODE_MOVED',
      'CONNECTION_CREATED', 'CONNECTION_UPDATED', 'CONNECTION_REMOVED',
      'SELECTION_CHANGED', 'HISTORY_CHANGED', 'STATE_LOADED',
      'PLUGINS_LOADED', 'TRAVERSE_COMPLETED', 'TRAVERSE_ERROR',
      'RENDER_REQUESTED', 'NOTE_CREATED', 'NOTE_UPDATED', 'NOTE_REMOVED'
    ];
    
    eventTypes.forEach(event => {
      unsubscribers.push(
        this.eventBus.on(event, (payload) => callback(payload as any))
      );
    });
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }
  
  /**
   * Legacy dispatch method for backwards compatibility.
   * @deprecated Use api.commands or api.queries instead
   */
  dispatch(command: string, payload?: unknown): unknown {
    console.warn('[DAGWidget] dispatch() is deprecated. Use api.commands or api.queries instead.');
    
    // Map legacy commands to new API
    switch (command) {
      case 'createNode':
        this.api.commands.createNode(payload as any);
        break;
      case 'deleteNode':
        this.api.commands.deleteNode(payload as any);
        break;
      case 'updateNode':
        this.api.commands.updateNode(payload as any);
        break;
      case 'undo':
        this.api.commands.undo();
        break;
      case 'redo':
        this.api.commands.redo();
        break;
      default:
        console.warn(`[DAGWidget] Unknown command: ${command}`);
    }
    
    return undefined;
  }
  
  /**
   * Destroys the widget and cleans up resources.
   */
  destroy(): void {
    console.log('[DAGWidget] Destroying widget...');
    
    this.renderEngine.stopRenderLoop();
    this.renderEngine.destroy();
    this.inputSystem.destroy();
    this.eventBus.clear();
    this.container.innerHTML = '';
    
    console.log('[DAGWidget] Widget destroyed');
  }
}