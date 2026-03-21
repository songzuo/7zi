# API Batch Endpoints Documentation

## Overview

This document describes the batch operation endpoints for user management in the 7zi Project. These endpoints allow efficient handling of multiple user records in a single API request, reducing the number of HTTP requests and improving performance.

**Base Path:** `/api/users/batch`

**Implementation Date:** 2026-03-21

## Table of Contents

1. [GET - Batch Retrieve Users](#get---batch-retrieve-users)
2. [POST - Batch Create Users](#post---batch-create-users)
3. [PATCH - Batch Update Users](#patch---batch-update-users)
4. [DELETE - Batch Delete Users](#delete---batch-delete-users)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Best Practices](#best-practices)
8. [Examples](#examples)

---

## GET - Batch Retrieve Users

Retrieve multiple users by their IDs in a single request.

### Endpoint

```
GET /api/users/batch?ids=id1,id2,id3
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ids` | string | Yes | Comma-separated list of user IDs |

### Limits

- **Maximum IDs per request:** 100
- **URL length:** Must not exceed browser/server limits

### Response

**Success (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": "user1",
      "email": "user1@example.com",
      "name": "User One",
      "role": "member",
      "status": "active",
      "createdAt": "2026-03-21T10:00:00Z",
      "updatedAt": "2026-03-21T10:00:00Z"
    },
    {
      "id": "user2",
      "email": "user2@example.com",
      "name": "User Two",
      "role": "admin",
      "status": "active",
      "createdAt": "2026-03-21T10:00:00Z",
      "updatedAt": "2026-03-21T10:00:00Z"
    }
  ],
  "meta": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "errors": null
  }
}
```

**Partial Success (200)**

When some users are not found:

```json
{
  "success": true,
  "data": [
    {
      "id": "user1",
      "email": "user1@example.com",
      "name": "User One"
    }
  ],
  "meta": {
    "total": 2,
    "successful": 1,
    "failed": 1,
    "errors": [
      {
        "id": "user2",
        "error": "User not found"
      }
    ]
  }
}
```

**Error Responses**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `MISSING_PARAMETER` | `ids` parameter is required |
| 400 | `INVALID_PARAMETER` | No valid user IDs provided |
| 400 | `TOO_MANY_REQUESTS` | Maximum 100 user IDs per batch request |
| 500 | `INTERNAL_ERROR` | Internal server error |

---

## POST - Batch Create Users

Create multiple users in a single request.

### Endpoint

```
POST /api/users/batch
```

### Request Body

```json
{
  "users": [
    {
      "email": "user1@example.com",
      "name": "User One",
      "password": "securepassword123",
      "role": "member",
      "status": "active"
    },
    {
      "email": "user2@example.com",
      "name": "User Two",
      "password": "securepassword123",
      "role": "admin"
    }
  ]
}
```

### User Object Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email address (unique) |
| `name` | string | Yes | User's display name |
| `password` | string | Yes | Minimum 8 characters |
| `role` | string | No | `admin` | `member` | `guest` (default: `member`) |
| `status` | string | No | `active` | `inactive` | `suspended` (default: `active`) |
| `roles` | array | No | Additional roles array |
| `permissions` | array | No | Custom permissions |
| `metadata` | object | No | Additional metadata as JSON object |

### Limits

- **Maximum users per request:** 50
- **Email uniqueness:** Checked across batch and database

### Response

**Success (201)**

```json
{
  "success": true,
  "data": [
    {
      "id": "user_1711000000_abc123",
      "email": "user1@example.com",
      "name": "User One",
      "role": "member",
      "status": "active",
      "password": "hashed_password_here",
      "createdAt": "2026-03-21T10:00:00Z",
      "updatedAt": "2026-03-21T10:00:00Z"
    },
    {
      "id": "user_1711000001_def456",
      "email": "user2@example.com",
      "name": "User Two",
      "role": "admin",
      "status": "active",
      "password": "hashed_password_here",
      "createdAt": "2026-03-21T10:00:00Z",
      "updatedAt": "2026-03-21T10:00:00Z"
    }
  ],
  "meta": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "errors": null
  }
}
```

**Error Responses**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_REQUEST` | `users` is not an array or is empty |
| 400 | `TOO_MANY_REQUESTS` | Maximum 50 users per batch create request |
| 400 | `VALIDATION_ERROR` | Some users have invalid data |
| 400 | `DUPLICATE_EMAIL` | Duplicate email addresses found in the batch |
| 409 | `EMAIL_EXISTS` | Some email addresses already exist in database |
| 500 | `INTERNAL_ERROR` | Internal server error |

**Validation Error Example (400)**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some users have invalid data",
    "details": [
      {
        "index": 0,
        "errors": [
          "email must be a valid email address",
          "password must be at least 8 characters"
        ]
      },
      {
        "index": 2,
        "errors": [
          "name is required and must be a string"
        ]
      }
    ]
  }
}
```

---

## PATCH - Batch Update Users

Update multiple users in a single request.

### Endpoint

```
PATCH /api/users/batch
```

### Request Body

```json
{
  "updates": [
    {
      "id": "user1",
      "name": "Updated Name",
      "role": "admin"
    },
    {
      "id": "user2",
      "status": "inactive",
      "metadata": {
        "department": "Engineering"
      }
    }
  ]
}
```

### Update Object Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | User ID to update |
| `name` | string | No | User's display name |
| `email` | string | No | Valid email address (must be unique) |
| `role` | string | No | `admin` | `member` | `guest` |
| `status` | string | No | `active` | `inactive` | `suspended` |
| `roles` | array | No | Additional roles array |
| `permissions` | array | No | Custom permissions |
| `metadata` | object | No | Additional metadata |

### Limits

- **Maximum updates per request:** 100
- **User ID:** Must exist in database

### Response

**Success (200)**

```json
{
  "success": true,
  "data": [
    {
      "id": "user1",
      "email": "user1@example.com",
      "name": "Updated Name",
      "role": "admin",
      "status": "active",
      "updatedAt": "2026-03-21T10:05:00Z"
    },
    {
      "id": "user2",
      "email": "user2@example.com",
      "name": "User Two",
      "role": "member",
      "status": "inactive",
      "metadata": {
        "department": "Engineering"
      },
      "updatedAt": "2026-03-21T10:05:00Z"
    }
  ],
  "meta": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "errors": null
  }
}
```

**Partial Success (200)**

When some updates fail:

```json
{
  "success": true,
  "data": [
    {
      "id": "user1",
      "email": "user1@example.com",
      "name": "Updated Name",
      "updatedAt": "2026-03-21T10:05:00Z"
    }
  ],
  "meta": {
    "total": 2,
    "successful": 1,
    "failed": 1,
    "errors": [
      {
        "id": "nonexistent-user",
        "error": "User not found"
      }
    ]
  }
}
```

**Error Responses**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_REQUEST` | `updates` is not an array or is empty |
| 400 | `TOO_MANY_REQUESTS` | Maximum 100 users per batch update request |
| 400 | `VALIDATION_ERROR` | Some updates have invalid data |
| 500 | `INTERNAL_ERROR` | Internal server error |

