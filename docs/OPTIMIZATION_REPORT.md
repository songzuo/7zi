# 7zi-frontend Next.js 优化报告

**生成时间**: 2026-03-06  
**Next.js 版本**: 16.1.6  
**审查人**: 架构师

---

## 📊 执行摘要

### 总体评分: B+ (85/100)

| 类别 | 评分 | 状态 |
|------|------|------|
| 配置优化 | A | ✅ 优秀 |
| 代码分割 | A- | ✅ 良好 |
| 图片优化 | B+ | ✅ 良好 |
| 字体优化 | A | ✅ 优秀 |
| 安全配置 | A | ✅ 优秀 |
| Bundle 大小 | B | ⚠️ 需改进 |
| TypeScript | C+ | ⚠️ 有问题 |

### 已修复问题
1. ✅ `AlertConfig` 类型未导出 → 已修复
2. ✅ `LoadingSpinner` size 类型定义 → 已修复
3. ✅ `LazyComponents` 缺少 'use client' → 已修复
4. ✅ 缺少 `web-vitals` 依赖 → 已安装

---

## 1️⃣ Next.js 配置审查

### 当前配置 (next.config.ts)

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  images: { formats: ['image/avif', 'image/webp'], ... },
  compress: true,
  reactStrictMode: true,
  poweredByHeader: false,
  // 完整的安全头配置
};
```

### ✅ 配置优点

1. **输出模式** - `standalone` 适合 Docker 部署
2. **图片优化** - 支持 AVIF/WebP，合理的设备断点
3. **安全头** - 完整的 CSP、HSTS、X-Frame-Options 配置
4. **缓存策略** - 静态资源 1 年缓存

### ⚠️ 需要优化

#### 1.1 Turbopack 根目录警告

```
⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
```

**解决方案**: 添加 `turbopack.root` 配置

```typescript
const nextConfig: NextConfig = {
  // ... 其他配置
  turbopack: {
    root: __dirname,
  },
};
```

#### 1.2 Middleware 已弃用警告

```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

**建议**: Next.js 16 推荐使用新的 Proxy 系统，但 middleware 仍然可用。可以：
- 保持现状（短期）
- 迁移到 Proxy（长期）

#### 1.3 建议添加的配置

```typescript
const nextConfig: NextConfig = {
  // ... 现有配置

  // 实验性功能
  experimental: {
    // 优化包导入
    optimizePackageImports: ['@sentry/nextjs', 'next-intl'],
    // 启用 turbo 模式（开发）
    turbo: {
      rules: {
        '*.svg': ['@svgr/webpack'],
      },
    },
  },

  // 添加 modularizeImports 减少包大小
  modularizeImports: {
    'next-intl': {
      transform: 'next-intl/{{member}}',
    },
  },

  // 生产环境移除 console.log
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' 
      ? { exclude: ['error', 'warn'] } 
      : false,
  },
};
```

---

## 2️⃣ 图片加载策略

### 当前实现

**配置 (next.config.ts)**:
```typescript
images: {
  remotePatterns: [{ protocol: 'https', hostname: '**' }],
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  minimumCacheTTL: 60,
}
```

**LazyImage 组件** (`src/components/LazyImage.tsx`):
- ✅ 使用 Intersection Observer 懒加载
- ✅ 响应式 sizes 属性
- ✅ 占位符和加载状态
- ✅ 错误处理

### ⚠️ 优化建议

#### 2.1 图片优化

| 文件 | 当前大小 | 优化建议 |
|------|---------|---------|
| logo.png | 52KB | 转换为 WebP/AVIF，预计 20-30KB |
| icon-512.png | 52KB | 可优化至 ~15KB |
| favicon.ico | 26KB | 使用 SVG favicon 替代 |

**建议命令**:
```bash
# 使用 sharp 或 imagemin 优化
npx sharp-cli resize 512 512 --format webp --quality 80 public/logo.png -o public/logo.webp
```

#### 2.2 图片配置优化

```typescript
// 建议更新
images: {
  // 限制外部域名（安全）
  remotePatterns: [
    { protocol: 'https', hostname: '7zi.studio' },
    { protocol: 'https', hostname: 'github.com' },
    // 添加实际需要的域名
  ],
  
  // 增加缓存时间
  minimumCacheTTL: 3600, // 1小时
  
  // 添加 dangerouslyAllowSVG（如果需要 SVG 优化）
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
}
```

