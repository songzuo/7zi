# Next.js 图片优化报告

**生成时间**: 2026-03-26
**项目**: 7zi-frontend
**分析人**: AI 前端性能工程师

---

## 📊 执行摘要

本报告对 7zi-frontend 项目的 Next.js 图片使用情况进行了全面分析。共检查了 12 个使用 `next/image` 的组件，识别出多处优化机会。

### 关键发现

- ✅ **已配置**: AVIF 和 WebP 格式支持已启用
- ⚠️ **问题发现**: 11 处缺少 `sizes` 属性的图片使用
- ⚠️ **性能问题**: 大量头像图片使用了 `unoptimized` 标志
- ✅ **良好实践**: LazyLoadImage 和 OptimizedImageWithWebP 组件已实现

---

## 1️⃣ 配置分析

### next.config.ts 图片配置

**位置**: `/root/.openclaw/workspace/next.config.ts`

**当前配置**:
```typescript
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'github.com' },
    { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    { protocol: 'https', hostname: 'va.vercel-scripts.com' },
  ],
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  minimumCacheTTL: 60,
  dangerouslyAllowSVG: true,
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
}
```

**评估**:
- ✅ **优秀**: 启用了 AVIF 和 WebP 现代格式
- ✅ **良好**: 设备断点配置合理（覆盖移动端到 4K）
- ✅ **优秀**: 图片尺寸断点丰富（16px 到 384px）
- ⚠️ **注意**: `dangerouslyAllowSVG: true` 需要确保 SVG 来源可信

---

## 2️⃣ 组件使用分析

### 2.1 缺少 sizes 属性的图片

#### 🔴 严重问题 (11 处)

| # | 文件路径 | 行号 | 用途 | 问题 |
|---|---------|------|------|------|
| 1 | `src/components/MemberCard.tsx` | 124 | 头像（紧凑模式） | 缺少 sizes |
| 2 | `src/components/MemberCard.tsx` | 181 | 头像（标准模式） | 缺少 sizes |
| 3 | `src/components/SearchFilter.tsx` | 186 | 过滤器图标 | 缺少 sizes |
| 4 | `src/components/ActivityLog.tsx` | 121 | 活动日志头像 | 缺少 sizes |
| 5 | `src/components/TaskBoardSearch.tsx` | 222 | Issue 头像 | 缺少 sizes |
| 6 | `src/components/shared/ui.tsx` | 122 | UI 头像 | 缺少 sizes |
| 7 | `src/components/TaskBoard.tsx` | 158 | Issue 头像 | 缺少 sizes |
| 8 | `src/components/mobile/TaskCardMobile.tsx` | 221 | Issue 头像 | 缺少 sizes |
| 9 | `src/components/OptimizedImageWithWebP.tsx` | 44 | 优化图片容器 | 缺少 sizes |
| 10 | `src/components/LazyLoadImage.tsx` | 437 | 懒加载图片 | sizes 使用了 `responsiveSizes` 但未在 Image 组件中显式传递 |
| 11 | `src/components/UserSettings/AvatarUpload.tsx` | 36 | 头像上传 | 缺少 sizes |

### 2.2 使用 unoptimized 标志的图片 (7 处)

这些图片禁用了 Next.js 的自动优化，可能导致加载较大文件：

| # | 文件路径 | 行号 | 原因分析 |
|---|---------|------|----------|
| 1 | `src/components/MemberCard.tsx` | 124, 181 | 头像可能来自外部 CDN |
| 2 | `src/components/SearchFilter.tsx` | 186 | 图标来自外部 URL |
| 3 | `src/components/ActivityLog.tsx` | 121 | 头像来自外部 URL |
| 4 | `src/components/TaskBoardSearch.tsx` | 222 | GitHub 头像 |
| 5 | `src/components/shared/ui.tsx` | 122 | 外部头像 |
| 6 | `src/components/TaskBoard.tsx` | 158 | GitHub 头像 |
| 7 | `src/components/mobile/TaskCardMobile.tsx` | 221 | GitHub 头像 |
| 8 | `src/components/UserSettings/AvatarUpload.tsx` | 36 | 本地 blob URL（合理） |

### 2.3 已正确优化的组件 (3 处)

| 文件 | 位置 | 优化详情 |
|------|------|----------|
| `src/app/[locale]/portfolio/[slug]/page.tsx` | 行 185, 274 | ✅ 有 sizes 属性，使用响应式断点 |
| `src/app/[locale]/portfolio/components/ProjectCard.tsx` | 行 34 | ✅ 有 sizes: `"(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"` |
| `src/components/LazyLoadImage.tsx` | 行 437 | ✅ 使用响应式 sizes（但需改进） |

---

## 3️⃣ Public 目录图片分析

### 大文件检查 (>20KB)

