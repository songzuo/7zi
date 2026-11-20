/**
 * @fileoverview 错误分类器
 * 根据错误名称、错误消息、错误码和规则特征对错误进行分类
 * @version v1.10.0
 */

import type {
  ErrorCategory,
  ErrorSubtype,
  ErrorSeverity,
  ErrorClassification,
} from './types'

// ============================================
// 分类规则
// ============================================

interface ClassificationRule {
  category: ErrorCategory
  subtype: ErrorSubtype
  severity: ErrorSeverity
  patterns: (string | RegExp)[]
  keywords?: string[]
  excludePatterns?: (string | RegExp)[]
  /**
   * 错误构造器名称（如 TypeError / SyntaxError）。
   * 命中时该规则视为强候选（置信度不低于 0.9）。
   */
  errorNames?: string[]
  description: string
}

/**
 * 把规则里的字符串/正则统一编译成「大小写不敏感、无全局状态」的正则。
 *
 * 之前的实现有三个真实缺陷：
 * 1. 规则里的字面量正则没有 `i` 标志，而字符串分支却用了 `i`，
 *    导致 "Unauthorized: Invalid token" 这类消息完全匹配不上 auth 规则；
 * 2. 带 `g` 标志的正则反复 `.test()` 会因 lastIndex 漂移而结果不稳定；
 * 3. 匹配文本里混入了 stack，文件路径里的 "timeout.js" 之类会造成误判。
 */
function compilePattern(pattern: string | RegExp): RegExp {
  if (typeof pattern === 'string') {
    return new RegExp(pattern, 'i')
  }
  // 去掉 g / y，避免 lastIndex 造成的状态漂移
  const flags = pattern.flags.replace(/[gy]/g, '')
  return new RegExp(pattern.source, flags.includes('i') ? flags : `${flags}i`)
}

/**
 * 错误分类规则
 *
 * 优先级规则（自上而下 + 置信度择优）：
 * 1. 所有正则统一大小写不敏感；
 * 2. excludePatterns 命中的规则直接跳过（用于消解规则之间的重叠）；
 * 3. 所有命中规则的规则都会被打分（0.5 + 0.5 * 命中长度占比），
 *    取分值最高者；同分时取数组中靠前的规则（数组顺序即优先级）；
 * 4. errorNames 命中（TypeError/SyntaxError/...）是一个「强但粗」的信号：
 *    - 规则本身也命中了 pattern 时，置信度保底 0.85；
 *    - 规则仅靠 errorNames 命中时，置信度为 0.8（低于任何有具体 pattern 的规则）。
 *    早期实现给 errorNames 无条件 0.9 保底，导致同一 errorName 下的多条规则
 *    全部打平，数组里靠前的规则永远赢（例如 SyntaxError 永远被判成
 *    unexpected-token，missing-bracket 形同虚设）。
 */
