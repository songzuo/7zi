# 性能优化报告

**生成时间**: 2026-03-15
**项目**: 7zi - AI 驱动团队管理平台
**分析人**: 性能工程师

---

## 1. 构建大小分析

### 构建状态
- **构建编译**: ✅ 成功 (29.9s)
- **构建结果**: ❌ 失败 (lint 错误)
- **总大小**: 286 MB

### 目录结构
| 目录/文件 | 大小 | 占比 |
|-----------|------|------|
| `.next/cache` | 272 MB | 95% |
| `.next/server` | 5.6 MB | 2% |
| `.next/static` | 3.0 MB | 1% |
| `.next/types` | 664 KB | <1% |

> **注**: cache 目录大是正常的（包含 SWC 编译缓存），生产部署时不会包含。

---

## 2. 发现的问题

### 🔴 高优先级

#### 2.1 构建失败 - Toast 测试文件 Lint 错误
- **文件**: `src/components/ui/Toast.test.tsx:62`
- **问题**: 违反 React Hooks 规则 - 在组件外部修改变量
- **影响**: 无法完成生产构建

```tsx
// 错误代码
const captured: { context: ReturnType<typeof useToast> | undefined } = { context: undefined };
function TestConsumer() {
  captured.context = useToast(); // ❌ 不能在组件内修改外部变量
  return null;
}
```

#### 2.2 Three.js 整体导入
- **文件**: 
  - `src/components/knowledge-lattice/KnowledgeEdge.tsx`
  - `src/components/knowledge-lattice/KnowledgeNode.tsx`
- **问题**: `import * as THREE from 'three'` 导入整个库
- **影响**: 打包体积增加约 500KB+（Three.js 很大）

```tsx
// 当前代码
import * as THREE from 'three';

// 建议改为
import { Vector3, Quaternion, Matrix4 } from 'three';
```

### 🟡 中优先级

#### 2.3 Chart.js 直接导入
- **文件**: `src/components/charts/TeamWorkloadChart.tsx`
- **问题**: 从 'chart.js' 导入，可能包含整个库

#### 2.4 静态图片未优化
- **文件**: `public/logo.png`, `public/og-image.svg` 等
- **建议**: 考虑使用 WebP/AVIF 格式

---

## 3. Next.js 配置评估

### ✅ 已优化的配置

| 配置项 | 状态 | 说明 |
|--------|------|------|
| `optimizePackageImports` | ✅ | 已配置 9 个库（three, chart.js, zustand 等） |
| `images.formats` | ✅ | AVIF + WebP |
| `images.remotePatterns` | ✅ | 安全配置，防止 SSRF |
| `poweredByHeader` | ✅ | 已禁用 |
| `compress` | ✅ | Gzip 压缩已启用 |
| `skipTrailingSlashRedirect` | ✅ | 已跳过 |
| `webpack` | ✅ | 正确处理 Redis 等 Node 模块 |

### 建议增强的配置

```javascript
// next.config.js 建议添加
module.exports = {
  // ... 现有配置
  
  // 启用 bundle 分析
  // bundleAnalyzer: true, // 需要 @next/bundle-analyzer
  
  // 生产环境优化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // 更好的日志级别
  logginess: {
    buildId: process.env.NEXT_PUBLIC_BUILD_ID,
  },
};
```

---

## 4. 数据库查询检查

### 结果: ✅ 无 N+1 问题

- 项目使用**模拟数据**（mock data）
- 未发现 Prisma/Drizzle/TypeORM 等 ORM 使用
- API 路由直接从内存/静态文件返回数据

---

## 5. 优化建议

### 立即修复 (高优先级)

1. **修复 Toast 测试文件**
   ```tsx
   // 修改为使用 useRef
   const captured = useRef<ReturnType<typeof useToast>>();
   function TestConsumer() {
     const context = useToast();
     captured.current = context;
     return null;
   }
   ```

2. **优化 Three.js 导入**
   ```tsx
   // 只导入需要的模块
   import { 
     Vector3, 
     Quaternion, 
     Matrix4,
     Color 
   } from 'three';
   ```

### 中期优化

1. **添加 bundle 分析**
   ```bash
   npm install @next/bundle-analyzer
   ```

2. **图片格式转换**
   - 将 PNG 转 WebP/AVIF
   - 使用 next/image 的 sizes 属性优化

3. **代码分割检查**
   - 确保知识晶格页面使用动态导入
   ```tsx
   const KnowledgeGraph = dynamic(
     () => import('@/components/knowledge-lattice/Graph'),
     { ssr: false, loading: () => <Skeleton /> }
   );
   ```

---

## 总结

| 类别 | 状态 | 备注 |
|------|------|------|
| 构建性能 | ⚠️ | 需修复测试文件错误 |
| Bundle 大小 | 🟡 | 中等，需要优化 three.js 导入 |
| 图片优化 | 🟢 | 已配置 Next.js 优化 |
| 代码分割 | 🟢 | 已使用 optimizePackageImports |
| 数据库 | 🟢 | 无 ORM，无 N+1 风险 |

**建议优先修复 Toast 测试文件和 Three.js 导入问题，可减少约 500KB+ 的 bundle 大小。**
