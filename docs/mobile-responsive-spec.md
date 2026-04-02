# Mobile Responsive Design Specification

**Project**: 7zi AI Team Management Platform
**Version**: 1.0.0
**Last Updated**: 2026-03-20
**Author**: Mobile Responsive Subagent

---

## Executive Summary

This specification outlines the mobile-first redesign strategy for the 7zi AI Team Management Platform. The goal is to deliver an optimal experience on mobile devices (320px-768px) while maintaining excellence on desktop/tablet screens.

**Key Objectives**:

- Ensure all components work flawlessly on 320px-768px screens
- Implement touch-friendly navigation with minimum 44px tap targets
- Optimize for mobile network performance (3G/4G)
- Create consistent responsive patterns across the application
- Achieve <3s initial load on 3G networks

---

## 1. Breakpoint Strategy

### 1.1 Breakpoint System

We use a mobile-first approach with 5 breakpoint tiers:

| Breakpoint | Screen Width   | Device Type   | Use Case                        |
| ---------- | -------------- | ------------- | ------------------------------- |
| **xs**     | 320px - 375px  | Small phones  | iPhone SE, older Android phones |
| **sm**     | 376px - 414px  | Medium phones | iPhone 13/14, Galaxy S21        |
| **md**     | 415px - 640px  | Large phones  | iPhone Pro Max, Pixel Pro       |
| **lg**     | 641px - 1024px | Tablets       | iPad, Android tablets           |
| **xl**     | 1025px+        | Desktops      | Laptops, desktop monitors       |

### 1.2 Tailwind Configuration

```javascript
// tailwind.config.js
export default {
  theme: {
    screens: {
      xs: '320px',
      sm: '375px',
      md: '415px',
      lg: '641px',
      xl: '1025px',
      '2xl': '1280px',
    },
  },
}
```

### 1.3 Breakpoint Usage Guidelines

- **Default styles**: Mobile-first (320px baseline)
- **sm**: Small enhancements (minor layout adjustments)
- **md**: Layout transitions (grid changes, navigation shifts)
- **lg**: Desktop layouts (sidebars, multi-column)
- **xl**: Wide screens (maximum content width enforcement)

---

## 2. Touch-Friendly Navigation Components

### 2.1 Navigation Architecture

#### Desktop (xl)

- Horizontal top navigation bar
- Full navigation links visible
- Hover states for interactivity
- 56px height

#### Tablet (lg)

- Same as desktop but with increased spacing
- Touch targets minimum 48px

#### Mobile (md, sm, xs)

- Hamburger menu button (48x48px minimum)
- Slide-out panel from right (280px or 85vw)
- Bottom navigation bar for core actions
- 56px header height

### 2.2 Touch Target Specifications

All interactive elements must meet these minimum sizes:

| Element Type     | Minimum Size | Recommended Size | Rationale                   |
| ---------------- | ------------ | ---------------- | --------------------------- |
| Buttons          | 44x44px      | 48x48px          | iOS HIG, Android guidelines |
| Navigation items | 44x44px      | 56x56px          | Easy thumb access           |
| Form inputs      | 44px height  | 48px height      | Prevent zoom on iOS         |
| Checkboxes       | 44x44px      | 48x48px          | Large tap area              |
| Links (inline)   | 44x44px      | 48x48px          | Contextual hit area         |

### 2.3 Navigation Component Specifications

#### Top Navigation Bar

```tsx
// Desktop: Full navigation
<nav className="h-16 px-4 hidden md:flex items-center justify-between">
  <Logo />
  <NavigationLinks />
  <Settings />
</nav>

// Mobile: Hamburger menu
<nav className="h-16 px-4 md:hidden flex items-center justify-between">
  <Logo />
  <HamburgerButton onClick={toggleMenu} />
</nav>
```

**Specifications**:

- Height: 64px (16 units)
- Sticky positioning: `sticky top-0`
- Z-index: 50 (above content)
- Background: White/dark mode compatible
- Border bottom: 1px solid

#### Slide-Out Menu (Mobile)

```tsx
<div
  className={`fixed inset-0 z-50 md:hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300`}
>
  <Backdrop onClick={close} />
  <MenuPanel className="w-[min(280px,85vw)]">
    <NavigationLinks />
    <Settings />
  </MenuPanel>
</div>
```

**Specifications**:

- Width: `min(280px, 85vw)`
- Animation: 300ms ease-out
- Backdrop: Black with 60% opacity, blur effect
- Safe area padding: `env(safe-area-inset-bottom)`
- Scrollable content when longer than viewport

