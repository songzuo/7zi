/**
 * MCP Streaming Support
 * 
 * Provides Server-Sent Events (SSE) implementation, streaming tool execution,
 * and progress callbacks:
 * - Server-Sent Events (SSE) implementation
 * - Streaming tool execution
 * - Progress callbacks and notifications
 * - Real-time event delivery
 * - Connection management
 * 
 * @module mcp/streaming
 */

import { EventEmitter } from 'events';

/**
 * SSE event types
 */
export type SSEEventType = 
  | 'message'
  | 'progress'
  | 'result'
  | 'error'
  | 'ping'
  | 'close'
  | 'tool/start'
  | 'tool/progress'
  | 'tool/result'
  | 'resource/update'
  | 'notification';

/**
 * SSE event
 */
export interface SSEEvent {
  /** Event ID */
  id?: string;
  /** Event type */
  event?: SSEEventType;
  /** Event data */
  data: string | object;
  /** Retry interval (ms) */
  retry?: number;
}

/**
 * Progress information
 */
export interface ProgressInfo {
  /** Progress ID */
  id: string;
  /** Total steps */
  total?: number;
  /** Current step */
  current: number;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Status message */
  message: string;
  /** Additional data */
  data?: unknown;
}

/**
 * Streaming context
 */
export interface StreamingContext {
  /** Stream ID */
  streamId: string;
  /** Session ID */
  sessionId: string;
  /** Request ID */
  requestId: string;
  /** Client ID for targeting */
  clientId?: string;
  /** Started timestamp */
  startedAt: Date;
  /** Metadata */
  metadata: Record<string, unknown>;
}

/**
 * Stream state
 */
export type StreamState = 'pending' | 'active' | 'paused' | 'completed' | 'error' | 'closed';

/**
 * Stream info
 */
export interface StreamInfo {
  /** Stream ID */
  id: string;
  /** Stream state */
  state: StreamState;
  /** Context */
  context: StreamingContext;
  /** Total events sent */
  eventsSent: number;
  /** Last activity */
  lastActivity: Date;
}

/**
 * Stream handler
 */
export type StreamHandler = (
  event: SSEEvent,
  context: StreamingContext
) => Promise<void> | void;

/**
 * Progress callback
 */
export type ProgressCallback = (progress: ProgressInfo) => Promise<void> | void;

/**
 * Streaming tool execution options
 */
export interface StreamingToolOptions {
  /** Tool name */
  toolName: string;
  /** Tool arguments */
  arguments: Record<string, unknown>;
  /** Progress callback */
  onProgress?: ProgressCallback;
  /** Abort signal */
  signal?: AbortSignal;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Streaming tool result
 */
export interface StreamingToolResult {
  /** Tool name */
  toolName: string;
  /** Final result */
  result: unknown;
  /** Progress updates */
  progress: ProgressInfo[];
  /** Execution duration */
  duration: number;
  /** Whether execution was cancelled */
  cancelled: boolean;
}

/**
 * MCP SSE Server
 * 
 * Manages SSE connections and event streaming.
 */
export class MCPStreamServer extends EventEmitter {
  private streams: Map<string, StreamInfo> = new Map();
  private clients: Map<string, Set<string>> = new Map(); // clientId -> streamIds
  private encoder = new TextEncoder();
  private pingInterval?: NodeJS.Timeout;
  private pingIntervalMs: number = 30000;

  constructor() {
    super();
    this.startPingInterval();
  }

  /**
   * Create a new stream
   */
  createStream(context: Omit<StreamingContext, 'startedAt'>): string {
    const streamId = context.streamId || crypto.randomUUID();
    
    const stream: StreamInfo = {
      id: streamId,
      state: 'pending',
      context: {
        ...context,
        streamId,
        startedAt: new Date(),
      },
      eventsSent: 0,
      lastActivity: new Date(),
    };

    this.streams.set(streamId, stream);

    // Track by client
    if (context.clientId) {
      if (!this.clients.has(context.clientId)) {
        this.clients.set(context.clientId, new Set());
      }
      this.clients.get(context.clientId)!.add(streamId);
    }

    this.emit('stream:created', stream);

    return streamId;
  }

