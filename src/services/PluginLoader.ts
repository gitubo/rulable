/**
 * Plugin loader for dynamic module loading from manifest files.
 * Handles JavaScript module imports, CSS injection, and validation.
 */
import { Registry } from '../core/Registry';
import { EventBus } from '../core/EventBus';

/**
 * Plugin manifest structure defining bundles and their assets.
 */
export interface PluginManifest {
  [bundleName: string]: PluginBundle;
}

/**
 * Plugin bundle containing modules and assets.
 */
export interface PluginBundle {
  description: string;
  nodes?: string[];
  handlers?: string[];
  strategies?: string[];
  connections?: string[];
  styles?: string[];
  config?: Record<string, unknown>;
}

/**
 * Plugin category types.
 */
export type PluginCategory = 'nodes' | 'handlers' | 'strategies' | 'connections';

/**
 * Custom error for plugin loading failures.
 */
export class PluginLoadError extends Error {
  constructor(
    message: string,
    public readonly bundleName: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'PluginLoadError';
  }
}

/**
 * Plugin loader service for dynamic module loading.
 * Fetches manifest, imports JavaScript modules, injects CSS, and registers plugins.
 * 
 * @example
 * ```typescript
 * const loader = new PluginLoader(registry, eventBus);
 * await loader.loadFromManifest('/plugins/manifest.json');
 * ```
 */
export class PluginLoader {
  private registry: Registry;
  private eventBus: EventBus;
  private loadedBundles: Set<string>;
  private loadedStyles: Set<string>;
  
  /**
   * Creates a new PluginLoader instance.
   * 
   * @param registry - Plugin registry for registration
   * @param eventBus - Event bus for publishing load events
   */
  constructor(registry: Registry, eventBus: EventBus) {
    this.registry = registry;
    this.eventBus = eventBus;
    this.loadedBundles = new Set();
    this.loadedStyles = new Set();
  }
  
  /**
   * Loads plugins from a manifest file.
   * Fetches the manifest, parses bundles, and loads all assets.
   * 
   * @param manifestUrl - URL to manifest JSON file
   * @throws {PluginLoadError} If manifest fetch or parsing fails
   */
  async loadFromManifest(manifestUrl: string): Promise<void> {
    console.log(`[PluginLoader] Loading manifest from: ${manifestUrl}`);
    
    try {
      const response = await fetch(manifestUrl);
      
      if (!response.ok) {
        throw new PluginLoadError(
          `Failed to fetch manifest: ${response.statusText}`,
          'manifest',
          { status: response.status, url: manifestUrl }
        );
      }
      
      const manifest: PluginManifest = await response.json();
      const basePath = this.getBasePath(manifestUrl);
      
      console.log(`[PluginLoader] Manifest loaded. Found ${Object.keys(manifest).length} bundle(s)`);
      
      // Load all bundles
      const bundleNames = Object.keys(manifest);
      for (const name of bundleNames) {
        try {
          await this.loadPluginBundle(name, manifest[name], basePath);
        } catch (error) {
          console.error(`[PluginLoader] Failed to load bundle "${name}":`, error);
          // Continue loading other bundles even if one fails
        }
      }
      
      this.eventBus.emit('PLUGINS_LOADED', undefined);
      console.log('[PluginLoader] All plugins loaded successfully');
      
    } catch (error) {
      console.error('[PluginLoader] Fatal error loading manifest:', error);
      
      if (error instanceof PluginLoadError) {
        throw error;
      }
      
      throw new PluginLoadError(
        'Failed to load plugin manifest',
        'manifest',
        error
      );
    }
  }
  