---

## DELETE - Batch Delete Users

Delete multiple users by their IDs in a single request.

### Endpoint

```
DELETE /api/users/batch?ids=id1,id2,id3
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ids` | string | Yes | Comma-separated list of user IDs |

### Limits

- **Maximum IDs per request:** 100

### Response

**Success (200)**

```json
{
  "success": true,
  "meta": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "notFound": 0,
    "errors": null,
    "notFoundIds": null
  }
}
```

**Partial Success (200)**

When some users don't exist:

```json
{
  "success": true,
  "meta": {
    "total": 3,
    "successful": 2,
    "failed": 0,
    "notFound": 1,
    "errors": null,
    "notFoundIds": [
      "nonexistent-user"
    ]
  }
}
```

**Error Responses**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `MISSING_PARAMETER` | `ids` parameter is required |
| 400 | `INVALID_PARAMETER` | No valid user IDs provided |
| 400 | `TOO_MANY_REQUESTS` | Maximum 100 user IDs per batch delete request |
| 500 | `INTERNAL_ERROR` | Internal server error |

---

## Error Handling

All batch endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional error details (optional)
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `MISSING_PARAMETER` | 400 | Required parameter is missing |
| `INVALID_PARAMETER` | 400 | Parameter has invalid value |
| `INVALID_REQUEST` | 400 | Request body has invalid structure |
| `TOO_MANY_REQUESTS` | 400 | Request exceeds limits |
| `VALIDATION_ERROR` | 400 | Data validation failed |
| `DUPLICATE_EMAIL` | 400 | Duplicate email in batch |
| `EMAIL_EXISTS` | 409 | Email already exists in database |
| `INTERNAL_ERROR` | 500 | Internal server error |

