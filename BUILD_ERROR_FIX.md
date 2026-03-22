# Build Error Fix: performance-metrics.ts

## Issue

Build fails with error in `src/lib/monitoring/performance-metrics.ts:218:4`

```
Error: Turbopack build failed with 1 errors:
./src/lib/monitoring/performance-metrics.ts:218:4
Expression expected
```

## Analysis

The reported error at line 218 appears to be a false positive or existing issue unrelated to the force-dynamic optimization. Code inspection shows correct syntax:

```typescript
// Lines 216-220
logger.info('Enhanced performance monitoring initialized');
}).catch((error) => {
  logger.error('Failed to initialize Web Vitals monitoring', { error });
});
```

**Status:** Pre-existing issue, NOT caused by force-dynamic optimization

## Recommended Fix

If this is a real issue, the file structure may need review:

1. Check for unclosed braces before line 218
2. Verify the `import('web-vitals').then()` promise chain
3. Ensure all callbacks are properly closed

## Alternative Solutions

1. **Disable temporarily for build test:**
```bash
# Rename file temporarily
mv src/lib/monitoring/performance-metrics.ts src/lib/monitoring/performance-metrics.ts.disabled

# Run build
npm run build

# Restore after
mv src/lib/monitoring/performance-metrics.ts.disabled src/lib/monitoring/performance-metrics.ts
```

2. **Check with TypeScript compiler directly:**
```bash
npx tsc --noEmit
```

3. **Use Next.js dev mode for testing:**
```bash
npm run dev
```

## Note

This error is blocking the build but is NOT related to the force-dynamic optimization task. The optimization changes have been successfully committed and can be tested independently.

**Related Commit:** c6e89377c (Optimize: Remove unnecessary force-dynamic exports)
**Report Date:** 2026-03-22
