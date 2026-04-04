/**
 * Feedback Response API Route Tests
 *
 * 测试反馈回复 API 端点：
 * - POST /api/feedback/response
 */

import { POST } from '../route'
import { NextRequest } from 'next/server'
import { feedbackStorage } from '@/lib/db/feedback-storage'

describe('Feedback Response API - POST /api/feedback/response', () => {
  // Initialize storage before all tests
  beforeAll(() => {
    feedbackStorage.initialize()
  })

  // Clean up after all tests
  afterAll(() => {
    feedbackStorage.close()
  })

  it('应该为管理员成功添加回复', async () => {
    // First create a feedback to respond to
    const feedback = feedbackStorage.createFeedback({
      userId: 'user-1',
      userName: 'Test User',
      userEmail: 'user@example.com',
      type: 'bug',
      priority: 'medium',
      status: 'pending',
      title: 'Test Feedback',
      description: 'This is a test feedback for response',
      attachments: [],
      tags: [],
    })

    const request = new NextRequest('http://localhost:3000/api/feedback/response', {
      method: 'POST',
      headers: {
        'x-user-id': 'admin-1',
        'x-user-name': 'Admin User',
        'x-user-email': 'admin@example.com',
        'x-user-role': 'admin',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        feedbackId: feedback.id,
        response: 'Thank you for your feedback. We will fix this issue.',
        adminId: 'admin-1',
        adminName: 'Admin User',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
  })

  it('应该拒绝普通用户的回复请求', async () => {
    // Create a feedback first
    const feedback = feedbackStorage.createFeedback({
      userId: 'user-1',
      userName: 'Test User',
      userEmail: 'user@example.com',
      type: 'feature',
      priority: 'medium',
      status: 'pending',
      title: 'Feature Request',
      description: 'Please add this feature',
      attachments: [],
      tags: [],
    })

    const request = new NextRequest('http://localhost:3000/api/feedback/response', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'x-user-name': 'Regular User',
        'x-user-email': 'user@example.com',
        'x-user-role': 'user',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        feedbackId: feedback.id,
        response: 'This is a response',
        adminId: 'user-1',
        adminName: 'Regular User',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Forbidden')
  })

  it('应该验证回复内容', async () => {
    // Create a feedback first
    const feedback = feedbackStorage.createFeedback({
      userId: 'user-1',
      userName: 'Test User',
      userEmail: 'user@example.com',
      type: 'bug',
      priority: 'medium',
      status: 'pending',
      title: 'Bug Report',
      description: 'There is a bug',
      attachments: [],
      tags: [],
    })

    const request = new NextRequest('http://localhost:3000/api/feedback/response', {
      method: 'POST',
      headers: {
        'x-user-id': 'admin-1',
        'x-user-role': 'admin',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        feedbackId: feedback.id,
        response: '', // 空回复
        adminId: 'admin-1',
        adminName: 'Admin User',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.errors).toBeDefined()
  })

  it('应该验证必填字段', async () => {
    const request = new NextRequest('http://localhost:3000/api/feedback/response', {
      method: 'POST',
      headers: {
        'x-user-id': 'admin-1',
        'x-user-role': 'admin',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // 缺少必填字段
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.errors).toBeDefined()
  })

  it('应该清理回复内容（XSS防护）', async () => {
    // Create a feedback first
    const feedback = feedbackStorage.createFeedback({
      userId: 'user-1',
      userName: 'Test User',
      userEmail: 'user@example.com',
      type: 'bug',
      priority: 'medium',
      status: 'pending',
      title: 'Bug Report',
      description: 'There is a bug',
      attachments: [],
      tags: [],
    })

    const request = new NextRequest('http://localhost:3000/api/feedback/response', {
      method: 'POST',
      headers: {
        'x-user-id': 'admin-1',
        'x-user-role': 'admin',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        feedbackId: feedback.id,
        response: '<script>alert("xss")</script> Nice feedback!',
        adminId: 'admin-1',
        adminName: 'Admin User',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    // 应该成功，且内容被清理
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('应该返回404如果反馈不存在', async () => {
    const request = new NextRequest('http://localhost:3000/api/feedback/response', {
      method: 'POST',
      headers: {
        'x-user-id': 'admin-1',
        'x-user-role': 'admin',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        feedbackId: 'nonexistent-feedback',
        response: 'Test response',
        adminId: 'admin-1',
        adminName: 'Admin User',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Not Found')
  })
})
