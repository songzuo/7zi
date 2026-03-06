# 7zi-frontend 性能优化调研报告

**调研日期**: 2026-03-06  
**调研人**: 咨询师  
**项目目录**: ~/7zi-project/7zi-frontend

---

## 一、当前项目性能分析

### 1.1 项目技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Next.js | 16.1.6 | App Router, standalone 输出 |
| React | 19.2.3 | 最新版本 |
| TypeScript | 5.x | 严格模式 |
| Tailwind CSS | 4.x | 原子化 CSS |
| next-intl | 4.8.3 | 国际化 |

### 1.2 当前已实现的优化

#### ✅ 图片优化
- **Next.js Image 组件**: 已配置 `formats: ['image/avif', 'image/webp']`
- **LazyImage 组件**: 自定义懒加载组件，支持 IntersectionObserver
- **响应式图片**: 配置了 `deviceSizes` 和 `imageSizes`
- **缓存策略**: `minimumCacheTTL: 60`

#### ✅ 缓存策略
- **Service Worker**: 已实现基础 PWA 缓存 (`public/sw.js`)
  - Network First 策略
  - 静态资源预缓存
  - 离线支持
- **HTTP 缓存头**: Next.js headers 配置完善
  - 静态资源: 1年缓存
  - 图片资源: 1年缓存
  - 安全头: HSTS, X-Frame-Options 等

#### ✅ 构建优化
- **Standalone 输出**: Docker 部署优化
- **多阶段构建**: Dockerfile 优化
- **压缩**: `compress: true` 已启用

#### ✅ 渲染性能
- **useCallback 使用**: SettingsContext, useGitHubData 等已使用
- **memoize 工具函数**: lib/utils.ts 提供了缓存函数

### 1.3 性能问题识别

#### 🔴 高优先级问题

| 问题 | 影响 | 位置 |
|------|------|------|
| **首页体积过大** | 首页 `page.tsx` 约 400+ 行，包含大量静态数据 | `src/app/[locale]/page.tsx` |
| **无代码分割** | 所有组件同步加载，无 React.lazy/dynamic | 全局 |
| **PARTICLES 硬编码** | 35 个粒子对象在组件内定义，每次渲染重建 | 首页 |
| **未使用 React.memo** | 子组件未做 memo 优化，存在不必要重渲染 | 多个组件 |

#### 🟡 中优先级问题

| 问题 | 影响 | 位置 |
|------|------|------|
| **Service Worker 简单** | 仅缓存静态资源，无高级策略 | `public/sw.js` |
| **无包分析工具** | 缺少 @next/bundle-analyzer | next.config.ts |
| **字体加载** | Google 字体可能阻塞渲染 | layout.tsx |
| **Mock 数据硬编码** | ProjectDashboard 内嵌大量 mock 数据 | ProjectDashboard.tsx |

#### 🟢 低优先级问题

| 问题 | 影响 | 位置 |
|------|------|------|
| **无图片占位符** | LazyImage 缺少 LQIP/Blur 效果 | LazyImage.tsx |
| **无虚拟列表** | 长列表场景（如活动日志）未优化 | ProjectDashboard |
| **第三方库体积** | 未分析是否可替换更小库 | package.json |

### 1.4 构建产物分析

```
.next/ 目录大小: 91MB
node_modules/ 大小: ~600MB

主要依赖体积:
- @next: 225MB
- next: 158MB
- @img: 33MB (图片处理)
- @swc: 30MB (编译器)
- typescript: 23MB
```

---

## 二、优化建议优先级排序

### 优先级矩阵

| 优先级 | 优化项 | 预期收益 | 实施难度 | ROI |
|--------|--------|----------|----------|-----|
| **P0** | 代码分割 (React.lazy/dynamic) | ⭐⭐⭐⭐⭐ | 中 | 高 |
| **P0** | 首页组件拆分 | ⭐⭐⭐⭐⭐ | 低 | 极高 |
| **P1** | React.memo 优化子组件 | ⭐⭐⭐⭐ | 低 | 高 |
| **P1** | 添加 Bundle Analyzer | ⭐⭐⭐ | 低 | 高 |
| **P1** | Service Worker 增强 | ⭐⭐⭐⭐ | 中 | 高 |
| **P2** | 字体优化 (本地化) | ⭐⭐⭐ | 低 | 中 |
| **P2** | 虚拟列表实现 | ⭐⭐⭐ | 中 | 中 |
| **P2** | 图片 LQIP/Blur | ⭐⭐ | 低 | 中 |
| **P3** | 第三方库替换评估 | ⭐⭐ | 高 | 低 |

