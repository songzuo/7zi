/**
 * PagerDuty Channel Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PagerDutyChannel } from './pagerduty'
import type { PerformanceAlert } from '../alerter'

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ status: 'success' }),
  } as Response)
) as any

describe('PagerDutyChannel', () => {
  let channel: PagerDutyChannel
  let mockAlert: PerformanceAlert

  beforeEach(() => {
    vi.clearAllMocks()

    channel = new PagerDutyChannel(
      {
        integrationKey: 'test-integration-key',
      },
      {
        source: 'test-service',
      }
    )

    mockAlert = {
      id: 'test-alert-1',
      title: 'Test Alert',
      message: 'This is a test alert',
      level: 'error',
      category: 'availability',
      status: 'active',
      source: 'test-source',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      occurrenceCount: 1,
    } as PerformanceAlert
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with correct config', () => {
      expect(channel.name).toBe('pagerduty')
    })

    it('should accept custom options', () => {
      const customChannel = new PagerDutyChannel(
        {
          integrationKey: 'test-key',
        },
        {
          source: 'custom-source',
          severity: 'critical',
          includeMetadata: true,
        }
      )

      const options = customChannel.getOptions()
      expect(options.source).toBe('custom-source')
      expect(options.severity).toBe('critical')
      expect(options.includeMetadata).toBe(true)
    })

    it('should use default API endpoint', () => {
      const defaultChannel = new PagerDutyChannel({
        integrationKey: 'test-key',
      })

      expect(defaultChannel).toBeDefined()
    })

    it('should accept custom API endpoint', () => {
      const customChannel = new PagerDutyChannel({
        integrationKey: 'test-key',
        apiEndpoint: 'https://custom.pagerduty.com/events',
      })

      expect(customChannel).toBeDefined()
    })
  })

  describe('send', () => {
    it('should send alert successfully', async () => {
      await expect(channel.send(mockAlert)).resolves.not.toThrow()

      expect(fetch).toHaveBeenCalledWith(
        'https://events.pagerduty.com/v2/enqueue',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        })
      )
    })

    it('should build correct payload', async () => {
      await channel.send(mockAlert)

      const callArgs = (fetch as any).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)

      expect(body.routing_key).toBe('test-integration-key')
      expect(body.event_action).toBe('trigger')
      expect(body.payload.summary).toContain('Test Alert')
      expect(body.payload.severity).toBe('error')
    })

    it('should map alert levels to severities', async () => {
      const levels: Array<{ level: string; expected: string }> = [
        { level: 'info', expected: 'info' },
        { level: 'warning', expected: 'warning' },
        { level: 'error', expected: 'error' },
        { level: 'critical', expected: 'critical' },
      ]

      for (const { level, expected } of levels) {
        const alert = { ...mockAlert, level } as any
        await channel.send(alert)

        const callArgs = (fetch as any).mock.calls.at(-1)
        const body = JSON.parse(callArgs[1].body)
        expect(body.payload.severity).toBe(expected)
      }
    })

    it('should determine action from alert status', async () => {
      // Active status -> trigger
      await channel.send({ ...mockAlert, status: 'active' })
      let callArgs = (fetch as any).mock.calls.at(-1)
      expect(JSON.parse(callArgs[1].body).event_action).toBe('trigger')

      // Acknowledged status -> acknowledge
      await channel.send({ ...mockAlert, status: 'acknowledged' })
      callArgs = (fetch as any).mock.calls.at(-1)
      expect(JSON.parse(callArgs[1].body).event_action).toBe('acknowledge')

      // Resolved status -> resolve
      await channel.send({ ...mockAlert, status: 'resolved' })
      callArgs = (fetch as any).mock.calls.at(-1)
      expect(JSON.parse(callArgs[1].body).event_action).toBe('resolve')
    })

    it('should include metric details when available', async () => {
      const alertWithMetric: PerformanceAlert = {
        ...mockAlert,
        metric: 'response_time',
        currentValue: 5000,
        threshold: 3000,
      }

      await channel.send(alertWithMetric)

      const callArgs = (fetch as any).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)

      expect(body.payload.custom_details.metric).toBe('response_time')
      expect(body.payload.custom_details.current_value).toBe(5000)
      expect(body.payload.custom_details.threshold).toBe(3000)
    })

    it('should include metadata when configured', async () => {
      const metadataChannel = new PagerDutyChannel(
        { integrationKey: 'test-key' },
        { includeMetadata: true }
      )

      const alertWithMetadata: PerformanceAlert = {
        ...mockAlert,
        metadata: {
          environment: 'production',
          region: 'us-east-1',
        },
      }

      await metadataChannel.send(alertWithMetadata)

      const callArgs = (fetch as any).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)

      expect(body.payload.custom_details.environment).toBe('production')
      expect(body.payload.custom_details.region).toBe('us-east-1')
    })

    it('should add links when configured', async () => {
      const linksChannel = new PagerDutyChannel(
        { integrationKey: 'test-key' },
        {
          addLinks: true,
          dashboardUrl: 'https://dashboard.example.com',
        }
      )

      await linksChannel.send(mockAlert)

      const callArgs = (fetch as any).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)

      expect(body.client_url).toBe('https://dashboard.example.com')
      expect(body.links).toBeDefined()
      expect(body.links[0].text).toBe('View Alert')
    })

    it('should handle API errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request'),
      })

      await expect(channel.send(mockAlert)).rejects.toThrow('PagerDuty API failed: 400')
    })

    it('should handle network errors', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await expect(channel.send(mockAlert)).rejects.toThrow('Network error')
    })

    it('should handle rate limiting', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'rate_limited' }),
      })

      // Should not throw, just log warning
      await expect(channel.send(mockAlert)).resolves.not.toThrow()
    })
  })

  describe('test', () => {
    it('should test integration successfully', async () => {
      const result = await channel.test()
      expect(result).toBe(true)
    })

    it('should handle test failures', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      })

      const result = await channel.test()
      expect(result).toBe(false)
    })

    it('should handle test network errors', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const result = await channel.test()
      expect(result).toBe(false)
    })
  })

  describe('options management', () => {
    it('should update options', () => {
      channel.updateOptions({
        source: 'new-source',
        severity: 'critical',
      })

      const options = channel.getOptions()
      expect(options.source).toBe('new-source')
      expect(options.severity).toBe('critical')
    })

    it('should merge options on update', () => {
      channel.updateOptions({ source: 'first-source' })
      channel.updateOptions({ severity: 'warning' })

      const options = channel.getOptions()
      expect(options.source).toBe('first-source')
      expect(options.severity).toBe('warning')
    })
  })

  describe('deduplication key generation', () => {
    it('should generate consistent deduplication keys', async () => {
      const alert1 = { ...mockAlert, id: 'alert-1' }
      const alert2 = { ...mockAlert, id: 'alert-2' }

      await channel.send(alert1)
      const callArgs1 = (fetch as any).mock.calls[0]
      const key1 = JSON.parse(callArgs1[1].body).deduplication_key

      await channel.send(alert2)
      const callArgs2 = (fetch as any).mock.calls[1]
      const key2 = JSON.parse(callArgs2[1].body).deduplication_key

      // Same alert properties should generate same key
      expect(key1).toBe(key2)
    })

    it('should use custom deduplication key when provided', async () => {
      const customKeyChannel = new PagerDutyChannel(
        { integrationKey: 'test-key' },
        { deduplicationKey: 'custom-key-123' }
      )

      await customKeyChannel.send(mockAlert)

      const callArgs = (fetch as any).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      expect(body.deduplication_key).toBe('custom-key-123')
    })
  })
})