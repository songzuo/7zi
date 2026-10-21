/**
 * AI Suggestions API Route
 * POST /api/ai/suggestions - 获取智能建议
 *
 * v1.12.x
 */

import { NextRequest } from 'next/server'
import type { AISuggestion, SuggestionCategory } from '@/components/ui/ai-chat/types'
import { createSuccessResponse, createBadRequestError, createErrorResponse } from '@/lib/api/error-handler'

// ============================================
// Types
// ============================================

interface SuggestionRequest {
  userInput: string
  conversationHistory: Array<{
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: number
  }>
  contextType?: 'workflow' | 'data' | 'general'
  limit?: number
}

// ============================================
// 建议生成逻辑
// ============================================

const WORKFLOW_SUGGESTIONS: AISuggestion[] = [
  {
    id: 'wf_1',
    text: '帮我创建一个定时工作流',
    description: '创建每日自动执行的工作流',
    category: 'workflow',
    priority: 'high',
    context: ['定时', 'schedule', 'cron'],
  },
  {
    id: 'wf_2',
    text: '解释工作流节点类型',
    description: '了解所有可用的工作流节点',
    category: 'workflow',
    priority: 'medium',
    context: ['节点', 'node', '类型'],
  },
  {
    id: 'wf_3',
    text: '如何配置 HTTP 请求节点？',
    description: '学习如何设置 HTTP 调用',
    category: 'workflow',
    priority: 'high',
    context: ['http', '请求', 'api'],
  },
  {
    id: 'wf_4',
    text: '工作流调试技巧',
    description: '如何排查工作流执行问题',
    category: 'debug',
    priority: 'medium',
    context: ['调试', 'debug', '错误'],
  },
]

const DATA_SUGGESTIONS: AISuggestion[] = [
  {
    id: 'data_1',
    text: '帮我分析数据趋势',
    description: '分析时间序列数据的趋势变化',
    category: 'data',
    priority: 'high',
    context: ['趋势', '分析', '统计'],
  },
  {
    id: 'data_2',
    text: '如何导出数据报告？',
    description: '生成并导出数据分析报告',
    category: 'data',
    priority: 'medium',
    context: ['导出', '报告', 'export'],
  },
  {
    id: 'data_3',
    text: '异常数据检测方法',
    description: '识别数据中的异常点和离群值',
    category: 'data',
    priority: 'medium',
    context: ['异常', '检测', '离群值'],
  },
  {
    id: 'data_4',
    text: '数据可视化建议',
    description: '选择合适的图表类型展示数据',
    category: 'data',
    priority: 'low',
    context: ['图表', '可视化', 'chart'],
  },
]

const CODE_SUGGESTIONS: AISuggestion[] = [
  {
    id: 'code_1',
    text: '帮我优化这段代码',
    description: '分析代码性能瓶颈并优化',
    category: 'code',
    priority: 'high',
    context: ['优化', 'performance', '优化'],
  },
  {
    id: 'code_2',
    text: '代码审查建议',
    description: '检查代码质量和最佳实践',
    category: 'code',
    priority: 'medium',
    context: ['审查', 'review', '质量'],
  },
  {
    id: 'code_3',
    text: '解释这段代码逻辑',
    description: '详细解释代码的工作原理',
    category: 'code',
    priority: 'medium',
    context: ['解释', 'explain', '逻辑'],
  },
  {
    id: 'code_4',
    text: '编写单元测试',
    description: '为代码生成测试用例',
    category: 'code',
    priority: 'low',
    context: ['测试', 'test', '单元'],
  },
]

const GENERAL_SUGGESTIONS: AISuggestion[] = [
  {
    id: 'gen_1',
    text: '7zi助手有哪些功能？',
    description: '了解助手的所有能力',
    category: 'general',
    priority: 'high',
    context: ['功能', 'help', '帮助'],
  },
  {
    id: 'gen_2',
    text: '最新版本有什么更新？',
    description: '查看 v1.12.x 的新功能',
    category: 'general',
    priority: 'medium',
    context: ['版本', '更新', 'version'],
  },
  {
    id: 'gen_3',
    text: '如何联系技术支持？',
    description: '获取技术支持和帮助',
    category: 'general',
    priority: 'low',
    context: ['联系', 'support', '支持'],
  },
  {
    id: 'gen_4',
    text: '查看系统使用文档',
    description: '访问用户文档和指南',
    category: 'general',
    priority: 'medium',
    context: ['文档', 'docs', 'guide'],
  },
]

function getSuggestions(request: SuggestionRequest): AISuggestion[] {
  const { userInput, conversationHistory, contextType, limit = 8 } = request
  const lowerInput = userInput.toLowerCase()

  // 根据上下文类型选择建议池
  let pool: AISuggestion[]

  switch (contextType) {
    case 'workflow':
      pool = [...WORKFLOW_SUGGESTIONS, ...GENERAL_SUGGESTIONS]
      break
    case 'data':
      pool = [...DATA_SUGGESTIONS, ...GENERAL_SUGGESTIONS]
      break
    default:
      pool = [...GENERAL_SUGGESTIONS, ...WORKFLOW_SUGGESTIONS, ...DATA_SUGGESTIONS, ...CODE_SUGGESTIONS]
  }

  // 基于用户输入过滤相关建议
  const scoredSuggestions = pool.map((suggestion) => {
    let score = 0

    // 检查上下文关键词匹配
    if (suggestion.context) {
      for (const ctx of suggestion.context) {
        if (lowerInput.includes(ctx.toLowerCase())) {
          score += 2
        }
      }
    }

    // 检查是否与输入内容相关
    if (
      suggestion.text.toLowerCase().includes(lowerInput) ||
      lowerInput.includes(suggestion.text.toLowerCase().slice(0, 5))
    ) {
      score += 3
    }

    // 优先级加权
    if (suggestion.priority === 'high') score += 1

    return { suggestion, score }
  })

  // 排序并返回前 limit 个
  return scoredSuggestions
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => ({ ...item.suggestion, id: `${item.suggestion.id}_${Date.now()}` }))
}

// ============================================
// POST /api/ai/suggestions
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SuggestionRequest

    if (!body.userInput?.trim()) {
      return createBadRequestError('用户输入不能为空')
    }

    const suggestions = getSuggestions({
      ...body,
      limit: body.limit || 8,
    })

    return createSuccessResponse({
      suggestions,
      generatedAt: Date.now(),
    })
  } catch (error) {
    console.error('[AI Suggestions] Error:', error)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

export const dynamic = 'force-dynamic'
