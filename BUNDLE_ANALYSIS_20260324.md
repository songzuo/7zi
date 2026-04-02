# 7zi-Project Bundle Analysis Report

**Date:** 2026-03-24
**Project:** 7zi-frontend v1.1.0
**Tech Stack:** Next.js 16.2.1 + React 19.2.4

---

## 📊 Current Bundle Size Summary

### Client-Side Chunks (Top 10)

| Rank | Chunk                  | Size | Description                         |
| ---- | ---------------------- | ---- | ----------------------------------- |
| 1    | three-libs-628d97d9.js | 368K | Three.js + React Three Fiber + Drei |
| 2    | three-libs-06afcb45.js | 348K | Additional Three.js components      |
| 3    | framework-1c490867.js  | 196K | React + Next.js core framework      |
| 4    | framework-f7f7243c.js  | 172K | Additional framework code           |
| 5    | three-libs-8743d79b.js | 144K | Three.js post-processing            |
| 6    | polyfills-42372ed1.js  | 112K | Browser polyfills                   |
| 7    | vendors-0e5f63c4.js    | 92K  | Vendor utilities                    |
| 8    | chart-libs-664d7b50.js | 84K  | Recharts + D3 visualization         |
| 9    | chart-libs-11c49b98.js | 68K  | Additional chart components         |
| 10   | chart-libs-e42665dd.js | 52K  | Chart utilities                     |

### Server-Side Chunks (Top 10)

| Rank | Chunk                             | Size     | Description                 |
| ---- | --------------------------------- | -------- | --------------------------- |
| 1    | app/collaboration-demo/page.js    | 1.5M     | Demo page with heavy deps   |
| 2    | chunks/4761.js                    | 1004K    | Large vendor bundle         |
| 3    | chunks/3283.js                    | 940K     | Framework + instrumentation |
| 4    | app/api/analytics/export/route.js | 824K     | Excel export + analytics    |
| 5    | chunks/8295.js                    | 460K     | WebSocket + Socket.io       |
| 6    | chunks/224.js                     | 320K     | Core runtime                |
| 7    | middleware.js                     | 280K     | Next.js middleware          |
| 8    | [locale]/analytics/test/page.js   | 472K     | Analytics test page         |
| 9    | app/api/health/detailed/route.js  | Multiple | Health check (2.2M total)   |
| 10   | framework chunks                  | Multiple | ~500K+ total                |

### Total Bundle Size

- **Client-side:** ~4.0M (all .js files in .next/static)
- **Server-side:** ~6-7M (all .js files in .next/server)
- **Total estimated:** ~10-11M gzipped

---

## 🔍 Problem Identification

### 1. **Three.js Related Bundles** 🔴 Critical

- **Total size:** ~860K (368K + 348K + 144K)
- **Issue:** All Three.js code loaded even on pages that don't use 3D
- **Impact:** Most pages don't need 3D but still download it

### 2. **Duplicate Framework Chunks** 🟠 High

- Multiple framework chunks (196K + 172K + 72K + 68K + 60K + 48K)
- React/Next.js split into too many chunks
- **Impact:** Increased network requests, no code reuse

### 3. **Sentry Instrumentation Overhead** 🟡 Medium

- chunk 4761.js (1004K) and 3283.js (940K) heavily instrumented
- OpenTelemetry and Sentry instrumentation adding bulk
- **Impact:** Production builds include dev/tracing code

### 4. **Socket.io in Multiple Chunks** 🟡 Medium

- WebSocket code scattered (8295.js = 460K)
- Loaded even when not using real-time features
- **Impact:** Unnecessary network overhead

### 5. **Chart Libraries** 🟡 Medium

- Recharts + D3 ~250K total
- May be unused on many pages

---

## 💡 Optimization Recommendations

### Priority 1: **Dynamic Imports for Heavy Libraries** 🚀

**Estimated savings:** 20-30% (600KB-1MB)

```typescript
// Before: Static import
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

// After: Dynamic import with loading state
'use client'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const Scene = dynamic(() => import('@/components/3d/Scene'), {
  loading: () => <div>Loading 3D scene...</div>,
  ssr: false // Don't render 3D on server
})

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Scene />
    </Suspense>
  )
}
```

### Priority 2: **Optimize Three.js Imports** 🎨

**Estimated savings:** 200-300KB

```typescript
// ❌ Bad: Import entire libraries
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'

// ✅ Good: Import only what you need
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei/examples/jsm/controls/OrbitControls'
import { Stars } from '@react-three/drei/stars'
```

### Priority 3: **Conditional Socket.io Loading** 📡

**Estimated savings:** 200-400KB

```typescript
// Only load WebSocket when needed
const useWebSocket = () => {
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    // Only import when component mounts
    import('socket.io-client').then(({ io }) => {
      const socketInstance = io(process.env.NEXT_PUBLIC_WS_URL)
      setSocket(socketInstance)
    })

    return () => {
      if (socket) socket.disconnect()
    }
  }, [])

  return socket
}
```

### Priority 4: **Reduce Sentry Instrumentation** 📊

