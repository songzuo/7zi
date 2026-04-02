/**
 * A2A Agent Executor - Core execution logic for agent tasks
 */

import { Task, Message, TaskStatusUpdateEvent, TaskArtifactUpdateEvent, Artifact } from './types'
import { v4 as uuidv4 } from 'uuid'

export interface RequestContext {
  taskId: string
  contextId: string
  userMessage: Message
  task?: Task
  metadata?: Record<string, unknown>
}

export interface ExecutionEventBus {
  publish(event: Task | Message | TaskStatusUpdateEvent | TaskArtifactUpdateEvent): void
  finished(): void
  isFinished(): boolean
}

/**
 * AgentExecutor interface - implement this to create your agent logic
 */
export interface AgentExecutor {
  execute(context: RequestContext, eventBus: ExecutionEventBus): Promise<void>
  cancelTask?(taskId: string, eventBus: ExecutionEventBus): Promise<void>
}

/**
 * Simple event bus implementation for tracking execution events
 */
export class SimpleEventBus implements ExecutionEventBus {
  private events: Array<Task | Message | TaskStatusUpdateEvent | TaskArtifactUpdateEvent> = []
  private _finished = false
  private listeners: Array<
    (event: Task | Message | TaskStatusUpdateEvent | TaskArtifactUpdateEvent) => void
  > = []

  publish(event: Task | Message | TaskStatusUpdateEvent | TaskArtifactUpdateEvent): void {
    if (this._finished) {
      throw new Error('Cannot publish events after finished() has been called')
    }
    this.events.push(event)
    this.listeners.forEach(listener => listener(event))
  }

  finished(): void {
    this._finished = true
  }

  isFinished(): boolean {
    return this._finished
  }

  getEvents(): Array<Task | Message | TaskStatusUpdateEvent | TaskArtifactUpdateEvent> {
    return [...this.events]
  }

  subscribe(
    listener: (event: Task | Message | TaskStatusUpdateEvent | TaskArtifactUpdateEvent) => void
  ): void {
    this.listeners.push(listener)
  }

  unsubscribe(
    listener: (event: Task | Message | TaskStatusUpdateEvent | TaskArtifactUpdateEvent) => void
  ): void {
    this.listeners = this.listeners.filter(l => l !== listener)
  }
}

/**
 * 7zi Agent Executor - Main agent implementation
 * Handles chat, analysis, and task execution
 */
export class SevenZiExecutor implements AgentExecutor {
  private cancelledTasks = new Set<string>()

  async execute(context: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
    const { taskId, contextId, userMessage, task } = context

    // Create initial task if needed
    if (!task) {
      const initialTask: Task = {
        kind: 'task',
        id: taskId,
        contextId,
        status: {
          state: 'submitted',
          timestamp: new Date().toISOString(),
        },
        history: [userMessage],
        artifacts: [],
      }
      eventBus.publish(initialTask)
    }

    // Check for cancellation before starting work
    if (this.cancelledTasks.has(taskId)) {
      await this.publishCanceledStatus(taskId, contextId, eventBus)
      return
    }

    // Update to working state
    eventBus.publish({
      kind: 'status-update',
      taskId,
      contextId,
      status: {
        state: 'working',
        timestamp: new Date().toISOString(),
        message: 'Processing request...',
      },
      final: false,
    })

    try {
      // Extract user message content
      const userText = this.extractTextFromMessage(userMessage)

      // Process based on message content
      const response = await this.processMessage(userText, context)

      // Check for cancellation during processing
      if (this.cancelledTasks.has(taskId)) {
        await this.publishCanceledStatus(taskId, contextId, eventBus)
        return
      }

      // Create response artifact
      const artifact: Artifact = {
        artifactId: uuidv4(),
        name: 'response',
        parts: [{ kind: 'text', text: response }],
      }

      eventBus.publish({
        kind: 'artifact-update',
        taskId,
        contextId,
        artifact,
      })

      // Mark task as completed
      eventBus.publish({
        kind: 'status-update',
        taskId,
        contextId,
        status: {
          state: 'completed',
          timestamp: new Date().toISOString(),
        },
        final: true,
      })
    } catch (error) {
      // Handle errors
      eventBus.publish({
        kind: 'status-update',
        taskId,
        contextId,
        status: {
          state: 'failed',
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
        final: true,
      })
    }

    eventBus.finished()
  }

  async cancelTask(_taskId: string, _eventBus: ExecutionEventBus): Promise<void> {
    this.cancelledTasks.add(_taskId)
  }

  private async publishCanceledStatus(
    taskId: string,
    contextId: string,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    eventBus.publish({
      kind: 'status-update',
      taskId,
      contextId,
      status: {
        state: 'canceled',
        timestamp: new Date().toISOString(),
        message: 'Task was canceled by user',
      },
      final: true,
    })
    eventBus.finished()
    this.cancelledTasks.delete(taskId)
  }

  private extractTextFromMessage(message: Message): string {
    const textParts = message.parts.filter(p => p.kind === 'text' && p.text)
    return textParts.map(p => p.text || '').join('\n')
  }

  private async processMessage(text: string, context: RequestContext): Promise<string> {
    const lowerText = text.toLowerCase()

    // Simple intent detection
    if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey')) {
      return `Hello! I'm 7zi, your AI assistant. How can I help you today?`
    }

    if (lowerText.includes('help') || lowerText.includes('what can you do')) {
      return `I'm 7zi, an A2A-compliant AI agent. I can help you with:

• Chat and answer questions
• Process and analyze information
• Create and manage tasks
• Provide assistance on various topics

Just send me a message and I'll do my best to help!`
    }

    if (lowerText.includes('status') || lowerText.includes('health')) {
      return `System Status: ✅ All systems operational
• Task ID: ${context.taskId}
• Context: ${context.contextId}
• Timestamp: ${new Date().toISOString()}`
    }

    // Default response
    return `Thank you for your message! I received: "${text}"

I'm currently running as an A2A-compliant agent. This is a demonstration of the Agent2Agent protocol capabilities. In a full implementation, I would process your request using advanced AI capabilities.

Task ID: ${context.taskId}`
  }
}

/**
 * Factory function to create the default 7zi executor
 */
export function createSevenZiExecutor(): AgentExecutor {
  return new SevenZiExecutor()
}