const CLASSIFICATION_RULES: ClassificationRule[] = [
  // 语法错误
  {
    category: 'syntax',
    subtype: 'unexpected-token',
    severity: 'high',
    patterns: [
      /Unexpected token/,
      /Unexpected identifier/,
      /SyntaxError:/,
      /Parse error/,
      /JSON\.parse/,
    ],
    errorNames: ['SyntaxError'],
    description: '代码包含意外的标记或标识符',
  },
  {
    category: 'syntax',
    subtype: 'missing-bracket',
    severity: 'high',
    patterns: [
      /Missing (?:bracket|parentheses|brace|closing)/i,
      /Missing\s*[)}\]]/,
      /Unterminated/,
      // 只匹配解析器真正会抛出的 "Expected ..." 句式，避免把普通文案里的
      // "expected" 误判成语法错误
      /Expected\s+['"`]/,
      /Expected (?:expression|identifier|property|token|argument|number|boolean|string)/,
      /unclosed/,
    ],
    description: '缺少括号、引号或大括号',
  },
  {
    category: 'syntax',
    subtype: 'type-mismatch',
    severity: 'medium',
    patterns: [
      /Type .* does not match/,
      /is not assignable to/,
      /is not of type/,
    ],
    description: '类型不匹配',
  },

  // 运行时错误
  {
    category: 'runtime',
    subtype: 'null-reference',
    severity: 'high',
    patterns: [
      /Cannot read.*null/,
      /Cannot read properties of null/,
      /Cannot read properties of undefined/,
      /undefined.*null/,
      /null.*undefined/,
      /Cannot destructure property/,
      /is null/,
    ],
    description: '尝试访问 null 或 undefined 对象的属性',
  },
  {
    category: 'runtime',
    subtype: 'undefined-reference',
    severity: 'high',
    patterns: [
      /is not defined/,
      /Cannot access/,
      /ReferenceError:/,
      /'.*' is not defined/,
      /".*" is not defined/,
    ],
    errorNames: ['ReferenceError'],
    description: '引用未定义的变量或函数',
  },
  {
    category: 'runtime',
    subtype: 'type-error',
    severity: 'high',
    patterns: [
      /is not a function/,
      /is not a (?:string|number|object|array|function)/,
      /TypeError:/,
      /Cannot call method/,
    ],
    errorNames: ['TypeError'],
    description: '类型错误 - 对错误类型的值进行了操作',
  },
  {
    category: 'runtime',
    subtype: 'range-error',
    severity: 'medium',
    patterns: [
      /RangeError:/,
      /Invalid array length/,
      /Invalid date/,
    ],
    // "Maximum call stack size exceeded" 是堆栈溢出，不是数值越界
    excludePatterns: [/Maximum call stack size exceeded/],
    errorNames: ['RangeError'],
    description: '值超出允许的范围',
  },

  // 逻辑错误
  {
    category: 'logic',
    subtype: 'infinite-loop',
    severity: 'high',
    patterns: [
      /infinite.*loop/,
      /while.*true/,
      /Loop.*condition/,
    ],
    excludePatterns: [/Maximum call stack size exceeded/],
    description: '可能的无限循环导致堆栈溢出',
  },
  {
    category: 'logic',
    subtype: 'race-condition',
    severity: 'high',
    patterns: [
      /race condition/,
      /concurrent.*modification/,
      /concurrent.*update/,
      /optimistic.*lock/,
    ],
    description: '并发访问导致的竞态条件',
  },
  {
    category: 'logic',
    subtype: 'deadlock',
    severity: 'critical',
    patterns: [
      /deadlock/,
      /dead lock/,
      /lock.*timeout/,
      /deadlock.*detected/,
    ],
    // 数据库层面的死锁由 database/deadlock-detected 负责
    excludePatterns: [/deadlock detected/, /lock wait timeout/],
    description: '死锁检测',
  },

  // 系统错误
  {
    category: 'system',
    subtype: 'out-of-memory',
    severity: 'critical',
    patterns: [
      /out of memory/,
      /ENOMEM/,
      /heap out of memory/,
      /FATAL:/,
      /JavaScript heap/,
    ],
    description: '内存耗尽',
  },
  {
    category: 'system',
    subtype: 'stack-overflow',
    severity: 'critical',
    patterns: [
      /Maximum call stack/,
      /stack overflow/,
      /RangeError: Maximum/,
    ],
    description: '堆栈溢出',
  },
  {
    category: 'system',
    subtype: 'permission-denied',
    severity: 'high',
    patterns: [
      /Permission denied/,
      /EACCES/,
      /access denied/,
      /EROFS/,
      /EPERM/,
    ],
    description: '权限被拒绝',
  },
  {
    category: 'system',
    subtype: 'file-not-found',
    severity: 'medium',
    patterns: [
      /ENOENT/,
      /No such file/,
      /file not found/,
      /Cannot find module/,
      /Module not found/,
    ],
    description: '文件或模块未找到',
  },

  // 网络错误
  {
    category: 'network',
    subtype: 'timeout',
    severity: 'medium',
    patterns: [
      /timeout/,
      /ETIMEDOUT/,
      /timed out/,
      /Request timeout/,
      /connection timeout/,
      /ESOCKETTIMEDOUT/,
    ],
    // 数据库/锁等待超时归 database 分类，避免被网络规则抢走
    excludePatterns: [/\bquery\b/i, /statement/i, /lock wait/i],
    description: '操作超时',
  },
  {
    category: 'network',
    subtype: 'connection-refused',
    severity: 'high',
    patterns: [
      /ECONNREFUSED/,
      /connection refused/,
      /Connection refused/,
      /connect ECONNREFUSED/,
    ],
    description: '连接被拒绝',
  },
  {
    category: 'network',
    subtype: 'dns-error',
    severity: 'high',
    patterns: [
      /ENOTFOUND/,
      /DNS.*error/,
      /getaddrinfo/,
      /name or service not known/,
    ],
    description: 'DNS 解析错误',
  },
  {
    category: 'network',
    subtype: 'ssl-error',
    severity: 'high',
    patterns: [
      /SSL/,
      /TLS/,
      /certificate/,
      /CERT_/,
      /self.?signed/,
      /unable to verify/,
    ],
    description: 'SSL/TLS 证书错误',
  },

  // 数据库错误
  {
    category: 'database',
    subtype: 'query-timeout',
    severity: 'medium',
    patterns: [
      /query.*timeout/,
      /slow query/,
      /execution.*timeout/,
      /statement timeout/,
    ],
    description: '数据库查询超时',
  },
  {
    category: 'database',
    subtype: 'connection-pool-exhausted',
    severity: 'high',
    patterns: [
      /connection pool/,
      /too many connections/,
      /ECONNEXHAUSTED/,
      /pool.*exhausted/,
    ],
    description: '数据库连接池耗尽',
  },
  {
    category: 'database',
    subtype: 'deadlock-detected',
    severity: 'high',
    patterns: [
      /deadlock detected/,
      /lock.*wait.*timeout/,
      /could not obtain.*lock/,
    ],
    description: '数据库死锁',
  },
  {
    category: 'database',
    subtype: 'constraint-violation',
    severity: 'medium',
    patterns: [
      /constraint/,
      /unique constraint/,
      /foreign key/,
      /violates/,
      /duplicate key/,
    ],
    description: '数据库约束违规',
  },

  // 验证错误
  {
    category: 'validation',
    subtype: 'unknown',
    severity: 'low',
    patterns: [
      /validation/,
      /invalid.*input/,
      /invalid.*parameter/,
      /is required/,
      /required (?:field|parameter|argument|property)/,
      /missing.*field/,
    ],
    description: '输入验证失败',
  },

  // 认证错误
  {
    category: 'auth',
    subtype: 'unknown',
    severity: 'high',
    patterns: [
      /unauthorized/,
      /\b401\b/,
      /forbidden/,
      /\b403\b/,
      /authentication/,
      /invalid token/,
      /token expired/,
      /jwt/,
    ],
    description: '认证或授权失败',
  },

  // 资源错误
  {
    category: 'resource',
    subtype: 'unknown',
    severity: 'medium',
    patterns: [
      /too many/,
      /rate limit/,
      /\b429\b/,
      /quota/,
      /limit exceeded/,
      /EMFILE/,
      /too many open files/,
    ],
    description: '资源限制或配额超出',
  },
]

