/**
 * 配额键名归一化 + 租户角色索引对齐 的回归测试
 *
 * 1. billing：seed 的 plans.limits 是 snake_case，Plan.limits 类型是 camelCase，
 *    归一化前 `plan.limits['aiCalls']` 恒为 undefined → 配额检查形同虚设。
 * 2. tenant：listUserTenants 之前先 filter 再用 rows[index] 取 role，
 *    租户缺失时角色会张冠李戴。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// 必须在被测模块之前 mock 掉 @/lib/db
const dbMock = vi.hoisted(() => ({
  get: vi.fn(),
  queryRows: vi.fn(),
  query: vi.fn(),
  exec: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('@/lib/db', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/db')>()
  return { ...actual, db: dbMock, default: dbMock }
})

// ---------------------------------------------------------------------------
// 1. 配额键名归一化
// ---------------------------------------------------------------------------

describe('billing 配额键名归一化', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('snake_case 的 seed limits 应被归一到 camelCase', async () => {
    const { BillingService } = await import('@/lib/billing/service')

    dbMock.get.mockResolvedValue({
      id: 'plan_starter',
      name: 'Starter',
      type: 'subscription',
      price_monthly: 99,
      price_yearly: 990,
      features: '{}',
      // 来自 src/lib/db/migrations/001_multi_tenant.sql 的真实 seed
      limits: '{"ai_calls": 1000, "workflow_runs": 100, "storage_gb": 10}',
    })

    const plan = await new BillingService().getPlan('plan_starter')

    expect(plan).not.toBeNull()
    expect(plan?.limits).toMatchObject({
      aiCalls: 1000,
      workflowRuns: 100,
      storageGB: 10,
    })
  })

  it('camelCase 的 limits 也应被接受（幂等）', async () => {
    const { BillingService } = await import('@/lib/billing/service')

    dbMock.get.mockResolvedValue({
      id: 'plan_x',
      name: 'X',
      type: 'subscription',
      price_monthly: 1,
      price_yearly: 1,
      features: '{}',
      limits: '{"aiCalls": 5, "workflowRuns": 6, "storageGB": 7}',
    })

    const plan = await new BillingService().getPlan('plan_x')

    expect(plan?.limits).toMatchObject({
      aiCalls: 5,
      workflowRuns: 6,
      storageGB: 7,
    })
  })

  it('归一化后配额比较不再恒为 false', async () => {
    const { BillingService } = await import('@/lib/billing/service')

    dbMock.get.mockResolvedValue({
      id: 'plan_starter',
      name: 'Starter',
      type: 'subscription',
      price_monthly: 99,
      price_yearly: 990,
      features: '{}',
      limits: '{"ai_calls": 1000, "workflow_runs": 100, "storage_gb": 10}',
    })

    const plan = await new BillingService().getPlan('plan_starter')
    const limit = plan?.limits.aiCalls

    // 归一化前这里是 undefined，`used >= undefined` 恒为 false
    expect(limit).toBe(1000)
    expect(999 >= (limit as number)).toBe(false)
    expect(1000 >= (limit as number)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 2. listUserTenants 角色索引对齐
// ---------------------------------------------------------------------------

describe('listUserTenants 角色对齐', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('某个租户查不到时，其余租户的角色仍应与行一一对应', async () => {
    const { TenantService } = await import('@/lib/tenant/service')

    dbMock.queryRows.mockResolvedValue([
      { tenant_id: 't-missing', role: 'owner' },
      { tenant_id: 't-present', role: 'member' },
    ])

    const svc = new TenantService()
    vi.spyOn(svc, 'getTenant').mockImplementation(
      async (id: string) =>
        (id === 't-missing' ? null : { id, name: 'T', slug: 't' }) as Awaited<
          ReturnType<InstanceType<typeof TenantService>['getTenant']>
        >
    )

    const result = await svc.listUserTenants('user-1')

    expect(result).toHaveLength(1)
    // 之前会取到 rows[0].role（owner），属于张冠李戴
    expect(result[0].id).toBe('t-present')
    expect(result[0].role).toBe('member')
  })

  it('全部租户都可查到时，角色顺序应与行一致', async () => {
    const { TenantService } = await import('@/lib/tenant/service')

    dbMock.queryRows.mockResolvedValue([
      { tenant_id: 't1', role: 'owner' },
      { tenant_id: 't2', role: 'member' },
    ])

    const svc = new TenantService()
    vi.spyOn(svc, 'getTenant').mockImplementation(
      async (id: string) =>
        ({ id, name: 'T', slug: 't' }) as Awaited<
          ReturnType<InstanceType<typeof TenantService>['getTenant']>
        >
    )

    const result = await svc.listUserTenants('user-1')

    expect(result.map(r => r.role)).toEqual(['owner', 'member'])
  })
})
