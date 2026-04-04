/**
 * 自动化系统 React Hooks
 */

import { useState, useEffect, useCallback } from 'react'
import type { AutomationRule, ExecutionResult, TriggerType, RuleStatus } from './automation-engine'
import { automationEngine } from './automation-engine'
import { DEFAULT_RULE_TEMPLATES, createRuleFromTemplate } from './default-templates'

// ============================================================================
// Rule Management Hooks
// ============================================================================

/**
 * 使用自动化规则列表
 */
export function useAutomationRules() {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refreshRules = useCallback(() => {
    setLoading(true)
    try {
      const allRules = automationEngine.getAllRules()
      setRules(allRules)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load rules'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshRules()
  }, [refreshRules])

  return {
    rules,
    loading,
    error,
    refreshRules,
  }
}

/**
 * 使用单个规则
 */
export function useAutomationRule(ruleId: string) {
  const [rule, setRule] = useState<AutomationRule | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    try {
      const foundRule = automationEngine.getRule(ruleId)
      setRule(foundRule)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load rule'))
    } finally {
      setLoading(false)
    }
  }, [ruleId])

  const updateRule = useCallback(
    async (updates: Partial<AutomationRule>) => {
      if (!rule) return

      try {
        const updatedRule = { ...rule, ...updates, metadata: { ...rule.metadata, updatedAt: new Date().toISOString() } }
        await automationEngine.registerRule(updatedRule)
        setRule(updatedRule)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update rule'))
        throw err
      }
    },
    [rule]
  )

  const updateStatus = useCallback(
    async (status: RuleStatus) => {
      if (!rule) return

      try {
        await automationEngine.updateRuleStatus(rule.id, status)
        setRule({ ...rule, status })
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update status'))
        throw err
      }
    },
    [rule]
  )

  const deleteRule = useCallback(async () => {
    if (!rule) return

    try {
      await automationEngine.unregisterRule(rule.id)
      setRule(undefined)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete rule'))
      throw err
    }
  }, [rule])

  return {
    rule,
    loading,
    error,
    updateRule,
    updateStatus,
    deleteRule,
  }
}

/**
 * 使用规则模板
 */
export function useRuleTemplates() {
  const [templates, setTemplates] = useState<AutomationRule[]>(DEFAULT_RULE_TEMPLATES)

  const createFromTemplate = useCallback((templateId: string, overrides?: Partial<AutomationRule>) => {
    const template = templates.find((t) => t.id === templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    return createRuleFromTemplate(template, overrides)
  }, [templates])

  return {
    templates,
    createFromTemplate,
  }
}

// ============================================================================
// Rule Execution Hooks
// ============================================================================

/**
 * 使用规则执行
 */
export function useRuleExecution() {
  const [executing, setExecuting] = useState(false)
  const [results, setResults] = useState<ExecutionResult[]>([])
  const [error, setError] = useState<Error | null>(null)

  const executeRule = useCallback(async (ruleId: string, triggerData?: unknown) => {
    setExecuting(true)
    setError(null)

    try {
      const result = await automationEngine.triggerRule(ruleId, triggerData)
      setResults((prev) => [result, ...prev])
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to execute rule')
      setError(error)
      throw error
    } finally {
      setExecuting(false)
    }
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
  }, [])

  return {
    executing,
    results,
    error,
    executeRule,
    clearResults,
  }
}

/**
 * 使用规则执行历史
 */
export function useRuleExecutionHistory(ruleId: string) {
  const [history, setHistory] = useState<ExecutionResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: 从存储加载执行历史
    setLoading(false)
  }, [ruleId])

  return {
    history,
    loading,
  }
}

// ============================================================================
// Event Triggering Hooks
// ============================================================================

/**
 * 使用事件触发
 */
export function useEventTrigger() {
  const triggerEvent = useCallback(async (eventType: string, eventData?: unknown) => {
    try {
      await automationEngine.triggerEvent(eventType as any, eventData)
    } catch (err) {
      console.error('Failed to trigger event:', err)
      throw err
    }
  }, [])

  return {
    triggerEvent,
  }
}

// ============================================================================
// Rule Statistics Hooks
// ============================================================================

/**
 * 使用规则统计
 */
export function useRuleStats(ruleId: string) {
  const [stats, setStats] = useState<AutomationRule['stats'] | undefined>(undefined)

  useEffect(() => {
    const rule = automationEngine.getRule(ruleId)
    setStats(rule?.stats)
  }, [ruleId])

  return {
    stats,
  }
}

/**
 * 使用全局统计
 */
export function useGlobalStats() {
  const [stats, setStats] = useState({
    totalRules: 0,
    activeRules: 0,
    pausedRules: 0,
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
  })

  useEffect(() => {
    const rules = automationEngine.getAllRules()
    const totalRules = rules.length
    const activeRules = rules.filter((r) => r.status === 'active').length
    const pausedRules = rules.filter((r) => r.status === 'paused').length

    let totalExecutions = 0
    let successfulExecutions = 0
    let failedExecutions = 0

    for (const rule of rules) {
      if (rule.stats) {
        totalExecutions += rule.stats.totalExecutions
        successfulExecutions += rule.stats.successfulExecutions
        failedExecutions += rule.stats.failedExecutions
      }
    }

    setStats({
      totalRules,
      activeRules,
      pausedRules,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
    })
  }, [])

  return {
    stats,
  }
}

// ============================================================================
// Rule Validation Hooks
// ============================================================================

/**
 * 使用规则验证
 */
export function useRuleValidation() {
  const validateRule = useCallback((rule: Partial<AutomationRule>) => {
    const { RuleValidator } = require('./automation-engine')
    return RuleValidator.validateRule(rule)
  }, [])

  return {
    validateRule,
  }
}

// ============================================================================
// Rule Registration Hooks
// ============================================================================

/**
 * 使用规则注册
 */
export function useRuleRegistration() {
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const registerRule = useCallback(async (rule: AutomationRule) => {
    setRegistering(true)
    setError(null)

    try {
      await automationEngine.registerRule(rule)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to register rule')
      setError(error)
      throw error
    } finally {
      setRegistering(false)
    }
  }, [])

  const unregisterRule = useCallback(async (ruleId: string) => {
    setRegistering(true)
    setError(null)

    try {
      await automationEngine.unregisterRule(ruleId)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to unregister rule')
      setError(error)
      throw error
    } finally {
      setRegistering(false)
    }
  }, [])

  return {
    registering,
    error,
    registerRule,
    unregisterRule,
  }
}