// @ts-nocheck
/**
 * Plugin Validator
 * Plugin validation and verification
 */

import * as fs from 'fs';
import * as path from 'path';
import { PluginMetadata, PluginValidationError } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

export interface ManifestValidationResult extends ValidationResult {
  metadata?: PluginMetadata;
}

export class PluginValidator {
  /**
   * Validate plugin directory
   */
  async validate(pluginPath: string): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    // Check if directory exists
    if (!fs.existsSync(pluginPath)) {
      return {
        valid: false,
        errors: [{ field: 'path', message: 'Plugin directory does not exist' }],
        warnings: [],
      };
    }

    // Check manifest
    const manifestPath = path.join(pluginPath, 'plugin.json');
    if (!fs.existsSync(manifestPath)) {
      errors.push({ field: 'manifest', message: 'plugin.json not found' });
    } else {
      const manifestResult = await this.validateManifest(manifestPath);
      errors.push(...manifestResult.errors);
      warnings.push(...manifestResult.warnings);
    }

    // Check plugin entry point
    const indexPath = path.join(pluginPath, 'index.js');
    const tsIndexPath = path.join(pluginPath, 'index.ts');

    if (!fs.existsSync(indexPath) && !fs.existsSync(tsIndexPath)) {
      errors.push({ field: 'entry', message: 'index.js or index.ts not found' });
    }

    // Check package.json
    const packagePath = path.join(pluginPath, 'package.json');
    if (!fs.existsSync(packagePath)) {
      warnings.push({ field: 'package', message: 'package.json not found' });
    }

