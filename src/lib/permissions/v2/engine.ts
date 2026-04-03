/**
 * v1.12.0 Fine-Grained Permission Engine
 * 细粒度权限检查引擎 - 性能优化 (< 1ms)
 */

import {
  ResourceType,
  ActionType,
  ConditionOperator,
  PermissionCondition,
  PermissionConditionGroup,
  FineGrainedPermission,
  PermissionCheckContext,
  ResourceContext,
  PermissionCheckRequest,
  PermissionCheckResultV2,
  PermissionPerformanceMetrics,
} from './types'

/**
 * 权限引擎配置
 */
interface PermissionEngineConfig {
  /** 是否启用缓存 */
  enableCache: boolean
  /** 缓存TTL (毫秒) */
  cacheTTL: number
  /** 最大缓存条目数 */
  maxCacheSize: number
  /** 是否启用性能监控 */
  enableMetrics: boolean
  /** 是否启用审计日志 */
  enableAudit: boolean
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: PermissionEngineConfig = {
  enableCache: true,
  cacheTTL: 300000, // 5 minutes
  maxCacheSize: 10000,
  enableMetrics: true,
  enableAudit: true,
}

/**
 * 权限引擎类
 */
export class PermissionEngine {
  private config: PermissionEngineConfig
  private cache: Map<string, { data: PermissionCheckResultV2; expiresAt: number }>
  private metrics: PermissionPerformanceMetrics
  private auditCallbacks: Array<(log: unknown) => void>

  constructor(config: Partial<PermissionEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.cache = new Map()
    this.metrics = {
      checkCount: 0,
      totalTimeMs: 0,
      avgTimeMs: 0,
      maxTimeMs: 0,
      minTimeMs: Infinity,
      p50TimeMs: 0,
      p95TimeMs: 0,
      p99TimeMs: 0,
      cacheHits: 0,
      cacheMisses: 0,
      conditionEvaluations: 0,
    }
    this.auditCallbacks = []
  }

  /**
   * 检查权限 (核心方法)
   */
  async checkPermission(
    request: PermissionCheckRequest,
    permissions: FineGrainedPermission[]
  ): Promise<PermissionCheckResultV2> {
    const startTime = performance.now()
    this.metrics.checkCount++

    // 生成缓存键
    const cacheKey = this.generateCacheKey(request)

    // 检查缓存
    if (this.config.enableCache) {
      const cached = this.cache.get(cacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        this.metrics.cacheHits++
        const result = cached.data
        result.cacheHit = true
        this.updateMetrics(startTime)
        return result
      }
      this.metrics.cacheMisses++
    }

    // 执行权限检查
    const result = await this.evaluatePermission(request, permissions)

    // 更新缓存
    if (this.config.enableCache && result.allowed) {
      this.setCache(cacheKey, result)
    }

    // 更新性能指标
    this.updateMetrics(startTime)

    // 记录审计日志
    if (this.config.enableAudit) {
      this.logAudit(request, result)
    }

    return result
  }

