/**
 * SMS Alert Channel - 高级单元测试（发送 / 失败 / 超时 全链路）
 * 短信告警渠道高级测试
 *
 * 本文件补齐 T4 报告未真正覆盖的部分：
 * - **真实超时路径**：断言 `AbortSignal.timeout` 被真正注入 fetch 请求参数，
 *   并验证超时（AbortError）与普通网络错误的区分处理
 * - **重试路径**：可重试错误会按指数退避重试；不可重试错误立即失败
 * - **限流 / 去重 / 过滤器**：来自 BaseAlertChannel 的前置门禁
 * - **多收件人部分失败**：第一个收件人失败后不应继续发送
 * - **渠道指标**：getMetrics() 的计数正确性
 *
 * 全部使用 mock，绝不发起真实短信请求。
 *
 * @version 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SMSAlertChannel, createSMSChannelFromEnv } from '../sms-alert'
import type { SMSChannelConfig } from '../sms-alert'
import { Alert } from '../../alert-engine'
import type { DedupConfig, RetryConfig } from '../base-alert-channel'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createMockAlert = (overrides: Partial<Alert> = {}): Alert => ({
  id: 'alert-1',
  ruleId: 'rule-1',
  ruleName: 'CPU Usage High',
  priority: 'P1',
  severity: 'error',
  status: 'firing',
  metric: 'cpu_usage',
  message: 'CPU usage exceeded threshold',
  value: 90,
  threshold: 80,
  timestamp: Date.now(),
  startedAt: Date.now(),
  fingerprint: 'cpu_usage:90',
  ...overrides,
})

const okResponse = (): Response =>
  ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ success: true }),
  }) as unknown as Response

const errorResponse = (status = 500, statusText = 'Internal Server Error'): Response =>
  ({
    ok: false,
    status,
    statusText,
    json: async () => ({ success: false, error: statusText }),
  }) as unknown as Response

/** 构造一个带 `code` 的错误（模拟 ECONNREFUSED / ETIMEDOUT 等可重试错误） */
const codedError = (code: string, message = `socket failure ${code}`): Error =>
  Object.assign(new Error(message), { code })

const baseConfig = (overrides: Partial<SMSChannelConfig> = {}): SMSChannelConfig => ({
  gatewayUrl: 'https://sms-gateway.example.com',
  apiKey: 'test-api-key',
  senderId: '7ZI',
  recipients: {
    P0: ['+1000000000'],
    P1: ['+1000000001'],
    P2: ['+1000000002'],
    P3: ['+1000000003'],
  },
  ...overrides,
})