    // Check README
    const readmePath = path.join(pluginPath, 'README.md');
    if (!fs.existsSync(readmePath)) {
      warnings.push({ field: 'readme', message: 'README.md not found' });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate plugin manifest
   */
  async validateManifest(manifestPath: string): Promise<ManifestValidationResult> {
    const errors: ManifestValidationResult['errors'] = [];
    const warnings: ManifestValidationResult['warnings'] = [];

    try {
      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      // Validate required fields
      if (!manifest.id) {
        errors.push({ field: 'id', message: 'Plugin ID is required' });
      } else if (!this.validatePluginId(manifest.id)) {
        errors.push({ field: 'id', message: 'Invalid plugin ID format' });
      }

      if (!manifest.name) {
        errors.push({ field: 'name', message: 'Plugin name is required' });
      }

      if (!manifest.version) {
        errors.push({ field: 'version', message: 'Plugin version is required' });
      } else if (!this.validateVersion(manifest.version)) {
        errors.push({ field: 'version', message: 'Invalid version format (use semver)' });
      }

      if (!manifest.description) {
        warnings.push({ field: 'description', message: 'Plugin description is recommended' });
      }

      // Validate optional fields
      if (manifest.category && !this.validateCategory(manifest.category)) {
        errors.push({ field: 'category', message: 'Invalid plugin category' });
      }

      if (manifest.minCoreVersion && !this.validateVersion(manifest.minCoreVersion)) {
        errors.push({ field: 'minCoreVersion', message: 'Invalid minCoreVersion format' });
      }

      if (manifest.maxCoreVersion && !this.validateVersion(manifest.maxCoreVersion)) {
        errors.push({ field: 'maxCoreVersion', message: 'Invalid maxCoreVersion format' });
      }

      // Validate dependencies
      if (manifest.dependencies) {
        for (const dep of manifest.dependencies) {
          if (!dep.id) {
            errors.push({ field: 'dependencies', message: 'Dependency ID is required' });
          }

          if (dep.version && !this.validateVersion(dep.version)) {
            errors.push({ field: 'dependencies', message: `Invalid version for dependency ${dep.id}` });
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        metadata: manifest as PluginMetadata,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{ field: 'manifest', message: 'Invalid JSON format' }],
        warnings: [],
      };
    }
  }

  /**
   * Validate plugin code
   */
  async validateCode(pluginPath: string): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    // Find entry point
    const indexPath = path.join(pluginPath, 'index.js');
    const tsIndexPath = path.join(pluginPath, 'index.ts');
    const codePath = fs.existsSync(indexPath) ? indexPath : tsIndexPath;

    if (!codePath || !fs.existsSync(codePath)) {
      return {
        valid: false,
        errors: [{ field: 'code', message: 'Plugin code not found' }],
        warnings: [],
      };
    }

    const code = fs.readFileSync(codePath, 'utf-8');

    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: /eval\s*\(/, message: 'Use of eval() is not allowed' },
      { pattern: /Function\s*\(/, message: 'Use of Function() constructor is not allowed' },
      { pattern: /require\s*\(\s*['"]child_process['"]\s*\)/, message: 'Child process access is restricted' },
      { pattern: /process\.exit/, message: 'Process exit is not allowed' },
      { pattern: /__proto__/, message: 'Prototype pollution risk detected' },
      { pattern: /constructor\[.*\]/, message: 'Constructor access is restricted' },
    ];

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(code)) {
        errors.push({ field: 'code', message });
      }
    }

    // Check for warnings
    const warningPatterns = [
      { pattern: /console\.log/, message: 'Consider using the logger instead of console.log' },
      { pattern: /var\s+/, message: 'Consider using let or const instead of var' },
      { pattern: /==(?!=)/, message: 'Consider using === instead of ==' },
      { pattern: /!=/, message: 'Consider using !== instead of !=', exclude: /!==/ },
    ];

    for (const { pattern, message, exclude } of warningPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        if (exclude && exclude.test(matches[0])) {
          continue;
        }
        warnings.push({ field: 'code', message });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate plugin ID
   */
  private validatePluginId(id: string): boolean {
    // Plugin ID should be in format: @scope/plugin-name or plugin-name
    const pattern = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
    return pattern.test(id);
  }

  /**
   * Validate version (semver)
   */
  private validateVersion(version: string): boolean {
    // Simple semver validation
    const pattern = /^\d+\.\d+\.\d+(-[a-z0-9-]+(\.[a-z0-9-]+)*)?(\+[a-z0-9-]+(\.[a-z0-9-]+)*)?$/i;
    return pattern.test(version);
  }

  /**
   * Validate category
   */
  private validateCategory(category: string): boolean {
    const validCategories = [
      'logging',
      'caching',
      'authentication',
      'webhook',
      'analytics',
      'monitoring',
      'notification',
      'integration',
      'workflow',
      'ai',
      'security',
      'performance',
      'ui',
      'data',
      'utility',
      'other',
    ];

    return validCategories.includes(category);
  }

  /**
   * Validate plugin dependencies
   */
  async validateDependencies(
    pluginPath: string,
    installedPlugins: string[]
  ): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    const manifestPath = path.join(pluginPath, 'plugin.json');
    if (!fs.existsSync(manifestPath)) {
      return {
        valid: false,
        errors: [{ field: 'manifest', message: 'plugin.json not found' }],
        warnings: [],
      };
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const dependencies = manifest.dependencies || [];

    for (const dep of dependencies) {
      if (!dep.optional && !installedPlugins.includes(dep.id)) {
        errors.push({
          field: 'dependencies',
          message: `Required dependency ${dep.id} is not installed`,
        });
      }

      if (dep.optional && !installedPlugins.includes(dep.id)) {
        warnings.push({
          field: 'dependencies',
          message: `Optional dependency ${dep.id} is not installed`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate plugin configuration
   */
  async validateConfig(config: Record<string, unknown>): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    if (!config.id) {
      errors.push({ field: 'id', message: 'Plugin ID is required' });
    }

    if (typeof config.enabled !== 'boolean') {
      errors.push({ field: 'enabled', message: 'enabled must be a boolean' });
    }

    if (config.priority !== undefined && typeof config.priority !== 'number') {
      errors.push({ field: 'priority', message: 'priority must be a number' });
    }

    if (config.limits) {
      const limits = config.limits as Record<string, unknown>;
      if (limits.maxMemory && typeof limits.maxMemory !== 'number') {
        errors.push({ field: 'limits.maxMemory', message: 'maxMemory must be a number' });
      }

      if (limits.maxCpuTime && typeof limits.maxCpuTime !== 'number') {
        errors.push({ field: 'limits.maxCpuTime', message: 'maxCpuTime must be a number' });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}