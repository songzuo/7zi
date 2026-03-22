# Quick Reference: API Documentation Updates Needed

## Critical Issues (Fix Immediately)

### 1. Missing Endpoints in Documentation Implementation
```
❌ POST /api/auth/logout    - Documented but NOT implemented
❌ POST /api/auth/refresh   - Documented but NOT implemented
```
**Action**: Either implement these endpoints or remove from documentation.

### 2. Database Optimize API - Parameter Mismatch
```json
// ❌ DOCUMENTED (WRONG):
{ "actions": ["vacuum", "analyze", "clear-cache"], "daysToKeep": 90 }

// ✅ ACTUAL IMPLEMENTATION (CORRECT):
{ "operations": ["vacuum", "analyze", "clear_metrics", "rebuild_indexes"] }
```
**Changes needed**:
- `actions` → `operations`
- `clear-cache` → `clear_metrics`
- Remove `daysToKeep` parameter

### 3. Error Response Format - Field Name Mismatch
```json
// ❌ DOCUMENTED (WRONG):
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",    // ❌ Should be "type"
    "message": "Invalid request"
  }
}

// ✅ ACTUAL IMPLEMENTATION (CORRECT):
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",   // ✅ Changed from "code"
    "message": "Invalid request",
    "userMessage": "User-friendly message",   // ✅ New field
    "action": "Suggested action",             // ✅ New field
    "help": "Additional help text",            // ✅ New field
    "timestamp": "2026-03-22T12:00:00.000Z"
  },
  "requestId": "uuid-here"  // ✅ New field
}
```

**Changes needed**:
- Replace all `error.code` with `error.type`
- Add `userMessage`, `action`, `help` fields
- Add `requestId` field

---

## High Priority Updates

### New Error Types to Document
Add these to error response examples:
- `REGISTRATION_FAILED` - User registration failed
- `WEAK_PASSWORD` - Password strength validation failed
- `MISSING_TOKEN` - Authentication token missing

### Missing API Sections to Add
1. **RBAC APIs** (10+ endpoints)
   - `/api/rbac/permissions`
   - `/api/rbac/roles`
   - `/api/rbac/users`
   - `/api/rbac/system`

2. **Extended User Management**
   - `/api/users/[userId]/activity`
   - `/api/users/[userId]/avatar`
   - `/api/users/batch/bulk`

3. **Performance Monitoring**
   - `/api/performance/report`
   - `/api/performance/metrics`
   - `/api/performance/alerts`

4. **Backup Extended APIs**
   - `/api/backup/schedule`
   - `/api/backup/statistics`
   - `/api/backup/export`
   - `/api/backup/import`
   - `/api/backup/restore`

5. **Analytics APIs**
   - `/api/analytics/export`
   - `/api/analytics/metrics`

6. **A2A Extended APIs**
   - `/api/a2a/registry`
   - `/api/a2a/queue`

7. **WebSocket APIs**
   - `/api/ws/stats`
   - `/api/ws/broadcast`
   - `/api/ws/rooms`

8. **Data Export/Import**
   - `/api/data/export`
   - `/api/data/import`

9. **Search APIs**
   - `/api/search/autocomplete`
   - `/api/search/history`

---

## Medium Priority Updates

### Version Number Update
Health check endpoint: Change version from `1.0.0` to `1.0.6`

### Authentication Requirements
Document which endpoints require:
- Authentication (JWT token)
- Admin permissions
- Rate limiting

### Response Examples
Add response examples for endpoints that only have request examples.

---

## Correctly Documented Endpoints ✅

These endpoints match their implementations exactly:
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `GET /api/github/commits`
- `GET /api/github/issues`
- `GET /api/health` (all variants)
- `GET /api/status`
- `GET /api/database/health`
- `POST /api/multimodal/audio`
- `GET /api/multimodal/audio`
- `POST /api/multimodal/image`
- `GET /api/stream/analytics`
- `POST /api/a2a/jsonrpc`
- `GET /api/backup`
- `POST /api/backup`
- `GET /api/csrf-token`

---

## Statistics

- **Total reviewed**: 76 API route files
- **Documented endpoints**: ~50
- **Correctly documented**: 35 (70%)
- **Need updates**: 15 (30%)
- **Missing from docs**: 25+ endpoints

---

## Next Steps

1. ✅ **Review completed** - Full report saved to `API-DOCUMENTATION-REVIEW.md`
2. ⏳ **Priority 1 fixes** - Update parameter names, remove missing endpoints
3. ⏳ **Priority 2 additions** - Add missing API sections
4. ⏳ **Priority 3 enhancements** - Add authentication docs, examples

---

*Generated: 2026-03-22*