  /**
   * Get stream info
   */
  getStream(streamId: string): StreamInfo | undefined {
    return this.streams.get(streamId);
  }

  /**
   * Get all streams for a client
   */
  getClientStreams(clientId: string): StreamInfo[] {
    const streamIds = this.clients.get(clientId);
    if (!streamIds) return [];

    return Array.from(streamIds)
      .map(id => this.streams.get(id))
      .filter((s): s is StreamInfo => s !== undefined);
  }

  /**
   * Send an SSE event to a stream
   */
  async sendEvent(streamId: string, event: SSEEvent): Promise<void> {
    const stream = this.streams.get(streamId);
    if (!stream) {
      throw new MCPStreamError(`Stream "${streamId}" not found`, 'STREAM_NOT_FOUND');
    }

    if (stream.state === 'closed' || stream.state === 'error') {
      throw new MCPStreamError(`Stream "${streamId}" is ${stream.state}`, 'INVALID_STATE');
    }

    // Update state to active on first event
    if (stream.state === 'pending') {
      stream.state = 'active';
    }

    // Update activity
    stream.lastActivity = new Date();
    stream.eventsSent++;

    // Emit for handling
    this.emit('event', { streamId, event });
  }

  /**
   * Send event to all streams for a client
   */
  async broadcastToClient(clientId: string, event: SSEEvent): Promise<void> {
    const streams = this.getClientStreams(clientId);
    await Promise.all(streams.map(s => this.sendEvent(s.id, event)));
  }

  /**
   * Send progress update
   */
  async sendProgress(streamId: string, progress: ProgressInfo): Promise<void> {
    await this.sendEvent(streamId, {
      event: 'progress',
      data: progress,
    });
  }

  /**
   * Send tool progress
   */
  async sendToolProgress(
    streamId: string,
    toolName: string,
    progress: ProgressInfo
  ): Promise<void> {
    await this.sendEvent(streamId, {
      event: 'tool/progress',
      data: {
        toolName,
        ...progress,
      },
    });
  }

