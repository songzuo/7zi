# 7zi Frontend Bundle Optimization Report

**Date:** 2026-04-07
**Project:** /root/.openclaw/workspace/7zi-frontend

---

## Build Warnings Summary

```
asset size limit: The following asset(s) exceed the recommended size limit (250 KiB).
Assets: 
  static/chunks/three-core-19c36158.c08137f3a3b343fe.js (345 KiB)
  static/chunks/three-core-9144ac1c.e4df4493d70d604b.js (365 KiB)

entrypoint size limit: The following entrypoint(s) combined asset size exceeds the recommended limit (300 KiB).
Entrypoints:
  main (767 KiB)
  main-app (576 KiB)
  app/not-found (570 KiB)
  app/layout (888 KiB)
```

---

## Top 10 Largest Bundle Modules (by file size)

| Rank | Bundle File | Size | Type | Likely Source |
|------|------------|------|------|---------------|
| 1 | `three-core-9144ac1c.e4df4493d70d604b.js` | **365 KiB** | Three.js | 3D graphics (3DViewer, etc.) |
| 2 | `three-core-19c36158.c08137f3a3b343fe.js` | **345 KiB** | Three.js | 3D graphics (duplicate?) |
| 3 | `next-core-caef5ee6-519573f34570c1b2.js` | **196 KiB** | Next.js core | Framework runtime |
| 4 | `react-core-f7f7243c-a79a745fdf79d8ab.js` | **171 KiB** | React core | React DOM/runtime |
| 5 | `polyfills-42372ed130431b0a.js` | **110 KiB** | Polyfills | Browser compatibility |
| 6 | `2665-756e1dd82c958821.js` | **94 KiB** | Vendor | Mixed vendor code |
| 7 | `next-core-ef670ba7-3d4b9155082b7891.js` | **84 KiB** | Next.js core | Framework runtime |
| 8 | `chart-libs-c7051d84-f19c99cea2d058b1.js` | **66 KiB** | Chart library | Recharts |
| 9 | `4050.9441346ac94961f0.js` | **64 KiB** | Route chunk | Page-specific |
| 10 | `5710-df561da00597611e.js` | **63 KiB** | Route chunk | Page-specific |

---

## Key Issues Identified

### 🔴 Critical: Three.js (710 KiB combined)

Two Three.js bundles totaling **~710 KiB** are loaded on almost every page. This is the single biggest bundle issue.

**Root cause:** Three.js is likely imported directly in shared code or layout, not lazy-loaded per-page.

**Files using Three.js:**
- 3D Viewer components
- Potential 3D-related pages

### 🟠 High: Multiple Chart Library Chunks

Multiple `chart-libs-*.js` files exist (66KB, 57KB, 54KB, 51KB), suggesting chart components are bundled per-page rather than deduplicated.

### 🟡 Medium: Large Next.js Core Chunks

Multiple `next-core-*.js` files (84KB, 48KB, 49KB, 40KB...) indicate large framework usage. The `next-core-caef5ee6` alone is 196KB.

### 🟡 Medium: Entry Points Exceed 300 KiB

- `app/layout`: 888 KiB (CSS + core chunks)
- `main`: 767 KiB
- `main-app`: 576 KiB

---

## Optimization Recommendations

### 1. Lazy Load Three.js (Highest Impact)

```typescript
// ❌ Bad: Direct import in component
import * as THREE from 'three';

// ✅ Good: Dynamic import only when needed
const ThreeViewer = dynamic(() => import('@/components/ThreeViewer'), {
  ssr: false,
  loading: () => <Skeleton />
});
```

**Or use `next/dynamic` with suspense:**

```typescript
import dynamic from 'next/dynamic';

const ThreeCanvas = dynamic(() => import('@/components/ThreeCanvas'), {
  ssr: false,
  loading: () => <CanvasLoader />
});
```

**Target:** Reduce initial bundle by ~710 KiB

### 2. De-duplicate Chart Libraries

**Check for multiple chart imports across the codebase:**

```bash
grep -r "from 'recharts'" /root/.openclaw/workspace/7zi-frontend/src
```

**Create a single shared chart import:**

```typescript
// lib/charts.ts
export { LineChart, BarChart, AreaChart, PieChart } from 'recharts';
```

Then import from the shared module everywhere to enable webpack deduplication.

### 3. Investigate Duplicate Three.js Bundles

Two near-identical Three.js bundles suggests Two.js is imported in different ways:

```bash
# Check how three is imported
grep -r "from 'three'" /root/.openclaw/workspace/7zi-frontend/src
grep -r "from '@types/three'" /root/.openclaw/workspace/7zi-frontend/src
```

Ensure **consistent import paths** to allow webpack to deduplicate.

### 4. Enable Bundle Analyzer

Add `ANALYZE=true` to build for detailed chunk analysis:

```bash
ANALYZE=true pnpm build
```

Or configure `next.config.js`:

```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
```

### 5. Optimize polyfills

Consider removing polyfills for modern browsers:

```javascript
// next.config.js
module.exports = {
  transpilePackages: [],
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};
```

### 6. Consider Tree-shaking Recharts

```typescript
// Instead of:
import { LineChart, BarChart } from 'recharts';

// Use specific imports if tree-shaking isn't working:
import LineChart from 'recharts/lib/chart/LineChart';
import BarChart from 'recharts/lib/chart/BarChart';
```

---

## Quick Wins Checklist

- [ ] Identify all Three.js import sites → apply `dynamic()` import
- [ ] Deduplicate chart library imports → single shared module
- [ ] Verify consistent `three` import path across codebase
- [ ] Add bundle analyzer to `next.config.js`
- [ ] Check if `app/layout` really needs all 888 KiB of initial load
- [ ] Consider `optimizePackageImports` for recharts/lucide (already enabled in experiments)

---

## Expected Impact

| Optimization | Potential Savings |
|-------------|-------------------|
| Lazy load Three.js | **~710 KiB** initial load |
| Dedup chart libs | **~50-100 KiB** |
| Optimize polyfills | **~30-50 KiB** |
| **Total potential reduction** | **~800+ KiB** |

---

*Report generated by Executor sub-agent — 2026-04-07*
