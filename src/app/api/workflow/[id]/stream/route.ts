/**
 * SSE 实时事件流
 * GET /api/workflow/:id/stream
 * 
 * 支持 Server-Sent Events (SSE) 作为 WebSocket 的备选方案
 */

import { NextRequest } from 'next/server'
import { realtimeService } from '@/lib/workflow/monitoring/RealtimeService'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workflowId } = await params
  
  // 创建 TransformStream 用于 SSE
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  const encoder = new TextEncoder()

  // 生成客户端ID
  const clientId = `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // 注册客户端
  realtimeService.registerClient(
    clientId,
    'sse',
    async (data: string) => {
      try {
        await writer.write(encoder.encode(`data: ${data}\n\n`))
      } catch {
        // 连接已关闭
      }
    },
    () => {
      writer.close().catch(() => {})
    }
  )

  // 订阅工作流事件
  realtimeService.subscribeWorkflow(clientId, workflowId)

  // 发送初始连接消息
  await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`))

  // 处理查询参数
  const searchParams = request.nextUrl.searchParams
  const executionId = searchParams.get('executionId')
  if (executionId) {
    realtimeService.subscribeExecution(clientId, executionId)
  }

  // 设置心跳
  const heartbeatInterval = setInterval(async () => {
    try {
      await writer.write(encoder.encode(': heartbeat\n\n'))
    } catch {
      clearInterval(heartbeatInterval)
      realtimeService.unregisterClient(clientId)
    }
  }, 30000) // 30秒心跳

  // 清理函数
  const cleanup = () => {
    clearInterval(heartbeatInterval)
    realtimeService.unregisterClient(clientId)
  }

  // 处理客户端断开
  request.signal.addEventListener('abort', () => {
    cleanup()
  })

  // 返回 SSE 响应
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
    },
  })
}