/**
 * Knowledge API - Query 端点测试
 * 
 * 测试知识查询 API 的基本功能
 */

import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'

// 简化测试 - 不使用 mock，直接测试 API 响应结构
describe('Knowledge Query API', () => {
  describe('POST /api/knowledge/query', () => {
    it('should accept valid JSON body', async () => {
      // 动态导入以确保模块正确加载
      const { POST } = await import('@/app/api/knowledge/query/route')
      
      const request = new NextRequest('http://localhost/api/knowledge/query', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      
      // API 应该返回 JSON 响应
      expect(response.headers.get('content-type')).toContain('application/json')
      
      const data = await response.json()
      expect(data).toHaveProperty('success')
    })

    it('should handle query with filters', async () => {
      const { POST } = await import('@/app/api/knowledge/query/route')
      
      const request = new NextRequest('http://localhost/api/knowledge/query', {
        method: 'POST',
        body: JSON.stringify({ 
          type: 'concept',
          tags: ['ai'],
          limit: 10 
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()
      
      // 响应应该有 success 字段
      expect(data).toHaveProperty('success')
      
      // 如果成功，应该有 data.nodes
      if (data.success) {
        expect(data.data).toHaveProperty('nodes')
        expect(data.data).toHaveProperty('edges')
        expect(Array.isArray(data.data.nodes)).toBe(true)
      }
    })

    it('should handle searchText parameter', async () => {
      const { POST } = await import('@/app/api/knowledge/query/route')
      
      const request = new NextRequest('http://localhost/api/knowledge/query', {
        method: 'POST',
        body: JSON.stringify({ 
          searchText: '人工智能' 
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()
      
      expect(data).toHaveProperty('success')
    })
  })
})
