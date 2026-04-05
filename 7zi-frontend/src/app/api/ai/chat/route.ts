/**
 * AI Chat API Route
 * POST /api/ai/chat - 发送消息（非流式）
 * POST /api/ai/chat/stream - 发送消息（流式）
 *
 * v1.12.x
 */

import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'
import { createSuccessResponse, createBadRequestError, createErrorResponse } from '@/lib/api/error-handler'

// ============================================
// Types
// ============================================

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

interface ChatRequest {
  content: string
  conversationId?: string
  context?: {
    conversationId: string
    systemPrompt?: string
    maxTokens?: number
    temperature?: number
  }
  stream?: boolean
}

// ============================================
// 模拟 AI 响应生成器
// ============================================

function generateAIResponse(userMessage: string, systemPrompt?: string): string {
  const lowerMessage = userMessage.toLowerCase()

  // 工作流相关
  if (lowerMessage.includes('工作流') || lowerMessage.includes('workflow')) {
    return `好的，让我帮你了解工作流功能：

**创建工作流**：
1. 进入工作流编辑器
2. 选择触发类型（手动/定时/事件）
3. 拖拽节点构建流程
4. 配置节点参数
5. 保存并激活

**示例工作流**：
\`\`\`json
{
  "trigger": { "type": "schedule", "cron": "0 9 * * *" },
  "steps": [
    { "type": "http", "url": "https://api.example.com/data" },
    { "type": "transform", "mapping": {...} },
    { "type": "notify", "channel": "email" }
  ]
}
\`\`\`

需要我详细解释某个步骤吗？`
  }

  // 代码相关
  if (lowerMessage.includes('代码') || lowerMessage.includes('code') || lowerMessage.includes('function')) {
    return `当然可以帮你分析代码！

请提供具体的代码片段，我可以帮你：
- 代码审查和优化建议
- Bug 定位和分析
- 性能优化建议
- 最佳实践建议

**示例分析请求**：
\`\`\`javascript
async function fetchData(url) {
  const response = await fetch(url)
  return response.json()
}
\`\`\`

请粘贴你想要分析的代码，我会给出详细建议。`
  }

  // 数据分析
  if (lowerMessage.includes('数据') || lowerMessage.includes('分析') || lowerMessage.includes('统计')) {
    return `数据分析功能可以帮助你：

**支持的分析类型**：
- 📊 趋势分析 - 时间序列数据变化
- 📈 异常检测 - 识别数据中的异常点
- 🔍 关联分析 - 发现数据间的关联关系
- 📉 预测分析 - 基于历史数据的预测

**示例查询**：
\`\`\`
分析最近7天的用户活跃趋势
\`\`\`

你想要分析什么类型的数据？`
  }

  // 调试
  if (lowerMessage.includes('bug') || lowerMessage.includes('错误') || lowerMessage.includes('调试')) {
    return `好的，让我帮你调试问题！

**请提供以下信息**：
1. 错误信息截图或文本
2. 出现问题前的操作步骤
3. 相关的日志内容
4. 发生时间

**常见问题快速排查**：
- 🔌 连接问题：检查网络和服务器状态
- ⏰ 超时问题：增加超时时间或优化查询
- 🔐 权限问题：确认账号权限配置

请详细描述你遇到的问题，我会帮你定位。`
  }

  // 默认回复
  return `感谢你的消息！我是 7zi 助手，可以帮你：

**我可以帮你做：**
- ⚡ 工作流创建和管理
- 🔧 代码编写和调试
- 📊 数据分析和可视化
- 📝 文档和报告生成
- ❓ 技术问题解答

请告诉我你需要什么帮助，我会尽力提供支持！

当前版本：v1.12.x`
}

// ============================================
// 模拟流式响应
// ============================================

async function* generateStreamResponse(
  userMessage: string,
  systemPrompt?: string
): AsyncGenerator<string, void, unknown> {
  const response = generateAIResponse(userMessage, systemPrompt)
  const chunks = response.split('')

  for (const chunk of chunks) {
    // 模拟打字延迟
    await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 20))
    yield chunk
  }
}

// ============================================
// POST /api/ai/chat
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest

    if (!body.content?.trim()) {
      return createBadRequestError('消息内容不能为空')
    }

    // 生成响应
    const content = generateAIResponse(body.content, body.context?.systemPrompt)

    const assistantMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant' as const,
      content,
      timestamp: Date.now(),
    }

    // 记录日志
    logger.info(`[AI Chat] User: ${body.content.substring(0, 50)}...`)

    return createSuccessResponse({
      message: assistantMessage,
      conversationId: body.conversationId || `conv_${Date.now()}`,
      usage: {
        promptTokens: Math.ceil(body.content.length / 4),
        completionTokens: Math.ceil(content.length / 4),
        totalTokens: Math.ceil((body.content.length + content.length) / 4),
      },
    })
  } catch (error) {
    logger.error('[AI Chat] Error:', error instanceof Error ? error : undefined)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

// ============================================
// 流式响应处理
// ============================================

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 使用 NextResponse.body 来实现流式响应
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const message = url.searchParams.get('message') || ''
  const systemPrompt = url.searchParams.get('systemPrompt') || ''

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 发送开始标记
        controller.enqueue(encoder.encode('event: start\n\n'))

        for await (const chunk of generateStreamResponse(message, systemPrompt)) {
          const data = JSON.stringify({
            id: `msg_${Date.now()}`,
            delta: chunk,
            done: false,
          })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        }

        // 发送完成标记
        const doneData = JSON.stringify({ done: true })
        controller.enqueue(encoder.encode(`data: ${doneData}\n\n`))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (error) {
        logger.error('[AI Chat Stream] Error:', error instanceof Error ? error : undefined)
        const errorData = JSON.stringify({ error: '流式响应失败' })
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
