# Webhook Event Notification System

v1.12.0 - A comprehensive webhook system for event notifications with HMAC-SHA256 signature verification, retry mechanism, and async event delivery.

## Features

- ✅ **Webhook Management** - Create, update, delete, and query webhook endpoints
- ✅ **Signature Verification** - HMAC-SHA256 signature for security
- ✅ **Retry Mechanism** - Exponential backoff with up to 5 retries
- ✅ **Async Delivery** - Non-blocking event delivery with queue management
- ✅ **Event Filtering** - Filter events by type, category, or custom conditions
- ✅ **IP Whitelist** - Optional IP whitelist for webhook endpoints
- ✅ **Statistics** - Track event delivery statistics

## Installation

```typescript
import {
  createWebhookSystem,
  WebhookManager,
  EventDeliveryService,
  EventDispatcher,
} from './lib/webhook'
```

## Quick Start

```typescript
// Create webhook system with default configuration
const { webhookManager, deliveryService, dispatcher } = createWebhookSystem()

// Create a webhook endpoint
const webhook = await webhookManager.createWebhook({
  url: 'https://example.com/webhook',
  secret: 'your-secret-key',
  events: ['agent.created', 'task.completed', 'workflow.started'],
  description: 'Production webhook',
  ipWhitelist: ['192.168.1.0/24'],
})

// Emit an event
await dispatcher.emitAgentEvent('agent.created', {
  agentId: 'agent-123',
  name: 'My Agent',
  status: 'active',
})
```

## API Reference

### WebhookManager

Manages webhook endpoints.

#### Create Webhook

```typescript
const webhook = await webhookManager.createWebhook({
  url: 'https://example.com/webhook',
  secret: 'your-secret-key',
  events: ['agent.created', 'task.completed'],
  description: 'Optional description',
  ipWhitelist: ['192.168.1.1', '10.0.0.0/24'],
  headers: { 'X-Custom-Header': 'value' },
  metadata: { owner: 'team-a' },
})
```

#### Update Webhook

```typescript
const updated = await webhookManager.updateWebhook(webhook.id, {
  url: 'https://new-url.com/webhook',
  events: ['agent.created', 'agent.updated'],
  enabled: true,
})
```

#### Delete Webhook

```typescript
await webhookManager.deleteWebhook(webhook.id)
```

#### Query Webhooks

```typescript
// Get by ID
const webhook = await webhookManager.getWebhook('wh_abc123')

// Get all webhooks
const all = await webhookManager.getAllWebhooks()

// Get only enabled webhooks
const enabled = await webhookManager.getEnabledWebhooks()

// Get webhooks for specific event
const forEvent = await webhookManager.getWebhooksForEvent('agent.created')
```

### EventDispatcher

Emits and dispatches events to webhooks.

#### Emit Events

```typescript
// Generic emit
const eventId = await dispatcher.emit(
  'agent.created',
  {
    agentId: 'agent-123',
    name: 'My Agent',
  },
  { source: 'api' }
)

// Agent events
await dispatcher.emitAgentEvent('agent.created', {
  agentId: 'agent-123',
  name: 'My Agent',
  status: 'active',
})

// Task events
await dispatcher.emitTaskEvent('task.completed', {
  taskId: 'task-456',
  status: 'done',
  progress: 100,
})

// Workflow events
await dispatcher.emitWorkflowEvent('workflow.started', {
  workflowId: 'wf-789',
  status: 'running',
  steps: 5,
})

// System events
await dispatcher.emitSystemEvent('system.alert', {
  level: 'warning',
  message: 'High memory usage',
  component: 'monitor',
})
```

#### Batch Emit

```typescript
const eventIds = await dispatcher.emitBatch([
  { type: 'agent.created', data: { agentId: '1' } },
  { type: 'task.created', data: { taskId: '1' } },
  { type: 'workflow.started', data: { workflowId: '1' } },
])
```

#### Statistics

```typescript
const stats = dispatcher.getStatistics()
console.log(stats)
// {
//   totalEvents: 100,
//   successfulDeliveries: 95,
//   failedDeliveries: 5,
//   pendingDeliveries: 0,
//   averageResponseTime: 234,
//   eventsByType: { 'agent.created': 30, 'task.completed': 70 }
// }
```

### Signature Verification

Verify incoming webhook requests.

```typescript
import { verifySignatureFromHeaders, normalizeHeaders } from './lib/webhook'

// Verify signature
const headers = normalizeHeaders(request.headers)
const result = verifySignatureFromHeaders(headers, request.body, webhook.secret)

if (!result.valid) {
  console.error('Invalid signature:', result.error)
  return { status: 401, body: 'Invalid signature' }
}

// Process webhook
console.log('Webhook verified:', request.body)
```

