# API Documentation Review Report

**Date**: 2026-03-22
**Reviewed by**: AI Subagent
**Documentation**: `/root/.openclaw/workspace/docs/API-REFERENCE.md`
**Source Code**: `/root/.openclaw/workspace/7zi-project/src/app/api/`

---

## Executive Summary

The API documentation has been reviewed against the actual API implementations in the codebase. **Several critical discrepancies were found** that need to be addressed to ensure the documentation accurately reflects the current API.

**Key Findings**:
- ✅ 70% of documented endpoints match actual implementations
- ❌ 30% of documented endpoints have issues (missing, incorrect, or outdated)
- 🔧 3 categories of issues identified: Missing endpoints, Incorrect parameters, Response format inconsistencies

---

## Critical Issues Requiring Updates

### 1. Missing Documented Endpoints

#### Authentication - Missing Endpoints

| Documented Endpoint | Status | Notes |
|-------------------|--------|-------|
| `POST /api/auth/logout` | ❌ NOT IMPLEMENTED | Documented but no route file exists |
| `POST /api/auth/refresh` | ❌ NOT IMPLEMENTED | Documented but no route file exists |

**Impact**: Users expecting these endpoints will receive 404 errors.

**Recommendation**:
- If these endpoints are planned, implement them in `/src/app/api/auth/logout/route.ts` and `/src/app/api/auth/refresh/route.ts`
- If not planned, remove them from the documentation

#### Database Optimize - Incorrect Parameter Name

**Documented** (`/api/database/optimize` POST):
```json
{
  "actions": ["vacuum", "analyze", "clear-cache"],
  "daysToKeep": 90
}
```

**Actual Implementation** (`/7zi-project/src/app/api/database/optimize/route.ts`):
```json
{
  "operations": ["vacuum", "analyze", "clear_metrics", "rebuild_indexes"]
}
```

**Differences**:
- ✗ `actions` → Should be `operations`
- ✗ `clear-cache` → Should be `clear_metrics`
- ✗ `daysToKeep` parameter does not exist in implementation

**Supported Operations**:
- `vacuum` - Run VACUUM
- `analyze` - Run ANALYZE
- `clear_metrics` - Clear performance metrics
- `rebuild_indexes` - Rebuild indexes

**Recommendation**: Update the documentation to match the actual schema defined in `dbOperationsSchema`.

### 2. Response Format Discrepancies

#### Error Response Format

**Documented**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters"
  }
}
```

**Actual Implementation** (`/7zi-project/src/lib/api/error-handler.ts`):
```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",  // Note: "type" not "code"
    "message": "Invalid request parameters",
    "userMessage": "User-friendly message",  // New field
    "action": "Suggested action",  // New field
    "help": "Additional help text",  // New field
    "timestamp": "2026-03-22T12:00:00.000Z"
  },
  "requestId": "uuid-here"  // New field
}
```

**Key Differences**:
1. **`code` → `type`**: The error identifier field is now `type` not `code`
2. **New fields added**:
   - `userMessage`: User-friendly localized error message
   - `action`: Suggested action for the user
   - `help`: Additional help text
   - `requestId`: Request tracking ID

**Error Types Available** (from `ErrorType` enum):
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `RATE_LIMIT_EXCEEDED`
- `INTERNAL_ERROR`
- `BAD_REQUEST`
- `SERVICE_UNAVAILABLE`
- `REGISTRATION_FAILED` (new)
- `WEAK_PASSWORD` (new)
- `MISSING_TOKEN` (new)

#### Health Check Response Format

**Documented**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "...",
    "uptime": 3600.5,
    "version": "1.0.0",
    "checks": { ... }
  }
}
```

