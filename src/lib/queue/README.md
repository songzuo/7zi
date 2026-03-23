# Bull Queue System

This directory contains the Bull message queue implementation for the 7zi project.

## Overview

The queue system provides asynchronous task processing with the following features:

- **Redis-backed job queues** using Bull
- **Multiple queue types** with different configurations
- **Automatic retries** with exponential backoff
- **Job monitoring** and logging
- **Rate limiting** to prevent overwhelming services

## Architecture

```
src/lib/queue/
├── queue-manager.ts       # Main queue manager class
├── processors/
│   ├── email-processor.ts      # Email job processors
│   ├── notification-processor.ts  # Notification job processors
│   └── analytics-processor.ts     # Analytics event processors
└── examples/
    └── email-queue-example.ts  # Usage examples
```

## Queues

### Email Queue (`QueueName.EMAIL`)

- **Retries:** 3 with exponential backoff (2000ms)
- **Rate Limit:** 10 jobs per minute
- **Use Cases:**
  - Transactional emails (welcome, password reset, verification)
  - Marketing emails
  - System notifications

### Notification Queue (`QueueName.NOTIFICATION`)

- **Retries:** 3 with exponential backoff (1000ms)
- **Rate Limit:** 50 jobs per minute
- **Use Cases:**
  - In-app notifications
  - Push notifications
  - SMS notifications
  - Email notifications

### Analytics Queue (`QueueName.ANALYTICS`)

- **Retries:** 2 with exponential backoff (5000ms)
- **Rate Limit:** 100 jobs per minute
- **Use Cases:**
  - Page view tracking
  - User action tracking
  - Conversion events
  - Performance metrics
  - Error tracking

## Installation

Dependencies are already installed:
```bash
npm install bull @types/bull
```

## Configuration

Configure Redis connection using environment variables:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
```

## Usage

### 1. Initialize Queue Manager

```typescript
import { queueManager } from '@/lib/queue/queue-manager';

// Initialize all queues
await queueManager.initialize();
```

### 2. Start Processors

```typescript
import { queueManager } from '@/lib/queue/queue-manager';
import { emailProcessor } from '@/lib/queue/processors/email-processor';

// Start email processor with concurrency 5
await queueManager.processQueue(QueueName.EMAIL, emailProcessor, 5);
```

### 3. Add Jobs

#### Email Example

```typescript
import { queueManager, QueueName } from '@/lib/queue/queue-manager';
import { createEmailJob } from '@/lib/queue/processors/email-processor';

const emailJob = createEmailJob({
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Welcome to 7zi!</h1>',
});

const job = await queueManager.addJob(QueueName.EMAIL, emailJob);
```

#### Notification Example

```typescript
import { queueManager, QueueName } from '@/lib/queue/queue-manager';
import { createNotificationJob } from '@/lib/queue/processors/notification-processor';

const notificationJob = createNotificationJob({
  userId: 'user123',
  type: 'success',
  title: 'Task Completed',
  message: 'Your task has been completed successfully.',
  channels: ['email', 'push'],
});

const job = await queueManager.addJob(QueueName.NOTIFICATION, notificationJob);
```

#### Analytics Example

```typescript
import { queueManager, QueueName } from '@/lib/queue/queue-manager';
import { createPageViewEvent } from '@/lib/queue/processors/analytics-processor';

const analyticsEvent = createPageViewEvent(
  'user123',
  '/dashboard',
  'https://google.com'
);

const job = await queueManager.addJob(QueueName.ANALYTICS, analyticsEvent);
```

### 4. Monitor Queues

```typescript
// Get queue statistics
const stats = await queueManager.getQueueStats(QueueName.EMAIL);

