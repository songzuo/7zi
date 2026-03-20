# Test Failures Analysis Report

**Generated:** 2026-03-19  
**Test Suite:** 7zi-project  
**Test Runner:** Vitest

**Last Updated:** 2026-03-20 00:03 CET
**Status:** ⚠️ Regression detected - 149 additional test failures

## Executive Summary

- **Total Test Files:** 168
- **Files Passed:** 108 (64.3%) ↗️ (+10 from previous)
- **Files Failed:** 60 (35.7%) ↗️ (+7 from previous)
- **Total Tests:** 4,560
- **Tests Passed:** 3,989 (87.5%) ↗️ (+496 from previous)
- **Tests Failed:** 570 (12.5%) ↗️ (+149 from previous) **⚠️ REGRESSION**
- **Tests Skipped:** 1
- **Errors:** 0 unhandled errors

### Recent Changes (2026-03-20)

**New Failures Added:** 149 tests
**New Tests Added:** 645 total tests
**Test Coverage Progress:** +645 new tests created, but quality needs improvement

### Key Issues Identified

1. **API Route Mocking Issues** - ~200+ new failures in GitHub API routes
2. **Component Testing Issues** - Multiple component tests failing due to DOM structure changes
3. **Error Message Mismatches** - i18n error messages not matching expected values
4. **Mock Configuration** - Timer and async mock configurations incomplete

---

## Failure Categories

### 1. Mock Configuration Errors (High Priority - Easiest to Fix)

**Count:** ~50+ failures  
**Severity:** HIGH  
**Root Cause:** Missing or incomplete mock exports in test setup files

#### Examples (First 20):

1. `src/hooks/useBatchSelection.test.ts` - Shift+Click selection fails
   - Error: `expected 2 to be +0`
   - Mock not properly configured for batch selection logic

2. `src/hooks/useDashboardData.test.ts` - Error handling fails
   - Error: `expected 'An error occurred' to be '获取 Issues 失败'`
   - Error messages not properly mocked

3. `src/hooks/useDashboardData.test.ts` - Manual refresh fails
   - Error: `expected 2 to be 1`
   - Refresh callback mock not triggering properly

4. `src/hooks/useGitHubData.test.ts` - Auto refresh fails
   - Error: Mock interval/timer not working
   - Expected timer callbacks not being called

5. `src/hooks/useGitHubData.test.ts` - Manual refresh fails
   - Error: `expected "vi.fn()" to be called with arguments`
   - Fetch mock not receiving expected parameters

6. `src/hooks/useGitHubData.test.ts` - Activity merge fails
   - Error: Mock data not matching expected merge logic

7. `src/hooks/useGitHubData.test.ts` - Activity limit fails
   - Error: Array length assertion failing
   - Mock data count not matching expectations

8. `src/hooks/useGitHubData.test.ts` - PR filter fails
   - Error: Filter logic not working with mock data
   - Mock GitHub activity includes PRs when shouldn't

9. `src/hooks/useGitHubData.test.ts` - Cleanup fails
   - Error: `expected +0 to be 1`
   - clearInterval mock not being called

10. `src/components/__tests__/NetworkErrorBoundary.test.tsx` - Retry fails
    - Error: `expected "vi.fn()" to be called 1 times, but got 0 times`
    - Retry callback mock not being invoked

11. `src/components/__tests__/NetworkErrorBoundary.test.tsx` - Custom config fails
    - Error: `expected "vi.fn()" to be called at least once`
    - onRetry callback not being called

12. `src/components/__tests__/NetworkErrorBoundary.test.tsx` - Recovery fails
    - Error: Recovery callback not being triggered
    - Online detection mock not firing

13. `src/lib/search-filter.test.ts` - Basic search fails
    - Error: `expected 0 to be greater than 0`
    - Search function returning empty results

14. `src/lib/search-filter.test.ts` - Highlight fails
    - Error: `expected 'Hello <mark class="bg-yellow-200…' to contain '<mark>World</mark>'`
    - Highlight function not marking expected text

15. `src/components/__tests__/LoadingSpinner.enhanced.test.tsx` - Dots variant fails
    - Error: `expected  to have a length of 3 but got +0`
    - Component not rendering expected elements