### Partial Failure Handling

Batch operations support partial failures:
- The endpoint returns **200 OK** even if some operations fail
- The `meta` object contains detailed failure information
- Successful operations are committed to the database
- Failed operations are rolled back (per-user basis)

---

## Rate Limiting

### Current Limits

| Operation | Max Records | Rationale |
|-----------|-------------|-----------|
| GET (retrieve) | 100 users | Read-only, URL length constraints |
| POST (create) | 50 users | Resource-intensive, validation required |
| PATCH (update) | 100 users | Moderate resource usage |
| DELETE (delete) | 100 users | Destructive operation, needs caution |

### Recommended Limits

For production deployment, consider:
- **Time-based rate limiting:** 10 batch requests per minute per IP/user
- **Concurrent request limiting:** Maximum 3 concurrent batch requests per session
- **Total user count:** Maximum 5000 users per 24-hour period per organization

---

## Best Practices

### 1. Use Batching When Appropriate

**Use batch operations when:**
- Importing multiple users from external systems
- Bulk updates (e.g., changing role/status for multiple users)
- Data synchronization between systems
- Reducing API call overhead

**Avoid batch operations when:**
- Creating/updating a single user (use standard endpoints)
- Real-time operations requiring immediate feedback
- Complex conditional logic per user

### 2. Handle Partial Failures Gracefully

```javascript
const response = await fetch('/api/users/batch?ids=id1,id2,id3');
const result = await response.json();

if (result.success) {
  const successfulUsers = result.data;
  const failedIds = result.meta.errors?.map(e => e.id) || [];

  if (failedIds.length > 0) {
    console.warn(`Failed to process ${failedIds.length} users:`, failedIds);
  }

  // Process successful users
  successfulUsers.forEach(user => {
    // ...
  });
}
```

### 3. Validate Data Client-Side

Before sending batch requests, validate data client-side to reduce server load:

```javascript
function validateUser(user) {
  if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
    return { valid: false, error: 'Invalid email' };
  }
  if (!user.name || user.name.trim().length === 0) {
    return { valid: false, error: 'Name is required' };
  }
  if (user.password && user.password.length < 8) {
    return { valid: false, error: 'Password too short' };
  }
  return { valid: true };
}

const users = [...];
const invalidUsers = users.filter(u => !validateUser(u).valid);

if (invalidUsers.length > 0) {
  // Show validation errors to user
} else {
  // Send batch request
}
```

### 4. Use Transaction for Related Operations

If you need to ensure all-or-nothing behavior across multiple batch operations:

```javascript
// Note: This requires additional endpoint implementation
// The current implementation supports per-user rollback within a batch
```

### 5. Monitor Performance

Batch operations should be monitored for:
- Execution time
- Database load
- Memory usage
- Error rates

### 6. Implement Retry Logic

For transient failures, implement exponential backoff:

