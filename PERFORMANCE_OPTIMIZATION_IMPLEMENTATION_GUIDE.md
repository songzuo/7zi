# Performance Optimization Implementation Guide

**Based on:** Performance Audit Report 2026-03-19
**Priority:** CRITICAL - Build Blockers First

---

## Phase 1: Critical Build Fixes (Day 1)

### 1.1 Fix WebSocket Server TypeScript Errors

**Problem:** Server Actions must be async functions

**File:** `src/lib/websocket/server.ts`

**Fixes Required:**

```typescript
// Line 642 - Change from sync to async
// BEFORE:
export function getServer(): SocketIOServer | null {
  return io;
}

// AFTER:
export async function getServer(): Promise<SocketIOServer | null> {
  return io;
}

// Line 646
// BEFORE:
export function getStats() {
  if (!io) {
    return {
      connected: 0,
      rooms: 0,
      // ...
    };
  }
  // ...
}

// AFTER:
export async function getStats() {
  if (!io) {
    return {
      connected: 0,
      rooms: 0,
      // ...
    };
  }
  // ...
}

// Line 665
// BEFORE:
export function getRoomInfo(roomId: string) {
  const room = getRoom(roomId);
  if (!room) return null;
  // ...
}

// AFTER:
export async function getRoomInfo(roomId: string) {
  const room = getRoom(roomId);
  if (!room) return null;
  // ...
}

// Line 686
// BEFORE:
export function getAllRooms() {
  return Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    // ...
  }));
}

// AFTER:
export async function getAllRooms() {
  return Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    // ...
  }));
}

// Line 697
// BEFORE:
export function broadcastSystemAnnouncement(message: string): void {
  broadcastToAll('system:announcement', {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    message,
  });
}

// AFTER:
export async function broadcastSystemAnnouncement(message: string): Promise<void> {
  broadcastToAll('system:announcement', {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    message,
  });
}
```

### 1.2 Install Missing Dependencies

```bash
# Install socket.io
npm install socket.io

# Install TypeScript types
npm install --save-dev @types/socket.io

# Verify JWT module exists or install it
ls -la src/lib/auth/jwt.ts

# If missing, install JWT library
npm install jose  # Already in package.json

# Or create the missing module
```

### 1.3 Fix Import Path

**File:** `src/lib/websocket/server.ts` (Line 13)

```typescript
// BEFORE:
import { verifyToken } from '@/lib/auth/jwt';

// AFTER (if the file exists at a different path):
import { verifyToken } from '@/lib/auth';

// Or if the module doesn't exist, create it:
```

**Create missing JWT module if needed:**

```typescript
// File: src/lib/auth/jwt.ts
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
);

export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as JWTPayload;
  } catch (error) {
    return null;
  }
}
```

### 1.4 Verify Build Success

```bash
# Clean build artifacts
rm -rf .next

# Test build
npm run build

# Should see:
# ✓ Compiled successfully
# ✓ Collecting page data
# ✓ Generating static pages
# ✓ Collecting build traces
# ✓ Finalizing page optimization
```

### 1.5 Run Bundle Analysis

```bash
# Build with analyzer
npm run build:analyze

# Wait for build to complete
# This will create .next/analyze/ directory

# View results
# Option 1: Use Next.js built-in analyzer (if configured)
# Option 2: Use webpack-bundle-analyzer
```

---

## Phase 2: Next.js Performance Optimization (Day 2-3)

### 2.1 Add Turbopack Bundle Analyzer

**File:** `next.config.ts`

```typescript
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";
import withBundleAnalyzer from '@next/bundle-analyzer';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Enable bundle analyzer in production or when ANALYZE=true
const withBundle = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // ... existing config
};

// Apply wrappers in correct order
export default withNextIntl(withBundle(nextConfig));
```

### 2.2 Optimize Compression

**File:** `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',

  turbopack: {
    root: __dirname,
  },

  // Add these:
  swcMinify: true,
  compress: true,

  // ... rest of config
};
```

### 2.3 Add Font Preload

**File:** `src/app/layout.tsx`

```typescript
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
  preload: true,  // Add this
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: 'swap',
  preload: true,  // Add this
});
```

### 2.4 Add Cache Headers for Fonts

**File:** `next.config.ts`

```typescript
headers: async () => [
  {
    source: '/:path*.{png,jpg,jpeg,webp,avif,svg,ico}',
    headers: [
      {
        key: 'Cache-Control',
        value: 'public, max-age=31536000, immutable',
      },
    ],
  },
  {
    // Add this for fonts
    source: '/:path*.{woff,woff2,ttf,otf,eot}',
    headers: [
      {
        key: 'Cache-Control',
        value: 'public, max-age=31536000, immutable',
      },
    ],
  },
  // ... rest of headers
]
```

---

## Phase 3: Bundle Optimization (Day 4-5)

### 3.1 Analyze Bundle After Successful Build

