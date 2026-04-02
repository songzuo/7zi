# A2A Multi-Agent Protocol v2 - Implementation Summary

## Overview

This document summarizes the improvements made to the A2A (Agent-to-Agent) multi-agent communication protocol for the 7zi-project. The implementation adds enterprise-grade features including message queuing, agent registry, and priority-based task management.

## Table of Contents

1. [New Features](#new-features)
2. [Architecture](#architecture)
3. [API Endpoints](#api-endpoints)
4. [Type Definitions](#type-definitions)
5. [Usage Examples](#usage-examples)
6. [Testing](#testing)

## New Features

### 1. Message Queue System

**File:** `src/lib/a2a/message-queue.ts`

Features:

- **Priority-based queuing**: Messages are queued with 4 priority levels (low, normal, high, critical)
- **Retry mechanism**: Automatic retry with configurable attempts and delay
- **Queue size limit**: Configurable maximum queue size to prevent memory overflow
- **Event system**: Subscribe to queue events (enqueued, dequeued, retry, failed, completed)
- **Statistics**: Get detailed queue statistics by priority and agent
- **Persistence option**: File-based queue for persistence (with auto-flush)

**Key Classes:**

- `PriorityMessageQueue`: In-memory priority queue implementation
- `FileMessageQueue`: File-based persistent queue (with auto-flush every 30 seconds)

**API Methods:**

```typescript
queue.enqueue(message) // Add message to queue
queue.dequeue() // Remove highest priority message
queue.peek() // Look at next message without removing
queue.remove(messageId) // Remove specific message
queue.size() // Get total queue size
queue.getMessagesByAgent(id) // Get messages for specific agent
queue.getMessagesByPriority(p) // Get messages by priority
queue.retry(messageId) // Retry a failed message
queue.getStats() // Get queue statistics
queue.subscribe(listener) // Subscribe to queue events
```

### 2. Agent Registry

**File:** `src/lib/a2a/agent-registry.ts`

Features:

- **Agent registration**: Register and manage available agents
- **Capability matching**: Find agents by capabilities (e.g., "streaming", "chat")
- **Skill matching**: Find agents by skills (e.g., "conversation", "analysis")
- **Load balancing**: Automatic selection of best agent based on load
- **Heartbeat monitoring**: Track agent availability with auto-cleanup
- **Status management**: Track agent status (online, offline, busy)

**Key Classes:**

- `InMemoryAgentRegistry`: In-memory agent registry with auto-cleanup
- `FileAgentRegistry`: File-based persistent registry (with auto-flush every 30 seconds)

**API Methods:**

```typescript
registry.register(agent) // Register a new agent
registry.unregister(agentId) // Unregister an agent
registry.get(agentId) // Get agent by ID
registry.getAll() // Get all agents
registry.getByCapability(cap) // Get agents with specific capability
registry.getBySkill(skill) // Get agents with specific skill
registry.getAvailable() // Get available (online) agents
registry.updateStatus(agentId, status) // Update agent status
registry.updateHeartbeat(agentId) // Update agent heartbeat
registry.cleanupInactive(timeoutMs) // Remove inactive agents
registry.findBestAgent(options) // Find best agent for task
registry.getStats() // Get registry statistics
```

### 3. Enhanced Task Store

**File:** `src/lib/a2a/task-store.ts` (Enhanced)

New Features:

- **Task priorities**: Assign priority levels to tasks
- **Async task status tracking**: Track progress and current step
- **Priority-based task listing**: Get tasks by priority
- **Highest priority tasks**: Get top N priority tasks for processing
- **Task completion tracking**: Mark tasks as completed with timestamps

**New Methods:**

```typescript
store.createTaskWithPriority(context, message, priority) // Create task with priority
store.updateTaskPriority(taskId, priority) // Update task priority
store.getTasksByPriority(priority) // Get tasks by priority
store.getHighestPriorityTasks(limit) // Get top N priority tasks
store.markTaskCompleted(taskId) // Mark task as completed
store.getAsyncTaskStatus(taskId) // Get async task progress
store.updateAsyncTaskProgress(taskId, progress, step) // Update task progress
```

### 4. Enhanced Type Definitions

**File:** `src/lib/a2a/types.ts` (Extended)

New Types:

```typescript
// Task priority levels
type TaskPriority = 'low' | 'normal' | 'high' | 'critical'

// Message queue types
interface QueueMessage {
  id: string
  taskId: string
  agentId: string
  priority: TaskPriority
  payload: Record<string, unknown>
  createdAt: string
  attempts: number
  maxAttempts: number
  nextRetryAt?: string
}

interface MessageQueue {
  enqueue(message: QueueMessage): void
  dequeue(): QueueMessage | null
  peek(): QueueMessage | null
  remove(messageId: string): boolean
  size(): number
  getMessagesByAgent(agentId: string): QueueMessage[]
  getMessagesByPriority(priority: TaskPriority): QueueMessage[]
  retry(messageId: string): boolean
}

// Agent registry types
interface AgentRegistration {
  id: string
  name: string
  url: string
  capabilities: string[]
  skills: string[]
  status: 'online' | 'offline' | 'busy'
  lastHeartbeat: string
  load?: number
  metadata?: Record<string, unknown>
}

// Enhanced task with priority
interface TaskWithPriority extends Task {
  priority: TaskPriority
  createdAt: string
  scheduledAt?: string
  completedAt?: string
  retryCount?: number
}

// Queue events
interface QueueEvent {
  type: 'enqueued' | 'dequeued' | 'retry' | 'failed' | 'completed'
  message: QueueMessage
  timestamp: string
  error?: string
}
```

## API Endpoints

### Agent Registry API

#### List Agents

```
GET /api/a2a/registry
Query Params:
  - capability: Filter by capability
  - skill: Filter by skill
  - status: Filter by status (online/offline/busy)
  - available: true to get only available agents

Response:
{
  "agents": [AgentRegistration],
  "count": number
}
```

#### Register Agent

```
POST /api/a2a/registry
Body:
{
  "name": string,
  "url": string,
  "capabilities": string[],
  "skills": string[],
  "status": "online" | "offline" | "busy",
  "load": number,
  "metadata": Record<string, unknown>
}

Response:
{
  "message": "Agent registered successfully",
  "agent": AgentRegistration
}
```

#### Get Specific Agent

```
GET /api/a2a/registry/:id

Response: AgentRegistration
```

#### Update Agent

```
PUT /api/a2a/registry/:id
Body: AgentRegistration (partial update)

Response:
{
  "message": "Agent updated successfully",
  "agent": AgentRegistration
}
```

#### Delete Agent

```
DELETE /api/a2a/registry/:id

Response:
{
  "message": "Agent unregistered successfully",
  "id": string
}
```

#### Agent Heartbeat

```
POST /api/a2a/registry/:id/heartbeat
Body:
{
  "status": string,
  "load": number
}

Response:
{
  "message": "Heartbeat updated successfully",
  "agent": AgentRegistration,
  "timestamp": string
}
```

### Message Queue API

#### Get Queue Status

```
GET /api/a2a/queue

Response:
{
  "status": "ok",
  "stats": {
    "total": number,
    "byPriority": { "low": 0, "normal": 5, "high": 2, "critical": 1 },
    "byAgent": { "agent-1": 3, "agent-2": 5 }
  },
  "nextMessage": QueueMessage,
  "config": QueueConfig
}
```

#### Enqueue Message

```
POST /api/a2a/queue
Body:
{
  "taskId": string,
  "agentId": string,
  "priority": "low" | "normal" | "high" | "critical",
  "payload": Record<string, unknown>,
  "maxAttempts": number
}

Response:
{
  "message": "Message enqueued successfully",
  "queueSize": number,
  "message": QueueMessage
}
```

#### Clear Queue

```
DELETE /api/a2a/queue
Query Params:
  - agentId: Remove all messages for specific agent
  - priority: Remove all messages with specific priority
  (If no params, clear entire queue)

Response:
{
  "message": "Queue cleared successfully",
  "removed": number,
  "queueSize": number
}
```

## Usage Examples

### Registering an Agent

```typescript
import { getAgentRegistry } from '@/lib/a2a/agent-registry'

const registry = getAgentRegistry()

registry.register({
  id: 'agent-1',
  name: 'Chat Agent',
  url: 'http://localhost:3001',
  capabilities: ['chat', 'streaming'],
  skills: ['conversation', 'question-answering'],
  status: 'online',
  load: 0.2,
})

// Find best agent for a task
const bestAgent = registry.findBestAgent({
  capabilities: ['chat', 'streaming'],
  maxLoad: 0.5,
})
```

### Enqueuing a Task

```typescript
import { getMessageQueue } from '@/lib/a2a/message-queue'
import { QueueMessage } from '@/lib/a2a/types'

const queue = getMessageQueue()

queue.enqueue({
  id: 'msg-1',
  taskId: 'task-123',
  agentId: 'agent-1',
  priority: 'high',
  payload: {
    message: 'Process this urgent request',
  },
  createdAt: new Date().toISOString(),
  attempts: 0,
  maxAttempts: 3,
})

// Subscribe to queue events
queue.subscribe(event => {
  console.log(`Queue event: ${event.type}`, event)
})
```

### Creating Priority Tasks

```typescript
import { getTaskStore } from '@/lib/a2a/task-store'

const store = getTaskStore()

// Create a high-priority task
const task = store.createTaskWithPriority('context-1', message, 'critical')

// Get highest priority tasks for processing
const priorityTasks = store.getHighestPriorityTasks(10)
```

### Updating Task Progress

```typescript
import { getTaskStore } from '@/lib/a2a/task-store'

const store = getTaskStore()

// Update task progress
store.updateAsyncTaskProgress('task-123', 50, 'Processing data')

// Mark task as completed
store.markTaskCompleted('task-123')

// Get async task status
const status = store.getAsyncTaskStatus('task-123')
console.log(status)
// {
//   state: 'completed',
//   progress: 100,
//   currentStep: 'Processing data'
// }
```

## Testing

### Test Files

1. **Message Queue Tests**
   - File: `src/lib/a2a/__tests__/message-queue.test.ts`
   - Tests: 11 tests
   - Coverage: Priority queuing, retry mechanism, statistics, events

2. **Agent Registry Tests**
   - File: `src/lib/a2a/__tests__/agent-registry.test.ts`
   - Tests: 19 tests
   - Coverage: Registration, filtering, heartbeat, cleanup, best agent selection

### Running Tests

```bash
# Run message queue tests
npm test -- src/lib/a2a/__tests__/message-queue.test.ts

# Run agent registry tests
npm test -- src/lib/a2a/__tests__/agent-registry.test.ts

# Run all A2A tests
npm test -- src/lib/a2a/__tests__/
```

### Test Results

All tests passing:

- ✓ 11/11 Message Queue tests
- ✓ 19/19 Agent Registry tests

## Configuration

### Message Queue Configuration

```typescript
import { getMessageQueue } from '@/lib/a2a/message-queue'

const queue = getMessageQueue({
  maxRetries: 3,
  retryDelayMs: 5000,
  maxQueueSize: 1000,
})

// Update configuration at runtime
queue.updateConfig({
  maxQueueSize: 2000,
})
```

### Agent Registry Configuration

```typescript
import { getAgentRegistry } from '@/lib/a2a/agent-registry'

const registry = getAgentRegistry()

// Auto-cleanup runs every 60 seconds (default)
// Agents inactive for 5 minutes are automatically removed

// Manually trigger cleanup
registry.cleanupInactive(300000) // 5 minutes
```

## Performance Considerations

1. **Memory Queue**: Fast, but data is lost on restart
2. **File Queue**: Persistent, but slower due to disk I/O
3. **Auto-flush**: File queues auto-flush every 5-30 seconds
4. **Cleanup**: Inactive agents are automatically removed after timeout
5. **Queue Size Limit**: Prevents memory overflow (configurable)

## Security Considerations

1. **Agent Registration**: Should be authenticated in production
2. **Queue Access**: Should be restricted to authorized services
3. **Heartbeat Spoofing**: Implement authentication for heartbeat updates
4. **Priority Abuse**: Limit priority levels to authorized agents

## Future Enhancements

1. **Distributed Queue**: Support for Redis or other distributed queues
2. **Message Persistence**: Database-backed queue for durability
3. **Rate Limiting**: Per-agent rate limiting for fair resource usage
4. **Dead Letter Queue**: Store failed messages for manual inspection
5. **Metrics & Monitoring**: Prometheus metrics for queue and registry
6. **Webhooks**: Notify agents when messages are enqueued
7. **Priority Escalation**: Automatically increase priority for old messages

## Conclusion

The A2A protocol v2 implementation provides a robust, production-ready foundation for multi-agent communication with:

- Priority-based message queuing
- Dynamic agent registry with load balancing
- Enhanced task management with progress tracking
- Comprehensive testing (30 tests passing)
- Extensible architecture for future enhancements

All implementations are fully typed, well-documented, and tested.