  /**
   * Loads a single plugin bundle.
   * Loads styles first, then modules, then registers plugins.
   * 
   * @param name - Bundle name
   * @param bundle - Bundle definition
   * @param basePath - Base path for resolving relative URLs
   */
  async loadPluginBundle(
    name: string,
    bundle: PluginBundle,
    basePath: string
  ): Promise<void> {
    if (this.loadedBundles.has(name)) {
      console.warn(`[PluginLoader] Bundle "${name}" already loaded, skipping`);
      return;
    }
    
    console.log(`[PluginLoader] Loading bundle: ${name}`);
    console.log(`[PluginLoader]   Description: ${bundle.description}`);
    
    try {
      // Load styles first (before modules render anything)
      if (bundle.styles && bundle.styles.length > 0) {
        console.log(`[PluginLoader]   Loading ${bundle.styles.length} stylesheet(s)...`);
        for (const styleFile of bundle.styles) {
          await this.loadStyle(`${basePath}/${styleFile}`);
        }
      }
      
      // Load plugin modules by category
      const categories: PluginCategory[] = ['nodes', 'handlers', 'strategies', 'connections'];
      
      for (const category of categories) {
        const files = bundle[category];
        if (files && files.length > 0) {
          console.log(`[PluginLoader]   Loading ${files.length} ${category} module(s)...`);
          await this.loadModules(files, category, basePath);
        }
      }
      
      this.loadedBundles.add(name);
      console.log(`[PluginLoader] ✓ Bundle "${name}" loaded successfully`);
      
    } catch (error) {
      console.error(`[PluginLoader] Failed to load bundle "${name}":`, error);
      throw new PluginLoadError(
        `Failed to load plugin bundle`,
        name,
        error
      );
    }
  }
  
  /**
   * Loads and registers modules from a category.
   * 
   * @param files - Array of module file paths
   * @param category - Plugin category (nodes, handlers, etc.)
   * @param basePath - Base path for resolving relative URLs
   */
  private async loadModules(
    files: string[],
    category: PluginCategory,
    basePath: string
  ): Promise<void> {
    for (const file of files) {
      const modulePath = `${basePath}/${file}`;
      
      try {
        console.log(`[PluginLoader]     Importing: ${file}`);
        
        // Dynamic ES6 import
        // @ts-ignore - Dynamic import path
        const module = await import(/* @vite-ignore */ modulePath);
        
        // Register all exported classes/objects
        const registeredCount = this.registerModuleExports(module, category);
        
        if (registeredCount === 0) {
          console.warn(`[PluginLoader]     ⚠ No plugins registered from ${file}`);
        }
        
      } catch (error) {
        console.error(`[PluginLoader]     ✗ Failed to load module ${file}:`, error);
        throw new PluginLoadError(
          `Failed to load module: ${file}`,
          category,
          error
        );
      }
    }
  }
  
  /**
   * Registers all exported plugins from a module.
   * 
   * @param module - Imported module object
   * @param category - Plugin category
   * @returns Number of successfully registered plugins
   */
  private registerModuleExports(module: any, category: PluginCategory): number {
    const exports = Object.values(module);
    let registeredCount = 0;
    
    for (const exportedItem of exports) {
      // Check if it's a class/constructor
      if (typeof exportedItem === 'function' && exportedItem.prototype) {
        try {
          // Create instance for registration
          const instance = new (exportedItem as any)();
          
          // Get type from static property
          const ctor = exportedItem as any;
          const type = ctor.type;
          
          if (!type) {
            console.warn(
              `[PluginLoader]     ⚠ Plugin class ${ctor.name} missing static 'type' property`
            );
            continue;
          }
          
          // Register based on category
          switch (category) {
            case 'nodes':
              this.registry.registerNode(instance);
              console.log(`[PluginLoader]       ✓ Node: ${type}`);
              registeredCount++;
              break;
            
            case 'handlers':
              this.registry.registerHandler(instance);
              console.log(`[PluginLoader]       ✓ Handler: ${type}`);
              registeredCount++;
              break;
            
            case 'strategies':
              this.registry.registerStrategy(instance);
              console.log(`[PluginLoader]       ✓ Strategy: ${type}`);
              registeredCount++;
              break;
            
            case 'connections':
              this.registry.registerConnection(instance);
              console.log(`[PluginLoader]       ✓ Connection: ${type}`);
              registeredCount++;
              break;
          }
          
        } catch (error) {
          console.error(
            `[PluginLoader]       ✗ Failed to register plugin:`,
            error
          );
          // Continue with other exports
        }
      }
    }
    
    return registeredCount;
  }
  