```javascript
async function batchRequestWithRetry(url, options, maxRetries = 3) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return await response.json();
      lastError = response;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
  }
  throw lastError;
}
```

---

## Examples

### Example 1: Batch Import Users from CSV

```javascript
async function importUsersFromCSV(csvData) {
  const users = parseCSV(csvData);

  // Validate all users
  const validUsers = users.filter(user => {
    const validation = validateUser(user);
    if (!validation.valid) {
      console.error(`Invalid user: ${user.email}`, validation.error);
    }
    return validation.valid;
  });

  if (validUsers.length === 0) {
    throw new Error('No valid users to import');
  }

  // Batch create users (50 at a time)
  const batchSize = 50;
  const results = [];

  for (let i = 0; i < validUsers.length; i += batchSize) {
    const batch = validUsers.slice(i, i + batchSize);
    const response = await fetch('/api/users/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: batch }),
    });

    const result = await response.json();
    results.push(...result.data);

    console.log(`Imported batch ${i / batchSize + 1}: ${result.meta.successful}/${result.meta.total}`);
  }

  return results;
}
```

### Example 2: Batch Update User Roles

```javascript
async function batchUpdateUserRoles(roleChanges) {
  const updates = roleChanges.map(({ userId, newRole }) => ({
    id: userId,
    role: newRole,
  }));

  const response = await fetch('/api/users/batch', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates }),
  });

  const result = await response.json();

  if (result.success) {
    console.log(`Updated ${result.meta.successful} users`);
    if (result.meta.failed > 0) {
      console.warn(`Failed to update ${result.meta.failed} users`);
      result.meta.errors.forEach(error => {
        console.error(`  - ${error.id}: ${error.error}`);
      });
    }
  } else {
    throw new Error(result.error.message);
  }
}

// Usage
await batchUpdateUserRoles([
  { userId: 'user1', newRole: 'admin' },
  { userId: 'user2', newRole: 'member' },
  { userId: 'user3', newRole: 'guest' },
]);
```

### Example 3: Batch Retrieve and Display Users

```javascript
async function displayUsers(userIdList) {
  const ids = userIdList.join(',');
  const response = await fetch(`/api/users/batch?ids=${ids}`);
  const result = await response.json();

  if (result.success) {
    console.log(`Found ${result.data.length} users:`);
    result.data.forEach(user => {
      console.log(`  - ${user.name} (${user.email}): ${user.role}`);
    });

    if (result.meta.failed > 0) {
      console.warn(`\nFailed to retrieve ${result.meta.failed} users:`);
      result.meta.errors.forEach(error => {
        console.warn(`  - ${error.id}: ${error.error}`);
      });
    }
  }
}

// Usage
await displayUsers(['user1', 'user2', 'user3']);
```

### Example 4: Batch Delete Inactive Users

```javascript
async function deleteInactiveUsers() {
  // First, get all inactive users (assuming endpoint exists)
  const allUsers = await fetch('/api/users?status=inactive').then(r => r.json());
  const userIds = allUsers.data.map(user => user.id);

  if (userIds.length === 0) {
    console.log('No inactive users to delete');
    return;
  }

  if (!confirm(`Delete ${userIds.length} inactive users?`)) {
    return;
  }

  // Batch delete (100 at a time)
  const batchSize = 100;
  let totalDeleted = 0;

  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    const response = await fetch(`/api/users/batch?ids=${batch.join(',')}`, {
      method: 'DELETE',
    });

    const result = await response.json();
    totalDeleted += result.meta.successful;

    console.log(`Deleted batch ${i / batchSize + 1}: ${result.meta.successful}/${result.meta.total}`);
  }

  console.log(`Total deleted: ${totalDeleted} users`);
}
```

### Example 5: Error Handling with Partial Failures

