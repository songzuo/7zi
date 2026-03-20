# Database Mock Fix - Status Report

## Problem Summary
The 7zi-project has 100+ tests failing due to database connection issues. Tests are trying to use real SQLite database instead of properly mocked database.

## Root Cause
1. Tests import from `@/lib/db/index` which tries to connect to real SQLite
2. No comprehensive database mock was configured
3. Mock setup wasn't properly persisting data across SQL operations

## Solutions Attempted

### Attempt 1: Basic Mock Setup
- Created `/root/.openclaw/workspace/7zi-project/src/test/vi-mocks.ts`
- Configured in `vitest.config.ts` as first setup file
- Mocked `getDatabaseAsync`, `getDatabase`, `initializeDatabase`

### Attempt 2: In-Memory Database Mock
- Implemented full SQL parsing for INSERT, UPDATE, DELETE, SELECT
- Created in-memory storage for tables
- Mock functions for `prepare`, `exec`, `pragma`, `batch`

### Attempt 3: Simplified Mock with ID Preservation
- Tried to preserve IDs from INSERT statements
- Used closure to share data across prepare calls

### Current Status: PARTIALLY WORKING
- 12 out of 25 tests now passing (was 0 before)
- Remaining failures are due to data not persisting across SQL operations
- The mock creates a new statement on each `prepare()` call
- Data from INSERT is not visible to subsequent SELECT calls

## Remaining Issues

### Issue 1: Data Persistence
When `createUser()` executes:
1. Calls `prepare('INSERT ...')` → inserts data into `dbData['users']`
2. Returns user object with ID
3. Later, `getUserById()` calls `prepare('SELECT ...')`
4. The SELECT statement's mock returns `[]` instead of finding the inserted user

This suggests each `prepare()` call creates isolated closures that don't share the same data reference.

### Issue 2: ID Mismatch
The `createUser` function generates its own ID using `generateId()` and passes it to INSERT.
The mock database may or may not use this ID, causing lookup failures.

### Issue 3: Hook Execution Order
The mock setup's `beforeEach` vs test file's `beforeEach` may conflict.
Tests have their own `beforeEach` that creates users, which needs database state preserved.

## Files Modified

1. **Created**: `/root/.openclaw/workspace/7zi-project/src/test/vi-mocks.ts`
   - Comprehensive database mock
   - In-memory data storage
   - SQL statement parsing

2. **Modified**: `/root/.openclaw/workspace/7zi-project/vitest.config.ts`
   - Added `./src/test/vi-mocks.ts` to setupFiles

3. **Modified**: `/root/.openclaw/workspace/7zi-project/src/test/setup.tsx`
   - Import database mock helpers

## What's Working

- Password hashing/verification tests (2 passing)
- User deletion (1 passing)
- User registration service (1 passing)
- Password validation tests (4 passing)
- Permission checking (3 passing)
- Token invalidation (1 passing)

## What's Still Failing

- User CRUD operations (5 failing)
- Password reset operations (3 failing)
- Login/logout service tests (3 failing)
- Duplicate email detection (1 failing)

## Recommended Next Steps

### Option 1: Fix the Current Mock Architecture
The core issue is that each `prepare()` call creates new closures. Need to:
1. Ensure `dbData` is truly shared across all prepare calls
2. Debug why INSERT data isn't visible to SELECT
3. Add logging to trace data flow

### Option 2: Use sqlite3 In-Memory Database
Instead of mocking, use real SQLite with in-memory database:
```typescript
const db = new Database(':memory:');
```
This would be more reliable but requires proper cleanup between tests.

### Option 3: Stub at Repository Level
Mock repository functions directly instead of database:
```typescript
vi.mock('@/lib/auth/repository', () => ({
  createUser: vi.fn(),
  getUserById: vi.fn(),
  // etc.
}));
```
This is simpler but doesn't test database interaction code.

### Option 4: Use Test Database with Temporary File
Create a temporary SQLite file for tests and clean it up after each test suite.

## Conclusion

Significant progress was made: 0 → 12 passing tests.

The fundamental architecture is sound (in-memory mock), but data sharing between SQL operations needs debugging. The most promising next step is Option 1 - fix the closure/data sharing issue in the mock, or Option 2 - switch to real in-memory SQLite database for simplicity and reliability.
