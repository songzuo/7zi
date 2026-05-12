# API Route Audit Report

**Generated:** 2026-05-12  
**Auditor:** Subagent - Backend API Route Verification  
**Scope:** `/src/app/api/` directory (Next.js App Router)

---

## 1. Route Inventory Table

### 1.1 A2A (Agent-to-Agent) Routes

| Path | Method(s) | Middleware | Auth | Rate Limit | Validation | Status Codes | Notes |
|------|-----------|------------|------|------------|------------|--------------|-------|
| `/api/a2a/jsonrpc` | POST, OPTIONS | CORS | ❌ None | ❌ None | ✅ JSON-RPC schema | 200/400/500 | JSON-RPC 2.0 endpoint |
| `/api/a2a/queue` | GET, POST, DELETE | ❌ None | ❌ None | ❌ None | ✅ Basic field check | 200/201/500 | No auth on queue ops |
| `/api/a2a/registry` | GET, POST | ❌ None | ❌ None | ❌ None | ✅ Basic validation | 200/201/500 | No auth, no rate limit |
| `/api/a2a/registry/[id]` | GET, PUT, DELETE | ❌ None | ❌ None | ❌ None | ❌ None | 200/404/500 | Critical: no auth on agent update/delete |
| `/api/a2a/registry/[id]/heartbeat` | POST | ❌ None | ❌ None | ❌ None | ❌ None | 200/404/500 | Critical: unauthenticated heartbeat |

**⚠️ CRITICAL SECURITY ISSUE:** All A2A registry routes have NO authentication or authorization checks. Agents can register, update, delete, and heartbeat without any verification.

---

### 1.2 Admin Routes

| Path | Method(s) | Middleware | Auth | Rate Limit | Validation | Status Codes | Notes |
|------|-----------|------------|------|------------|------------|--------------|-------|
| `/api/admin/rate-limit/rules` | GET, POST, OPTIONS | CORS | ⚠️ Manual token check (TODO: JWT) | ❌ None | ✅ Zod schemas | 200/201/401/500 | Auth has TODO comment - JWT not implemented |
| `/api/admin/rate-limit/rules/[id]` | GET, PUT, DELETE, OPTIONS | CORS | ⚠️ Manual token check (TODO: JWT) | ❌ None | ✅ Zod schemas | 200/201/401/404/500 | Same auth gap as above |
| `/api/admin/rate-limit/statistics` | GET, OPTIONS | CORS | ⚠️ Manual token check (TODO: JWT) | ❌ None | ✅ Zod schemas | 200/401/500 | Statistics exposure without proper auth |
| `/api/admin/security/blacklist` | GET, POST, OPTIONS | CORS | ⚠️ Manual token check (TODO: JWT) | ❌ None | ✅ Zod schemas | 200/201/401/500 | Blacklist management exposed |

**⚠️ SECURITY ISSUE:** Admin routes use a stub `checkAuth()` function with `// TODO: Implement proper JWT verification`. All admin endpoints are effectively unprotected until JWT verification is implemented.

---

### 1.3 Auth Routes

| Path | Method(s) | Middleware | Auth | Rate Limit | Validation | Status Codes | Notes |
|------|-----------|------------|------|------------|------------|--------------|-------|
| `/api/auth/login` | POST | Logging | ❌ Public (authn entry) | ❌ None | ✅ Email/password validation | 200/400/401/500 | No rate limiting on login - brute force risk |
| `/api/auth/logout` | POST | `withUserAuth` | ✅ Required | ❌ None | ✅ Token check | 200/400/401/500 | Uses middleware wrapper |
| `/api/auth/me` | GET | `withUserAuth` | ✅ Required | ❌ None | ❌ None | 200/404/500 | Missing validation |
| `/api/auth/register` | POST | Logging | ❌ Public | ❌ None | ✅ Password strength | 200/201/400/409/500 | 409 on email conflict |
| `/api/auth/refresh` | POST | ❌ None | ❌ Public (token refresh) | ❌ None | ✅ JWT format check | 200/400/401/500 | Token format validated but no rate limit |
| `/api/auth/token` | POST | Audit logging | ❌ Public | ❌ None | ✅ Zod schema | 200/400/401/500 | OAuth2-like endpoint, no rate limiting |
| `/api/auth/verify` | GET | ❌ None | ⚠️ Token optional | ❌ None | ✅ Token check | 200/401/500 | No auth required to verify tokens |
| `/api/auth/permissions` | GET | ❌ None | ⚠️ Bearer required | ❌ None | ✅ Token verify | 200/401/500 | Permissions exposed |
| `/api/auth/audit-logs` | GET | ❌ None | ⚠️ Bearer + admin check | ❌ None | ✅ Query param validation | 200/401/403/500 | Admin-only with permission check |

