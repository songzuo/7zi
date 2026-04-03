/**
 * Plugin Installer
 * Plugin installation and update management
 */

import * as fs from 'fs';
import * as path from 'path';
import { PluginMarketEntry, PluginLoadError } from '../types';
import { PluginLoader } from '../PluginLoader';
import { PluginValidator } from './PluginValidator';
import { PluginSecurity } from './PluginSecurity';

export interface InstallOptions {
  version?: string;
  force?: boolean;
  verifySignature?: boolean;
  securityCheck?: boolean;
}

export interface InstallResult {
  success: boolean;
  pluginId?: string;
  version?: string;
  path?: string;
  error?: string;
  warnings?: string[];
  securityIssues?: string[];
}

export interface UpdateResult {
  success: boolean;
  oldVersion?: string;
  newVersion?: string;
  changes?: string[];
  error?: string;
}

export class PluginInstaller {
  constructor(
    private pluginDir: string,
    private loader: PluginLoader,
    private validator: PluginValidator,
    private security: PluginSecurity
  ) {
    // Ensure plugin directory exists
    if (!fs.existsSync(pluginDir)) {
      fs.mkdirSync(pluginDir, { recursive: true });
    }
  }

  /**
   * Install plugin from marketplace
   */
  async install(
    plugin: PluginMarketEntry,
    options: InstallOptions = {}
  ): Promise<InstallResult> {
    const warnings: string[] = [];
    const securityIssues: string[] = [];

    try {
      // Check if already installed
      const installPath = path.join(this.pluginDir, plugin.id.replace(/[\/@]/g, '-'));
      if (fs.existsSync(installPath) && !options.force) {
        return {
          success: false,
          error: 'Plugin already installed. Use force option to reinstall.',
        };
      }

      // Verify security
      if (options.securityCheck !== false && plugin.securityScan) {
        if (plugin.securityScan.status === 'failed') {
          return {
            success: false,
            error: 'Plugin failed security scan',
            securityIssues: plugin.securityScan.issues.map((i) => i.message),
          };
        }

        if (plugin.securityScan.status === 'warning') {
          warnings.push(...plugin.securityScan.issues.map((i) => i.message));
        }
      }

      // Download plugin
      const pluginPath = await this.downloadPlugin(plugin, installPath);

      // Validate plugin
      const validation = await this.validator.validate(pluginPath);
      if (!validation.valid) {
        // Clean up
        fs.rmSync(installPath, { recursive: true, force: true });

        return {
          success: false,
          error: 'Plugin validation failed',
          warnings: validation.warnings.map(w => `${w.field}: ${w.message}`),
        };
      }

      warnings.push(...validation.warnings.map(w => `${w.field}: ${w.message}`));

      // Run security check
      if (options.securityCheck !== false) {
        const securityCheck = await this.security.scan(pluginPath);
        if (!securityCheck.passed) {
          // Clean up
          fs.rmSync(installPath, { recursive: true, force: true });

          return {
            success: false,
            error: 'Plugin security check failed',
            securityIssues: securityCheck.issues,
          };
        }

        securityIssues.push(...securityCheck.warnings);
      }

      return {
        success: true,
        pluginId: plugin.id,
        version: plugin.version,
        path: installPath,
        warnings,
        securityIssues,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        warnings,
        securityIssues,
      };
    }
  }

