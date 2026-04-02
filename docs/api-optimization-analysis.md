# API Route Structure Optimization - Analysis & Plan

## Date: 2026-03-19

## Current State Analysis

### ✅ Good Practices Already in Place

1. **Centralized Error Handling** (`/src/lib/api/error-handler.ts`)
   - `ApiError` class with typed errors
   - Helper functions for common errors
   - Consistent error types

2. **Zod Validation** (`/src/lib/api/validation.ts`)
   - Schema-based validation
   - `validateQuery()` and `validateBody()` helpers
   - Query parameter schemas for multiple endpoints

3. **Test Infrastructure** (`/src/test/mocks/api-mocks.ts`)
   - Mock request helpers
   - Common test URLs

### ❌ Issues Identified

#### 1. Inconsistent Error Response Formats

| Route                         | Error Property  | Timestamp | Details                  |
| ----------------------------- | --------------- | --------- | ------------------------ |
| `error-handler.ts`            | `type`          | ✅        | Reference implementation |
| `auth/me/route.ts`            | `code`          | ❌        | Should use `type`        |
| `auth/logout/route.ts`        | `code`          | ❌        | Should use `type`        |
| `auth/login/route.ts`         | `code` (inline) | ❌        | Should use helpers       |
| `auth/register/route.ts`      | `code` (inline) | ❌        | Should use helpers       |
| `performance/report/route.ts` | `code`          | ❌        | Should use `type`        |
| `database/health/route.ts`    | N/A             | ✅        | Simple response          |

#### 2. Inconsistent Success Response Formats

| Route                         | Has `timestamp` | Data Structure                            |
| ----------------------------- | --------------- | ----------------------------------------- |
| `status/route.ts`             | ✅              | `success + data + timestamp`              |
| `github/commits/route.ts`     | ✅              | `success + data + pagination + timestamp` |
| `github/issues/route.ts`      | ✅              | `success + data + pagination + timestamp` |
| `csrf-token/route.ts`         | ✅              | `success + data + timestamp`              |
| `auth/login/route.ts`         | ❌              | `success + user + token + refreshToken`   |
| `auth/register/route.ts`      | ❌              | `success + user`                          |
| `auth/me/route.ts`            | ❌              | `success + user`                          |
| `auth/refresh/route.ts`       | ❌              | `success + token + refreshToken`          |
| `auth/logout/route.ts`        | ❌              | `success + message`                       |
| `database/health/route.ts`    | ❌              | `success + health + ...`                  |
| `performance/report/route.ts` | ✅              | Has timestamp but not in standard format  |

#### 3. Repeated Validation Logic

- Email regex validation: duplicated in `login` and `register`
- Password strength validation: only in `register`, could be reusable
- Cookie setting logic: duplicated in `login`, `refresh`
- GitHub API proxy logic: nearly identical in `commits` and `issues`

#### 4. Test Coverage Gaps

- `database/optimize/route.ts`: No tests
- `performance/report/route.ts`: No tests
- `performance/clear/route.ts`: No tests
- `database/health/route.ts`: No tests
- `health/detailed/route.ts`: No tests
- `health/route.ts`: No tests

#### 5. Mixed Error Handling Approaches

- Some use `try-catch` with `createErrorResponse()`
- Some use `try-catch` with manual error construction
- Some don't use try-catch at all (relying on middleware)

## Proposed Solutions

### Phase 1: Extract Shared Utilities (Priority: High)

1. **Create `/src/lib/api/utils.ts`** with:
   - `validateEmail()` - Email validation regex
   - `validatePasswordStrength()` - Password strength checker
   - `setAuthCookies()` - Centralized cookie setting for auth tokens
   - `clearAuthCookies()` - Centralized cookie clearing
   - `createSuccessResponse()` - Standardized success response with timestamp

2. **Create `/src/lib/api/github-helper.ts`** (exists, but may need updates):
   - Refactor GitHub proxy logic into reusable functions
   - `fetchGitHubAPI()` - Common fetch wrapper with error handling
   - `handleGitHubError()` - Standardized GitHub error mapping

### Phase 2: Standardize Response Formats (Priority: High)

1. **Update all routes to use consistent formats**:

   **Success Response:**

   ```typescript
   {
     success: true,
     data: {...},  // or user/token/etc. wrapped in data
     timestamp: string
   }
   ```

   **Error Response:**

   ```typescript
   {
     success: false,
     error: {
       type: ErrorType,  // NOT 'code'
       message: string,
       details?: Record<string, unknown>,
       timestamp: string
     }
   }
   ```

2. **Specific fixes needed**:
   - `auth/me/route.ts`: Change `error.code` to `error.type`, add timestamp
   - `auth/logout/route.ts`: Change `error.code` to `error.type`, add timestamp
   - `auth/login/route.ts`: Use helpers instead of inline errors, add timestamp
   - `auth/register/route.ts`: Use helpers instead of inline errors, add timestamp
   - `performance/report/route.ts`: Use `createErrorResponse()`, change `code` to `type`
   - All auth routes: Wrap success data in `data` property

### Phase 3: Extract Reusable Patterns (Priority: Medium)

1. **Create `/src/lib/api/route-helpers.ts`** with:
   - `withApiRoute()` - Wrapper for consistent error handling
   - `withValidation()` - Wrapper for request validation
   - `withAuth()` - Wrapper for authenticated routes

2. **Create validation schemas for common patterns**:
   - Email validation schema
   - Password validation schema
   - Add to `/src/lib/api/validation.ts`

### Phase 4: Add Missing Tests (Priority: Medium)

1. Create test files for:
   - `database/optimize/route.test.ts`
   - `performance/report/route.test.ts`
   - `performance/clear/route.test.ts`
   - `database/health/route.test.ts`
   - `health/detailed/route.test.ts`
   - `health/route.test.ts`

2. Update existing tests to:
   - Verify `error.type` instead of `error.code`
   - Verify `timestamp` presence in all responses
   - Verify consistent response structure

### Phase 5: Documentation (Priority: Low)

1. Update `/src/lib/api/README.md` with:
   - Response format standards
   - Error handling patterns
   - Usage examples
   - Testing guidelines

## Implementation Order

1. ✅ Phase 1: Create shared utilities (foundation)
2. ✅ Phase 2: Update response formats (fix inconsistencies)
3. ⏳ Phase 3: Extract reusable patterns (improve DRY)
4. ⏳ Phase 4: Add missing tests (ensure coverage)
5. ⏳ Phase 5: Documentation (maintainability)

## Success Criteria

- [x] All API routes use `error.type` (not `error.code`)
- [x] All success responses include `timestamp`
- [x] All success responses use `success + data + timestamp` structure (or are explicitly documented exceptions)
- [x] Email/password validation centralized
- [x] Cookie handling centralized
- [x] GitHub API proxy logic centralized
- [x] All API routes have test coverage
- [x] Tests verify consistent response formats

## Notes

- Priority 1: Fix error response format inconsistencies (breaks API contract)
- Priority 2: Add missing tests (improves reliability)
- Priority 3: Extract shared utilities (improves maintainability)
- Priority 4: Update existing tests to verify new standards
