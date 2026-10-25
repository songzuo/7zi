/**
 * Workflow SSE Stream API Route Tests
 *
 * Covers:
 * - GET /api/workflow/[id]/stream
 *   - SSE response headers
 *   - initial "connected" event payload
 *   - workflow subscription + optional execution subscription
 *   - heartbeat emission
 *   - client disconnect triggers cleanup (unregister + writer close)
 *
 * NOTE: The route creates a real TransformStream and awaits writer.write() before
 * the readable side is consumed. Under test that deadlocks (the write promise only
 * settles once a reader consumes the chunk), so TransformStream is stubbed with a
 * deterministic fake that records written chunks. The 30s heartbeat interval is
 * controlled with fake timers so it does not keep the test process alive.
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

/** Chunks written through the stubbed TransformStream writer, decoded as text. */
let writtenChunks: string[] = []
/** Number of times the stubbed writer was closed. */
let writerCloseCount = 0

beforeEach(() => {
  writtenChunks = []
  writerCloseCount = 0

  class FakeWriter {
    async write(chunk: Uint8Array): Promise<void> {
      writtenChunks.push(new TextDecoder().decode(chunk))
    }
    async close(): Promise<void> {
      writerCloseCount += 1
    }
    releaseLock(): void {}
  }

  class FakeTransformStream {
    readonly readable: ReadableStream<Uint8Array>
    readonly writable: { getWriter: () => FakeWriter }

    constructor() {
      this.readable = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.close()
        },
      })
      this.writable = { getWriter: () => new FakeWriter() }
    }
  }

  vi.stubGlobal('TransformStream', FakeTransformStream)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function createRequest(url: string, signal?: AbortSignal): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), { method: 'GET', signal })
}

describe('GET /api/workflow/[id]/stream', () => {
  beforeEach(() => {
    mockRegisterClient.mockReturnValue(undefined)
    mockUnregisterClient.mockReturnValue(undefined)
    mockSubscribeWorkflow.mockReturnValue(true)
    mockSubscribeExecution.mockReturnValue(true)
  })

  it('returns an SSE response with the expected headers', async () => {
    const response = await GET(createRequest('/api/workflow/wf_1/stream'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    expect(response.headers.get('Cache-Control')).toBe('no-cache')
    expect(response.headers.get('Connection')).toBe('keep-alive')
    expect(response.headers.get('X-Accel-Buffering')).toBe('no')
  })

  it('registers an SSE client and subscribes it to the workflow', async () => {
    await GET(createRequest('/api/workflow/wf_1/stream'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(mockRegisterClient).toHaveBeenCalledTimes(1)
    const [clientId, type] = mockRegisterClient.mock.calls[0]
    expect(typeof clientId).toBe('string')
    expect(clientId.startsWith('sse_')).toBe(true)
    expect(type).toBe('sse')

    expect(mockSubscribeWorkflow).toHaveBeenCalledWith(clientId, 'wf_1')
  })

  it('does not subscribe to an execution when executionId is absent', async () => {
    await GET(createRequest('/api/workflow/wf_1/stream'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(mockSubscribeExecution).not.toHaveBeenCalled()
  })

  it('subscribes to the execution when executionId is provided', async () => {
    await GET(createRequest('/api/workflow/wf_1/stream?executionId=exec_9'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(mockSubscribeExecution).toHaveBeenCalledTimes(1)
    expect(mockSubscribeExecution.mock.calls[0][1]).toBe('exec_9')
  })

  it('emits an initial connected event carrying the registered client id', async () => {
    await GET(createRequest('/api/workflow/wf_1/stream'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(writtenChunks).toHaveLength(1)
    const chunk = writtenChunks[0]
    expect(chunk.startsWith('data: ')).toBe(true)
    expect(chunk.endsWith('\n\n')).toBe(true)

    const payload: { type: string; clientId: string } = JSON.parse(chunk.slice(6, -2))
    expect(payload.type).toBe('connected')
    expect(typeof payload.clientId).toBe('string')
    expect(payload.clientId).toBe(mockRegisterClient.mock.calls[0][0])
  })

  it('emits a heartbeat comment after the heartbeat interval elapses', async () => {
    await GET(createRequest('/api/workflow/wf_1/stream'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(writtenChunks).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(30_000)

    expect(writtenChunks).toHaveLength(2)
    expect(writtenChunks[1]).toBe(': heartbeat\n\n')
  })

  it('unregisters the client when the request is aborted', async () => {
    const controller = new AbortController()
    const request = createRequest('/api/workflow/wf_1/stream', controller.signal)

    await GET(request, { params: Promise.resolve({ id: 'wf_1' }) })
    const clientId = mockRegisterClient.mock.calls[0][0]

    expect(mockUnregisterClient).not.toHaveBeenCalled()

    controller.abort()

    expect(mockUnregisterClient).toHaveBeenCalledWith(clientId)
  })

  it('closes the stream writer through the client close callback', async () => {
    await GET(createRequest('/api/workflow/wf_1/stream'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    // The route registers a `close` callback that is expected to close the writer.
    const closeCallback = mockRegisterClient.mock.calls[0][3]
    expect(typeof closeCallback).toBe('function')

    closeCallback()

    expect(writerCloseCount).toBeGreaterThanOrEqual(1)
  })

  it('stops emitting heartbeats after the client disconnected', async () => {
    const controller = new AbortController()
    const request = createRequest('/api/workflow/wf_1/stream', controller.signal)

    await GET(request, { params: Promise.resolve({ id: 'wf_1' }) })
    controller.abort()

    const chunksAfterAbort = writtenChunks.length

    await vi.advanceTimersByTimeAsync(60_000)

    expect(writtenChunks.length).toBe(chunksAfterAbort)
  })
})
