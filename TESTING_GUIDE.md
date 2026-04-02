# Automated Testing System Guide

## Overview

The 7zi-project has a comprehensive automated testing system built with **Vitest** for unit/integration tests and **Playwright** for E2E testing.

## Test Structure

```
7zi-project/
├── src/
│   ├── test/                          # Test utilities and setup
│   │   ├── setup.tsx                 # Global test setup
│   │   ├── setup-db-mock.ts          # Database mocking
│   │   ├── vi-mocks.ts               # Vitest mocks
│   │   ├── test-env.ts               # Environment configuration
│   │   ├── test-utils.tsx            # Test helper functions
│   │   ├── api/                      # API route test helpers
│   │   ├── components/              # Component test helpers
│   │   ├── integration/             # Integration test helpers
│   │   ├── mocks/                   # Mock data
│   │   └── security/                # Security test utilities
│   └── **/                           # Source code
│       ├── __tests__/                # Unit tests
│       └── *.test.ts                 # Test files
├── app/api/**/*.test.ts              # API route tests
├── e2e/                              # E2E tests
│   ├── auth.spec.ts                 # Authentication tests
│   ├── dashboard.spec.ts            # Dashboard tests
│   └── ...
├── vitest.config.ts                  # Vitest configuration
├── playwright.config.ts              # Playwright configuration
├── .env.test                         # Test environment variables
└── package.json                     # Test scripts
```

## Quick Start

### Run All Tests

```bash
npm run test:all
```

### Run Unit Tests Only

```bash
npm run test:run
```

### Run With Coverage

```bash
npm run test:coverage
```

### Watch Mode

```bash
npm run test:watch
```

### Run Specific Test Suite

```bash
npm run test:api          # API route tests
npm run test:components   # Component tests
npm run test:unit         # All unit tests
npm run test:integration  # Integration tests
```

### E2E Tests

```bash
npm run test:e2e          # Run E2E tests
npm run test:e2e:ui       # Run with UI
npm run test:e2e:debug    # Debug mode
```

## Test Categories

### 1. Unit Tests

Test individual functions and components in isolation.

**Location:** `src/**/__tests__/*.test.ts` and `src/**/*.test.ts`

**Examples:**

- Utility functions
- Component logic
- Data transformations
- Type validators

```typescript
import { describe, it, expect } from 'vitest'
import { validateEmail } from './utils'

describe('validateEmail', () => {
  it('should return true for valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true)
  })

  it('should return false for invalid emails', () => {
    expect(validateEmail('invalid')).toBe(false)
  })
})
```

### 2. Integration Tests

Test how multiple parts work together.

**Location:** `src/test/integration/*.test.ts`

**Examples:**

- API route + database operations
- Component + store interactions
- Cache + data fetching

```typescript
describe('User Integration', () => {
  it('should create user and fetch from database', async () => {
    const user = await createUser({ email: 'test@example.com' })
    const fetched = await getUser(user.id)
    expect(fetched.email).toBe('test@example.com')
  })
})
```

### 3. API Route Tests

Test API endpoints with mocked dependencies.

**Location:** `src/app/api/**/route.test.ts`

**Examples:**

- Request validation
- Authentication flow
- Error handling
- Response formatting

```typescript
import { POST } from './route'

describe('POST /api/auth/login', () => {
  it('should authenticate user with valid credentials', async () => {
    const request = mockRequest({
      email: 'user@example.com',
      password: 'password123',
    })
    const response = await POST(request)
    expect(response.status).toBe(200)
  })
})
```

### 4. E2E Tests

Test user flows through the browser.

**Location:** `e2e/*.spec.ts`

**Examples:**

- Login/logout flows
- CRUD operations
- Navigation
- Form submissions

```typescript
import { test, expect } from '@playwright/test'

test('user can login', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'user@example.com')
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
})
```

## Coverage Requirements

### Current Thresholds

- **Lines:** 60%
- **Functions:** 60%
- **Branches:** 50%
- **Statements:** 60%

### Goal Thresholds

- **Lines:** 80%
- **Functions:** 80%
- **Branches:** 70%
- **Statements:** 80%

### View Coverage Report

```bash
npm run test:coverage
open coverage/index.html
```

### Check Coverage With CI

```bash
npm run test:coverage:check
```

## Writing Tests

### Test Organization

```typescript
// 1. Describe the module being tested
describe('FeatureName', () => {
  // 2. Group related tests
  describe('happy path', () => {
    it('should do X', () => {
      // Arrange
      const input = 'value'

      // Act
      const result = doSomething(input)

      // Assert
      expect(result).toBe('expected')
    })
  })

  describe('edge cases', () => {
    it('should handle empty input', () => {
      // ...
    })

    it('should handle null input', () => {
      // ...
    })
  })

  describe('error handling', () => {
    it('should throw on invalid input', () => {
      expect(() => doSomething('invalid')).toThrow()
    })
  })
})
```