---

## 三、详细实施方案

### 3.1 P0: 代码分割策略

#### 3.1.1 动态导入大型组件

**当前状态**: 所有组件同步加载

**实施方案**:

```typescript
// ❌ 当前方式
import { AIChat } from '@/components/AIChat';
import { ProjectDashboard } from '@/components/ProjectDashboard';
import { GitHubActivity } from '@/components/GitHubActivity';

// ✅ 优化后
import dynamic from 'next/dynamic';

const AIChat = dynamic(
  () => import('@/components/AIChat').then(mod => mod.AIChat),
  { 
    ssr: false,  // AI 聊天不需要 SSR
    loading: () => null  // 无需 loading 状态
  }
);

const ProjectDashboard = dynamic(
  () => import('@/components/ProjectDashboard').then(mod => mod.ProjectDashboard),
  {
    loading: () => <DashboardSkeleton />
  }
);

const GitHubActivity = dynamic(
  () => import('@/components/GitHubActivity').then(mod => mod.GitHubActivity),
  {
    loading: () => <ActivitySkeleton />
  }
);
```

**预期收益**:
- 首页 JS 减少 30-50KB (gzip)
- FCP 提升 200-400ms
- TTI 提升 300-500ms

#### 3.1.2 路由级别代码分割

**实施方案**:

```typescript
// next.config.ts 添加
const nextConfig = {
  // ... 现有配置
  
  // 实验性功能
  experimental: {
    optimizePackageImports: ['@heroicons/react', 'framer-motion'],  // 如果使用
  },
};
```

#### 3.1.3 组件级别懒加载

**聊天组件优化**:

```typescript
// src/components/chat/index.ts
export { ChatHeader } from './ChatHeader';
export { ChatMessage } from './ChatMessage';
// ...

// 首页使用时
const AIChat = dynamic(
  () => import('@/components/AIChat'),
  { ssr: false }
);
```

---

### 3.2 P0: 首页组件拆分

#### 3.2.1 当前问题

首页 `page.tsx` 包含:
- 400+ 行代码
- 35 个粒子配置对象
- 11 个团队成员配置
- 3 个服务配置
- 4 个优势配置

#### 3.2.2 拆分方案

```
src/app/[locale]/
├── page.tsx              # 主入口，仅组合
├── _components/
│   ├── HeroSection.tsx   # Hero 区域
│   ├── TeamPreview.tsx   # 团队预览
│   ├── ServicesSection.tsx # 服务介绍
│   ├── WhyUsSection.tsx  # 为什么选择我们
│   └── CTASection.tsx    # CTA 区域
├── _data/
│   ├── particles.ts      # 粒子配置
│   ├── team.ts           # 团队数据
│   ├── services.ts       # 服务数据
│   └── whyUs.ts          # 优势数据
```

#### 3.2.3 数据外部化

```typescript
// src/app/[locale]/_data/particles.ts
export const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  left: `${(i * 5 + (i % 3) * 15) % 100}%`,
  top: `${(i * 7 + (i % 5) * 8) % 100}%`,
  animationDelay: `${(i * 0.15) % 3}s`,
  animationDuration: `${2 + (i % 4) * 0.5}s`,
}));

// 使用时
import { PARTICLES } from './_data/particles';
```

**预期收益**:
- 组件可读性提升
- 便于单独优化每个 Section
- 减少首页组件体积

---

### 3.3 P1: React.memo 优化

#### 3.3.1 高频渲染组件优化

```typescript
// src/components/chat/ChatMessage.tsx
import { memo } from 'react';

interface ChatMessageProps {
  message: ChatMessageType;
  teamMembers: TeamMember[];
}

export const ChatMessage = memo(function ChatMessage({ 
  message, 
  teamMembers 
}: ChatMessageProps) {
  // 组件实现
}, (prevProps, nextProps) => {
  // 自定义比较函数
  return prevProps.message.id === nextProps.message.id &&
         prevProps.message.content === nextProps.message.content;
});
```

#### 3.3.2 列表项优化

