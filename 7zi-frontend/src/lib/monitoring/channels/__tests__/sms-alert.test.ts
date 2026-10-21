/**
 * SMS Alert Channel - 补充单元测试
 * 短信告警渠道补充测试
 *
 * 覆盖场景：
 * - 正常发送（mock global fetch）
 * - 缺少必填配置时的错误分支（未配置网关 -> console fallback；无收件人 -> 不发送）
 * - `enabled: false` 时不发送
 * - 错误响应 / 超时 / 网络异常处理
 *
 * @version 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SMSAlertChannel, createSMSChannelFromEnv } from '../sms-alert'
import type { SMSChannelConfig } from '../sms-alert'
import { Alert } from '../../alert-engine'
import type { DedupConfig } from '../base-alert-channel'

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

const okResponse = (body: unknown = { success: true }): Response =>
  ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => body,
  }) as unknown as Response

const errorResponse = (status = 500, statusText = 'Internal Server Error'): Response =>
  ({
    ok: false,
    status,
    statusText,
    json: async () => ({ success: false, error: statusText }),
  }) as unknown as Response

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SMSAlertChannel - 补充测试', () => {
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

  // -------------------------------------------------------------------------
  // 4.2.1 正常发送
  // -------------------------------------------------------------------------
  describe('正常发送', () => {
    it('应该在网关配置完整时调用 fetch 发送短信', async () => {
      const channel = new SMSAlertChannel(baseConfig())
      const alert = createMockAlert()

      await channel.send(alert)

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://sms-gateway.example.com/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key',
          }),
        })
      )
    })

    it('应该在请求体中包含收件人、发件人和格式化后的消息', async () => {
      const channel = new SMSAlertChannel(baseConfig())
      const alert = createMockAlert()

      await channel.send(alert)

      const [, init] = fetchMock.mock.calls[0] as [string, { body: string }]
      const body = JSON.parse(init.body)

      expect(body.to).toBe('+1000000001')
      expect(body.from).toBe('7ZI')
      expect(body.message).toContain('[P1E]')
      expect(body.message).toContain('CPU Usage High')
      expect(body.message).toContain('cpu_usage=90')
    })

    it('应该给每个收件人各发送一条短信', async () => {
      const channel = new SMSAlertChannel(
        baseConfig({
          recipients: {
            P0: [],
            P1: ['+1000000001', '+1000000009'],
            P2: [],
            P3: [],
          },
        })
      )

      await channel.send(createMockAlert({ priority: 'P1' }))

      expect(fetchMock).toHaveBeenCalledTimes(2)
      const recipients = fetchMock.mock.calls.map(
        call => JSON.parse((call as [string, { body: string }])[1].body).to
      )
      expect(recipients).toEqual(['+1000000001', '+1000000009'])
    })

    it('应该在未配置网关时降级为 console 日志且不发起网络请求', async () => {
      const channel = new SMSAlertChannel(
        baseConfig({ gatewayUrl: undefined, apiKey: undefined })
      )

      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined)

      await channel.send(createMockAlert())

      expect(fetchMock).not.toHaveBeenCalled()
      expect(debugSpy).toHaveBeenCalled()
      debugSpy.mockRestore()
    })
  })

  // -------------------------------------------------------------------------
  // 4.2.2 缺少必填配置
  // -------------------------------------------------------------------------
  describe('缺少必填配置时的错误分支', () => {
    it('当缺少 apiKey 时不应发起网络请求（降级为日志）', async () => {
      const channel = new SMSAlertChannel(baseConfig({ apiKey: undefined }))

      await channel.send(createMockAlert())

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('当该优先级没有配置收件人时不应发起任何请求', async () => {
      const channel = new SMSAlertChannel(
        baseConfig({
          recipients: { P0: [], P1: [], P2: [], P3: [] },
        })
      )

      await channel.send(createMockAlert({ priority: 'P1' }))

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('当优先级不存在时回退到 P3 收件人', async () => {
      const channel = new SMSAlertChannel(
        baseConfig({
          recipients: { P0: [], P1: [], P2: [], P3: ['+1000000003'] },
        })
      )

      await channel.send(createMockAlert({ priority: 'P9' as Alert['priority'] }))

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const body = JSON.parse((fetchMock.mock.calls[0] as [string, { body: string }])[1].body)
      expect(body.to).toBe('+1000000003')
    })

    it('当网关返回非 2xx 响应时应该抛出错误', async () => {
      fetchMock.mockResolvedValue(errorResponse(502, 'Bad Gateway'))
      const channel = new SMSAlertChannel(baseConfig())

      await expect(channel.send(createMockAlert())).rejects.toThrow(
        /SMS gateway returned 502/
      )
    })

    it('testConnection 在未配置网关时应该返回 false', async () => {
      const channel = new SMSAlertChannel(baseConfig({ gatewayUrl: undefined }))

      expect(await channel.testConnection()).toBe(false)
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // 4.2.3 enabled: false
  // -------------------------------------------------------------------------
  describe('enabled: false 时不发送', () => {
    it('构造时传入 enabled: false 应该跳过发送', async () => {
      const channel = new SMSAlertChannel(baseConfig({ enabled: false }))

      await channel.send(createMockAlert())

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('enabled: false 时 isEnabled() 应该返回 false', () => {
      const channel = new SMSAlertChannel(baseConfig({ enabled: false }))

      expect(channel.isEnabled()).toBe(false)
    })

    it('未显式传入 enabled 时默认视为启用（向后兼容）', async () => {
      const channel = new SMSAlertChannel(baseConfig())

      expect(channel.isEnabled()).toBe(true)

      await channel.send(createMockAlert())
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('updateConfig({ enabled: false }) 之后应该停止发送', async () => {
      const channel = new SMSAlertChannel(baseConfig())

      await channel.send(createMockAlert())
      expect(fetchMock).toHaveBeenCalledTimes(1)

      channel.updateConfig({ enabled: false })

      await channel.send(createMockAlert({ id: 'alert-2' }))
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('setEnabled(false) 之后应该停止发送', async () => {
      const channel = new SMSAlertChannel(baseConfig())

      channel.setEnabled(false)
      await channel.send(createMockAlert())

      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // 4.2.4 错误响应 / 超时处理
  // -------------------------------------------------------------------------
  describe('错误响应 / 超时处理', () => {
    it('当 fetch 抛出网络错误时应该向上抛出', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'))
      const channel = new SMSAlertChannel(baseConfig())

      await expect(channel.send(createMockAlert())).rejects.toThrow('Network error')
    })

    it('当 fetch 超时（AbortError）时应该向上抛出 AbortError', async () => {
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      fetchMock.mockRejectedValue(abortError)
      const channel = new SMSAlertChannel(baseConfig())

      await expect(channel.send(createMockAlert())).rejects.toThrow('The operation was aborted')
    })

    it('当 fetch 抛出的不是 Error 对象时也应该向上冒泡（不静默吞掉）', async () => {
      fetchMock.mockRejectedValue('string failure')
      const channel = new SMSAlertChannel(baseConfig())

      await expect(channel.send(createMockAlert())).rejects.toBeDefined()
    })

    it('testConnection 在网络异常时应该返回 false 而不是抛出', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'))
      const channel = new SMSAlertChannel(baseConfig())

      expect(await channel.testConnection()).toBe(false)
    })

    it('testConnection 在网关返回 503 时应该返回 false', async () => {
      fetchMock.mockResolvedValue(errorResponse(503, 'Service Unavailable'))
      const channel = new SMSAlertChannel(baseConfig())

      expect(await channel.testConnection()).toBe(false)
    })

    it('testConnection 成功时应该返回 true 并调用 /health', async () => {
      const channel = new SMSAlertChannel(baseConfig())

      expect(await channel.testConnection()).toBe(true)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://sms-gateway.example.com/health',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        })
      )
    })
  })

  // -------------------------------------------------------------------------
  // 配置与工厂函数
  // -------------------------------------------------------------------------
  describe('配置与工厂函数', () => {
    it('getConfig 应该返回配置的副本', () => {
      const channel = new SMSAlertChannel(baseConfig())

      const c1 = channel.getConfig()
      const c2 = channel.getConfig()

      expect(c1).not.toBe(c2)
      expect(c1).toEqual(c2)
    })

    it('getConfig 应该反映 enabled 状态', () => {
      const channel = new SMSAlertChannel(baseConfig({ enabled: false }))

      expect(channel.getConfig().enabled).toBe(false)
    })

    it('updateConfig 应该支持更新 dedup 配置', () => {
      const newDedupConfig: DedupConfig = {
        enabled: false,
        windowMs: 30000,
        keys: ['ruleId', 'priority'],
      }

      const channel = new SMSAlertChannel(baseConfig())
      channel.updateConfig({ dedup: newDedupConfig })

      expect(channel.getConfig().dedup?.enabled).toBe(false)
    })

    it('createSMSChannelFromEnv 在缺少环境变量时仍返回可用渠道', () => {
      const previous = { ...process.env }
      delete process.env.SMS_GATEWAY_URL
      delete process.env.SMS_API_KEY

      const channel = createSMSChannelFromEnv()

      expect(channel).not.toBeNull()
      expect(channel?.isEnabled()).toBe(true)
      expect(channel?.getConfig().gatewayUrl).toBeUndefined()

      process.env = previous
    })

    it('createSMSChannelFromEnv 在环境变量齐备时应注入网关配置', () => {
      const previous = { ...process.env }
      process.env.SMS_GATEWAY_URL = 'https://sms.example.org'
      process.env.SMS_API_KEY = 'env-key'
      process.env.SMS_SENDER_ID = 'ENV'
      process.env.SMS_RECIPIENTS_P0 = '+1999000000,+1999000001'

      const channel = createSMSChannelFromEnv()

      expect(channel?.getConfig().gatewayUrl).toBe('https://sms.example.org')
      expect(channel?.getConfig().apiKey).toBe('env-key')
      expect(channel?.getConfig().recipients.P0).toEqual(['+1999000000', '+1999000001'])

      process.env = previous
    })
  })
})
