/**
 * A2A JSON-RPC Handler - Implements JSON-RPC 2.0 protocol for A2A
 */

import { logger } from '@/lib/logger';
import {
  JsonRpcRequest,
  JsonRpcResponse,
  Task,
  Message,
  SendMessageRequest,
  GetTaskRequest,
  ListTasksRequest,
  ListTasksResponse,
  CancelTaskRequest,
  A2AErrorCodes,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
} from './types';
import { InMemoryTaskStore } from './task-store';
import { AgentExecutor, RequestContext, SimpleEventBus } from './executor';
import { AgentCard } from './agent-card';
import { v4 as uuidv4 } from 'uuid';

export interface RequestHandlerOptions {
  agentCard: AgentCard;
  taskStore: InMemoryTaskStore;
  executor: AgentExecutor;
  extendedAgentCard?: AgentCard;
}

/**
 * A2A Request Handler - Processes JSON-RPC requests
 */
export class A2ARequestHandler {
  private agentCard: AgentCard;
  private taskStore: InMemoryTaskStore;
  private executor: AgentExecutor;
  private extendedAgentCard?: AgentCard;

  constructor(options: RequestHandlerOptions) {
    this.agentCard = options.agentCard;
    this.taskStore = options.taskStore;
    this.executor = options.executor;
    this.extendedAgentCard = options.extendedAgentCard;
  }