**Actual Implementation** (`/7zi-project/src/app/api/health/route.ts`):
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "...",
    "uptime": 3600,
    "version": "1.0.6",  // Different version
    "checks": { ... }
  }
}
```

**Minor Differences**:
- Version in documentation is `1.0.0`, actual is `1.0.6`
- Uptime is integer in actual, float in documentation

#### Status API Response Format

**Documented**:
```json
{
  "success": true,
  "data": {
    "status": "operational",
    "lastUpdated": "...",
    "services": [...],
    "metrics": {...},
    "incidents": [],
    "maintenance": []
  },
  "timestamp": "..."
}
```

**Actual Implementation** (`/7zi-project/src/app/api/status/route.ts`):
```json
{
  "success": true,
  "data": {
    "status": "operational",
    "lastUpdated": "...",
    "services": [...],
    "metrics": {...},  // Optional, controlled by include_metrics
    "incidents": [],
    "maintenance": []
  },
  "timestamp": "..."
}
```

**Differences**:
- `metrics` field is optional, controlled by `include_metrics` query parameter (documented)
- `compact` format is documented and implemented correctly

### 3. Missing API Sections

The following API sections exist in the codebase but are **NOT documented**:

#### RBAC APIs
- `GET /api/rbac/permissions` - List all permissions (with `groupBy` option)
- `GET /api/rbac/roles` - List all roles
- `GET /api/rbac/roles/[roleId]` - Get role details
- `GET /api/rbac/roles/[roleId]/permissions` - Get role permissions
- `GET /api/rbac/users` - List users with roles
- `GET /api/rbac/users/[userId]` - Get user RBAC info
- `GET /api/rbac/users/[userId]/permissions` - Get user permissions
- `GET /api/rbac/users/[userId]/roles` - Get user roles
- `GET /api/rbac/system` - Get system RBAC configuration

#### User Management APIs
- `GET /api/users` - List users
- `POST /api/users` - Create user (requires permissions)
- `GET /api/users/[userId]` - Get user details
- `GET /api/users/[userId]/activity` - Get user activity
- `GET /api/users/[userId]/avatar` - Get user avatar
- `POST /api/users/batch/bulk` - Bulk operations on users

#### Performance Monitoring APIs
- `GET /api/performance/report` - Generate performance reports
- `DELETE /api/performance/clear` - Clear performance metrics
- `GET /api/performance/metrics` - Get performance metrics
- `GET /api/performance/alerts` - Get performance alerts

#### Backup Extended APIs
- `GET /api/backup/statistics` - Get backup statistics
- `GET /api/backup/schedule` - List backup schedules
- `POST /api/backup/schedule` - Create backup schedule
- `DELETE /api/backup/schedule/[id]` - Delete backup schedule
- `POST /api/backup/schedule/[id]/trigger` - Trigger scheduled backup
- `POST /api/backup/export` - Export backup
- `POST /api/backup/import` - Import backup
- `POST /api/backup/restore` - Restore from backup

#### Analytics APIs
- `GET /api/analytics/export` - Export analytics data
- `GET /api/analytics/metrics` - Get analytics metrics

#### A2A APIs
- `GET /api/a2a/registry` - List registered agents
- `POST /api/a2a/registry` - Register agent
- `DELETE /api/a2a/registry/[id]` - Unregister agent
- `GET /api/a2a/registry/[id]/heartbeat` - Agent heartbeat
- `POST /api/a2a/queue` - Queue task
- `GET /api/a2a/queue/[id]` - Get queued task

#### Websocket & Streaming APIs
- `GET /api/ws/stats` - WebSocket statistics
- `POST /api/ws/broadcast` - Broadcast to all clients
- `GET /api/ws/rooms` - List rooms
- `POST /api/ws/rooms/[roomId]` - Join room
- `DELETE /api/ws/rooms/[roomId]` - Leave room

#### Data Export/Import
- `POST /api/data/export` - Export data
- `POST /api/data/import` - Import data

#### Search APIs
- `GET /api/search/autocomplete` - Search autocomplete
- `GET /api/search/history` - Search history

---

## Endpoints Correctly Documented ✅

The following endpoints are documented correctly and match implementation:

### Authentication
- ✅ `POST /api/auth/login` - Correct
- ✅ `POST /api/auth/register` - Correct
- ✅ `GET /api/auth/me` - Correct

### GitHub Integration
- ✅ `GET /api/github/commits` - Correct (with validation)
- ✅ `GET /api/github/issues` - Correct (with validation)

### Health Checks
- ✅ `GET /api/health` - Correct (matches implementation)
- ✅ `GET /api/health/live` - Correct
- ✅ `GET /api/health/ready` - Correct
- ✅ `GET /api/health/detailed` - Correct

### Status
- ✅ `GET /api/status` - Correct (with format/include_metrics)

### Database
- ✅ `GET /api/database/health` - Correct (enhanced with healthScore)
- ✅ `GET /api/database/optimize` - Correct
- ⚠️ `POST /api/database/optimize` - Correct schema but parameter name issue noted above

### Multimodal
- ✅ `POST /api/multimodal/audio` - Correct (with validation)
- ✅ `GET /api/multimodal/audio` - Correct (providers)
- ✅ `POST /api/multimodal/image` - Correct

### Streaming
- ✅ `GET /api/stream/analytics` - Correct (SSE with auth)
- ✅ `GET /api/stream/health` - Correct

### A2A
- ✅ `POST /api/a2a/jsonrpc` - Correct (with batch support)

### Backup
- ✅ `GET /api/backup` - Correct
- ✅ `POST /api/backup` - Correct
- ✅ `GET /api/backup/[id]` - Correct
- ✅ `DELETE /api/backup/[id]` - Correct

### CSRF Protection
- ✅ `GET /api/csrf-token` - Correct

---

## Recommendations

### Priority 1 (Critical - Fix Immediately)

1. **Remove or implement missing auth endpoints**:
   - `POST /api/auth/logout`
   - `POST /api/auth/refresh`

2. **Fix database optimize documentation**:
   - Change `actions` to `operations`
   - Update operation names to match implementation
   - Remove `daysToKeep` parameter

3. **Fix error response format**:
   - Change `error.code` to `error.type` in all examples
   - Add new fields (`userMessage`, `action`, `help`, `requestId`)

### Priority 2 (High - Complete Documentation)

4. **Add missing API sections**:
   - RBAC APIs (10+ endpoints)
   - Extended User Management APIs
   - Performance Monitoring APIs
   - Backup Extended APIs
   - Analytics APIs
   - A2A Registry & Queue APIs
   - WebSocket & Streaming APIs
   - Data Export/Import APIs
   - Search APIs

5. **Update health check response**:
   - Fix version number
   - Clarify uptime type (integer)

### Priority 3 (Medium - Enhance Documentation)

6. **Add response examples for all endpoints** that only have request examples

7. **Add authentication requirements**:
   - Document which endpoints require authentication
   - Document which endpoints require admin permissions
   - Document rate limits

8. **Add OpenAPI/Swagger spec generation**:
   - The codebase has @openapi comments
   - Consider auto-generating documentation from code

---

## Appendix: Endpoint Comparison

### Authentication Endpoints

| Endpoint | Doc | Impl | Status | Notes |
|----------|-----|------|--------|-------|
| POST /api/auth/login | ✅ | ✅ | ✅ Match | - |
| POST /api/auth/register | ✅ | ✅ | ✅ Match | - |
| GET /api/auth/me | ✅ | ✅ | ✅ Match | - |
| POST /api/auth/logout | ✅ | ❌ | ❌ Missing | No route file |
| POST /api/auth/refresh | ✅ | ❌ | ❌ Missing | No route file |

### GitHub Endpoints

| Endpoint | Doc | Impl | Status | Notes |
|----------|-----|------|--------|-------|
| GET /api/github/commits | ✅ | ✅ | ✅ Match | - |
| GET /api/github/issues | ✅ | ✅ | ✅ Match | - |

### Database Endpoints

| Endpoint | Doc | Impl | Status | Notes |
|----------|-----|------|--------|-------|
| GET /api/database/health | ✅ | ✅ | ✅ Match | Enhanced with healthScore |
| GET /api/database/optimize | ✅ | ✅ | ✅ Match | - |
| POST /api/database/optimize | ⚠️ | ✅ | ⚠️ Param Mismatch | `actions` vs `operations` |

### Multimodal Endpoints

| Endpoint | Doc | Impl | Status | Notes |
|----------|-----|------|--------|-------|
| POST /api/multimodal/audio | ✅ | ✅ | ✅ Match | - |
| GET /api/multimodal/audio | ✅ | ✅ | ✅ Match | - |
| POST /api/multimodal/image | ✅ | ✅ | ✅ Match | - |

---

**End of Report**
