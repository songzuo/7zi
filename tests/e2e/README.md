# E2E Testing Framework

> 7zi Project - Enhanced End-to-End Testing Framework with Playwright

## 📋 Overview

This E2E testing framework provides comprehensive coverage of core user flows using Playwright. It follows best practices with Page Object Model (POM), robust reporting, and multi-browser support.

## 🗂️ Directory Structure

```
tests/e2e/
├── pages/                    # Page Object Models
│   ├── auth-page.ts         # Authentication page
│   ├── dashboard-page.ts    # Dashboard page
│   └── tasks-page.ts       # Task management page
├── fixtures/                 # Test data
│   └── test-data.ts        # Test users, tasks, and mock data
├── helpers/                  # Helper functions
│   └── test-helpers.ts     # Common test utilities
├── snapshots/               # Visual regression snapshots
├── auth-flow.spec.ts           # Authentication tests
├── dashboard-flow.spec.ts      # Dashboard tests
├── task-management-flow.spec.ts  # Task management tests
├── user-workflow.spec.ts       # Complete user workflow tests
├── homepage.spec.ts            # Landing/homepage tests (NEW)
├── navigation.spec.ts         # Navigation flow tests (NEW)
├── api-calls.spec.ts          # API endpoint tests (NEW)
└── playwright-report/         # HTML test reports
```

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install --with-deps

# Install browsers for all supported platforms
npx playwright install --with-deps chromium firefox webkit
```

### Running Tests

```bash
# Run all E2E tests with custom config
npx playwright test --config=playwright.tests.config.ts

# Run in UI mode (recommended for development)
npx playwright test --config=playwright.tests.config.ts --ui

# Run with debug mode
npx playwright test --config=playwright.tests.config.ts --debug

# Run specific test file
npx playwright test --config=playwright.tests.config.ts auth-flow.spec.ts

# Run tests matching a pattern
npx playwright test --config=playwright.tests.config.ts -g "should login"

# Run only Chromium
npx playwright test --config=playwright.tests.config.ts --project=chromium

# Run with slow motion
npx playwright test --config=playwright.tests.config.ts --slowMo=1000
```

## 📊 Test Coverage

### Core User Flows

| Test Suite      | Description                          | Test Cases | Status      |
| --------------- | ------------------------------------ | ---------- | ----------- |
| Authentication  | Login, registration, logout          | 15+ tests  | ✅ Complete |
| Dashboard       | Dashboard loading, navigation, stats | 15+ tests  | ✅ Complete |
| Task Management | Create, edit, delete, complete tasks | 20+ tests  | ✅ Complete |
| User Workflow   | Complete user journey                | 6 tests    | ✅ Complete |

### New Test Files (2026-04-21)

| Test Suite | File | Description | Test Cases |
|------------|------|-------------|-----------|
| Homepage | `homepage.spec.ts` | Landing page load, assets, nav links | 6 tests |
| Navigation | `navigation.spec.ts` | Sidebar nav, protected routes, auth nav | 10 tests |
| API Calls | `api-calls.spec.ts` | Auth API, direct endpoints, data loading | 9 tests |

### Browser Coverage

- ✅ Chromium (Desktop)
- ✅ Firefox (Desktop)
- ✅ WebKit/Safari (Desktop)
- ✅ Chrome (Mobile - Pixel 5)
- ✅ Safari (Mobile - iPhone 12)
- ✅ iPad (Tablet)

### Viewport Coverage

- ✅ 1920x1080 (Desktop)
- ✅ 1366x768 (Laptop)
- ✅ 768x1024 (Tablet)
- ✅ 393x851 (Mobile - Pixel 5)
- ✅ 390x844 (Mobile - iPhone 12)

## 📁 Test Files

### 1. Authentication Flow (`auth-flow.spec.ts`)

Tests all authentication-related functionality:

- Login page display and form validation
- Login with valid and invalid credentials
- User registration with validation
- Email format validation
- Password validation (length, mismatch)
- Logout functionality
- Protected route access control
- Social login buttons
- Session persistence
- Navigation between auth pages

### 2. Dashboard Flow (`dashboard-flow.spec.ts`)

Tests dashboard functionality:

- Dashboard loading and display
- Welcome message and user information
- Statistics cards (tasks, completion, overdue, team)
- Sidebar navigation
- Navigation to tasks, team, analytics, settings
- Dashboard actions (new task, refresh)
- Search functionality
- Task list display
- Responsive design (desktop, tablet, mobile)
- Performance metrics

### 3. Task Management Flow (`task-management-flow.spec.ts`)

Tests complete task lifecycle:

- Task page loading
- Task creation (all fields, minimal fields)
- Task validation (required fields, length)
- Task editing (title, description, priority)
- Task deletion
- Task completion
- Task search and filtering
- Empty states
- Task display (priority, assignee, due date)
- Performance metrics
- Screenshots

### 4. User Workflow (`user-workflow.spec.ts`)

Tests complete user journeys:

- Full registration → login → dashboard → create task workflow
- Quick task creation from dashboard
- Navigation through all main pages
- Session persistence
- Error scenario handling
- Responsive design across viewports

## 🏗️ Page Object Model

### Pages

- **AuthPage**: Handles login, registration, logout
- **DashboardPage**: Handles dashboard navigation and stats
- **TasksPage**: Handles task CRUD operations

### Example Usage

```typescript
import { test } from '@playwright/test'
import { AuthPage } from '../pages/auth-page'
import { DashboardPage } from '../pages/dashboard-page'