// ============================================
// 分类器实现
// ============================================

/**
 * 错误分类器
 */
export class ErrorClassifier {
  /**
   * 分类错误
   */
  classify(error: Error | string): ErrorClassification {
    const errorMessage = typeof error === 'string' ? error : error.message
    const errorName = typeof error === 'string' ? 'Error' : (error.name || 'Error')
    const errorCode = typeof error === 'string' ? undefined : extractErrorCode(error)

    // 匹配文本只包含「错误名 + 错误消息 + 错误码」。
    // 之前把 stack 也拼进来，文件路径（如 "timeout.ts"）会造成大量误判。
    const searchText = [errorName, errorMessage, errorCode || '']
      .filter(part => part.length > 0)
      .join(' ')

    // 两遍选择：
    //
    // 第 1 遍 —— 只看「模式命中」的规则，按置信度择优。
    //   置信度 = 0.5 + 0.5 * (命中片段长度 / 错误消息长度)，
    //   即「命中片段越具体、占消息比例越高 → 越可信」，
    //   命中长度相同时取数组中靠前的规则（数组顺序即优先级）。
    //
    // 第 2 遍 —— 只有第 1 遍完全没有命中时，才退而用「仅错误构造器名命中」
    //   的规则（TypeError / SyntaxError / ReferenceError / RangeError）。
    //   错误名是弱信号：它只能说明「大概率是这一族」，
    //   不足以在同族多条规则之间定胜负 —— 例如所有 SyntaxError 都会同时
    //   命中 unexpected-token 与 missing-bracket，
    //   必须靠具体模式（"Missing }" vs "Unexpected token"）来区分。
    let best: { rule: ClassificationRule; confidence: number } | null = null
    let nameOnlyBest: { rule: ClassificationRule; confidence: number } | null = null

    for (const rule of CLASSIFICATION_RULES) {
      const match = this.matchRule(rule, searchText, errorName)
      if (!match.matched) {
        continue
      }

      const confidence = this.calculateConfidence(
        rule,
        searchText,
        errorMessage,
        match.viaPattern,
        match.viaErrorName
      )

      if (match.viaPattern) {
        if (best === null || confidence > best.confidence) {
          best = { rule, confidence }
        }
      } else if (nameOnlyBest === null || confidence > nameOnlyBest.confidence) {
        nameOnlyBest = { rule, confidence }
      }
    }

    // 没有任何模式命中时，退回错误名匹配
    if (best === null && nameOnlyBest !== null) {
      best = nameOnlyBest
    }

    // 无法分类，返回默认结果
    if (best === null) {
      return {
        category: 'unknown',
        subtype: 'unknown',
        severity: this.inferSeverity(errorMessage),
        confidence: 0.3,
        description: '无法确定错误类型',
        tags: ['unclassified'],
      }
    }

    const { rule, confidence } = best

    // 生成标签
    const tags = this.generateTags(rule, errorMessage)

    return {
      category: rule.category,
      subtype: rule.subtype,
      severity: rule.severity,
      confidence,
      description: rule.description,
      tags,
    }
  }