#### 2.3 Priority 图片预加载

首页应标记关键图片为 priority:
```tsx
<Image 
  src="/logo.webp" 
  alt="7zi Studio" 
  priority // 首屏 logo
  fetchPriority="high"
/>
```

---

## 3️⃣ 字体加载策略

### 当前实现

```typescript
// src/app/layout.tsx
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

### ✅ 优点
- 使用 Next.js 字体优化（自动子集化）
- CSS 变量方式使用
- 预加载自动处理

### 💡 优化建议

```typescript
// 添加 display 和 preload 控制
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // FOUT 策略
  preload: true,
  adjustFontFallback: true, // 减少布局偏移
});

// 考虑添加中文字体子集（如果需要）
// 使用 next/font/local 加载本地优化后的中文字体
```

---

## 4️⃣ Bundle 大小分析

### 构建产物统计

```
总构建大小: 93MB (standalone 模式)
├── .next/static/chunks: 1.2MB
├── .next/server: 13MB
└── 其他: ~79MB
```

### 主要 JS Chunk 分析

| Chunk | 大小 | 可能包含 |
|-------|------|---------|
| 030df4f9.js | 223KB | React + Next.js 核心 |
| dcce311d.js | 119KB | next-intl 或 Sentry |
| a6dad97d.js | 112KB | UI 组件库 |
| 9bdd2098.js | 45KB | 页面特定代码 |
| 9b50e572.js | 40KB | 工具函数 |

### CSS 分析

```
主 CSS: 159KB (3b00f6fb.css)
Tailwind: 2.4KB (内联)
```

### ⚠️ 问题与建议

#### 4.1 大型 Chunk 优化

**223KB 的主 chunk** 可以优化:

```typescript
// next.config.ts 添加
experimental: {
  optimizePackageImports: [
    '@sentry/nextjs',  // Sentry 很大，只导入需要的部分
    'next-intl',
  ],
},
```

#### 4.2 Sentry 优化

当前 `@sentry/nextjs` 与 Next.js 16 有 peer dependency 冲突:

```
peer next@"^13.2.0 || ^14.0 || ^15.0.0-rc.0" from @sentry/nextjs@9.47.1
```

**建议**:
1. 等待 Sentry 发布兼容 Next.js 16 的版本
2. 或考虑使用 Sentry 的 tree-shaking:

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

// 只导入需要的功能
const { captureException, init } = Sentry;
```

#### 4.3 建议添加 Bundle 分析

```json
// package.json
{
  "scripts": {
    "analyze": "ANALYZE=true next build",
    "analyze:server": "ANALYZE=true BUNDLE_ANALYZE=server next build",
    "analyze:browser": "ANALYZE=true BUNDLE_ANALYZE=browser next build"
  }
}
```

```typescript
// next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

export default withNextIntl(withBundleAnalyzer(nextConfig));
```

#### 4.4 动态导入优化

`LazyComponents.tsx` 已经做得很好，建议添加预加载:

```typescript
// 用户可能交互时预加载
export const preloadAIChat = () => import('./AIChat');
export const preloadSettings = () => import('./SettingsPanel');

// 在 Navigation 悬停时调用
<Link 
  to="/dashboard" 
  onMouseEnter={preloadAIChat}
>
```

---

## 5️⃣ 中间件和路由配置

### 当前中间件

```typescript
// src/middleware.ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/', '/(zh|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};
```

### ✅ 优点
- 正确使用 next-intl 中间件
- 合理的 matcher 配置

### ⚠️ 注意事项

1. **Middleware 弃用警告** - Next.js 16 建议使用 Proxy
2. **性能考虑** - 中间件在每个请求上运行

### 路由结构

```
app/
├── [locale]/          # 国际化路由
│   ├── page.tsx       # 首页
│   ├── about/
│   ├── blog/
│   ├── contact/
│   ├── dashboard/
│   └── team/
├── api/
│   ├── health/        # 健康检查
│   └── status/
├── about/             # 非国际化页面
├── blog/
├── contact/
├── dashboard/
└── team/
```

### ⚠️ 路由优化建议

#### 5.1 重复路由问题

存在 `/about` 和 `/[locale]/about` 两套路由，建议统一:
- 方案 A: 只使用 `[locale]` 路由，根路径重定向
- 方案 B: 只使用非 locale 路由，locale 仅影响内容

#### 5.2 API 路由优化

