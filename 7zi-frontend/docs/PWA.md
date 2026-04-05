# PWA Implementation Guide

## Overview

This document describes the PWA (Progressive Web App) implementation for 7zi-frontend v1.12.x.

## Features

### 1. Service Worker
- Automatic caching of static assets
- Offline support with NetworkFirst strategy
- Background sync capabilities
- Cache management API

### 2. Web Push Notifications
- Push notification subscription management
- VAPID key authentication
- Local notification display
- Server-side push delivery

### 3. PWA Installation
- Install prompt for supported browsers
- iOS installation instructions
- Desktop installation support
- App shortcuts

### 4. Performance Optimization
- Cache-first strategy for images and fonts
- Stale-while-revalidate for static resources
- Network timeout handling
- Cache size management

## Architecture

### Directory Structure

```
src/
├── lib/
│   └── pwa/
│       ├── web-push-service.ts      # Web Push API wrapper
│       ├── service-worker-manager.ts # Service Worker lifecycle
│       ├── utils.ts                  # PWA utilities
│       └── __tests__/
│           ├── utils.test.ts
│           └── web-push-service.test.ts
├── hooks/
│   └── usePWA.ts                     # React hook for PWA
├── components/
│   └── pwa/
│       ├── PWASettings.tsx           # Settings UI
│       └── PWAInstallPrompt.tsx      # Install prompt UI
└── app/
    ├── manifest.ts                   # PWA manifest
    └── api/
        └── pwa/
            └── route.ts              # PWA API endpoints
```

### Core Services

#### WebPushService
Manages Web Push API interactions:
- Permission requests
- Subscription management
- Local notifications
- Server communication

#### ServiceWorkerManager
Manages Service Worker lifecycle:
- Registration and updates
- Message passing
- Cache management
- Update activation

#### usePWA Hook
React hook providing PWA functionality:
- State management
- Permission handling
- Install prompts
- Network status

## Configuration

### Environment Variables

Create a `.env.local` file with:

```bash
# VAPID Keys (generate with: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_EMAIL=mailto:contact@7zi.com

# PWA Settings
NEXT_PUBLIC_PWA_ENABLED=true
NEXT_PUBLIC_SITE_URL=https://7zi.com
```

### Next.js Config

PWA is configured in `next.config.ts` using `next-pwa`:

```typescript
const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // Cache strategies...
  ],
}
```

## Usage

### Basic Setup

1. **Initialize PWA in your app:**

```tsx
'use client'

import { useEffect } from 'react'
import { webPushService } from '@/lib/pwa/web-push-service'
import { serviceWorkerManager } from '@/lib/pwa/service-worker-manager'

export default function App() {
  useEffect(() => {
    // Initialize Service Worker
    serviceWorkerManager.initialize()

    // Initialize Web Push
    webPushService.initialize()
  }, [])

  return <YourApp />
}
```

2. **Use the PWA hook:**

```tsx
'use client'

import { usePWA } from '@/hooks/usePWA'

export default function MyComponent() {
  const { state, requestPushPermission, subscribeToPush } = usePWA()

  const handleSubscribe = async () => {
    const permission = await requestPushPermission()
    if (permission === 'granted') {
      await subscribeToPush(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
    }
  }

  return (
    <div>
      <p>PWA Supported: {state.isSupported ? 'Yes' : 'No'}</p>
      <button onClick={handleSubscribe}>Subscribe to Notifications</button>
    </div>
  )
}
```

3. **Add install prompt:**

```tsx
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt'

export default function Layout({ children }) {
  return (
    <html>
      <body>
        {children}
        <PWAInstallPrompt />
      </body>
    </html>
  )
}
```

### Sending Push Notifications

From your server:

```typescript
import webpush from 'web-push'

const payload = JSON.stringify({
  notification: {
    title: 'Hello!',
    body: 'This is a push notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
  },
})

await webpush.sendNotification(subscription, payload)
```

## Cache Strategies

### NetworkFirst
Used for:
- API requests
- Dynamic content
- HTML pages

Fallback to cache after network timeout.

### CacheFirst
Used for:
- Images
- Fonts
- Static assets

Serve from cache, update in background.

### StaleWhileRevalidate
Used for:
- JavaScript bundles
- CSS files
- Static resources

Serve from cache, update in background.

## Testing

### Unit Tests

```bash
npm test -- src/lib/pwa/__tests__
```

### Manual Testing

1. **Service Worker:**
   - Open DevTools → Application → Service Workers
   - Check registration status
   - Test offline mode

2. **Push Notifications:**
   - Request permission
   - Subscribe to push
   - Send test notification

3. **Installation:**
   - Test install prompt
   - Verify app shortcuts
   - Test offline functionality

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| Push API | ✅ | ✅ | ⚠️* | ✅ |
| Install Prompt | ✅ | ✅ | ❌ | ✅ |
| Offline Support | ✅ | ✅ | ✅ | ✅ |

*Safari supports Push API on macOS only, not iOS.

## Troubleshooting

### Service Worker Not Registering

1. Check HTTPS is enabled (required for SW)
2. Verify `next.config.ts` PWA config
3. Check browser console for errors

### Push Notifications Not Working

1. Verify VAPID keys are set
2. Check notification permission
3. Ensure subscription is sent to server
4. Test with local notification first

### Cache Issues

1. Clear caches via PWA Settings
2. Check cache size limits
3. Verify cache strategies

## Performance Metrics

Target metrics for PWA:

- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3.5s
- **Lighthouse PWA Score:** > 90
- **Offline Functionality:** Full support

## Security Considerations

1. **HTTPS Required:** PWA features require HTTPS
2. **VAPID Keys:** Keep private key secure
3. **Content Security Policy:** Configure properly
4. **Subdomain Isolation:** Use separate subdomain for push

## Future Enhancements

- [ ] Background sync for offline actions
- [ ] Periodic background sync
- [ ] File System Access API
- [ ] Share Target API
- [ ] Contact Picker API
- [ ] Badging API

## References

- [PWA Best Practices](https://web.dev/pwa/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [next-pwa Documentation](https://github.com/shadowwalker/next-pwa)

## Version History

- **v1.12.0** - Initial PWA implementation
  - Service Worker with caching strategies
  - Web Push notification support
  - Install prompts and shortcuts
  - PWA settings UI
  - Comprehensive testing