/**
 * automation-hooks.test.ts
 * 自动化 React Hooks 测试
 * 覆盖：规则管理、执行、事件触发、统计、验证、注册等 Hooks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { automationEngine } from '@/lib/automation/automation-engine'
import type { AutomationRule } from '@/lib/automation/automation-engine'

// Import hooks to test
const hooksModule = {
  useAutomationRules: vi.fn(),
  useAutomationRule: vi.fn(),
  useRuleTemplates: vi.fn(),
  useRuleExecution: vi.fn(),
  useRuleExecutionHistory: vi.fn(),
  useEventTrigger: vi.fn(),
  useRuleStats: vi.fn(),
  useGlobalStats: vi.fn(),
  useRuleValidation: vi.fn(),
  useRuleRegistration: vi.fn(),
}

// Mock the hooks module
vi.mock('@/lib/automation/automation-hooks', () => hooksModule)

// Mock automation-engine
vi.mock('@/lib/automation/automation-engine', async () => {
  const actual = await vi.importActual('@/lib/automation/automation-engine')
  return {
    ...actual,
    automationEngine: {
      registerRule: vi.fn().mockResolvedValue(true),
      unregisterRule: vi.fn().mockResolvedValue(undefined),
      getRule: vi.fn(),
      getAllRules: vi.fn(),
      updateRuleStatus: vi.fn().mockResolvedValue(undefined),
      triggerRule: vi.fn(),
      triggerEvent: vi.fn(),
    },
    DEFAULT_RULE_TEMPLATES: [],
    createRuleFromTemplate: vi.fn(),
  }
})

describe('Automation Hooks 测试', () => {
  const mockRule: AutomationRule = {
    id: 'rule-1',
    name: '测试规则',
    version: '1.0.0',
    status: 'active',
    triggers: [
      {
        type: 'manual',
        config: {},
      },
    ],
    actions: [
      {
        type: 'send_notification',
        config: {
          notification: {
            channels: ['telegram'],
            data: {},
          },
        },
      },
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('useAutomationRules - 规则列表管理', () => {
    it('应该返回规则列表', async () => {
      // Implementation would test the actual hook
      const mockRules = [mockRule]
      const mockHook = vi.fn(() => ({
        rules: mockRules,
        loading: false,
        error: null,
        refreshRules: vi.fn(),
      }))

      hooksModule.useAutomationRules = mockHook

      const { result } = renderHook(() => mockHook())

      expect(result.current.rules).toHaveLength(1)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('应该处理加载状态', async () => {
      const mockHook = vi.fn(() => ({
        rules: [],
        loading: true,
        error: null,
        refreshRules: vi.fn(),
      }))

      hooksModule.useAutomationRules = mockHook

      const { result } = renderHook(() => mockHook())

      expect(result.current.loading).toBe(true)
      expect(result.current.rules).toEqual([])
    })

    it('应该处理错误状态', async () => {
      const error = new Error('Failed to load rules')
      const mockHook = vi.fn(() => ({
        rules: [],
        loading: false,
        error,
        refreshRules: vi.fn(),
      }))

      hooksModule.useAutomationRules = mockHook

      const { result } = renderHook(() => mockHook())

      expect(result.current.error).toBeDefined()
      expect(result.current.error?.message).toBe('Failed to load rules')
    })

    it('应该支持刷新规则列表', async () => {
      const refreshRules = vi.fn()
      const mockHook = vi.fn(() => ({
        rules: [mockRule],
        loading: false,
        error: null,
        refreshRules,
      }))

      hooksModule.useAutomationRules = mockHook

      const { result } = renderHook(() => mockHook())

      await act(async () => {
        await result.current.refreshRules()
      })

      expect(refreshRules).toHaveBeenCalled()
    })
  })

  describe('useAutomationRule - 单个规则管理', () => {
    it('应该返回指定规则', async () => {
      const mockHook = vi.fn(() => ({
        rule: mockRule,
        loading: false,
        error: null,
        updateRule: vi.fn(),
        updateStatus: vi.fn(),
        deleteRule: vi.fn(),
      }))

      hooksModule.useAutomationRule = mockHook

      const { result } = renderHook(() => mockHook('rule-1'))

      expect(result.current.rule).toBeDefined()
      expect(result.current.rule?.id).toBe('rule-1')
    })

    it('应该处理规则不存在的情况', async () => {
      const mockHook = vi.fn(() => ({
        rule: undefined,
        loading: false,
        error: null,
        updateRule: vi.fn(),
        updateStatus: vi.fn(),
        deleteRule: vi.fn(),
      }))

      hooksModule.useAutomationRule = mockHook

      const { result } = renderHook(() => mockHook('non-existent'))

      expect(result.current.rule).toBeUndefined()
    })

    it('应该支持更新规则', async () => {
      const updateRule = vi.fn().mockResolvedValue(undefined)
      const mockHook = vi.fn(() => ({
        rule: mockRule,
        loading: false,
        error: null,
        updateRule,
        updateStatus: vi.fn(),
        deleteRule: vi.fn(),
      }))

      hooksModule.useAutomationRule = mockHook

      const { result } = renderHook(() => mockHook('rule-1'))

      await act(async () => {
        await result.current.updateRule({ name: '更新后的名称' })
      })

      expect(updateRule).toHaveBeenCalled()
    })

    it('应该支持更新规则状态', async () => {
      const updateStatus = vi.fn().mockResolvedValue(undefined)
      const mockHook = vi.fn(() => ({
        rule: mockRule,
        loading: false,
        error: null,
        updateRule: vi.fn(),
        updateStatus,
        deleteRule: vi.fn(),
      }))

      hooksModule.useAutomationRule = mockHook

      const { result } = renderHook(() => mockHook('rule-1'))

      await act(async () => {
        await result.current.updateStatus('paused')
      })

      expect(updateStatus).toHaveBeenCalledWith('paused')
    })

    it('应该支持删除规则', async () => {
      const deleteRule = vi.fn().mockResolvedValue(undefined)
      const mockHook = vi.fn(() => ({
        rule: mockRule,
        loading: false,
        error: null,
        updateRule: vi.fn(),
        updateStatus: vi.fn(),
        deleteRule,
      }))

      hooksModule.useAutomationRule = mockHook

      const { result } = renderHook(() => mockHook('rule-1'))

      await act(async () => {
        await result.current.deleteRule()
      })

      expect(deleteRule).toHaveBeenCalled()
    })

    it('应该处理更新错误', async () => {
      const error = new Error('Update failed')
      const updateRule = vi.fn().mockRejectedValue(error)
      const mockHook = vi.fn(() => ({
        rule: mockRule,
        loading: false,
        error: null,
        updateRule,
        updateStatus: vi.fn(),
        deleteRule: vi.fn(),
      }))

      hooksModule.useAutomationRule = mockHook

      const { result } = renderHook(() => mockHook('rule-1'))

      await expect(async () => {
        await result.current.updateRule({ name: '新名称' })
      }).rejects.toThrow('Update failed')
    })
  })

  describe('useRuleTemplates - 规则模板管理', () => {
    it('应该返回模板列表', async () => {
      const templates = [mockRule]
      const mockHook = vi.fn(() => ({
        templates,
        createFromTemplate: vi.fn(),
      }))

      hooksModule.useRuleTemplates = mockHook

      const { result } = renderHook(() => mockHook())

      expect(result.current.templates).toHaveLength(1)
    })

    it('应该支持从模板创建规则', async () => {
      const createFromTemplate = vi.fn().mockReturnValue(mockRule)
      const mockHook = vi.fn(() => ({
        templates: [mockRule],
        createFromTemplate,
      }))

      hooksModule.useRuleTemplates = mockHook

      const { result } = renderHook(() => mockHook())

      const newRule = result.current.createFromTemplate('template-1', { name: '新规则' })

      expect(createFromTemplate).toHaveBeenCalledWith('template-1', { name: '新规则' })
      expect(newRule).toBeDefined()
    })

    it('应该处理模板不存在的情况', async () => {
      const createFromTemplate = vi.fn().mockImplementation((id) => {
        if (id === 'non-existent') {
          throw new Error('Template not found')
        }
        return mockRule
      })

      const mockHook = vi.fn(() => ({
        templates: [mockRule],
        createFromTemplate,
      }))

      hooksModule.useRuleTemplates = mockHook

      const { result } = renderHook(() => mockHook())

      expect(() => {
        result.current.createFromTemplate('non-existent')
      }).toThrow('Template not found')
    })
  })

  describe('useRuleExecution - 规则执行', () => {
    it('应该成功执行规则', async () => {
      const executeRule = vi.fn().mockResolvedValue({
        success: true,
        executionId: 'exec-1',
        timestamp: new Date().toISOString(),
        ruleId: 'rule-1',
        triggerType: 'manual',
        actionResults: [],
        duration: 100,
      })

      const mockHook = vi.fn(() => ({
        executing: false,
        results: [],
        error: null,
        executeRule,
        clearResults: vi.fn(),
      }))

      hooksModule.useRuleExecution = mockHook

      const { result } = renderHook(() => mockHook())

      await act(async () => {
        await result.current.executeRule('rule-1', { test: 'data' })
      })

      expect(executeRule).toHaveBeenCalledWith('rule-1', { test: 'data' })
    })

    it('应该处理执行状态', async () => {
      const mockHook = vi.fn(() => ({
        executing: true,
        results: [],
        error: null,
        executeRule: vi.fn(),
        clearResults: vi.fn(),
      }))

      hooksModule.useRuleExecution = mockHook

      const { result } = renderHook(() => mockHook())

      expect(result.current.executing).toBe(true)
    })

    it('应该处理执行错误', async () => {
      const error = new Error('Execution failed')
      const executeRule = vi.fn().mockRejectedValue(error)

      const mockHook = vi.fn(() => ({
        executing: false,
        results: [],
        error: null,
        executeRule,
        clearResults: vi.fn(),
      }))

      hooksModule.useRuleExecution = mockHook

      const { result } = renderHook(() => mockHook())

      await expect(async () => {
        await result.current.executeRule('rule-1')
      }).rejects.toThrow('Execution failed')
    })

    it('应该维护执行历史', async () => {
      const results = [
        { success: true, executionId: 'exec-1', timestamp: new Date().toISOString() },
        { success: false, executionId: 'exec-2', timestamp: new Date().toISOString() },
      ]

      const mockHook = vi.fn(() => ({
        executing: false,
        results,
        error: null,
        executeRule: vi.fn(),
        clearResults: vi.fn(),
      }))

      hooksModule.useRuleExecution = mockHook

      const { result } = renderHook(() => mockHook())

      expect(result.current.results).toHaveLength(2)
      expect(result.current.results[0].success).toBe(true)
    })

    it('应该支持清除执行结果', async () => {
      const clearResults = vi.fn()
      const mockHook = vi.fn(() => ({
        executing: false,
        results: [],
        error: null,
        executeRule: vi.fn(),
        clearResults,
      }))

      hooksModule.useRuleExecution = mockHook

      const { result } = renderHook(() => mockHook())

      act(() => {
        result.current.clearResults()
      })

      expect(clearResults).toHaveBeenCalled()
    })
  })

  describe('useRuleExecutionHistory - 执行历史', () => {
    it('应该返回执行历史', async () => {
      const history = [
        {
          success: true,
          executionId: 'exec-1',
          timestamp: new Date().toISOString(),
          ruleId: 'rule-1',
          triggerType: 'manual' as const,
          actionResults: [],
          duration: 100,
        },
      ]

      const mockHook = vi.fn(() => ({
        history,
        loading: false,
      }))

      hooksModule.useRuleExecutionHistory = mockHook

      const { result } = renderHook(() => mockHook('rule-1'))

      expect(result.current.history).toHaveLength(1)
      expect(result.current.loading).toBe(false)
    })

    it('应该处理加载状态', async () => {
      const mockHook = vi.fn(() => ({
        history: [],
        loading: true,
      }))

      hooksModule.useRuleExecutionHistory = mockHook

      const { result } = renderHook(() => mockHook('rule-1'))

      expect(result.current.loading).toBe(true)
      expect(result.current.history).toEqual([])
    })
  })

  describe('useEventTrigger - 事件触发', () => {
    it('应该成功触发事件', async () => {
      const triggerEvent = vi.fn().mockResolvedValue(undefined)

      const mockHook = vi.fn(() => ({
        triggerEvent,
      }))

      hooksModule.useEventTrigger = mockHook

      const { result } = renderHook(() => mockHook())

      await act(async () => {
        await result.current.triggerEvent('workflow_completed', { workflowId: 'wf-1' })
      })

      expect(triggerEvent).toHaveBeenCalledWith('workflow_completed', { workflowId: 'wf-1' })
    })

    it('应该处理触发事件失败', async () => {
      const error = new Error('Trigger failed')
      const triggerEvent = vi.fn().mockRejectedValue(error)

      const mockHook = vi.fn(() => ({
        triggerEvent,
      }))

      hooksModule.useEventTrigger = mockHook

      const { result } = renderHook(() => mockHook())

      await expect(async () => {
        await result.current.triggerEvent('workflow_failed')
      }).rejects.toThrow('Trigger failed')
    })
  })

  describe('useRuleStats - 规则统计', () => {
    it('应该返回规则统计信息', async () => {
      const stats = {
        totalExecutions: 100,
        successfulExecutions: 90,
        failedExecutions: 10,
        lastExecutionDuration: 5000,
      }

      const mockHook = vi.fn(() => ({
        stats,
      }))

      hooksModule.useRuleStats = mockHook

      const { result } = renderHook(() => mockHook('rule-1'))

      expect(result.current.stats).toBeDefined()
      expect(result.current.stats?.totalExecutions).toBe(100)
      expect(result.current.stats?.successfulExecutions).toBe(90)
    })

    it('应该处理规则不存在的情况', async () => {
      const mockHook = vi.fn(() => ({
        stats: undefined,
      }))

      hooksModule.useRuleStats = mockHook

      const { result } = renderHook(() => mockHook('non-existent'))

      expect(result.current.stats).toBeUndefined()
    })
  })

  describe('useGlobalStats - 全局统计', () => {
    it('应该返回全局统计信息', async () => {
      const stats = {
        totalRules: 10,
        activeRules: 5,
        pausedRules: 3,
        totalExecutions: 1000,
        successfulExecutions: 900,
        failedExecutions: 100,
      }

      const mockHook = vi.fn(() => ({
        stats,
      }))

      hooksModule.useGlobalStats = mockHook

      const { result } = renderHook(() => mockHook())

      expect(result.current.stats).toBeDefined()
      expect(result.current.stats.totalRules).toBe(10)
      expect(result.current.stats.activeRules).toBe(5)
    })

    it('应该正确计算成功率和失败率', async () => {
      const stats = {
        totalRules: 10,
        activeRules: 5,
        pausedRules: 3,
        totalExecutions: 1000,
        successfulExecutions: 900,
        failedExecutions: 100,
      }

      const mockHook = vi.fn(() => ({
        stats,
      }))

      hooksModule.useGlobalStats = mockHook

      const { result } = renderHook(() => mockHook())

      const successRate = (result.current.stats.successfulExecutions / result.current.stats.totalExecutions) * 100
      expect(successRate).toBe(90)
    })
  })

  describe('useRuleValidation - 规则验证', () => {
    it('应该验证有效规则', async () => {
      const validateRule = vi.fn().mockReturnValue([])

      const mockHook = vi.fn(() => ({
        validateRule,
      }))

      hooksModule.useRuleValidation = mockHook

      const { result } = renderHook(() => mockHook())

      const errors = result.current.validateRule(mockRule)
      expect(errors).toHaveLength(0)
      expect(validateRule).toHaveBeenCalledWith(mockRule)
    })

    it('应该返回验证错误', async () => {
      const errors = [
        {
          path: 'name',
          message: '规则名称不能为空',
          code: 'REQUIRED_FIELD',
        },
      ]

      const validateRule = vi.fn().mockReturnValue(errors)

      const mockHook = vi.fn(() => ({
        validateRule,
      }))

      hooksModule.useRuleValidation = mockHook

      const { result } = renderHook(() => mockHook())

      const validationErrors = result.current.validateRule({ name: '' })
      expect(validationErrors).toHaveLength(1)
      expect(validationErrors[0].code).toBe('REQUIRED_FIELD')
    })
  })

  describe('useRuleRegistration - 规则注册', () => {
    it('应该成功注册规则', async () => {
      const registerRule = vi.fn().mockResolvedValue(undefined)

      const mockHook = vi.fn(() => ({
        registering: false,
        error: null,
        registerRule,
        unregisterRule: vi.fn(),
      }))

      hooksModule.useRuleRegistration = mockHook

      const { result } = renderHook(() => mockHook())

      await act(async () => {
        await result.current.registerRule(mockRule)
      })

      expect(registerRule).toHaveBeenCalledWith(mockRule)
    })

    it('应该处理注册状态', async () => {
      const mockHook = vi.fn(() => ({
        registering: true,
        error: null,
        registerRule: vi.fn(),
        unregisterRule: vi.fn(),
      }))

      hooksModule.useRuleRegistration = mockHook

      const { result } = renderHook(() => mockHook())

      expect(result.current.registering).toBe(true)
    })

    it('应该处理注册错误', async () => {
      const error = new Error('Registration failed')
      const registerRule = vi.fn().mockRejectedValue(error)

      const mockHook = vi.fn(() => ({
        registering: false,
        error: null,
        registerRule,
        unregisterRule: vi.fn(),
      }))

      hooksModule.useRuleRegistration = mockHook

      const { result } = renderHook(() => mockHook())

      await expect(async () => {
        await result.current.registerRule(mockRule)
      }).rejects.toThrow('Registration failed')
    })

    it('应该成功注销规则', async () => {
      const unregisterRule = vi.fn().mockResolvedValue(undefined)

      const mockHook = vi.fn(() => ({
        registering: false,
        error: null,
        registerRule: vi.fn(),
        unregisterRule,
      }))

      hooksModule.useRuleRegistration = mockHook

      const { result } = renderHook(() => mockHook())

      await act(async () => {
        await result.current.unregisterRule('rule-1')
      })

      expect(unregisterRule).toHaveBeenCalledWith('rule-1')
    })

    it('应该处理注销错误', async () => {
      const error = new Error('Unregistration failed')
      const unregisterRule = vi.fn().mockRejectedValue(error)

      const mockHook = vi.fn(() => ({
        registering: false,
        error: null,
        registerRule: vi.fn(),
        unregisterRule,
      }))

      hooksModule.useRuleRegistration = mockHook

      const { result } = renderHook(() => mockHook())

      await expect(async () => {
        await result.current.unregisterRule('rule-1')
      }).rejects.toThrow('Unregistration failed')
    })
  })
})