  /**
   * 批量分类多个错误
   */
  classifyBatch(errors: (Error | string)[]): ErrorClassification[] {
    return errors.map(e => this.classify(e))
  }

  /**
   * 获取错误类别的严重程度
   */
  getCategorySeverity(category: ErrorCategory): ErrorSeverity {
    const severityMap: Record<ErrorCategory, ErrorSeverity> = {
      syntax: 'high',
      runtime: 'high',
      logic: 'high',
      system: 'critical',
      network: 'medium',
      database: 'high',
      validation: 'low',
      auth: 'high',
      resource: 'medium',
      unknown: 'medium',
    }
    return severityMap[category] || 'medium'
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 规则匹配结果
   */
  private matchRule(
    rule: ClassificationRule,
    text: string,
    errorName: string
  ): { matched: boolean; viaPattern: boolean; viaErrorName: boolean } {
    const viaErrorName =
      rule.errorNames !== undefined &&
      rule.errorNames.some(
        name => name.toLowerCase() === errorName.toLowerCase()
      )

    // 排除模式优先级最高：一旦命中，整条规则作废
    if (this.isExcluded(rule, text)) {
      return { matched: false, viaPattern: false, viaErrorName: false }
    }

    // 检查匹配模式
    for (const pattern of rule.patterns) {
      if (compilePattern(pattern).test(text)) {
        return { matched: true, viaPattern: true, viaErrorName }
      }
    }

    // 检查关键词
    if (rule.keywords) {
      const lowerText = text.toLowerCase()
      for (const keyword of rule.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          return { matched: true, viaPattern: true, viaErrorName }
        }
      }
    }

    // 仅错误构造器名称命中
    if (viaErrorName) {
      return { matched: true, viaPattern: false, viaErrorName: true }
    }

    return { matched: false, viaPattern: false, viaErrorName: false }
  }

