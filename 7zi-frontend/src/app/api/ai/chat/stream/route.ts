/**
 * AI Chat Stream API Route
 * POST /api/ai/chat/stream - 流式发送消息
 *
 * v1.12.x
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// ============================================
// Types
// ============================================

interface ChatRequest {
  content: string
  conversationId?: string
  context?: {
    conversationId: string
    systemPrompt?: string
    maxTokens?: number
    temperature?: number
  }
}

// ============================================
// 模拟 AI 响应生成器
// ============================================

async function* generateStreamResponse(
  userMessage: string,
  systemPrompt?: string
): AsyncGenerator<string, void, unknown> {
  const lowerMessage = userMessage.toLowerCase()
  let response = ''

  // 工作流相关
  if (lowerMessage.includes('工作流') || lowerMessage.includes('workflow')) {
    response = `好的，让我帮你了解工作流功能：

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
  else if (lowerMessage.includes('代码') || lowerMessage.includes('code') || lowerMessage.includes('function')) {
    response = `当然可以帮你分析代码！

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
  else if (lowerMessage.includes('数据') || lowerMessage.includes('分析') || lowerMessage.includes('统计')) {
    response = `数据分析功能可以帮助你：

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
  else if (lowerMessage.includes('bug') || lowerMessage.includes('错误') || lowerMessage.includes('调试')) {
    response = `好的，让我帮你调试问题！

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
  // 帮助
  else if (lowerMessage.includes('帮助') || lowerMessage.includes('help')) {
    response = `我是 7zi 助手！🤖

我可以帮你做：

**⚡ 工作流** - 创建和管理自动化工作流
**🔧 代码** - 编写、调试和优化代码
**📊 数据** - 数据分析和可视化
**📝 文档** - 生成报告和文档
**❓ 问题** - 解答技术问题

当前版本：v1.12.x

有什么我可以帮你的吗？`
  }
  // 问候
  else if (lowerMessage.includes('你好') || lowerMessage.includes('hi') || lowerMessage.includes('hello')) {
    response = `你好！👋 

我是 7zi 助手，很高兴为你服务！

你可以让我帮你：
- 解答技术问题
- 创建工作流程
- 分析数据
- 调试代码

有什么需要尽管说！`
  }
  // 默认
  else {
    response = `感谢你的消息！我是 7zi 助手。

**我能帮你：**
- ⚡ 工作流创建和管理
- 🔧 代码编写和调试  
- 📊 数据分析和可视化
- 📝 文档和报告生成
- ❓ 技术问题解答

请告诉我你需要什么帮助！

版本：v1.12.x`
  }

  const chunks = response.split('')

  for (const chunk of chunks) {
    // 模拟打字延迟（10-30ms）
    await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 20))
    yield chunk
  }
}

// ============================================
// POST /api/ai/chat/stream
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest

    if (!body.content?.trim()) {
      return NextResponse.json(
        { error: '消息内容不能为空' },
        { status: 400 }
      )
    }

    logger.info(`[AI Chat Stream] User: ${body.content.substring(0, 50)}...`)

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let chunkCount = 0

          for await (const chunk of generateStreamResponse(
            body.content,
            body.context?.systemPrompt
          )) {
            const data = JSON.stringify({
              id: `msg_${Date.now()}`,
              delta: chunk,
              done: false,
            })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            chunkCount++

            // 每100个chunk发送一次心跳
            if (chunkCount % 100 === 0) {
              await new Promise((resolve) => setTimeout(resolve, 0))
            }
          }

          // 发送完成
          const doneData = JSON.stringify({ done: true, usage: {
            promptTokens: Math.ceil(body.content.length / 4),
            completionTokens: chunkCount,
            totalTokens: Math.ceil(body.content.length / 4) + chunkCount,
          }})
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
        'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
      },
    })
  } catch (error) {
    logger.error('[AI Chat Stream] Error:', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: '处理消息失败，请重试' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
