# TypeScript `any` Type Cleanup - Fix Script

This script fixes high-priority `any` type usages in the 7zi-frontend project.

## Priority 1: Database and Core Types

### 1. feedback-storage.ts

```typescript
// Add DatabaseRow interface
interface DatabaseRow {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  type: string;
  priority: string;
  status: string;
  title: string;
  description: string;
  rating?: number;
  url?: string;
  attachments: string;
  tags: string;
  admin_response?: string;
  admin_id?: string;
  admin_name?: string;
  resolved_at?: number;
  closed_at?: number;
  created_at: number;
  updated_at: number;
}

// Fix rowToFeedback parameter
private rowToFeedback(row: DatabaseRow): Feedback {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    type: row.type as FeedbackType,
    priority: row.priority as FeedbackPriority,
    status: row.status as FeedbackStatus,
    title: row.title,
    description: row.description,
    rating: row.rating as FeedbackRating | undefined,
    url: row.url,
    attachments: row.attachments ? JSON.parse(row.attachments) : [],
    tags: row.tags ? JSON.parse(row.tags) : [],
    adminResponse: row.admin_response,
    adminId: row.admin_id,
    adminName: row.admin_name,
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Fix getComments return type
getComments(feedbackId: string): FeedbackComment[] {
  const stmt = this.db.prepare(`
    SELECT id, feedback_id, user_id, user_name, content, created_at
    FROM feedback_comments
    WHERE feedback_id = ?
    ORDER BY created_at DESC
  `);
  const rows = stmt.all(feedbackId) as DatabaseCommentRow[];
  return rows.map(row => ({
    id: row.id,
    feedbackId: row.feedback_id,
    userId: row.user_id,
    userName: row.user_name,
    content: row.content,
    createdAt: row.created_at,
  }));
}

// Fix updateValues
const updateValues: Record<string, string | number> = { id, updatedAt: Date.now() };

// Fix params array
const params: (string | number | boolean)[] = [];
```

### 2. API Route Filters

```typescript
// Import FeedbackFilter
import { type FeedbackFilter } from '@/lib/db/feedback-storage';

// Use proper type instead of any
const filter: FeedbackFilter = {};

// For updates, use Partial<Feedback>
const updates: Partial<Feedback> = {};
```

### 3. Redis Storage

```typescript
// Add proper type
type RedisClient = any; // Replace with actual Redis client type when available

private redis: RedisClient | null = null;
constructor(redisClient?: RedisClient) {
  this.redis = redisClient || null;
}
getRedisClient(): RedisClient | null {
  return this.redis;
}
```

### 4. Notification Service

```typescript
import { Server } from 'socket.io';

private io: Server | null = null;

getIO(): Server | null {
  return this.io;
}
```

## Priority 2: Test Files (Keep as is or minimal changes)

Test files often use `any` for mocking purposes. These are lower priority:
- `__tests__/*.test.ts` - Mock objects
- `__tests__/*.test.tsx` - React test mocks

## Priority 3: Browser APIs

```typescript
// For window.performance extensions
declare global {
  interface Performance {
    getEntriesByType(type: string): PerformanceEntry[];
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

// For window.next
declare global {
  interface Window {
    next?: {
      router?: unknown;
    };
  }
}
```

## Execution Plan

1. Fix feedback-storage.ts (highest impact)
2. Fix API route filters
3. Fix Redis and Notification types
4. Add type declarations for browser APIs
5. Verify compilation
6. Update report