  /**
   * Send tool result
   */
  async sendToolResult(
    streamId: string,
    toolName: string,
    result: unknown
  ): Promise<void> {
    await this.sendEvent(streamId, {
      event: 'tool/result',
      data: {
        toolName,
        result,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Send error
   */
  async sendError(streamId: string, error: Error | string): Promise<void> {
    const stream = this.streams.get(streamId);
    if (stream) {
      stream.state = 'error';
    }

    await this.sendEvent(streamId, {
      event: 'error',
      data: {
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Close a stream
   */
  async closeStream(streamId: string, reason?: string): Promise<void> {
    const stream = this.streams.get(streamId);
    if (!stream) return;

    stream.state = 'closed';

    // Send close event
    try {
      await this.sendEvent(streamId, {
        event: 'close',
        data: { reason: reason || 'Stream closed' },
      });
    } catch {
      // Stream might already be closed
    }

    // Cleanup
    this.cleanupStream(streamId);
  }

  /**
   * Pause a stream
   */
  pauseStream(streamId: string): void {
    const stream = this.streams.get(streamId);
    if (stream && stream.state === 'active') {
      stream.state = 'paused';
    }
  }

  /**
   * Resume a stream
   */
  resumeStream(streamId: string): void {
    const stream = this.streams.get(streamId);
    if (stream && stream.state === 'paused') {
      stream.state = 'active';
    }
  }

  /**
   * Get all active streams
   */
  getActiveStreams(): StreamInfo[] {
    return Array.from(this.streams.values()).filter(
      s => s.state === 'active' || s.state === 'pending'
    );
  }

  /**
   * Get stream statistics
   */
  getStats() {
    const streams = Array.from(this.streams.values());
    return {
      total: streams.length,
      active: streams.filter(s => s.state === 'active').length,
      pending: streams.filter(s => s.state === 'pending').length,
      paused: streams.filter(s => s.state === 'paused').length,
      completed: streams.filter(s => s.state === 'completed').length,
      error: streams.filter(s => s.state === 'error').length,
      closed: streams.filter(s => s.state === 'closed').length,
      totalEvents: streams.reduce((sum, s) => sum + s.eventsSent, 0),
    };
  }

  /**
   * Cleanup old streams
   */
  cleanupOldStreams(maxAge: number = 3600000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, stream] of this.streams) {
      const age = now - stream.lastActivity.getTime();
      if (age > maxAge || stream.state === 'closed' || stream.state === 'completed') {
        this.cleanupStream(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Format SSE event as string
   */
  formatSSE(event: SSEEvent): string {
    let output = '';

    if (event.id) {
      output += `id: ${event.id}\n`;
    }

    if (event.event) {
      output += `event: ${event.event}\n`;
    }

    if (event.retry !== undefined) {
      output += `retry: ${event.retry}\n`;
    }

    const data = typeof event.data === 'string' 
      ? event.data 
      : JSON.stringify(event.data);

    // Handle multiline data
    const lines = data.split('\n');
    for (const line of lines) {
      output += `data: ${line}\n`;
    }

    output += '\n';

    return output;
  }

  /**
   * Format SSE event as bytes
   */
  formatSSEBytes(event: SSEEvent): Uint8Array {
    return this.encoder.encode(this.formatSSE(event));
  }

  /**
   * Start ping interval
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      for (const [streamId, stream] of this.streams) {
        if (stream.state === 'active') {
          this.sendEvent(streamId, {
            event: 'ping',
            data: { timestamp: new Date().toISOString() },
          }).catch(() => {});
        }
      }
    }, this.pingIntervalMs);
  }

  /**
   * Cleanup stream resources
   */
  private cleanupStream(streamId: string): void {
    const stream = this.streams.get(streamId);
    if (!stream) return;

    // Remove from client tracking
    if (stream.context.clientId) {
      const clientStreams = this.clients.get(stream.context.clientId);
      if (clientStreams) {
        clientStreams.delete(streamId);
        if (clientStreams.size === 0) {
          this.clients.delete(stream.context.clientId);
        }
      }
    }

    // Remove stream
    this.streams.delete(streamId);

    // Emit cleanup event
    this.emit('stream:closed', stream);
  }

  /**
   * Stop the server
   */
  stop(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Close all streams
    for (const streamId of this.streams.keys()) {
      this.closeStream(streamId, 'Server shutting down');
    }
  }
}

/**
 * Streaming Tool Executor
 * 
 * Executes tools with streaming progress updates.
 */
export class StreamingToolExecutor {
  private streamServer: MCPStreamServer;
  private activeExecutions: Map<string, AbortController> = new Map();

  constructor(streamServer: MCPStreamServer) {
    this.streamServer = streamServer;
  }

  /**
   * Execute a tool with streaming
   */
  async executeWithStreaming(
    options: StreamingToolOptions,
    handler: (
      params: Record<string, unknown>,
      progress: (info: Omit<ProgressInfo, 'id'>) => Promise<void>
    ) => Promise<unknown>
  ): Promise<StreamingToolResult> {
    const {
      toolName,
      arguments: args,
      onProgress,
      signal,
      timeout,
    } = options;

    const executionId = crypto.randomUUID();
    const startTime = Date.now();
    const progressHistory: ProgressInfo[] = [];
    const abortController = new AbortController();

    // Track execution
    this.activeExecutions.set(executionId, abortController);

    // Link external signal
    if (signal) {
      signal.addEventListener('abort', () => {
        abortController.abort();
      });
    }

    // Setup timeout
    let timeoutId: NodeJS.Timeout | undefined;
    if (timeout) {
      timeoutId = setTimeout(() => {
        abortController.abort(new Error(`Tool execution timed out after ${timeout}ms`));
      }, timeout);
    }

    // Progress callback
    const reportProgress = async (info: Omit<ProgressInfo, 'id'>): Promise<void> => {
      const progress: ProgressInfo = {
        id: crypto.randomUUID(),
        ...info,
      };

      progressHistory.push(progress);

      // Call external callback
      if (onProgress) {
        await onProgress(progress);
      }

      // Check if aborted
      if (abortController.signal.aborted) {
        throw new Error('Execution aborted');
      }
    };

    let result: unknown;
    let cancelled = false;

    try {
      // Report start
      await reportProgress({
        current: 0,
        percentage: 0,
        message: `Starting ${toolName}`,
      });

      // Execute handler
      result = await handler(args, reportProgress);

      // Report completion
      await reportProgress({
        current: 100,
        percentage: 100,
        message: `Completed ${toolName}`,
      });
    } catch (_error) {
      if (abortController.signal.aborted) {
        cancelled = true;
        await reportProgress({
          current: 0,
          percentage: 0,
          message: `Cancelled ${toolName}`,
        });
      } else {
        throw error;
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      this.activeExecutions.delete(executionId);
    }

    return {
      toolName,
      result,
      progress: progressHistory,
      duration: Date.now() - startTime,
      cancelled,
    };
  }

  /**
   * Cancel an execution
   */
  cancelExecution(executionId: string): boolean {
    const controller = this.activeExecutions.get(executionId);
    if (controller) {
      controller.abort();
      return true;
    }
    return false;
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }
}

/**
 * SSE Response Helper
 * 
 * Creates a Response object for SSE streams.
 */
export class SSEResponse {
  private stream: ReadableStream<Uint8Array>;
  private controller: ReadableStreamDefaultController<Uint8Array>;
  private encoder = new TextEncoder();

  constructor(headers: HeadersInit = {}) {
    this.controller = undefined as unknown as ReadableStreamDefaultController<Uint8Array>;
    
    this.stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.controller = controller;
      },
    });
  }

  /**
   * Send an event
   */
  send(event: SSEEvent): void {
    const data = this.formatEvent(event);
    this.controller.enqueue(this.encoder.encode(data));
  }

  /**
   * Send text data
   */
  sendText(text: string): void {
    this.send({ data: text });
  }

  /**
   * Send JSON data
   */
  sendJSON(data: unknown): void {
    this.send({ data: JSON.stringify(data) });
  }

  /**
   * Close the stream
   */
  close(): void {
    this.controller.close();
  }

  /**
   * Get the Response object
   */
  getResponse(): Response {
    return new Response(this.stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  /**
   * Format SSE event
   */
  private formatEvent(event: SSEEvent): string {
    let output = '';

    if (event.id) {
      output += `id: ${event.id}\n`;
    }

    if (event.event) {
      output += `event: ${event.event}\n`;
    }

    const data = typeof event.data === 'string' 
      ? event.data 
      : JSON.stringify(event.data);

    output += `data: ${data}\n\n`;

    return output;
  }
}

/**
 * SSE Parser for client-side
 */
export class SSEParser {
  private buffer: string = '';
  private currentEvent: SSEEvent = { data: '' };

  /**
   * Parse SSE data
   */
  parse(chunk: string): SSEEvent[] {
    this.buffer += chunk;
    const events: SSEEvent[] = [];

    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line === '') {
        if (this.currentEvent.data) {
          events.push({ ...this.currentEvent });
          this.currentEvent = { data: '' };
        }
        continue;
      }

      if (line.startsWith('id:')) {
        this.currentEvent.id = line.slice(3).trim();
      } else if (line.startsWith('event:')) {
        this.currentEvent.event = line.slice(6).trim() as SSEEventType;
      } else if (line.startsWith('data:')) {
        this.currentEvent.data += (this.currentEvent.data ? '\n' : '') + line.slice(5);
      } else if (line.startsWith('retry:')) {
        this.currentEvent.retry = parseInt(line.slice(6).trim(), 10);
      }
    }

    return events;
  }
}

/**
 * MCP Stream Error
 */
export class MCPStreamError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'MCPStreamError';
  }
}

/**
 * Global stream server instance
 */
export const mcpStreamServer = new MCPStreamServer();

/**
 * Global streaming executor
 */
export const streamingExecutor = new StreamingToolExecutor(mcpStreamServer);

export default MCPStreamServer;
