# 性能问题分析报告

**日期:** 2026-05-12  
**分析范围:** `/root/.openclaw/workspace`  
**版本:** 1.14.2

---

## 1. Next.js 配置分析 ✅

### 1.1 图片优化配置

**状态:** ✅ 已正确配置

```typescript
images: {
  formats: ['image/avif', 'image/webp'],  // ✅ 使用现代图片格式
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  minimumCacheTTL: 31536000,  // ✅ 1年缓存
  unoptimized: false,        // ✅ 启用 Next.js 图片优化
}
```

**结论:** 图片优化配置完善，支持 AVIF/WebP 格式响应式图片。

### 1.2 Webpack 代码分割

**状态:** ✅ 已优化

```typescript
config.optimization.splitChunks = {
  chunks: 'all',
  cacheGroups: {
    react: { test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/, name: 'react-core', priority: 100 },
    charts: { test: /[\\/]node_modules[\\/](recharts)[\\/]/, name: 'chart-libs', priority: 80 },
    three: { test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/, name: 'three-libs', priority: 80 },
    utils: { test: /[\\/]node_modules[\\/](lodash|date-fns|dayjs|uuid)[\\/]/, name: 'utils-libs', priority: 60 },
    vendor: { minChunks: 2, priority: 10 },
  }
}
```

**结论:** 代码分割策略完善，大型依赖（React、图表库、3D库）已分离。

---

## 2. 依赖分析

### 2.1 大型依赖替代方案检查

**状态:** ✅ 无需迁移

| 依赖 | 发现 | 替代方案 | 结论 |
|------|------|----------|------|
| moment | ❌ 未使用 | - | 无需迁移 |
| dayjs | ❌ 未使用 | - | 无需迁移 |
| date-fns | ❌ 未使用 | - | 无需迁移 |

**当前日期处理:** 项目使用 `lodash-es` 进行日期相关操作，未引入重型日期库。

### 2.2 当前大型依赖

| 依赖 | 版本 | 大小 | 风险 | 说明 |
|------|------|------|------|------|
| three | ^0.183.2 | ~1MB | ⚠️ 中 | 已配置独立 chunk，动态导入 |
| @react-three/drei | ^10.7.7 | ~500KB | ⚠️ 中 | 已配置独立 chunk |
| recharts | ^3.8.0 | ~400KB | ✅ 已优化 | 已配置独立 chunk |
| exceljs | ^3.4.0 | ~300KB | ⚠️ 中 | 仅服务端使用 |
| jspdf | ^4.2.1 | ~200KB | ⚠️ 中 | 仅导出功能使用 |
| lodash-es | ^4.18.1 | ~70KB | ✅ 已优化 | Webpack alias 配置正确 |

---

## 3. Bundle 大小分析 ⚠️

### 3.1 客户端 Bundle 最大的文件

| 文件 | 大小 | 说明 |
|------|------|------|
| `0yzscthdk~x7u.js` | **1.1MB** | ⚠️ 需要分析内容 |
| `0y-kmo8r724h4.js` | 382KB | 三份相同 |
| `0_csc7saikx62.js` | 382KB | 三份相同 |
| `0lltr05qmzltf.js` | 231KB | 可能是大型依赖 |
| `0~8nvzki7duog.js` | 158KB | - |
| `0v82e5w3u3ybb.js` | 144KB | - |

**问题:** 存在 1.1MB 的巨型 chunk，且有多个重复的大文件（382KB 三份），可能是 Tree Shaking 问题。

**建议:** 
1. 分析 `0yzscthdk~x7u.js` 内容来源
2. 检查重复文件原因（可能是版本哈希问题或 Tree Shaking 不充分）
3. 考虑将 three.js 完全转为动态导入（`next/dynamic`）

### 3.2 分析命令

```bash
# 分析巨型 chunk 来源
cat .next/server/chunks/*.js | head -c 100 | grep -o '"name":"[^"]*"' | sort | uniq -c | sort -rn

# 或使用 Webpack Bundle Analyzer
npm run build:analyze
```

---

## 4. API 路由 N+1 查询检查 ✅

### 4.1 反馈 API (feedback/route.ts)

**状态:** ✅ 已优化

