# E2E Testing Framework - Quick Start Guide

> 🧪 Testing Agent - Quick Start Guide
> Date: 2026-03-22

---

## 🚀 Quick Commands

### Run All Tests

```bash
# Using new framework
npm run test:e2e:new

# Using UI mode (recommended for development)
npm run test:e2e:new:ui

# Using debug mode
npm run test:e2e:new:debug
```

### Run Specific Test Files

```bash
# Authentication tests
npx playwright test --config=playwright.tests.config.ts tests/e2e/auth-flow.spec.ts

# Dashboard tests
npx playwright test --config=playwright.tests.config.ts tests/e2e/dashboard-flow.spec.ts

# Task management tests
npx playwright test --config=playwright.tests.config.ts tests/e2e/task-management-flow.spec.ts

# User workflow tests
npx playwright test --config=playwright.tests.config.ts tests/e2e/user-workflow.spec.ts
```

### Run Specific Test Cases

```bash
# Run tests matching a pattern
npx playwright test --config=playwright.tests.config.ts -g "should login with valid credentials"

# Run tests in specific file matching a pattern
npx playwright test --config=playwright.tests.config.ts auth-flow.spec.ts -g "should logout"
```

### Run on Specific Browser

```bash
# Only Chromium
npx playwright test --config=playwright.tests.config.ts --project=chromium

# Only Firefox
npx playwright test --config=playwright.tests.config.ts --project=firefox

# Only WebKit
npx playwright test --config=playwright.tests.config.ts --project=webkit

# Only Mobile Chrome
npx playwright test --config=playwright.tests.config.ts --project="Mobile Chrome"

# Only Mobile Safari
npx playwright test --config=playwright.tests.config.ts --project="Mobile Safari"
```

### View Reports

```bash
# HTML Report
npm run test:e2e:new:report

# Or directly
npx playwright show-report tests/e2e/playwright-report
```

---

## 📁 File Structure

```
tests/e2e/
├── pages/
│   ├── auth-page.ts              # Login/Registration/Logout
│   ├── dashboard-page.ts         # Dashboard navigation
│   └── tasks-page.ts             # Task CRUD operations
├── fixtures/
│   └── test-data.ts              # Test users, tasks, mock data
├── helpers/
│   └── test-helpers.ts           # Helper functions
├── auth-flow.spec.ts             # 15+ authentication tests
├── dashboard-flow.spec.ts        # 15+ dashboard tests
├── task-management-flow.spec.ts   # 20+ task management tests
└── user-workflow.spec.ts         # 6 complete user workflow tests
```

---

## 📊 Test Overview

| Test Suite                     | Test Cases | Description                                      |
| ------------------------------ | ---------- | ------------------------------------------------ |
| `auth-flow.spec.ts`            | 15+        | Login, registration, logout, protected routes    |
| `dashboard-flow.spec.ts`       | 15+        | Dashboard loading, navigation, stats, responsive |
| `task-management-flow.spec.ts` | 20+        | Task CRUD operations, search, validation         |
| `user-workflow.spec.ts`        | 6          | Complete user journeys, session, errors          |

**Total**: 56+ test cases
**Total Executions**: 336+ (56 × 6 browser/device configs)

---

## 🎯 Key Features

### ✅ Page Object Model

Encapsulates page interactions in reusable classes:

```typescript
import { AuthPage, DashboardPage } from '../pages'

test('example test', async ({ page }) => {
  const authPage = new AuthPage(page)
  const dashboardPage = new DashboardPage(page)

  await authPage.login('user@example.com', 'password')
  await dashboardPage.goto()
  expect(await dashboardPage.isOnDashboard()).toBeTruthy()
})
```

### ✅ Comprehensive Test Data

Pre-configured test users, tasks, and mock data:

```typescript
import { testUsers, testTasks } from '../fixtures/test-data'

// Use predefined test data
await authPage.login(testUsers.regular.email, testUsers.regular.password)
await tasksPage.createTask(testTasks.highPriority)
```

### ✅ Helper Functions

Utility functions for common operations:

```typescript
import {
  waitForPageLoad,
  takeScreenshot,
  generateRandomEmail,
  generateRandomTitle,
} from '../helpers/test-helpers'

await waitForPageLoad(page)
await takeScreenshot(page, 'test-case')
const newEmail = generateRandomEmail()
const newTitle = generateRandomTitle()
```

