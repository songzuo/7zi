/**
 * SSE 实时事件流
 * GET /api/workflow/:id/stream
 *
 * 支持 Server-Sent Events (SSE) 作为 WebSocket 的备选方案
 *
 * 实现要点（修复 T166 死锁与句柄泄漏）：
 * - 不在 GET 中 `await` TransformStream writer 的写入。TransformStream 的写 promise
 *   只有在 readable 被消费后才会 settle，直接 await 会在 readable 未被消费时永久死锁。
 * - 内部 TransformStream 的 readable 由一个常驻 pump 主动读取，再推送到对外暴露的
 *   ReadableStream，从而保证写侧不会因为对外 readable 尚未被消费而阻塞。
 * - 所有写入均为 fire-and-forget（附带 catch），保证 GET 立即返回。
 * - cleanup 幂等：abort / cancel / close 任意组合只注销一次、只清理一次心跳定时器。
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
  const { readable: transformReadable, writable: transformWritable } =
    new TransformStream<Uint8Array, Uint8Array>()
  const writer = transformWritable.getWriter()
  const innerReader = transformReadable.getReader()
  const encoder = new TextEncoder()

  // 生成客户端ID
  const clientId = `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  let outerController: ReadableStreamDefaultController<Uint8Array> | null = null
  let streamEnded = false
  let cleanedUp = false
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null

  // 写入（不 await）：避免 readable 未被消费时死锁
  const safeWrite = (chunk: string) => {
    if (streamEnded) return
    try {
      void writer.write(encoder.encode(chunk)).catch(() => {
        // 连接已关闭 / 写入失败（含 AbortError），忽略
      })
    } catch {
      // 连接已关闭 / 写入失败（含 AbortError），忽略
    }
  }

  // 结束对外响应流
  const endStream = (reason?: unknown) => {
    if (streamEnded) return
    streamEnded = true
    try {
      outerController?.close()
    } catch {
      // 已关闭
    }
    innerReader.cancel(reason).catch(() => {})
  }

  // 清理函数（幂等）
  const cleanup = () => {
    if (cleanedUp) return
    cleanedUp = true
    if (heartbeatInterval !== null) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
    realtimeService.unregisterClient(clientId)
  }

  // 统一的关闭流程：清理 + 结束流 + 关闭 writer
  const shutdown = (reason?: unknown) => {
    cleanup()
    endStream(reason)
    try {
      void writer.close().catch(() => {})
    } catch {
      // 已关闭
    }
  }

  // 对外暴露的响应流：控制器在 start 中同步捕获
  const outerStream = new ReadableStream<Uint8Array>({
    start(controller) {
      outerController = controller
    },
    cancel(reason) {
      // 客户端取消读取：结束上游并清理
      innerReader.cancel(reason).catch(() => {})
      try {
        void writer.close().catch(() => {})
      } catch {
        // 已关闭
      }
      cleanup()
    },
  })

  // 常驻 pump：主动消费内部 TransformStream 的 readable，避免写侧被背压阻塞
  const pump = async () => {
    try {
      for (;;) {
        const { done, value } = await innerReader.read()
        if (done) break
        if (streamEnded) break
        try {
          outerController?.enqueue(value)
        } catch {
          break
        }
      }
    } catch {
      // 读取出错，停止 pump（对外流仍可由 shutdown/cancel 结束）
    } finally {
      // 内部流结束不主动关闭对外流：对外流的结束由 shutdown（abort / 上游 close）
      // 或客户端 cancel 触发，避免误判为「客户端已断开」而提前停掉心跳。
    }
  }

  // 注册客户端
  realtimeService.registerClient(
    clientId,
    'sse',
    async (data: string) => {
      safeWrite(`data: ${data}\n\n`)
    },
    () => {
      // 上游主动关闭：清理并结束响应流
      shutdown('upstream closed')
    }
  )

  // 订阅工作流事件
  realtimeService.subscribeWorkflow(clientId, workflowId)

  // 启动 pump（后台消费内部流）
  void pump()

  // 发送初始连接消息（不 await，避免死锁）
  safeWrite(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`)

  // 处理查询参数
  const searchParams = request.nextUrl.searchParams
  const executionId = searchParams.get('executionId')
  if (executionId) {
    realtimeService.subscribeExecution(clientId, executionId)
  }

  // 设置心跳
  heartbeatInterval = setInterval(() => {
    if (streamEnded || cleanedUp) return
    safeWrite(': heartbeat\n\n')
  }, 30000) // 30秒心跳

  // 处理客户端断开
  const onAbort = () => {
    shutdown('client aborted')
  }
  if (request.signal.aborted) {
    // 断开信号在进入处理前已触发：立即清理，但仍返回 SSE 响应
    onAbort()
  } else {
    request.signal.addEventListener('abort', onAbort, { once: true })
  }

  // 返回 SSE 响应
  return new Response(outerStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
    },
  })
}
