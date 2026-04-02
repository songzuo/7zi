# v1.8.0 Performance Monitoring Strategy - Sentry Integration

## Overview

This document outlines the Sentry integration strategy for v1.8.0, focusing on performance monitoring, error tracking, and session replay capabilities.

## Current Status

### Sentry Configuration Files

1. **sentry.client.config.ts** - Browser-side configuration
2. **sentry.server.config.ts** - Server-side (Node.js) configuration

### Environment Variables Required

```bash
# Required
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Optional (with defaults)
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_RELEASE=7zi-frontend@1.8.0
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ORG=7zi-studio
SENTRY_PROJECT=7zi-frontend

# Sampling Rates (production defaults)
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.05
SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.05
SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=0.5
```

## Configuration Details

### Client-Side (Browser)

- **tracesSampleRate**: 0.1 (production) / 1.0 (development)
- **profilesSampleRate**: 0.05 (production) / 1.0 (development)
- **replaysSessionSampleRate**: 0.05 (production) / 0.5 (development)
- **replaysOnErrorSampleRate**: 0.5 (production) / 1.0 (development)

### Server-Side (Node.js)

- **tracesSampleRate**: 0.1 (production) / 1.0 (development)
- **profilesSampleRate**: 0.05 (production) / 1.0 (development)

### Privacy-First Approach

- `sendDefaultPii: false` - No user IP collection
- `maskAllText: true` - Session replay masks all text
- `blockAllMedia: true` - Session replay blocks media
- Sensitive headers (authorization, cookie, x-api-key) are filtered

### Error Filtering

Ignored errors:
- Browser extension errors
- ResizeObserver loop errors
- Network errors (user's network issue)
- Navigation cancellation errors

## Deployment Checklist

### Pre-Deployment

- [x] sentry.client.config.ts configured
- [x] sentry.server.config.ts configured
- [ ] Set NEXT_PUBLIC_SENTRY_DSN in production environment
- [ ] Set SENTRY_AUTH_TOKEN for source maps upload
- [ ] Configure SENTRY_ORG and SENTRY_PROJECT

### Post-Deployment

- [ ] Verify errors appear in Sentry dashboard
- [ ] Check performance metrics are collected
- [ ] Validate session replay works
- [ ] Monitor sampling rates impact on quota

## Build Verification

```bash
# Run build to verify Sentry configuration
npm run build

# Expected: Build completes without Sentry-related errors
```

## Version Information

- **Package Version**: @sentry/nextjs ^10.44.0
- **Project Version**: 1.7.0 → 1.8.0
- **Next.js Version**: 16.2.1

## Notes

- Sentry is configured but disabled in development by default
- Set `NEXT_PUBLIC_SENTRY_DEBUG=true` to enable in development
- Performance monitoring sampling rates are optimized to reduce quota usage
- Source maps upload requires `SENTRY_AUTH_TOKEN` in CI/CD

## Changelog

### 2024-04-02
- Verified Sentry configuration files exist and are properly configured
- Fixed turbopack configuration warning in next.config.ts
- Build successful with Sentry integration