```bash
# Build with analysis
ANALYZE=true npm run build

# This will open browser with visualization
# Look for:
# - Large chunks (> 100KB)
# - Duplicate dependencies
# - Unused code
# - Large vendor bundles
```

### 3.2 Optimize Large Dependencies

**Target Dependencies:**
- `xlsx` (7.3MB) - Consider lighter alternatives
- `better-sqlite3` (12MB) - Ensure client-side exclusion
- Sentry modules - Check tree-shaking

#### Option 1: Replace xlsx with lighter alternative

```bash
# Remove xlsx
npm uninstall xlsx

# Install sheetjs (lighter)
npm install xlsx-style

# Or use csv parser if only CSV is needed
npm install papaparse
```

#### Option 2: Dynamic import xlsx

```typescript
// Instead of:
import * as XLSX from 'xlsx';

// Use dynamic import:
const loadXLSX = async () => {
  const XLSX = await import('xlsx');
  return XLSX;
};

// Usage:
const handleExport = async () => {
  const XLSX = await loadXLSX();
  // Use XLSX
};
```

#### Option 3: Ensure better-sqlite3 is server-only

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  // ... existing config

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude better-sqlite3 from client bundle
      config.externals = config.externals || [];
      config.externals.push('better-sqlite3');
    }

    // ... rest of webpack config
  },
};
```

### 3.3 Optimize Sentry Integration

```typescript
// sentry.client.config.ts
export default {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Enable only what you need
  integrations: [
    new Sentry.BrowserTracing(),
    // new Sentry.Replay(), // Only if needed
  ],
  tracesSampleRate: 0.1, // Reduce from 1.0 to 0.1
  // replaysSessionSampleRate: 0.1, // Only if using Replay
  // replaysOnErrorSampleRate: 1.0,
};
```

---

## Phase 4: Image Optimization (Day 6)

### 4.1 Install Image Optimization Tools

```bash
npm install --save-dev imagemin imagemin-webp imagemin-mozjpeg imagemin-pngquant
```

### 4.2 Create Image Optimization Script

```typescript
// scripts/optimize-images.ts
import imagemin from 'imagemin';
import imageminWebp from 'imagemin-webp';
import imageminMozjpeg from 'imagemin-mozjpeg';
import imageminPngquant from 'imagemin-pngquant';
import path from 'path';

async function optimizeImages() {
  const imagesDir = path.join(process.cwd(), 'public/images');

  // Convert to WebP
  await imagemin([`${imagesDir}/**/*.{jpg,png}`], {
    destination: path.join(imagesDir, 'optimized'),
    plugins: [
      imageminWebp({ quality: 80 }),
    ],
  });

  // Optimize original JPEGs
  await imagemin([`${imagesDir}/**/*.jpg`], {
    destination: path.join(imagesDir, 'optimized'),
    plugins: [
      imageminMozjpeg({ quality: 75 }),
    ],
  });

  // Optimize original PNGs
  await imagemin([`${imagesDir}/**/*.png`], {
    destination: path.join(imagesDir, 'optimized'),
    plugins: [
      imageminPngquant({ quality: [0.65, 0.8] }),
    ],
  });

  console.log('✅ Images optimized successfully!');
}

optimizeImages().catch(console.error);
```

**Add to package.json:**

```json
{
  "scripts": {
    "optimize-images": "ts-node scripts/optimize-images.ts"
  }
}
```

### 4.3 Update Image Components to Use Next.js Image

```typescript
// src/components/OptimizedImage.tsx
import Image from 'next/image';

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  quality = 75,
  ...props
}: OptimizedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      quality={quality}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..." // Generate blur placeholder
      {...props}
    />
  );
}
```

---

## Phase 5: LCP Optimization (Day 7)

### 5.1 Identify and Optimize LCP Element

**Step 1: Find LCP element**

```typescript
// Add to layout.tsx or page.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        {/* The largest element above the fold is likely the LCP */}
        <HeroSection />
        {/* ... */}
      </body>
    </html>
  );
}
```

**Step 2: Add priority to LCP image**

```typescript
// src/components/HeroSection.tsx
<Image
  src="/images/hero.webp"
  alt="Hero"
  width={1920}
  height={1080}
  priority={true}  // This is critical for LCP
  quality={85}
  placeholder="blur"
/>
```

### 5.2 Add Critical CSS

**File:** `src/app/layout.tsx`

```typescript
// Extract critical CSS manually or using a tool
const criticalCSS = `
  body { margin: 0; font-family: system-ui, sans-serif; }
  .hero { min-height: 100vh; display: flex; align-items: center; }
  /* ... more critical styles */
`;

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <style dangerouslySetInnerHTML={{ __html: criticalCSS }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
```

### 5.3 Add Resource Hints

**File:** `src/app/layout.tsx`

```typescript
export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

        {/* Preload critical fonts */}
        <link
          rel="preload"
          href="/fonts/geist-sans.woff2"
          as="font"
          type="font/woff2"
          crossOrigin=""
        />

        {/* Preload LCP image */}
        <link
          rel="preload"
          fetchPriority="high"
          href="/images/hero.webp"
          as="image"
        />

        {/* DNS prefetch for analytics */}
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
```

---

## Phase 6: Performance Monitoring (Day 8)

### 6.1 Integrate Web Vitals with Monitoring API

```typescript
// src/lib/monitoring/web-vitals-integration.ts
import { onCLS, onFID, onLCP, onINP, onTTFB } from 'web-vitals';

export function sendToAnalytics(metric: any) {
  // Send to your monitoring API
  fetch('/api/performance/vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metric),
  }).catch(console.error);
}

