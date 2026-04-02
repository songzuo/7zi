# React Compiler 集成方案

> Next.js 16 + React 19 环境下的 babel-plugin-react-compiler 完整集成指南

## 1. 当前环境分析

### 1.1 已安装的 React 版本

| 依赖                          | 版本    | 状态      |
| ----------------------------- | ------- | --------- |
| `react`                       | ^19.2.4 | ✅ 兼容   |
| `react-dom`                   | ^19.2.4 | ✅ 兼容   |
| `next`                        | ^16.2.1 | ✅ 兼容   |
| `babel-plugin-react-compiler` | ^1.0.0  | ✅ 已安装 |

### 1.2 构建配置

- **构建工具**: Turbopack (`next dev --turbopack`, `next build --turbopack`)
- **Babel 配置**: 无独立 babel.config，Next.js 16 内置支持
- **React Strict Mode**: 已启用 (`reactStrictMode: true`)

## 2. 安装和配置步骤

### 2.1 验证当前安装

```bash
npm list babel-plugin-react-compiler
```

应显示: `babel-plugin-react-compiler@1.0.0`

### 2.2 创建 Babel 配置

项目根目录创建 `babel.config.mjs`:

```javascript
const babelPluginReactCompiler = require('babel-plugin-react-compiler')

export const plugins = [
  [
    babelPluginReactCompiler,
    {
      // 生产环境启用，development 可选
      target: '19', // React 19
      // 严格模式检查
      runtimeModule: 'react-compiler-runtime',
      // 启用日志调试
      logSourceLocations: process.env.NODE_ENV !== 'production',
    },
  ],
]
```

### 2.3 Next.js 配置更新

`next.config.ts` 中添加:

```typescript
const nextConfig: NextConfig = {
  // 确保 React Compiler 在生产环境启用
  experimental: {
    // React Compiler 配置
    reactCompiler: {
      // 仅在生产构建时启用
      enabled: process.env.NODE_ENV === 'production',
      // 或全局启用（development 也会编译）
      // enabled: true,
    },
  },
}
```

**注意**: Next.js 16 的 Turbopack 默认使用 SWC 编译。要使用 React Compiler，需要在 development 模式使用 Babel，或等待 Turbopack 原生支持。

### 2.4 替代方案：通过 Next.js 实验性配置

```typescript
// next.config.ts
experimental: {
  // 使用 experimental-reactCompiler 配置
  reactCompiler: true,
},
```

## 3. 现有代码兼容性分析

### 3.1 已识别的 Hook 使用模式

以下文件包含 React Hooks，需要检查兼容性:

| 文件                                    | Hook 类型                    |
| --------------------------------------- | ---------------------------- |
| `src/lib/code-splitting.tsx`            | useEffect, useState, useMemo |
| `src/lib/threejs-optimize.tsx`          | useEffect, useState          |
| `src/lib/websocket/useCollaboration.ts` | useEffect, useState          |
| `src/lib/realtime/useWebSocket.ts`      | useEffect, useState          |

### 3.2 需要修改的代码模式

React Compiler 要求以下模式必须修复:

1. **禁止在 hooks 外部调用 hooks**

   ```tsx
   // ❌ 错误
   const value = useMemo(() => compute(), [])
   if (condition) useState(0)

   // ✅ 正确
   const value = useMemo(() => compute(), [])
   ```

2. **禁止在条件语句中调用 hooks**

   ```tsx
   // ❌ 错误
   if (flag) {
     const [state, setState] = useState(0)
   }

   // ✅ 正确 - hooks 必须在组件顶层
   const [state, setState] = useState(0)
   ```

3. **useEffect 依赖数组必须完整**

   ```tsx
   // ⚠️ 警告 (可能需要修复)
   useEffect(() => {
     fetch(data.userId)
   }, []) // 缺少依赖

   // ✅ 正确
   useEffect(() => {
     fetch(data.userId)
   }, [data.userId])
   ```

4. **禁止在 useEffect 中使用 async 函数**

   ```tsx
   // ❌ 错误
   useEffect(async () => {
     await fetchData()
   }, [])

   // ✅ 正确
   useEffect(() => {
     const fetchData = async () => {
       await fetchData()
     }
     fetchData()
   }, [])
   ```

### 3.3 需要审查的文件清单

```
src/components/**/*.tsx
src/app/**/*.tsx
src/lib/**/*.{ts,tsx}
src/hooks/*.ts
```

## 4. 性能基准测试方案

### 4.1 测试指标

| 指标                           | 基准值 | 目标        |
| ------------------------------ | ------ | ----------- |
| LCP (Largest Contentful Paint) | 当前值 | 优化 10-15% |
| FID (First Input Delay)        | 当前值 | 优化 5-10%  |
| Bundle Size                    | 当前值 | 减少 5-8%   |
| React Render Time              | 当前值 | 减少 20-30% |

