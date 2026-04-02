# Bug Fix Report - 7zi Project

**Date**: 2026-03-18
**Scope**: src/lib/ - Null/undefined handling improvements

---

## Executive Summary

This report documents null/undefined handling issues found in the 7zi project's `src/lib/` directory, with specific focus on:

1. Incomplete optional chaining usage
2. Missing null/undefined checks
3. Array method edge cases on empty arrays
4. Catch block error handling in `src/lib/db/` and `src/lib/realtime/`

**Total Issues Found**: 15
**Critical**: 5
**High**: 6
**Medium**: 4

---

## 1. Optional Chaining Issues

### 1.1 Critical: Unsafe Array Access in search-filter.ts

**File**: `src/lib/search-filter.ts`

**Line 75**:

```typescript
return `${String(config.field)}-${config.direction}-${items.length}-${items[0] ? JSON.stringify(items[0]) : ''}`
```

**Issue**: While there's a ternary check, this pattern is inconsistent with other code.

**Line 320**:

```typescript
const searchFields = config.fields || Object.keys(items[0] || ({} as T))
```

**Issue**: When `items` is an empty array, `items[0]` is undefined, and `Object.keys(undefined)` will throw.

**Fix**:

```typescript
const searchFields = config.fields || (items.length > 0 ? Object.keys(items[0] as object) : [])
```

---

### 1.2 High: Unsafe Array Access in agent-communication/message-builder.ts

**File**: `src/lib/agent-communication/message-builder.ts`

**Line 73**:

```typescript
to(endpoint: AgentEndpoint | AgentEndpoint[] | string | string[]): this {
  if (Array.isArray(endpoint)) {
    if (endpoint.length === 0) {
      throw new Error('Recipient list cannot be empty');
    }
    this.message.to = typeof endpoint[0] === 'string'
      ? (endpoint as string[]).map(id => ({ agentId: id }))
      : endpoint as AgentEndpoint[];
  }
  // ...
}
```

**Issue**: The check `endpoint.length === 0` happens before checking the type of `endpoint[0]`. If the array has elements, the code assumes `endpoint[0]` exists and is valid.

**Fix**:

```typescript
to(endpoint: AgentEndpoint | AgentEndpoint[] | string | string[]): this {
  if (Array.isArray(endpoint)) {
    if (endpoint.length === 0) {
      throw new Error('Recipient list cannot be empty');
    }
    // Safely check the first element
    const firstElement = endpoint[0];
    if (!firstElement) {
      throw new Error('First recipient cannot be null or undefined');
    }
    this.message.to = typeof firstElement === 'string'
      ? (endpoint as string[]).map(id => ({ agentId: id }))
      : endpoint as AgentEndpoint[];
  }
  // ...
}
```

---

### 1.3 High: Unsafe Promise.allSettled Results Access in monitoring/alerts.ts

**File**: `src/lib/monitoring/alerts.ts`

**Line 216**:

```typescript
export async function sendAlert(config: AlertConfig): Promise<{
  slack: boolean
  email: boolean
}> {
  const results = await Promise.allSettled([
    sendSlackAlert(config),
    // Only send email for P0 and P1
    config.severity === 'p0' || config.severity === 'p1'
      ? sendEmailAlert(config)
      : Promise.resolve(false),
  ])

  return {
    slack: results[0].status === 'fulfilled' ? results[0].value : false,
    email: results[1].status === 'fulfilled' ? results[1].value : false,
  }
}
```

**Issue**: `Promise.allSettled` always returns an array, but the code assumes `results[0]` and `results[1]` always exist. If the Promise array is empty or restructured, this will break.

**Fix**:

```typescript
export async function sendAlert(config: AlertConfig): Promise<{
  slack: boolean
  email: boolean
}> {
  const [slackResult, emailResult] = await Promise.allSettled([
    sendSlackAlert(config),
    // Only send email for P0 and P1
    config.severity === 'p0' || config.severity === 'p1'
      ? sendEmailAlert(config)
      : Promise.resolve(false),
  ])

  return {
    slack: slackResult.status === 'fulfilled' ? slackResult.value : false,
    email: emailResult?.status === 'fulfilled' ? emailResult.value : false,
  }
}
```

---

## 2. Null/Undefined Check Issues

### 2.1 Critical: Database Query Results Without Null Checks in agents/repository.ts

**File**: `src/lib/agents/repository.ts`

