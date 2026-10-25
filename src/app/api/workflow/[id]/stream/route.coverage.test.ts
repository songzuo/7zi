/**
 * Workflow SSE Stream API — 缺陷回归测试（T146）
 *
 * 覆盖 T140 实测确认的两个真实缺陷：
 * 1. SSE 端点死锁与句柄泄漏：
 *    - `await writer.write(...)` 在 TransformStream readable 未被消费时永不 resolve（死锁）
 *    - 客户端断开后清理路径不完整，定时器/监听器/上游订阅未释放（句柄泄漏）
 * 2. SSE 断开后心跳未停止：abort / cancel 后心跳 interval 仍持续运行
 *
 * 附加覆盖：
 * 3. `ReadableStream.cancel` 路径同样触发清理
 * 4. AbortError 不被当作未知错误上抛成 500
 *
 * 本文件使用**真实的 TransformStream**（不 stub），以验证修复后的实现不再死锁。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  mockRegisterClient,
  mockUnregisterClient,
  mockSubscribeWorkflow,
  mockSubscribeExecution,
} = vi.hoisted(() => ({
  mockRegisterClient: vi.fn(),
  mockUnregisterClient: vi.fn(),
  mockSubscribeWorkflow: vi.fn(),
  mockSubscribeExecution: vi.fn(),
}))

vi.mock('@/lib/workflow/monitoring/RealtimeService', () => ({
  realtimeService: {
    registerClient: (...args: unknown[]) => mockRegisterClient(...args),
    unregisterClient: (...args: unknown[]) => mockUnregisterClient(...args),
    subscribeWorkflow: (...args: unknown[]) => mockSubscribeWorkflow(...args),
    subscribeExecution: (...args: unknown[]) => mockSubscribeExecution(...args),
  },
}))

import { GET } from './route'

function createRequest(url: string, signal?: AbortSignal): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), { method: 'GET', signal })
}

/** 读取响应体中的若干 chunk（真实流） */
async function readChunks(
  response: Response,
  max = 20
): Promise<string[]> {
  const reader = response.body?.getReader()
  if (!reader) return []
  const chunks: string[] = []
  try {
    for (let i = 0; i < max; i++) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(new TextDecoder().decode(value))
    }
  } finally {
    reader.cancel().catch(() => {})
  }
  return chunks
}

