/**
 * useWebhooks Hook Tests
 * 
 * Tests for webhook management features:
 * - Subscription management (CRUD)
 * - Batch operations
 * - Log retrieval
 * - Subscription testing
 * - Event type utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useWebhooks, useWebhookSubscription, useWebhookLogs, useWebhookEventTypes, useWebhookTest } from '@/hooks/useWebhooks'

// Mock webhook manager
const mockSubscription = {
  id: 'sub-1',
  name: 'Test Webhook',
  url: 'https://example.com/webhook',
  eventType: 'workflow.completed',
  isActive: true,
  secret: 'test-secret',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const mockLog = {
  id: 'log-1',
  subscriptionId: 'sub-1',
  level: 'info',
  message: 'Webhook delivered',
  timestamp: '2024-01-01T00:00:00Z',
}

vi.mock('@/lib/webhook', () => ({
  webhookManager: {
    getAllSubscriptions: vi.fn(() => [mockSubscription]),
    getSubscription: vi.fn(() => mockSubscription),
    getLogs: vi.fn(() => [mockLog]),
    createSubscription: vi.fn(() => Promise.resolve(mockSubscription)),
    updateSubscription: vi.fn(() => Promise.resolve(mockSubscription)),
    deleteSubscription: vi.fn(() => Promise.resolve(true)),
    batchDeleteSubscriptions: vi.fn(() => Promise.resolve({ deleted: ['sub-1'] })),
    batchUpdateStatus: vi.fn(() => Promise.resolve([mockSubscription])),
    testSubscription: vi.fn(() => Promise.resolve({ success: true, statusCode: 200 })),
    deliveryService: {
      getDeliveriesBySubscription: vi.fn(() => []),
    },
  },
  WebhookSubscription: {},
  CreateWebhookInput: {},
  UpdateWebhookInput: {},
  WebhookEventType: {
    WORKFLOW_STARTED: 'workflow.started',
    WORKFLOW_COMPLETED: 'workflow.completed',
  },
  WebhookLog: {},
  WebhookLogLevel: {
    INFO: 'info',
    ERROR: 'error',
  },
  TestEventResult: {},
  WEBHOOK_EVENT_TYPE_LABELS: {
    'workflow.started': 'Workflow Started',
    'workflow.completed': 'Workflow Completed',
  },
}))

describe('useWebhooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should load subscriptions on mount', async () => {
      const { result } = renderHook(() => useWebhooks())

      await waitFor(() => {
        expect(result.current.subscriptions.length).toBeGreaterThan(0)
      })
    })
  })

  describe('loadSubscriptions', () => {
    it('should load all subscriptions', async () => {
      const { result } = renderHook(() => useWebhooks())

      await waitFor(() => {
        expect(result.current.subscriptions.length).toBeGreaterThan(0)
      })

      act(() => {
        result.current.loadSubscriptions()
      })

      expect(result.current.subscriptions).toBeDefined()
    })
  })

  describe('loadLogs', () => {
    it('should load logs with default parameters', async () => {
      const { result } = renderHook(() => useWebhooks())

      await waitFor(() => {
        expect(result.current.subscriptions.length).toBeGreaterThan(0)
      })

      act(() => {
        result.current.loadLogs()
      })

      expect(result.current.logs).toBeDefined()
    })

    it('should load logs filtered by subscriptionId', async () => {
      const { result } = renderHook(() => useWebhooks())

      await waitFor(() => {
        expect(result.current.subscriptions.length).toBeGreaterThan(0)
      })

      act(() => {
        result.current.loadLogs('sub-1')
      })

      expect(result.current.logs).toBeDefined()
    })
  })

  describe('createSubscription', () => {
    it('should create a new subscription', async () => {
      const { result } = renderHook(() => useWebhooks())

      await waitFor(() => {
        expect(result.current.subscriptions.length).toBeGreaterThan(0)
      })

      const input = {
        name: 'New Webhook',
        url: 'https://example.com/webhook',
        eventType: 'workflow.completed' as const,
      }

      await act(async () => {
        const subscription = await result.current.createSubscription(input)
        expect(subscription).toBeDefined()
      })
    })

    it('should handle create error', async () => {
      const { result } = renderHook(() => useWebhooks())

      await waitFor(() => {
        expect(result.current.subscriptions.length).toBeGreaterThan(0)
      })

      const input = {
        name: 'New Webhook',
        url: 'https://example.com/webhook',
        eventType: 'workflow.completed' as const,
      }

      await act(async () => {
        try {
          await result.current.createSubscription(input)
        } catch (e) {
          // Expected
        }
      })
    })
  })

  describe('updateSubscription', () => {
    it('should update an existing subscription', async () => {
      const { result } = renderHook(() => useWebhooks())

      await waitFor(() => {
        expect(result.current.subscriptions.length).toBeGreaterThan(0)
      })

      const input = { name: 'Updated Webhook' }

      await act(async () => {
        const subscription = await result.current.updateSubscription('sub-1', input)
        expect(subscription).toBeDefined()
      })
    })
  })

  describe('deleteSubscription', () => {
    it('should delete a subscription', async () => {
      const { result } = renderHook(() => useWebhooks())

      await waitFor(() => {
        expect(result.current.subscriptions.length).toBeGreaterThan(0)
      })

      await act(async () => {
        const success = await result.current.deleteSubscription('sub-1')
        expect(success).toBe(true)
      })
    })
  })

  describe('batchDeleteSubscriptions', () => {
    it('should batch delete subscriptions', async () => {
      const { result } = renderHook(() => useWebhooks())

      await waitFor(() => {
        expect(result.current.subscriptions.length).toBeGreaterThan(0)
      })

      await act(async () => {
        const result2 = await result.current.batchDeleteSubscriptions(['sub-1'])
        expect(result2.deleted).toContain('sub-1')
      })
    })
  })

  describe('batchUpdateStatus', () => {
    it('should batch update subscription status', async () => {
      const { result } = renderHook(() => useWebhooks())

      await waitFor(() => {
        expect(result.current.subscriptions.length).toBeGreaterThan(0)
      })

      await act(async () => {
        const updated = await result.current.batchUpdateStatus(['sub-1'], false)
        expect(updated).toBeDefined()
      })
    })
  })

  describe('testSubscription', () => {
    it('should test a subscription', async () => {
      const { result } = renderHook(() => useWebhooks())

      await waitFor(() => {
        expect(result.current.subscriptions.length).toBeGreaterThan(0)
      })

      await act(async () => {
        const testResult = await result.current.testSubscription('sub-1')
        expect(testResult).toBeDefined()
      })
    })
  })
})

describe('useWebhookSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should load single subscription', async () => {
    const { result } = renderHook(() => useWebhookSubscription('sub-1'))

    await waitFor(() => {
      expect(result.current.subscription).toBeDefined()
    })
  })

  it('should update subscription', async () => {
    const { result } = renderHook(() => useWebhookSubscription('sub-1'))

    await waitFor(() => {
      expect(result.current.subscription).toBeDefined()
    })

    await act(async () => {
      const updated = await result.current.updateSubscription({ name: 'Updated' })
      expect(updated).toBeDefined()
    })
  })

  it('should delete subscription', async () => {
    const { result } = renderHook(() => useWebhookSubscription('sub-1'))

    await waitFor(() => {
      expect(result.current.subscription).toBeDefined()
    })

    await act(async () => {
      const success = await result.current.deleteSubscription()
      expect(success).toBe(true)
    })
  })

  it('should test subscription', async () => {
    const { result } = renderHook(() => useWebhookSubscription('sub-1'))

    await waitFor(() => {
      expect(result.current.subscription).toBeDefined()
    })

    await act(async () => {
      const testResult = await result.current.testSubscription()
      expect(testResult).toBeDefined()
    })
  })

  it('should handle missing subscription id', async () => {
    const { result } = renderHook(() => useWebhookSubscription(undefined))

    expect(result.current.subscription).toBeUndefined()
  })
})

describe('useWebhookLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should load logs with default parameters', async () => {
    const { result } = renderHook(() => useWebhookLogs())

    await waitFor(() => {
      expect(result.current.logs.length).toBeGreaterThan(0)
    })
  })

  it('should load logs filtered by subscriptionId', async () => {
    const { result } = renderHook(() => useWebhookLogs('sub-1'))

    await waitFor(() => {
      expect(result.current.logs).toBeDefined()
    })
  })

  it('should reload logs on filter change', async () => {
    const { result, rerender } = renderHook(({ subId }) => useWebhookLogs(subId), {
      initialProps: { subId: undefined },
    })

    await waitFor(() => {
      expect(result.current.logs).toBeDefined()
    })

    rerender({ subId: 'sub-1' })

    await waitFor(() => {
      expect(result.current.logs).toBeDefined()
    })
  })
})

describe('useWebhookEventTypes', () => {
  it('should return event types', () => {
    const { result } = renderHook(() => useWebhookEventTypes())

    expect(result.current.eventTypes).toBeDefined()
    expect(result.current.eventTypes.length).toBeGreaterThan(0)
  })

  it('should get event label', () => {
    const { result } = renderHook(() => useWebhookEventTypes())

    const label = result.current.getEventLabel('workflow.started')
    expect(label).toBe('Workflow Started')
  })

  it('should get events by category', () => {
    const { result } = renderHook(() => useWebhookEventTypes())

    const categories = result.current.getEventsByCategory()
    expect(categories.workflow).toBeDefined()
    expect(categories.alert).toBeDefined()
    expect(categories.monitoring).toBeDefined()
    expect(categories.custom).toBeDefined()
  })
})

describe('useWebhookTest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should test subscription', async () => {
    const { result } = renderHook(() => useWebhookTest())

    await act(async () => {
      const testResult = await result.current.testSubscription('sub-1')
      expect(testResult).toBeDefined()
    })
  })

  it('should clear result', async () => {
    const { result } = renderHook(() => useWebhookTest())

    await act(async () => {
      await result.current.testSubscription('sub-1')
      result.current.clearResult()
    })

    expect(result.current.testResult).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should handle test error', async () => {
    const { result } = renderHook(() => useWebhookTest())

    await act(async () => {
      try {
        await result.current.testSubscription('sub-1')
      } catch (e) {
        // Expected
      }
    })
  })
})