### 4.2 测试脚本

创建 `scripts/react-compiler-benchmark.mjs`:

```javascript
import { chromium } from 'playwright'

async function benchmark() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  const metrics = []

  // 导航到关键页面
  const pages = ['/', '/dashboard', '/members']

  for (const path of pages) {
    await page.goto(`http://localhost:3000${path}`)

    const metrics = await page.evaluate(() => {
      const perf = window.performance
      const paint = perf.getEntriesByType('paint')
      const nav = perf.getEntriesByType('navigation')[0]

      return {
        fp: paint.find(e => e.name === 'first-paint')?.startTime,
        fcp: paint.find(e => e.name === 'first-contentful-paint')?.startTime,
        lcp: perf.getEntriesByType('largest-contentful-paint')[0]?.startTime,
        domContentLoaded: nav?.domContentLoadedEventEnd,
        loadComplete: nav?.loadEventEnd,
      }
    })

    metrics.push({ path, ...metrics })
  }

  console.table(metrics)
  await browser.close()
}

benchmark()
```

### 4.3 运行基准测试

```bash
# 1. 启动开发服务器
npm run dev

# 2. 运行基准测试
node scripts/react-compiler-benchmark.mjs
```

## 5. 生产环境启用策略

### 5.1 分阶段发布计划

| 阶段 | 环境              | 状态        | 时间    |
| ---- | ----------------- | ----------- | ------- |
| 1    | Local/Dev         | 🔧 调试中   | Day 1   |
| 2    | Staging           | 🧪 测试     | Day 2-3 |
| 3    | Production (10%)  | 📊 灰度     | Day 4-5 |
| 4    | Production (100%) | ✅ 全面启用 | Day 6   |

### 5.2 配置示例

```bash
# .env.production
REACT_COMPILER_ENABLED=true
```

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: {
      enabled: process.env.REACT_COMPILER_ENABLED === 'true',
    },
  },
}
```

### 5.3 回滚计划

1. 设置环境变量 `REACT_COMPILER_ENABLED=false`
2. 或移除 `babel.config.mjs`
3. 重新部署

## 6. 与 Turbopack 的兼容性

### 6.1 当前状态

| 场景                        | 支持状态                       |
| --------------------------- | ------------------------------ |
| `next dev --turbopack`      | ⚠️ 部分支持 (Babel 插件不生效) |
| `next build --turbopack`    | ⚠️ 部分支持                    |
| `next dev` (无 Turbopack)   | ✅ 完全支持                    |
| `next build` (无 Turbopack) | ✅ 完全支持                    |

### 6.2 解决方案

**方案 A: 临时回退到 Webpack (推荐用于开发)**

```bash
npm run dev
# 不使用 --turbopack
```

**方案 B: 等待 Turbopack 原生支持**

- Next.js 16.2+ 正在积极开发 React Compiler 支持
- 关注 [Next.js Changelog](https://nextjs.org/blog/changelog)

**方案 C: 使用 Babel 作为开发编译器**

创建 `package.json` 脚本:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "dev:babel": "next dev",
    "build": "NODE_ENV=production next build --turbopack",
    "build:webpack": "NODE_ENV=production next build"
  }
}
```

### 6.3 推荐的开发工作流

```bash
# 开发时使用 Babel (React Compiler 生效)
npm run dev:babel

# 生产构建使用 Turbopack (已测试兼容后)
npm run build
```

## 7. 风险评估

| 风险             | 级别  | 缓解措施               |
| ---------------- | ----- | ---------------------- |
| Turbopack 不支持 | 🔴 高 | 使用 Webpack 构建      |
| Hook 规则违反    | 🟡 中 | 代码审查 + ESLint 插件 |
| 性能回退         | 🟡 中 | 基准测试 + 监控        |
| 编译时间增加     | 🟢 低 | 生产构建可接受         |

## 8. 实施检查清单

- [ ] 创建 `babel.config.mjs`
- [ ] 审查 Hook 使用代码
- [ ] 修复违规的 Hook 模式
- [ ] 配置 Next.js experimental.reactCompiler
- [ ] 运行单元测试验证
- [ ] 运行 E2E 测试验证
- [ ] 性能基准测试
- [ ] Staging 环境部署测试
- [ ] 生产环境灰度发布
- [ ] 监控和日志配置

## 9. 相关文档

- [React Compiler 官方文档](https://react.dev/reference/react/compiler)
- [Next.js 16 发布说明](https://nextjs.org/blog)
- [Turbopack 迁移评估](./TURBOPACK_MIGRATION_ASSESSMENT.md)