---

## 3. Bottom Navigation Bar Design

### 3.1 Bottom Navigation Strategy

Bottom navigation is reserved for the 4-5 most frequently accessed features.

**Navigation Items**:

1. 🏠 Home (`/`)
2. 📊 Dashboard (`/dashboard`)
3. 📋 Tasks (`/tasks`)
4. 🧠 Memory (`/memory`)

### 3.2 Bottom Navigation Specifications

```tsx
<nav className="safe-area-bottom fixed right-0 bottom-0 left-0 h-16 border-t bg-white md:hidden dark:bg-zinc-900">
  <NavItem href="/" icon="🏠" label="Home" />
  <NavItem href="/dashboard" icon="📊" label="Dashboard" />
  <NavItem href="/tasks" icon="📋" label="Tasks" />
  <NavItem href="/memory" icon="🧠" label="Memory" />
</nav>
```

**Design Specifications**:

- Height: 64px (16 units) + safe area inset
- Position: Fixed bottom, full width
- Background: White/dark mode
- Border top: 1px solid
- Z-index: 40 (below modals, above content)
- Items: Equally spaced, 25% width each

**Active State**:

- Icon: Scale 1.1, primary color
- Label: Bold, primary color
- Indicator: Optional dot above icon

**Inactive State**:

- Icon: Grayscale opacity 60%
- Label: Regular text, muted color

### 3.3 Bottom Navigation Item Component

```tsx
interface NavItemProps {
  href: string
  icon: string
  label: string
  isActive: boolean
}

const NavItem: React.FC<NavItemProps> = ({ href, icon, label, isActive }) => (
  <Link
    href={href}
    className={`touch-active flex h-full w-full flex-col items-center justify-center transition-all duration-200 ${isActive ? 'text-cyan-500' : 'text-gray-500 dark:text-zinc-400'} `}
  >
    <span
      className={`mb-1 text-2xl transition-transform duration-200 ${isActive ? 'scale-110' : ''} `}
    >
      {icon}
    </span>
    <span className={`text-xs font-medium ${isActive ? 'font-bold' : ''} `}>{label}</span>
  </Link>
)
```

### 3.4 Bottom Navigation Visibility

- **Visible**: xs, sm, md breakpoints (mobile devices)
- **Hidden**: lg, xl, 2xl breakpoints (tablet/desktop)
- **Content padding**: Add 64px bottom padding to main content on mobile

---

## 4. Performance Optimization for Mobile Networks

### 4.1 Loading Performance Goals

| Metric                         | Target | Measurement    |
| ------------------------------ | ------ | -------------- |
| First Contentful Paint (FCP)   | <1.5s  | Lighthouse     |
| Largest Contentful Paint (LCP) | <2.5s  | Lighthouse     |
| Time to Interactive (TTI)      | <3.5s  | Lighthouse     |
| Cumulative Layout Shift (CLS)  | <0.1   | Lighthouse     |
| Total Bundle Size              | <200KB | Build analysis |

### 4.2 Image Optimization

#### Image Loading Strategy

```tsx
// Use Next.js Image component for all images
<Image
  src={src}
  alt={alt}
  width={400}
  height={400}
  loading="lazy" // Lazy load below-the-fold images
  placeholder="blur" // Show blur placeholder while loading
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
/>
```

**Avatar Optimization**:

- Size: 32px, 48px, 64px variants
- Format: WebP with AVIF fallback
- Lazy load: All avatars below fold
- Blur placeholder: 10px blur

#### Image Responsive Sizes

```typescript
const imageSizes = {
  avatar: {
    xs: 32,
    sm: 40,
    md: 48,
    lg: 64,
    xl: 80,
  },
  hero: {
    mobile: '100vw',
    tablet: '50vw',
    desktop: '33vw',
  },
}
```

### 4.3 Code Splitting and Lazy Loading

#### Component Lazy Loading

```tsx
// Lazy load heavy components
const Dashboard = dynamic(() => import('@/components/Dashboard'), {
  loading: () => <LoadingSpinner />,
  ssr: true, // Enable SSR for SEO
})

const TaskBoard = dynamic(() => import('@/components/TaskBoard'), {
  loading: () => <SkeletonLoader />,
  ssr: false, // Client-only for performance
})
```

#### Route-Based Splitting

- Each route is automatically split by Next.js
- Shared components in node_modules
- Minimal duplication

### 4.4 Font Optimization

#### Font Loading Strategy

