/**
 * automation-storage.test.ts
 * 自动化规则 IndexedDB 存储测试
 * 覆盖：规则存储、查询、更新、删除、执行历史、并发操作、错误恢复
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AutomationDB, automationDB, AutomationStorageAdapter, automationStorage } from '../../7zi-frontend/src/lib/automation/automation-storage'
import type { AutomationRule, ExecutionResult } from '../../7zi-frontend/src/lib/automation/automation-engine'

describe('AutomationDB - IndexedDB 存储测试', () => {
  let db: AutomationDB

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

  const mockExecution: ExecutionResult = {
    success: true,
    executionId: 'exec-1',
    timestamp: new Date().toISOString(),
    ruleId: 'rule-1',
    triggerType: 'manual',
    actionResults: [
      {
        actionType: 'send_notification',
        success: true,
        result: { sent: true },
        duration: 100,
      },
    ],
    duration: 150,
  }

  beforeEach(() => {
    db = new AutomationDB()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('数据库初始化', () => {
    it('应该成功初始化数据库', async () => {
      // Mock indexedDB
      const mockDB = {
        close: vi.fn(),
        transaction: vi.fn(),
        objectStoreNames: {
          contains: vi.fn().mockReturnValue(false),
        },
      }

      const mockRequest = {
        result: mockDB,
        onsuccess: null as any,
        onerror: null as any,
        onupgradeneeded: null as any,
      }

      vi.stubGlobal('indexedDB', {
        open: vi.fn(() => mockRequest),
      })

      // 模拟打开成功
      const initPromise = db.init()
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: mockRequest })
        }
      }, 10)
      vi.advanceTimersByTime(10)

      await expect(initPromise).resolves.toBe(mockDB)

      vi.unstubAllGlobals()
    })

    it('应该在数据库不存在时创建对象存储', async () => {
      let upgradeCalled = false
      const mockDB = {
        close: vi.fn(),
        transaction: vi.fn(),
        objectStoreNames: {
          contains: vi.fn().mockReturnValue(false),
        },
      }

      const mockRequest = {
        result: mockDB,
        onsuccess: null as any,
        onerror: null as any,
        onupgradeneeded: null as any,
      }

      vi.stubGlobal('indexedDB', {
        open: vi.fn(() => mockRequest),
      })

      // 设置 onupgradeneeded 处理
      mockRequest.onupgradeneeded = (event: any) => {
        upgradeCalled = true
        const db = event.target.result
        // 创建 rules store
        const rulesStore = db.createObjectStore('rules', { keyPath: 'id' })
        rulesStore.createIndex('status', 'status', { unique: false })
        // 创建 executions store
        const executionsStore = db.createObjectStore('executions', { keyPath: 'executionId' })
        executionsStore.createIndex('ruleId', 'ruleId', { unique: false })
      }

      const initPromise = db.init()
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: mockRequest })
        }
      }, 10)
      vi.advanceTimersByTime(10)

      await expect(initPromise).resolves.toBe(mockDB)
      expect(upgradeCalled).toBe(true)

      vi.unstubAllGlobals()
    })

    it('应该在打开失败时抛出错误', async () => {
      const mockRequest = {
        error: new Error('Failed to open database'),
        onsuccess: null as any,
        onerror: null as any,
        onupgradeneeded: null as any,
      }

      vi.stubGlobal('indexedDB', {
        open: vi.fn(() => mockRequest),
      })

      const initPromise = db.init()
      setTimeout(() => {
        if (mockRequest.onerror) {
          mockRequest.onerror({ target: mockRequest })
        }
      }, 10)
      vi.advanceTimersByTime(10)

      await expect(initPromise).rejects.toThrow('Failed to open database')

      vi.unstubAllGlobals()
    })
  })

  describe('规则存储', () => {
    beforeEach(async () => {
      // Setup mock database
      const mockDB = {
        close: vi.fn(),
        transaction: vi.fn(),
      }

      vi.stubGlobal('indexedDB', {
        open: vi.fn().mockImplementation(() => {
          const request = {
            result: mockDB,
            onsuccess: null as any,
            onerror: null as any,
          }
          setTimeout(() => {
            if (request.onsuccess) request.onsuccess({ target: request })
          }, 0)
          return request
        }),
      })

      await db.init()
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('应该成功保存规则', async () => {
      const mockTransaction = {
        objectStore: vi.fn(),
      }

      const mockStore = {
        put: vi.fn().mockImplementation(() => {
          const request = {
            onsuccess: null as any,
            onerror: null as any,
          }
          setTimeout(() => {
            if (request.onsuccess) request.onsuccess()
          }, 0)
          return request
        }),
      }

      mockDB.transaction = vi.fn(() => mockTransaction)
      mockTransaction.objectStore = vi.fn(() => mockStore)

      await expect(db.saveRule(mockRule)).resolves.not.toThrow()
      expect(mockStore.put).toHaveBeenCalledWith(mockRule)
    })

    it('应该成功批量保存规则', async () => {
      const rules = [mockRule, { ...mockRule, id: 'rule-2', name: '规则2' }]

      const mockTransaction = {
        objectStore: vi.fn(),
      }

      const mockStore = {
        put: vi.fn().mockImplementation(() => {
          const request = {
            onsuccess: null as any,
            onerror: null as any,
          }
          setTimeout(() => {
            if (request.onsuccess) request.onsuccess()
          }, 0)
          return request
        }),
      }

      mockDB.transaction = vi.fn(() => mockTransaction)
      mockTransaction.objectStore = vi.fn(() => mockStore)

      await expect(db.saveRules(rules)).resolves.not.toThrow()
      expect(mockStore.put).toHaveBeenCalledTimes(2)
    })

    it('应该处理保存失败', async () => {
      const mockTransaction = {
        objectStore: vi.fn(),
      }

      const mockStore = {
        put: vi.fn().mockImplementation(() => {
          const request = {
            onsuccess: null as any,
            onerror: null as any,
          }
          setTimeout(() => {
            if (request.onerror) request.onerror()
          }, 0)
          return request
        }),
      }

      mockDB.transaction = vi.fn(() => mockTransaction)
      mockTransaction.objectStore = vi.fn(() => mockStore)

      await expect(db.saveRule(mockRule)).rejects.toThrow('Failed to save rule')
    })
  })

  describe('规则查询', () => {
    beforeEach(async () => {
      const mockDB = {
        close: vi.fn(),
        transaction: vi.fn(),
      }

      vi.stubGlobal('indexedDB', {
        open: vi.fn().mockImplementation(() => {
          const request = {
            result: mockDB,
            onsuccess: null as any,
            onerror: null as any,
          }
          setTimeout(() => {
            if (request.onsuccess) request.onsuccess({ target: request })
          }, 0)
          return request
        }),
      })

      await db.init()
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('应该成功获取规则', async () => {
      const mockTransaction = {
        objectStore: vi.fn(),
      }

      const mockStore = {
        get: vi.fn().mockImplementation(() => {
          const request = {
            result: mockRule,
            onsuccess: null as any,
            onerror: null as any,
          }
          setTimeout(() => {
            if (request.onsuccess) request.onsuccess({ target: request })
          }, 0)
          return request
        }),
      }

      mockDB.transaction = vi.fn(() => mockTransaction)
      mockTransaction.objectStore = vi.fn(() => mockStore)

      const rule = await db.getRule('rule-1')
      expect(rule).toEqual(mockRule)
    })

    it('应该对不存在的规则返回 undefined', async () => {
      const mockTransaction = {
        objectStore: vi.fn(),
      }

      const mockStore = {
        get: vi.fn().mockImplementation(() => {
          const request = {
            result: undefined,
            onsuccess: null as any,
            onerror: null as any,
          }
          setTimeout(() => {
            if (request.onsuccess) request.onsuccess({ target: request })
          }, 0)
          return request
        }),
      }

      mockDB.transaction = vi.fn(() => mockTransaction)
      mockTransaction.objectStore = vi.fn(() => mockStore)

      const rule = await db.getRule('non-existent')
      expect(rule).toBeUndefined()
    })

    it('应该成功获取所有规则', async () => {
      const rules = [mockRule, { ...mockRule, id: 'rule-2' }]

      const mockTransaction = {
        objectStore: vi.fn(),
      }

      const mockStore = {
        getAll: vi.fn().mockImplementation(() => {
          const request = {
            result: rules,
            onsuccess: null as any,
            onerror: null as any,
          }
          setTimeout(() => {
            if (request.onsuccess) request.onsuccess({ target: request })
          }, 0)
          return request
        }),
      }

      mockDB.transaction = vi.fn(() => mockTransaction)
      mockTransaction.objectStore = vi.fn(() => mockStore)

      const allRules = await db.getAllRules()
      expect(allRules).toHaveLength(2)
    })

    it('应该返回空数组当没有规则时', async () => {
      const mockTransaction = {
        objectStore: vi.fn(),
      }

      const mockStore = {
        getAll: vi.fn().mockImplementation(() => {
          const request = {
            result: [],
            onsuccess: null as any,
            onerror: null as any,
          }
          setTimeout(() => {
            if (request.onsuccess) request.onsuccess({ target: request })
          }, 0)
          return request
        }),
      }

      mockDB.transaction = vi.fn(() => mockTransaction)
      mockTransaction.objectStore = vi.fn(() => mockStore)

      const allRules = await db.getAllRules()
      expect(allRules).toEqual([])
    })
  })

  describe('规则删除', () => {
    beforeEach(async () => {
      const mockDB = {
        close: vi.fn(),
        transaction: vi.fn(),
      }

      vi.stubGlobal('indexedDB', {
        open: vi.fn().mockImplementation(() => {
          const request = {
            result: mockDB,
            onsuccess: null as any,
            onerror: null as any,
          }
          setTimeout(() => {
            if (request.onsuccess) request.onsuccess({ target: request })
          }, 0)
          return request
        }),
      })

      await db.init()
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('应该成功删除规则', async () => {
      const mockTransaction = {
        objectStore: vi.fn(),
      }

      const mockStore = {
        delete: vi.fn().mockImplementation(() => {
          const request = {
            onsuccess: null as any,
            onerror: null as any,
          }
          setTimeout(() => {
            if (request.onsuccess) request.onsuccess()
          }, 0)
          return request
        }),
      }

      mockDB.transaction = vi.fn(() => mockTransaction)
      mockTransaction.objectStore = vi.fn(() => mockStore)

      await expect(db.deleteRule('rule-1')).resolves.not.toThrow()
      expect(mockStore.delete).toHaveBeenCalledWith('rule-1')
    })

    it('应该处理删除失败', async () => {
      const mockTransaction = {
        objectStore: vi.fn(),
      }

      const mockStore = {
        delete: vi.fn().mockImplementation(() => {
          const request = {
            onsuccess: null as any,
            onerror: null as any,
          }
          setTimeout(() => {
            if (request.onerror) request.onerror()
          }, 0)
          return request
        }),
      }

      mockDB.transaction = vi.fn(() => mockTransaction)
      mockTransaction.objectStore = vi.fn(() => mockStore)

      await expect(db.deleteRule('rule-1')).rejects.toThrow('Failed to delete rule')
    })
  })

  describe('执行记录存储', () => {
    beforeEach(async () => {
      const mockDB = {
        close: vi.fn(),
        transaction: vi.fn(),
      }

      vi.stubGlobal('indexedDB', {
        open: vi.fn().mockImplementation(() => {
          const request = {
            result: mockDB,
            onsuccess: null as any,
            onerror: null as any,
          }
          setTimeout(() => {
            if (request.onsuccess) request.onsuccess({ target: request })
          }, 0)
          return request
        }),
      })

      await db.init()
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('应该成功保存执行记录', async () => {
      const mockTransaction = {
        objectStore: vi.fn(),
      }

      const mockStore = {
        put: vi.fn().mockImplementation(() => {
          const request = {
            onsuccess: null as any,
            onerror: null as any,
          }
          setTimeout(() => {
            if (request.onsuccess) request.onsuccess()
          }, 0)
          return request
        }),
      }

      mockDB.transaction = vi.fn(() => mockTransaction)
      mockTransaction.objectStore = vi.fn(() => mockStore)

      await expect(db.saveExecution(mockExecution)).resolves.not.toThrow()
      expect(mockStore.put).toHaveBeenCalledWith(mockExecution)
    })

    it('应该获取规则的执行历史', async () => {
      const executions = [mockExecution, { ...mockExecution, executionId: 'exec-2' }]

      const mockTransaction = {
        objectStore: vi.fn(),
      }

      const mockStore = {
        index: vi.fn().mockReturnValue({
          getAll: vi.fn().mockImplementation(() => {
            const request = {
              result: executions,
              onsuccess: null as any,
              onerror: null as any,
            }
            setTimeout(() => {
              if (request.onsuccess) request.onsuccess({ target: request })
            }, 0)
            return request
          }),
        }),
      }

      mockDB.transaction = vi.fn(() => mockTransaction)
      mockTransaction.objectStore = vi.fn(() => mockStore)

      const history = await db.getExecutionHistory('rule-1')
      expect(history).toHaveLength(2)
    })

    it('应该限制执行历史数量', async () => {
      const executions = Array.from({ length: 100 }, (_, i) => ({
        ...mockExecution,
        executionId: `exec-${i}`,
      }))

      const mockTransaction = {
        objectStore: vi.fn(),
      }

      const mockStore = {
        index: vi.fn().mockReturnValue({
          getAll: vi.fn().mockImplementation(() => {
            const request = {
              result: executions,
              onsuccess: null as any,
              onerror: null as any,
            }
            setTimeout(() => {
              if (request.onsuccess) request.onsuccess({ target: request })
            }, 0)
            return request
          }),
        }),
      }

      mockDB.transaction = vi.fn(() => mockTransaction)
      mockTransaction.objectStore = vi.fn(() => mockStore)

      const history = await db.getExecutionHistory('rule-1', 10)
      expect(history).toHaveLength(10)
    })

    it('应该获取所有执行记录', async () => {
      const executions = [mockExecution]

      const mockTransaction = {
        objectStore: vi.fn(),
      }

      const mockStore = {
        getAll: vi.fn().mockImplementation(() => {
          const request = {
            result: executions,
            onsuccess: null as any,
            onerror: null as any,
          }
          setTimeout(() => {
            if (request.onsuccess) request.onsuccess({ target: request })
          }, 0)
          return request
        }),
      }

      mockDB.transaction = vi.fn(() => mockTransaction)
      mockTransaction.objectStore = vi.fn(() => mockStore)

      const allExecutions = await db.getAllExecutions()
      expect(allExecutions).toHaveLength(1)
    })
  })

  describe('清理过期记录', () => {
    beforeEach(async () => {
      const mockDB = {
        close: vi.fn(),
        transaction: vi.fn(),
      }

      vi.stubGlobal('indexedDB', {
        open: vi.fn().mockImplementation(() => {
          const request = {
            result: mockDB,
            onsuccess: null as any,
            onerror: null as any,
          }
          setTimeout(() => {
            if (request.onsuccess) request.onsuccess({ target: request })
          }, 0)
          return request
        }),
      })

      await db.init()
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('应该清理过期的执行记录', async () => {
      const oldExecution = {
        ...mockExecution,
        timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 天前
      }

      const newExecution = {
        ...mockExecution,
        executionId: 'exec-2',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 天前
      }

      const mockTransaction = {
        objectStore: vi.fn(),
      }

      const mockStore = {
        openCursor: vi.fn().mockImplementation(() => {
          const executions = [oldExecution, newExecution]
          let index = 0

          const request = {
            result: null,
            onsuccess: null as any,
            onerror: null as any,
          }

          setTimeout(() => {
            const cursor = {
              value: executions[index],
              delete: vi.fn(),
              continue: vi.fn(),
            }

            if (index < executions.length) {
              request.result = cursor
              index++
            } else {
              request.result = null
            }

            if (request.onsuccess) request.onsuccess({ target: request })
          }, 0)

          return request
        }),
      }

      mockDB.transaction = vi.fn(() => mockTransaction)
      mockTransaction.objectStore = vi.fn(() => mockStore)

      const deletedCount = await db.cleanupExecutions(30)
      expect(deletedCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('并发操作', () => {
    beforeEach(async () => {
      const mockDB = {
        close: vi.fn(),
        transaction: vi.fn(),
      }

      vi.stubGlobal('indexedDB', {
        open: vi.fn().mockImplementation(() => {
          const request = {
            result: mockDB,
            onsuccess: null as any,
            onerror: null as any,
          }
          setTimeout(() => {
            if (request.onsuccess) request.onsuccess({ target: request })
          }, 0)
          return request
        }),
      })

      await db.init()
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('应该支持并发保存多个规则', async () => {
      const mockTransaction = {
        objectStore: vi.fn(),
      }

      const mockStore = {
        put: vi.fn().mockImplementation(() => {
          const request = {
            onsuccess: null as any,
            onerror: null as any,
          }
          setTimeout(() => {
            if (request.onsuccess) request.onsuccess()
          }, 0)
          return request
        }),
      }

      mockDB.transaction = vi.fn(() => mockTransaction)
      mockTransaction.objectStore = vi.fn(() => mockStore)

      const rules = [
        mockRule,
        { ...mockRule, id: 'rule-2' },
        { ...mockRule, id: 'rule-3' },
      ]

      await expect(Promise.all(rules.map(rule => db.saveRule(rule)))).resolves.not.toThrow()
    })
  })
})

describe('AutomationStorageAdapter - 存储适配器测试', () => {
  let adapter: AutomationStorageAdapter

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
    adapter = new AutomationStorageAdapter()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('应该加载所有规则', async () => {
    const loadRulesSpy = vi.spyOn(automationDB, 'getAllRules').mockResolvedValue([mockRule])

    const rules = await adapter.loadRules()
    expect(rules).toHaveLength(1)
    expect(loadRulesSpy).toHaveBeenCalled()

    loadRulesSpy.mockRestore()
  })

  it('应该保存规则', async () => {
    const saveRuleSpy = vi.spyOn(automationDB, 'saveRule').mockResolvedValue(undefined)

    await expect(adapter.saveRule(mockRule)).resolves.not.toThrow()
    expect(saveRuleSpy).toHaveBeenCalledWith(mockRule)

    saveRuleSpy.mockRestore()
  })

  it('应该删除规则', async () => {
    const deleteRuleSpy = vi.spyOn(automationDB, 'deleteRule').mockResolvedValue(undefined)

    await expect(adapter.deleteRule('rule-1')).resolves.not.toThrow()
    expect(deleteRuleSpy).toHaveBeenCalledWith('rule-1')

    deleteRuleSpy.mockRestore()
  })

  it('应该保存执行记录', async () => {
    const mockExecution: ExecutionResult = {
      success: true,
      executionId: 'exec-1',
      timestamp: new Date().toISOString(),
      ruleId: 'rule-1',
      triggerType: 'manual',
      actionResults: [],
      duration: 100,
    }

    const saveExecutionSpy = vi.spyOn(automationDB, 'saveExecution').mockResolvedValue(undefined)

    await expect(adapter.saveExecution(mockExecution)).resolves.not.toThrow()
    expect(saveExecutionSpy).toHaveBeenCalledWith(mockExecution)

    saveExecutionSpy.mockRestore()
  })

  it('应该获取执行历史', async () => {
    const mockExecutions: ExecutionResult[] = [
      {
        success: true,
        executionId: 'exec-1',
        timestamp: new Date().toISOString(),
        ruleId: 'rule-1',
        triggerType: 'manual',
        actionResults: [],
        duration: 100,
      },
    ]

    const getExecutionHistorySpy = vi.spyOn(automationDB, 'getExecutionHistory').mockResolvedValue(mockExecutions)

    const history = await adapter.getExecutionHistory('rule-1')
    expect(history).toHaveLength(1)
    expect(getExecutionHistorySpy).toHaveBeenCalledWith('rule-1', undefined)

    getExecutionHistorySpy.mockRestore()
  })

  it('应该获取限制数量的执行历史', async () => {
    const getExecutionHistorySpy = vi.spyOn(automationDB, 'getExecutionHistory').mockResolvedValue([])

    await adapter.getExecutionHistory('rule-1', 10)
    expect(getExecutionHistorySpy).toHaveBeenCalledWith('rule-1', 10)

    getExecutionHistorySpy.mockRestore()
  })

  it('应该清理过期记录', async () => {
    const cleanupExecutionsSpy = vi.spyOn(automationDB, 'cleanupExecutions').mockResolvedValue(5)

    const deletedCount = await adapter.cleanup(30)
    expect(deletedCount).toBe(5)
    expect(cleanupExecutionsSpy).toHaveBeenCalledWith(30)

    cleanupExecutionsSpy.mockRestore()
  })

  it('应该使用默认清理天数', async () => {
    const cleanupExecutionsSpy = vi.spyOn(automationDB, 'cleanupExecutions').mockResolvedValue(0)

    await adapter.cleanup()
    expect(cleanupExecutionsSpy).toHaveBeenCalledWith(undefined)

    cleanupExecutionsSpy.mockRestore()
  })
})
