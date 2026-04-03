/**
 * Plugin System for v1.10.0
 * A flexible, secure, and extensible plugin architecture
 */

export * from './types';
export { PluginManager } from './PluginManager';
export { PluginRegistry } from './PluginRegistry';
export { PluginLoader } from './PluginLoader';
export { PluginSandbox } from './PluginSandbox';
export { PluginHooks } from './PluginHooks';
export { PluginSDK } from './PluginSDK';
export * from './builtin';
// Note: marketplace exports its own ValidationResult which conflicts with types.ts
// Using named exports to avoid ambiguity
export { PluginMarket } from './marketplace/PluginMarket';
export { PluginInstaller } from './marketplace/PluginInstaller';
export { PluginSecurity } from './marketplace/PluginSecurity';
export type { ManifestValidationResult } from './marketplace/PluginValidator';