/**
 * Agent Scheduler Core
 * 
 * Core scheduling logic for the A2A system.
 * Handles task queue management, agent registration, and task assignment.
 */

import type {
  Agent,
  AgentStatus,
  Task,
  TaskStatus,
  TaskPriority,
  QueueStats,
  ScheduleTaskRequest,
  ScheduleTaskResponse,
  UpdateTaskRequest,
} from './types';

class AgentScheduler {
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, Task> = new Map();
  private taskQueue: Task[] = [];

  // ===== Agent Registry =====

  registerAgent(
    id: string,
    name: string,
    type: string,
    capabilities: string[],
    metadata?: Record<string, unknown>
  ): Agent {
    const now = Date.now();
    const agent: Agent = {
      id,
      name,
      type,
      status: 'idle',
      capabilities,
      metadata,
      createdAt: now,
      updatedAt: now,
      lastHeartbeat: now,
    };

    this.agents.set(id, agent);
    this.scheduleNextTask();
    return agent;
  }

  unregisterAgent(id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;

    // Mark as offline first
    agent.status = 'offline';
    agent.updatedAt = Date.now();

    // Cancel any running tasks for this agent
    this.tasks.forEach((task) => {
      if (task.agentId === id && task.status === 'running') {
        task.status = 'failed';
        task.error = 'Agent disconnected';
        task.updatedAt = Date.now();
        task.completedAt = Date.now();
      }
    });

    this.agents.delete(id);
    return true;
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAgentsByCapability(capability: string): Agent[] {
    return this.getAllAgents().filter((agent) =>
      agent.capabilities.includes(capability)
    );
  }

  updateAgentStatus(id: string, status: AgentStatus): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;

    agent.status = status;
    agent.updatedAt = Date.now();
    agent.lastHeartbeat = Date.now();

    if (status === 'idle') {
      this.scheduleNextTask();
    }

    return true;
  }

  heartbeat(id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;

    agent.lastHeartbeat = Date.now();
    return true;
  }

  // ===== Task Scheduling =====

  scheduleTask(request: ScheduleTaskRequest): ScheduleTaskResponse {
    const taskId = this.generateId('task');
    const now = Date.now();

    const task: Task = {
      id: taskId,
      agentId: request.agentId,
      type: request.type,
      priority: request.priority || 'normal',
      status: 'pending',
      input: request.input,
      metadata: request.metadata,
      createdAt: now,
      updatedAt: now,
      retries: 0,
      maxRetries: request.maxRetries ?? 3,
    };

    // If specific agent requested, assign immediately if available
    if (request.agentId) {
      const agent = this.agents.get(request.agentId);
      if (!agent) {
        return { success: false, error: 'Agent not found' };
      }
      if (agent.status !== 'idle') {
        // Queue for specific agent
        this.tasks.set(taskId, task);
        this.addToQueue(task);
        return { success: true, taskId };
      }

      // Assign to agent
      this.assignTaskToAgent(task, agent);
    } else {
      // Find best agent based on capabilities
      const agent = this.findBestAgent(task);
      if (!agent) {
        // Queue for later
        this.tasks.set(taskId, task);
        this.addToQueue(task);
        return { success: true, taskId };
      }

      // Assign to agent
      this.assignTaskToAgent(task, agent);
    }

    this.tasks.set(taskId, task);
    return { success: true, taskId };
  }

  private assignTaskToAgent(task: Task, agent: Agent): void {
    task.agentId = agent.id;
    task.status = 'running';
    task.startedAt = Date.now();
    task.updatedAt = Date.now();

    agent.status = 'busy';
    agent.updatedAt = Date.now();
  }

  private findBestAgent(task: Task): Agent | null {
    const capableAgents = this.getAllAgents().filter(
      (agent) =>
        agent.status === 'idle' && agent.capabilities.includes(task.type)
    );

    if (capableAgents.length === 0) return null;

    // Simple round-robin selection
    // In production, you might use more sophisticated algorithms
    return capableAgents[0];
  }

