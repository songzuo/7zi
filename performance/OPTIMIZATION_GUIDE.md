# 性能优化建议

基于 2026-03-08 的性能基准测试，以下是针对性的优化建议。

---

## 🎯 当前性能状态

| 指标 | 当前值 | 目标 | 差距 |
|------|--------|------|------|
| TTFB | 65 ms | < 200 ms | ✅ 达标 |
| FCP | 804 ms | < 500 ms | -304 ms |
| LCP | N/A | < 2500 ms | ⚠️ 需测量 |
| DOM 交互 | 890 ms | < 500 ms | -390 ms |

---

## 🚀 高优先级优化

### 1. 优化 JavaScript 加载

**问题:** 17 个 JS 文件，可能导致解析和执行时间过长

**解决方案:**

```typescript
// next.config.ts 中添加
export default {
  webpack: (config, { isServer }) => {
    // 启用代码分割
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
        },
        common: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    };
    return config;
  },
}
```

**预期收益:** FCP 减少 200-300ms

---

### 2. 实施流式 SSR

**问题:** 首屏等待完整 HTML

**解决方案:**

```typescript
// 使用 React Suspense 和 Streaming
export default async function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

**预期收益:** FCP 减少 100-200ms

---

### 3. 优化 API 响应时间

**问题:** `/api/tasks` 响应时间 346ms

**解决方案:**

```typescript
// 添加缓存层
import { cache } from 'react';

export const getTasks = cache(async () => {
  // 数据库查询
});

// 或使用 Redis 缓存
import Redis from 'ioredis';
const redis = new Redis();

async function getCachedTasks() {
  const cached = await redis.get('tasks');
  if (cached) return JSON.parse(cached);
  
  const tasks = await db.tasks.findMany();
  await redis.setex('tasks', 60, JSON.stringify(tasks));
  return tasks;
}
```

**预期收益:** API 响应时间减少至 < 50ms

---

## 📦 中优先级优化

### 4. 资源预加载

```typescript
// 在 layout.tsx 中添加
<head>
  <link rel="preload" href="/fonts/inter.woff2" as="font" crossOrigin="anonymous" />
  <link rel="preconnect" href="https://api.example.com" />
</head>
```

**预期收益:** FCP 减少 50-100ms

---

### 5. 图片优化

```typescript
// 使用 Next.js Image 组件
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={630}
  priority
  sizes="(max-width: 768px) 100vw, 1200px"
/>
```

**预期收益:** LCP 减少 200-500ms

---

### 6. CSS 优化

```typescript
// 移除未使用的 CSS
// postcss.config.mjs
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    'cssnano': {
      preset: ['default', { discardComments: true }]
    }
  }
};
```

**预期收益:** 减少 CSS 大小 30-50%

---

## 🔧 低优先级优化

### 7. Service Worker 缓存

```typescript
// 使用 next-pwa
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
});

export default withPWA(nextConfig);
```

**预期收益:** 重复访问性能提升 50%

---

### 8. 字体优化

```typescript
// 使用 next/font
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});
```

**预期收益:** 消除布局偏移，提升 FCP

---

### 9. 第三方脚本优化

```typescript
// 延迟加载非关键脚本
<Script
  src="https://analytics.example.com/script.js"
  strategy="lazyOnload"
/>
```

**预期收益:** 减少主线程阻塞

---

## 📊 优化路线图

### 第 1 周：快速胜利
- [ ] 实施代码分割
- [ ] 添加 API 缓存
- [ ] 优化图片加载

### 第 2 周：架构优化
- [ ] 实施流式 SSR
- [ ] 添加资源预加载
- [ ] 优化 CSS 交付

### 第 3 周：高级优化
- [ ] Service Worker 缓存
- [ ] 第三方脚本优化
- [ ] 字体优化

### 第 4 周：监控和维护
- [ ] 建立性能监控
- [ ] 设置性能预算
- [ ] 自动化性能测试

---

## 📈 预期结果

| 优化阶段 | FCP 目标 | LCP 目标 | 总分目标 |
|----------|----------|----------|----------|
| 当前 | 804 ms | N/A | 85 |
| 第 1 周后 | 600 ms | < 2500 ms | 90 |
| 第 2 周后 | 450 ms | < 2000 ms | 93 |
| 第 3 周后 | 350 ms | < 1500 ms | 96 |
| 第 4 周后 | < 300 ms | < 1200 ms | 98 |

---

## 🛠️ 监控工具

### 本地测试
```bash
# 运行性能基准测试
npm run perf:baseline

# 持续监控
npm run perf:monitor
```

### 生产监控
- Vercel Analytics (如使用 Vercel)
- Google Analytics 4 + Web Vitals
- 自定义性能仪表板

---

## ✅ 检查清单

### 每次发布前
- [ ] 运行 Lighthouse 测试
- [ ] 检查 Core Web Vitals
- [ ] 验证 bundle 大小
- [ ] 测试移动性能

### 每月审查
- [ ] 分析性能趋势
- [ ] 识别回归
- [ ] 更新优化策略
- [ ] 审查第三方依赖

---

**文档更新日期:** 2026-03-08  
**下次审查日期:** 2026-03-15
