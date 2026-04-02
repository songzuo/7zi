# 图片优化最佳实践指南

## 📋 目录

1. [核心概念](#核心概念)
2. [快速开始](#快速开始)
3. [配置详解](#配置详解)
4. [性能指标](#性能指标)
5. [常见问题](#常见问题)

---

## 核心概念

### 1. Next.js Image 组件优势

- **自动格式转换**: JPEG/PNG → WebP/AVIF（减少 30-50% 文件大小）
- **响应式图片**: 根据设备自动加载合适尺寸
- **懒加载**: 视口外图片延迟加载
- **防止 CLS**: 自动添加宽高属性避免布局偏移
- **图片优化**: 自动压缩和优化

### 2. LCP (Largest Contentful Paint) 优化

LCP 是用户感知的核心性能指标，优化方法：

```tsx
// ❌ 错误：普通 img 标签
<img src="/hero.jpg" alt="Hero" />

// ✅ 正确：Next.js Image + priority
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1920}
  height={1080}
  priority={true}  // 关键！预加载
/>
```

### 3. 格式优先级

浏览器支持顺序：

```
AVIF > WebP > JPEG/PNG
```

Next.js 自动按优先级提供格式。

---

## 快速开始

### 安装依赖

```bash
npm install
```

### 基础使用

```tsx
import { OptimizedImage } from '@/components/OptimizedImage'

export default function Page() {
  return <OptimizedImage src="/images/photo.jpg" alt="Description" preset="card" />
}
```

### 预设说明

| 预设      | 尺寸      | sizes 属性            | 使用场景              |
| --------- | --------- | --------------------- | --------------------- |
| avatar    | 64x64     | `32px, 48px, 64px`    | 用户头像、小图标      |
| thumbnail | 300x200   | `150px, 200px, 300px` | 缩略图、列表图片      |
| card      | 400x300   | `100vw, 50vw, 33vw`   | 卡片封面、产品图      |
| hero      | 1920x1080 | `100vw`               | 英雄图、Banner（LCP） |
| content   | 800x600   | `100vw, 75vw, 800px`  | 文章配图、内容图      |
| logo      | 180x60    | `120px, 180px`        | Logo、品牌图          |

---

## 配置详解

### next.config.js

```javascript
const nextConfig = {
  images: {
    // 1. 格式优先级
    formats: ['image/avif', 'image/webp'],

    // 2. 设备断点（响应式）
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],

    // 3. 图片尺寸（srcset）
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // 4. 缓存策略
    minimumCacheTTL: 2592000, // 30 天

    // 5. 远程域名白名单
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}
```

### Tailwind CSS

已在 `tailwind.config.js` 中配置：

```javascript
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
}
```

---

## 性能指标

### Lighthouse 目标分数

| 指标        | 目标    | 说明         |
| ----------- | ------- | ------------ |
| Performance | ≥ 90    | 综合性能     |
| LCP         | ≤ 2.5s  | 最大内容绘制 |
| FID         | ≤ 100ms | 首次输入延迟 |
| CLS         | ≤ 0.1   | 累积布局偏移 |

### 预期提升

优化后预期改进：

```
性能分数: 60 → 90+ (+50%)
LCP: 4s → 1.5s (-62%)
CLS: 0.3 → 0.05 (-83%)
```

---

## 常见问题

### Q1: 图片不显示？

**检查清单**：

1. 图片路径是否正确（相对于 `/public`）
2. 远程图片是否在 `remotePatterns` 中配置
3. 图片文件是否存在

### Q2: LCP 仍然很慢？

**优化方法**：

1. 使用 `priority` 属性预加载
2. 减少图片尺寸（不要使用超大图片）
3. 启用 AVIF/WebP 格式
4. 检查网络延迟

### Q3: CLS 超标？

**解决方案**：

1. 使用预设的 `width` 和 `height`
2. 添加占位符保持空间
3. 避免使用 `fill` 模式时不定高容器

### Q4: 懒加载不工作？

**检查项**：

1. 非关键图片不要设置 `priority`
2. 默认就是懒加载（无需额外配置）
3. 检查图片是否在视口外

### Q5: 如何处理错误图片？

**自动回退**：

```tsx
<OptimizedImage
  src="/maybe-missing.jpg"
  alt="Fallback demo"
  onError={e => {
    console.log('Image failed:', e)
  }}
  // 自动显示友好错误占位符
/>
```

---

## 高级技巧

### 1. 渐进式加载

```tsx
// 先显示低质量占位符，再加载高清图
<OptimizedImage
  src="/images/high-quality.jpg"
  alt="High quality"
  placeholder="blur"
  blurDataURL="data:image/svg+xml;base64,..."
/>
```

### 2. 动态图片

```tsx
// 从 API 获取图片
const [imageSrc, setImageSrc] = useState('/default.jpg')

useEffect(() => {
  fetch('/api/image')
    .then(res => res.json())
    .then(data => setImageSrc(data.url))
}, [])

<OptimizedImage
  src={imageSrc}
  alt="Dynamic"
  preset="card"
/>
```

### 3. 图片画廊优化

```tsx
import { ImageGallery } from '@/components/OptimizedImage'
;<ImageGallery images={imageList} columns={3} className="my-gallery" />
```

### 4. 背景图片

```tsx
import { BackgroundImage } from '@/components/OptimizedImage'
;<BackgroundImage src="/images/hero.jpg" overlayOpacity={0.5} className="h-screen">
  <h1>Content</h1>
</BackgroundImage>
```

---

## 性能监控

### Web Vitals 集成

```tsx
'use client'

import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals(metric => {
    // 发送到分析服务
    console.log(metric)
  })
}
```

### Lighthouse 测试

```bash
# 本地测试
npm run dev

# 另一个终端
npm run lighthouse

# 查看报告
open lighthouse-report.html
```

---

## 资源链接

- [Next.js Image 文档](https://nextjs.org/docs/api-reference/next/image)
- [Web.dev 图片优化](https://web.dev/fast/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

---

**更新时间**: 2026-03-28  
**版本**: 1.0.0
