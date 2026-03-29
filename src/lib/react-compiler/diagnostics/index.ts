/**
 * React Compiler Diagnostics - Main Entry Point
 *
 * React Compiler 兼容性验证工具主类
 * 提供组件扫描、兼容性检查、报告生成等功能
 */

import { ComponentScanner, IncompatibilityReport, CompilerIssue, ScanResult } from './scanner';
import { MigrationGuide, generateMigrationGuide } from './migration-guide';
import { CompatibilityReport, generateCompatibilityReport } from './reporter';
import * as path from 'path';
import { glob } from 'glob';

/**
 * React Compiler 兼容性诊断工具
 */
export class ReactCompilerDiagnostics {
  private projectRoot: string;
  private scanner: ComponentScanner;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.scanner = new ComponentScanner(this.projectRoot);
  }

  /**
   * 扫描不兼容的组件
   * @param patterns glob 模式数组，默认扫描所有组件
   * @returns 扫描结果
   */
  async scanIncompatibleComponents(patterns?: string[]): Promise<ScanResult> {
    if (patterns && patterns.length > 0) {
      // 使用自定义模式扫描
      return this.scanWithPatterns(patterns);
    }
    // 扫描所有组件
    return this.scanner.scanAllComponents();
  }

  /**
   * 使用自定义 glob 模式扫描
   */
  private async scanWithPatterns(patterns: string[]): Promise<ScanResult> {
    const allFiles: string[] = [];

    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: this.projectRoot,
        ignore: [
          'node_modules/**',
          '**/*.test.tsx',
          '**/*.spec.tsx',
          '**/__tests__/**',
          '**/*.test.ts',
          '**/*.spec.ts',
          '**/dist/**',
          '**/build/**',
        ],
      });
      allFiles.push(...files.map(f => path.join(this.projectRoot, f)));
    }

    // 去重
    const uniqueFiles = Array.from(new Set(allFiles));

    const reports: IncompatibilityReport[] = [];
    for (const file of uniqueFiles) {
      const report = await this.scanner.scanFile(file);
      reports.push(report);
    }

    return {
      totalFiles: uniqueFiles.length,
      compatibleFiles: reports.filter(r => r.canCompile).length,
      incompatibleFiles: reports.filter(r => !r.canCompile).length,
      reports,
      summary: this.calculateSummary(reports),
    };
  }

  /**
   * 检查单个组件
   * @param componentPath 组件文件路径（相对或绝对）
   * @returns 组件兼容性报告
   */
  async checkComponent(componentPath: string): Promise<IncompatibilityReport> {
    const fullPath = path.isAbsolute(componentPath)
      ? componentPath
      : path.join(this.projectRoot, componentPath);

    return this.scanner.scanFile(fullPath);
  }

  /**
   * 生成兼容性报告
   * @param scanResult 扫描结果
   * @param options 报告选项
   * @returns 兼容性报告
   */
  generateReport(
    scanResult?: ScanResult,
    options: {
      format?: 'json' | 'markdown' | 'html';
      includeDetails?: boolean;
      includeMigrationGuide?: boolean;
    } = {}
  ): CompatibilityReport {
    const { format = 'json', includeDetails = true, includeMigrationGuide = false } = options;

    // 如果没有提供扫描结果，先执行扫描
    const result = scanResult || this.scanIncompatibleComponents().then(r => r);

    // 返回报告生成器的结果
    return generateCompatibilityReport(result, {
      format,
      includeDetails,
      includeMigrationGuide,
    });
  }

  /**
   * 生成迁移建议
   * @param scanResult 扫描结果
   * @returns 迁移建议
   */
  async getMigrationGuide(scanResult?: ScanResult): Promise<MigrationGuide> {
    const result = scanResult || await this.scanIncompatibleComponents();
    return generateMigrationGuide(result);
  }

  /**
   * 获取特定类型的兼容性问题
   * @param type 问题类型
   * @returns 具有该类型问题的组件列表
   */
  async getIssuesByType(type: 'unsupported-pattern' | 'side-effect' | 'performance-warning' | 'error'): Promise<IncompatibilityReport[]> {
    const scanResult = await this.scanIncompatibleComponents();
    return scanResult.reports.filter(report =>
      report.issues.some(issue => issue.type === type)
    );
  }

  /**
   * 获取特定严重程度的问题
   * @param severity 严重程度
   * @returns 具有该严重程度问题的组件列表
   */
  async getIssuesBySeverity(severity: 'low' | 'medium' | 'high'): Promise<IncompatibilityReport[]> {
    const scanResult = await this.scanIncompatibleComponents();
    return scanResult.reports.filter(report =>
      report.issues.some(issue => issue.severity === severity)
    );
  }

  /**
   * 检查组件是否可以使用 React Compiler
   * @param componentPath 组件路径
   * @returns 是否可以使用
   */
  async isComponentCompilable(componentPath: string): Promise<boolean> {
    const report = await this.checkComponent(componentPath);
    return report.canCompile;
  }

  /**
   * 获取高优先级修复建议
   * @returns 高优先级问题列表
   */
  async getHighPriorityFixes(): Promise<Array<{
    filePath: string;
    issues: CompilerIssue[];
  }>> {
    const scanResult = await this.scanIncompatibleComponents();
    const highPriorityReports = scanResult.reports.filter(report =>
      report.issues.some(issue => issue.severity === 'high')
    );

    return highPriorityReports.map(report => ({
      filePath: report.filePath,
      issues: report.issues.filter(issue => issue.severity === 'high'),
    }));
  }

  /**
   * 计算扫描摘要
   */
  private calculateSummary(reports: IncompatibilityReport[]): ScanResult['summary'] {
    const byType: Record<string, number> = {};
    const bySeverity: Record<'low' | 'medium' | 'high', number> = {
      low: 0,
      medium: 0,
      high: 0,
    };

    for (const report of reports) {
      for (const issue of report.issues) {
        byType[issue.type] = (byType[issue.type] || 0) + 1;
        bySeverity[issue.severity]++;
      }
    }

    return { byType, bySeverity };
  }

  /**
   * 导出报告到文件
   * @param scanResult 扫描结果
   * @param outputPath 输出文件路径
   * @param format 格式（json、markdown）
   */
  async exportReport(
    scanResult: ScanResult,
    outputPath: string,
    format: 'json' | 'markdown' = 'json'
  ): Promise<void> {
    const report = this.generateReport(scanResult, { format });
    const { promises: fs } = await import('fs');
    const { reportToString } = await import('./reporter');

    let content: string;

    if (format === 'json') {
      content = JSON.stringify(report, null, 2);
    } else {
      content = reportToString(report);
    }

    await fs.writeFile(outputPath, content, 'utf-8');
  }

  /**
   * 获取项目整体兼容性统计
   */
  async getProjectStatistics(): Promise<{
    totalComponents: number;
    compatiblePercentage: number;
    incompatiblePercentage: number;
    averageIssuesPerComponent: number;
    mostCommonIssue: { type: string; count: number };
  }> {
    const scanResult = await this.scanIncompatibleComponents();
    const totalIssues = scanResult.reports.reduce((sum, r) => sum + r.issues.length, 0);

    // 找出最常见的问题
    let maxCount = 0;
    let mostCommonType = '';
    for (const [type, count] of Object.entries(scanResult.summary.byType)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonType = type;
      }
    }

    return {
      totalComponents: scanResult.totalFiles,
      compatiblePercentage: (scanResult.compatibleFiles / scanResult.totalFiles) * 100,
      incompatiblePercentage: (scanResult.incompatibleFiles / scanResult.totalFiles) * 100,
      averageIssuesPerComponent: totalIssues / scanResult.totalFiles,
      mostCommonIssue: {
        type: mostCommonType,
        count: maxCount,
      },
    };
  }
}

/**
 * 便捷函数 - 快速扫描项目
 */
export async function quickScan(projectRoot?: string): Promise<ScanResult> {
  const diagnostics = new ReactCompilerDiagnostics(projectRoot);
  return diagnostics.scanIncompatibleComponents();
}

/**
 * 便捷函数 - 检查单个组件
 */
export async function quickCheck(componentPath: string): Promise<IncompatibilityReport> {
  const diagnostics = new ReactCompilerDiagnostics();
  return diagnostics.checkComponent(componentPath);
}
