/**
 * AI Conversations API Route
 * GET /api/ai/conversations - 获取对话列表
 * GET /api/ai/conversations/[id] - 获取单个对话
 * DELETE /api/ai/conversations/[id] - 删除对话
 * PATCH /api/ai/conversations/[id] - 更新对话
 * POST /api/ai/conversations/[id]/archive - 归档对话
 *
 * v1.12.x
 */

import { NextRequest } from 'next/server'
import { createSuccessResponse, createErrorResponse } from '@/lib/api/error-handler'

// ============================================
// Types
// ============================================

interface AIMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  isStreaming?: boolean
  error?: string
}

interface AIConversation {
  id: string
  title: string
  messages: AIMessage[]
  createdAt: number
  updatedAt: number
  status: 'active' | 'archived'
  tokenCount?: number
  tags?: string[]
}

// ============================================
// 模拟数据库存储
// ============================================

const conversationsStore = new Map<string, AIConversation>()

// 预填充一些示例对话
const sampleConversations: AIConversation[] = [
  {
    id: 'conv_sample_1',
    title: '工作流配置咨询',
    messages: [
      {
        id: 'msg_1',
        role: 'user',
        content: '如何创建定时工作流？',
        timestamp: Date.now() - 86400000,
      },
      {
        id: 'msg_2',
        role: 'assistant',
        content: '创建定时工作流需要以下步骤...\n\n1. 进入工作流编辑器\n2. 选择触发类型为"定时"\n3. 配置 Cron 表达式\n4. 添加执行步骤',
        timestamp: Date.now() - 86400000 + 1000,
      },
    ],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000 + 1000,
    status: 'active',
    tags: ['workflow'],
  },
  {
    id: 'conv_sample_2',
    title: '代码优化建议',
    messages: [
      {
        id: 'msg_3',
        role: 'user',
        content: '帮我优化这个函数',
        timestamp: Date.now() - 172800000,
      },
      {
        id: 'msg_4',
        role: 'assistant',
        content: '我可以帮你优化代码。请提供具体的代码片段，我会分析性能瓶颈并给出优化建议。',
        timestamp: Date.now() - 172800000 + 1000,
      },
    ],
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172800000 + 1000,
    status: 'archived',
    tags: ['code'],
  },
]

for (const conv of sampleConversations) {
  conversationsStore.set(conv.id, conv)
}

// ============================================
// GET /api/ai/conversations
// ============================================

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') as 'active' | 'archived' | null
    const limit = parseInt(url.searchParams.get('limit') || '20', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)

    let conversations = Array.from(conversationsStore.values())

    // 过滤状态
    if (status) {
      conversations = conversations.filter((c) => c.status === status)
    }

    // 排序（最新优先）
    conversations.sort((a, b) => b.updatedAt - a.updatedAt)

    // 分页
    const total = conversations.length
    const paginatedConversations = conversations.slice(offset, offset + limit)

    // 返回摘要（不含完整消息）
    const summaries = paginatedConversations.map((c) => ({
      id: c.id,
      title: c.title,
      messageCount: c.messages.length,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      status: c.status,
      tags: c.tags,
    }))

    return createSuccessResponse({
      conversations: summaries,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[AI Conversations] GET Error:', error)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

export const dynamic = 'force-dynamic'
