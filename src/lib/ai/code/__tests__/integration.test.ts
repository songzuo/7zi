/**
 * @fileoverview AI Code 智能系统集成测试
 * @description 使用真实代码样本测试完整的 AI pipeline
 */

import { describe, it, expect, beforeAll } from 'vitest'
import {
  CodeAnalyzer,
  CodeReviewer,
  BugDetector,
  FixSuggester,
  CodeExplainer,
  CodeEnhancer,
  type SupportedLanguage,
} from '../index'

describe('AI Code 智能系统集成测试', () => {
  let analyzer: CodeAnalyzer
  let reviewer: CodeReviewer
  let bugDetector: BugDetector
  let fixSuggester: FixSuggester
  let explainer: CodeExplainer
  let enhancer: CodeEnhancer

  beforeAll(() => {
    // 初始化各个模块
    const config = {
      languages: ['typescript', 'javascript', 'python', 'go', 'rust'],
      enableCache: false, // 测试时禁用缓存
      modelPreference: 'quality' as const,
      maxTokens: 4096,
      verbose: false,
    }

    analyzer = new CodeAnalyzer(config)
    reviewer = new CodeReviewer(config)
    bugDetector = new BugDetector(config)
    fixSuggester = new FixSuggester(config)
    explainer = new CodeExplainer(config)
    enhancer = new CodeEnhancer(config)
  })

  describe('场景1: 完整分析流程', () => {
    const sampleCode = `
function calculateSum(arr: number[]): number {
  let sum = 0;
  for (const num of arr) {
    sum += num;
  }
  return sum;
}
`

    it('应该串联使用 code-analyzer + code-reviewer + bug-detector', async () => {
      const language: SupportedLanguage = 'typescript'

      // 步骤1: 代码分析
      const analysis = await analyzer.analyze(sampleCode, language)
      expect(analysis).toBeDefined()
      expect(analysis.language).toBe(language)
      expect(analysis.complexity).toBeDefined()
      expect(analysis.stats).toBeDefined()

      // 步骤2: 代码审查
      const review = await reviewer.review(sampleCode, language)
      expect(review).toBeDefined()
      expect(review.issues).toBeInstanceOf(Array)
      expect(review.score).toBeDefined()

      // 步骤3: Bug 检测
      const bugs = await bugDetector.detect(sampleCode, language)
      expect(bugs).toBeInstanceOf(Array)

      // 验证结果一致性
      console.log('场景1 - 分析结果:', {
        complexity: analysis.complexity,
        stats: analysis.stats,
        reviewScore: review.score,
        issuesCount: review.issues.length,
        bugsCount: bugs.length,
      })
    })

    it('应该使用 CodeEnhancer.fullAnalysis 进行一站式分析', async () => {
      const language: SupportedLanguage = 'typescript'

      const result = await enhancer.fullAnalysis(sampleCode, language)

      expect(result).toBeDefined()
      expect(result.analysis).toBeDefined()
      expect(result.review).toBeDefined()
      expect(result.bugs).toBeInstanceOf(Array)
      expect(result.fixes).toBeDefined()
      expect(result.summary).toBeDefined()

      // 验证汇总统计
      expect(result.summary.totalIssues).toBeGreaterThanOrEqual(0)
      expect(result.summary.criticalIssues).toBeGreaterThanOrEqual(0)

      console.log('场景1 - 一站式分析结果:', {
        summary: result.summary,
        analysisComplexity: result.analysis.complexity,
        reviewScore: result.review.score,
      })
    })
  })

  describe('场景2: 实际项目中的代码片段', () => {
    const realCode = `
/**
 * Helper function to format raw bytes as UUID v4 string
 * @param {Uint8Array | Buffer} bytes - 16 bytes of random data
 * @returns {string} UUID v4 formatted string
 * @private
 */
function formatUUIDv4(bytes: Uint8Array | Buffer): string {
  const hex = bytes.toString('hex')
  const variant = parseInt(hex[16], 16)
  const variantChar = [8, 9, 10, 11].includes(variant) ? hex[16] : (variant | 0x8).toString(16)
  return \`\${hex.slice(0, 8)}-\${hex.slice(8, 12)}-4\${hex.slice(13, 16)}-\${variantChar}\${hex.slice(17, 20)}-\${hex.slice(20, 32)}\`
}

/**
 * Generate a unique ID (UUID v4)
 * @param {string} prefix - Optional prefix
 * @returns {string} Unique ID
 */
export function generateId(prefix: string = ''): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    const uuid = crypto.randomUUID()
    return prefix ? \`\${prefix}-\${uuid}\` : uuid
  }

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    const uuid = formatUUIDv4(bytes)
    return prefix ? \`\${prefix}-\${uuid}\` : uuid
  }

  const hex = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
  return prefix ? \`\${prefix}-\${hex}\` : hex
}
`

    it('应该对真实代码运行完整的 AI pipeline', async () => {
      const language: SupportedLanguage = 'typescript'

      // 完整 pipeline
      const [analysis, review, bugs] = await Promise.all([
        analyzer.analyze(realCode, language),
        reviewer.review(realCode, language),
        bugDetector.detect(realCode, language),
      ])

      // 验证分析结果
      expect(analysis).toBeDefined()
      expect(analysis.stats.functions).toBeGreaterThan(0)
      expect(analysis.complexity.cyclomatic).toBeGreaterThan(0)

      // 验证审查结果
      expect(review).toBeDefined()
      expect(review.score.overall).toBeGreaterThan(0)
      expect(review.score.readability).toBeGreaterThan(0)

      // 验证 Bug 检测
      expect(bugs).toBeInstanceOf(Array)

      console.log('场景2 - 真实代码分析结果:', {
        stats: analysis.stats,
        complexity: analysis.complexity,
        reviewScore: review.score,
        issuesCount: review.issues.length,
        bugsCount: bugs.length,
        dependencies: analysis.dependencies,
        exports: analysis.exports,
      })
    })

    it('应该生成修复建议', async () => {
      const language: SupportedLanguage = 'typescript'

      const review = await reviewer.review(realCode, language)
      const bugs = await bugDetector.detect(realCode, language)

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

      if (allIssues.length > 0) {
        const fixes = await fixSuggester.suggest(realCode, allIssues, language)

        expect(fixes).toBeDefined()
        expect(fixes).toBeInstanceOf(Array)

        console.log('场景2 - 修复建议:', {
          issuesCount: allIssues.length,
          fixesCount: fixes.length,
          sampleFix: fixes[0],
        })
      } else {
        console.log('场景2 - 未发现问题，跳过修复建议生成')
      }
    })
  })

  describe('场景3: 修复建议生成', () => {
    const buggyCode = `
function divide(a, b) {
  try {
    return a / b;
  } catch (e) {}
}
`

    it('应该检测到除零错误并生成修复建议', async () => {
      const language: SupportedLanguage = 'typescript'

      // 步骤1: Bug 检测
      const bugs = await bugDetector.detect(buggyCode, language)
      expect(bugs).toBeInstanceOf(Array)

      console.log('场景3 - 检测到的 Bug:', bugs)

      // 步骤2: 生成修复建议
      if (bugs.length > 0) {
        const issues = bugs.map(b => ({
          type: 'bug',
          severity: b.severity,
          message: b.message,
          location: b.location,
        }))

        const fixes = await fixSuggester.suggest(buggyCode, issues, language)

        expect(fixes).toBeDefined()
        expect(fixes).toBeInstanceOf(Array)

        // 验证修复建议的结构
        if (fixes.length > 0) {
          const fix = fixes[0]
          expect(fix.id).toBeDefined()
          expect(fix.description).toBeDefined()
          expect(fix.changes).toBeInstanceOf(Array)
          expect(fix.riskLevel).toBeDefined()
          expect(['safe', 'moderate', 'risky']).toContain(fix.riskLevel)

          console.log('场景3 - 修复建议:', {
            bugCount: bugs.length,
            fixCount: fixes.length,
            sampleFix: {
              id: fix.id,
              description: fix.description,
              riskLevel: fix.riskLevel,
              estimatedSuccessRate: fix.estimatedSuccessRate,
              changesCount: fix.changes.length,
            },
          })
        }
      }
    })

    it('应该使用 CodeEnhancer 完整流程处理有 Bug 的代码', async () => {
      const language: SupportedLanguage = 'typescript'

      const result = await enhancer.fullAnalysis(buggyCode, language)

      expect(result).toBeDefined()
      expect(result.bugs).toBeInstanceOf(Array)
      expect(result.fixes).toBeDefined()

      console.log('场景3 - 完整分析结果:', {
        bugsCount: result.bugs.length,
        fixesCount: result.fixes.length,
        summary: result.summary,
      })
    })
  })

  describe('场景4: 代码解释', () => {
    const sampleCode = `
function calculateSum(arr: number[]): number {
  let sum = 0;
  for (const num of arr) {
    sum += num;
  }
  return sum;
}
`

    it('应该生成代码解释', async () => {
      const language: SupportedLanguage = 'typescript'

      const explanation = await explainer.explain(sampleCode, language)

      expect(explanation).toBeDefined()
      expect(explanation.summary).toBeDefined()
      expect(explanation.details).toBeInstanceOf(Array)
      expect(explanation.concepts).toBeInstanceOf(Array)
      expect(explanation.complexity).toBeDefined()
      expect(explanation.complexity.time).toBeDefined()
      expect(explanation.complexity.space).toBeDefined()

      console.log('场景4 - 代码解释:', {
        summary: explanation.summary,
        detailsCount: explanation.details.length,
        conceptsCount: explanation.concepts.length,
        complexity: explanation.complexity,
      })
    })

    it('应该包含代码片段解释', async () => {
      const language: SupportedLanguage = 'typescript'

      const explanation = await explainer.explain(sampleCode, language)

      expect(explanation.snippetExplanations).toBeInstanceOf(Array)

      if (explanation.snippetExplanations.length > 0) {
        const snippet = explanation.snippetExplanations[0]
        expect(snippet.range).toBeDefined()
        expect(snippet.range.start).toBeDefined()
        expect(snippet.range.end).toBeDefined()
        expect(snippet.explanation).toBeDefined()

        console.log('场景4 - 代码片段解释示例:', {
          range: snippet.range,
          explanation: snippet.explanation,
        })
      }
    })
  })

  describe('集成测试: 端到端流程', () => {
    const complexCode = `
interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
}

class UserService {
  private users: Map<string, User> = new Map();

  async createUser(userData: Omit<User, 'id'>): Promise<User> {
    const id = this.generateId();
    const user: User = { id, ...userData };
    this.users.set(id, user);
    return user;
  }

  async getUser(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;

    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  async findUsersByEmail(email: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      user => user.email === email
    );
  }
}
`

    it('应该执行完整的端到端分析流程', async () => {
      const language: SupportedLanguage = 'typescript'

      // 使用 CodeEnhancer 进行完整分析
      const result = await enhancer.fullAnalysis(complexCode, language)

      // 验证所有组件
      expect(result.analysis).toBeDefined()
      expect(result.review).toBeDefined()
      expect(result.bugs).toBeInstanceOf(Array)
      expect(result.fixes).toBeDefined()
      expect(result.summary).toBeDefined()

      // 验证分析结果
      expect(result.analysis.stats.classes).toBe(1)
      expect(result.analysis.stats.functions).toBeGreaterThan(0)

      // 验证评分
      expect(result.review.score.overall).toBeGreaterThan(0)
      expect(result.review.score.maintainability).toBeGreaterThan(0)

      console.log('端到端流程 - 完整结果:', {
        analysis: {
          complexity: result.analysis.complexity,
          stats: result.analysis.stats,
        },
        review: {
          score: result.review.score,
          issuesCount: result.review.issues.length,
        },
        bugs: {
          count: result.bugs.length,
        },
        fixes: {
          count: result.fixes.length,
        },
        summary: result.summary,
      })
    })

    it('应该生成代码解释', async () => {
      const language: SupportedLanguage = 'typescript'

      const explanation = await explainer.explain(complexCode, language)

      expect(explanation).toBeDefined()
      expect(explanation.summary).toBeDefined()
      expect(explanation.details.length).toBeGreaterThan(0)
      expect(explanation.concepts.length).toBeGreaterThan(0)

      console.log('端到端流程 - 代码解释:', {
        summary: explanation.summary,
        details: explanation.details,
        concepts: explanation.concepts,
        complexity: explanation.complexity,
      })
    })
  })

  describe('性能测试: 大型代码分析', () => {
    const largeCode = `
// 生成一个较大的代码样本用于性能测试
interface Config {
  timeout: number;
  retries: number;
  debug: boolean;
}

class HttpClient {
  private config: Config;
  private baseUrl: string;

  constructor(baseUrl: string, config: Partial<Config> = {}) {
    this.baseUrl = baseUrl;
    this.config = {
      timeout: 5000,
      retries: 3,
      debug: false,
      ...config,
    };
  }

  async get<T>(url: string): Promise<T> {
    const response = await fetch(\`\${this.baseUrl}\${url}\`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.json();
  }

  async post<T>(url: string, data: unknown): Promise<T> {
    const response = await fetch(\`\${this.baseUrl}\${url}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async put<T>(url: string, data: unknown): Promise<T> {
    const response = await fetch(\`\${this.baseUrl}\${url}\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async delete<T>(url: string): Promise<T> {
    const response = await fetch(\`\${this.baseUrl}\${url}\`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.json();
  }

  private async request<T>(
    method: string,
    url: string,
    body?: unknown
  ): Promise<T> {
    const startTime = Date.now();
    let attempt = 0;

    while (attempt < this.config.retries) {
      try {
        const response = await fetch(\`\${this.baseUrl}\${url}\`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          throw new Error(\`HTTP \${response.status}\`);
        }

        const duration = Date.now() - startTime;
        if (this.config.debug) {
          console.log(\`\${method} \${url} - \${duration}ms\`);
        }

        return response.json();
      } catch (error) {
        attempt++;
        if (attempt >= this.config.retries) {
          throw error;
        }
        await this.delay(1000 * attempt);
      }
    }

    throw new Error('Max retries exceeded');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
`

    it('应该在合理时间内完成大型代码分析', async () => {
      const language: SupportedLanguage = 'typescript'

      const startTime = Date.now()

      const result = await enhancer.fullAnalysis(largeCode, language)

      const duration = Date.now() - startTime

      expect(result).toBeDefined()
      expect(duration).toBeLessThan(30000) // 30秒内完成

      console.log('性能测试 - 分析耗时:', {
        duration: `${duration}ms`,
        analysis: result.analysis.stats,
        reviewScore: result.review.score,
        issuesCount: result.summary.totalIssues,
      })
    })
  })
})