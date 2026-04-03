/**
 * @fileoverview 根因分析器
 * 深入分析错误的根本原因，不仅仅是表面症状
 * @version v1.10.0
 */

import type {
  RootCauseAnalysis,
  RootCauseType,
  Evidence,
  ContributingFactor,
  TimelineEvent,
  PropagationStep,
  ErrorClassification,
  StackAnalysis,
  ContextAnalysis,
} from './types'

import { errorClassifier } from './ErrorClassifier'
import { stackAnalyzer } from './StackAnalyzer'

// ============================================
// 根因规则
// ============================================

interface RootCauseRule {
  type: RootCauseType
  patterns: (string | RegExp)[]
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  contributingFactors: string[]
  remediation: string[]
}

const ROOT_CAUSE_RULES: RootCauseRule[] = [
  // 代码缺陷
  {
    type: 'code-defect',
    patterns: [
      /null|undefined/,
      /is not defined/,
      /is not a function/,
      /cannot read/,
      /type error/i,
    ],
    severity: 'high',
    description: '代码中存在空值引用、类型错误或未定义变量',
    contributingFactors: [
      '缺少输入验证',
      '不安全的属性访问',
      '类型不匹配',
      '变量作用域问题',
    ],
    remediation: [
      '添加 null/undefined 检查',
      '使用可选链操作符 (?.)',
      '添加类型注解',
      '改进错误处理',
    ],
  },

  // 配置错误
  {
    type: 'configuration-error',
    patterns: [
      /config/i,
      /env/i,
      /environment/i,
      /missing.*key/i,
      /invalid.*config/i,
    ],
    severity: 'medium',
    description: '配置文件或环境变量设置不正确',
    contributingFactors: [
      '缺少必需的配置项',
      '配置值格式错误',
      '环境变量未设置',
      '配置文件路径错误',
    ],
    remediation: [
      '检查配置文件',
      '验证环境变量',
      '添加配置验证',
      '提供默认配置',
    ],
  },

  // 依赖问题
  {
    type: 'dependency-issue',
    patterns: [
      /cannot find module/i,
      /module not found/i,
      /require.*not found/i,
      /import.*not found/i,
      /version/i,
    ],
    severity: 'high',
    description: '依赖包缺失、版本不兼容或安装错误',
    contributingFactors: [
      '依赖包未安装',
      '版本冲突',
      '依赖包已废弃',
      '安装路径错误',
    ],
    remediation: [
      '运行 npm install',
      '检查 package.json',
      '更新依赖版本',
      '清理 node_modules 重新安装',
    ],
  },

  // 环境问题
  {
    type: 'environment-issue',
    patterns: [
      /platform/i,
      /os/i,
      /node version/i,
      /browser/i,
      /unsupported/i,
    ],
    severity: 'medium',
    description: '运行环境不满足要求',
    contributingFactors: [
      'Node.js 版本过低',
      '浏览器不支持',
      '操作系统不兼容',
      '缺少系统依赖',
    ],
    remediation: [
      '升级 Node.js 版本',
      '检查浏览器兼容性',
      '安装系统依赖',
      '使用 polyfill',
    ],
  },

  // 资源耗尽
  {
    type: 'resource-exhaustion',
    patterns: [
      /out of memory/i,
      /heap/i,
      /too many/i,
      /limit exceeded/i,
      /quota/i,
      /EMFILE/i,
    ],
    severity: 'critical',
    description: '系统资源（内存、文件句柄等）耗尽',
    contributingFactors: [
      '内存泄漏',
      '未释放的资源',
      '并发请求过多',
      '资源限制过低',
    ],
    remediation: [
      '修复内存泄漏',
      '增加资源限制',
      '实现资源池',
      '优化资源使用',
    ],
  },

  // 并发问题
  {
    type: 'concurrency-issue',
    patterns: [
      /race condition/i,
      /concurrent/i,
      /deadlock/i,
      /lock/i,
      /timeout/i,
    ],
    severity: 'high',
    description: '并发访问导致的竞态条件或死锁',
    contributingFactors: [
      '缺少同步机制',
      '锁使用不当',
      '异步操作未正确等待',
      '共享状态未保护',
    ],
    remediation: [
      '添加锁机制',
      '使用原子操作',
      '改进异步处理',
      '避免共享状态',
    ],
  },

  // 数据问题
  {
    type: 'data-issue',
    patterns: [
      /database/i,
      /query/i,
      /constraint/i,
      /duplicate/i,
      /invalid.*data/i,
    ],
    severity: 'medium',
    description: '数据格式错误、约束违规或数据不一致',
    contributingFactors: [
      '数据验证不足',
      '数据库约束冲突',
      '数据格式错误',
      '数据迁移问题',
    ],
    remediation: [
      '添加数据验证',
      '检查数据库约束',
      '修复数据格式',
      '实施数据迁移',
    ],
  },

  // 集成问题
  {
    type: 'integration-issue',
    patterns: [
      /api/i,
      /network/i,
      /connection/i,
      /timeout/i,
      /ECONNREFUSED/i,
      /ETIMEDOUT/i,
    ],
    severity: 'high',
    description: '与外部服务或 API 集成时出现问题',
    contributingFactors: [
      '外部服务不可用',
      '网络连接问题',
      'API 变更',
      '认证失败',
    ],
    remediation: [
      '检查网络连接',
      '验证 API 凭证',
      '添加重试逻辑',
      '实现降级策略',
    ],
  },

  // 设计缺陷
  {
    type: 'design-flaw',
    patterns: [
      /circular/i,
      /recursive/i,
      /infinite/i,
      /maximum call stack/i,
    ],
    severity: 'high',
    description: '架构或设计层面的问题',
    contributingFactors: [
      '循环依赖',
      '过度耦合',
      '缺少抽象',
      '设计模式误用',
    ],
    remediation: [
      '重构代码结构',
      '解耦模块',
      '引入设计模式',
      '改进架构设计',
    ],
  },
]