const bodyOf = (call: unknown): { to: string; from?: string; message: string } =>
  JSON.parse((call as [string, { body: string }])[1].body)

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SMSAlertChannel - 发送/失败/超时全链路', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock = vi.fn().mockResolvedValue(okResponse())
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // =========================================================================
  // 发送路径
  // =========================================================================
  describe('发送路径', () => {
    it('发送成功后应记录 totalSent 指标并更新 lastSentAt', async () => {
      const channel = new SMSAlertChannel(baseConfig())

      await channel.send(createMockAlert())

      const metrics = channel.getMetrics()
      expect(metrics.totalSent).toBe(1)
      expect(metrics.totalFailed).toBe(0)
      expect(metrics.lastSentAt).toBeGreaterThan(0)
    })

    it('同一次告警应按顺序串行发送给该优先级的每个收件人', async () => {
      const channel = new SMSAlertChannel(
        baseConfig({
          recipients: {
            P0: [],
            P1: ['+1000000001', '+1000000002', '+1000000003'],
            P2: [],
            P3: [],
          },
        })
      )

      await channel.send(createMockAlert({ priority: 'P1' }))

      expect(fetchMock).toHaveBeenCalledTimes(3)
      expect(fetchMock.mock.calls.map(c => bodyOf(c).to)).toEqual([
        '+1000000001',
        '+1000000002',
        '+1000000003',
      ])
    })

    it('all 收件人应与优先级收件人去重后合并', async () => {
      const channel = new SMSAlertChannel(
        baseConfig({
          recipients: {
            P0: [],
            P1: ['+1000000001', '+1000000002'],
            P2: [],
            P3: [],
            all: ['+1000000002', '+1000000099'],
          },
        })
      )

      await channel.send(createMockAlert({ priority: 'P1' }))

      const recipients = fetchMock.mock.calls.map(c => bodyOf(c).to)
      expect(recipients).toEqual(['+1000000001', '+1000000002', '+1000000099'])
      expect(new Set(recipients).size).toBe(recipients.length)
    })

    it('第一个收件人发送失败后不应继续发送后续收件人', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'))
      const channel = new SMSAlertChannel(
        baseConfig({
          recipients: { P0: [], P1: ['+1000000001', '+1000000002'], P2: [], P3: [] },
        })
      )

      await expect(channel.send(createMockAlert({ priority: 'P1' }))).rejects.toThrow(
        'Network error'
      )

      // 失败即中断循环，不会为第二个收件人发起请求
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(bodyOf(fetchMock.mock.calls[0]).to).toBe('+1000000001')
    })
  })

  // =========================================================================
  // 失败路径
  // =========================================================================
  describe('失败路径', () => {
    it('网关返回 5xx 时应抛出错误并记录 totalFailed', async () => {
      fetchMock.mockResolvedValue(errorResponse(503, 'Service Unavailable'))
      const channel = new SMSAlertChannel(baseConfig())

      await expect(channel.send(createMockAlert())).rejects.toThrow(
        /SMS gateway returned 503/
      )

      const metrics = channel.getMetrics()
      expect(metrics.totalFailed).toBe(1)
      expect(metrics.totalSent).toBe(0)
    })

    it('网关失败时应通过 logger.error 记录错误（console.error）', async () => {
      fetchMock.mockResolvedValue(errorResponse(500, 'Internal Server Error'))
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const channel = new SMSAlertChannel(baseConfig())

      await expect(channel.send(createMockAlert())).rejects.toThrow()

      expect(errorSpy).toHaveBeenCalled()
      const logged = errorSpy.mock.calls.map(c => String(c[0])).join('\n')
      expect(logged).toContain('[SMSAlert] Failed to send SMS:')
      errorSpy.mockRestore()
    })

    it('可重试错误（ECONNREFUSED）应按配置重试并最终抛出', async () => {
      fetchMock.mockRejectedValue(codedError('ECONNREFUSED'))

      const retry: RetryConfig = {
        maxRetries: 2,
        initialDelayMs: 1,
        maxDelayMs: 2,
        backoffMultiplier: 2,
        retryableErrors: ['ECONNREFUSED'],
      }
      const channel = new SMSAlertChannel(baseConfig({ retry }))

      await expect(channel.send(createMockAlert())).rejects.toThrow('socket failure ECONNREFUSED')

      // 首次 + 2 次重试
      expect(fetchMock).toHaveBeenCalledTimes(3)
      expect(channel.getMetrics().totalRetried).toBe(2)
      expect(channel.getMetrics().totalFailed).toBe(1)
    })

    it('不可重试错误（HTTP 500）不应触发重试', async () => {
      fetchMock.mockResolvedValue(errorResponse(500, 'Internal Server Error'))

      const retry: RetryConfig = {
        maxRetries: 3,
        initialDelayMs: 1,
        maxDelayMs: 2,
        backoffMultiplier: 2,
        retryableErrors: ['ECONNREFUSED'],
      }
      const channel = new SMSAlertChannel(baseConfig({ retry }))

      await expect(channel.send(createMockAlert())).rejects.toThrow(/SMS gateway returned 500/)

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(channel.getMetrics().totalRetried).toBe(0)
    })

    it('重试成功时不应抛出错误且 totalSent 应递增', async () => {
      fetchMock
        .mockRejectedValueOnce(codedError('ETIMEDOUT'))
        .mockResolvedValueOnce(okResponse())

      const retry: RetryConfig = {
        maxRetries: 2,
        initialDelayMs: 1,
        maxDelayMs: 2,
        backoffMultiplier: 2,
        retryableErrors: ['ETIMEDOUT'],
      }
      const channel = new SMSAlertChannel(baseConfig({ retry }))

      await expect(channel.send(createMockAlert())).resolves.toBeUndefined()

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(channel.getMetrics().totalSent).toBe(1)
      expect(channel.getMetrics().totalFailed).toBe(0)
    })
  })

  // =========================================================================
  // 超时路径
  // =========================================================================
  describe('超时路径', () => {
    it('发送请求应注入 AbortSignal.timeout 生成的 signal', async () => {
      const channel = new SMSAlertChannel(baseConfig({ timeout: 5000 }))

      await channel.send(createMockAlert())

      const [, init] = fetchMock.mock.calls[0] as [string, { signal?: AbortSignal }]
      expect(init.signal).toBeInstanceOf(AbortSignal)
      expect(init.signal?.aborted).toBe(false)
    })

    it('testConnection 请求也应注入 AbortSignal signal', async () => {
      const channel = new SMSAlertChannel(baseConfig({ timeout: 3000 }))

      await channel.testConnection()

      const [, init] = fetchMock.mock.calls[0] as [string, { signal?: AbortSignal }]
      expect(init.signal).toBeInstanceOf(AbortSignal)
    })

    it('timeout 设为 0 时不应注入 signal（不主动中断）', async () => {
      const channel = new SMSAlertChannel(baseConfig({ timeout: 0 }))

      await channel.send(createMockAlert())

      const [, init] = fetchMock.mock.calls[0] as [string, { signal?: AbortSignal }]
      expect(init.signal).toBeUndefined()
    })

    it('未显式配置 timeout 时应使用默认超时并注入 signal', async () => {
      const channel = new SMSAlertChannel(baseConfig())

      expect(channel.getConfig().timeout).toBe(10000)

      await channel.send(createMockAlert())

      const [, init] = fetchMock.mock.calls[0] as [string, { signal?: AbortSignal }]
      expect(init.signal).toBeInstanceOf(AbortSignal)
    })

    it('AbortError（超时）应向上抛出且不被吞掉', async () => {
      const abortError = new Error('The operation was aborted due to timeout')
      abortError.name = 'AbortError'
      fetchMock.mockRejectedValue(abortError)

      const channel = new SMSAlertChannel(baseConfig({ timeout: 10 }))

      await expect(channel.send(createMockAlert())).rejects.toThrow(/aborted due to timeout/)

      // 超时错误不应被重试（默认 retryableErrors 不含 AbortError）
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(channel.getMetrics().totalFailed).toBe(1)
    })

    it('真正超时的 signal 会被 abort（fake timers 验证）', async () => {
      vi.useFakeTimers()
      try {
        let capturedSignal: AbortSignal | undefined
        fetchMock.mockImplementation((_url: string, init: { signal?: AbortSignal }) => {
          capturedSignal = init.signal
          return new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              const err = new Error('aborted')
              err.name = 'AbortError'
              reject(err)
            })
          })
        })

        const channel = new SMSAlertChannel(baseConfig({ timeout: 1000 }))
        const promise = channel.send(createMockAlert())

        await vi.advanceTimersByTimeAsync(1500)

        await expect(promise).rejects.toThrow(/aborted/)
        expect(capturedSignal?.aborted).toBe(true)
      } finally {
        vi.useRealTimers()
      }
    })

    it('testConnection 遇到超时异常时应返回 false 而非抛出', async () => {
      const abortError = new Error('aborted')
      abortError.name = 'AbortError'
      fetchMock.mockRejectedValue(abortError)

      const channel = new SMSAlertChannel(baseConfig({ timeout: 10 }))

      expect(await channel.testConnection()).toBe(false)
    })
  })

  // =========================================================================
  // 前置门禁：限流 / 去重 / 过滤器
  // =========================================================================
  describe('前置门禁', () => {
    it('超过每分钟限流时应抛出 Rate limit exceeded 且不发起请求', async () => {
      const channel = new SMSAlertChannel(
        baseConfig({
          rateLimit: { maxAlertsPerMinute: 1, maxAlertsPerHour: 10 },
          dedup: { enabled: false, windowMs: 60000, keys: ['ruleId'] } as DedupConfig,
        })
      )

      await channel.send(createMockAlert({ id: 'a1' }))
      expect(fetchMock).toHaveBeenCalledTimes(1)

      await expect(channel.send(createMockAlert({ id: 'a2' }))).rejects.toThrow(
        'Rate limit exceeded'
      )
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('重复告警应被去重，第二次不发起请求', async () => {
      const channel = new SMSAlertChannel(baseConfig())

      await channel.send(createMockAlert())
      await channel.send(createMockAlert())

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(channel.getMetrics().totalDeduped).toBe(1)
    })

    it('severityFilter 不匹配时应跳过发送', async () => {
      const channel = new SMSAlertChannel(
        baseConfig({ severityFilter: ['critical'] })
      )

      await channel.send(createMockAlert({ severity: 'info' }))

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('priorityFilter 不匹配时应跳过发送', async () => {
      const channel = new SMSAlertChannel(baseConfig({ priorityFilter: ['P0'] }))

      await channel.send(createMockAlert({ priority: 'P2' }))

      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // 配置开关
  // =========================================================================
  describe('配置开关', () => {
    it('updateConfig({}) 不应意外禁用渠道', () => {
      const channel = new SMSAlertChannel(baseConfig())

      channel.updateConfig({})

      expect(channel.isEnabled()).toBe(true)
      expect(channel.getConfig().enabled).toBe(true)
    })

    it('setEnabled(true) 应重新启用渠道', async () => {
      const channel = new SMSAlertChannel(baseConfig({ enabled: false }))

      channel.setEnabled(true)
      await channel.send(createMockAlert())

      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('updateConfig({ timeout }) 应立即生效于后续请求', async () => {
      const channel = new SMSAlertChannel(baseConfig())
      channel.updateConfig({ timeout: 2000 })

      expect(channel.getConfig().timeout).toBe(2000)

      await channel.send(createMockAlert())

      const [, init] = fetchMock.mock.calls[0] as [string, { signal?: AbortSignal }]
      expect(init.signal).toBeInstanceOf(AbortSignal)
    })
  })

  // =========================================================================
  // 环境变量工厂
  // =========================================================================
  describe('环境变量工厂', () => {
    const originalEnv = { ...process.env }

    afterEach(() => {
      process.env = { ...originalEnv }
    })

    it('应解析所有层级的收件人列表并剔除空项', () => {
      process.env.SMS_GATEWAY_URL = 'https://sms.example.org'
      process.env.SMS_API_KEY = 'env-key'
      process.env.SMS_RECIPIENTS_P0 = '+1999000000,,+1999000001'
      process.env.SMS_RECIPIENTS_P1 = '+1999000002'
      process.env.SMS_RECIPIENTS_P2 = ''
      process.env.SMS_RECIPIENTS_P3 = '+1999000003'
      process.env.SMS_RECIPIENTS_ALL = '+1999000099'

      const channel = createSMSChannelFromEnv()
      const recipients = channel?.getConfig().recipients

      expect(recipients?.P0).toEqual(['+1999000000', '+1999000001'])
      expect(recipients?.P1).toEqual(['+1999000002'])
      expect(recipients?.P2).toEqual([])
      expect(recipients?.P3).toEqual(['+1999000003'])
      expect(recipients?.all).toEqual(['+1999000099'])
    })

    it('缺少网关环境变量时不应发起任何请求', async () => {
      delete process.env.SMS_GATEWAY_URL
      delete process.env.SMS_API_KEY

      const channel = createSMSChannelFromEnv()
      await channel?.send(createMockAlert())

      expect(fetchMock).not.toHaveBeenCalled()
    })
  })
})
