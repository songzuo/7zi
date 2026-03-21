# API Integration Tests

## Overview

This directory contains integration tests for the 7zi-project API endpoints using Vitest and MSW (Mock Service Worker).

## Test Structure

```
api-integration-tests/
├── __tests__/                    # Test files
│   ├── auth.test.ts             # Authentication endpoints
│   ├── health.test.ts           # Health check endpoints
│   ├── tasks.test.ts            # Task CRUD operations
│   └── projects.test.ts         # Project CRUD operations
├── mocks/                       # MSW handlers and mocks
│   ├── handlers.ts              # API route handlers
│   ├── data.ts                  # Mock data generators
│   └── server.ts                # MSW server setup
└── utils/                       # Test utilities
    ├── test-helpers.ts          # Helper functions
    └── validators.ts            # Response validators
```

## Running Tests

```bash
# Run all integration tests
npm run test:api

# Run specific test suite
npm run test:api -- auth.test.ts

# Run with coverage
npm run test:api:coverage
```

## Test Coverage

- ✅ `/api/auth/*` - Authentication (login, logout, register, me, refresh)
- ✅ `/api/health` - Health check endpoints
- ⏳ `/api/tasks` - Task CRUD operations
- ⏳ `/api/projects` - Project CRUD operations

## Test Philosophy

1. **Independence**: Tests should not depend on external databases or services
2. **Isolation**: Each test should be self-contained and independent
3. **Coverage**: Tests should cover happy paths, error cases, and edge cases
4. **Clarity**: Tests should be easy to read and understand

## MSW Setup

MSW is used to mock HTTP requests in the test environment. The mock server is configured in `mocks/server.ts` and handlers are defined in `mocks/handlers.ts`.

## Contributing

When adding new tests:

1. Create a new test file in `__tests__/`
2. Add mock data to `mocks/data.ts` if needed
3. Add handlers to `mocks/handlers.ts` if needed
4. Update this README with the new endpoints
5. Ensure all tests pass before committing