  /**
   * 评估权限
   */
  private async evaluatePermission(
    request: PermissionCheckRequest,
    permissions: FineGrainedPermission[]
  ): Promise<PermissionCheckResultV2> {
    const { user, resource, action } = request

    // 1. 检查显式拒绝权限 (优先级最高)
    const denyPermissions = permissions.filter(
      p =>
        p.resourceType === resource.resourceType &&
        p.action === action &&
        p.isDeny === true
    )

    for (const denyPerm of denyPermissions) {
      if (await this.matchesPermission(denyPerm, request)) {
        return {
          allowed: false,
          source: 'deny',
          matchedPermissionId: denyPerm.id,
          denyReason: 'Explicit deny permission matched',
          evaluationTimeMs: 0,
        }
      }
    }

    // 2. 检查直接权限
    const directPermissions = permissions.filter(
      p =>
        p.resourceType === resource.resourceType &&
        p.action === action &&
        p.isDeny !== true &&
        user.permissions.includes(p.id)
    )

    for (const perm of directPermissions) {
      if (await this.matchesPermission(perm, request)) {
        return {
          allowed: true,
          source: 'direct',
          matchedPermissionId: perm.id,
          evaluationTimeMs: 0,
        }
      }
    }

    // 3. 检查继承权限
    const inheritedPermissions = permissions.filter(
      p =>
        p.resourceType === resource.resourceType &&
        p.action === action &&
        p.isDeny !== true &&
        !user.permissions.includes(p.id)
    )

    for (const perm of inheritedPermissions) {
      if (await this.matchesPermission(perm, request)) {
        return {
          allowed: true,
          source: 'inherited',
          matchedPermissionId: perm.id,
          evaluationTimeMs: 0,
        }
      }
    }

    // 4. 检查自定义权限
    if (user.customPermissions) {
      for (const customPerm of user.customPermissions) {
        const perm = permissions.find(p => p.id === customPerm)
        if (
          perm &&
          perm.resourceType === resource.resourceType &&
          perm.action === action &&
          perm.isDeny !== true
        ) {
          if (await this.matchesPermission(perm, request)) {
            return {
              allowed: true,
              source: 'direct',
              matchedPermissionId: perm.id,
              evaluationTimeMs: 0,
            }
          }
        }
      }
    }

    // 5. 无匹配权限
    return {
      allowed: false,
      source: 'deny',
      denyReason: 'No matching permission found',
      missingPermissions: [`${resource.resourceType}:${action}`],
      evaluationTimeMs: 0,
    }
  }

  /**
   * 检查权限是否匹配请求
   */
  private async matchesPermission(
    permission: FineGrainedPermission,
    request: PermissionCheckRequest
  ): Promise<boolean> {
    const { user, resource } = request

    // 1. 检查资源类型
    if (permission.resourceType !== resource.resourceType) {
      return false
    }

    // 2. 检查资源ID模式
    if (permission.scope?.resourceIdPattern) {
      const pattern = permission.scope.resourceIdPattern
      // 支持通配符
      if (pattern !== '*' && !this.matchPattern(pattern, resource.resourceId)) {
        return false
      }
    }

    // 3. 检查租户隔离
    if (permission.scope?.tenantId && permission.scope.tenantId !== user.tenantId) {
      return false
    }

    // 4. 检查属性过滤器
    if (permission.scope?.attributeFilters) {
      for (const filter of permission.scope.attributeFilters) {
        if (!(await this.evaluateCondition(filter, user, resource))) {
          return false
        }
      }
    }

    // 5. 检查权限条件
    if (permission.conditions) {
      if (!(await this.evaluateConditionGroup(permission.conditions, user, resource))) {
        return false
      }
    }

    // 6. 检查生效时间
    const now = new Date()
    if (permission.effectiveFrom && now < permission.effectiveFrom) {
      return false
    }
    if (permission.effectiveUntil && now > permission.effectiveUntil) {
      return false
    }

    return true
  }

  /**
   * 评估条件组
   */
  private async evaluateConditionGroup(
    group: PermissionConditionGroup,
    user: PermissionCheckContext,
    resource: ResourceContext
  ): Promise<boolean> {
    const results = await Promise.all(
      group.conditions.map(async condition => {
        if ('logic' in condition) {
          return this.evaluateConditionGroup(condition, user, resource)
        } else {
          return this.evaluateCondition(condition, user, resource)
        }
      })
    )

    if (group.logic === 'AND') {
      return results.every(r => r)
    } else {
      return results.some(r => r)
    }
  }