```typescript
// src/components/ProjectDashboard.tsx
import { memo } from 'react';

const ProjectCard = memo(function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="...">
      {/* 卡片内容 */}
    </div>
  );
});

// 活动项
const ActivityItem = memo(function ActivityItem({ activity }: { activity: ActivityLog }) {
  return (
    <div className="...">
      {/* 活动内容 */}
    </div>
  );
});
```

#### 3.3.3 useMemo 优化计算

```typescript
// ProjectDashboard.tsx
import { useMemo } from 'react';

export function ProjectDashboard() {
  const [projects] = useState<Project[]>(mockProjects);
  const [activities] = useState<ActivityLog[]>(mockActivities);
  
  // ✅ 缓存计算结果
  const stats = useMemo(() => ({
    totalTasks: projects.reduce((acc, p) => acc + p.tasks.total, 0),
    completedTasks: projects.reduce((acc, p) => acc + p.tasks.completed, 0),
    overallProgress: Math.round(
      (projects.reduce((acc, p) => acc + p.tasks.completed, 0) / 
       projects.reduce((acc, p) => acc + p.tasks.total, 0)) * 100
    ),
  }), [projects]);
  
  // ...
}
```

**预期收益**:
- 减少不必要重渲染 50-80%
- 交互响应更流畅

---

### 3.4 P1: 添加 Bundle Analyzer

#### 3.4.1 安装配置

```bash
npm install --save-dev @next/bundle-analyzer
```

```typescript
// next.config.ts
import analyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = analyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(withNextIntl(nextConfig));
```

#### 3.4.2 使用方式

```bash
# 分析构建产物
ANALYZE=true npm run build
```

**预期收益**:
- 可视化包体积
- 识别大型依赖
- 指导优化方向

---

### 3.5 P1: Service Worker 增强

#### 3.5.1 当前状态

- 仅缓存静态资源
- Network First 策略
- 无后台同步
- 无推送通知

#### 3.5.2 增强方案

```typescript
// public/sw.js (增强版)

const CACHE_NAME = '7zi-studio-v2';

// 缓存策略配置
const CACHE_STRATEGIES = {
  // 静态资源: Cache First
  static: {
    match: /\/_next\/static\//,
    strategy: 'cache-first',
    maxAge: 365 * 24 * 60 * 60, // 1年
  },
  // 图片: Cache First + 离线支持
  images: {
    match: /\.(png|jpg|jpeg|webp|avif|svg|gif)$/,
    strategy: 'cache-first',
    maxAge: 30 * 24 * 60 * 60, // 30天
  },
  // API: Network First + 短缓存
  api: {
    match: /\/api\//,
    strategy: 'network-first',
    maxAge: 5 * 60, // 5分钟
  },
  // 页面: Network First
  pages: {
    match: /\/(about|team|blog|contact)/,
    strategy: 'network-first',
    maxAge: 0,
  },
};

// 预缓存关键资源
const PRECACHE_ASSETS = [
  '/',
  '/about',
  '/team',
  '/manifest.json',
  '/offline.html', // 离线页面
];

// 安装事件
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Fetch 策略实现
async function handleFetch(request: Request): Promise<Response> {
  const url = new URL(request.url);
  
  for (const [name, config] of Object.entries(CACHE_STRATEGIES)) {
    if (config.match.test(url.pathname)) {
      if (config.strategy === 'cache-first') {
        return cacheFirst(request, config.maxAge);
      } else {
        return networkFirst(request, config.maxAge);
      }
    }
  }
  
  return fetch(request);
}

// Cache First 策略
async function cacheFirst(request: Request, maxAge: number): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// Network First 策略
async function networkFirst(request: Request, maxAge: number): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}
```

**预期收益**:
- 离线访问支持
- 二次访问秒开
- API 请求缓存

---

### 3.6 P2: 字体优化

#### 3.6.1 当前状态

```typescript
// 使用 Google Fonts
import { Geist, Geist_Mono } from "next/font/google";
```

#### 3.6.2 本地化字体

```typescript
// 1. 下载字体文件到 public/fonts/
// 2. 使用本地字体

// src/styles/fonts.ts
import localFont from 'next/font/local';

export const geistSans = localFont({
  src: [
    {
      path: '../../public/fonts/Geist-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Geist-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Geist-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Geist-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-geist-sans',
  display: 'swap',
  preload: true,
});
```

**预期收益**:
- 减少外部请求
- 字体加载更可控
- 避免 FOUT

---

### 3.7 P2: 虚拟列表

