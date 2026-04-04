/**
 * Plugin Loader
 * Dynamic plugin loading with hot reload support
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  Plugin,
  PluginMetadata,
  PluginConfig,
  PluginLoadError,
  PluginValidationError,
} from './types';

export interface PluginSource {
  type: 'local' | 'npm' | 'url' | 'git';
  location: string;
  version?: string;
}

export interface IPluginLoader {
  load(id: string, source?: PluginSource): Promise<Plugin>;
  unload(id: string): Promise<void>;
  getPlugin(id: string): Plugin | undefined;
  scan(): Promise<Array<{ id: string; path: string; metadata?: PluginMetadata }>>;
  watch(callback: (event: string, id: string) => void): void;
  clearCache(): void;
}

export class PluginLoader implements IPluginLoader {
  private pluginPaths: string[] = [];
  private loadedPlugins: Map<string, Plugin> = new Map();

  constructor(
    private options: {
      pluginDir?: string;
      enableHotReload?: boolean;
      cacheEnabled?: boolean;
    } = {}
  ) {
    this.pluginPaths = options.pluginDir
      ? [options.pluginDir]
      : ['./plugins', './node_modules'];
  }

  /**
   * Add plugin search path
   */
  addPluginPath(pluginPath: string): void {
    this.pluginPaths.push(pluginPath);
  }

  /**
   * Load plugin by ID
   */
  async load(id: string, source?: PluginSource): Promise<Plugin> {
    try {
      let plugin: Plugin | null = null;

      // Try to load from different sources
      if (source) {
        plugin = await this.loadFromSource(id, source);
      } else {
        // Try to find plugin in search paths
        for (const pluginPath of this.pluginPaths) {
          const found = await this.tryLoadFromPath(id, pluginPath);
          if (found) {
            plugin = found;
            break;
          }
        }

        // Try to load as npm module
        if (!plugin) {
          const npmPlugin = await this.tryLoadFromNpm(id);
          if (npmPlugin) {
            plugin = npmPlugin;
          }
        }

        if (!plugin) {
          throw new PluginLoadError(id, `Plugin ${id} not found in any search path`);
        }
      }

      // Store in loaded plugins
      this.loadedPlugins.set(id, plugin);
      return plugin;
    } catch (error) {
      if (error instanceof PluginLoadError) {
        throw error;
      }
      throw new PluginLoadError(id, `Failed to load plugin ${id}: ${(error as Error).message}`);
    }
  }

  /**
   * Load plugin from source
   */
  private async loadFromSource(id: string, source: PluginSource): Promise<Plugin> {
    switch (source.type) {
      case 'local':
        return await this.loadFromLocal(id, source.location);
      case 'npm':
        return await this.loadFromNpm(id, source.location, source.version);
      case 'url':
        return await this.loadFromUrl(id, source.location);
      case 'git':
        return await this.loadFromGit(id, source.location);
      default:
        throw new PluginLoadError(id, `Unknown source type: ${(source as any).type}`);
    }
  }

  /**
   * Load plugin from local path
   */
  private async loadFromLocal(id: string, pluginPath: string): Promise<Plugin> {
    const manifestPath = path.join(pluginPath, 'plugin.json');
    const indexPath = path.join(pluginPath, 'index.js');
    const tsIndexPath = path.join(pluginPath, 'index.ts');

    // Check if path exists
    if (!fs.existsSync(pluginPath)) {
      throw new PluginLoadError(id, `Plugin path not found: ${pluginPath}`);
    }

    // Load manifest
    let metadata: PluginMetadata;
    if (fs.existsSync(manifestPath)) {
      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      metadata = JSON.parse(manifestContent);
    } else {
      throw new PluginLoadError(id, `Plugin manifest not found: ${manifestPath}`);
    }

    // Load plugin module
    let pluginModule: unknown;
    const modulePath = fs.existsSync(indexPath) ? indexPath : tsIndexPath;

    if (fs.existsSync(modulePath)) {
      // Clear require cache for hot reload
      if (this.options.enableHotReload) {
        delete require.cache[require.resolve(modulePath)];
      }

      pluginModule = require(modulePath);
    } else {
      throw new PluginLoadError(id, `Plugin module not found: ${modulePath}`);
    }

    // Create plugin instance
    const PluginClass = (pluginModule as any).default || pluginModule;
    const plugin: Plugin = new PluginClass();

    // Attach metadata
    plugin.metadata = metadata;

    return plugin;
  }

  /**
   * Load plugin from npm
   */
  private async loadFromNpm(id: string, packageName?: string, version?: string): Promise<Plugin> {
    const pkgName = packageName || id;
    const modulePath = require.resolve(pkgName);

    if (!modulePath) {
      throw new PluginLoadError(id, `NPM package not found: ${pkgName}`);
    }

    // Clear require cache
    if (this.options.enableHotReload) {
      delete require.cache[require.resolve(modulePath)];
    }

    // Load module
    const pluginModule = require(modulePath);
    const PluginClass = (pluginModule as any).default || pluginModule;
    const plugin: Plugin = new PluginClass();

    // Load metadata from package.json
    const pkgJsonPath = path.join(modulePath, '..', 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      plugin.metadata = {
        id: pkgJson.name,
        name: pkgJson.name,
        version: pkgJson.version,
        description: pkgJson.description || '',
        author: pkgJson.author,
        license: pkgJson.license,
        keywords: pkgJson.keywords,
        ...pkgJson.plugin,
      };
    }

    return plugin;
  }

  /**
   * Load plugin from URL
   */
  private async loadFromUrl(id: string, url: string): Promise<Plugin> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new PluginLoadError(id, `Failed to fetch plugin from URL: ${url}`);
      }

      const code = await response.text();
      
      // Validate code
      await this.validatePluginCode(code);

      // Execute code in sandboxed environment
      const pluginModule = await this.executePluginCode(id, code);
      const PluginClass = pluginModule.default || pluginModule;
      const plugin: Plugin = new PluginClass();

      return plugin;
    } catch (error) {
      throw new PluginLoadError(id, `Failed to load plugin from URL: ${(error as Error).message}`);
    }
  }

  /**
   * Load plugin from Git
   */
  private async loadFromGit(id: string, repoUrl: string): Promise<Plugin> {
    const { execSync } = require('child_process');
    const tempDir = path.join('/tmp', 'plugins', id);

    try {
      // Clone repository
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        execSync(`git clone ${repoUrl} ${tempDir}`, { stdio: 'ignore' });
      } else {
        // Pull latest changes
        execSync(`cd ${tempDir} && git pull`, { stdio: 'ignore' });
      }

      return await this.loadFromLocal(id, tempDir);
    } catch (error) {
      throw new PluginLoadError(id, `Failed to load plugin from Git: ${(error as Error).message}`);
    }
  }

  /**
   * Try to load plugin from path
   */
  private async tryLoadFromPath(id: string, pluginPath: string): Promise<Plugin | null> {
    try {
      const fullPath = path.join(pluginPath, id);
      if (fs.existsSync(fullPath)) {
        return await this.loadFromLocal(id, fullPath);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Try to load plugin from npm
   */
  private async tryLoadFromNpm(id: string): Promise<Plugin | null> {
    try {
      return await this.loadFromNpm(id);
    } catch {
      return null;
    }
  }

  /**
   * Validate plugin code
   */
  private async validatePluginCode(code: string): Promise<void> {
    // Basic validation
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /require\s*\(\s*['"]child_process['"]\s*\)/,
      /process\.exit/,
      /fs\.(unlink|rm|rmdir)/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new PluginValidationError('unknown', `Potentially dangerous code pattern detected: ${pattern}`);
      }
    }
  }

  /**
   * Execute plugin code
   */
  private async executePluginCode(id: string, code: string): Promise<any> {
    // Use VM module for sandboxed execution
    const vm = require('vm');
    const context = vm.createContext({
      module: { exports: {} },
      exports: {},
      console,
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
      Buffer,
    });

    const script = new vm.Script(code);
    script.runInContext(context);

    return context.module.exports;
  }

  /**
   * Scan for available plugins
   */
  async scan(): Promise<Array<{ id: string; path: string; metadata?: PluginMetadata }>> {
    const plugins: Array<{ id: string; path: string; metadata?: PluginMetadata }> = [];

    for (const pluginPath of this.pluginPaths) {
      if (!fs.existsSync(pluginPath)) {
        continue;
      }

      const entries = fs.readdirSync(pluginPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const id = entry.name;
        const fullPath = path.join(pluginPath, id);
        const manifestPath = path.join(fullPath, 'plugin.json');

        let metadata: PluginMetadata | undefined;
        if (fs.existsSync(manifestPath)) {
          try {
            const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
            metadata = JSON.parse(manifestContent);
          } catch {
            // Ignore invalid manifests
          }
        }

        plugins.push({ id, path: fullPath, metadata });
      }
    }

    return plugins;
  }

  /**
   * Watch for plugin changes (hot reload)
   */
  watch(callback: (event: string, id: string) => void): void {
    if (!this.options.enableHotReload) {
      return;
    }

    for (const pluginPath of this.pluginPaths) {
      if (!fs.existsSync(pluginPath)) {
        continue;
      }

      fs.watch(pluginPath, { recursive: true }, (event, filename) => {
        if (filename) {
          const id = filename.split(path.sep)[0];
          callback(event, id);
        }
      });
    }
  }

  /**
   * Clear loaded modules cache
   */
  clearCache(): void {
    this.loadedPlugins.clear();
  }

  /**
   * Unload plugin
   */
  async unload(id: string): Promise<void> {
    // Remove from loaded plugins cache
    this.loadedPlugins.delete(id);
  }

  /**
   * Get loaded plugin
   */
  getPlugin(id: string): Plugin | undefined {
    return this.loadedPlugins.get(id);
  }
}