console.log(stats);
// {
//   waiting: 10,
//   active: 2,
//   completed: 1000,
//   failed: 5,
//   delayed: 0,
//   paused: 0
// }
```

### 5. Check Job Status

```typescript
const queue = queueManager.getQueue(QueueName.EMAIL);
const job = await queue.getJob(jobId);
const state = await job.getState(); // 'waiting', 'active', 'completed', 'failed', etc.
```

## Job Options

When adding jobs, you can specify custom options:

```typescript
await queueManager.addJob(QueueName.EMAIL, data, {
  priority: 10,           // Higher priority jobs are processed first
  delay: 5000,            // Delay job execution by 5 seconds
  attempts: 5,            // Override default retry count
  backoff: {              // Custom backoff strategy
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: 10,   // Keep only 10 completed jobs
  removeOnFail: 50,       // Keep only 50 failed jobs
});
```

## Advanced Features

### Batch Processing

Process multiple items in a single job:

```typescript
const batchData = {
  emails: [
    { to: 'user1@example.com', subject: 'Batch Email 1' },
    { to: 'user2@example.com', subject: 'Batch Email 2' },
    { to: 'user3@example.com', subject: 'Batch Email 3' },
  ],
};

await queueManager.addJob(QueueName.EMAIL, batchData);
```

### Scheduled Jobs

Schedule jobs for future execution:

```typescript
const scheduledDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

await queueManager.addJob(QueueName.NOTIFICATION, data, {
  delay: scheduledDate.getTime() - Date.now(),
});
```

### Priority Jobs

Prioritize important jobs:

```typescript
// High priority
await queueManager.addJob(QueueName.EMAIL, urgentEmail, { priority: 10 });

// Low priority
await queueManager.addJob(QueueName.EMAIL, newsletter, { priority: 1 });
```

## Monitoring and Logging

The queue system automatically logs:

- Job creation
- Job status changes (waiting, active, completed, failed)
- Retry attempts
- Queue errors
- Job progress

All logs are sent through the application logger.

## Queue Management

### Pause a Queue

```typescript
await queueManager.pauseQueue(QueueName.EMAIL);
```

### Resume a Queue

```typescript
await queueManager.resumeQueue(QueueName.EMAIL);
```

### Close All Queues

```typescript
await queueManager.close();
```

## Testing

See `src/lib/queue/examples/email-queue-example.ts` for complete usage examples.

## Production Considerations

1. **Redis Configuration**: Use a Redis cluster for high availability
2. **Persistence**: Enable Redis persistence (AOF or RDB)
3. **Monitoring**: Set up Redis monitoring (RedisInsight, etc.)
4. **Scaling**: Run multiple worker processes for high-throughput queues
5. **Security**: Use Redis passwords and TLS encryption
6. **Backups**: Regular Redis backups for disaster recovery

## Error Handling

Jobs that fail are automatically retried based on the queue configuration. After all retries are exhausted, the job is marked as failed and logged.

Failed jobs can be manually retried:

```typescript
const queue = queueManager.getQueue(QueueName.EMAIL);
const job = await queue.getJob(jobId);
await job.retry();
```

## Performance Tips

1. **Batch similar operations**: Use batch processors to reduce overhead
2. **Rate limiting**: Configure appropriate rate limits for each queue
3. **Concurrency**: Adjust processor concurrency based on task complexity
4. **Job size**: Keep job data small (< 1MB) to avoid memory issues
5. **Cleanup**: Configure job removal policies to prevent queue bloat

## Troubleshooting

### Jobs are not processing

1. Check if Redis is running: `redis-cli ping`
2. Verify Redis connection configuration
3. Ensure processors are started: `queueManager.processQueue()`
4. Check queue is not paused: `await queueManager.getQueueStats()`

### High memory usage

1. Reduce job retention: `removeOnComplete`, `removeOnFail`
2. Clean up old jobs regularly
3. Use job batching to reduce total job count

### Slow job processing

1. Check processor code for blocking operations
2. Increase concurrency: `queueManager.processQueue(queue, processor, 10)`
3. Add more worker processes
4. Profile processor performance

## API Reference

See inline TypeScript documentation for detailed API reference.

## Contributing

When adding new queues:

1. Add queue configuration to `queueConfigs` in `queue-manager.ts`
2. Create processor in `src/lib/queue/processors/`
3. Add TypeScript types for job data
4. Create usage examples
5. Update this README

## License

Part of the 7zi project.
