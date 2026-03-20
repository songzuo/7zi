# Testing System Quick Start Guide

## 🚀 Quick Start

```bash
# Run all tests
npm run test:all

# Run unit tests only
npm run test:run

# Run with coverage
npm run test:coverage

# Run API tests
npm run test:api

# Run E2E tests
npm run test:e2e

# Watch mode (development)
npm run test:watch
```

## 📊 Current Status

- **Test Files:** 144
- **Total Tests:** 3,806
- **Coverage:** 60% (target: 80%)
- **Pass Rate:** ~90% (needs improvement)

## 📁 Key Files

- `TESTING_GUIDE.md` - Comprehensive testing documentation
- `vitest.config.ts` - Vitest configuration
- `playwright.config.ts` - Playwright configuration
- `.env.test` - Test environment variables
- `scripts/analyze-coverage.sh` - Coverage analysis script
- `src/test/` - Test utilities and setup

## 🎯 Test Categories

### Unit Tests (`src/**/*.test.ts`)
Test individual functions and components in isolation.

### Integration Tests (`src/test/integration/`)
Test how multiple parts work together.

### API Tests (`src/app/api/**/route.test.ts`)
Test API endpoints with mocked dependencies.

### E2E Tests (`e2e/*.spec.ts`)
Test user flows through the browser with Playwright.

## 🔍 Coverage Analysis

```bash
# Analyze coverage with detailed report
npm run test:analyze

# Or use the script directly
./scripts/analyze-coverage.sh
```

## 📝 Writing Tests

### Basic Test Pattern

```typescript
import { describe, it, expect } from 'vitest'

describe('FeatureName', () => {
  it('should do something', () => {
    // Arrange
    const input = 'value'

    // Act
    const result = doSomething(input)

    // Assert
    expect(result).toBe('expected')
  })
})
```

### API Route Test

```typescript
import { POST } from './route'
import { mockRequest } from '@/test/api/test-helpers'

describe('POST /api/endpoint', () => {
  it('should handle request', async () => {
    const request = mockRequest({ key: 'value' })
    const response = await POST(request)

    expect(response.status).toBe(200)
  })
})
```

### E2E Test

```typescript
import { test, expect } from '@playwright/test'

test('user flow', async ({ page }) => {
  await page.goto('/')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
})
```

## 🚦 CI/CD

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests
- Manual workflow dispatch

Workflows:
- `.github/workflows/tests.yml` - Testing workflow
- `.github/workflows/ci.yml` - Full CI
- `.github/workflows/ci-cd.yml` - CI/CD pipeline

## 📖 Documentation

For detailed information, see:
- **TESTING_GUIDE.md** - Comprehensive guide
- **TESTING_IMPLEMENTATION_REPORT.md** - Implementation details
- **src/test/api/test-helpers.ts** - Test utilities

## 🐛 Troubleshooting

### Tests Time Out
```typescript
// Increase timeout in vitest.config.ts
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

### Database Lock Issues
```bash
export DATABASE_PATH=/tmp/test-7zi.db
npm run test:run
```

## 🎓 Best Practices

✅ **DO:**
- Write descriptive test names
- Follow AAA (Arrange-Act-Assert) pattern
- Test behavior, not implementation
- Use beforeEach to clean state
- Group related tests with describe

❌ **DON'T:**
- Don't test external libraries
- Don't write flaky tests
- Don't test private methods
- Don't repeat test setup
- Don't ignore coverage warnings

## 📞 Support

1. Check existing test files for examples
2. Review TESTING_GUIDE.md
3. Consult Vitest/Playwright docs
4. Ask in team chat

---

**Status:** ✅ Testing system implemented and operational
**Last Updated:** 2026-03-19