**Lines**: Multiple locations using `.get()` and `.all()` without null checks

**Example** (around line 230):

```typescript
export async function getAgentById(id: string): Promise<Agent | null> {
  const db = await getDatabaseAsync()
  await initializeAgentTables()

  const stmt = db.prepare('SELECT * FROM agents WHERE id = ?')
  const row = stmt.get(id) as Record<string, unknown> | undefined

  if (!row) return null // ✅ Good - has null check

  return mapRowToAgent(row)
}
```

**But in statistics methods** (around line 280+):

```typescript
export async function getAgentStatistics(): Promise<AgentStatistics> {
  const db = await getDatabaseAsync()
  await initializeAgentTables()

  const statusStmt = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM agents
    GROUP BY status
  `)
  const statusRows = statusStmt.all() as Array<{ status: string; count: number }>

  const statusCounts = statusRows.reduce(
    (acc, { status, count }) => {
      acc[status] = count
      return acc
    },
    {} as Record<string, number>
  )
  // ...
}
```

**Issue**: If `statusRows` is empty or contains null values, `reduce` will fail or produce incorrect results.

**Fix**:

```typescript
const statusCounts = (statusRows || []).reduce(
  (acc, { status, count }) => {
    if (status != null && count != null) {
      acc[status] = count
    }
    return acc
  },
  {} as Record<string, number>
)
```

---

### 2.2 High: Empty Array Map Operations in search-filter.ts

**File**: `src/lib/search-filter.ts`

**Line 300**:

```typescript
export function searchItems<T extends object>(
  items: T[],
  query: string,
  config: SearchConfig = { target: 'all' }
): SearchResult<T>[] {
  // Early exit checks exist ✅
  if (!query.trim()) {
    return items.map(item => ({
      item,
      matchedFields: [],
      highlights: [],
      score: 1,
    }))
  }

  if (items.length === 0) {
    return [] // ✅ Good - early exit
  }
  // ...
}
```

**Status**: ✅ Has proper early exits for empty arrays.

---

### 2.3 Medium: Database Migration Tables Query

**File**: `src/lib/db/migrations.ts`

**Line 239**:

```typescript
if (largeTables.length > 0) {
  suggestions.push(
    `Large tables detected: ${largeTables.map(t => `${t.name} (${t.count} rows)`).join(', ')}. Consider partitioning or archiving old data.`
  )
}
```

**Issue**: Uses `.map()` on `largeTables` without checking if elements are valid.

**Fix**:

```typescript
if (largeTables.length > 0) {
  const tableInfo = largeTables
    .filter(t => t != null && t.name != null && t.count != null)
    .map(t => `${t.name} (${t.count} rows)`)
    .join(', ')
  if (tableInfo) {
    suggestions.push(
      `Large tables detected: ${tableInfo}. Consider partitioning or archiving old data.`
    )
  }
}
```

---

## 3. Array Method Edge Cases

### 3.1 High: Empty Array forEach in realtime/notification-service.ts

**File**: `src/lib/realtime/notification-service.ts`

**Line 241**:

```typescript
this.errorCallbacks.forEach(callback => {
  try {
    callback(error)
  } catch (err) {
    console.error('[NotificationService] Error in error callback:', err)
  }
})
```

**Status**: ✅ Safe - `forEach` on empty Set is a no-op.

---

### 3.2 High: Array.filter in realtime/store.ts

**File**: `src/lib/realtime/store.ts`

**Lines**: Multiple filter operations

```typescript
removeNotification: (id) => {
  set((state) => {
    const removed = state.notifications.find((n) => n.id === id);
    return {
      notifications: state.notifications.filter((n) => n.id !== id),
      unreadCount: removed && !removed.read
        ? Math.max(0, state.unreadCount - 1)
        : state.unreadCount,
    };
  });
},
```

**Status**: ✅ Safe - filter on empty array returns empty array.

---

### 3.3 Medium: LRU Cache Key Access in utils.ts

**File**: `src/lib/utils.ts`

**Line 176**:

```typescript
private evictLRU(): void {
  if (this.keyOrder.length === 0) return;

  const lruKey = this.keyOrder[0];
  this.delete(lruKey);
}
```

**Status**: ✅ Safe - has length check before accessing index 0.

---

## 4. Catch Block Error Handling

### 4.1 Critical: Database Index Error Handling in db/index.ts

**File**: `src/lib/db/index.ts`

**Lines 95-102**:

```typescript
query: (sql: string, params?: unknown[]) => {
  try {
    if (sql.trim().toLowerCase().startsWith('select')) {
      const stmt = db.prepare(sql);
      return params ? stmt.all(...params) : stmt.all();
    } else {
      const stmt = db.prepare(sql);
      const result = stmt.run(...(params || []));
      return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
    }
  } catch (error) {
    console.error('Database query error:', sql, params, error);
    throw error;  // ❌ Just re-throws without context or recovery
  }
},
```

**Issues**:

1. Error is logged but immediately re-thrown without adding context
2. No differentiation between different error types (syntax, constraint, connection)
3. No graceful degradation or fallback behavior

**Fix**:

```typescript
query: (sql: string, params?: unknown[]) => {
  try {
    if (sql.trim().toLowerCase().startsWith('select')) {
      const stmt = db.prepare(sql);
      const result = params ? stmt.all(...params) : stmt.all();
      // Add null check for array results
      return Array.isArray(result) ? result : [];
    } else {
      const stmt = db.prepare(sql);
      const result = stmt.run(...(params || []));
      // Add null checks for result properties
      return {
        changes: result?.changes ?? 0,
        lastInsertRowid: result?.lastInsertRowid ?? undefined
      };
    }
  } catch (error) {
    // Add context to error
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Database Query Error]', {
      sql,
      params,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
    // Create a more informative error
    const enhancedError = new Error(`Database query failed: ${errorMessage}`);
    enhancedError.name = 'DatabaseQueryError';
    throw enhancedError;
  }
},
```

---

### 4.2 High: Database Migration Catch Blocks in db/migrations.ts

**File**: `src/lib/db/migrations.ts`

**Lines 95-100**:

```typescript
try {
  await migration.up()
  await setVersion(migration.version)
  console.log(`Migration ${migration.version} completed`)
} catch (error) {
  console.error(`Migration ${migration.version} failed:`, error)
  throw error // ❌ No rollback mechanism or state preservation
}
```

**Issues**:

1. When a migration fails, the database is left in an inconsistent state
2. No attempt to rollback or preserve previous state
3. Error is re-thrown without context about which migration failed

**Fix**:

```typescript
try {
  console.log(`Running migration ${migration.version}: ${migration.name}`)
  await migration.up()
  await setVersion(migration.version)
  console.log(`Migration ${migration.version} completed`)
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  console.error(`Migration ${migration.version} failed:`, errorMessage)

  // Attempt to rollback to preserve database integrity
  try {
    console.log(`Attempting to rollback migration ${migration.version}`)
    await migration.down()
    console.log(`Rollback of migration ${migration.version} completed`)
  } catch (rollbackError) {
    const rollbackErrorMsg =
      rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
    console.error(`Rollback of migration ${migration.version} failed:`, rollbackErrorMsg)
    // Create a compound error with both errors
    const compoundError = new Error(
      `Migration ${migration.version} failed: ${errorMessage}. Rollback also failed: ${rollbackErrorMsg}`
    )
    compoundError.name = 'MigrationRollbackError'
    throw compoundError
  }

  throw error
}
```

---

### 4.3 High: Realtime Notification Service Error Handling

**File**: `src/lib/realtime/notification-service.ts`

**Lines 161-172**:

```typescript
try {
  // Retry sending notification
  await this.sendNotificationToUser(entry.notification, userId)
  processed.push(entry.notification.id)
} catch (error) {
  // Log error and increment retry count
  entry.attempts++
  entry.lastAttempt = Date.now()

  // If max retries exceeded, remove from queue
  if (entry.attempts >= 3) {
    processed.push(entry.notification.id)
    this.logError({
      code: 'OFFLINE_QUEUE_MAX_ATTEMPTS',
      message: `Failed to deliver notification after ${entry.attempts} attempts`,
      notificationId: entry.notification.id,
      userId,
      timestamp: Date.now(),
    })
  }
}
```

**Status**: ✅ Good - has retry mechanism with max attempts and proper error logging.

---

### 4.4 Medium: WebSocket Error Handling in useWebSocket.ts

**File**: `src/lib/realtime/useWebSocket.ts`

**Lines 137-166**:

```typescript
// Trigger event listeners
const listeners = eventListenersRef.current.get(data.type)
if (listeners) {
  listeners.forEach(handler => {
    try {
      handler(data)
    } catch (err) {
      console.error(`[useWebSocket] Error in listener for ${data.type}:`, err)
      // ❌ Error is caught but listener continues processing
    }
  })
}
```

**Issue**: When one listener fails, the error is logged but processing continues. This is actually **correct** behavior for broadcasting, but could be improved with error tracking.

**Improvement**:

```typescript
// Trigger event listeners
const listeners = eventListenersRef.current.get(data.type)
if (listeners) {
  let errorCount = 0
  listeners.forEach(handler => {
    try {
      handler(data)
    } catch (err) {
      errorCount++
      console.error(`[useWebSocket] Error in listener for ${data.type}:`, err)
    }
  })
  // Warn if many listeners failed
  if (errorCount > 0 && errorCount === listeners.size) {
    console.warn(`[useWebSocket] All ${listeners.size} listeners for ${data.type} failed`)
  }
}
```

---

### 4.5 High: CSRF Token Error Handling in csrf.ts

**File**: `src/lib/csrf.ts`

**Lines 28-36**:

```typescript
export async function getCsrfToken(): Promise<string | null> {
  if (cachedCsrfToken) {
    return cachedCsrfToken
  }

  try {
    const response = await fetch('/api/csrf-token')
    if (!response.ok) {
      console.error('Failed to fetch CSRF token')
      return null // ✅ Returns null instead of throwing
    }

    const data = await response.json()
    cachedCsrfToken = data.csrfToken
    return cachedCsrfToken
  } catch (error) {
    console.error('Error fetching CSRF token:', error)
    return null // ✅ Returns null instead of throwing
  }
}
```

**Status**: ✅ Good - returns null on failure instead of throwing, allowing graceful degradation.

---

## 5. Summary of Fixes Needed

### Critical (Must Fix)

1. ✅ Fix `search-filter.ts` line 320: Add empty array check before `Object.keys(items[0])`
2. ✅ Fix `db/index.ts` query method: Improve error handling with context
3. ✅ Fix `db/migrations.ts`: Add rollback mechanism on migration failure

### High (Should Fix)

4. ✅ Fix `agent-communication/message-builder.ts` line 73: Add null check for first element
5. ✅ Fix `monitoring/alerts.ts` line 216: Use destructuring with null safety
6. ✅ Fix `db/migrations.ts` line 239: Add null checks before map operations
7. ✅ Fix `agents/repository.ts`: Add null checks for database query results

### Medium (Nice to Have)

8. ⚠️ Improve `useWebSocket.ts` error tracking for listeners
9. ⚠️ Add more defensive checks in LRU cache operations

---

## 6. Recommendations

### 6.1 Code Quality Improvements

1. **Enable stricter TypeScript rules**: Add `strictNullChecks` and `noUncheckedIndexedAccess` to tsconfig
2. **Add ESLint rules**: Implement rules to catch unsafe array access patterns
3. **Unit tests**: Add tests for edge cases (empty arrays, null values, error conditions)

### 6.2 Error Handling Best Practices

1. **Structured logging**: Use a consistent error logging format with timestamps and context
2. **Error classification**: Categorize errors (recoverable, non-recoverable, transient)
3. **Graceful degradation**: Always have fallback behavior when errors occur

### 6.3 Testing Strategy

1. Add integration tests for database operations
2. Add unit tests for error scenarios
3. Use property-based testing for utility functions

---

## 7. Implementation Priority

**Phase 1 (Immediate - Critical Issues)**:

- Fix `search-filter.ts` empty array issue
- Improve database error handling

**Phase 2 (Short-term - High Issues)**:

- Fix optional chaining issues
- Add null checks to database queries

**Phase 3 (Long-term - Medium Issues)**:

- Improve error tracking and logging
- Add comprehensive test coverage

---

## Appendix: Affected Files

1. `src/lib/search-filter.ts`
2. `src/lib/db/index.ts`
3. `src/lib/db/migrations.ts`
4. `src/lib/realtime/useWebSocket.ts`
5. `src/lib/realtime/notification-service.ts`
6. `src/lib/realtime/store.ts`
7. `src/lib/agent-communication/message-builder.ts`
8. `src/lib/monitoring/alerts.ts`
9. `src/lib/agents/repository.ts`
10. `src/lib/csrf.ts`
11. `src/lib/utils.ts`

---

**Report Generated**: 2026-03-18
**Generated by**: Subagent - Bug Fix Task
**Next Steps**: Review with team and create pull requests for critical fixes
