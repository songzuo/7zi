# Mobile Testing Guide

## Overview

This guide covers mobile testing strategy and configuration for the project.

## Playwright Mobile Configuration

The project uses Playwright with 6 device configurations:

| Device | Viewport | Touch | Use Case |
|--------|----------|-------|----------|
| mobile-375 | 375x667 | Yes | iPhone SE (small) |
| mobile-414 | 414x896 | Yes | iPhone 12 Pro (large) |
| tablet-768-portrait | 768x1024 | Yes | iPad mini |
| tablet-1024-landscape | 1024x768 | Yes | iPad Pro |
| desktop-1280 | 1280x720 | No | Standard desktop |
| desktop-1920 | 1920x1080 | No | Large desktop |

**Config file**: `playwright.mobile.config.ts`

## Running Mobile Tests

```bash
# Run all mobile tests
pnpm exec playwright test --config=playwright.mobile.config.ts

# Run specific device
pnpm exec playwright test --config=playwright.mobile.config.ts --project=mobile-375

# Run with UI
pnpm exec playwright test --config=playwright.mobile.config.ts --ui

# Generate report
pnpm exec playwright show-report
```

## Test Coverage

### Components Tested
- `SwipeContainer.tsx` - touch gestures
- `TaskCardMobile.tsx` - mobile layouts
- Responsive layouts at all breakpoints

### Features Covered
- Touch gesture handling
- Viewport adaptation
- Navigation at mobile sizes
- Layout shifts between breakpoints
- Touch-friendly interactions

## Known Gaps

### Missing test-mobile.sh
The `test-mobile.sh` script is missing. Tests must be run using the Playwright CLI directly.

### No CI Integration
Mobile tests are not yet integrated into the CI pipeline.

### Limited E2E Coverage
Only basic mobile components have tests. Full E2E mobile flows need development.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev &

# Run mobile tests
pnpm exec playwright test --config=playwright.mobile.config.ts --project=mobile-375
```
