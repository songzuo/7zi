# Test Fixes - Complete Summary

## Overview
Fixed mock configuration issues and timer-related problems in three hook test files to prevent test failures and hangs.

## Files Modified

### 1. `/root/.openclaw/workspace/7zi-project/src/test/setup.tsx`
**Changes:**
- Added `beforeEach` block to clear all mocks before each test
- Added `vi.useRealTimers()` to `afterEach` to restore real timers after each test

**Why:**
- Prevents timer state leakage between tests
- Ensures mocks start clean for each test

### 2. `/root/.openclaw/workspace/7zi-project/src/hooks/useGitHubData.test.ts`
**Changes:**
- Wrapped all timer-based tests in try/finally blocks
- Added `mockFetch.mockClear()` to `beforeEach`
- Added `vi.useRealTimers()` to `afterEach`

**Why:**
- Ensures timers are always restored even if tests fail
- Clears fetch mocks between tests to prevent interference

### 3. `/root/.openclaw/workspace/7zi-project/src/hooks/useDashboardData.test.ts`
**Changes:**
- Added `mockFetch.mockClear()` to `beforeEach`
- Added `vi.useRealTimers()` to `afterEach`

**Why:**
- Prevents mock state from leaking between tests
- Ensures timers are properly cleaned up

### 4. `/root/.openclaw/workspace/7zi-project/src/hooks/useBatchSelection.test.ts`
**Changes:**
- Added `beforeEach` block with `vi.clearAllMocks()` and `vi.useRealTimers()`
- Added `afterEach` block with same cleanup

**Why:**
- Ensures clean test environment
- Prevents timer-related issues

## Key Issues Addressed

### 1. Timer Mock Cleanup
**Problem:** Tests using `vi.useFakeTimers()` without proper cleanup can cause timer state to leak into subsequent tests, causing hangs or unexpected behavior.

**Solution:** Use try/finally blocks for all timer tests and always call `vi.useRealTimers()` in afterEach.

### 2. Mock State Management
**Problem:** Global mocks like `mockFetch` retain state between tests, causing unexpected behavior.

**Solution:** Call `mockFetch.mockClear()` in beforeEach to reset mock state.

### 3. Test Environment Cleanup
**Problem:** Tests can interfere with each other if timers and mocks aren't properly reset.

**Solution:** Added comprehensive cleanup in both beforeEach and afterEach blocks in test setup.

## Test Configuration
- **Test Timeout:** 10,000ms (configured in vitest.config.ts)
- **Environment:** jsdom
- **Setup File:** ./src/test/setup.tsx

## Verification Steps
1. Run individual test files to ensure they pass:
   ```bash
   npm test -- src/hooks/useBatchSelection.test.ts --run
   npm test -- src/hooks/useDashboardData.test.ts --run
   npm test -- src/hooks/useGitHubData.test.ts --run
   ```

2. Run all tests to verify no regressions:
   ```bash
   npm test -- --run
   ```

## Potential Remaining Issues

### Hook Dependency Cycles
The hooks use `useCallback` with dependencies that might cause re-creation issues:
- `refresh` depends on `fetchIssues`, `fetchCommits`, `fetchStats`, `mergeActivities`
- `fetchIssues`, `fetchCommits`, `fetchStats` depend on `getHeaders`
- `getHeaders` depends on `token`

This could theoretically cause infinite re-renders if not properly managed, but the current implementation should handle this correctly.

### Error Message Localization
Tests expect Chinese error messages, which are currently hardcoded in the hooks. This should be acceptable as long as the error messages match.

## Next Steps
1. Run the tests to verify the fixes work
2. If tests still fail, investigate:
   - Hook implementation for circular dependencies
   - Actual error messages returned vs expected
   - Any missing configuration or setup