### ✅ Enhanced Reporting

Multiple report formats:

- **HTML**: Visual report with screenshots, videos, traces
- **JSON**: CI/CD integration
- **JUnit**: Test tracking
- **GitHub Actions**: PR annotations

---

## 🔧 Setup Requirements

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Playwright Browsers

```bash
npx playwright install --with-deps

# Or install specific browsers
npx playwright install --with-deps chromium firefox webkit
```

### 3. Environment Variables (Optional)

Create `.env.test`:

```env
BASE_URL=http://localhost:3000
TEST_USER_EMAIL=test@7zi.com
TEST_USER_PASSWORD=test123456
ADMIN_EMAIL=admin@7zi.com
ADMIN_PASSWORD=admin123456
```

---

## 📝 Writing New Tests

### Basic Test Template

```typescript
import { test, expect } from '@playwright/test'
import { AuthPage } from '../pages/auth-page'

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    const authPage = new AuthPage(page)

    // Test steps
    await authPage.gotoLogin()

    // Assertions
    expect(page.url()).toContain('/login')
  })
})
```

### Using Page Objects

```typescript
import { test, expect } from '@playwright/test'
import { AuthPage, DashboardPage, TasksPage } from '../pages'

test('should create task after login', async ({ page }) => {
  const authPage = new AuthPage(page)
  const dashboardPage = new DashboardPage(page)
  const tasksPage = new TasksPage(page)

  // Login
  await authPage.login('user@example.com', 'password')

  // Navigate
  await dashboardPage.goto()

  // Create task
  await tasksPage.createTask({
    title: 'Test Task',
    description: 'Test description',
    priority: 'high',
  })

  // Verify
  expect(await tasksPage.taskExists('Test Task')).toBeTruthy()
})
```

### Using Test Data

```typescript
import { test, expect } from '@playwright/test'
import { testUsers, testTasks, generateRandomTitle } from '../fixtures/test-data'

test('should create task with test data', async ({ page }) => {
  const tasksPage = new TasksPage(page)

  const taskTitle = generateRandomTitle()

  await tasksPage.createTask({
    title: taskTitle,
    description: testTasks.highPriority.description,
    priority: 'medium',
  })

  expect(await tasksPage.taskExists(taskTitle)).toBeTruthy()
})
```

---

## 🐛 Debugging

### Playwright Inspector (UI Mode)

```bash
npm run test:e2e:new:ui
```

Features:

- Step-by-step execution
- Live DOM inspection
- Console logs
- Network inspection

### Debug Mode

```bash
npm run test:e2e:new:debug
```

Features:

- Pauses at each step
- Interactive debugging
- Time-travel debugging

### Slow Motion Mode

```bash
npx playwright test --config=playwright.tests.config.ts --slowMo=1000
```

### Manual Pause

```typescript
test('debug this test', async ({ page }) => {
  // Pause execution
  await page.pause()

  // Continue when ready
})
```

### View Trace (After Failure)

```bash
npx playwright show-trace tests/e2e/test-results/trace.zip
```

---

## 📈 Test Reports

### HTML Report

Run tests, then:

```bash
npm run test:e2e:new:report
```

Open in browser: `http://localhost:9324`

### JSON Report

Location: `tests/e2e/test-results/test-results.json`

### JUnit Report

Location: `tests/e2e/test-results/junit-results.xml`

### Screenshots

Location: `tests/e2e/test-results/screenshots/`

Taken automatically on failure.

### Videos

Location: `tests/e2e/test-results/videos/`

Recorded on failure.

### Traces

Location: `tests/e2e/test-results/traces/`

Captured on first retry.

---

## 🎨 Page Objects

### AuthPage

```typescript
const authPage = new AuthPage(page)

// Navigation
await authPage.gotoLogin()
await authPage.gotoRegistration()

// Actions
await authPage.login(email, password)
await authPage.register(name, email, password)
await authPage.logout()
await authPage.loginWithRemember(email, password)

// Messages
const success = await authPage.getSuccessMessage()
const error = await authPage.getErrorMessage()

// State
const isLogin = await authPage.isOnLoginPage()
const isRegister = await authPage.isOnRegistrationPage()
```

