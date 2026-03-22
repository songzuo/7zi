# Error Handling System Documentation

## Overview

The 7zi Project now has a comprehensive error handling system with user-friendly error pages and internationalization support.

## Features

- ✅ **Custom Error Boundary Components** - React error boundaries for catching and handling errors
- ✅ **404 Not Found Page** - Friendly page for non-existent routes
- ✅ **500 Server Error Page** - Server error handling with recovery options
- ✅ **401 Unauthorized Page** - Authentication required page
- ✅ **403 Forbidden Page** - Access denied page
- ✅ **Global Error Handling** - Root-level error boundary for app-wide errors
- ✅ **Internationalization (i18n)** - Full support for English and Chinese
- ✅ **Consistent Branding** - All pages match the 7zi Studio design system
- ✅ **User-Friendly Messages** - Clear error explanations and solutions
- ✅ **Recovery Actions** - Retry, go home, go back, and contact support options

## File Structure

```
src/
├── app/
│   ├── global-error.tsx          # Root-level error boundary
│   ├── not-found.tsx              # Root 404 (fallback)
│   └── [locale]/
│       ├── not-found.tsx          # Localized 404 page
│       ├── error.tsx              # Localized error page
│       └── error-enhanced.tsx     # Enhanced 500 error page
├── components/
│   ├── ErrorBoundary.tsx          # Main error boundary component
│   ├── ErrorDisplay.tsx           # Error display UI component
│   └── errors/
│       ├── index.tsx              # Error page factory
│       ├── UnauthorizedPage.tsx   # 401 page
│       └── ForbiddenPage.tsx      # 403 page
└── i18n/
    └── messages/
        ├── en.json                # English error messages
        └── zh.json                # Chinese error messages
```

## Error Pages

### 1. 404 Not Found Page

**Location:** `src/app/[locale]/not-found.tsx`

**Features:**
- Large 404 number with gradient effect
- Friendly error message
- Quick links to common pages
- Return to home and contact support buttons
- Full i18n support

**Usage:** Automatically triggered when a route doesn't exist.

### 2. 500 Server Error Page

**Location:** `src/app/[locale]/error.tsx` → `src/app/[locale]/error-enhanced.tsx`

**Features:**
- Large 500 number with gradient
- Error digest/code display
- Retry button with loading state
- Return to home button
- Recovery success state
- Full i18n support

**Usage:** Automatically triggered when a server error occurs.

### 3. 401 Unauthorized Page

**Location:** `src/components/errors/UnauthorizedPage.tsx`

**Features:**
- Large 401 number with gradient
- Login button
- Return to home button
- Contact support option
- Full i18n support

**Usage:** Use when user authentication is required.

**Example:**
```tsx
import { UnauthorizedPage } from '@/components/errors';

// In your page component
if (!isAuthenticated) {
  return <UnauthorizedPage />;
}
```

### 4. 403 Forbidden Page

**Location:** `src/components/errors/ForbiddenPage.tsx`

**Features:**
- Large 403 number with gradient
- Clear explanation of access denial
- Possible reasons list
- Return to home button
- Contact support option
- Full i18n support

**Usage:** Use when user lacks permissions.

**Example:**
```tsx
import { ForbiddenPage } from '@/components/errors';

// In your page component
if (!hasPermission) {
  return <ForbiddenPage />;
}
```

### 5. Global Error Boundary

**Location:** `src/app/global-error.tsx`

**Features:**
- Root-level error handling
- App-wide error recovery
- Development error details
- Clean UI matching brand

**Usage:** Automatically catches any unhandled errors in the app.

## Error Boundary Components

### ErrorDisplay Component

**Location:** `src/components/ErrorDisplay.tsx`

**Purpose:** Reusable error display UI with multiple variants.

**Variants:**
- `default` - Full-featured error page
- `compact` - Inline error message
- `fullscreen` - Full-screen modal

**Error Types:**
- `generic` - General error
- `network` - Network connection error
- `not-found` - 404 error
- `unauthorized` - 401 error
- `forbidden` - 403 error
- `server` - 500 error

**Props:**
```tsx
interface ErrorDisplayProps {
  title?: string;              // Error title
  message?: string;            // Error message
  showReset?: boolean;         // Show retry button
  onReset?: () => void;        // Retry callback
  errorDigest?: string;         // Error code
  variant?: ErrorVariant;      // Display variant
  errorType?: ErrorType;       // Error type
  showHomeButton?: boolean;    // Show home button
  showBackButton?: boolean;    // Show back button
  showRefreshButton?: boolean; // Show refresh button
  showCopyError?: boolean;     // Show copy error button
  onGoHome?: () => void;       // Home button callback
  onGoBack?: () => void;       // Back button callback
}
```

**Usage Example:**
```tsx
import { ErrorDisplay } from '@/components/ErrorDisplay';

<ErrorDisplay
  title="Something went wrong"
  message="Unable to load your data"
  errorType="network"
  showReset={true}
  onReset={retryFunction}
  showHomeButton={true}
/>
```

### ErrorBoundary Component