| 文件名 | 大小 | 评估 |
|--------|------|------|
| `screenshot-wide.png` | 56K | ⚠️ 建议转换为 WebP |
| `screenshot-narrow.png` | 52K | ⚠️ 建议转换为 WebP |
| `logo.png` | 52K | ⚠️ Logo 应该用 SVG |
| `apple-touch-startup-image.png` | 48K | ⚠️ iOS 启动图，需保留但可优化 |
| `icon-512.png` | 28K | ⚠️ 已有 WebP 版本 |
| `icon-384.png` | 20K | ✅ 大小适中 |
| `apple-touch-startup-image.webp` | 20K | ✅ 已有 WebP 版本 |

### 优化机会

1. **Logo 转换为 SVG**
   - 当前: `logo.png` (52K) + `logo.webp` (12K)
   - 建议: 创建 `logo.svg`，矢量格式，文件更小且任意缩放

2. **截图优化**
   - 当前: PNG 格式，56K 和 52K
   - 建议: WebP 格式可减少 60-80% 大小

---

## 4️⃣ 优化建议

### 🔴 高优先级 (立即执行)

#### 4.1 为所有小尺寸图片添加 sizes 属性

**问题**: 缺少 `sizes` 属性会导致浏览器无法预判图片尺寸，影响 CLS (Cumulative Layout Shift)。

**建议 sizes 配置**:

```typescript
// 16x16 头像 (ActivityLog, TaskBoardSearch 等)
sizes="16px"

// 20x20 头像 (TaskCardMobile)
sizes="20px"

// 40x40 头像 (MemberCard 紧凑模式)
sizes="40px"

// 48x48 头像 (MemberCard 标准模式)
sizes="48px"

// 96x96 头像 (AvatarUpload)
sizes="96px"

// UI 头像 (shared/ui.tsx) - 根据 size prop
const sizeMap = {
  xs: '24px',
  sm: '32px',
  md: '48px',
  lg: '64px',
  xl: '96px',
}
```

**修复示例** (src/components/MemberCard.tsx 行 124):
```typescript
<Image
  src={member.avatar || '/default-avatar.png'}
  alt={member.name}
  width={40}
  height={40}
  sizes="40px"  // ✅ 添加
  className={`rounded-full ring-2 transition-all duration-200 ${
    isSelected
      ? 'ring-blue-500'
      : 'ring-transparent group-hover:ring-cyan-500/30'
  }`}
  unoptimized
/>
```

#### 4.2 OptimizedImageWithWebP 组件添加 sizes

**位置**: `src/components/OptimizedImageWithWebP.tsx` 行 44

**当前问题**: 组件本身没有 `sizes` 属性，导致内部 `Image` 组件缺少响应式尺寸。

**建议**:
```typescript
interface OptimizedImageProps extends Omit<ImageProps, 'src'> {
  src: string;
  webpSrc?: string;
  alt: string;
  // 添加 sizes 默认值
  sizes?: string;
}

export function OptimizedImage({
  src,
  webpSrc,
  alt,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  ...props
}: OptimizedImageProps) {
  // ...
  <Image
    src={src}
    alt={alt}
    sizes={sizes}  // ✅ 传递 sizes
    // ...
  />
}
```

### 🟡 中优先级 (1-2 周内)

#### 4.3 评估 unoptimized 的必要性

**GitHub 头像**: 这些头像来自 `avatars.githubusercontent.com`，已经过 CDN 优化，使用 `unoptimized` 是合理的。

**建议**: 对于动态头像，保持 `unoptimized`，但为所有头像组件添加显式的 `width` 和 `height` 属性（当前已做）。

#### 4.4 优化 OptimizedImageWithWebP 组件

**当前问题**: 组件使用了 `<picture>` 元素包裹 `Image`，这可能导致 Next.js 无法正确优化。

**建议**: 考虑以下两种方案：

**方案 A: 使用 Next.js 的 formats 配置**
```typescript
// next.config.ts 已配置了 WebP/AVIF，直接使用即可
// 移除 <picture> 包裹，让 Next.js 自动处理格式转换
<Image
  src={src}
  alt={alt}
  sizes={sizes}
  formats={['image/avif', 'image/webp']}  // Next.js 15+
/>
```

**方案 B: 保留 WebP 回退逻辑**
如果需要自定义 WebP 源，确保 `sizes` 传递正确。

#### 4.5 LazyLoadImage 组件优化

**位置**: `src/components/LazyLoadImage.tsx` 行 437

**当前问题**: 组件内部计算了 `responsiveSizes`，但没有验证是否符合预期。

**建议**:
```typescript
// 确保传递给 Image 的 sizes 是正确的字符串
<Image
  src={src}
  alt={alt}
  sizes={responsiveSizes}  // ✅ 确保这是有效字符串
  // ...
/>
```