```tsx
// Subsetting and preloading
<link
  rel="preload"
  href="/fonts/geist-sans-subset.woff2"
  as="font"
  type="font/woff2"
  crossOrigin="anonymous"
/>
```

**Font Strategy**:

- Use `next/font/google` with subsetting
- Subset: Latin only (reduced by ~60%)
- Format: WOFF2 only
- Preload: Critical fonts
- Display: `swap` to prevent FOIT

### 4.5 Data Fetching Optimization

#### API Response Optimization

```typescript
// Mobile-first data fetching
const dashboardData = await fetch('/api/dashboard', {
  cache: 'force-cache', // Cache aggressively
  next: { revalidate: 30 }, // 30s revalidation
})

// Conditional data loading for mobile
const minimalData = isMobile
  ? await fetch('/api/dashboard?minimal=true')
  : await fetch('/api/dashboard')
```

**Mobile Data Reduction**:

- Reduce payload size by 40-60%
- Omit non-essential fields
- Use pagination for lists
- Implement skeleton screens

### 4.6 CSS Optimization

#### Critical CSS

```css
/* Critical styles inline */
@layer critical {
  header {
    /* styles */
  }
  main {
    /* styles */
  }
}

/* Non-critical styles deferred */
@layer deferred {
  .chart {
    /* styles */
  }
  .animation {
    /* styles */
  }
}
```

**CSS Strategy**:

- Use Tailwind CSS for 95% of styles
- Purge unused classes in production
- Minify CSS output
- Async load non-critical CSS

### 4.7 Bundle Size Optimization

#### Tree Shaking

```javascript
// Import only what you need
import { debounce } from 'lodash-es' // Good
import _ from 'lodash' // Bad - imports entire library

// Use ES modules
import { format } from 'date-fns' // Good
import dateFns from 'date-fns' // Bad
```

#### Library Alternatives

| Heavy Library | Lightweight Alternative | Size Reduction |
| ------------- | ----------------------- | -------------- |
| moment.js     | date-fns                | 95%            |
| lodash        | lodash-es               | 85%            |
| axios         | fetch/undici            | 90%            |
| uuid          | crypto.randomUUID()     | 100%           |

### 4.8 Network-Aware Features

#### Connection Awareness

```typescript
const isSlowConnection = navigator.connection
  ? navigator.connection.effectiveType.includes('2g')
  : false

// Reduce features on slow connections
if (isSlowConnection) {
  disableAnimations()
  reduceImageQuality()
  disableRealtimeUpdates()
}
```

#### Progressive Enhancement

1. **Baseline**: HTML content loads
2. **Enhanced**: CSS renders layout
3. **Interactive**: JavaScript enables features
4. **Full**: Real-time updates, animations

### 4.9 Caching Strategy

#### Service Worker Caching

```typescript
// Cache-first for static assets
workbox.routing.registerRoute(
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  new workbox.strategies.CacheFirst({
    cacheName: 'images',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
)

// Stale-while-revalidate for API data
workbox.routing.registerRoute(
  /\/api\//,
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'api-data',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
)
```

---

## 5. Responsive Component Patterns

### 5.1 Grid System

```tsx
// Mobile: 1 column
// Tablet: 2 columns
// Desktop: 3 columns

<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  {items.map(item => (
    <Card key={item.id}>{item}</Card>
  ))}
</div>
```

### 5.2 Typography Scaling

```tsx
<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
  Responsive Heading
</h1>

<p className="text-sm sm:text-base md:text-lg">
  Responsive Body Text
</p>
```

### 5.3 Container Widths

```tsx
<div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-4xl">
  Content with responsive max-width
</div>
```

### 5.4 Spacing System

```tsx
// Reduce spacing on mobile
<div className="p-2 sm:p-4 md:p-6 lg:p-8">
  Responsive Padding
</div>

<div className="gap-2 sm:gap-4 md:gap-6">
  Responsive Gap
</div>
```

---

## 6. Accessibility on Mobile

### 6.1 Touch Accessibility

- Minimum tap target: 44x44px
- Spacing between touch targets: 8px minimum
- No zoom required to interact
- Keyboard navigation support

### 6.2 Screen Reader Support

- ARIA labels for all interactive elements
- Semantic HTML structure
- Focus indicators visible
- Skip to main content link

### 6.3 Visual Accessibility

- Minimum contrast ratio: 4.5:1 (WCAG AA)
- Text resize support (up to 200%)
- Color not used as only indicator
- Consistent focus states

---

## 7. Testing Checklist