  /**
   * Loads and injects a CSS stylesheet.
   * 
   * @param href - Stylesheet URL
   * @returns Promise that resolves when stylesheet loads
   */
  private async loadStyle(href: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (this.loadedStyles.has(href)) {
        console.log(`[PluginLoader]     Style already loaded: ${href}`);
        resolve();
        return;
      }
      
      console.log(`[PluginLoader]     Loading style: ${href}`);
      
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.setAttribute('data-plugin-style', 'true');
      
      link.onload = () => {
        this.loadedStyles.add(href);
        console.log(`[PluginLoader]       ✓ Style loaded: ${href}`);
        resolve();
      };
      
      link.onerror = (error) => {
        console.warn(`[PluginLoader]       ⚠ Failed to load style: ${href}`);
        // Don't reject - styles are optional
        // Still mark as "loaded" to prevent retry loops
        this.loadedStyles.add(href);
        resolve();
      };
      
      document.head.appendChild(link);
    });
  }
  
  /**
   * Extracts base path from manifest URL.
   * 
   * @param manifestUrl - Full manifest URL
   * @returns Base path for resolving relative URLs
   */
  private getBasePath(manifestUrl: string): string {
    try {
      const url = new URL(manifestUrl, window.location.href);
      const pathParts = url.pathname.split('/');
      pathParts.pop(); // Remove manifest.json
      return url.origin + pathParts.join('/');
    } catch (error) {
      console.error('[PluginLoader] Failed to parse manifest URL:', error);
      // Fallback to simple string manipulation
      const lastSlash = manifestUrl.lastIndexOf('/');
      return lastSlash > 0 ? manifestUrl.substring(0, lastSlash) : '';
    }
  }
  
  /**
   * Gets list of loaded bundle names.
   * 
   * @returns Array of bundle names
   */
  getLoadedBundles(): string[] {
    return Array.from(this.loadedBundles);
  }
  
  /**
   * Checks if a bundle is loaded.
   * 
   * @param bundleName - Bundle name to check
   * @returns True if bundle is loaded
   */
  isLoaded(bundleName: string): boolean {
    return this.loadedBundles.has(bundleName);
  }
  
  /**
   * Gets loading statistics.
   * 
   * @returns Load statistics
   */
  getStats(): {
    bundlesLoaded: number;
    stylesLoaded: number;
    pluginsRegistered: {
      nodes: number;
      handlers: number;
      strategies: number;
      connections: number;
    };
  } {
    const registryStats = this.registry.getStats();
    
    return {
      bundlesLoaded: this.loadedBundles.size,
      stylesLoaded: this.loadedStyles.size,
      pluginsRegistered: {
        nodes: registryStats.nodes,
        handlers: registryStats.handlers,
        strategies: registryStats.strategies,
        connections: registryStats.connections
      }
    };
  }
  
  /**
   * Unloads all plugins (clears registry and styles).
   * WARNING: This will break existing graph instances.
   */
  unloadAll(): void {
    console.log('[PluginLoader] Unloading all plugins...');
    
    // Remove injected stylesheets
    document.querySelectorAll('link[data-plugin-style]').forEach(link => {
      link.remove();
    });
    
    // Clear registry
    this.registry.clear();
    
    // Clear tracking sets
    this.loadedBundles.clear();
    this.loadedStyles.clear();
    
    console.log('[PluginLoader] All plugins unloaded');
  }
  
  /**
   * Validates a manifest file without loading it.
   * Useful for pre-flight checks.
   * 
   * @param manifestUrl - URL to manifest file
   * @returns Validation result with warnings
   */
  async validateManifest(manifestUrl: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    bundles: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const bundles: string[] = [];
    
    try {
      const response = await fetch(manifestUrl);
      
      if (!response.ok) {
        errors.push(`Failed to fetch manifest: ${response.statusText}`);
        return { valid: false, errors, warnings, bundles };
      }
      
      const manifest: PluginManifest = await response.json();
      
      // Validate structure
      if (typeof manifest !== 'object' || manifest === null) {
        errors.push('Manifest must be a JSON object');
        return { valid: false, errors, warnings, bundles };
      }
      
      // Validate each bundle
      for (const [name, bundle] of Object.entries(manifest)) {
        bundles.push(name);
        
        if (!bundle.description) {
          warnings.push(`Bundle "${name}" missing description`);
        }
        
        const hasModules = 
          (bundle.nodes && bundle.nodes.length > 0) ||
          (bundle.handlers && bundle.handlers.length > 0) ||
          (bundle.strategies && bundle.strategies.length > 0) ||
          (bundle.connections && bundle.connections.length > 0);
        
        if (!hasModules) {
          warnings.push(`Bundle "${name}" contains no plugin modules`);
        }
      }
      
      return {
        valid: errors.length === 0,
        errors,
        warnings,
        bundles
      };
      
    } catch (error) {
      errors.push(`Failed to validate manifest: ${error.message}`);
      return { valid: false, errors, warnings, bundles };
    }
  }
}