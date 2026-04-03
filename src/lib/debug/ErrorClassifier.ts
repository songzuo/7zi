/**
 * @fileoverview 错误分类器
 * 根据错误消息、堆栈和其他特征对错误进行分类
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
  description: string
}

/**
 * 错误分类规则
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
    description: '代码包含意外的标记或标识符',
  },
  {
    category: 'syntax',
    subtype: 'missing-bracket',
    severity: 'high',
    patterns: [
      /Missing (?:bracket|parentheses|brace)/,
      /Unterminated/,
      /Expected/,
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
      /is not a/,
      /is not assignable to/,
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
    description: '引用未定义的变量或函数',
  },
  {
    category: 'runtime',
    subtype: 'type-error',
    severity: 'high',
    patterns: [
      /is not a function/,
      /is not a (?:string|number|object|array)/,
      /TypeError:/,
      /Cannot call method/,
      /of (?:undefined|null)/,
    ],
    description: '类型错误 - 对错误类型的值进行了操作',
  },
  {
    category: 'runtime',
    subtype: 'range-error',
    severity: 'medium',
    patterns: [
      /RangeError:/,
      /Maximum call stack/,
      /Invalid array length/,
      /Invalid date/,
    ],
    description: '值超出允许的范围',
  },

  // 逻辑错误
  {
    category: 'logic',
    subtype: 'infinite-loop',
    severity: 'high',
    patterns: [
      /Maximum call stack size exceeded/,
      /infinite.*loop/,
      /while.*true/,
      /Loop.*condition/,
    ],
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
      /deadlock/,
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
      /required/,
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
      /401/,
      /forbidden/,
      /403/,
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
      /429/,
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
    const errorName = typeof error === 'string' ? 'Error' : error.name
    const errorStack = typeof error === 'string' ? undefined : error.stack

    // 合并错误信息用于分析
    const fullText = [errorName, errorMessage, errorStack || ''].join(' ')

    // 尝试匹配规则
    for (const rule of CLASSIFICATION_RULES) {
      if (this.matchesRule(rule, fullText)) {
        // 计算置信度
        const confidence = this.calculateConfidence(rule, fullText)

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
    }

    // 无法分类，返回默认结果
    return {
      category: 'unknown',
      subtype: 'unknown',
      severity: this.inferSeverity(errorMessage),
      confidence: 0.3,
      description: '无法确定错误类型',
      tags: ['unclassified'],
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

  private matchesRule(rule: ClassificationRule, text: string): boolean {
    // 检查排除模式
    if (rule.excludePatterns) {
      for (const pattern of rule.excludePatterns) {
        const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern
        if (regex.test(text)) {
          return false
        }
      }
    }

    // 检查匹配模式
    for (const pattern of rule.patterns) {
      const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern
      if (regex.test(text)) {
        return true
      }
    }

    // 检查关键词
    if (rule.keywords) {
      const lowerText = text.toLowerCase()
      for (const keyword of rule.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          return true
        }
      }
    }

    return false
  }

  private calculateConfidence(rule: ClassificationRule, text: string): number {
    let matches = 0
    const total = rule.patterns.length

    for (const pattern of rule.patterns) {
      const regex = typeof pattern === 'string' ? new RegExp(pattern, 'gi') : pattern
      const match = regex.test(text)
      if (match) matches++
    }

    // 基础置信度
    let confidence = matches / total

    // 特定模式提高置信度
    if (rule.severity === 'critical') confidence *= 1.1
    if (rule.severity === 'high') confidence *= 1.05

    return Math.min(1.0, confidence)
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

// ============================================
// 导出
// ============================================

export const errorClassifier = new ErrorClassifier()

export default ErrorClassifier