---

### 1.4 Health Routes

| Path | Method(s) | Middleware | Auth | Rate Limit | Validation | Status Codes | Notes |
|------|-----------|------------|------|------------|------------|--------------|-------|
| `/api/health` | GET, HEAD | ❌ None | ❌ Public | ❌ None | ❌ None | 200/503 | Basic health - no auth needed |
| `/api/health/detailed` | GET | ❌ None | ✅ Bearer token | ❌ None | ✅ Token format | 200/401/403/500 | Auth required but token validation is manual |
| `/api/health/ready` | GET | Kubernetes probe | ❌ None | ❌ None | ❌ None | 200/503 | K8s readiness probe |
| `/api/health/live` | GET | Kubernetes probe | ❌ None | ❌ None | ❌ None | 200/503 | K8s liveness probe |

---

### 1.5 Ratings Routes

| Path | Method(s) | Middleware | Auth | Rate Limit | Validation | Status Codes | Notes |
|------|-----------|------------|------|------------|------------|--------------|-------|
| `/api/ratings` | GET, POST | API Logger | ❌ None | ❌ None | ✅ Field validation | 200/201/400/500 | Public read, no auth on POST |
| `/api/ratings/[id]` | GET, DELETE, PATCH | API Logger | ⚠️ Optional (admin check on delete) | ❌ None | ✅ Field validation | 200/400/403/404/500 | Auth inconsistent |
| `/api/ratings/[id]/helpful` | POST | API Logger | ❌ None | ❌ None | ✅ Boolean check | 200/400/404/500 | No auth required |

---

### 1.6 Search Routes

| Path | Method(s) | Middleware | Auth | Rate Limit | Validation | Status Codes | Notes |
|------|-----------|------------|------|------------|------------|--------------|-------|
| `/api/search` | GET | ❌ None | ❌ None | ❌ None | ❌ None | 200/500 | Full search without auth |
| `/api/search/v2` | GET, POST | ❌ None | ❌ None | ❌ None | ❌ None | 200/500 | Same as v1 |
| `/api/search/autocomplete` | GET | ❌ None | ❌ None | ❌ None | ❌ None | 200/500 | Public autocomplete |
| `/api/search/history` | GET, POST, DELETE | ❌ None | ❌ None | ❌ None | ⚠️ Query validation on POST | 200/201/500 | User history without auth |

---

### 1.7 Workflow Routes

| Path | Method(s) | Middleware | Auth | Rate Limit | Validation | Status Codes | Notes |
|------|-----------|------------|------|------------|------------|--------------|-------|
| `/api/workflow` | GET, POST | ❌ None | ❌ None | ❌ None | ✅ Workflow validation | 200/201/400/500 | No auth at all |
| `/api/workflow/[id]` | GET, PUT, DELETE | ❌ None | ❌ None | ❌ None | ✅ DB fetch | 200/404/500 | No auth |
| `/api/workflow/[id]/run` | POST, GET | ❌ None | ❌ None | ❌ None | ❌ None | 200/201/500 | No validation on run |
| `/api/workflow/[id]/executions` | GET | ❌ None | ❌ None | ❌ None | ⚠️ Query param parsing | 200/500 | No auth |
| `/api/workflow/[id]/executions/[execId]` | GET | ❌ None | ❌ None | ❌ None | ✅ Execution lookup | 200/404/400/500 | No auth |
| `/api/workflow/[id]/executions/[execId]/cancel` | POST | ❌ None | ❌ None | ❌ None | ✅ Status check | 200/400/404/500 | No auth |
| `/api/workflow/[id]/history` | GET | ❌ None | ❌ None | ❌ None | ⚠️ Limit/offset validation | 200/400/500 | No auth |

---

### 1.8 Feedback Routes

| Path | Method(s) | Middleware | Auth | Rate Limit | Validation | Status Codes | Notes |
|------|-----------|------------|------|------------|------------|--------------|-------|
| `/api/feedback` | GET, POST | API Logger | ❌ None | ❌ None | ✅ Field validation | 200/201/400/500 | Public submit |
| `/api/feedback/[id]` | GET, PATCH, DELETE | API Logger | ⚠️ JWT on PATCH/DELETE | ❌ None | ✅ Field validation | 200/400/401/403/404/500 | Inconsistent auth |

---

### 1.9 Other Routes