### 7.1 Device Testing

- [ ] iPhone SE (320px)
- [ ] iPhone 13/14 (390px)
- [ ] iPhone Pro Max (428px)
- [ ] Android Small (360px)
- [ ] Android Large (412px)
- [ ] iPad (768px)
- [ ] Desktop (1920px)

### 7.2 Browser Testing

- [ ] Chrome (Android)
- [ ] Safari (iOS)
- [ ] Firefox (Android)
- [ ] Edge (Desktop)
- [ ] Samsung Internet

### 7.3 Network Testing

- [ ] 3G (1.6 Mbps down, 750 kbps up)
- [ ] 4G (4 Mbps down, 3 Mbps up)
- [ ] Offline functionality
- [ ] Slow 4G (400ms RTT)

### 7.4 Performance Testing

- [ ] Lighthouse score >90
- [ ] Bundle size <200KB
- [ ] FCP <1.5s
- [ ] LCP <2.5s
- [ ] TTI <3.5s
- [ ] CLS <0.1

---

## 8. Implementation Priority

### Phase 1: Critical (Week 1)

1. Bottom navigation bar
2. Mobile menu implementation
3. Touch target optimization
4. Basic responsive grid
5. Safe area handling

### Phase 2: Important (Week 2)

1. Image optimization
2. Code splitting
3. Font optimization
4. Performance monitoring
5. Accessibility improvements

### Phase 3: Enhanced (Week 3)

1. Advanced animations
2. Gesture support
3. Offline functionality
4. Progressive enhancement
5. A/B testing

---

## 9. Success Metrics

### 9.1 Core Web Vitals

- **Good**: All metrics in green zone
- **Needs Improvement**: 1-2 metrics in yellow
- **Poor**: Any metric in red

### 9.2 User Experience Metrics

- Mobile bounce rate: <40%
- Mobile session duration: >2 minutes
- Mobile conversion rate: >5%
- User satisfaction score: >4.5/5

### 9.3 Technical Metrics

- 95th percentile LCP: <2.5s
- 95th percentile TTI: <3.5s
- Error rate: <0.5%
- Uptime: >99.9%

---

## 10. Maintenance and Updates

### 10.1 Regular Audits

- Monthly Lighthouse audits
- Quarterly device testing
- Biannual design review
- Annual accessibility audit

### 10.2 Monitoring

- Real User Monitoring (RUM)
- Core Web Vitals dashboard
- Error tracking (Sentry)
- Performance budgets

### 10.3 Documentation Updates

- Update this spec quarterly
- Document new patterns as they emerge
- Share learnings with team
- Maintain component library

---

## Appendix A: Component Examples

### A.1 Responsive Card Component

```tsx
const ResponsiveCard = ({ title, children }) => (
  <div className="m-2 rounded-lg border bg-white p-4 shadow-sm sm:m-4 sm:p-6 md:m-6 md:p-8 dark:bg-zinc-900">
    <h2 className="mb-4 text-lg sm:text-xl md:text-2xl">{title}</h2>
    <div className="text-sm sm:text-base">{children}</div>
  </div>
)
```

### A.2 Responsive Button Component

```tsx
const ResponsiveButton = ({ children, onClick }) => (
  <button
    onClick={onClick}
    className="touch-active min-h-[44px] min-w-[44px] rounded-lg px-4 py-2 text-sm transition-all active:scale-95 sm:px-6 sm:py-3 sm:text-base md:px-8 md:py-4 md:text-lg"
  >
    {children}
  </button>
)
```

### A.3 Responsive Form Component

```tsx
const ResponsiveForm = ({ children }) => (
  <form className="mx-auto max-w-full p-4 sm:max-w-md sm:p-6 md:max-w-lg md:p-8 lg:max-w-2xl">
    {children}
  </form>
)
```

---

## Appendix B: Resources

### B.1 Documentation

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Next.js Image Optimization](https://nextjs.org/docs/api-reference/next/image)
- [Mobile Navigation Patterns](https://www.nngroup.com/articles/mobile-navigation/)

### B.2 Tools

- Lighthouse: Performance auditing
- WebPageTest: Network simulation
- Chrome DevTools: Device emulation
- BrowserStack: Real device testing

### B.3 Standards

- WCAG 2.1 Level AA
- iOS Human Interface Guidelines
- Material Design Guidelines
- Web Content Accessibility Guidelines

---

**Document Status**: ✅ Complete
**Next Review**: 2026-06-20
**Maintainer**: Mobile Responsive Subagent
