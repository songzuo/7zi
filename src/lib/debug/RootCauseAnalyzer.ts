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
  ErrorSubtype,
  StackAnalysis,
  ContextAnalysis,
} from './types'


// ============================================
// 根因规则
// ============================================

interface RootCauseRule {
  type: RootCauseType
  patterns: (string | RegExp)[]
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  /**
   * 贡献因素。必须与 {@link remediation} 一一对应 —— 第 i 个因素的处置办法
   * 就是 remediation[i]。历史上这里写死成 remediation[0]，导致「类型不匹配」
   * 之类的因素也被建议「添加 null/undefined 检查」，完全对不上号。
   */
  contributingFactors: string[]
  remediation: string[]
}

/**
 * 统一把规则里的模式编译成「大小写不敏感、无 g/y 状态」的正则。
 *
 * 旧代码对字符串模式用 `i`、对字面量正则直接沿用原 flags，
 * 导致 "ETIMEDOUT" 这类大小写敏感的代码名匹配不稳定。
 */
function compileRootCausePattern(pattern: string | RegExp): RegExp {
  if (typeof pattern === 'string') {
    return new RegExp(pattern, 'i')
  }
  const flags = pattern.flags.replace(/[gy]/g, '')
  return new RegExp(pattern.source, flags.includes('i') ? flags : `${flags}i`)
}

/**
 * 根因规则（按优先级自上而下，第一条命中即采用）
 *
 * 规则收紧要点：
 * 1. 只对「错误消息 + 错误名 + 错误码」做匹配，绝不匹配整个 stack
 *    —— 旧实现把 stack 也喂给正则，文件路径里的 "os" / "timeout" /
 *    "closed" 等子串会命中环境/超时规则，把根因带偏到完全无关的类型；
 * 2. 去掉过宽的裸词（`/timeout/`、`/lock/`、`/null|undefined/`），
 *    换成有上下文的短语，避免不同根因互相抢匹配；
 * 3. 「数据库连接池耗尽」归 resource-exhaustion（连接池是有界资源被耗尽），
 *    「死锁 / 竞态」才归 concurrency-issue。
 */