16. `src/components/__tests__/LoadingSpinner.enhanced.test.tsx` - Bars variant fails
    - Error: `expected  to have a length of 4 but got +0`
    - Component not rendering expected elements

17. `src/components/__tests__/LoadingSpinner.enhanced.test.tsx` - Wave variant fails
    - Error: `expected 0 to be greater than 0`
    - Component not rendering expected elements

18. `src/app/api/database/health/route.test.ts` - Multiple failures
    - Error: `TypeError: Cannot read properties of undefined (reading 'nextUrl')`
    - NextRequest mock not configured

19. `src/app/api/database/optimize/route.test.ts` - Multiple failures
    - Error: `TypeError: Cannot read properties of undefined (reading 'sizeInMB')`
    - Response data structure not matching expectations

20. `src/lib/permissions/__tests__/integration.test.ts` - Multiple failures
    - Error: Permission checks failing with mock data
    - Role/permission mock data not set up correctly

**Root Cause Analysis:**
- Test files are using `vi.mock()` but not returning all required exports
- Mock functions are not being properly configured with `mockResolvedValue`, `mockReturnValue`
- Timer/interval mocks are not being properly advanced with `vi.useFakeTimers()`
- Component rendering mocks are missing DOM elements due to incomplete mocking

**Fix Strategy:**
1. Create centralized mock files in `src/__mocks__` or `test/mocks/`
2. Ensure all mocked modules return all required exports
3. Use `vi.fn()` with proper mock implementations
4. For timer-based tests, use `vi.useFakeTimers()` and `vi.advanceTimersByTime()`
5. For React components, ensure all child dependencies are properly mocked

---

### 2. Next.js Middleware/Request Mock Errors

**Count:** ~20+ failures  
**Severity:** MEDIUM  
**Root Cause:** NextRequest objects not properly mocked in API route tests

#### Examples:

1. `src/app/api/database/health/route.test.ts` (4 failures)
   - Error: `TypeError: Cannot read properties of undefined (reading 'nextUrl')`
   - Location: `src/lib/middleware/rate-limit.ts:202:22`
   - Tests affected:
     - `should generate recommendations for low cache hit rate`
     - `should return service unavailable when database not connected`
     - `should return service unavailable when database not open`
     - `should handle unexpected errors`

**Root Cause Analysis:**
- API route tests are passing plain objects instead of proper NextRequest mocks
- The rate-limit middleware expects a NextRequest object with a `nextUrl` property
- Mock requests need to include all NextRequest properties that middleware uses

**Fix Strategy:**
```typescript
// Create a proper NextRequest mock helper
import { NextRequest } from 'next/server';

function createMockRequest(url: string, options?: any): NextRequest {
  const request = {
    url,
    nextUrl: { pathname: new URL(url).pathname },
    method: options?.method || 'GET',
    headers: new Headers(options?.headers),
    // ... other NextRequest properties
  } as any;
  return request;
}
```

---

### 3. Response Structure Mismatches

**Count:** ~30+ failures  
**Severity:** MEDIUM  
**Root Cause:** API responses returning different structure than expected

#### Examples:

1. `src/app/api/database/optimize/route.test.ts` (9+ failures)
   - Error: `TypeError: Cannot read properties of undefined (reading 'sizeInMB')`
   - Error: `TypeError: Cannot read properties of undefined (reading 'recommendations')`
   - Error: `TypeError: Cannot read properties of undefined (reading 'hitRatePercent')`
   - Tests expecting `data.databaseSize.*` but response structure is different

2. `src/app/api/database/optimize/route.test.ts` (8+ failures)
   - Error: `expected 500 to be 200` or `expected 400 to be 200`
   - API returning error status when expecting success

3. `src/app/api/database/optimize/route.test.ts` (2 failures)
   - Error: `expected undefined to be 'INTERNAL_ERROR'`
   - Error response missing `error.type` field

**Root Cause Analysis:**
- API route implementations have changed but tests haven't been updated
- Response structure doesn't match test expectations
- Error handling not formatting errors in expected format

**Fix Strategy:**
1. Update API routes to return consistent response structure
2. Update tests to match actual API behavior
3. Ensure error responses include `error.type` and `error.timestamp`

---

### 4. Timeout and Timing Issues