```typescript
// ✅ 好的实现 - 批量加载
const feedbackIds = feedbacks.map(f => f.id)
const attachmentsMap = await getOptimizedAttachments(db, feedbackIds)  // 单次批量查询

const feedbacksWithParsedMetadata = feedbacks.map(f => ({
  ...f,
  metadata: f.metadata ? JSON.parse(f.metadata as unknown as string) : undefined,
  attachments: attachmentsMap.get(f.id) || [],  // 内存关联，非 N+1
}))
```

**结论:** 使用 `getOptimizedAttachments` 批量加载，避免了 N+1 问题。

### 4.2 任务 API (tasks/route.ts)

**状态:** ✅ 已优化

```typescript
// 使用单个 COUNT 查询 + LIMIT/OFFSET 分页
const countQuery = `SELECT COUNT(*) as total FROM tasks ${where}`
const countResult = db.prepare(countQuery).get(...queryParams)

// 主查询使用 WHERE + ORDER BY + LIMIT + OFFSET
```

**结论:** 任务列表使用标准分页模式，无 N+1 问题。

### 4.3 评分 API (ratings/route.ts)

**状态:** ✅ 无 N+1 风险

各操作（GET/POST/PATCH/DELETE）均使用单次查询或批量操作，未发现循环内查询模式。

---

## 5. 图片格式使用检查 ✅

### 5.1 Next.js Image 配置

```typescript
formats: ['image/avif', 'image/webp']  // ✅ 优先 AVIF，其次 WebP
```

### 5.2 自定义图片组件

**状态:** ✅ 已优化

项目实现了 `OptimizedImage` 组件，支持:
- 视口懒加载（Intersection Observer）
- 模糊占位符
- 渐进加载
- 错误处理

**使用示例:**
```tsx
// ✅ 正确使用
import { OptimizedImage } from '@/components/OptimizedImage'

<OptimizedImage 
  src="/example.jpg"
  alt="描述"
  priority={false}  // 非首屏图片
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..." 
/>
```

### 5.3 检查结果

| 检查项 | 状态 | 说明 |
|--------|------|------|
| AVIF/WebP 支持 | ✅ | next.config.ts 已配置 |
| 响应式图片 | ✅ | deviceSizes/imageSizes 已定义 |
| 懒加载 | ✅ | OptimizedImage 组件支持 |
| 占位符 | ✅ | blur/empty 模式支持 |

---

## 6. 性能优化建议

### 6.1 高优先级 🔴

| 问题 | 建议 | 影响 |
|------|------|------|
| 1.1MB 巨型 chunk | 分析来源，拆分为小 chunk | 减少首屏加载时间 |
| 重复 382KB 文件 (x3) | 检查 Tree Shaking，删除未使用导出 | 减少 ~1MB 冗余代码 |

### 6.2 中优先级 🟡

| 问题 | 建议 | 影响 |
|------|------|------|
| Three.js 完全动态导入 | 使用 `next/dynamic` + `ssr: false` | 减少 ~1MB 初始 JS |
| 图表库按需导入 | 检查 recharts 组件懒加载 | 减少 ~400KB |
| ExcelJS 服务端专用 | 确保客户端不打包 | 已通过 externals 配置 |

### 6.3 低优先级 🟢

| 问题 | 建议 | 影响 |
|------|------|------|
| 图片 blurDataURL | 生成真实的低质量模糊图 | 更好的 UX |
| Web Vitals 监控 | 已配置 web-vitals | 持续监控 |

---

## 7. 配置检查总结

| 检查项 | 状态 | 说明 |
|--------|------|------|
| next.config.ts 性能配置 | ✅ | 图片优化、代码分割均已配置 |
| moment → dayjs 迁移 | ✅ | 不需要（未使用 moment） |
| 大文件打包检查 | ⚠️ | 存在 1.1MB chunk 需要优化 |
| N+1 查询 | ✅ | API 路由已优化为批量查询 |
| 图片格式 (WebP/AVIF) | ✅ | 已配置且有自定义优化组件 |

---

## 8. 后续行动

1. **立即执行** - 分析 `0yzscthdk~x7u.js` 来源
2. **本周完成** - 检查重复大文件原因
3. **下周计划** - Three.js 完全动态加载

---

**报告生成时间:** 2026-05-12 20:36 GMT+2  
**分析师:** Performance Profiler Subagent