/**
 * @fileoverview 修复方案生成器
 * 智能生成多个修复方案，并按优先级排序
 * @version v1.10.0
 */

import type {
  FixSuggestion,
  FixStep,
  CodeChange,
  ErrorClassification,
  StackAnalysis,
  ContextAnalysis,
  RootCauseAnalysis,
} from './types'

// ============================================
// 修复模板
// ============================================

interface FixTemplate {
  id: string
  category: string
  subtype?: string
  title: string
  description: string
  priority: 'immediate' | 'high' | 'medium' | 'low'
  effort: 'easy' | 'moderate' | 'complex'
  steps: FixStep[]
  codeTemplate?: string
  relatedDocs: string[]
}

const FIX_TEMPLATES: FixTemplate[] = [
  // 空值检查
  {
    id: 'null-check',
    category: 'runtime',
    subtype: 'null-reference',
    title: '添加空值检查',
    description: '在访问对象属性前检查是否为 null 或 undefined',
    priority: 'immediate',
    effort: 'easy',
    steps: [
      {
        order: 1,
        action: '添加 null/undefined 检查',
        detail: 'if (obj && obj.prop) { ... }',
        verificationMethod: '测试边界条件',
      },
      {
        order: 2,
        action: '考虑使用可选链操作符',
        detail: 'obj?.prop?.nestedProp',
        verificationMethod: 'TypeScript 编译检查',
      },
    ],
    codeTemplate: `
// 修复前
const value = obj.property;

// 修复后
const value = obj?.property;
// 或者
if (obj != null) {
  const value = obj.property;
}
`,
    relatedDocs: ['https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining'],
  },

  // 未定义变量
  {
    id: 'undefined-variable',
    category: 'runtime',
    subtype: 'undefined-reference',
    title: '修复未定义变量',
    description: '确保变量在使用前已正确声明和初始化',
    priority: 'immediate',
    effort: 'easy',
    steps: [
      {
        order: 1,
        action: '检查变量声明',
        detail: '确保使用 const/let/var 声明',
        verificationMethod: 'ESLint 检查',
      },
      {
        order: 2,
        action: '检查导入',
        detail: '确保正确导入依赖',
        verificationMethod: '编译检查',
      },
    ],
    relatedDocs: ['https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types'],
  },

  // 类型错误
  {
    id: 'type-error',
    category: 'runtime',
    subtype: 'type-error',
    title: '修复类型错误',
    description: '确保对正确类型的值执行操作',
    priority: 'high',
    effort: 'moderate',
    steps: [
      {
        order: 1,
        action: '添加类型检查',
        detail: 'typeof value === "function" ? value() : defaultValue',
        verificationMethod: '单元测试',
      },
      {
        order: 2,
        action: '使用类型守卫',
        detail: '创建 isType 函数检查类型',
        verificationMethod: 'TypeScript 类型检查',
      },
    ],
    relatedDocs: ['https://www.typescriptlang.org/docs/handbook/2/narrowing.html'],
  },

  // 异步处理
  {
    id: 'async-error',
    category: 'runtime',
    subtype: 'type-error',
    title: '修复异步错误处理',
    description: '确保正确处理 Promise 和 async/await 错误',
    priority: 'high',
    effort: 'moderate',
    steps: [
      {
        order: 1,
        action: '添加 try-catch',
        detail: 'try { await asyncFn() } catch (e) { handleError(e) }',
        verificationMethod: '错误场景测试',
      },
      {
        order: 2,
        action: '添加 .catch()',
        detail: 'promise.then(...).catch(...)',
        verificationMethod: 'Promises/A+ 测试',
      },
    ],
    codeTemplate: `
// 修复前
const result = await fetch(url);

// 修复后
try {
  const result = await fetch(url);
  if (!result.ok) throw new Error('Request failed');
  return result.json();
} catch (error) {
  console.error('Fetch failed:', error);
  throw error; // 或返回默认值
}
`,
    relatedDocs: ['https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises'],
  },

  // 语法错误
  {
    id: 'syntax-fix',
    category: 'syntax',
    title: '修复语法错误',
    description: '更正代码语法，确保可被解析',
    priority: 'immediate',
    effort: 'easy',
    steps: [
      {
        order: 1,
        action: '检查括号配对',
        detail: '确保所有括号、引号正确闭合',
        verificationMethod: '解析器检查',
      },
      {
        order: 2,
        action: '检查语法',
        detail: '使用 linter 或 IDE 检查',
        verificationMethod: 'ESLint/Prettier',
      },
    ],
    relatedDocs: ['https://eslint.org/'],
  },

  // 内存泄漏
  {
    id: 'memory-leak',
    category: 'system',
    subtype: 'out-of-memory',
    title: '修复内存泄漏',
    description: '释放未使用的资源，防止内存泄漏',
    priority: 'high',
    effort: 'complex',
    steps: [
      {
        order: 1,
        action: '检查事件监听器',
        detail: '移除不再需要的 addEventListener',
        verificationMethod: '内存分析工具',
      },
      {
        order: 2,
        action: '检查定时器',
        detail: '清除 setInterval/setTimeout',
        verificationMethod: '控制台警告',
      },
      {
        order: 3,
        action: '检查闭包',
        detail: '避免捕获不必要的变量',
        verificationMethod: '堆快照',
      },
    ],
    codeTemplate: `
// 修复前
useEffect(() => {
  window.addEventListener('resize', handleResize);
  const timer = setInterval(checkStatus, 1000);
});

// 修复后
useEffect(() => {
  window.addEventListener('resize', handleResize);
  const timer = setInterval(checkStatus, 1000);
  
  return () => {
    window.removeEventListener('resize', handleResize);
    clearInterval(timer);
  };
}, []);
`,
    relatedDocs: ['https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management'],
  },

  // 网络错误
  {
    id: 'network-retry',
    category: 'network',
    title: '添加网络重试',
    description: '为网络请求添加重试和错误处理逻辑',
    priority: 'high',
    effort: 'moderate',
    steps: [
      {
        order: 1,
        action: '添加重试逻辑',
        detail: '指数退避重试: 1s, 2s, 4s...',
        verificationMethod: '模拟网络错误',
      },
      {
        order: 2,
        action: '添加超时处理',
        detail: 'AbortController + setTimeout',
        verificationMethod: '超时场景测试',
      },
      {
        order: 3,
        action: '添加降级方案',
        detail: '失败时使用缓存或默认值',
        verificationMethod: '离线测试',
      },
    ],
    codeTemplate: `
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}
`,
    relatedDocs: ['https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API'],
  },

  // 数据库错误
  {
    id: 'db-timeout',
    category: 'database',
    subtype: 'query-timeout',
    title: '优化数据库查询',
    description: '添加索引、优化查询、处理超时',
    priority: 'high',
    effort: 'moderate',
    steps: [
      {
        order: 1,
        action: '分析慢查询',
        detail: 'EXPLAIN ANALYZE SELECT ...',
        verificationMethod: '查询执行计划',
      },
      {
        order: 2,
        action: '添加索引',
        detail: 'CREATE INDEX idx_column ON table(column)',
        verificationMethod: '查询性能测试',
      },
      {
        order: 3,
        action: '优化查询',
        detail: '减少 SELECT *，添加 LIMIT',
        verificationMethod: '基准测试',
      },
    ],
    relatedDocs: ['https://use-the-index-luke.com/'],
  },
]