**Count:** ~10+ failures  
**Severity:** LOW  
**Root Cause:** Timer-based tests not properly controlling fake timers

#### Examples:

1. Multiple hook tests with timing assertions
   - Error: `expected 0.196... to be greater than 40`
   - Error: `expected 0.054... to be greater than 40`
   - Tests expecting operations to take >40ms but they complete too fast

**Root Cause Analysis:**
- Fake timers not being used or not being advanced
- Tests measuring real time instead of fake time
- Some operations are synchronous when tests expect them to be async

**Fix Strategy:**
```typescript
vi.useFakeTimers();
// Run test
vi.advanceTimersByTime(1000); // Advance by expected duration
expect(timers).toHaveBeenCalled();
vi.useRealTimers();
```

---

### 5. Missing Import/Module Resolution Errors

**Count:** ~5 failures  
**Severity:** MEDIUM  
**Root Cause:** Test files importing modules that don't exist

#### Examples:

1. `src/lib/auth/__tests__/debug.test.ts`
   - Error: `Failed to resolve import "../../db/__tests__/vi-mocks"`
   - Import path doesn't point to existing file

2. `src/components/__tests__/LoadingSpinner.enhanced.test.tsx`
   - Error: `MODULE_NOT_FOUND` for some dependency

3. `src/lib/logger/__tests__/index.test.ts`
   - Error: `Cannot find environment for ...`

**Root Cause Analysis:**
- Import paths are incorrect
- Mock files don't exist at expected locations
- Test setup files not properly configured

**Fix Strategy:**
1. Create missing mock files
2. Fix import paths
3. Ensure test setup files are properly configured

---

### 6. Unhandled Errors

**Count:** 1  
**Severity:** LOW  
**Root Cause:** Test not properly handling expected error scenarios

#### Example:

1. `src/lib/realtime/__tests__/retry-manager.test.ts`
   - Error: `Unhandled Rejection: Error: Task cancelled`
   - Test `should cancel task and return true` is throwing an error that's not being caught

**Root Cause Analysis:**
- Test is throwing an error but not handling it in a try/catch or promise rejection
- Error is expected but test framework is flagging it as unhandled

**Fix Strategy:**
```typescript
await expect(async () => {
  await task.cancel();
}).rejects.toThrow('Task cancelled');
```

---

### 7. GitHub API Route Mocking Issues (NEW - 2026-03-20)

**Count:** ~200+ failures  
**Severity:** HIGH  
**Root Cause:** NextRequest objects and fetch mocks not properly configured for API route tests

#### Examples:

1. `src/app/api/github/commits/route.test.ts` (11 failures)
   - Error: `TypeError: Cannot read properties of undefined (reading 'nextUrl')`
   - Location: `src/lib/middleware/rate-limit.ts:202:22`
   - Tests affected:
     - `should validate required parameters (owner, repo)`
     - `should handle 404 response from GitHub`
     - `should handle 401 unauthorized from GitHub`
     - `should handle 403 rate limit from GitHub`
     - `should handle invalid JSON response from GitHub`
     - `should filter commits by date range`
     - `should default to per_page 30 if not specified`
     - `should handle fetch errors`

2. `src/app/api/github/issues/route.test.ts` (11 failures)
   - Error: Same as commits route - NextRequest mock issues
   - Tests affected: Similar validation and error handling tests

3. `src/app/api/database/optimize/route.test.ts` (19+ failures)
   - Error: `TypeError: Cannot read properties of undefined (reading 'sizeInMB')`
   - Error: `TypeError: Cannot read properties of undefined (reading 'recommendations')`
   - Response structure not matching test expectations

**Root Cause Analysis:**
- API route tests are passing plain objects instead of proper NextRequest mocks
- Rate-limit middleware expects NextRequest object with `nextUrl` property
- Response data structure changed but tests not updated
- Mock fetch functions not returning proper data structures

**Fix Strategy:**

#### 1. Create NextRequest Mock Helper

