/**
 * React Compiler Dashboard - Compiler Diagnostics Component
 *
 * Displays compatibility reports, performance comparisons, and controls.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getReactCompilerConfig as getConfigManager, ReactCompilerConfig } from '../config/compiler.config';
import { generateCompatibilityReport } from '../diagnostics/reporter';

// ============================================================================
// Types
// ============================================================================

interface ComponentIssue {
  type: string;
  message: string;
  line: number;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

interface ComponentReport {
  name: string;
  path: string;
  isCompatible: boolean;
  issues: ComponentIssue[];
}

interface PerformanceMetrics {
  beforeCompiler: {
    renderCount: number;
    avgRenderTime: number;
    memoryUsage: number;
  };
  afterCompiler: {
    renderCount: number;
    avgRenderTime: number;
    memoryUsage: number;
  };
  improvement: {
    renderCount: number;
    avgRenderTime: number;
    memoryUsage: number;
  };
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Stats Card Component
 */
function StatsCard({
  title,
  value,
  subtitle,
  color = 'blue',
  icon
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow';
  icon?: React.ReactNode;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium opacity-80">{title}</span>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <div className="mt-2">
        <span className="text-2xl font-bold">{value}</span>
        {subtitle && (
          <span className="ml-2 text-sm opacity-70">{subtitle}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Progress Bar Component
 */
function ProgressBar({
  value,
  max = 100,
  color = 'blue',
  showLabel = true
}: {
  value: number;
  max?: number;
  color?: 'blue' | 'green' | 'red' | 'yellow';
  showLabel?: boolean;
}) {
  const percentage = (value / max) * 100;

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500'
  };

  return (
    <div className="w-full">
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-xs text-gray-600 text-right">
          {percentage.toFixed(1)}%
        </div>
      )}
    </div>
  );
}

/**
 * Issue Badge Component
 */
function IssueBadge({ severity, count }: { severity: 'error' | 'warning' | 'info'; count: number }) {
  const colorClasses = {
    error: 'bg-red-100 text-red-800 border-red-300',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    info: 'bg-blue-100 text-blue-800 border-blue-300'
  };

  const icons = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${colorClasses[severity]}`}>
      <span>{icons[severity]}</span>
      <span>{count}</span>
    </span>
  );
}

/**
 * Component Card Component
 */
function ComponentCard({
  report,
  onClick,
  isSelected
}: {
  report: ComponentReport;
  onClick: () => void;
  isSelected: boolean;
}) {
  const severityColor = !report.isCompatible
    ? 'border-red-300 bg-red-50'
    : report.issues.length > 0
    ? 'border-yellow-300 bg-yellow-50'
    : 'border-green-300 bg-green-50';

  const statusEmoji = report.isCompatible ? '✅' : '❌';

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${severityColor} ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{statusEmoji}</span>
          <span className="font-medium">{report.name}</span>
        </div>
        <div className="flex gap-1">
          {report.issues.filter(i => i.severity === 'error').length > 0 && (
            <IssueBadge severity="error" count={report.issues.filter(i => i.severity === 'error').length} />
          )}
          {report.issues.filter(i => i.severity === 'warning').length > 0 && (
            <IssueBadge severity="warning" count={report.issues.filter(i => i.severity === 'warning').length} />
          )}
          {report.issues.filter(i => i.severity === 'info').length > 0 && (
            <IssueBadge severity="info" count={report.issues.filter(i => i.severity === 'info').length} />
          )}
        </div>
      </div>
      <div className="mt-1 text-xs text-gray-500 truncate">
        {report.path}
      </div>
    </div>
  );
}

/**
 * Issue Detail Component
 */
function IssueDetail({ issue }: { issue: ComponentIssue }) {
  const severityColors = {
    error: 'border-l-red-500 bg-red-50',
    warning: 'border-l-yellow-500 bg-yellow-50',
    info: 'border-l-blue-500 bg-blue-50'
  };

  const severityIcons = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return (
    <div className={`p-3 rounded border-l-4 ${severityColors[issue.severity]}`}>
      <div className="flex items-start gap-2">
        <span>{severityIcons[issue.severity]}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Line {issue.line}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              issue.severity === 'error' ? 'bg-red-200 text-red-800' :
              issue.severity === 'warning' ? 'bg-yellow-200 text-yellow-800' :
              'bg-blue-200 text-blue-800'
            }`}>
              {issue.severity.toUpperCase()}
            </span>
          </div>
          <p className="mt-1 text-sm">{issue.message}</p>
          {issue.suggestion && (
            <p className="mt-1 text-sm text-gray-600">
              💡 Suggestion: {issue.suggestion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Performance Comparison Card
 */
function PerformanceCard({ metrics }: { metrics: PerformanceMetrics }) {
  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <div className="p-4 bg-white rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">Performance Comparison</h3>

      <div className="space-y-4">
        {/* Render Count */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Render Count</span>
            <span className={metrics.improvement.renderCount > 0 ? 'text-green-600' : 'text-red-600'}>
              {formatPercent(metrics.improvement.renderCount)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-gray-100 rounded">
              <span className="text-gray-500">Before:</span> {metrics.beforeCompiler.renderCount}
            </div>
            <div className="p-2 bg-green-100 rounded">
              <span className="text-gray-500">After:</span> {metrics.afterCompiler.renderCount}
            </div>
          </div>
        </div>

        {/* Render Time */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Avg Render Time</span>
            <span className={metrics.improvement.avgRenderTime > 0 ? 'text-green-600' : 'text-red-600'}>
              {formatPercent(metrics.improvement.avgRenderTime)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-gray-100 rounded">
              <span className="text-gray-500">Before:</span> {metrics.beforeCompiler.avgRenderTime.toFixed(2)}ms
            </div>
            <div className="p-2 bg-green-100 rounded">
              <span className="text-gray-500">After:</span> {metrics.afterCompiler.avgRenderTime.toFixed(2)}ms
            </div>
          </div>
        </div>

        {/* Memory Usage */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Memory Usage</span>
            <span className={metrics.improvement.memoryUsage > 0 ? 'text-green-600' : 'text-red-600'}>
              {formatPercent(metrics.improvement.memoryUsage)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-gray-100 rounded">
              <span className="text-gray-500">Before:</span> {(metrics.beforeCompiler.memoryUsage / 1024).toFixed(2)}KB
            </div>
            <div className="p-2 bg-green-100 rounded">
              <span className="text-gray-500">After:</span> {(metrics.afterCompiler.memoryUsage / 1024).toFixed(2)}KB
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Toggle Switch Component
 */
function ToggleSwitch({
  enabled,
  onChange,
  label,
  description
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
      <div>
        <h4 className="font-medium">{label}</h4>
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>
      <button
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-gray-200'
        }`}
        onClick={() => onChange(!enabled)}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CompilerDiagnostics() {
  const [config, setConfig] = useState<ReactCompilerConfig | null>(null);
  const [components, setComponents] = useState<ComponentReport[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<ComponentReport | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scanTime, setScanTime] = useState(0);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load config
      const configValue = getConfigManager();
      setConfig(configValue);

      // Simulate component scan (in real implementation, this would call the scanner)
      const mockComponents: ComponentReport[] = [
        {
          name: 'UserProfile',
          path: 'src/components/UserProfile.tsx',
          isCompatible: true,
          issues: []
        },
        {
          name: 'Dashboard',
          path: 'src/components/Dashboard.tsx',
          isCompatible: false,
          issues: [
            {
              type: 'ref-misuse',
              message: 'Using ref.current is not supported by React Compiler',
              line: 42,
              severity: 'warning',
              suggestion: 'Use useState instead of ref for values that should trigger re-renders'
            }
          ]
        },
        {
          name: 'TaskList',
          path: 'src/components/TaskList.tsx',
          isCompatible: true,
          issues: [
            {
              type: 'side-effect',
              message: 'useEffect with external dependencies detected',
              line: 15,
              severity: 'info',
              suggestion: 'Ensure all dependencies are in the dependency array'
            }
          ]
        }
      ];

      setComponents(mockComponents);
      setScanTime(150);

      // Simulate performance metrics
      setPerformanceMetrics({
        beforeCompiler: {
          renderCount: 150,
          avgRenderTime: 12.5,
          memoryUsage: 2048
        },
        afterCompiler: {
          renderCount: 95,
          avgRenderTime: 8.2,
          memoryUsage: 1740
        },
        improvement: {
          renderCount: 36.7,
          avgRenderTime: 34.4,
          memoryUsage: 15.0
        }
      });

      setIsLoading(false);
    } catch (_error) {
      console.error('Failed to load data:', error);
      setIsLoading(false);
    }
  };

  const handleToggleCompiler = useCallback(async (enabled: boolean) => {
    const newConfig = getConfigManager();
    newConfig.enabled = enabled;
    setConfig(newConfig);

    // In real implementation, this would update environment or trigger rebuild
    console.log(`React Compiler ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  const handleExportReport = useCallback(() => {
    // Export logic would go here
    // Create a minimal scan result for the mock report
    const mockScanResult = {
      totalFiles: components.length,
      compatibleFiles: components.filter(c => c.isCompatible).length,
      incompatibleFiles: components.filter(c => !c.isCompatible).length,
      reports: [],
      summary: {
        byType: {},
        bySeverity: { low: 0, medium: 0, high: 0 }
      }
    };
    const report = generateCompatibilityReport(mockScanResult);
    console.log('Exporting report...', report);
  }, []);

  // Calculate summary stats
  const stats = {
    total: components.length,
    compatible: components.filter(c => c.isCompatible).length,
    incompatible: components.filter(c => !c.isCompatible).length,
    errors: components.reduce((sum, c) => sum + c.issues.filter(i => i.severity === 'error').length, 0),
    warnings: components.reduce((sum, c) => sum + c.issues.filter(i => i.severity === 'warning').length, 0),
    info: components.reduce((sum, c) => sum + c.issues.filter(i => i.severity === 'info').length, 0)
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Scanning components...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">React Compiler Diagnostics</h1>
          <p className="text-gray-600">
            Monitor compatibility, performance, and optimization opportunities
          </p>
        </div>

        {/* Main Toggle */}
        <div className="mb-6">
          <ToggleSwitch
            enabled={config?.enabled ?? false}
            onChange={handleToggleCompiler}
            label="React Compiler"
            description={config?.enabled ? 'React Compiler is enabled (20-40% less re-renders)' : 'React Compiler is disabled'}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Total Components"
            value={stats.total}
            color="blue"
            icon="📦"
          />
          <StatsCard
            title="Compatible"
            value={stats.compatible}
            subtitle={`of ${stats.total}`}
            color="green"
            icon="✅"
          />
          <StatsCard
            title="Incompatible"
            value={stats.incompatible}
            subtitle={`of ${stats.total}`}
            color="red"
            icon="❌"
          />
          <StatsCard
            title="Issues"
            value={stats.errors + stats.warnings + stats.info}
            subtitle={`🔴 ${stats.errors} 🟡 ${stats.warnings} 🔵 ${stats.info}`}
            color="yellow"
            icon="⚠️"
          />
        </div>

        {/* Progress Bar */}
        <div className="mb-6 p-4 bg-white rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Compatibility Rate</h3>
            <span className="text-sm text-gray-500">
              {((stats.compatible / stats.total) * 100).toFixed(1)}%
            </span>
          </div>
          <ProgressBar
            value={stats.compatible}
            max={stats.total}
            color={stats.compatible / stats.total > 0.8 ? 'green' : stats.compatible / stats.total > 0.5 ? 'yellow' : 'red'}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Component List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Components</h3>
                <span className="text-xs text-gray-500">Scan time: {scanTime}ms</span>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {components.map((component, index) => (
                  <ComponentCard
                    key={`${component.name}-${index}`}
                    report={component}
                    onClick={() => setSelectedComponent(component)}
                    isSelected={selectedComponent?.name === component.name}
                  />
                ))}
              </div>

              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={loadData}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Re-scan Components
                </button>
              </div>
            </div>
          </div>

          {/* Details Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  {selectedComponent ? selectedComponent.name : 'Select a component'}
                </h3>
                <button
                  onClick={handleExportReport}
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                >
                  Export Report
                </button>
              </div>

              {selectedComponent ? (
                <div className="space-y-4">
                  {/* Component Info */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm">
                      <span className="text-gray-500">Path: </span>
                      <code className="text-blue-600">{selectedComponent.path}</code>
                    </div>
                    <div className="text-sm mt-1">
                      <span className="text-gray-500">Status: </span>
                      <span className={selectedComponent.isCompatible ? 'text-green-600' : 'text-red-600'}>
                        {selectedComponent.isCompatible ? 'Compatible' : 'Incompatible'}
                      </span>
                    </div>
                  </div>

                  {/* Issues */}
                  {selectedComponent.issues.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Issues ({selectedComponent.issues.length})</h4>
                      <div className="space-y-2">
                        {selectedComponent.issues.map((issue, index) => (
                          <IssueDetail key={index} issue={issue} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <span className="text-2xl">✅</span>
                      <p className="mt-2 text-green-700">No issues found!</p>
                    </div>
                  )}

                  {/* Performance Comparison */}
                  {performanceMetrics && (
                    <div className="mt-4">
                      <PerformanceCard metrics={performanceMetrics} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <span className="text-4xl">👈</span>
                  <p className="mt-2">Select a component from the list to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompilerDiagnostics;