// ============================================
// 修复建议器
// ============================================

/**
 * 修复建议器
 */
export class FixSuggester {
  /**
   * 生成修复方案
   */
  suggest(
    error: Error,
    classification: ErrorClassification,
    stackAnalysis: StackAnalysis,
    contextAnalysis: ContextAnalysis,
    rootCauseAnalysis: RootCauseAnalysis
  ): FixSuggestion[] {
    const suggestions: FixSuggestion[] = []

    // 1. 基于分类匹配模板
    const matchedTemplates = this.matchTemplates(classification)
    for (const template of matchedTemplates) {
      suggestions.push(this.templateToSuggestion(template, stackAnalysis))
    }

    // 2. 基于上下文生成特定建议
    const contextSuggestions = this.generateContextSuggestions(
      error,
      contextAnalysis,
      stackAnalysis
    )
    suggestions.push(...contextSuggestions)

    // 3. 基于根因分析的建议
    const rootCauseSuggestions = this.generateRootCauseSuggestions(rootCauseAnalysis)
    suggestions.push(...rootCauseSuggestions)

    // 4. 排序并去重
    const sorted = this.sortAndDedupe(suggestions)

    // 5. 限制数量
    return sorted.slice(0, 5)
  }

  /**
   * 匹配修复模板
   */
  private matchTemplates(classification: ErrorClassification): FixTemplate[] {
    return FIX_TEMPLATES.filter(template => {
      if (template.category !== classification.category) return false
      if (template.subtype && template.subtype !== classification.subtype) return false
      return true
    })
  }