```javascript
async function batchCreateUsersWithRetry(users, maxRetries = 2) {
  const batchSize = 50;
  let allResults = [];

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    let retryCount = 0;
    let success = false;

    while (retryCount <= maxRetries && !success) {
      try {
        const response = await fetch('/api/users/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: batch }),
        });

        const result = await response.json();

        if (response.ok) {
          success = true;
          allResults.push(...result.data);

          // Handle partial failures within batch
          if (result.meta.failed > 0) {
            console.warn(`Batch ${i / batchSize + 1}: ${result.meta.failed} failures`);
            result.meta.errors.forEach(error => {
              console.error(`  Index ${error.index}: ${error.error}`);
            });
          }
        } else {
          throw new Error(result.error.message);
        }
      } catch (error) {
        retryCount++;
        console.error(`Batch ${i / batchSize + 1} attempt ${retryCount} failed:`, error.message);

        if (retryCount > maxRetries) {
          console.error(`Batch ${i / batchSize + 1} failed after ${maxRetries} retries`);
          throw error;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }
  }

  return allResults;
}
```

---

## Testing

The batch endpoints include comprehensive test coverage:

```bash
# Run all tests
npm run test

# Run only batch API tests
npm run test -- src/app/api/users/batch/__tests__/route.test.ts
```

### Test Coverage

- ✅ Batch retrieve users (GET)
- ✅ Batch create users (POST)
- ✅ Batch update users (PATCH)
- ✅ Batch delete users (DELETE)
- ✅ Validation error handling
- ✅ Partial failure handling
- ✅ Rate limiting enforcement
- ✅ Duplicate email detection
- ✅ Missing parameter validation
- ✅ Maximum request size enforcement

---

## Performance Considerations

### Database Optimization

The batch endpoints utilize the existing `batch-operations.ts` utility, which provides:

1. **Transaction batching:** Multiple operations wrapped in a single database transaction
2. **Prepared statements:** SQL statements are pre-compiled for faster execution
3. **Connection pooling:** Efficient database connection reuse
4. **Automatic chunking:** Large requests are automatically split into optimal batch sizes

### Expected Performance

| Operation | Records | Expected Time |
|-----------|---------|---------------|
| GET | 100 | < 100ms |
| POST | 50 | < 500ms |
| PATCH | 100 | < 500ms |
| DELETE | 100 | < 200ms |

*Performance may vary based on database size, hardware, and network conditions.*

### Monitoring Metrics

Key metrics to monitor:
- `batch_operation_duration_ms` - Time per batch operation
- `batch_operation_record_count` - Number of records processed
- `batch_operation_failure_rate` - Percentage of failed operations
- `batch_operation_db_query_time_ms` - Database query duration

---

## Security Considerations

1. **Authentication:** All batch endpoints require authentication
2. **Authorization:** Users can only modify users they have permission to manage
3. **Input Validation:** All inputs are validated before processing
4. **Rate Limiting:** Maximum record limits prevent abuse
5. **Audit Logging:** All batch operations are logged for audit purposes
6. **Password Security:** Passwords are hashed using PBKDF2 with 10,000 iterations

---

## Future Enhancements

Potential improvements for future versions:

1. **Async Processing:** Support for asynchronous batch operations with job queues
2. **Progress Tracking:** WebSocket-based progress updates for long-running batches
3. **Bulk Export:** Batch export users to CSV/JSON
4. **Conditional Updates:** Support for conditional updates based on current user state
5. **Rollback Support:** Full transaction rollback across entire batch
6. **Webhook Notifications:** Callbacks when batch operations complete
7. **Template Support:** Pre-defined batch operation templates
8. **Dry Run Mode:** Preview batch operations without executing them

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-21 | Initial implementation of batch endpoints |

---

## Support

For questions or issues related to the batch API endpoints:

1. Check the test files for usage examples
2. Review the error codes and responses above
3. Consult the main API documentation
4. Contact the development team for assistance

---

*Document Version: 1.0.0*
*Last Updated: 2026-03-21*
*Generated for: 7zi Project*