  private scheduleNextTask(): void {
    if (this.taskQueue.length === 0) return;

    const task = this.taskQueue.shift();
    if (!task) return;

    // Refresh task from map to get latest state
    const latestTask = this.tasks.get(task.id);
    if (!latestTask) return;
    if (latestTask.status !== 'pending') return;

    const agent = this.findBestAgent(latestTask);
    if (agent) {
      this.assignTaskToAgent(latestTask, agent);
      this.tasks.set(latestTask.id, latestTask);
    } else {
      // Put back in queue
      this.addToQueue(latestTask);
    }
  }

  private addToQueue(task: Task): void {
    // Insert based on priority
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const index = this.taskQueue.findIndex(
      (t) => priorityOrder[t.priority] > priorityOrder[task.priority]
    );

    if (index === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(index, 0, task);
    }
  }

  // ===== Task Management =====

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  updateTask(request: UpdateTaskRequest): boolean {
    const task = this.tasks.get(request.taskId);
    if (!task) return false;

    if (request.status) {
      task.status = request.status;
      task.updatedAt = Date.now();

      if (request.status === 'completed' || request.status === 'failed') {
        task.completedAt = Date.now();
      }

      // If task completed or failed, free up the agent
      if ((request.status === 'completed' || request.status === 'failed') && task.agentId) {
        const agent = this.agents.get(task.agentId);
        if (agent && agent.status === 'busy') {
          agent.status = 'idle';
          agent.updatedAt = Date.now();
          this.scheduleNextTask();
        }
      }

      // If failed and retries remain, reschedule
      if (request.status === 'failed' && task.retries < task.maxRetries) {
        task.retries++;
        task.status = 'pending';
        task.updatedAt = Date.now();
        task.agentId = undefined;
        this.addToQueue(task);
        this.scheduleNextTask();
      }
    }

    if (request.output) {
      task.output = request.output;
      task.updatedAt = Date.now();
    }

    if (request.error) {
      task.error = request.error;
      task.updatedAt = Date.now();
    }

    this.tasks.set(request.taskId, task);
    return true;
  }

  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    const wasRunning = task.status === 'running';
    task.status = 'cancelled';
    task.updatedAt = Date.now();

    // Remove from queue if pending
    const queueIndex = this.taskQueue.findIndex((t) => t.id === taskId);
    if (queueIndex !== -1) {
      this.taskQueue.splice(queueIndex, 1);
    }

    // Free up agent if was running
    if (task.agentId && wasRunning) {
      const agent = this.agents.get(task.agentId);
      if (agent && agent.status === 'busy') {
        agent.status = 'idle';
        agent.updatedAt = Date.now();
      }
    }

    return true;
  }

  // ===== Statistics =====

  getQueueStats(): QueueStats {
    const tasks = this.getAllTasks();
    return {
      pending: tasks.filter((t) => t.status === 'pending').length,
      running: tasks.filter((t) => t.status === 'running').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      failed: tasks.filter((t) => t.status === 'failed').length,
      total: tasks.length,
    };
  }

  // ===== Cleanup =====

  cleanup(maxAge: number = 3600000): void {
    const now = Date.now();
    const toDelete: string[] = [];

    // Clean up old completed/failed tasks
    this.tasks.forEach((task, id) => {
      if (
        (task.status === 'completed' || task.status === 'failed') &&
        task.completedAt &&
        now - task.completedAt > maxAge
      ) {
        toDelete.push(id);
      }
    });

    toDelete.forEach((id) => this.tasks.delete(id));

    // Clean up offline agents
    const offlineAgents: string[] = [];
    this.agents.forEach((agent, id) => {
      if (
        agent.status === 'offline' &&
        agent.lastHeartbeat &&
        now - agent.lastHeartbeat > maxAge
      ) {
        offlineAgents.push(id);
      }
    });

    offlineAgents.forEach((id) => this.agents.delete(id));
  }

  // ===== Utilities =====

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  clear(): void {
    this.agents.clear();
    this.tasks.clear();
    this.taskQueue = [];
  }
}

// Export singleton instance
export const agentScheduler = new AgentScheduler();