## Event Types

### Agent Events

- `agent.created` - New agent created
- `agent.updated` - Agent updated
- `agent.deleted` - Agent deleted

### Task Events

- `task.created` - New task created
- `task.completed` - Task completed successfully
- `task.failed` - Task failed

### Workflow Events

- `workflow.started` - Workflow started
- `workflow.completed` - Workflow completed
- `workflow.failed` - Workflow failed

### System Events

- `system.alert` - System alert
- `system.error` - System error

## Configuration

### Webhook Configuration

```typescript
const { webhookManager, deliveryService, dispatcher } = createWebhookSystem({
  webhookConfig: {
    maxRetries: 5, // Maximum retry attempts
    initialRetryDelay: 1000, // Initial retry delay (ms)
    maxRetryDelay: 60000, // Maximum retry delay (ms)
    retryMultiplier: 2, // Exponential backoff multiplier
    requestTimeout: 10000, // Request timeout (ms)
    maxConcurrentDeliveries: 10, // Max concurrent deliveries
    enableEventQueue: true, // Enable event queue
    queueMaxSize: 10000, // Max queue size
  },
  dispatcherConfig: {
    enableQueue: true,
    maxQueueSize: 10000,
    batchSize: 100,
  },
})
```

## Event Filtering

Filter events by type, category, or custom conditions.

```typescript
const filter: EventFilter = {
  eventTypes: ['agent.created', 'agent.updated'],
  eventCategories: ['agent'],
  conditions: [
    { field: 'data.status', operator: 'eq', value: 'active' },
    { field: 'data.capabilities', operator: 'exists', value: true },
  ],
}

const matches = dispatcher.matchesFilter(event, filter)
```

## Security

### Signature Verification

All webhook requests include HMAC-SHA256 signature:

```
X-Webhook-Signature: sha256=abc123...
X-Webhook-Timestamp: 1234567890
X-Webhook-Nonce: xyz789
```

### IP Whitelist

Restrict webhook endpoints to specific IPs:

```typescript
const webhook = await webhookManager.createWebhook({
  url: 'https://example.com/webhook',
  secret: 'secret',
  events: ['agent.created'],
  ipWhitelist: ['192.168.1.0/24', '10.0.0.1'],
})
```

## Testing

```bash
# Run all tests
npm test -- src/lib/webhook

# Run specific test file
npm test -- src/lib/webhook/signature.test.ts
```

## Examples

### Example 1: Basic Webhook Setup

```typescript
import { createWebhookSystem } from './lib/webhook'

const { webhookManager, dispatcher } = createWebhookSystem()

// Create webhook
const webhook = await webhookManager.createWebhook({
  url: 'https://api.example.com/webhooks',
  secret: 'my-secret-key',
  events: ['agent.created', 'task.completed'],
})

// Emit event
await dispatcher.emitAgentEvent('agent.created', {
  agentId: 'agent-123',
  name: 'Production Agent',
})
```

### Example 2: Custom Storage

```typescript
import { WebhookManager, InMemoryWebhookStorage } from './lib/webhook'

// Use custom storage
const storage = new InMemoryWebhookStorage()
const webhookManager = new WebhookManager(storage)
```

### Example 3: Verify Incoming Webhook

```typescript
import { verifySignatureFromHeaders, normalizeHeaders } from './lib/webhook'

app.post('/webhook', async (req, res) => {
  const headers = normalizeHeaders(req.headers)
  const webhook = await getWebhookByUrl(req.url)

  const result = verifySignatureFromHeaders(headers, req.body, webhook.secret)

  if (!result.valid) {
    return res.status(401).json({ error: result.error })
  }

  // Process webhook
  await processWebhookEvent(req.body)
  res.status(200).json({ received: true })
})
```

## Error Handling

```typescript
import { WebhookError } from './lib/webhook'

try {
  const webhook = await webhookManager.createWebhook({
    url: 'invalid-url',
    secret: 'short',
    events: [],
  })
} catch (error) {
  if (error instanceof WebhookError) {
    console.error('Webhook error:', error.type, error.message)
    // Handle specific error types
    switch (error.type) {
      case 'invalid_url':
        // Handle invalid URL
        break
      case 'invalid_secret':
        // Handle invalid secret
        break
      case 'invalid_events':
        // Handle invalid events
        break
    }
  }
}
```

## License

MIT