**Estimated savings:** 100-200KB

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  sentry: {
    // Reduce what gets instrumented
    tracing: {
      tracesSampleRate: 0.1, // Sample 10% instead of 100%
      // Exclude certain routes
      exclude: ['/api/health', '/api/health/*'],
    },
    // Disable performance monitoring in dev
    disablePerformance: process.env.NODE_ENV !== 'production',
  },
}
```

### Priority 5: **Chart Library Lazy Loading** 📈

**Estimated savings:** 50-100KB

```typescript
const Chart = dynamic(() => import('@/components/Chart'), {
  loading: () => <ChartSkeleton />
})
```

### Priority 6: **Optimize next.config.ts** ⚙️

```typescript
// next.config.ts - enhanced webpack config
webpack: (config, { isServer, dev }) => {
  if (!isServer && !dev) {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        // ✅ Keep Three.js separate
        'three-libs': {
          test: /[\\/]node_modules[\\/](three|@react-three\/fiber|@react-three\/drei)[\\/]/,
          name: 'three-libs',
          priority: 60,
          reuseExistingChunk: true,
          enforce: true,
          minSize: 50000, // Increase min size to reduce fragmentation
        },
        // ✅ Optimize framework chunks
        framework: {
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next|next-intl)[\\/]/,
          name: 'framework',
          priority: 35,
          reuseExistingChunk: true,
          minSize: 50000, // Consolidate smaller chunks
        },
        // ✅ Lazy load charts
        'chart-libs': {
          test: /[\\/]node_modules[\\/](recharts|d3|vis-)[\\/]/,
          name: 'chart-libs',
          priority: 40,
          reuseExistingChunk: true,
          enforce: true,
        },
        // ✅ Separate Socket.io
        'realtime-libs': {
          test: /[\\/]node_modules[\\/](socket\.io-client|engine\.io-client)[\\/]/,
          name: 'realtime-libs',
          priority: 50,
          reuseExistingChunk: true,
          enforce: true,
          minSize: 50000,
        },
      },
    }
  }
  return config
}
```

### Priority 7: **Remove Unused Dependencies** 🧹

Check dependencies usage:

```bash
# Analyze unused dependencies
npx depcheck

# Check which packages are big
npx du --max-depth=1 node_modules | sort -hr | head -20
```

Potentially heavy libraries to review:

- `@react-three/drei` (10.7.7) - Very large bundle
- `three` (0.183.2) - Full 3D engine, maybe use lighter alternatives
- `recharts` (3.8.0) - Consider lighter charting libraries
- `@sentry/nextjs` (10.45.0) - Heavy instrumentation

---

## 📈 Expected Optimization Results

### Before Optimization

- **Client-side:** ~4.0M
- **Server-side:** ~6-7M
- **Total:** ~10-11M
- **Largest chunk:** 368K (three-libs)

### After Optimization (Expected)

- **Client-side:** ~2.8-3.2M (-20-25%)
- **Server-side:** ~5-5.5M (-15-20%)
- **Total:** ~7.8-8.7M (-20-30%)
- **Largest chunk:** ~200K (framework consolidated)

### Savings Breakdown

1. Dynamic Three.js: ~300-400KB
2. Dynamic Socket.io: ~200-300KB
3. Sentry optimization: ~100-200KB
4. Chart lazy loading: ~50-100KB
5. Framework consolidation: ~100-200KB
6. Tree-shaking improvements: ~50-100KB

**Total expected: 20-30% reduction**

---

## 🎯 Quick Win Actions (1-2 hours)

1. ✅ Wrap 3D components in `dynamic()` imports
2. ✅ Add `ssr: false` to Three.js components
3. ✅ Consolidate framework chunks (increase minSize)
4. ✅ Reduce Sentry tracing sample rate
5. ✅ Dynamic import Socket.io only when needed

## 🔄 Medium-term Actions (1-2 weeks)

1. Audit and remove unused Three.js components
2. Replace heavy chart library with lighter alternative if needed
3. Implement route-based code splitting
4. Add bundle analysis to CI/CD
5. Review and optimize Sentry configuration

## 📝 Code Review Checklist

- [ ] No static imports for Three.js in non-3D pages
- [ ] Socket.io only imported in WebSocket components
- [ ] Chart components use dynamic imports
- [ ] Sentry tracing disabled in development
- [ ] Framework chunks consolidated
- [ ] No unused dependencies
- [ ] Tree-shaking enabled for all libraries

---

## 🔧 Monitoring Progress

### Before/After Metrics

```bash
# Build and measure
ANALYZE=true npm run build

# Check client bundle sizes
du -h .next/static/chunks/*.js | sort -rh

# Check server bundle sizes
du -h .next/server/**/*.js | sort -rh | head -20
```

### Performance Targets

- ✅ First Contentful Paint (FCP): < 1.8s
- ✅ Largest Contentful Paint (LCP): < 2.5s
- ✅ Time to Interactive (TTI): < 3.5s
- ✅ Total Bundle Size: < 8M (gzipped)

---

## 📚 Additional Resources

- [Next.js Dynamic Imports](https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading)
- [React Three Fiber Performance](https://docs.pmnd.rs/react-three-fiber/advanced/persistence)
- [Webpack Bundle Splitting](https://webpack.js.org/guides/code-splitting/)
- [Next.js Bundle Analyzer](https://nextjs.org/docs/app/api-reference/config/next-config-js/bundleAnalyzer)

---

**Report generated by:** Bundle Optimization Agent
**Status:** Ready for implementation
**Confidence:** High