export function initWebVitals() {
  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onLCP(sendToAnalytics);
  onINP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
```

**Create API endpoint:**

```typescript
// src/app/api/performance/vitals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const metrics = await request.json();

    // Log metrics
    logger.info('Web Vitals:', {
      LCP: metrics.value,
      metric: metrics.name,
      rating: metrics.rating,
    });

    // Store in database or analytics service
    // await storeMetrics(metrics);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to store web vitals', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
```

**Initialize in app:**

```typescript
// src/app/layout.tsx
'use client';
import { useEffect } from 'react';
import { initWebVitals } from '@/lib/monitoring/web-vitals-integration';

export function WebVitalsTracker() {
  useEffect(() => {
    initWebVitals();
  }, []);

  return null;
}
```

### 6.2 Add Performance Budgets

**File:** `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  // ... existing config

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.performance = {
        maxAssetSize: 244000,  // 244KB
        maxEntrypointSize: 244000,
        hints: 'warning',
      };
    }

    // ... rest of webpack config
  },
};
```

---

## Phase 7: Caching & Service Worker (Day 9-10)

### 7.1 Create Service Worker

**File:** `public/sw.js`

```javascript
const CACHE_NAME = '7zi-v1';
const STATIC_CACHE = 'static-v1';
const IMAGE_CACHE = 'images-v1';

// Cache static assets
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
      caches.open(IMAGE_CACHE),
    ])
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== IMAGE_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache first for static assets
  if (
    url.pathname.match(/\.(?:css|js|woff|woff2|ttf|otf)$/) ||
    url.origin === self.location.origin
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request);
      })
    );
    return;
  }

  // Cache first for images
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((response) => {
            // Cache successful responses
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          });
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // Network first for API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache GET API responses
          if (request.method === 'GET' && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Default: network first
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
```

### 7.2 Register Service Worker

```typescript
// src/components/ServiceWorkerRegistration.tsx
'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration);
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });
    }
  }, []);

  return null;
}
```

---

## Phase 8: Testing & Validation (Day 11-12)

### 8.1 Run Lighthouse CI

```bash
npm install -g @lhci/cli

# Create lighthouserc.json
lhci autorun
```

**Configuration:** `lighthouserc.json`

```json
{
  "ci": {
    "collect": {
      "staticDistDir": ".next",
      "url": ["http://localhost:3000"],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.8 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.9 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### 8.2 Measure Core Web Vitals

```bash
# Build production
npm run build
npm start

# In another terminal, run Lighthouse
lighthouse http://localhost:3000 --view --preset=desktop

# Or use WebPageTest
# Visit: https://www.webpagetest.org
```

### 8.3 Validate Bundle Size

```bash
# Analyze bundle
npm run build:analyze

# Check build output
ls -lh .next/static/chunks/

# Should see reduced sizes:
# - Main bundle: < 200KB (gzipped)
# - Vendor bundles: < 400KB (gzipped)
# - Total first load: < 600KB (gzipped)
```

---

## Success Metrics

### Before Optimization (Estimated)
- Build: ❌ Failing
- Bundle Analysis: ❌ Not available
- LCP: Unknown (build blocked)
- First Load JS: ~500-700KB (estimated)

### After Optimization (Target)
- Build: ✅ Passing
- Bundle Analysis: ✅ Available
- LCP: < 2.5s ✅
- FID: < 100ms ✅
- CLS: < 0.1 ✅
- First Load JS: < 500KB (gzipped) ✅
- Performance Score: > 90 ✅

---

## Checklist

### Week 1 - Critical Fixes
- [ ] Fix WebSocket server TypeScript errors
- [ ] Install socket.io dependencies
- [ ] Verify successful build
- [ ] Run bundle analysis
- [ ] Review bundle sizes

### Week 2 - Performance Optimization
- [ ] Implement Web Vitals tracking
- [ ] Add performance budgets
- [ ] Optimize large dependencies
- [ ] Add resource hints
- [ ] Configure Service Worker

### Week 3 - Final Polish
- [ ] Run Lighthouse CI
- [ ] Measure Core Web Vitals
- [ ] Validate bundle sizes
- [ ] Test in production
- [ ] Document results

---

**Implementation Timeline:** 12 days
**Expected Performance Improvement:** 30-40% faster load times
**Priority:** Critical build fixes first, then optimization