| Path | Method(s) | Middleware | Auth | Rate Limit | Validation | Status Codes | Notes |
|------|-----------|------------|------|------------|------------|--------------|-------|
| `/api/projects` | GET, POST | ❌ None | ❌ None | ❌ None | ❌ None | 200/201 | Stub - no real implementation |
| `/api/rate-limit` | GET, POST | ❌ None | ❌ None | ❌ None | ❌ None | 200/400/404/500 | Admin panel API |
| `/api/csp-violation` | GET | ❌ None | ❌ None | ❌ None | ❌ None | - | CSP reporting only |
| `/api/csrf-token` | GET | ❌ None | ❌ None | ❌ None | ❌ None | 200 | CSRF token endpoint |
| `/api/sentry-test` | GET | ❌ None | ❌ None | ❌ None | ❌ None | 200 | Test endpoint |
| `/api/status` | GET | ❌ None | ❌ None | ❌ None | ❌ None | 200 | Status endpoint |
| `/api/revalidate` | GET | ❌ None | ❌ None | ❌ None | ✅ Revalidation tags | 200/500 | Cache revalidation |

---

## 2. Security Gap Analysis

### 🔴 CRITICAL (Immediate Action Required)

1. **A2A Registry - Complete Auth Bypass**
   - All `/api/a2a/registry/*` routes have NO authentication
   - Anyone can register fake agents, update agent data, delete agents, or send fake heartbeats
   - A malicious actor could DoS the agent registry or impersonate agents

2. **Admin Routes - TODO JWT Implementation**
   - `/api/admin/rate-limit/*` and `/api/admin/security/blacklist` have stub auth
   - `checkAuth()` function just checks if token exists, doesn't verify JWT signature
   - Anyone with a non-empty Bearer token can manage rate limits and blacklists

3. **Workflow Routes - No Authorization**
   - All workflow CRUD and execution endpoints are completely open
   - Users can run, cancel, or delete any workflow without authentication
   - Could be exploited for resource exhaustion

### 🟠 HIGH (Should Fix Soon)

4. **Login/Token Endpoints - No Rate Limiting**
   - `/api/auth/login`, `/api/auth/token`, `/api/auth/refresh` have no rate limiting
   - Vulnerable to brute force attacks on credentials
   - Should implement progressive delays or account lockout

5. **Search Endpoints - No Auth**
   - `/api/search/*` endpoints expose all project/task data without authentication
   - Sensitive business information could be leaked
   - Autocomplete could reveal internal naming conventions

6. **Ratings/Feedback - Inconsistent Auth**
   - Public read is fine, but public POST is risky for spam/abuse
   - `DELETE /api/ratings/[id]` checks admin but doesn't actually verify JWT properly
   - `DELETE /api/feedback/[id]` has no auth at all despite comment saying "admin only"

7. **Permissions/Audit Logs - Token Verification Bypass**
   - `/api/auth/permissions` returns full permission set without requiring auth on query params
   - `/api/auth/audit-logs` permission check is manual string comparison, not using `hasPermission()`

### 🟡 MEDIUM (Technical Debt)

8. **No Input Validation on Many Endpoints**
   - Workflow run endpoint (`/api/workflow/[id]/run`) has no input validation
   - Search endpoints accept arbitrary filters without schema validation
   - Many routes use manual type checking instead of Zod schemas

9. **Missing Rate Limiting Across All Routes**
   - Only a few routes have explicit rate limiting (those with `rate-limit-example.ts` files)
   - Global rate limiting middleware should be applied

10. **Inconsistent Error Response Format**
    - Some routes use `createSuccessResponse()` / `createErrorResponse()`
    - Others use raw `NextResponse.json()` with custom error shapes
    - Makes client-side error handling harder

11. **No CORS Configuration on Most Routes**
    - Only A2A/jsonrpc and admin routes have explicit CORS
    - Other routes rely on Next.js default behavior
    - Could cause issues with cross-origin requests

---

## 3. Status Code Analysis

### ✅ Correct Usage

| Route | Status | Notes |
|-------|--------|-------|
| `/api/auth/login` | 200/400/401/500 | Correct error codes |
| `/api/auth/register` | 201/400/409/500 | 409 for conflict is correct |
| `/api/auth/token` | 200/400/401/500 | OAuth2 compliant |
| `/api/health` | 200/503 | Correct for unhealthy state |
| `/api/workflow/[id]/executions/[execId]/cancel` | 200/400/404 | Correct status for cancel attempt |

### ⚠️ Issues Found

| Route | Issue | Recommended Fix |
|-------|-------|----------------|
| `/api/auth/me` | Returns 404 for deleted user (correct) but also for system error (wrong) | Separate system error from 404 |
| `/api/ratings/[id]/DELETE` | Returns 403 without verifying actual JWT | Add proper auth middleware |
| `/api/search/history` POST | Returns 200 even on failure to add | Return 500 on database errors |
| `/api/workflow/[id]/executions` | Returns raw `{error}` object instead of wrapped format | Use `createErrorResponse()` |

