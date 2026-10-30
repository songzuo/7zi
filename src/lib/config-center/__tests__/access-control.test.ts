/**
 * 访问控制的回归测试
 *
 * 覆盖三处曾经出过问题的语义：
 * 1. deny-by-default —— 没有授权一律拒绝
 * 2. deny 优先于 allow —— 精确 deny 不能被宽泛 allow 通配符盖掉
 * 3. 过期权限不生效
 * 4. resourceId 通配符（config.* / config.*.secret）
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { AccessController } from '../access-control'
import { MemoryStorageAdapter } from '../storage-adapters'

describe('AccessController —— 权限判定语义', () => {
  let ac: AccessController
  let storage: MemoryStorageAdapter

  beforeEach(async () => {
    storage = new MemoryStorageAdapter()
    ac = new AccessController(storage)
    await ac.initialize()
  })

  const allow = (
    principalId: string,
    resourceId: string,
    actions: Array<'read' | 'write' | 'delete'>,
    extra: Record<string, unknown> = {}
  ) =>
    ac.createPermission({
      principalId,
      principalType: 'user',
      resourceType: 'config',
      resourceId,
      actions,
      allow: true,
      ...extra,
    })

  it('没有任何授权时拒绝（deny-by-default）', async () => {
    const ok = await ac.checkPermission('nobody', 'config', 'a.b', 'read')
    expect(ok).toBe(false)
  })

  it('授权后放行', async () => {
    await allow('u1', 'a.b', ['read', 'write'])
    expect(await ac.checkPermission('u1', 'config', 'a.b', 'read')).toBe(true)
    expect(await ac.checkPermission('u1', 'config', 'a.b', 'write')).toBe(true)
  })

  it('动作不匹配时拒绝', async () => {
    await allow('u1', 'a.b', ['read'])
    expect(await ac.checkPermission('u1', 'config', 'a.b', 'write')).toBe(false)
  })

  it('主体不匹配时拒绝', async () => {
    await allow('u1', 'a.b', ['read'])
    expect(await ac.checkPermission('u2', 'config', 'a.b', 'read')).toBe(false)
  })

  it('过期的权限不生效', async () => {
    await allow('u1', 'a.b', ['read'], { expiresAt: new Date(Date.now() - 60_000) })
    expect(await ac.checkPermission('u1', 'config', 'a.b', 'read')).toBe(false)
  })

  it('未过期的权限生效', async () => {
    await allow('u1', 'a.b', ['read'], { expiresAt: new Date(Date.now() + 60_000) })
    expect(await ac.checkPermission('u1', 'config', 'a.b', 'read')).toBe(true)
  })

  it('精确 deny 优先于宽泛 allow 通配符', async () => {
    // 宽泛 allow：u1 对所有 config 都有读权限
    await allow('u1', '*', ['read', 'write'])
    // 精确 deny：u1 不能改 secret.key
    await ac.createPermission({
      principalId: 'u1',
      principalType: 'user',
      resourceType: 'config',
      resourceId: 'secret.key',
      actions: ['read', 'write'],
      allow: false,
    })

    expect(await ac.checkPermission('u1', 'config', 'normal.key', 'read')).toBe(true)
    expect(await ac.checkPermission('u1', 'config', 'secret.key', 'read')).toBe(false)
    expect(await ac.checkPermission('u1', 'config', 'secret.key', 'write')).toBe(false)
  })

  it('resourceId 通配符：config.* 匹配所有子键', async () => {
    await allow('u1', 'config.*', ['read'])
    expect(await ac.checkPermission('u1', 'config', 'config.a', 'read')).toBe(true)
    expect(await ac.checkPermission('u1', 'config', 'config.b.c', 'read')).toBe(true)
    expect(await ac.checkPermission('u1', 'config', 'other.a', 'read')).toBe(false)
  })

  it('resourceId 通配符：前缀形式只匹配该前缀', async () => {
    await allow('u1', 'app.*', ['read'])
    expect(await ac.checkPermission('u1', 'config', 'app.timeout', 'read')).toBe(true)
    expect(await ac.checkPermission('u1', 'config', 'appx.timeout', 'read')).toBe(false)
  })
})
