# CSP Configuration Guide for 7zi-project

## Current Status

The project already has CSP headers configured in `next.config.ts`, but it uses `'unsafe-inline'` for scripts, which is a security vulnerability.

## Security Improvements

### 1. Remove 'unsafe-inline' from script-src

- Use nonce for legitimate inline scripts (JSON-LD, SEO scripts)
- Only allow trusted external domains

### 2. Keep 'unsafe-inline' for style-src

- CSS-in-JS libraries (Tailwind, styled-components) require this
- Less risk than script injection

### 3. Add nonce support

- Next.js 16 automatically generates nonces for scripts
- Use `nonce` prop in next/script components

### 4. Report-Only Mode

- Test CSP in report-only mode first
- Monitor for violations
- Fix issues before enforcing

## Implementation

### Phase 1: Report-Only Mode

Add `Content-Security-Policy-Report-Only` header to test without blocking.

### Phase 2: Enforce with Nonce

Update scripts to use nonce and remove 'unsafe-inline'.

### Phase 3: Monitor

Regularly check CSP reports for violations.

## Trusted Domains

Required for 7zi-project:

- `self` - Same origin
- `https://va.vercel-scripts.com` - Vercel Analytics
- `https://cdn.jsdelivr.net` - CDN for libraries
- `https://fonts.googleapis.com` - Google Fonts
- `https://fonts.gstatic.com` - Google Fonts assets
- `https://api.github.com` - GitHub API
- `https://o1.ingest.sentry.io` - Sentry error tracking
- `https://vitals.vercel-insights.com` - Vercel Vitals
- GitHub user avatars: `github.com`, `avatars.githubusercontent.com`

## Inline Scripts Requiring Nonce

1. **JSON-LD Structured Data** (SEO.tsx)
   - Uses dangerouslySetInnerHTML
   - Should use nonce for script-src

2. **Blog Post Content** (blog/[slug]/page.tsx)
   - Renders HTML content
   - May contain scripts from user content

3. **Next.js Runtime Scripts**
   - Automatically handled by Next.js with nonce

## CSP Level 3 Features

- `script-src` supports hash and nonce
- `frame-src` for iframe policies
- `form-action` to prevent form hijacking
- `base-uri` to prevent base tag injection
- `report-uri` / `report-to` for violation reporting

## References

- [MDN CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Next.js Security Headers](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