#### 3.7.1 适用场景

- 活动日志 (可能 100+ 条)
- GitHub Commits (可能 30+ 条)
- 团队成员列表 (当前 11 条，无需)

#### 3.7.2 实现方案

```bash
npm install @tanstack/react-virtual
```

```typescript
// src/components/ActivityLog.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export function ActivityLog({ activities }: { activities: ActivityLog[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: activities.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // 每项高度
    overscan: 5, // 预渲染数量
  });
  
  return (
    <div ref={parentRef} className="h-80 overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ActivityItem activity={activities[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**预期收益**:
- 长列表渲染性能提升 10x+
- 内存占用减少

---

### 3.8 P2: 图片 LQIP

#### 3.8.1 当前状态

LazyImage 有占位色，但无模糊预览。

#### 3.8.2 增强方案

```typescript
// src/components/LazyImage.tsx
import Image from 'next/image';

interface LazyImageProps {
  src: string;
  alt: string;
  blurDataURL?: string; // LQIP base64
  // ...
}

export function LazyImage({ src, alt, blurDataURL, ...props }: LazyImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      placeholder={blurDataURL ? 'blur' : 'empty'}
      blurDataURL={blurDataURL}
      // ...
    />
  );
}
```

**生成 LQIP**:

```typescript
// 构建时生成
import { getPlaiceholder } from 'plaiceholder';

// 或使用 next/image 内置 blur
// 对静态图片自动支持
```

**预期收益**:
- 更好的加载体验
- 减少 CLS

---

## 四、预期收益汇总

### 4.1 性能指标预期

| 指标 | 当前预估 | 优化后预期 | 提升 |
|------|----------|------------|------|
| FCP | ~1.8s | ~1.2s | 33% |
| LCP | ~2.5s | ~1.8s | 28% |
| TTI | ~3.0s | ~2.0s | 33% |
| TBT | ~300ms | ~150ms | 50% |
| CLS | ~0.05 | ~0.02 | 60% |

### 4.2 资源体积预期

| 资源 | 当前预估 | 优化后预期 | 减少 |
|------|----------|------------|------|
| 首页 JS | ~180KB | ~120KB | 33% |
| 首页 CSS | ~50KB | ~45KB | 10% |
| 图片加载 | ~500KB | ~300KB | 40% |
| 总传输量 | ~730KB | ~465KB | 36% |

### 4.3 用户体验预期

- ✅ 首屏加载更快
- ✅ 交互响应更流畅
- ✅ 离线可用
- ✅ 图片加载体验更好
- ✅ 长列表滚动流畅

---

## 五、实施计划

### Phase 1 (1-2 天): 快速见效

- [ ] 首页组件拆分
- [ ] 数据外部化
- [ ] 添加 Bundle Analyzer
- [ ] React.memo 优化核心组件

### Phase 2 (2-3 天): 深度优化

- [ ] 代码分割 (dynamic import)
- [ ] Service Worker 增强
- [ ] useMemo/useCallback 全面应用

### Phase 3 (1-2 天): 细节打磨

- [ ] 字体本地化
- [ ] 图片 LQIP
- [ ] 虚拟列表 (如需要)

### Phase 4 (持续): 监控迭代

- [ ] 性能监控接入
- [ ] 持续优化

---

## 六、风险与注意事项

### 6.1 代码分割风险

- **SSR 问题**: 动态导入的组件不支持 SSR，需要正确设置 `ssr: false`
- **水合错误**: 确保客户端/服务端渲染一致

### 6.2 Service Worker 风险

- **缓存更新**: 需要正确的版本管理策略
- **调试复杂**: SW 缓存问题需要清除浏览器缓存

### 6.3 React.memo 风险

- **过度优化**: 不是所有组件都需要 memo
- **比较函数**: 复杂 props 需要自定义比较函数

---

## 七、结论

7zi-frontend 项目已经具备了较好的性能基础，Next.js 16 + React 19 的组合提供了许多内置优化。主要优化空间在于：

1. **代码分割**: 最大的收益点，可减少首屏加载量 30%+
2. **组件优化**: memo + useMemo 减少不必要渲染
3. **缓存增强**: Service Worker 提升二次访问体验

建议按优先级逐步实施，优先完成 P0/P1 级别优化，可获得 70%+ 的性能收益。

---

**报告完成**  
**咨询师**  
**2026-03-06**