### DashboardPage

```typescript
const dashboardPage = new DashboardPage(page)

// Navigation
await dashboardPage.goto()
await dashboardPage.navigateToTasks()
await dashboardPage.navigateToTeam()
await dashboardPage.navigateToAnalytics()
await dashboardPage.navigateToSettings()

// Actions
await dashboardPage.search(query)
await dashboardPage.clickNewTask()
await dashboardPage.refresh()

// Data
const welcome = await dashboardPage.getWelcomeMessage()
const userName = await dashboardPage.getUserName()
const statsCount = await dashboardPage.getStatsCardsCount()

// State
const isDashboard = await dashboardPage.isOnDashboard()
```

### TasksPage

```typescript
const tasksPage = new TasksPage(page)

// Navigation
await tasksPage.goto()

// CRUD
await tasksPage.createTask(taskData)
await tasksPage.editTask(title, updates)
await tasksPage.deleteTask(title)
await tasksPage.completeTask(title)

// Search
await tasksPage.searchTask(query)

// Data
const exists = await tasksPage.taskExists(title)
const count = await tasksPage.getTaskListItemsCount()

// Messages
const success = await tasksPage.getSuccessMessage()
const error = await tasksPage.getErrorMessage()
```

---

## 🚦 Browser Configurations

The framework runs tests on 6 different configurations:

1. **Chromium Desktop** (1920x1080)
2. **Firefox Desktop** (1920x1080)
3. **WebKit/Safari Desktop** (1920x1080)
4. **Mobile Chrome** (Pixel 5 - 393x851)
5. **Mobile Safari** (iPhone 12 - 390x844)
6. **iPad** (Tablet - 1024x1366)

### Run on Specific Config

```bash
# Desktop only
npx playwright test --config=playwright.tests.config.ts --project=chromium

# Mobile only
npx playwright test --config=playwright.tests.config.ts --project="Mobile Chrome"

# All desktop browsers
npx playwright test --config=playwright.tests.config.ts --project=chromium --project=firefox --project=webkit
```

---

## 💡 Tips & Best Practices

### 1. Use Page Objects

Always use page objects instead of direct page interactions.

```typescript
// ✅ Good
await authPage.login(email, password)

// ❌ Bad
await page.goto('/login')
await page.fill('input[name="email"]', email)
await page.fill('input[name="password"]', password)
await page.click('button[type="submit"]')
```

### 2. Use Test Data Fixtures

Use predefined test data for consistency.

```typescript
// ✅ Good
await authPage.login(testUsers.regular.email, testUsers.regular.password)

// ❌ Bad
await authPage.login('user@example.com', 'password123')
```

### 3. Wait Properly

Use Playwright's automatic waiting when possible.

```typescript
// ✅ Good
await expect(page.locator('.element')).toBeVisible()

// ❌ Bad
await page.waitForTimeout(5000)
```

### 4. Use Descriptive Test Names

Make test names describe user behavior.

```typescript
// ✅ Good
test('should display error message when email is invalid', async ({ page }) => {})

// ❌ Bad
test('test1', async ({ page }) => {})
```

### 5. Keep Tests Independent

Each test should run independently.

```typescript
test.beforeEach(async ({ page }) => {
  // Clean up before each test
  await clearLocalStorage(page)
})
```

---

## 📚 Additional Resources

- **Full Documentation**: See `tests/e2e/README.md`
- **Completion Report**: See `E2E_FRAMEWORK_COMPLETION_REPORT.md`
- **Playwright Docs**: https://playwright.dev/
- **Project Docs**: See project root docs/

---

## 🆘 Troubleshooting

### Tests Failing with "Element Not Found"

- Increase timeout: `test.setTimeout(60000)`
- Check selectors are correct
- Use UI mode to inspect elements

### Tests Flaky (Intermittent Failures)

- Add retries: `test('test name', async () => {}, { retries: 3 })`
- Ensure proper waiting
- Check for race conditions

### Tests Running Slow

- Use `--project=chromium` to test single browser
- Disable video recording temporarily
- Check for unnecessary waits

### Can't Access Application

- Ensure app is running: `npm run dev`
- Check baseURL in config
- Verify port is correct

---

**Quick Start Guide Complete** ✅

For detailed documentation, see `tests/e2e/README.md`