// ============================================
// 根因分析器
// ============================================

/**
 * 根因分析器
 */
export class RootCauseAnalyzer {
  /**
   * 分析根因
   */
  analyze(
    error: Error,
    classification: ErrorClassification,
    stackAnalysis: StackAnalysis,
    contextAnalysis: ContextAnalysis
  ): RootCauseAnalysis {
    // 1. 识别根因类型
    const type = this.identifyRootCauseType(error, classification, stackAnalysis)

    // 2. 收集证据
    const evidence = this.collectEvidence(error, classification, stackAnalysis, contextAnalysis)

    // 3. 识别贡献因素
    const contributingFactors = this.identifyContributingFactors(
      type,
      classification,
      stackAnalysis,
      contextAnalysis
    )

    // 4. 构建时间线
    const timeline = this.buildTimeline(error, stackAnalysis)

    // 5. 识别受影响组件
    const affectedComponents = this.identifyAffectedComponents(stackAnalysis, contextAnalysis)

    // 6. 构建传播路径
    const propagationPath = this.buildPropagationPath(stackAnalysis)

    // 7. 生成描述
    const description = this.generateDescription(type, classification, contributingFactors)

    // 8. 计算置信度
    const confidence = this.calculateConfidence(type, evidence, classification)

    return {
      type,
      description,
      confidence,
      evidence,
      contributingFactors,
      timeline,
      affectedComponents,
      propagationPath,
    }
  }

  /**
   * 识别根因类型
   */
  private identifyRootCauseType(
    error: Error,
    classification: ErrorClassification,
    stackAnalysis: StackAnalysis
  ): RootCauseType {
    const message = error.message.toLowerCase()
    const stack = error.stack || ''

    // 检查规则匹配
    for (const rule of ROOT_CAUSE_RULES) {
      for (const pattern of rule.patterns) {
        const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern
        if (regex.test(message) || regex.test(stack)) {
          return rule.type
        }
      }
    }

    // 基于分类推断
    switch (classification.category) {
      case 'syntax':
        return 'code-defect'
      case 'runtime':
        return 'code-defect'
      case 'logic':
        return 'design-flaw'
      case 'system':
        return 'resource-exhaustion'
      case 'network':
        return 'integration-issue'
      case 'database':
        return 'data-issue'
      case 'validation':
        return 'code-defect'
      case 'auth':
        return 'integration-issue'
      case 'resource':
        return 'resource-exhaustion'
      default:
        return 'unknown'
    }
  }

  /**
   * 收集证据
   */
  private collectEvidence(
    error: Error,
    classification: ErrorClassification,
    stackAnalysis: StackAnalysis,
    contextAnalysis: ContextAnalysis
  ): Evidence[] {
    const evidence: Evidence[] = []

    // 错误消息证据
    evidence.push({
      id: 'error-message',
      type: 'code',
      source: 'error',
      content: error.message,
      relevance: 1.0,
      timestamp: new Date().toISOString(),
    })

    // 堆栈证据
    if (stackAnalysis.rootFrame) {
      evidence.push({
        id: 'root-frame',
        type: 'code',
        source: stackAnalysis.rootFrame.fileName,
        content: `${stackAnalysis.rootFrame.functionName} at line ${stackAnalysis.rootFrame.lineNumber}`,
        relevance: 0.9,
        timestamp: new Date().toISOString(),
      })
    }

    // 分类证据
    evidence.push({
      id: 'classification',
      type: 'code',
      source: 'classifier',
      content: `${classification.category}/${classification.subtype}`,
      relevance: 0.8,
      timestamp: new Date().toISOString(),
    })

    // 可疑模式证据
    for (const pattern of contextAnalysis.suspiciousPatterns) {
      evidence.push({
        id: `pattern-${pattern.pattern}`,
        type: 'code',
        source: pattern.location,
        content: pattern.description,
        relevance: pattern.risk === 'high' ? 0.9 : pattern.risk === 'medium' ? 0.7 : 0.5,
        timestamp: new Date().toISOString(),
      })
    }

    // 依赖证据
    for (const dep of contextAnalysis.dependencies) {
      if (dep.potentialIssue) {
        evidence.push({
          id: `dep-${dep.name}`,
          type: 'code',
          source: 'dependency',
          content: dep.potentialIssue,
          relevance: 0.6,
          timestamp: new Date().toISOString(),
        })
      }
    }

    return evidence
  }