  /**
   * Download plugin from URL
   */
  private async downloadPlugin(
    plugin: PluginMarketEntry,
    installPath: string
  ): Promise<string> {
    // Create temp directory
    const tempDir = path.join('/tmp', 'plugin-downloads', plugin.id.replace(/[\/@]/g, '-'));
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
      // Download plugin archive
      const response = await fetch(plugin.downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download plugin: ${response.statusText}`);
      }

      const archivePath = path.join(tempDir, 'plugin.tar.gz');
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(archivePath, Buffer.from(buffer));

      // Extract archive
      const { execSync } = require('child_process');
      fs.mkdirSync(installPath, { recursive: true });
      execSync(`tar -xzf ${archivePath} -C ${installPath}`, { stdio: 'ignore' });

      // Clean up temp
      fs.rmSync(tempDir, { recursive: true, force: true });

      return installPath;
    } catch (error) {
      // Clean up on error
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      if (fs.existsSync(installPath)) {
        fs.rmSync(installPath, { recursive: true, force: true });
      }
      throw error;
    }
  }

  /**
   * Update plugin
   */
  async update(
    pluginId: string,
    newPlugin: PluginMarketEntry,
    options: InstallOptions = {}
  ): Promise<UpdateResult> {
    try {
      // Get current plugin
      const currentPlugin = this.loader.getPlugin(pluginId);
      if (!currentPlugin) {
        return {
          success: false,
          error: 'Plugin not installed',
        };
      }

      const oldVersion = currentPlugin.metadata.version;

      // Check if update is needed
      if (oldVersion === newPlugin.version && !options.force) {
        return {
          success: false,
          error: 'Plugin is already up to date',
        };
      }

      // Unload current plugin
      await this.loader.unload(pluginId);

      // Install new version
      const result = await this.install(newPlugin, { ...options, force: true });
      if (!result.success) {
        // Rollback
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        oldVersion,
        newVersion: newPlugin.version,
        changes: [`Updated from ${oldVersion} to ${newPlugin.version}`],
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Uninstall plugin
   */
  async uninstall(pluginId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get plugin
      const plugin = this.loader.getPlugin(pluginId);
      if (!plugin) {
        return { success: false, error: 'Plugin not installed' };
      }

      // Unload plugin
      await this.loader.unload(pluginId);

      // Remove plugin files
      const installPath = path.join(
        this.pluginDir,
        pluginId.replace(/[\/@]/g, '-')
      );

      if (fs.existsSync(installPath)) {
        fs.rmSync(installPath, { recursive: true, force: true });
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Check for updates
   */
  async checkUpdates(
    installedPlugins: Array<{ id: string; version: string }>,
    availablePlugins: PluginMarketEntry[]
  ): Promise<Array<{
    id: string;
    currentVersion: string;
    latestVersion: string;
    plugin: PluginMarketEntry;
  }>> {
    const updates: Array<{
      id: string;
      currentVersion: string;
      latestVersion: string;
      plugin: PluginMarketEntry;
    }> = [];

    for (const installed of installedPlugins) {
      const available = availablePlugins.find((p) => p.id === installed.id);
      if (!available) {
        continue;
      }

      if (this.compareVersions(available.version, installed.version) > 0) {
        updates.push({
          id: installed.id,
          currentVersion: installed.version,
          latestVersion: available.version,
          plugin: available,
        });
      }
    }

    return updates;
  }

  /**
   * Compare versions
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;

      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }

    return 0;
  }

  /**
   * List installed plugins
   */
  listInstalled(): Array<{ id: string; path: string; version: string }> {
    const plugins: Array<{ id: string; path: string; version: string }> = [];

    if (!fs.existsSync(this.pluginDir)) {
      return plugins;
    }

    const entries = fs.readdirSync(this.pluginDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const pluginPath = path.join(this.pluginDir, entry.name);
      const manifestPath = path.join(pluginPath, 'plugin.json');

      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          plugins.push({
            id: manifest.id || entry.name,
            path: pluginPath,
            version: manifest.version || '0.0.0',
          });
        } catch {
          // Invalid manifest
        }
      }
    }

    return plugins;
  }

  /**
   * Get plugin installation path
   */
  getInstallPath(pluginId: string): string {
    return path.join(this.pluginDir, pluginId.replace(/[\/@]/g, '-'));
  }

  /**
   * Check if plugin is installed
   */
  isInstalled(pluginId: string): boolean {
    const installPath = this.getInstallPath(pluginId);
    return fs.existsSync(installPath);
  }
}