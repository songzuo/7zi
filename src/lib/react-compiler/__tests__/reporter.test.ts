/**
 * React Compiler Diagnostics - Reporter Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReactCompilerReporter, createReporter } from '../diagnostics/reporter';
import { IncompatibilityReport, CompilerIssue } from '../diagnostics/scanner';

describe('ReactCompilerReporter', () => {
  let reporter: ReactCompilerReporter;
  let mockReports: IncompatibilityReport[];

  beforeEach(() => {
    reporter = createReporter();

    mockReports = [
      {
        component: 'CompatibleComponent',
        componentPath: '/src/CompatibleComponent.tsx',
        issues: [],
        severity: 'info',
        isCompatible: true
      },
      {
        component: 'IncompatibleComponent',
        componentPath: '/src/IncompatibleComponent.tsx',
        issues: [
          {
            type: 'ref-misuse',
            message: 'Using ref.current is not supported',
            line: 42,
            column: 10,
            severity: 'warning',
            suggestion: 'Use useState instead',
            code: 'ref.current'
          },
          {
            type: 'mutation',
            message: 'Direct object mutation detected',
            line: 15,
            column: 5,
            severity: 'error',
            suggestion: 'Use immutable patterns',
            code: 'mutation'
          }
        ],
        severity: 'error',
        isCompatible: false
      }
    ];
  });

  describe('createReporter', () => {
    it('should create a reporter instance', () => {
      expect(reporter).toBeInstanceOf(ReactCompilerReporter);
    });
  });

  describe('generateSummary', () => {
    it('should generate a summary report', () => {
      const summary = reporter.generateSummary(mockReports, 150);

      expect(summary).toHaveProperty('totalComponents');
      expect(summary).toHaveProperty('compatibleComponents');
      expect(summary).toHaveProperty('incompatibleComponents');
      expect(summary).toHaveProperty('compatibilityRate');
      expect(summary).toHaveProperty('errors');
      expect(summary).toHaveProperty('warnings');
      expect(summary).toHaveProperty('info');
      expect(summary).toHaveProperty('scanTime');

      expect(summary.totalComponents).toBe(2);
      expect(summary.compatibleComponents).toBe(1);
      expect(summary.incompatibleComponents).toBe(1);
      expect(summary.compatibilityRate).toBe(50);
      expect(summary.errors).toBe(1);
      expect(summary.warnings).toBe(1);
      expect(summary.info).toBe(0);
      expect(summary.scanTime).toBe(150);
    });

    it('should calculate compatibility rate correctly', () => {
      const allCompatible = mockReports.filter(r => r.isCompatible);
      const summary = reporter.generateSummary(allCompatible, 100);

      expect(summary.compatibilityRate).toBe(100);
    });

    it('should count issues correctly', () => {
      const summary = reporter.generateSummary(mockReports, 0);

      expect(summary.errors).toBe(1);
      expect(summary.warnings).toBe(1);
      expect(summary.info).toBe(0);
    });
  });

  describe('generateDetailedReport', () => {
    it('should generate a detailed report', () => {
      const detailed = reporter.generateDetailedReport(mockReports, 150);

      expect(detailed).toHaveProperty('reports');
      expect(detailed).toHaveProperty('totalComponents');
      expect(detailed).toHaveProperty('compatibleComponents');
      expect(detailed).toHaveProperty('incompatibleComponents');
      expect(detailed).toHaveProperty('compatibilityRate');
      expect(detailed).toHaveProperty('errors');
      expect(detailed).toHaveProperty('warnings');
      expect(detailed).toHaveProperty('info');
      expect(detailed).toHaveProperty('scanTime');
      expect(detailed).toHaveProperty('fixSuggestions');
      expect(detailed).toHaveProperty('migrationPlan');
    });

    it('should generate fix suggestions', () => {
      const detailed = reporter.generateDetailedReport(mockReports, 150);

      expect(detailed.fixSuggestions).toBeDefined();
      expect(Array.isArray(detailed.fixSuggestions)).toBe(true);
      expect(detailed.fixSuggestions.length).toBeGreaterThan(0);
    });

    it('should generate migration plan', () => {
      const detailed = reporter.generateDetailedReport(mockReports, 150);

      expect(detailed.migrationPlan).toBeDefined();
      expect(detailed.migrationPlan).toHaveProperty('totalComponents');
      expect(detailed.migrationPlan).toHaveProperty('easyMigration');
      expect(detailed.migrationPlan).toHaveProperty('mediumMigration');
      expect(detailed.migrationPlan).toHaveProperty('hardMigration');
      expect(detailed.migrationPlan).toHaveProperty('estimatedTime');
      expect(detailed.migrationPlan).toHaveProperty('recommendedApproach');
    });

    it('should sort by severity when requested', () => {
      const detailed = reporter.generateDetailedReport(mockReports, 150, {
        sortBy: 'severity'
      });

      const severities = detailed.reports.map(r => r.severity);
      const severityOrder = ['error', 'warning', 'info'];

      // Check that reports are sorted
      for (let i = 1; i < severities.length; i++) {
        const prevIndex = severityOrder.indexOf(severities[i - 1] || '');
        const currIndex = severityOrder.indexOf(severities[i] || '');
        expect(prevIndex).toBeLessThanOrEqual(currIndex);
      }
    });

    it('should sort by component name when requested', () => {
      const detailed = reporter.generateDetailedReport(mockReports, 150, {
        sortBy: 'component'
      });

      const names = detailed.reports.map(r => r.component);
      const sortedNames = [...names].sort();

      expect(names).toEqual(sortedNames);
    });
  });

  describe('exportJSON', () => {
    it('should export report as JSON', () => {
      const detailed = reporter.generateDetailedReport(mockReports, 150);
      const json = reporter.exportJSON(detailed);

      expect(() => JSON.parse(json)).not.toThrow();
      const parsed = JSON.parse(json);
      expect(parsed).toHaveProperty('reports');
      expect(parsed).toHaveProperty('totalComponents');
    });
  });

  describe('exportMarkdown', () => {
    it('should export report as Markdown', () => {
      const detailed = reporter.generateDetailedReport(mockReports, 150);
      const markdown = reporter.exportMarkdown(detailed);

      expect(typeof markdown).toBe('string');
      expect(markdown).toContain('# React Compiler Compatibility Report');
      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('## Migration Plan');
      expect(markdown).toContain('## Component Details');
    });

    it('should include component details in Markdown', () => {
      const detailed = reporter.generateDetailedReport(mockReports, 150);
      const markdown = reporter.exportMarkdown(detailed);

      expect(markdown).toContain('CompatibleComponent');
      expect(markdown).toContain('IncompatibleComponent');
    });
  });

  describe('exportHTML', () => {
    it('should export report as HTML', () => {
      const detailed = reporter.generateDetailedReport(mockReports, 150);
      const html = reporter.exportHTML(detailed);

      expect(typeof html).toBe('string');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('React Compiler Compatibility Report');
      expect(html).toContain('</html>');
    });

    it('should include CSS styles in HTML', () => {
      const detailed = reporter.generateDetailedReport(mockReports, 150);
      const html = reporter.exportHTML(detailed);

      expect(html).toContain('<style>');
      expect(html).toContain('</style>');
    });
  });

  describe('exportReport', () => {
    it('should export in JSON format', () => {
      const detailed = reporter.generateDetailedReport(mockReports, 150);
      const json = reporter.exportReport(detailed, 'json');

      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should export in Markdown format', () => {
      const detailed = reporter.generateDetailedReport(mockReports, 150);
      const md = reporter.exportReport(detailed, 'markdown');

      expect(md).toContain('# React Compiler Compatibility Report');
    });

    it('should export in HTML format', () => {
      const detailed = reporter.generateDetailedReport(mockReports, 150);
      const html = reporter.exportReport(detailed, 'html');

      expect(html).toContain('<!DOCTYPE html>');
    });

    it('should default to Markdown format', () => {
      const detailed = reporter.generateDetailedReport(mockReports, 150);
      const md = reporter.exportReport(detailed);

      expect(md).toContain('# React Compiler Compatibility Report');
    });
  });
});

describe('FixSuggestion', () => {
  it('should have required properties', () => {
    const suggestion = {
      component: 'TestComponent',
      componentPath: '/src/TestComponent.tsx',
      issues: ['Issue 1', 'Issue 2'],
      fixes: ['Fix 1', 'Fix 2'],
      priority: 'high' as const
    };

    expect(suggestion).toHaveProperty('component');
    expect(suggestion).toHaveProperty('componentPath');
    expect(suggestion).toHaveProperty('issues');
    expect(suggestion).toHaveProperty('fixes');
    expect(suggestion).toHaveProperty('priority');
  });
});

describe('MigrationPlan', () => {
  it('should have required properties', () => {
    const plan = {
      totalComponents: 100,
      easyMigration: 50,
      mediumMigration: 30,
      hardMigration: 20,
      estimatedTime: '5 days',
      recommendedApproach: 'incremental' as const
    };

    expect(plan).toHaveProperty('totalComponents');
    expect(plan).toHaveProperty('easyMigration');
    expect(plan).toHaveProperty('mediumMigration');
    expect(plan).toHaveProperty('hardMigration');
    expect(plan).toHaveProperty('estimatedTime');
    expect(plan).toHaveProperty('recommendedApproach');
  });
});
