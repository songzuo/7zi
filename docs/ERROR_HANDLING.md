# Error Handling & Loading States - Complete Guide

## Overview

7zi-project implements a comprehensive error handling and loading state system to ensure excellent user experience and robust error recovery.

## Table of Contents

1. [Error Handling Architecture](#error-handling-architecture)
2. [Loading State System](#loading-state-system)
3. [Components Reference](#components-reference)
4. [Usage Examples](#usage-examples)
5. [Best Practices](#best-practices)

---

## Error Handling Architecture

### Three-Level Error Boundaries

```
App Root
  ├── Global Error Boundary (app/global-error.tsx)
  ├── Layout Error Boundary (app/[locale]/error.tsx)
  └── Page Error Boundaries (app/[locale]/*/error.tsx)
      ├── DashboardError
      ├── BlogError
      ├── TeamError
      ├── ContactError
      ├── AboutError
      ├── PortfolioError
      ├── TasksError
      └── SettingsError
```

### Error Type Classification

| Error Type     | Icon Color | Use Case                      |
| -------------- | ---------- | ----------------------------- |
| `generic`      | Red        | Unknown/unclassified errors   |
| `network`      | Orange     | Network connection failures   |
| `not-found`    | Blue       | 404 - Page not found          |
| `unauthorized` | Amber      | 401 - Authentication required |
| `forbidden`    | Amber      | 403 - Permission denied       |
| `server`       | Purple     | 5xx - Server errors           |

### Error Monitoring (Sentry Integration)

All errors are automatically reported to Sentry with:

- Error type tags
- User context
- Request metadata
- Component stack traces
- Retry count information

---

## Loading State System

### Loading Components

1. **LoadingSpinner** (`components/LoadingSpinner.tsx`)
   - 6 variants: spin, pulse, bounce, dots, bars, wave
   - 5 sizes: xs, sm, md, lg, xl
   - 7 colors: primary, secondary, success, warning, error, info, current

2. **Skeleton Components** (`components/Skeleton.tsx`)
   - Text, Avatar, Card, List, Table, StatCard, Nav, Page
   - Optimized for perceived performance

3. **Page Loading Templates** (`components/PageLoadingTemplate.tsx`)
   - PageLoading - Full page with nav and content
   - CardGridLoading - Card grid layouts
   - TableLoading - Data tables
   - ListLoading - Item lists
   - DashboardLoading - Dashboard widgets
   - TasksLoading - Task boards

### Loading State Coverage

✅ Pages with loading.tsx:

- `/[locale]/dashboard` → DashboardLoading
- `/[locale]/tasks` → TasksLoading
- `/[locale]/blog` → CardGridLoading
- `/[locale]/portfolio` → CardGridLoading
- `/[locale]/about` → PageLoading
- `/[locale]/contact` → PageLoading

---

## Components Reference

### ErrorBoundary

**Location:** `components/ErrorBoundary.tsx`

**Features:**

- Automatic error type analysis
- Smart retry mechanism with counting
- Sentry integration
- Friendly error messages
- Multiple recovery options (reset, home, back, refresh, copy)

**Props:**

```typescript
interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  showReset?: boolean
  showHomeButton?: boolean
  showBackButton?: boolean
  showRefreshButton?: boolean
  showCopyError?: boolean
  variant?: 'default' | 'compact' | 'fullscreen'
}
```

**Usage:**

```tsx
export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorBoundary
      error={error}
      reset={reset}
      title="Page load failed"
      variant="default"
      showReset
      showHomeButton
    />
  )
}
```

### ErrorDisplay

**Location:** `components/ErrorDisplay.tsx`

**Features:**

- Three display variants (default, compact, fullscreen)
- Error type-specific icons and colors
- Interactive retry mechanism
- Copy error to clipboard
- Responsive design

### NetworkErrorBoundary

**Location:** `components/NetworkErrorBoundary.tsx`

**Features:**

- Network status monitoring
- Automatic reconnection detection
- Manual retry capability
- Offline/online state tracking

**Usage:**

```tsx
<NetworkErrorBoundary pingUrl="/api/health" onRetry={() => refetch()}>
  <YourComponent />
</NetworkErrorBoundary>
```

### ErrorBoundaryWrapper

**Location:** `components/ErrorBoundaryWrapper.tsx`

**Features:**

- Class component boundary for React trees
- Custom fallback support
- HOC: `withErrorBoundary`
- Sentry integration with component stack

**Usage:**

```tsx
// Direct usage
;<ErrorBoundaryWrapper title="Component failed" showReset>
  <SomeComponent />
</ErrorBoundaryWrapper>

// HOC usage
const SafeComponent = withErrorBoundary(MyComponent, {
  title: 'Load failed',
  showReset: true,
})
```

### RetryBoundary

**Location:** `components/RetryBoundary.tsx`

**Features:**

- Configurable max retries
- Exponential backoff strategy
- Error type analysis
- Retry count tracking
- HOC: `withRetry`

**Usage:**

```tsx
;<RetryBoundary maxRetries={3} retryDelay={2000}>
  <SomeComponentThatMightFail />
</RetryBoundary>

// HOC usage
const SafeComponent = withRetry(MyComponent, {
  maxRetries: 3,
  retryDelay: 2000,
})
```

---

## Usage Examples

### Page-Level Error Handling

```tsx
// app/[locale]/dashboard/error.tsx
'use client'

export { DashboardError as default } from '@/components/errors'

// Or custom:
;('use client')
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorBoundary error={error} reset={reset} title="Dashboard failed to load" />
}
```

### Loading States

```tsx
// app/[locale]/dashboard/loading.tsx
import { DashboardLoading } from '@/components/PageLoadingTemplate'

export default function DashboardPageLoading() {
  return <DashboardLoading />
}
```

### Component-Level Error Boundary

```tsx
'use client'
import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper'

function MyComponent() {
  return (
    <ErrorBoundaryWrapper
      title="Widget failed"
      variant="compact"
      showReset
      onError={error => console.error('Widget error:', error)}
    >
      <SomeWidget />
    </ErrorBoundaryWrapper>
  )
}
```

### Network Error Handling

```tsx
'use client'
import { NetworkErrorBoundary } from '@/components/NetworkErrorBoundary'

function DataFetchingComponent() {
  const { data, error, refetch } = useQuery('data', fetchData)

  return (
    <NetworkErrorBoundary onRetry={refetch} pingUrl="/api/health">
      {error ? <div>{error.message}</div> : <div>{data}</div>}
    </NetworkErrorBoundary>
  )
}
```

### Retry Logic for Async Operations

```tsx
'use client'
import { RetryBoundary } from '@/components/RetryBoundary'

function UnstableComponent() {
  return (
    <RetryBoundary
      maxRetries={3}
      retryDelay={1000}
      onError={(error, retryCount) => {
        console.log(`Attempt ${retryCount} failed:`, error)
      }}
      onSuccess={() => {
        console.log('Success after retries!')
      }}
    >
      <DataFetchingWidget />
    </RetryBoundary>
  )
}
```

---

## Best Practices

### 1. Always Provide Loading States

✅ **Do:**

```tsx
// app/[locale]/page/loading.tsx
import { CardGridLoading } from '@/components/PageLoadingTemplate'
export default function PageLoading() {
  return <CardGridLoading />
}
```

❌ **Don't:**

- Leave users staring at blank screens
- Use generic spinners for complex pages
- Ignore skeleton screens for better perceived performance

### 2. Error Boundary Hierarchy

```
✅ Correct hierarchy:
Global (root) → Layout → Page → Component

❌ Avoid:
- Multiple error boundaries at same level
- Error boundaries without reset mechanism
- Missing error boundaries for async operations
```

### 3. Error Message Guidelines

✅ **Good:**

- "网络连接失败，请检查您的网络设置" (Clear, actionable)
- "页面不存在或已被移除" (Specific)
- "服务器暂时无法处理请求，请稍后重试" (Reassuring)

❌ **Bad:**

- "Error: 404" (Too technical)
- "Something went wrong" (Too vague)
- "undefined" (No information)

### 4. Loading State Selection

| Scenario                     | Recommended Component      |
| ---------------------------- | -------------------------- |
| Dashboard widgets            | `DashboardLoading`         |
| Card grids (blog, portfolio) | `CardGridLoading`          |
| Data tables                  | `TableLoading`             |
| Simple pages                 | `PageLoading`              |
| Inline loading               | `LoadingSpinner` (compact) |

### 5. Retry Strategy

- **Network errors**: 3 retries with exponential backoff (1s, 2s, 4s)
- **Server errors (5xx)**: 2 retries with 2s delay
- **Client errors (4xx)**: No retries (user action required)
- **Unknown errors**: 1 retry with immediate attempt

### 6. Error Recovery Options

Always provide at least 2 recovery options:

1. **Primary**: Retry/Reset (when applicable)
2. **Secondary**: Navigate home or back
3. **Optional**: Refresh page, copy error, contact support

---

## File Structure

```
src/
├── components/
│   ├── ErrorBoundary.tsx           # Main error boundary for Next.js
│   ├── ErrorBoundaryWrapper.tsx    # Class component boundary
│   ├── ErrorDisplay.tsx            # Error UI component
│   ├── NetworkErrorBoundary.tsx    # Network-specific boundary
│   ├── RetryBoundary.tsx           # Retry mechanism with backoff
│   ├── LoadingSpinner.tsx          # Loading indicators
│   ├── PageLoadingTemplate.tsx     # Page skeleton templates
│   ├── Skeleton.tsx                # Skeleton components
│   └── errors/
│       └── index.tsx               # Page error factory
├── lib/
│   ├── errors.ts                   # Error utilities
│   └── monitoring/
│       └── errors.ts               # Sentry integration
└── app/
    ├── error.tsx                   # Root error boundary
    ├── global-error.tsx            # Global error boundary
    └── [locale]/
        ├── error.tsx               # Locale error boundary
        ├── dashboard/
        │   ├── page.tsx
        │   ├── error.tsx           # ✅
        │   └── loading.tsx         # ✅
        ├── blog/
        │   ├── page.tsx
        │   ├── error.tsx           # ✅
        │   └── loading.tsx         # ✅ NEW
        ├── portfolio/
        │   ├── page.tsx
        │   ├── error.tsx           # ✅ NEW
        │   └── loading.tsx         # ✅ NEW
        ├── team/
        │   ├── page.tsx
        │   └── error.tsx           # ✅
        ├── about/
        │   ├── page.tsx
        │   ├── error.tsx           # ✅
        │   └── loading.tsx         # ✅ NEW
        ├── contact/
        │   ├── page.tsx
        │   ├── error.tsx           # ✅
        │   └── loading.tsx         # ✅ NEW
        ├── tasks/
        │   ├── page.tsx
        │   ├── error.tsx           # ✅ NEW
        │   └── loading.tsx         # ✅
        └── settings/
            ├── page.tsx
            └── error.tsx           # ✅ NEW
```

---

## Testing

Run the test suite:

```bash
# Run error boundary tests
npm test src/components/__tests__/ErrorBoundary.test.tsx
npm test src/components/__tests__/NetworkErrorBoundary.test.tsx

# Test loading states manually
# Visit each page and verify loading states appear
```

---

## Monitoring

Check Sentry for error patterns:

```bash
# View error statistics
# https://sentry.io/organizations/your-org/issues/

# Look for:
# - Most common error types
# - Error frequency by route
# - User impact (affected sessions)
# - Recovery success rates
```

---

## Future Improvements

- [ ] Add error rate limiting to prevent spam
- [ ] Implement offline-first caching strategies
- [ ] Add user feedback mechanism for errors
- [ ] Create error recovery analytics dashboard
- [ ] Add A/B testing for error recovery UI
- [ ] Implement progressive loading for large datasets

---

## Support

For issues or questions:

1. Check this documentation
2. Review component TypeScript definitions
3. Examine existing implementations in the codebase
4. Contact: support@7zi.studio

---

**Last Updated:** 2024-03-21