```typescript
// test/mocks/next-request.ts
import { NextRequest } from 'next/server';
import { URL } from 'url';

export function createMockNextRequest(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
  } = {}
): NextRequest {
  const parsedUrl = new URL(url, 'http://localhost');
  const request = {
    url,
    nextUrl: {
      pathname: parsedUrl.pathname,
      search: parsedUrl.search,
      searchParams: parsedUrl.searchParams,
      href: url,
      origin: parsedUrl.origin,
    },
    method: options.method || 'GET',
    headers: new Headers(options.headers),
    body: options.body ? JSON.stringify(options.body) : null,
    json: async () => options.body,
    text: async () => JSON.stringify(options.body),
  } as any;

  return request;
}
```

#### 2. Fix API Route Tests

```typescript
// src/app/api/github/commits/route.test.ts
import { createMockNextRequest } from '@/test/mocks/next-request';

describe('GET /api/github/commits', () => {
  it('should validate required parameters (owner, repo)', async () => {
    const request = createMockNextRequest(
      'http://localhost:3000/api/github/commits?owner='
    );

    const response = await GET(request);
    expect(response.status).toBe(400);
  });
});
```

#### 3. Mock Fetch Globally

```typescript
// vitest.setup.ts
import { vi } from 'vitest';

beforeAll(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});
```

---

### 8. Component DOM Structure Issues (NEW - 2026-03-20)

**Count:** ~10+ failures  
**Severity:** MEDIUM  
**Root Cause:** Component tests expecting specific DOM structure but elements not rendering or duplicated

#### Examples:

1. `src/components/__tests__/TeamActivityTracker.test.tsx`
   - Error: `Found multiple elements with the role "button" and name /过滤/`
   - Multiple filter buttons rendered when only one expected

2. `src/components/__tests__/ContactForm.test.tsx`
   - Error: `Expected element to be disabled` - submit button not disabled during submission
   - Form submission logic not properly mocked

**Fix Strategy:**

#### 1. Use More Specific Selectors

```typescript
// Instead of:
screen.getByRole('button', { name: /过滤/ })

// Use:
screen.getByRole('button', { name: '过滤活动' })
// or
screen.getByTestId('filter-button')
```

#### 2. Mock Form Submission Properly

```typescript
import { userEvent } from '@testing-library/user-event';

const user = userEvent.setup();

await user.click(screen.getByRole('button', { name: /submit/i }));

// Wait for async state changes
await waitFor(() => {
  expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
});
```

---

### 9. Error Message i18n Mismatches (NEW - 2026-03-20)

**Count:** ~5+ failures  
**Severity:** LOW  
**Root Cause:** Error messages in English but tests expect Chinese

#### Example:

1. `src/hooks/useDashboardData.test.ts`
   - Error: `expected 'An error occurred' to be '获取 Issues 失败'`
   - Error handler returning English message but test expects Chinese

**Fix Strategy:**

#### Option 1: Update Test Expectations

```typescript
// src/hooks/useDashboardData.test.ts
it('should handle non-Error type errors', async () => {
  // ... test setup ...
  expect(result.current.error).toBe('An error occurred');
});
```

#### Option 2: Update Error Handler

```typescript
// src/hooks/useDashboardData.ts
const handleError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An error occurred'; // Keep consistent error messages
};
```

---

## Immediate Action Items (Updated - 2026-03-20)

### Priority 1: Create Mock Infrastructure (2-3 hours)

1. ✅ Create `test/mocks/next-request.ts` with NextRequest mock helper
2. ✅ Update `vitest.setup.ts` with global fetch mock
3. ✅ Create API response mock helpers
4. ✅ Document mock usage in README

### Priority 2: Fix GitHub API Route Tests (4-5 hours)

1. Update all GitHub API route tests to use `createMockNextRequest`
2. Fix response structure expectations in `database/optimize` tests
3. Mock fetch responses properly for all error scenarios
4. Add type safety to mock objects

### Priority 3: Fix Component Tests (2-3 hours)

1. Update DOM selectors to be more specific
2. Fix form submission mocking in `ContactForm.test.tsx`
3. Add proper async/await for state changes
4. Use `waitFor` for async assertions

### Priority 4: Fix i18n Error Messages (1 hour)

1. Decide on language strategy (English vs Chinese)
2. Update all error messages consistently
3. Update test expectations to match implementation
4. Document i18n testing approach

---

## Recommended Fix Priority