**Location:** `src/components/ErrorBoundary.tsx`

**Purpose:** React error boundary for Next.js pages.

**Features:**
- Automatic error type detection
- Sentry integration for error tracking
- Retry counting
- Smart error recovery

**Usage Example:**
```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

// In error.tsx
export default function Error({ error, reset }: ErrorProps) {
  return (
    <ErrorBoundary
      error={error}
      reset={reset}
      title="Page load failed"
      showReset={true}
      showHomeButton={true}
    />
  );
}
```

### Page Error Factory

**Location:** `src/components/errors/index.tsx`

**Purpose:** Create reusable page-level error boundaries.

**Usage:**
```tsx
import { createPageErrorBoundary } from '@/components/errors';

// Create a custom error boundary
const MyPageError = createPageErrorBoundary('My Page Error');

// Use in error.tsx
export default function Error({ error, reset }: ErrorProps) {
  return <MyPageError error={error} reset={reset} />;
}
```

## Internationalization

All error messages are localized in `src/i18n/messages/`:

### English (en.json)
```json
{
  "errors": {
    "notFound": {
      "title": "Page Not Found",
      "description": "The page you're looking for doesn't exist or has been removed.",
      "solution": "Check the URL for typos or use the navigation to find what you need.",
      "backHome": "Back to Home",
      "contactSupport": "Contact Support",
      "suggestions": {
        "title": "You might be looking for:",
        "home": "Home",
        "about": "About Us",
        "team": "Team",
        "blog": "Blog"
      }
    },
    "serverError": { ... },
    "unauthorized": { ... },
    "forbidden": { ... },
    "networkError": { ... },
    "general": { ... }
  }
}
```

### Chinese (zh.json)
```json
{
  "errors": {
    "notFound": {
      "title": "页面未找到",
      "description": "您访问的页面不存在或已被移除。",
      "solution": "请检查 URL 是否正确，或使用导航菜单查找您需要的内容。",
      "backHome": "返回首页",
      "contactSupport": "联系我们",
      "suggestions": {
        "title": "您可能在寻找：",
        "home": "首页",
        "about": "关于我们",
        "team": "团队成员",
        "blog": "博客文章"
      }
    },
    "serverError": { ... },
    "unauthorized": { ... },
    "forbidden": { ... },
    "networkError": { ... },
    "general": { ... }
  }
}
```

## Testing

### Test Utility

A test page is available at `/test-error` to verify all error pages:

```bash
# Test different error scenarios
/test-error?type=not-found      # 404 page
/test-error?type=server        # 500 page
/test-error?type=unauthorized  # 401 page
/test-error?type=forbidden     # 403 page
/test-error?type=network       # Network error
```

### Manual Testing

1. **404 Page:** Visit any non-existent route (e.g., `/this-does-not-exist`)
2. **500 Page:** Trigger an error in a page component
3. **401/403 Pages:** Import and use the components conditionally

### Automated Testing

Test files are located in `src/components/__tests__/`:
- `ErrorBoundary.test.tsx` - Error boundary tests
- `NetworkErrorBoundary.test.tsx` - Network error tests

## Styling and Branding

All error pages follow the 7zi Studio design system:

- **Colors:** Cyan, Purple, Pink gradient
- **Typography:** Geist Sans font family
- **Icons:** Custom SVG icons for each error type
- **Dark Mode:** Full dark mode support
- **Responsive:** Mobile-friendly design
- **Animations:** Subtle hover effects and transitions

## Best Practices

1. **Always provide context:** Include error codes/digests for debugging
2. **Offer recovery:** Give users ways to fix the problem (retry, go home)
3. **Be helpful:** Explain what happened and what to do next
4. **Stay consistent:** Use the same design language across all error pages
5. **Track errors:** Log errors to Sentry or similar service for monitoring
6. **Test thoroughly:** Verify all error states and recovery paths

## Error Handling Flow

```
Error Occurs
    ↓
Error Boundary Catches It
    ↓
Error Type Detected (network, 404, 401, 403, 500, generic)
    ↓
Appropriate Error Page Displayed
    ↓
User Takes Action (retry, go home, contact support)
    ↓
Recovery or Navigation
```

## Integration with Sentry

The `ErrorBoundary` component automatically logs errors to Sentry:

```tsx
useEffect(() => {
  Sentry.withScope((scope) => {
    scope.setTag('error_type', errorType);
    scope.setTag('retry_count', retryCount);
    scope.setExtra('digest', error.digest);
    scope.setExtra('url', window.location.href);
    Sentry.captureException(error);
  });
}, [error, errorType, retryCount]);
```

## Future Enhancements

Potential improvements:
- Error rate limiting for users
- Custom error pages for specific routes
- Error recovery suggestions based on error type
- Offline support with service workers
- Error analytics dashboard
- A/B testing for error page copy

## Support

For issues or questions about the error handling system:
- Check this documentation
- Review the component source code
- Test using the `/test-error` page
- Contact the development team

---

**Last Updated:** March 21, 2026
**Version:** 1.0.0