### Mocking Dependencies

```typescript
import { vi } from 'vitest'
import { myFunction } from './module'
import { externalDependency } from './external'

// Mock entire module
vi.mock('./external', () => ({
  externalDependency: vi.fn(),
}))

// In your test
it('should use mocked dependency', () => {
  vi.mocked(externalDependency).mockReturnValue('mocked')
  const result = myFunction()
  expect(externalDependency).toHaveBeenCalled()
})
```

### Testing Async Code

```typescript
describe('async operations', () => {
  it('should resolve with correct value', async () => {
    const result = await fetchData()
    expect(result).toEqual({ success: true })
  })

  it('should reject on error', async () => {
    await expect(fetchDataThatFails()).rejects.toThrow('Error message')
  })

  it('should timeout after 5 seconds', async () => {
    await expect(slowOperation(), { timeout: 5000 }).resolves.toBe('done')
  })
})
```

### Testing React Components

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('should render title', () => {
    render(<MyComponent title="Hello" />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('should call onClick when button clicked', () => {
    const handleClick = vi.fn()
    render(<MyComponent onClick={handleClick} />)

    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should update state on input change', () => {
    render(<MyComponent />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test' } })

    expect(input).toHaveValue('test')
  })
})
```

### Testing API Routes

```typescript
import { POST, GET } from './route'

describe('API Route', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    mockRequest = {
      json: vi.fn(),
      nextUrl: {
        pathname: '/api/test',
      },
    } as unknown as NextRequest
  })

  it('should handle POST request', async () => {
    mockRequest.json = vi.fn().mockResolvedValue({
      email: 'test@example.com',
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
```

## Test-Driven Development (TDD)

### Red-Green-Refactor Cycle

1. **Red:** Write a failing test

```typescript
it('should calculate tax', () => {
  expect(calculateTax(100, 0.1)).toBe(10)
})
```

2. **Green:** Make it pass

```typescript
export function calculateTax(price: number, rate: number): number {
  return price * rate
}
```

3. **Refactor:** Improve the code

```typescript
export function calculateTax(price: number, rate: number): number {
  const validatedRate = Math.max(0, Math.min(1, rate))
  return Math.round(price * validatedRate * 100) / 100
}
```

## CI/CD Integration

### GitHub Actions

Tests run automatically on:

- Push to `main` or `develop`
- Pull requests
- Manual workflow dispatch

### Workflow Files

- `.github/workflows/tests.yml` - Testing workflow
- `.github/workflows/ci.yml` - Full CI with tests
- `.github/workflows/ci-cd.yml` - CI/CD pipeline

### Local CI Testing

```bash
npm run test:ci
```

## Best Practices

### DO ✅

1. **Write descriptive test names**

   ```typescript
   it('should return 400 when email is invalid')
   ```

2. **Follow AAA pattern**
   - **Arrange** - Setup test data
   - **Act** - Execute the code
   - **Assert** - Verify results

3. **Test behavior, not implementation**

   ```typescript
   // Good
   expect(response.status).toBe(200)

   // Bad (testing implementation)
   expect(mockFetch).toHaveBeenCalledWith('api/users')
   ```

4. **Use beforeEach to clean state**

   ```typescript
   beforeEach(() => {
     vi.clearAllMocks()
     resetMockDatabase()
   })
   ```

5. **Group related tests** with describe blocks

### DON'T ❌

1. **Don't test external libraries**

   ```typescript
   // Bad
   it('should work like fetch', async () => {
     const response = await fetch('https://api.example.com')
     // Don't test fetch, test your code
   })
   ```

2. **Don't write flaky tests**
   - Avoid timeouts when possible
   - Mock network requests
   - Use deterministic data

3. **Don't test private methods**
   - Test public API only
   - Private implementation details can change

4. **Don't repeat test setup**
   - Use `beforeEach` and test helpers

5. **Don't ignore coverage warnings**
   - Address low coverage areas
   - Add tests for missing branches

## Troubleshooting

### Tests Time Out

```bash
# Increase timeout in vitest.config.ts
testTimeout: 30000
```

### Mocks Not Working

```typescript
// Clear mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  vi.resetAllMocks()
})
```

### Coverage Not Generated

```bash
# Clean coverage directory
rm -rf coverage
npm run test:coverage
```

### Database Lock Issues

```bash
# Use test database path
export DATABASE_PATH=/tmp/test-7zi.db
npm run test:run
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Jest Documentation](https://jestjs.io/) (for reference)

## Support

For test-related questions:

1. Check existing test files for examples
2. Review this guide
3. Consult Vitest/Playwright docs
4. Ask in team chat