const ROOT_CAUSE_RULES: RootCauseRule[] = [
  // 代码缺陷
  {
    type: 'code-defect',
    patterns: [
      /cannot read (?:property|properties)/i,
      /cannot access .*(?:null|undefined)/i,
      /(?:null|undefined) is not an object/i,
      /null or undefined/i,
      /is not defined/i,
      /is not a function/i,
      /type ?error/i,
      /reading .* of (?:null|undefined)/i,
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

  // 资源耗尽
  // 注意：数据库连接池耗尽也属于「有界资源被耗尽」，归到这一类，
  // 而不是 data-issue（那是数据内容/约束问题）或 concurrency-issue（竞态/死锁）。
  {
    type: 'resource-exhaustion',
    patterns: [
      /out of memory/i,
      /heap/i,
      /ENOMEM/i,
      /too many/i,
      /limit exceeded/i,
      /quota/i,
      /EMFILE/i,
      /pool.*exhaust/i,
      /connection pool/i,
      /too many connections/i,
      /resource exhausted/i,
      // 数据库查询超时：服务端资源（CPU / IO / 锁等待）被长查询占满，
      // 属于有界资源被耗尽，而不是「与外部服务集成失败」。
      // 必须放在 integration-issue 规则之前 —— 后者有裸的 /timeout/i，
      // 否则 "query execution timeout" 会被抢走。
      /query[^.]*timeout/i,
      /statement timeout/i,
      /execution timeout/i,
      /slow query/i,
    ],
    severity: 'critical',
    description: '系统资源（内存、文件句柄、连接池等）耗尽',
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
  // 只保留真正的并发症状（竞态 / 死锁 / 锁等待）。
  // 裸的 /timeout/、/lock/ 会把网络超时、连接池耗尽都抢过来。
  {
    type: 'concurrency-issue',
    patterns: [
      /race condition/i,
      /concurrent (?:modification|update|access)/i,
      /optimistic lock/i,
      /deadlock/i,
      /lock wait timeout/i,
      /could not obtain .*lock/i,
      /lost update/i,
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
      /constraint/i,
      /duplicate (?:key|entry|value)/i,
      /unique violation/i,
      /foreign key/i,
      /invalid .*data/i,
      /data integrity/i,
      /serialization failed/i,
      /data truncated/i,
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

  // 集成问题（外部服务 / API / 网络）
  {
    type: 'integration-issue',
    patterns: [
      /ECONNREFUSED/i,
      /ETIMEDOUT/i,
      /ECONNRESET/i,
      /EAI_AGAIN/i,
      /ENOTFOUND/i,
      /network/i,
      /connection (?:refused|reset|closed|failed)/i,
      /socket hang up/i,
      /api (?:error|failed|unavailable)/i,
      /service unavailable/i,
      /\b(?:502|503|504)\b/,
      /timeout/i,
      /\bapi\b/i,
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

  // 配置错误
  {
    type: 'configuration-error',
    patterns: [
      /invalid .*config/i,
      /config(uration)? (?:error|missing|invalid)/i,
      /environment variable/i,
      /\benv\b/i,
      /missing .*(?:key|setting)/i,
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
      /ERR_MODULE_NOT_FOUND/,
      /require.*not found/i,
      /import.*not found/i,
      /version (?:mismatch|conflict|incompatible|not supported)/i,
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
      /node version/i,
      /unsupported (?:os|platform|browser|node)/i,
      /browser (?:not supported|unsupported)/i,
      /operating system/i,
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

/**
 * 分类子类型 → 根因类型
 *
 * 当错误消息本身不含明确特征（规则未命中）时，用分类器已经判定好的
 * 子类型反推根因，比只按大类粗粒度推断准确得多。
 */
const ROOT_CAUSE_BY_SUBTYPE: Partial<Record<ErrorSubtype, RootCauseType>> = {
  // 语法 / 运行时
  'unexpected-token': 'code-defect',
  'missing-bracket': 'code-defect',
  'invalid-syntax': 'code-defect',
  'type-mismatch': 'code-defect',
  'null-reference': 'code-defect',
  'undefined-reference': 'code-defect',
  'type-error': 'code-defect',
  'range-error': 'code-defect',
  'reference-error': 'code-defect',
  // 逻辑
  'infinite-loop': 'design-flaw',
  'off-by-one': 'code-defect',
  'race-condition': 'concurrency-issue',
  'deadlock': 'concurrency-issue',
  // 系统
  'out-of-memory': 'resource-exhaustion',
  'stack-overflow': 'design-flaw',
  'permission-denied': 'environment-issue',
  'file-not-found': 'dependency-issue',
  // 网络
  timeout: 'integration-issue',
  'connection-refused': 'integration-issue',
  'dns-error': 'integration-issue',
  'ssl-error': 'integration-issue',
  // 数据库
  'query-timeout': 'resource-exhaustion',
  'connection-pool-exhausted': 'resource-exhaustion',
  'deadlock-detected': 'concurrency-issue',
  'constraint-violation': 'data-issue',
}

/**
 * 提取 Node.js 错误上的 code 字段（如 'ETIMEDOUT'、'ECONNREFUSED'）
 */
function extractErrorCode(error: Error): string | undefined {
  const candidate = error as Error & { code?: unknown }
  return typeof candidate.code === 'string' ? candidate.code : undefined
}

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
   *
   * 判定顺序：
   * 1. 消息级规则匹配（最具体的证据优先）；
   * 2. 若没有任何规则命中，用「分类子类型」推断（分类器已经做过精细化判定）；
   * 3. 最后用「分类大类」兜底。
   *
   * 关键修复：旧实现把整个 error.stack 也喂给正则，
   * 文件路径里的 "os"（closed/os）、"version"、"timeout" 等子串会命中
   * environment-issue / dependency-issue / integration-issue，
   * 导致「连接池耗尽」「网络超时」被误判成完全无关的根因。
   */
  private identifyRootCauseType(
    error: Error,
    classification: ErrorClassification,
    _stackAnalysis: StackAnalysis
  ): RootCauseType {
    const searchText = [
      error.name || 'Error',
      error.message || '',
      extractErrorCode(error) || '',
    ]
      .filter(part => part.length > 0)
      .join(' ')

    // 1. 规则匹配
    for (const rule of ROOT_CAUSE_RULES) {
      for (const pattern of rule.patterns) {
        if (compileRootCausePattern(pattern).test(searchText)) {
          return rule.type
        }
      }
    }

    // 2. 分类子类型推断
    const bySubtype = ROOT_CAUSE_BY_SUBTYPE[classification.subtype]
    if (bySubtype) {
      return bySubtype
    }

    // 3. 分类大类兜底
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
      rule.contributingFactors.forEach((factor, index) => {
        factors.push({
          factor,
          impact: 'moderate',
          description: factor,
          // 第 i 个因素对应第 i 条处置办法；数量不齐时退回最后一条
          remediation: rule.remediation[index] ?? rule.remediation[rule.remediation.length - 1],
        })
      })
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

const defaultExport = {
  RootCauseAnalyzer,
  rootCauseAnalyzer,
}

export default defaultExport