  /**
   * 规则是否被排除模式命中
   */
  private isExcluded(rule: ClassificationRule, text: string): boolean {
    if (!rule.excludePatterns) return false
    for (const pattern of rule.excludePatterns) {
      if (compilePattern(pattern).test(text)) {
        return true
      }
    }
    return false
  }

  /**
   * 计算置信度
   *
   * 旧实现是「命中数 / 规则模式总数」，规则里模式越多分值越低，
   * 导致 "Cannot read property 'x' of null" 只有 0.175 的置信度 —— 与实际
   * 判断准确度完全脱钩。
   *
   * 新实现：命中片段越长（占错误消息的比例越高），说明特征越具体，
   * 置信度越高；并对错误构造器名称命中的规则给保底分。
   */
  private calculateConfidence(
    rule: ClassificationRule,
    text: string,
    message: string,
    viaPattern: boolean,
    viaErrorName: boolean
  ): number {
    const matchedLength = this.longestMatchLength(rule, text)

    // 命中片段占错误消息的比例（0 - 1）
    const specificity =
      message.length > 0
        ? Math.min(1, matchedLength / message.length)
        : matchedLength > 0
          ? 1
          : 0

    if (!viaPattern) {
      // 仅错误构造器名命中：弱信号，固定 0.8。
      // 这是第 2 遍（兜底）的分数，不会与第 1 遍的模式命中竞争。
      return 0.8
    }

    // 基础置信度：模式命中即不低于 0.5，具体程度再往上加分。
    //
    // 关键：命中片段的具体程度必须压过「错误名命中」的加成。
    // 否则 new TypeError("Cannot read properties of null (reading 'x')")
    // 会因为 errorNames:['TypeError'] 而输给宽泛的 type-error 规则，
    // 而正确的分类应当是更具体的 null-reference。
    let confidence = 0.5 + 0.5 * specificity

    if (viaErrorName) {
      // 错误名与模式一致：小幅加成（而非抬到固定下限），
      // 保持「片段越具体越可信」这一主排序不变。
      confidence *= 1.05
    }

    // 特定模式提高置信度
    if (rule.severity === 'critical') confidence *= 1.1
    if (rule.severity === 'high') confidence *= 1.05

    return Math.min(1.0, Math.max(0, confidence))
  }

  /**
   * 计算规则在文本中的最长命中长度
   */
  private longestMatchLength(rule: ClassificationRule, text: string): number {
    let longest = 0

    for (const pattern of rule.patterns) {
      const match = compilePattern(pattern).exec(text)
      if (match && match[0].length > longest) {
        longest = match[0].length
      }
    }

    if (rule.keywords) {
      const lowerText = text.toLowerCase()
      for (const keyword of rule.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          longest = Math.max(longest, keyword.length)
        }
      }
    }

    return longest
  }

  private generateTags(rule: ClassificationRule, message: string): string[] {
    const tags: string[] = [rule.category]

    if (rule.subtype !== 'unknown') {
      tags.push(rule.subtype)
    }

    // 从消息中提取额外标签
    const lowerMessage = message.toLowerCase()
    if (lowerMessage.includes('async')) tags.push('async')
    if (lowerMessage.includes('promise')) tags.push('promise')
    if (lowerMessage.includes('react')) tags.push('react')
    if (lowerMessage.includes('node')) tags.push('node')
    if (lowerMessage.includes('browser')) tags.push('browser')

    return [...new Set(tags)] // 去重
  }

  private inferSeverity(message: string): ErrorSeverity {
    const lower = message.toLowerCase()

    if (/critical|fatal|emergency/.test(lower)) return 'critical'
    if (/error|exception|fail/.test(lower)) return 'high'
    if (/warn|caution/.test(lower)) return 'medium'
    return 'low'
  }
}

/**
 * 提取 Node.js 错误上的 code 字段（如 'ENOENT'、'ETIMEDOUT'）
 */
function extractErrorCode(error: Error): string | undefined {
  const candidate = error as Error & { code?: unknown }
  return typeof candidate.code === 'string' ? candidate.code : undefined
}

// ============================================
// 导出
// ============================================

export const errorClassifier = new ErrorClassifier()

export default ErrorClassifier
