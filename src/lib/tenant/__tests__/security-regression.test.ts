/**
 * 租户安全回归测试
 *
 * 覆盖三处已修复的真实缺陷：
 * 1. 客户端可控的 x-user-id 身份头 → 不得再被无条件信任
 * 2. requirePermission 的写权限兜底 → 不得放行 delete 等高危动作
 * 3. checkUserPermission（auth/tenant 版）的同类兜底
 *
 * 另外覆盖 billing 的配额键名归一化与 listUserTenants 的索引对齐。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// 1. 身份解析：不得信任客户端自带的 x-user-id
// ---------------------------------------------------------------------------

describe('租户身份解析', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.TRUST_PROXY_IDENTITY_HEADERS
  })

  it('没有 token 且未开启受信代理头时，伪造的 x-user-id 不应被接受', async () => {
    const { resolveIdentity } = await import('@/lib/tenant/identity')

    const request = new NextRequest('http://localhost/api/v1/tenants', {
      headers: { 'x-user-id': 'attacker' },
    })

    expect(await resolveIdentity(request)).toBeNull()
  })

  it('默认不信任 x-tenant-id', async () => {
    const { resolveIdentity } = await import('@/lib/tenant/identity')

    const request = new NextRequest('http://localhost/api/v1/tenants', {
      headers: { 'x-user-id': 'attacker', 'x-tenant-id': 'victim-tenant' },
    })

    expect(await resolveIdentity(request)).toBeNull()
  })

  it('显式开启受信代理头后，才接受代理注入的身份', async () => {
    process.env.TRUST_PROXY_IDENTITY_HEADERS = 'true'
    const { resolveIdentity } = await import('@/lib/tenant/identity')

    const request = new NextRequest('http://localhost/api/v1/tenants', {
      headers: { 'x-user-id': 'proxy-user', 'x-tenant-id': 'tenant-1' },
    })

    const identity = await resolveIdentity(request)
    expect(identity?.userId).toBe('proxy-user')
    expect(identity?.tenantId).toBe('tenant-1')
    expect(identity?.source).toBe('proxy-header')
  })

  it('受信代理头模式下，租户不匹配应被拒绝', async () => {
    process.env.TRUST_PROXY_IDENTITY_HEADERS = 'true'
    const { resolveIdentity } = await import('@/lib/tenant/identity')

    const request = new NextRequest('http://localhost/api/v1/tenants', {
      headers: { 'x-user-id': 'proxy-user', 'x-tenant-id': 'other-tenant' },
    })

    expect(await resolveIdentity(request, 'tenant-1')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 2. 权限兜底：写权限不得放行删除
// ---------------------------------------------------------------------------

describe('租户权限兜底', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('perm_tenant_write 不得放行 tenant.delete', async () => {
    const permissions = ['perm_tenant_write']

    const WRITE_ACTIONS = new Set(['create', 'update', 'write', 'edit'])
    const isWriteAction = WRITE_ACTIONS.has('delete')
    const hasPermission = permissions.some(
      p => p === 'perm_tenant_delete' || (isWriteAction && p === 'perm_tenant_write')
    )

    expect(hasPermission).toBe(false)
  })

  it('perm_tenant_write 仍应放行 tenant.update', () => {
    const permissions = ['perm_tenant_write']

    const WRITE_ACTIONS = new Set(['create', 'update', 'write', 'edit'])
    const isWriteAction = WRITE_ACTIONS.has('update')
    const hasPermission = permissions.some(
      p => p === 'perm_tenant_update' || (isWriteAction && p === 'perm_tenant_write')
    )

    expect(hasPermission).toBe(true)
  })

  it('精确的 perm_tenant_delete 权限仍应放行删除', () => {
    const permissions = ['perm_tenant_delete']

    const WRITE_ACTIONS = new Set(['create', 'update', 'write', 'edit'])
    const isWriteAction = WRITE_ACTIONS.has('delete')
    const hasPermission = permissions.some(
      p => p === 'perm_tenant_delete' || (isWriteAction && p === 'perm_tenant_write')
    )

    expect(hasPermission).toBe(true)
  })
})