### Phase 1: Mock Configuration (Quick Wins - 50+ failures)
**Estimated Time:** 4-6 hours  
**Impact:** ~11% of failing tests

1. Create centralized mock utilities
2. Fix incomplete mock exports
3. Configure timer mocks properly
4. Set up React component mocks

### Phase 2: API Route Request Mocks (20+ failures)
**Estimated Time:** 2-3 hours  
**Impact:** ~4% of failing tests

1. Create NextRequest mock helper
2. Update all API route tests to use proper request mocks
3. Fix middleware integration tests

### Phase 3: Response Structure Fixes (30+ failures)
**Estimated Time:** 3-4 hours  
**Impact:** ~7% of failing tests

1. Audit all API route response structures
2. Update tests to match actual API behavior
3. Standardize error response format

### Phase 4: Timing and Timeout Fixes (10+ failures)
**Estimated Time:** 1-2 hours  
**Impact:** ~2% of failing tests

1. Add fake timers to timer-based tests
2. Update timing assertions
3. Remove real-time measurements

### Phase 5: Import and Module Fixes (5+ failures)
**Estimated Time:** 1-2 hours  
**Impact:** ~1% of failing tests

1. Create missing mock files
2. Fix import paths
3. Update test configuration

---

## Immediate Action Items

### 1. Create Mock Utilities
Create `test/mocks/setup.ts` with:
- NextRequest mock builder
- Response mock builders
- Timer setup helpers
- Common mock functions

### 2. Fix Most Critical Failures
Start with:
- `src/hooks/useGitHubData.test.ts` (6 failures)
- `src/app/api/database/optimize/route.test.ts` (19+ failures)
- `src/lib/permissions/__tests__/integration.test.ts` (20+ failures)

### 3. Establish Testing Conventions
Document:
- How to mock Next.js APIs
- How to mock React hooks
- Timer testing patterns
- Error assertion patterns

---

## Files with Most Failures

### Top Failure Files (Updated 2026-03-20)

1. `src/app/api/github/commits/route.test.ts` - 11 failures (NEW)
2. `src/app/api/github/issues/route.test.ts` - 11 failures (NEW)
3. `src/lib/permissions/__tests__/integration.test.ts` - 20+ failures
4. `src/app/api/database/optimize/route.test.ts` - 19+ failures
5. `src/hooks/useGitHubData.test.ts` - 6 failures
6. `src/app/api/database/health/route.test.ts` - 4 failures
7. `src/components/__tests__/TeamActivityTracker.test.tsx` - 2+ failures
8. `src/components/__tests__/ContactForm.test.tsx` - 2+ failures
9. `src/components/__tests__/NetworkErrorBoundary.test.tsx` - 3 failures
10. `src/hooks/useDashboardData.test.ts` - 2 failures
11. `src/components/__tests__/LoadingSpinner.enhanced.test.tsx` - 3 failures

### Recently Fixed ✅

**Previously Fixed:**
- `src/hooks/useBatchSelection.test.ts` - 32/32 tests passing
- `src/lib/search-filter.test.ts` - 4/4 tests passing

**Recently Passing (2026-03-20):**
- `src/hooks/useDashboardData.test.ts` - 8/10 tests passing (2 new failures)
- `src/test/hooks/useFetch.boundary.test.ts` - 50+ tests passing
- `src/components/__tests__/TeamActivityTracker.test.tsx` - 5/7 tests passing

**New Test Files Added:**
- `src/test/hooks/useFetch.boundary.test.ts` - 50+ comprehensive boundary tests
- Multiple API route test files - 200+ new tests (with failures)

---

## Next Steps

1. ✅ Create this failure analysis document
2. ⏳ Fix mock configuration issues (Phase 1)
3. ⏳ Fix API route request mocks (Phase 2)
4. ⏳ Fix response structure mismatches (Phase 3)
5. ⏳ Fix timing issues (Phase 4)
6. ⏳ Fix import/module issues (Phase 5)
7. ⏳ Re-run full test suite
8. ⏳ Update documentation with testing patterns

---

**Summary:** The majority of failures (~50%) are mock configuration issues, which are relatively easy to fix. The next largest category (~20%) is Next.js middleware/API route mocking. By addressing these systematically, we can reduce failures by ~70% in the first two phases.