  /**
   * 模板转换为建议
   */
  private templateToSuggestion(template: FixTemplate, stackAnalysis: StackAnalysis): FixSuggestion {
    // 如果有根帧，生成代码变更
    const codeChanges: CodeChange[] = []
    if (stackAnalysis.rootFrame && template.codeTemplate) {
      codeChanges.push({
        filePath: stackAnalysis.rootFrame.fileName,
        type: 'replace',
        startLine: stackAnalysis.rootFrame.lineNumber,
        newCode: template.codeTemplate,
        explanation: template.description,
      })
    }

    return {
      id: `fix-${template.id}`,
      title: template.title,
      description: template.description,
      priority: template.priority,
      effort: template.effort,
      confidence: 0.8,
      codeChanges: codeChanges.length > 0 ? codeChanges : undefined,
      steps: template.steps,
      relatedDocs: template.relatedDocs,
    }
  }

  /**
   * 基于上下文生成建议
   */
  private generateContextSuggestions(
    error: Error,
    contextAnalysis: ContextAnalysis,
    stackAnalysis: StackAnalysis
  ): FixSuggestion[] {
    const suggestions: FixSuggestion[] = []

    // 检查可疑模式
    for (const pattern of contextAnalysis.suspiciousPatterns) {
      suggestions.push({
        id: `fix-pattern-${pattern.pattern}`,
        title: `修复可疑模式: ${pattern.pattern}`,
        description: pattern.description,
        priority: pattern.risk === 'high' ? 'immediate' : pattern.risk === 'medium' ? 'high' : 'medium',
        effort: 'easy',
        confidence: 0.7,
        steps: [
          {
            order: 1,
            action: pattern.suggestion,
            detail: `位于 ${pattern.location}`,
          },
        ],
        relatedDocs: [],
      })
    }

    // 检查依赖问题
    for (const dep of contextAnalysis.dependencies) {
      if (dep.potentialIssue) {
        suggestions.push({
          id: `fix-dep-${dep.name}`,
          title: `检查依赖: ${dep.name}`,
          description: dep.potentialIssue,
          priority: 'high',
          effort: 'moderate',
          confidence: 0.6,
          steps: [
            {
              order: 1,
              action: '检查依赖版本',
              detail: `npm list ${dep.name}`,
            },
            {
              order: 2,
              action: '更新或安装依赖',
              detail: `npm install ${dep.name}@latest`,
            },
          ],
          relatedDocs: [],
        })
      }
    }

    return suggestions
  }

  /**
   * 基于根因生成建议
   */
  private generateRootCauseSuggestions(rootCauseAnalysis: RootCauseAnalysis): FixSuggestion[] {
    const suggestions: FixSuggestion[] = []

    // 从贡献因素生成建议
    for (const factor of rootCauseAnalysis.contributingFactors) {
      if (factor.remediation) {
        suggestions.push({
          id: `fix-factor-${factor.factor}`,
          title: `解决: ${factor.factor}`,
          description: factor.description,
          priority: factor.impact === 'major' ? 'immediate' : factor.impact === 'moderate' ? 'high' : 'medium',
          effort: 'moderate',
          confidence: 0.6,
          steps: [
            {
              order: 1,
              action: factor.remediation,
              detail: factor.description,
            },
          ],
          relatedDocs: [],
        })
      }
    }

    return suggestions
  }

  /**
   * 排序并去重
   */
  private sortAndDedupe(suggestions: FixSuggestion[]): FixSuggestion[] {
    // 排序
    const priorityOrder = { immediate: 0, high: 1, medium: 2, low: 3 }
    const effortOrder = { easy: 0, moderate: 1, complex: 2 }

    const sorted = [...suggestions].sort((a, b) => {
      // 先按优先级
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      // 再按难度
      return effortOrder[a.effort] - effortOrder[b.effort]
    })

    // 去重
    const seen = new Set<string>()
    return sorted.filter(s => {
      if (seen.has(s.id)) return false
      seen.add(s.id)
      return true
    })
  }
}

// ============================================
// 导出
// ============================================

export const fixSuggester = new FixSuggester()

export default {
  FixSuggester,
  fixSuggester,
  FIX_TEMPLATES,
}