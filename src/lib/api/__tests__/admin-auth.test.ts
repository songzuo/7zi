/**
 * 共享 admin 鉴权助手的测试
 *
 * 这个模块现在是所有 admin 路由鉴权的**唯一**实现 ——
 * 四个 admin 路由都从这里取 checkAdminAuth()。
 * 一旦这里放宽，全站管理端接口一起失守，所以每个分支都要测到。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { checkAdminAuth } from '@/lib/api/admin-auth'

// 只 mock 验签这一层，header 解析和角色判定都走真实代码
const mockVerify = vi.fn()
vi.mock('@/lib/auth/jwt', () => ({
  verify: (...args: unknown[]) => mockVerify(...args),
}))

function makeRequest(authHeader?: string): NextRequest {
  const headers = authHeader ? { authorization: authHeader } : {}
  return new NextRequest('http://localhost/api/admin/test', { headers })
}

describe('checkAdminAuth', () => {
  beforeEach(() => {
    mockVerify.mockReset()
  })

  describe('401 —— 未认证', () => {
    it('缺少 Authorization 头', async () => {
      const result = await checkAdminAuth(makeRequest())

      expect(result.success).toBe(false)
      expect(result.status).toBe(401)
      expect(mockVerify).not.toHaveBeenCalled()
    })

    it('非 Bearer 前缀', async () => {
      const result = await checkAdminAuth(makeRequest('Basic abc123'))

      expect(result.success).toBe(false)
      expect(result.status).toBe(401)
      expect(mockVerify).not.toHaveBeenCalled()
    })

    it('Bearer 后面是空 token', async () => {
      const result = await checkAdminAuth(makeRequest('Bearer   '))

      expect(result.success).toBe(false)
      expect(result.status).toBe(401)
      expect(mockVerify).not.toHaveBeenCalled()
    })

    it('token 验签失败', async () => {
      mockVerify.mockResolvedValue({ valid: false, error: 'Invalid signature' })

      const result = await checkAdminAuth(makeRequest('Bearer bad-token'))

      expect(result.success).toBe(false)
      expect(result.status).toBe(401)
      // 真实错误信息透传，不写死
      expect(result.error).toBe('Invalid signature')
    })

    it('token 已过期', async () => {
      mockVerify.mockResolvedValue({ valid: false, error: 'Token expired' })

      const result = await checkAdminAuth(makeRequest('Bearer expired-token'))

      expect(result.success).toBe(false)
      expect(result.status).toBe(401)
      expect(result.error).toBe('Token expired')
    })

    it('验签通过但没有 payload', async () => {
      mockVerify.mockResolvedValue({ valid: true, payload: undefined })

      const result = await checkAdminAuth(makeRequest('Bearer weird-token'))

      expect(result.success).toBe(false)
      expect(result.status).toBe(401)
    })
  })

  describe('403 —— 已认证但非管理员', () => {
    it('角色是普通用户', async () => {
      mockVerify.mockResolvedValue({
        valid: true,
        payload: { sub: 'user-1', role: 'user' },
      })

      const result = await checkAdminAuth(makeRequest('Bearer user-token'))

      expect(result.success).toBe(false)
      expect(result.status).toBe(403)
      expect(result.error).toBe('Admin privileges required')
    })

    it('完全没有角色信息', async () => {
      mockVerify.mockResolvedValue({ valid: true, payload: { sub: 'user-2' } })

      const result = await checkAdminAuth(makeRequest('Bearer roleless-token'))

      expect(result.success).toBe(false)
      expect(result.status).toBe(403)
    })

    it('roles 数组里没有 admin', async () => {
      mockVerify.mockResolvedValue({
        valid: true,
        payload: { sub: 'user-3', roles: ['editor', 'viewer'] },
      })

      const result = await checkAdminAuth(makeRequest('Bearer nonadmin-token'))

      expect(result.success).toBe(false)
      expect(result.status).toBe(403)
    })
  })

  describe('通过', () => {
    it('role 是 admin', async () => {
      mockVerify.mockResolvedValue({
        valid: true,
        payload: { sub: 'admin-user-1', role: 'admin' },
      })

      const result = await checkAdminAuth(makeRequest('Bearer admin-token'))

      expect(result.success).toBe(true)
      expect(result.status).toBeUndefined()
      // userId 取真实操作人，不是硬编码的 'admin'
      expect(result.userId).toBe('admin-user-1')
    })

    it('roles 数组里含 admin', async () => {
      mockVerify.mockResolvedValue({
        valid: true,
        payload: { sub: 'admin-user-2', roles: ['user', 'admin'] },
      })

      const result = await checkAdminAuth(makeRequest('Bearer admin-token'))

      expect(result.success).toBe(true)
      expect(result.userId).toBe('admin-user-2')
    })

    it('token 前后有空白也能正确截取', async () => {
      mockVerify.mockResolvedValue({
        valid: true,
        payload: { sub: 'admin-user-3', role: 'admin' },
      })

      const result = await checkAdminAuth(makeRequest('Bearer   spaced-token  '))

      expect(result.success).toBe(true)
      expect(mockVerify).toHaveBeenCalledWith('spaced-token')
    })
  })
})