  /**
   * 识别贡献因素
   */
  private identifyContributingFactors(
    type: RootCauseType,
    classification: ErrorClassification,
    stackAnalysis: StackAnalysis,
    contextAnalysis: ContextAnalysis
  ): ContributingFactor[] {
    const factors: ContributingFactor[] = []

    // 从规则中获取
    const rule = ROOT_CAUSE_RULES.find(r => r.type === type)
    if (rule) {
      for (const factor of rule.contributingFactors) {
        factors.push({
          factor,
          impact: 'moderate',
          description: factor,
          remediation: rule.remediation[0],
        })
      }
    }

    // 从上下文中提取
    for (const pattern of contextAnalysis.suspiciousPatterns) {
      factors.push({
        factor: pattern.pattern,
        impact: pattern.risk === 'high' ? 'major' : pattern.risk === 'medium' ? 'moderate' : 'minor',
        description: pattern.description,
        remediation: pattern.suggestion,
      })
    }

    // 从堆栈中提取
    if (stackAnalysis.frames.length > 10) {
      factors.push({
        factor: 'deep-call-stack',
        impact: 'minor',
        description: '调用栈较深，可能存在过度嵌套',
        remediation: '考虑重构以减少嵌套层级',
      })
    }

    return factors
  }

  /**
   * 构建时间线
   */
  private buildTimeline(error: Error, stackAnalysis: StackAnalysis): TimelineEvent[] {
    const timeline: TimelineEvent[] = []

    // 错误发生
    timeline.push({
      timestamp: new Date().toISOString(),
      type: 'cause',
      description: `Error occurred: ${error.name}`,
      metadata: {
        message: error.message,
      },
    })

    // 错误传播
    for (let i = 0; i < Math.min(stackAnalysis.frames.length, 5); i++) {
      const frame = stackAnalysis.frames[i]
      timeline.push({
        timestamp: new Date(Date.now() - (stackAnalysis.frames.length - i) * 10).toISOString(),
        type: 'effect',
        description: `Propagated through ${frame.functionName}`,
        metadata: {
          file: frame.fileName,
          line: frame.lineNumber,
        },
      })
    }

    // 缓解措施
    if (stackAnalysis.isRecoverable) {
      timeline.push({
        timestamp: new Date().toISOString(),
        type: 'mitigation',
        description: 'Error is recoverable with proper handling',
      })
    }

    return timeline
  }

  /**
   * 识别受影响组件
   */
  private identifyAffectedComponents(
    stackAnalysis: StackAnalysis,
    contextAnalysis: ContextAnalysis
  ): string[] {
    const components = new Set<string>()

    // 从堆栈中提取
    for (const frame of stackAnalysis.frames) {
      if (!frame.isNative) {
        // 提取文件名作为组件
        const fileName = frame.fileName.split('/').pop() || frame.fileName
        components.add(fileName)
      }
    }

    // 从依赖中提取
    for (const dep of contextAnalysis.dependencies) {
      if (dep.isUsed) {
        components.add(dep.name)
      }
    }

    return Array.from(components)
  }

  /**
   * 构建传播路径
   */
  private buildPropagationPath(stackAnalysis: StackAnalysis): PropagationStep[] {
    const path: PropagationStep[] = []

    for (let i = 0; i < stackAnalysis.frames.length - 1; i++) {
      const from = stackAnalysis.frames[i]
      const to = stackAnalysis.frames[i + 1]

      path.push({
        from: from.functionName,
        to: to.functionName,
        mechanism: 'function call',
      })
    }

    return path
  }

  /**
   * 生成描述
   */
  private generateDescription(
    type: RootCauseType,
    classification: ErrorClassification,
    factors: ContributingFactor[]
  ): string {
    const rule = ROOT_CAUSE_RULES.find(r => r.type === type)
    const baseDescription = rule?.description || 'Unknown root cause'

    // 添加主要贡献因素
    const majorFactors = factors.filter(f => f.impact === 'major').slice(0, 2)
    if (majorFactors.length > 0) {
      const factorDescriptions = majorFactors.map(f => f.factor).join(', ')
      return `${baseDescription}. Contributing factors: ${factorDescriptions}`
    }

    return baseDescription
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    type: RootCauseType,
    evidence: Evidence[],
    classification: ErrorClassification
  ): number {
    let confidence = classification.confidence

    // 证据数量影响
    const evidenceScore = Math.min(1.0, evidence.length / 5)
    confidence = confidence * 0.7 + evidenceScore * 0.3

    // 根因类型影响
    if (type === 'unknown') {
      confidence *= 0.5
    }

    return Math.min(1.0, Math.max(0.0, confidence))
  }
}

// ============================================
// 导出
// ============================================

export const rootCauseAnalyzer = new RootCauseAnalyzer()

export default {
  RootCauseAnalyzer,
  rootCauseAnalyzer,
}