beforeEach(() => {
  mockRegisterClient.mockReturnValue(undefined)
  mockUnregisterClient.mockReturnValue(undefined)
  mockSubscribeWorkflow.mockReturnValue(true)
  mockSubscribeExecution.mockReturnValue(true)
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('SSE 缺陷回归：死锁与句柄泄漏', () => {
  it('GET 在 readable 未被消费时也能立即返回（不再死锁）', async () => {
    vi.useFakeTimers()

    // 若实现仍使用 `await writer.write(...)`，此处会因 readable 未消费而永不 resolve，
    // 测试将通过超时失败。
    const response = await GET(createRequest('/api/workflow/wf_1/stream'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
  }, 5000)

  it('客户端 abort 后释放心跳定时器（不再残留 interval 句柄）', async () => {
    vi.useFakeTimers()
    const clearSpy = vi.spyOn(globalThis, 'clearInterval')

    const controller = new AbortController()
    const request = createRequest('/api/workflow/wf_1/stream', controller.signal)

    await GET(request, { params: Promise.resolve({ id: 'wf_1' }) })
    const clientId = mockRegisterClient.mock.calls[0][0]

    expect(mockUnregisterClient).not.toHaveBeenCalled()

    controller.abort()

    expect(mockUnregisterClient).toHaveBeenCalledWith(clientId)
    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })

  it('客户端 abort 后不再产生心跳 chunk', async () => {
    vi.useFakeTimers()

    const controller = new AbortController()
    const request = createRequest('/api/workflow/wf_1/stream', controller.signal)

    const response = await GET(request, { params: Promise.resolve({ id: 'wf_1' }) })
    const reader = response.body!.getReader()
    await reader.read() // connected 事件

    controller.abort()

    await vi.advanceTimersByTimeAsync(120_000)

    // abort 之后心跳不应再写入；读取应已结束（流被关闭）
    const next = await reader.read()
    expect(next.done).toBe(true)
  })

  it('客户端 abort 后关闭 writer（响应流被正确结束，不残留挂起句柄）', async () => {
    vi.useFakeTimers()

    const controller = new AbortController()
    const request = createRequest('/api/workflow/wf_1/stream', controller.signal)

    const response = await GET(request, { params: Promise.resolve({ id: 'wf_1' }) })
    const reader = response.body!.getReader()
    await reader.read() // connected 事件

    controller.abort()

    // abort 后流应被结束（done=true），而不是永久挂起
    const next = await reader.read()
    expect(next.done).toBe(true)
  })

  it('ReadableStream.cancel（客户端取消读取）时触发清理', async () => {
    vi.useFakeTimers()

    const controller = new AbortController()
    const request = createRequest('/api/workflow/wf_1/stream', controller.signal)

    const response = await GET(request, { params: Promise.resolve({ id: 'wf_1' }) })
    const clientId = mockRegisterClient.mock.calls[0][0]

    await response.body!.cancel('client gone')

    expect(mockUnregisterClient).toHaveBeenCalledWith(clientId)
  })

  it('cancel 之后心跳停止，不再残留定时器', async () => {
    vi.useFakeTimers()
    const clearSpy = vi.spyOn(globalThis, 'clearInterval')

    const response = await GET(createRequest('/api/workflow/wf_1/stream'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    await response.body!.cancel('client gone')

    const chunksAfterCancel = await readChunks(response, 1)
    expect(chunksAfterCancel).toHaveLength(0)
    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })

  it('清理幂等：abort 与 cancel 同时发生不会重复注销或抛错', async () => {
    vi.useFakeTimers()

    const controller = new AbortController()
    const request = createRequest('/api/workflow/wf_1/stream', controller.signal)

    const response = await GET(request, { params: Promise.resolve({ id: 'wf_1' }) })
    const clientId = mockRegisterClient.mock.calls[0][0]

    controller.abort()
    await response.body!.cancel('client gone')

    expect(mockUnregisterClient).toHaveBeenCalledTimes(1)
    expect(mockUnregisterClient).toHaveBeenCalledWith(clientId)
  })

  it('close 回调触发清理（上游主动关闭）', async () => {
    vi.useFakeTimers()

    await GET(createRequest('/api/workflow/wf_1/stream'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })
    const clientId = mockRegisterClient.mock.calls[0][0]
    const closeCallback = mockRegisterClient.mock.calls[0][3]

    expect(typeof closeCallback).toBe('function')
    closeCallback()

    expect(mockUnregisterClient).toHaveBeenCalledWith(clientId)
  })
})

describe('SSE 缺陷回归：AbortError 不应被当作未知错误上抛', () => {
  it('request.signal 已 aborted 时仍返回 SSE 响应而不是抛错', async () => {
    vi.useFakeTimers()

    const controller = new AbortController()
    controller.abort()
    const request = createRequest('/api/workflow/wf_1/stream', controller.signal)

    await expect(
      GET(request, { params: Promise.resolve({ id: 'wf_1' }) })
    ).resolves.toBeInstanceOf(Response)
  })

  it('写入阶段抛 AbortError 时返回 SSE 响应且已完成清理', async () => {
    vi.useFakeTimers()

    const controller = new AbortController()
    const request = createRequest('/api/workflow/wf_1/stream', controller.signal)

    const promise = GET(request, { params: Promise.resolve({ id: 'wf_1' }) })
    controller.abort()

    const response = await promise
    expect(response.status).toBe(200)
    expect(mockUnregisterClient).toHaveBeenCalled()
  })
})