test('should login and access dashboard', async ({ page }) => {
  const authPage = new AuthPage(page)
  const dashboardPage = new DashboardPage(page)

  // Login
  await authPage.gotoLogin()
  await authPage.login('test@example.com', 'password123')

  // Access dashboard
  await dashboardPage.goto()
  await dashboardPage.waitForLoad()

  // Verify
  expect(await dashboardPage.isOnDashboard()).toBeTruthy()
})
```

## 🛠️ Configuration

### Main Configuration File

`playwright.tests.config.ts` includes:

- Multi-browser and device configurations
- Enhanced reporting (HTML, JSON, JUnit)
- Trace on failure
- Screenshot and video recording
- Visual regression testing
- Custom timeouts

### Environment Variables

Create `.env.test`:

```env
BASE_URL=http://localhost:3000
TEST_USER_EMAIL=test@7zi.com
TEST_USER_PASSWORD=test123456
ADMIN_EMAIL=admin@7zi.com
ADMIN_PASSWORD=admin123456
```

## 📈 Test Reports

### HTML Report

```bash
npx playwright test --config=playwright.tests.config.ts
npx playwright show-report tests/e2e/playwright-report
```

HTML report includes:

- Test results and status
- Screenshots on failure
- Videos on failure
- Execution time
- Error details
- Trace viewer

### JSON Report

Generated at: `tests/e2e/test-results/test-results.json`

### JUnit Report

Generated at: `tests/e2e/test-results/junit-results.xml`

Useful for CI/CD integration.

## 🎯 Best Practices

### Test Organization

- Use `test.describe()` for grouping related tests
- Use `test.beforeEach()` for common setup
- Use semantic test names describing user behavior
- Keep tests independent and isolated

### Page Object Model

- Encapsulate page details in page objects
- Reuse page objects across tests
- Use descriptive method names
- Keep page selectors in one place

### Test Data

- Use fixtures for consistent test data
- Generate unique data for each test run
- Avoid hardcoded test values
- Use environment variables for sensitive data

### Selectors

- Prioritize Playwright's semantic selectors
- Use `getByRole()`, `getByText()`, `getByLabel()`
- Avoid CSS classes and XPath
- Use `data-testid` for custom elements

### Waiting

- Use automatic waiting when possible
- Use `waitForLoadState('networkidle')`
- Avoid hardcoded delays
- Wait for specific conditions

## 🐛 Debugging

### Playwright Inspector

```bash
npx playwright test --config=playwright.tests.config.ts --debug
```

### Slow Motion Mode

```bash
npx playwright test --config=playwright.tests.config.ts --slowMo=1000
```

### Pause Execution

```typescript
await page.pause()
```

### Trace Viewer

View traces from failed tests:

```bash
npx playwright show-trace tests/e2e/test-results/trace.zip
```

### Screenshots

Screenshots are automatically taken on failures.

Manual screenshots:

```typescript
import { takeScreenshot } from '../helpers/test-helpers'
await takeScreenshot(page, 'my-test-case')
```

## 🔧 Helper Functions

Common utilities in `helpers/test-helpers.ts`:

- `waitForPageLoad()` - Wait for page to load
- `waitForElementStable()` - Wait for element stability
- `fillForm()` - Fill multiple form fields
- `clickWithRetry()` - Click with retry logic
- `takeScreenshot()` - Capture screenshots
- `waitForToast()` - Wait for notifications
- `generateRandomEmail()` - Generate test email
- `generateRandomTitle()` - Generate test title

## 📝 Test Data

Fixtures in `fixtures/test-data.ts`:

- `testUsers` - Predefined test users
- `testTasks` - Predefined test tasks
- `pageContent` - Expected page content
- `testURLs` - Test URLs
- `errorMessages` - Expected error messages
- `successMessages` - Expected success messages

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: npm ci
      - run: npx playwright install --with-deps

      - run: npx playwright test --config=playwright.tests.config.ts

      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: tests/e2e/playwright-report/
```

## 📊 Coverage Report

Current test coverage:

- **Test Files**: 4
- **Total Test Cases**: 56+
- **Browser Coverage**: 3 desktop + 2 mobile + 1 tablet
- **Total Executions**: 336+ (56 tests × 6 configurations)

## 🔄 Maintenance

### Adding New Tests

1. Create new test file in `tests/e2e/`
2. Import necessary page objects
3. Write test cases using Playwright API
4. Run tests to verify
5. Commit changes

### Adding New Page Objects

1. Create new page object file in `tests/e2e/pages/`
2. Extend base page object pattern
3. Add necessary locators and methods
4. Export in page index
5. Use in tests

### Updating Test Data

1. Edit `tests/e2e/fixtures/test-data.ts`
2. Add/update test users, tasks, or data
3. Ensure data is valid and unique
4. Update tests if needed

## 📚 Related Documentation

- [Playwright Documentation](https://playwright.dev/)
- [Project README](/README.md)
- [Testing Guide](/TESTING.md)
- [E2E Framework (Original)](/e2e/README.md)

## 🤝 Contributing

When contributing E2E tests:

1. Follow the existing structure and patterns
2. Use Page Object Model for page interactions
3. Write clear, descriptive test names
4. Ensure tests are independent
5. Add comments for complex logic
6. Update documentation as needed

## 📞 Support

For issues or questions:

1. Check Playwright documentation
2. Review test logs and traces
3. Consult project documentation
4. Contact the development team

---

**Framework Version**: 1.0.0
**Last Updated**: 2026-03-22
**Maintainer**: 🧪 Testing Team