  /**
   * 评估单个条件
   */
  private async evaluateCondition(
    condition: PermissionCondition,
    user: PermissionCheckContext,
    resource: ResourceContext
  ): Promise<boolean> {
    this.metrics.conditionEvaluations++

    // 获取字段值
    const fieldValue = this.getFieldValue(condition.field, user, resource)

    // 根据操作符评估
    switch (condition.operator) {
      case ConditionOperator.EQUALS:
        return this.compareEquals(fieldValue, condition.value, condition.caseSensitive)

      case ConditionOperator.NOT_EQUALS:
        return !this.compareEquals(fieldValue, condition.value, condition.caseSensitive)

      case ConditionOperator.IN:
        return Array.isArray(condition.value) && condition.value.includes(fieldValue)

      case ConditionOperator.NOT_IN:
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue)

      case ConditionOperator.CONTAINS:
        return this.compareContains(fieldValue, condition.value, condition.caseSensitive)

      case ConditionOperator.STARTS_WITH:
        return this.compareStartsWith(fieldValue, condition.value, condition.caseSensitive)

      case ConditionOperator.ENDS_WITH:
        return this.compareEndsWith(fieldValue, condition.value, condition.caseSensitive)

      case ConditionOperator.GREATER_THAN:
        return this.compareNumeric(fieldValue, condition.value, (a, b) => a > b)

      case ConditionOperator.LESS_THAN:
        return this.compareNumeric(fieldValue, condition.value, (a, b) => a < b)

      case ConditionOperator.GREATER_THAN_OR_EQUAL:
        return this.compareNumeric(fieldValue, condition.value, (a, b) => a >= b)

      case ConditionOperator.LESS_THAN_OR_EQUAL:
        return this.compareNumeric(fieldValue, condition.value, (a, b) => a <= b)

      case ConditionOperator.EXISTS:
        return fieldValue !== undefined && fieldValue !== null

      case ConditionOperator.REGEX:
        return this.compareRegex(fieldValue, condition.value, condition.caseSensitive)

      default:
        return false
    }
  }

