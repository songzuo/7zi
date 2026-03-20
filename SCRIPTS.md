# 7zi Project Scripts Documentation

> **Last Updated**: 2026-03-20

This document provides detailed information about all npm scripts available in the project.

## Development Scripts

### `npm run dev`
Start the Next.js development server with hot reload.
- **Port**: 3000 (default)
- **Usage**: Local development

### `npm run build`
Build the production-optimized Next.js application.
- **Environment**: Sets `NODE_ENV=production`
- **Output**: `.next/` directory

### `npm run build:analyze`
Build with bundle analysis to inspect bundle size.
- **Environment**: Sets `NODE_ENV=production` and `ANALIZE=true`
- **Output**: Opens bundle analyzer after build

### `npm run start`
Start the production server.
- **Prerequisite**: Must run `npm run build` first
- **Usage**: Production deployment

---

## Code Quality Scripts

### `npm run lint`
Run ESLint to check code for errors and warnings.
- **Checks**: All TypeScript/JavaScript files
- **Output**: Console report of issues

### `npm run lint:fix`
Automatically fix ESLint issues where possible.
- **Action**: Modifies files in place
- **Usage**: Before committing changes

### `npm run type-check`
Run TypeScript compiler to check types without emitting files.
- **Flags**: `--noEmit`
- **Usage**: Verify type safety

### `npm run format`
Format code using Prettier.
- **Files**: `**/*.{ts,tsx,js,jsx,json,css}`
- **Action**: Modifies files in place

### `npm run format:check`
Check code formatting without modifying files.
- **Usage**: CI/CD pipelines
- **Exit Code**: Non-zero if formatting issues found

---

## Test Scripts

### Unit & Integration Tests

#### `npm run test`
Run Vitest in watch mode.
- **Behavior**: Automatically re-runs on file changes
- **Usage**: Active development

#### `npm run test:run`
Run all tests once (no watch mode).
- **Usage**: CI/CD pipelines, pre-commit hooks

#### `npm run test:coverage`
Run tests with coverage report.
- **Tool**: Vitest coverage-v8
- **Output**: Console and HTML report in `coverage/`

#### `npm run test:coverage:check`
Run tests with coverage and fail on errors.
- **Flags**: `--reporter=verbose --bail 1`
- **Usage**: CI with strict checking

#### `npm run test:analyze`
Run coverage analysis script.
- **Script**: `./scripts/analyze-coverage.sh`
- **Usage**: Detailed coverage analysis

#### `npm run test:unit`
Run unit tests only.
- **Path**: `src/`
- **Usage**: Fast feedback on core logic

#### `npm run test:api`
Run API route tests.
- **Path**: `src/app/api`
- **Usage**: Verify API endpoints

#### `npm run test:components`
Run component tests.
- **Path**: `src/components`
- **Usage**: Verify React components

#### `npm run test:integration`
Run integration tests.
- **Path**: `src/test/integration`
- **Usage**: Verify component interactions

#### `npm run test:watch`
Watch mode alternative to `npm run test`.
- **Usage**: Interactive development

#### `npm run test:ui`
Open Vitest UI in browser.
- **Interface**: Interactive test runner
- **Usage**: Debugging, visual test results

#### `npm run test:debug`
Run tests in debug mode.
- **Usage**: Step-through debugging

### E2E Tests (Playwright)

#### `npm run test:e2e`
Run all E2E tests.
- **Browser**: Headless by default
- **Usage**: Full user flow testing

#### `npm run test:e2e:ui`
Open Playwright Test Runner UI.
- **Interface**: Visual test runner
- **Usage**: Interactive testing, debugging

#### `npm run test:e2e:debug`
Run E2E tests in debug mode.
- **Mode**: Headed with inspector
- **Usage**: Step-through debugging

#### `npm run test:e2e:report`
Open Playwright HTML report.
- **Path**: `playwright-report/`
- **Usage**: Review test results

#### `npm run test:e2e:chromium`
Run E2E tests on Chromium only.
- **Project**: chromium
- **Usage**: Fastest E2E testing

### Combined Test Scripts

#### `npm run test:all`
Run all unit tests and E2E tests.
- **Sequence**: `test:run` → `test:e2e`
- **Usage**: Complete test suite

#### `npm run test:ci`
Run tests in CI environment.
- **Reporters**: JUnit, default
- **Behavior**: Bail on first failure
- **Usage**: GitHub Actions, CI/CD pipelines

---

## Script Quick Reference

| Category | Script | Purpose |
|----------|--------|---------|
| **Development** | `dev` | Start dev server |
| | `build` | Production build |
| | `start` | Start production server |
| **Code Quality** | `lint` | Check code quality |
| | `lint:fix` | Auto-fix issues |
| | `type-check` | Type checking |
| | `format` | Format code |
| | `format:check` | Check formatting |
| **Testing - Unit** | `test` | Watch mode tests |
| | `test:run` | Single run tests |
| | `test:coverage` | Coverage report |
| | `test:unit` | Unit tests only |
| | `test:api` | API tests only |
| | `test:components` | Component tests only |
| | `test:integration` | Integration tests |
| **Testing - E2E** | `test:e2e` | E2E tests |
| | `test:e2e:ui` | E2E UI mode |
| | `test:e2e:debug` | E2E debug mode |
| **Testing - All** | `test:all` | Full test suite |
| | `test:ci` | CI pipeline tests |

---

## Common Workflows

### Local Development
```bash
# Start development server
npm run dev

# In another terminal, run tests in watch mode
npm run test

# Check code quality
npm run lint
npm run type-check
```

### Before Committing
```bash
# Run all tests
npm run test:run

# Check coverage
npm run test:coverage

# Format code
npm run format

# Run linter
npm run lint
```

### CI/CD Pipeline
```bash
# Complete test suite with coverage
npm run test:ci

# Type check
npm run type-check

# Build
npm run build
```

### Production Deployment
```bash
# Build for production
npm run build

# Start production server
npm run start
```

---

## Notes

- All test scripts use **Vitest** for unit/integration tests and **Playwright** for E2E tests
- Test coverage target: **≥80%** for statements, branches, functions, and lines
- ESLint and Prettier configurations are in `.eslintrc.js` and `.prettierrc.js`
- TypeScript configuration is in `tsconfig.json`
