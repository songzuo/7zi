# API Route Test Coverage Analysis

Generated: 2026-03-26

## Test Coverage Status

### ✅ Fully Tested Routes

| Route | Test File | Status |
|-------|-----------|--------|
| `/api/auth/login` | `tests/api/__tests__/auth.login.route.test.ts` | ✅ Covered |
| `/api/projects` | `tests/api/__tests__/projects.route.test.ts` | ✅ Covered |
| `/api/tasks` | `tests/api/__tests__/tasks.route.test.ts` | ✅ Covered |
| `/api/feedback` | `tests/api-integration/feedback.integration.test.ts` | ✅ Covered |
| `/api/notifications` | `tests/api/__tests__/notifications.route.test.ts` | ✅ Covered |

### ⚠️ Partially Tested Routes

| Route | Test File | Coverage |
|-------|-----------|----------|
| `/api/analytics/*` | `tests/api-integration/analytics.integration.test.ts` | Integration only |
| `/api/performance/*` | `tests/api-integration/performance.integration.test.ts` | Integration only |
| `/api/ratings` | `tests/api-integration/health.integration.test.ts` | Integration only |
| `/api/web-vitals` | `tests/hooks/useWebVitals.test.ts` | Hook tests only |

### ❌ Missing Tests (High Priority)

| Route | Priority | Notes |
|-------|----------|-------|
| `/api/auth/logout` | 🔴 HIGH | Critical auth endpoint |
| `/api/auth/me` | 🔴 HIGH | User profile endpoint |
| `/api/auth/refresh` | 🔴 HIGH | Token refresh endpoint |
| `/api/auth/register` | 🔴 HIGH | Registration endpoint |
| `/api/rbac/roles` | 🔴 HIGH | Role management |
| `/api/rbac/roles/[roleId]` | 🔴 HIGH | Role CRUD |
| `/api/rbac/roles/[roleId]/permissions` | 🔴 HIGH | Role permissions |
| `/api/rbac/users/[userId]/permissions` | 🔴 HIGH | User permissions |
| `/api/rbac/permissions` | 🔴 HIGH | Permissions list |
| `/api/rbac/system` | 🔴 HIGH | System info |
| `/api/search` | 🟠 MEDIUM | Search endpoint |
| `/api/search/autocomplete` | 🟠 MEDIUM | Autocomplete |
| `/api/search/history` | 🟠 MEDIUM | Search history |
| `/api/data/export` | 🟠 MEDIUM | Data export |
| `/api/data/import` | 🟠 MEDIUM | Data import |
| `/api/health` | 🟠 MEDIUM | Health check |
| `/api/health/live` | 🟠 MEDIUM | Liveness probe |
| `/api/health/ready` | 🟠 MEDIUM | Readiness probe |
| `/api/health/detailed` | 🟠 MEDIUM | Detailed health |
| `/api/metrics/performance` | 🟠 MEDIUM | Performance metrics |
| `/api/metrics/prometheus` | 🟠 MEDIUM | Prometheus metrics |
| `/api/user/preferences` | 🟠 MEDIUM | User settings |

### ❌ Missing Tests (Low Priority)

| Route | Notes |
|-------|-------|
| `/api/a2a/*` | A2A protocol endpoints |
| `/api/csp-violation` | CSP reporting |
| `/api/csrf-token` | CSRF token (has integration test) |
| `/api/revalidate` | Next.js revalidation |
| `/api/status` | Simple status endpoint |
| `/api/vitals` | Vitals endpoint |
| `/api/ratings/*` | Rating endpoints (has integration test) |
| `/api/github/*` | GitHub proxy |
| `/api/demo/*` | Demo endpoints |
| `/api/database/*` | Database operations |
| `/api/stream/*` | Streaming endpoints |
| `/api/multimodal/*` | Multimodal endpoints |

## Summary

- **Total API Routes**: 60+
- **Fully Tested**: 5
- **Partially Tested**: 4
- **Not Tested**: 51+
- **Coverage**: ~15%

## Action Items

1. ✅ Create tests for auth endpoints (logout, me, refresh, register)
2. ✅ Create tests for RBAC endpoints (roles, permissions, users)
3. ⏳ Create tests for search endpoints
4. ⏳ Create tests for health endpoints
5. ⏳ Create tests for data export/import
6. ⏳ Improve unit tests for partially covered routes

## Test Framework

- **Runner**: Vitest
- **HTTP Testing**: supertest
- **Mocking**: vi.mock
- **Test Location**: `/root/.openclaw/workspace/tests/api/__tests__/`
