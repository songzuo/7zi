/**
 * SSE 实时事件流
 * GET /api/workflow/:id/stream
 *
 * 支持 Server-Sent Events (SSE) 作为 WebSocket 的备选方案
 */

import { NextRequest } from 'next/server'
import { realtimeService } from '@/lib/workflow/monitoring/RealtimeService'

export const dynamic = 'force-dynamic'

/**
 * 判断错误是否为客户端中断（AbortError）。
 * 客户端断开产生的取消信号不应被当作未知错误上抛成 500。
 */
function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workflowId } = await params

  // 创建 TransformStream 用于 SSE。
  // 读写两侧均设置 highWaterMark > 0，使 write() 在 readable 尚未被消费时也能 resolve，
  // 避免 `await writer.write()` 在高水位为 0 时永久挂起（死锁）。
  const stream = new TransformStream<Uint8Array, Uint8Array>(
    undefined,
    { highWaterMark: 64 },
    { highWaterMark: 64 }
  )
  const writer = stream.writable.getWriter()
  const encoder = new TextEncoder()

  // 生成客户端ID
  const clientId = `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  /** 心跳定时器：客户端断开后必须被清理，否则进程句柄泄漏 */
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null
  /** 清理幂等标记，避免重复清理（abort 与 cancel 可能同时发生） */
  let cleanedUp = false

  /** 客户端断开（request.signal abort）处理 */
  const onAbort = () => {
    cleanup()
  }

  /**
   * 统一清理函数，覆盖所有退出分支（正常结束、异常、客户端断开）：
   * - 停止心跳定时器
   * - 释放 abort 监听器
   * - 注销客户端（终止上游工作流/执行订阅）
   * - 关闭 writer，结束 SSE 流
   */
  const cleanup = () => {
    if (cleanedUp) return
    cleanedUp = true

    if (heartbeatInterval !== null) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }

    try {
      request.signal.removeEventListener('abort', onAbort)
    } catch {
      // signal 已失效时忽略
    }

    try {
      realtimeService.unregisterClient(clientId)
    } catch {
      // 注销失败不应影响流结束
    }

    try {
      // 关闭 writer 以结束 SSE 流；已关闭/写入失败时忽略
      writer.close().catch(() => {})
    } catch {
      // writer 已释放或流已错误
    }
  }

  /** 安全写入：失败即视为连接已断开并触发清理 */
  const safeWrite = (payload: string): void => {
    try {
      writer.write(encoder.encode(payload)).catch(() => {
        cleanup()
      })
    } catch {
      cleanup()
    }
  }

  try {
    // 注册客户端
    realtimeService.registerClient(
      clientId,
      'sse',
      (data: string) => {
        safeWrite(`data: ${data}\n\n`)
      },
      () => {
        cleanup()
      }
    )

    // 订阅工作流事件
    realtimeService.subscribeWorkflow(clientId, workflowId)

    // 处理查询参数
    const searchParams = request.nextUrl.searchParams
    const executionId = searchParams.get('executionId')
    if (executionId) {
      realtimeService.subscribeExecution(clientId, executionId)
    }

    // 设置心跳（30 秒）
    heartbeatInterval = setInterval(() => {
      safeWrite(': heartbeat\n\n')
    }, 30000)

    // 处理客户端断开
    request.signal.addEventListener('abort', onAbort, { once: true })
    if (request.signal.aborted) {
      cleanup()
    }

    // 发送初始连接消息
    safeWrite(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`)
  } catch (error) {
    cleanup()

    // 客户端中断（AbortError）属于正常断开语义，不应上抛成 500
    if (isAbortError(error) || request.signal.aborted) {
      // 走下面的响应构造分支，返回已结束的 SSE 流
    } else {
      throw error
    }
  }

  // 包装 readable：客户端取消读取（ReadableStream.cancel）时同样触发清理
  const reader = stream.readable.getReader()
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) {
            controller.close()
            return
          }
          if (value) {
            controller.enqueue(value)
          }
        }
      } catch (error) {
        cleanup()
        try {
          controller.error(error)
        } catch {
          // 流已结束
        }
      }
    },
    cancel(reason) {
      cleanup()
      return reader.cancel(reason).catch(() => undefined)
    },
  })

  // 返回 SSE 响应
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
    },
  })
}
