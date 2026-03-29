/**
 * React Compiler Module Exports
 */

// Configuration
export {
  getReactCompilerConfig,
  shouldCompile,
  getNextReactCompilerConfig,
  DEFAULT_REACT_COMPILER_CONFIG,
  type ReactCompilerConfig,
} from './config/compiler.config';

// Diagnostics
export {
  ComponentScanner,
  quickScan,
  type CompilerIssue,
  type IncompatibilityReport,
  type ScanResult,
} from './diagnostics/scanner';

// Performance
export {
  PerformanceMeasurer,
  usePerformanceTracker,
  type PerformanceMetrics,
  type PerformanceComparison,
  type BenchmarkResult,
} from './performance/measurer';

// Migration
export {
  MigrationGuideGenerator,
  generateBatchGuides,
  type MigrationStep,
  type MigrationGuide,
} from './migration/guide-generator';