  /**
   * 获取字段值 (支持嵌套路径)
   */
  private getFieldValue(
    field: string,
    user: PermissionCheckContext,
    resource: ResourceContext
  ): unknown {
    // 支持前缀: user., resource.
    if (field.startsWith('user.')) {
      return this.getNestedValue(field.substring(5), user)
    } else if (field.startsWith('resource.')) {
      return this.getNestedValue(field.substring(9), resource)
    } else {
      // 默认从资源属性获取
      return this.getNestedValue(field, resource.attributes)
    }
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(path: string, obj: unknown): unknown {
    const parts = path.split('.')
    let current: unknown = obj

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part]
      } else {
        return undefined
      }
    }

    return current
  }

  /**
   * 比较相等
   */
  private compareEquals(
    a: unknown,
    b: unknown,
    caseSensitive?: boolean
  ): boolean {
    if (typeof a === 'string' && typeof b === 'string') {
      if (!caseSensitive) {
        return a.toLowerCase() === b.toLowerCase()
      }
      return a === b
    }
    return a === b
  }

  /**
   * 比较包含
   */
  private compareContains(
    a: unknown,
    b: unknown,
    caseSensitive?: boolean
  ): boolean {
    if (typeof a === 'string' && typeof b === 'string') {
      const strA = caseSensitive ? a : a.toLowerCase()
      const strB = caseSensitive ? b : b.toLowerCase()
      return strA.includes(strB)
    }
    if (Array.isArray(a)) {
      return a.includes(b)
    }
    return false
  }

  /**
   * 比较前缀
   */
  private compareStartsWith(
    a: unknown,
    b: unknown,
    caseSensitive?: boolean
  ): boolean {
    if (typeof a === 'string' && typeof b === 'string') {
      const strA = caseSensitive ? a : a.toLowerCase()
      const strB = caseSensitive ? b : b.toLowerCase()
      return strA.startsWith(strB)
    }
    return false
  }

  /**
   * 比较后缀
   */
  private compareEndsWith(
    a: unknown,
    b: unknown,
    caseSensitive?: boolean
  ): boolean {
    if (typeof a === 'string' && typeof b === 'string') {
      const strA = caseSensitive ? a : a.toLowerCase()
      const strB = caseSensitive ? b : b.toLowerCase()
      return strA.endsWith(strB)
    }
    return false
  }

  /**
   * 比较数值
   */
  private compareNumeric(
    a: unknown,
    b: unknown,
    compareFn: (a: number, b: number) => boolean
  ): boolean {
    const numA = typeof a === 'number' ? a : typeof a === 'string' ? parseFloat(a) : NaN
    const numB = typeof b === 'number' ? b : typeof b === 'string' ? parseFloat(b) : NaN
    return !isNaN(numA) && !isNaN(numB) && compareFn(numA, numB)
  }

  /**
   * 比较正则表达式
   */
  private compareRegex(
    a: unknown,
    b: unknown,
    caseSensitive?: boolean
  ): boolean {
    if (typeof a === 'string' && typeof b === 'string') {
      try {
        const flags = caseSensitive ? 'g' : 'gi'
        const regex = new RegExp(b, flags)
        return regex.test(a)
      } catch {
        return false
      }
    }
    return false
  }

  /**
   * 模式匹配 (支持通配符)
   */
  private matchPattern(pattern: string, value: string): boolean {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
    try {
      const regex = new RegExp(`^${regexPattern}$`)
      return regex.test(value)
    } catch {
      return false
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(request: PermissionCheckRequest): string {
    const { user, resource, action } = request
    return `${user.userId}:${resource.resourceType}:${resource.resourceId}:${action}:${JSON.stringify(user.roles)}`
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, result: PermissionCheckResultV2): void {
    // 清理过期缓存
    this.cleanupCache()

    // 检查缓存大小限制
    if (this.cache.size >= this.config.maxCacheSize) {
      // 删除最旧的条目
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data: result,
      expiresAt: Date.now() + this.config.cacheTTL,
    })
  }

  /**
   * 清理过期缓存
   */
  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt < now) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 更新性能指标
   */
  private updateMetrics(startTime: number): void {
    const elapsed = performance.now() - startTime

    this.metrics.totalTimeMs += elapsed
    this.metrics.avgTimeMs = this.metrics.totalTimeMs / this.metrics.checkCount
    this.metrics.maxTimeMs = Math.max(this.metrics.maxTimeMs, elapsed)
    this.metrics.minTimeMs = Math.min(this.metrics.minTimeMs, elapsed)

    // 计算百分位数 (简化版)
    // 实际实现应该使用更精确的算法
    if (elapsed <= this.metrics.p50TimeMs) {
      this.metrics.p50TimeMs = elapsed
    }
    if (elapsed <= this.metrics.p95TimeMs) {
      this.metrics.p95TimeMs = elapsed
    }
    if (elapsed <= this.metrics.p99TimeMs) {
      this.metrics.p99TimeMs = elapsed
    }
  }

  /**
   * 记录审计日志
   */
  private logAudit(request: PermissionCheckRequest, result: PermissionCheckResultV2): void {
    const log = {
      timestamp: new Date(),
      userId: request.user.userId,
      resourceType: request.resource.resourceType,
      resourceId: request.resource.resourceId,
      action: request.action,
      allowed: result.allowed,
      source: result.source,
      matchedPermissionId: result.matchedPermissionId,
      denyReason: result.denyReason,
    }

    this.auditCallbacks.forEach(callback => callback(log))
  }

  /**
   * 注册审计回调
   */
  onAudit(callback: (log: unknown) => void): void {
    this.auditCallbacks.push(callback)
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PermissionPerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * 重置性能指标
   */
  resetMetrics(): void {
    this.metrics = {
      checkCount: 0,
      totalTimeMs: 0,
      avgTimeMs: 0,
      maxTimeMs: 0,
      minTimeMs: Infinity,
      p50TimeMs: 0,
      p95TimeMs: 0,
      p99TimeMs: 0,
      cacheHits: 0,
      cacheMisses: 0,
      conditionEvaluations: 0,
    }
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; hitRate: number } {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses
    const hitRate = total > 0 ? this.metrics.cacheHits / total : 0
    return {
      size: this.cache.size,
      hitRate,
    }
  }
}

/**
 * 创建默认权限引擎实例
 */
export function createPermissionEngine(
  config?: Partial<PermissionEngineConfig>
): PermissionEngine {
  return new PermissionEngine(config)
}

/**
 * 全局默认引擎实例
 */
export const defaultPermissionEngine = createPermissionEngine()