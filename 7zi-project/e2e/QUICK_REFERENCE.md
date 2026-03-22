# E2E Test Suite - Quick Reference

## 📊 Quick Stats

- **Total Tests:** 3,106 (across 5 browser/device configs)
- **Test Files:** 24
- **Page Objects:** 15
- **Test Helpers:** 40+
- **User Flows:** 10
- **Pages Tested:** 12

## 🚀 Quick Commands

```bash
# Run all tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# View test report
npm run test:e2e:report

# List all tests
npx playwright test --list

# Run specific file
npx playwright test login-flow-pom.spec.ts
```

## 📁 Key Files

```
e2e/
├── pages/                    # 15 Page Objects
│   ├── index.ts             # Export all pages
│   ├── home-page.ts         # Home
│   ├── login-page.ts        # Login
│   ├── dashboard-page.ts    # Dashboard
│   ├── tasks-page.ts        # Tasks
│   ├── team-page.ts         # Team
│   ├── settings-page.ts     # Settings
│   └── ...                  # 8 more
├── helpers/
│   └── test-helpers.ts      # 40+ utility functions
├── fixtures/
│   └── test-data.ts         # Test data factory
├── auth-flow.spec.ts        # 17 tests
├── dashboard.spec.ts        # 21 tests
├── task-creation.spec.ts    # 24 tests
└── ...                      # 21 more test files
```

## 🎯 Key User Flows

| # | Flow | Test Files | Tests |
|---|------|------------|-------|
| 1 | Authentication | auth-flow, login-flow-pom | 34 |
| 2 | Registration | user-registration | 18 |
| 3 | Dashboard | dashboard, dashboard-analytics | 51 |
| 4 | Task Management | task-creation, task-creation-pom | 43 |
| 5 | Team Management | team | 27 |
| 6 | Navigation | navigation, navigation-pom, integration | 35 |
| 7 | User Settings | user-management | 23 |
| 8 | Notifications | notifications | 30 |
| 9 | Analytics | dashboard-analytics | 30 |
| 10 | Real-time | websocket-realtime | 27 |

## 🌐 Browser Coverage

1. ✅ Chromium (Desktop)
2. ✅ Firefox (Desktop)
3. ✅ WebKit/Safari (Desktop)
4. ✅ Pixel 5 (Mobile)
5. ✅ iPhone 12 (Mobile)

## 📄 Pages Covered

- ✅ Home (/)
- ✅ Login (/login)
- ✅ Register (/register)
- ✅ Dashboard (/dashboard)
- ✅ Tasks (/tasks)
- ✅ Team (/team)
- ✅ Settings (/settings)
- ✅ Contact (/contact)
- ✅ About (/about)
- ✅ Blog (/blog)
- ✅ Analytics (/analytics)
- ✅ Notifications (/notifications)

## 🏗️ Page Objects Available

All imported from `pages/index.ts`:

```typescript
import {
  HomePage,
  LoginPage,
  RegistrationPage,
  DashboardPage,
  TasksPage,
  TaskCreationPage,
  TeamPage,
  ContactPage,
  AboutPage,
  SettingsPage,
  BlogPage,
  AnalyticsPage,
  NotificationsPage,
  UserManagementPage,
  NavigationPage
} from './pages';
```

## 🛠️ Test Helpers Available

All imported from `helpers/test-helpers.ts`:

```typescript
import {
  waitForPageLoad,
  waitForElementStable,
  fillForm,
  clickWithRetry,
  takeScreenshot,
  waitForToast,
  generateTestId,
  isVisible,
  isHidden,
  getCookiesAsObject,
  setCookie,
  clearCookies,
  clearLocalStorage,
  getLocalStorageItem,
  setLocalStorageItem,
  mockApiResponse,
  waitForNetworkResponse,
  hasConsoleErrors,
  humanType,
  hoverElement,
  uploadFile,
  retry,
  // ... and 20+ more
} from './helpers/test-helpers';
```

## 📦 Test Data Factory

```typescript
import { testData } from './fixtures/test-data';

// Users
testData.users.admin
testData.users.user

// Tasks
testData.tasks.pending
testData.tasks.inProgress
testData.tasks.completed

// Team Members
testData.teamMembers[0] // Expert Agent
testData.teamMembers[1] // Consultant Agent
testData.teamMembers[2] // Architect Agent
testData.teamMembers[3] // Executor Agent

// URLs
testData.urls.home
testData.urls.login
testData.urls.dashboard
// ... and more

// Methods
testData.generateTaskTitle('My Task')
testData.getRandomTeamMember()
testData.getTaskByStatus('pending')
testData.getUserByRole('admin')
testData.generateFormData({ key: 'value' })
```

## 📊 Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| Functional | ~200 | Core feature testing |
| Integration | ~50 | Multi-page workflows |
| Visual Regression | ~48 | Screenshot comparison |
| Accessibility | ~30 | ARIA & keyboard nav |
| Performance | ~15 | Load times & API |
| Real-time | ~135 | WebSocket & live updates |
| Error Handling | ~50 | API & validation errors |

## 🎨 Visual Regression

- Home (desktop, mobile, tablet)
- Dashboard (light, dark)
- Team, Contact, About, Blog
- Interactive states
- Error states
- Component consistency

## 🌐 Internationalization

- Chinese (zh)
- English (en)
- Language switching
- URL structure (/zh/*, /en/*)
- Content localization
- Form localization

## 📐 Responsive Design

Viewports tested:
- 1920x1080 (Desktop)
- 1366x768 (Laptop)
- 768x1024 (Tablet)
- 375x667 (Mobile)

## 🔐 Security & Permissions

- Admin role access
- User role access
- Protected routes
- Unauthorized handling
- Password change
- 2FA setup

## 📝 Test File List

1. auth-flow.spec.ts (17)
2. dashboard-analytics.spec.ts (30)
3. dashboard.spec.ts (21)
4. form.spec.ts (12)
5. home.spec.ts (7)
6. i18n.spec.ts (27)
7. login-flow-pom.spec.ts (17)
8. navigation-pom.spec.ts (25)
9. navigation.spec.ts (10)
10. notifications.spec.ts (30)
11. pages.spec.ts (23)
12. permissions-errors.spec.ts (25)
13. permissions-roles.spec.ts (26)
14. responsive.spec.ts (21)
15. task-creation-pom.spec.ts (19)
16. task-creation.spec.ts (24)
17. team.spec.ts (27)
18. theme.spec.ts (9)
19. user-management.spec.ts (23)
20. user-registration.spec.ts (18)
21. visual-regression-enhanced.spec.ts (32)
22. visual-regression.spec.ts (16)
23. websocket-realtime.spec.ts (27)
24. integration/user-flow.spec.ts (10)

## ✅ Status

All tests are **operational** and **discoverable**.

**Last Updated:** 2026-03-21
**Total:** 3,106 tests in 24 files