  /**
   * Handle JSON-RPC request
   */
  async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    try {
      // Validate JSON-RPC version
      if (request.jsonrpc !== '2.0') {
        return this.createError(request.id, A2AErrorCodes.INVALID_REQUEST, 'Invalid JSON-RPC version');
      }

      // Route to appropriate method handler
      let result: unknown;

      switch (request.method) {
        case 'message/send':
          result = await this.handleSendMessage(request.params as unknown as SendMessageRequest);
          break;

        case 'message/stream':
          result = await this.handleSendMessageStream(request.params as unknown as SendMessageRequest);
          break;

        case 'tasks/get':
          result = await this.handleGetTask(request.params as unknown as GetTaskRequest);
          break;

        case 'tasks/list':
          result = await this.handleListTasks(request.params as unknown as ListTasksRequest);
          break;

        case 'tasks/cancel':
          result = await this.handleCancelTask(request.params as unknown as CancelTaskRequest);
          break;

        case 'agent/getCard':
          result = this.agentCard;
          break;

        case 'agent/getExtendedCard':
          result = await this.handleGetExtendedCard();
          break;

        default:
          return this.createError(
            request.id,
            A2AErrorCodes.METHOD_NOT_FOUND,
            `Method not found: ${request.method}`
          );
      }

      return this.createSuccess(request.id, result);

    } catch (_error) {
      logger.error('A2A Request Handler Error:', error);
      return this.createError(
        request.id,
        A2AErrorCodes.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Internal error'
      );
    }
  }

  /**
   * Handle message/send - Send a message to the agent
   */
  private async handleSendMessage(params: SendMessageRequest): Promise<Task | Message> {
    // Validate required fields
    if (!params.message || !params.message.messageId) {
      throw new Error('Missing required field: message.messageId');
    }

    const message: Message = {
      kind: 'message',
      messageId: params.message.messageId,
      role: params.message.role || 'user',
      parts: params.message.parts || [],
      contextId: params.message.contextId,
      referenceTaskIds: params.message.referenceTaskIds,
      createdAt: new Date().toISOString(),
    };

    // Create new task
    const task = this.taskStore.createTask(message.contextId, message);

    // Create execution context
    const context: RequestContext = {
      taskId: task.id,
      contextId: task.contextId || uuidv4(),
      userMessage: message,
      task,
      metadata: params.metadata,
    };

    // Create event bus
    const eventBus = new SimpleEventBus();

    // Track status and artifacts
    let latestTask = task;
    let _latestArtifact: unknown = null;

    eventBus.subscribe((event) => {
      if (event.kind === 'task') {
        latestTask = event;
      } else if (event.kind === 'status-update') {
        this.taskStore.updateTaskStatus(event.taskId, event.status);
        latestTask = { ...latestTask, status: event.status };
      } else if (event.kind === 'artifact-update') {
        this.taskStore.addArtifact(event.taskId, event.artifact);
        _latestArtifact = event.artifact;
      }
    });

    // Execute the task
    await this.executor.execute(context, eventBus);

    // For blocking mode, return the final task
    if (params.configuration?.blocking) {
      return latestTask;
    }

    // For non-blocking mode, return the task immediately
    return latestTask;
  }

  /**
   * Handle message/stream - Stream events for a message
   * Returns an AsyncGenerator for SSE streaming
   */
  private async handleSendMessageStream(params: SendMessageRequest): Promise<Task> {
    // For now, same as send but will be handled differently in the route
    return this.handleSendMessage(params) as Promise<Task>;
  }

  /**
   * Handle tasks/get - Get a task by ID
   */
  private async handleGetTask(params: GetTaskRequest): Promise<Task> {
    if (!params.id) {
      throw new Error('Missing required field: id');
    }

    const task = this.taskStore.getTask(params.id);

    if (!task) {
      throw this.createA2AError(A2AErrorCodes.TASK_NOT_FOUND, `Task not found: ${params.id}`);
    }

    // Apply history length limit
    if (params.historyLength !== undefined && task.history) {
      task.history = task.history.slice(-params.historyLength);
    }

    return task;
  }

  /**
   * Handle tasks/list - List tasks with optional filtering
   */
  private async handleListTasks(params: ListTasksRequest): Promise<ListTasksResponse> {
    return this.taskStore.listTasks({
      contextId: params.contextId,
      status: params.status,
      pageSize: params.pageSize,
      pageToken: params.pageToken,
      includeArtifacts: params.includeArtifacts,
    });
  }

  /**
   * Handle tasks/cancel - Cancel a task
   */
  private async handleCancelTask(params: CancelTaskRequest): Promise<Task> {
    if (!params.id) {
      throw new Error('Missing required field: id');
    }

    const task = this.taskStore.getTask(params.id);

    if (!task) {
      throw this.createA2AError(A2AErrorCodes.TASK_NOT_FOUND, `Task not found: ${params.id}`);
    }

    // Check if task is cancelable
    const terminalStates = ['completed', 'failed', 'canceled', 'rejected'];
    if (terminalStates.includes(task.status.state)) {
      throw this.createA2AError(
        A2AErrorCodes.TASK_NOT_CANCELABLE,
        `Task cannot be canceled in state: ${task.status.state}`
      );
    }

    // Call executor's cancel method if available
    if (this.executor.cancelTask) {
      const eventBus = new SimpleEventBus();
      await this.executor.cancelTask(params.id, eventBus);
    }

    // Update task status
    const updatedTask = this.taskStore.updateTaskStatus(params.id, {
      state: 'canceled',
      timestamp: new Date().toISOString(),
      message: 'Task canceled by user',
    });

    return updatedTask!;
  }

  /**
   * Handle agent/getExtendedCard - Get extended agent card
   */
  private async handleGetExtendedCard(): Promise<AgentCard> {
    if (!this.agentCard.capabilities?.extendedAgentCard) {
      throw this.createA2AError(
        A2AErrorCodes.UNSUPPORTED_OPERATION,
        'Extended agent card not supported'
      );
    }

    if (!this.extendedAgentCard) {
      throw this.createA2AError(
        A2AErrorCodes.EXTENDED_AGENT_CARD_NOT_CONFIGURED,
        'Extended agent card not configured'
      );
    }

    return this.extendedAgentCard;
  }

  /**
   * Create a success response
   */
  private createSuccess(id: string | number | undefined, result: unknown): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      result,
      id: id ?? null,
    };
  }

  /**
   * Create an error response
   */
  private createError(
    id: string | number | undefined,
    code: number,
    message: string,
    data?: unknown
  ): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      error: { code, message, data },
      id: id ?? null,
    };
  }

  /**
   * Create an A2A error to throw
   */
  private createA2AError(code: number, message: string): Error {
    const error = new Error(message);
    (error as unknown as Record<string, unknown>).code = code;
    return error;
  }

  /**
   * Get the agent card
   */
  getAgentCard(): AgentCard {
    return this.agentCard;
  }

  /**
   * Get streaming events for a task
   */
  async *streamTaskEvents(
    taskId: string
  ): AsyncGenerator<TaskStatusUpdateEvent | TaskArtifactUpdateEvent> {
    const task = this.taskStore.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Simple polling-based streaming for now
    // In a full implementation, this would use proper event streaming
    let lastStatus = task.status;
    let artifactCount = task.artifacts?.length || 0;

    while (true) {
      const currentTask = this.taskStore.getTask(taskId);
      if (!currentTask) break;

      // Check for status changes
      if (currentTask.status.timestamp !== lastStatus.timestamp) {
        yield {
          kind: 'status-update',
          taskId,
          contextId: currentTask.contextId,
          status: currentTask.status,
          final: ['completed', 'failed', 'canceled', 'rejected'].includes(currentTask.status.state),
        };
        lastStatus = currentTask.status;
      }

      // Check for new artifacts
      const currentArtifactCount = currentTask.artifacts?.length || 0;
      if (currentArtifactCount > artifactCount && currentTask.artifacts) {
        const newArtifacts = currentTask.artifacts.slice(artifactCount);
        for (const artifact of newArtifacts) {
          yield {
            kind: 'artifact-update',
            taskId,
            contextId: currentTask.contextId,
            artifact,
          };
        }
        artifactCount = currentArtifactCount;
      }

      // Check if task is complete
      if (['completed', 'failed', 'canceled', 'rejected'].includes(currentTask.status.state)) {
        break;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * Create the default A2A request handler
 */
export function createRequestHandler(
  agentCard: AgentCard,
  taskStore: InMemoryTaskStore,
  executor: AgentExecutor,
  extendedAgentCard?: AgentCard
): A2ARequestHandler {
  return new A2ARequestHandler({
    agentCard,
    taskStore,
    executor,
    extendedAgentCard,
  });
}