```typescript
// 建议: 添加速率限制和缓存
export const runtime = 'edge'; // 使用 Edge Runtime 更快
export const dynamic = 'force-dynamic'; // 或静态生成

// api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok' }, {
    headers: {
      'Cache-Control': 'public, max-age=10', // 10秒缓存
    },
  });
}
```

---

## 6️⃣ TypeScript 问题

### 当前状态: ⚠️ 有错误

主要问题:
1. `web-vitals` 模块类型 - **已修复**
2. 测试文件类型不匹配
3. E2E 测试类型问题

### 建议修复

```bash
# 安装缺失的类型
npm install --save-dev @types/web-vitals

# 或在 tsconfig.json 添加
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

### 测试文件建议

```typescript
// src/test/lib/utils.test.ts
// 修复 Mock 类型
import { vi, describe, it, expect } from 'vitest';

// 使用 vi.fn() 的泛型
const mockFn = vi.fn<(x: number) => number>();
```

---

## 7️⃣ 性能优化建议汇总

### 高优先级 🔴

1. **修复 Sentry 依赖冲突**
   - 升级 @sentry/nextjs 或降级 Next.js
   
2. **优化大型图片**
   - logo.png/icon-512.png 转换为 WebP
   - 预计节省: 50-70KB

3. **添加 Bundle 分析**
   - 安装 @next/bundle-analyzer
   - 分析并优化大型 chunk

### 中优先级 🟡

4. **统一路由结构**
   - 消除重复路由
   - 简化 i18n 逻辑

5. **优化字体加载**
   - 添加 display: 'swap'
   - 考虑中文字体子集化

6. **添加预加载策略**
   - 关键路由预加载
   - 组件悬停预加载

### 低优先级 🟢

7. **迁移 Middleware 到 Proxy**
   - Next.js 16 新特性
   - 非紧急

8. **添加 PWA 离线支持**
   - Service Worker 优化
   - 缓存策略改进

---

## 8️⃣ 建议的 next.config.ts 更新

```typescript
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Docker 部署使用 standalone 输出模式
  output: 'standalone',
  
  // 修复 Turbopack 警告
  turbopack: {
    root: __dirname,
  },
  
  // 图片优化配置
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '7zi.studio',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 3600, // 增加到 1 小时
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
  },
  
  // 压缩配置
  compress: true,
  
  // React 严格模式
  reactStrictMode: true,
  
  // 禁用 x-powered-by 头
  poweredByHeader: false,
  
  // 实验性优化
  experimental: {
    optimizePackageImports: ['@sentry/nextjs', 'next-intl'],
  },
  
  // 生产环境移除 console.log
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' 
      ? { exclude: ['error', 'warn'] } 
      : false,
  },
  
  // 模块化导入优化
  modularizeImports: {
    'next-intl': {
      transform: 'next-intl/{{member}}',
    },
  },
  
  // 安全头配置 (保持现有)
  headers: async () => [
    // ... 现有配置
  ],
};

export default withNextIntl(nextConfig);
```

---

## 9️⃣ 监控和持续优化

### 建议添加的监控

1. **Core Web Vitals 监控** ✅ 已实现
   - `src/lib/monitoring/web-vitals.ts`

2. **错误追踪**
   - Sentry 已配置（待解决依赖冲突）

3. **性能预算**
   ```json
   // package.json
   {
     "bundlesize": [
       {
         "path": ".next/static/chunks/*.js",
         "maxSize": "250 kB"
       }
     ]
   }
   ```

### CI/CD 检查建议

```yaml
# .github/workflows/build-check.yml
- name: Check bundle size
  run: npm run build && npx bundlesize

- name: Lighthouse CI
  run: npx lhci autorun
```

---

## 📋 行动清单

### 立即执行 (本周)
- [ ] 修复 Sentry 依赖冲突
- [ ] 优化 public/ 目录下的图片
- [ ] 添加 Bundle Analyzer

### 短期 (本月)
- [ ] 统一路由结构
- [ ] 修复 TypeScript 错误
- [ ] 添加性能预算检查

### 长期 (下季度)
- [ ] 迁移到 Next.js Proxy
- [ ] 实现完整的 PWA 离线支持
- [ ] 考虑使用 Edge Runtime

---

## 📚 参考资源

- [Next.js 16 文档](https://nextjs.org/docs)
- [Next.js 性能优化](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web Vitals](https://web.dev/vitals/)
- [Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)

---

*报告由架构师生成 - 7zi Studio*