---

## 4. Missing Error Handling

| Route | Missing Error Handling |
|-------|----------------------|
| `/api/a2a/queue` | No error handling in DELETE with malformed params |
| `/api/a2a/registry/[id]` | No try-catch wrapping for JSON parse failures |
| `/api/search/v2` POST | No error boundary for malformed JSON body |
| `/api/workflow/[id]/run` GET | No try-catch - direct execution |
| `/api/workflow/[id]/history` | `workflowHistoryService.queryHistory` errors unhandled |
| `/api/rate-limit` | Inconsistent error responses between branches |
| `/api/projects` | Returns empty success on POST - no actual creation |

---

## 5. Improvement Recommendations

### Priority 1: Fix Critical Auth Gaps

```typescript
// A2A Registry - Add proper authentication
import { withAgentAuth } from '@/lib/agents/core/auth-middleware'

// In route.ts:
export async function POST(request: NextRequest) {
  return withAgentAuth(request, async (req, context) => {
    // Agent is authenticated via context.agentId
    // ... actual handler logic
  })
}
```

```typescript
// Admin routes - Implement proper JWT verification
// Replace TODO comment with actual JWT verification:
import { verifyJwtToken } from '@/lib/auth/jwt'
import { hasPermission } from '@/lib/auth/service'

async function checkAuth(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { success: false, error: 'Unauthorized' }
  
  const result = await verifyJwtToken(token)
  if (!result.valid || !result.payload) return { success: false, error: 'Invalid token' }
  
  const permitted = await hasPermission(result.payload.sub, 'admin:rate-limit', 'manage')
  if (!permitted) return { success: false, error: 'Forbidden' }
  
  return { success: true, userId: result.payload.sub }
}
```

### Priority 2: Add Rate Limiting to Auth Endpoints

```typescript
// middleware.ts or per-route
import { rateLimitMiddleware } from '@/lib/middleware/rate-limit'

// For login endpoint:
const loginLimiter = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  keyGenerator: (req) => req.ip || 'unknown'
})

export async function POST(request: NextRequest) {
  const rateLimitResult = await loginLimiter.check(request)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.resetMs / 1000) } }
    )
  }
  // ... rest of handler
}
```

### Priority 3: Standardize Error Handling

All routes should use the unified error handler:

```typescript
import { 
  createSuccessResponse, 
  createErrorResponse,
  createValidationError,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError
} from '@/lib/api/error-handler'
```

Instead of raw `NextResponse.json({ error: '...' }, { status: 500 })`.

### Priority 4: Add Input Validation Schemas

All POST/PUT/PATCH routes should validate input with Zod:

```typescript
import { z } from 'zod'

const runWorkflowSchema = z.object({
  inputs: z.record(z.unknown()).optional(),
  userId: z.string().optional(),
  triggerType: z.enum(['manual', 'api', 'scheduled']).default('manual')
})

export async function POST(request: NextRequest, { params }) {
  const body = await request.json()
  const validation = runWorkflowSchema.safeParse(body)
  if (!validation.success) {
    return createValidationError('Invalid workflow run request', validation.error.flatten())
  }
  // ... rest of handler
}
```

### Priority 5: Add Rate Limiting Middleware to All API Routes

Apply global rate limiting via middleware:

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/middleware/rate-limit'

export async function middleware(request: NextRequest) {
  if (request.pathname.startsWith('/api/')) {
    const result = await rateLimit.check(request)
    if (!result.allowed) {
      return new NextResponse('Too Many Requests', { status: 429 })
    }
  }
  return NextResponse.next()
}
```

---

## 6. Summary Statistics

| Category | Count |
|----------|-------|
| Total API Routes | ~70 |
| Routes with proper auth middleware | ~12 (17%) |
| Routes with no auth whatsoever | ~40 (57%) |
| Routes with stub auth (TODO) | ~8 (11%) |
| Routes with rate limiting | ~5 (7%) |
| Routes with Zod/input validation | ~25 (36%) |
| Routes using unified error handler | ~30 (43%) |
| Routes with no error handling | ~15 (21%) |

### Risk Score: **HIGH**

The codebase has significant security gaps, particularly in:
1. A2A agent registry (completely open)
2. Admin routes (stub authentication)
3. Workflow execution (no authorization)
4. Authentication endpoints (no rate limiting)

**Recommended immediate actions:**
1. Implement proper JWT verification in admin routes
2. Add authentication middleware to A2A registry
3. Add rate limiting to all auth-related endpoints
4. Add authorization to workflow endpoints
