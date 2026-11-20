/**
 * CronTrigger 表达式解析测试
 *
 * 覆盖标准 5 字段 cron（分 时 日 月 周）的各种语法：
 *   `*` / `5` / `1-5` / `1,3,5` / `*\/10` / `1-30\/5`
 * 以及非法表达式的处理。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  CronTrigger,
  TriggerType,
  TriggerStatus,
  type TriggerDefinition,
} from '@/lib/workflow/triggers'

function createCronTrigger(expression: string, timezone?: string): CronTrigger {
  const trigger: TriggerDefinition = {
    id: 'cron-trigger',
    workflowId: 'workflow-1',
    type: TriggerType.CRON,
    name: 'Cron 触发器',
    status: TriggerStatus.ACTIVE,
    config: {
      expression,
      ...(timezone ? { timezone } : {}),
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test',
      triggerCount: 0,
      errorCount: 0,
    },
  }

  return new CronTrigger(trigger)
}

/**
 * 启动触发器并取下一次运行时间。
 * calculateNextRun 是私有的，这里通过公开的 getNextTriggerTime() 间接验证。
 */
async function nextRunFor(expression: string, timezone?: string): Promise<Date | null> {
  const instance = createCronTrigger(expression, timezone)
  await instance.start(vi.fn())
  const next = instance.getNextTriggerTime()
  await instance.stop()
  return next
}

describe('CronTrigger 表达式解析', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.useFakeTimers()
    // 固定基准时间：2026-10-29 10:17:30 本地时间（星期四）
    vi.setSystemTime(new Date(2026, 9, 29, 10, 17, 30))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('基本语法', () => {
    it('`* * * * *` 应匹配下一分钟', async () => {
      const next = await nextRunFor('* * * * *')
      expect(next).not.toBeNull()
      expect(next!.getMinutes()).toBe(18)
      expect(next!.getHours()).toBe(10)
      expect(next!.getSeconds()).toBe(0)
    })

    it('`*\\/5 * * * *` 应匹配下一个 5 的倍数分钟', async () => {
      const next = await nextRunFor('*/5 * * * *')
      expect(next).not.toBeNull()
      // 基准 10:17 → 下一个 */5 是 10:20
      expect(next!.getMinutes()).toBe(20)
      expect(next!.getHours()).toBe(10)
    })

    it('`30 9 * * *` 应匹配下一个 09:30', async () => {
      const next = await nextRunFor('30 9 * * *')
      expect(next).not.toBeNull()
      expect(next!.getHours()).toBe(9)
      expect(next!.getMinutes()).toBe(30)
    })

    it('已过的时间点应顺延到第二天', async () => {
      // 基准是 10:17，09:30 已过 → 下一天 09:30
      const next = await nextRunFor('30 9 * * *')
      expect(next!.getDate()).toBe(30)
    })
  })

  describe('字段语法', () => {
    it('列表 `1,3,5` 应命中其中一个', async () => {
      const next = await nextRunFor('1,3,5 * * * *')
      expect(next).not.toBeNull()
      expect([1, 3, 5]).toContain(next!.getMinutes())
      // 基准 17 分 → 下一个候选是 18 点 01 分
      expect(next!.getMinutes()).toBe(1)
    })

    it('范围 `0-5` 应命中范围内的分钟', async () => {
      const next = await nextRunFor('0-5 * * * *')
      expect(next).not.toBeNull()
      expect(next!.getMinutes()).toBeLessThanOrEqual(5)
    })

    it('范围 + 步进 `0-30/10` 应命中 0/10/20/30', async () => {
      const next = await nextRunFor('0-30/10 * * * *')
      expect(next).not.toBeNull()
      expect([0, 10, 20, 30]).toContain(next!.getMinutes())
    })

    it('星期字段 `1-5`（周一到周五）应跳过周末', async () => {
      const next = await nextRunFor('0 12 * * 1-5')
      expect(next).not.toBeNull()
      const weekday = next!.getDay()
      expect(weekday).toBeGreaterThanOrEqual(1)
      expect(weekday).toBeLessThanOrEqual(5)
    })

    it('星期 `0` 与 `7` 都应表示周日', async () => {
      const withZero = await nextRunFor('0 12 * * 0')
      const withSeven = await nextRunFor('0 12 * * 7')
      expect(withZero).not.toBeNull()
      expect(withSeven).not.toBeNull()
      expect(withZero!.getDay()).toBe(0)
      expect(withSeven!.getDay()).toBe(0)
      expect(withZero!.getTime()).toBe(withSeven!.getTime())
    })

    it('月份字段应被尊重', async () => {
      // 基准是 10 月，只允许 12 月 → 应匹配到 12 月
      const next = await nextRunFor('0 0 1 12 *')
      expect(next).not.toBeNull()
      expect(next!.getMonth()).toBe(11) // 0-based → 12 月
    })
  })

  describe('非法表达式', () => {
    it('字段数不对应返回 null', async () => {
      expect(await nextRunFor('* * * *')).toBeNull()
      expect(await nextRunFor('* * * * * *')).toBeNull()
    })

    it('越界取值应返回 null', async () => {
      expect(await nextRunFor('99 * * * *')).toBeNull()
      expect(await nextRunFor('* 25 * * *')).toBeNull()
      expect(await nextRunFor('* * 32 * *')).toBeNull()
      expect(await nextRunFor('* * * 13 *')).toBeNull()
    })

    it('步进值为 0 应返回 null', async () => {
      expect(await nextRunFor('*/0 * * * *')).toBeNull()
    })

    it('非数字字段应返回 null', async () => {
      expect(await nextRunFor('abc * * * *')).toBeNull()
    })

    it('空表达式应返回 null', async () => {
      expect(await nextRunFor('')).toBeNull()
    })

    it('非法表达式应记录告警', async () => {
      await nextRunFor('99 * * * *')
      expect(console.warn).toHaveBeenCalled()
    })
  })

  describe('时区', () => {
    it('指定时区时也能算出下一次运行时间', async () => {
      const next = await nextRunFor('0 9 * * *', 'Asia/Shanghai')
      expect(next).not.toBeNull()
      expect(next!.getHours()).toBe(9)
    })

    it('非法时区应退回本地时间而不抛错', async () => {
      const next = await nextRunFor('0 9 * * *', 'Not/AZone')
      expect(next).not.toBeNull()
    })
  })
})
