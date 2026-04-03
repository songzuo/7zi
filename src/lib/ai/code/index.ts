/**
 * @fileoverview 智能代码生成增强系统
 * @description v1.10.0 核心功能 - 代码补全、审查、Bug检测、修复建议、代码解释
 */

// 核心模块导出
export * from './code-analyzer'
export * from './code-completer'
export * from './code-reviewer'
export * from './bug-detector'
export * from './fix-suggester'
export * from './code-explainer'
export * from './types'

/**
 * 代码生成增强系统主类
 */
import { CodeAnalyzer } from './code-analyzer'
import { CodeCompleter } from './code-completer'
import { CodeReviewer } from './code-reviewer'
import { BugDetector } from './bug-detector'
import { FixSuggester } from './fix-suggester'
import { CodeExplainer } from './code-explainer'
import type { SupportedLanguage, CodeRange } from './types'

export interface CodeEnhancementConfig {
  /** 支持的语言 */
  languages: string[]
  /** 是否启用缓存 */
  enableCache: boolean
  /** 模型偏好 */
  modelPreference: 'speed' | 'quality' | 'cost'
  /** 最大 Token 数 */
  maxTokens: number
  /** 是否启用详细日志 */
  verbose: boolean
}

export const DEFAULT_CONFIG: CodeEnhancementConfig = {
  languages: ['typescript', 'python', 'go', 'rust'],
  enableCache: true,
  modelPreference: 'quality',
  maxTokens: 4096,
  verbose: false,
}

/**
 * 代码增强主类
 * 整合所有代码处理功能
 */
export class CodeEnhancer {
  private analyzer: CodeAnalyzer
  private completer: CodeCompleter
  private reviewer: CodeReviewer
  private bugDetector: BugDetector
  private fixSuggester: FixSuggester
  private explainer: CodeExplainer
  private config: CodeEnhancementConfig

  constructor(config: Partial<CodeEnhancementConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    
    // 初始化各个模块
    this.analyzer = new CodeAnalyzer(this.config)
    this.completer = new CodeCompleter(this.config)
    this.reviewer = new CodeReviewer(this.config)
    this.bugDetector = new BugDetector(this.config)
    this.fixSuggester = new FixSuggester(this.config)
    this.explainer = new CodeExplainer(this.config)
  }

  /**
   * 分析代码
   */
  async analyze(code: string, language: SupportedLanguage) {
    return this.analyzer.analyze(code, language)
  }

  /**
   * 代码补全
   */
  async complete(
    code: string,
    position: { line: number; column: number },
    language: SupportedLanguage
  ) {
    return this.completer.complete(code, position, language)
  }

  /**
   * 代码审查
   */
  async review(code: string, language: SupportedLanguage) {
    return this.reviewer.review(code, language)
  }

  /**
   * Bug 检测
   */
  async detectBugs(code: string, language: SupportedLanguage) {
    return this.bugDetector.detect(code, language)
  }

  /**
   * 修复建议
   */
  async suggestFixes(
    code: string,
    issues: Array<{ 
      type: string
      message: string
      location: CodeRange
      severity?: string 
    }>,
    language: SupportedLanguage
  ) {
    return this.fixSuggester.suggest(code, issues, language)
  }

  /**
   * 代码解释
   */
  async explain(code: string, language: SupportedLanguage) {
    return this.explainer.explain(code, language)
  }

  /**
   * 一站式代码分析
   * 包含分析、审查、Bug检测和修复建议
   */
  async fullAnalysis(code: string, language: SupportedLanguage) {
    // 并行执行分析和检测
    const [analysis, review, bugs] = await Promise.all([
      this.analyzer.analyze(code, language),
      this.reviewer.review(code, language),
      this.bugDetector.detect(code, language),
    ])

    // 收集所有问题
    const allIssues = [
      ...review.issues.map(i => ({
        type: i.type,
        severity: i.severity,
        message: i.message,
        location: i.location,
      })),
      ...bugs.map(b => ({
        type: 'bug',
        severity: b.severity,
        message: b.message,
        location: b.location,
      })),
    ]

    // 生成修复建议
    const fixes = await this.fixSuggester.suggest(code, allIssues, language)

    return {
      analysis,
      review,
      bugs,
      fixes,
      summary: {
        totalIssues: allIssues.length,
        criticalIssues: allIssues.filter(i => i.severity === 'critical').length,
        highIssues: allIssues.filter(i => i.severity === 'high').length,
        mediumIssues: allIssues.filter(i => i.severity === 'medium').length,
        lowIssues: allIssues.filter(i => i.severity === 'low').length,
      },
    }
  }
}

// 默认实例
export const codeEnhancer = new CodeEnhancer()