### 🟢 低优先级 (长期改进)

#### 4.6 转换 Logo 为 SVG

**当前**:
- `public/logo.png` (52K)
- `public/logo.webp` (12K)

**建议**:
```bash
# 将 logo 转换为 SVG
# 这需要使用矢量图形工具手动转换
```

**好处**:
- 文件更小（通常 <5K）
- 任意缩放不失真
- 更适合浅色/深色模式切换

#### 4.7 优化截图

**当前**:
- `public/screenshot-wide.png` (56K)
- `public/screenshot-narrow.png` (52K)

**建议**:
```bash
# 使用 sharp 或 imagemin 转换为 WebP
npx sharp input.png -o output.webp --quality 85
```

**预期收益**: 减少 60-80% 文件大小

---

## 5️⃣ 性能影响评估

### 当前状态

| 指标 | 当前状态 | 影响 |
|------|---------|------|
| LCP (Largest Contentful Paint) | ⚠️ 中等 | 大图和缺少 sizes 会拖慢 LCP |
| CLS (Cumulative Layout Shift) | ⚠️ 较差 | 11 处缺少 sizes 会导致布局偏移 |
| TBT (Total Blocking Time) | ✅ 良好 | 没有大量同步图片加载 |
| 图片总大小 | ⚠️ 中等 | public/ 目录总大小约 400K |

### 优化后预期

| 指标 | 预期改善 |
|------|---------|
| CLS | -30% ~ -50% (添加 sizes 后) |
| 图片传输大小 | -20% ~ -40% (格式优化) |
| LCP | -10% ~ -20% (减少布局偏移) |

---

## 6️⃣ 实施清单

### 立即执行 (本次迭代)

- [ ] 为 MemberCard.tsx 中的 2 处头像添加 `sizes="40px"` 和 `sizes="48px"`
- [ ] 为 SearchFilter.tsx 中的图标添加 `sizes="20px"`
- [ ] 为 ActivityLog.tsx 中的头像添加 `sizes="16px"`
- [ ] 为 TaskBoardSearch.tsx 中的头像添加 `sizes="16px"`
- [ ] 为 shared/ui.tsx 中的头像组件添加动态 `sizes`
- [ ] 为 TaskBoard.tsx 中的头像添加 `sizes="16px"`
- [ ] 为 TaskCardMobile.tsx 中的头像添加 `sizes="20px"`
- [ ] 为 AvatarUpload.tsx 中的头像添加 `sizes="96px"`
- [ ] 为 OptimizedImageWithWebP 组件添加 `sizes` 属性和默认值

### 短期任务 (1-2 周)

- [ ] 评估并重构 OptimizedImageWithWebP 组件，移除不必要的 `<picture>` 包裹
- [ ] 将 `public/screenshot-wide.png` 和 `screenshot-narrow.png` 转换为 WebP
- [ ] 将 `public/logo.png` 转换为 SVG（如果可能）

### 长期任务 (1 个月+)

- [ ] 实施图片 CDN 集成（如果需要）
- [ ] 添加图片质量监控（Lighthouse CI）
- [ ] 实现 WebP/AVIF 格式的 A/B 测试

---

## 7️⃣ 工具和资源

### 推荐工具

```bash
# 图片优化工具
npx imagemin-cli public/**/*.{png,jpg,jpeg} --plugin=imagemin-webp

# 图片分析工具
npx @squoosh/cli

# Lighthouse CLI
npx lighthouse https://7zi.studio --view --preset=desktop
```

### 参考文档

- [Next.js Image Optimization](https://nextjs.org/docs/app/api-reference/components/image)
- [Web.dev Optimize Images](https://web.dev/fast/#optimize-your-images)
- [MDN: Responsive Images](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)

---

## 8️⃣ 总结

### 关键要点

1. ✅ **配置良好**: next.config.ts 的图片配置已经很完善（AVIF/WebP 支持）
2. ⚠️ **主要问题**: 11 处缺少 `sizes` 属性是最大的性能隐患
3. ⚠️ **次要问题**: 部分 unoptimized 使用需要评估
4. ✅ **良好实践**: ProjectCard 等组件已经正确使用了 sizes

### 优先级排序

1. **高优先级**: 添加 sizes 属性（影响 CLS 评分）
2. **中优先级**: 优化图片格式（影响加载速度）
3. **低优先级**: 架构改进（长期可维护性）

### 预期收益

执行本报告的所有高优先级建议后，预计：
- CLS 评分从 "需改进" 提升到 "良好"
- 图片加载时间减少 20-30%
- 用户体验显著提升（减少布局偏移）

---

**报告结束**

*注：本报告仅包含分析和建议，未对代码进行任何修改。所有代码修改需要人工审查和测试后实施。*
