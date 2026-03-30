# Next.js 16 升级方案报告

**📚 咨询师报告**
**日期**: 2026-03-30
**项目**: 7zi-frontend
**当前版本**: Next.js 16.2.1, React 19.2.4

---

## 📋 执行摘要

### 好消息：主升级已完成 ✅

项目**已经成功升级**到：
- **Next.js 16.2.1** (最新版)
- **React 19.2.4** (React 19 稳定版)

### ⚠️ 剩余问题：依赖兼容性

主要依赖项仍期望 React 18，存在版本不匹配警告：

| 包名 | 期望版本 | 实际版本 | 状态 |
|------|----------|----------|------|
| Storybook + Addons | ^18.2.0 | 19.2.4 | ❌ 不兼容 |
| @testing-library/react | ^18.2.0 | 19.2.4 | ❌ 不兼容 |
| @types/react / @types/react-dom | ^18.2.0 | 18.3.28 | ⚠️ 部分兼容 |
| lucide-react | ^18.2.0 | 19.2.4 | ❌ 不兼容 |
| vitest | ^3.0.8 | 1.6.1 | ❌ 版本过旧 |
| @vitejs/plugin-react | ^7.2.4 | 4.7.0 | ⚠️ 部分兼容 |

**@react-three/drei**: 未安装，如需 3D 功能需单独考虑。

---

## 1️⃣ Next.js 16 重大变化 (Next.js 15 → 16)

### 🔴 Breaking Changes

#### 1.1 Async Request APIs (强制异步化)
Next.js 15 引入了临时同步兼容性，**Next.js 16 完全移除同步访问**：

```typescript
// ❌ Next.js 15 (已移除)
const { cookies, headers, params } = props;

// ✅ Next.js 16
const cookies = await props.cookies();
const headers = await props.headers();
const { slug } = await props.params;
```

**受影响的文件**：
- `app/**/layout.js`
- `app/**/page.js`
- `app/**/route.js`
- `app/**/opengraph-image.js` / `icon.js`
- `app/**/sitemap.js`

#### 1.2 `middleware.ts` → `proxy.ts`
```bash
# 重命名
mv middleware.ts proxy.ts
```

```typescript
// ❌ 旧写法
export function middleware(request) {}

// ✅ 新写法
export function proxy(request) {}
```

#### 1.3 Turbopack 默认启用
```json
// package.json - 不再需要 --turbopack 标志
{
  "scripts": {
    "dev": "next dev",        // 已是 Turbopack
    "build": "next build"     // 已是 Turbopack
  }
}
```

如需使用 Webpack：
```bash
next build --webpack
```

#### 1.4 `next/image` 重大变化

| 配置项 | 旧默认值 | 新默认值 | 风险 |
|--------|----------|----------|------|
| `minimumCacheTTL` | 60 秒 | 4 小时 | 🔴 高 |
| `imageSizes` | 包含 16 | 移除 16 | 🟡 中 |
| `qualities` | 全部允许 | 仅 [75] | 🔴 高 |
| `maximumRedirects` | 无限制 | 3 | 🟡 中 |

#### 1.5 其他移除的 API

| 移除项 | 替代方案 |
|--------|----------|
| `next/amp` | 使用标准 Next.js 优化 |
| `next lint` | 使用 ESLint 直接 |
| `serverRuntimeConfig` / `publicRuntimeConfig` | 环境变量 |
| `experimental.dynamicIO` | `cacheComponents` |
| `unstable_rootParams` | 待定 |

---

## 2️⃣ React 19 新特性分析

### 🎯 React Compiler (useMemo/useCallback 可移除场景)

React Compiler 1.0 已稳定，**Next.js 16 内置支持**：

```typescript
// next.config.ts
const nextConfig = {
  reactCompiler: true,
}
```

**可移除的场景**：
```tsx
// ❌ 可以移除
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
const memoizedCallback = useCallback(() => doSomething(a), [a]);

// ✅ React Compiler 自动优化
const memoizedValue = computeExpensiveValue(a, b);
const memoizedCallback = () => doSomething(a);
```

**仍需保留的场景**：
- 传递给子组件的回调需要稳定引用
- 依赖注入模式
- 非常量依赖

### 🆕 use() Hook
```tsx
// 条件性读取 Context
function Heading({ children }) {
  if (children == null) return null;
  const theme = use(ThemeContext); // 可在条件后调用
  return <h1 style={{ color: theme.color }}>{children}</h1>;
}
```

### 🆕 useActionState (原 useFormState)
```tsx
const [error, submitAction, isPending] = useActionState(
  async (previousState, formData) => {
    const result = await submitForm(formData);
    return result.error || null;
  },
  null
);
```

### 🆕 useOptimistic
```tsx
const [optimisticName, setOptimisticName] = useOptimistic(name);

const submitAction = async (formData) => {
  setOptimisticName(formData.get("name")); // 即时乐观更新
  await updateName(formData.get("name"));
};
```

### 🆕 ref 作为 Prop
```tsx
// ❌ 旧写法
const MyInput = forwardRef(({ placeholder }, ref) => (
  <input placeholder={placeholder} ref={ref} />
));

// ✅ 新写法 (React 19)
function MyInput({ placeholder, ref }) {
  return <input placeholder={placeholder} ref={ref} />;
}
```

---

## 3️⃣ 项目依赖兼容性分析

### 当前状态
```json
{
  "next": "16.2.1",      // ✅ 最新
  "react": "19.2.4",      // ✅ 最新
  "react-dom": "19.2.4",  // ✅ 最新
}
```

### 需要更新的依赖

| 包 | 当前版本 | 目标版本 | 优先级 |
|----|----------|----------|--------|
| @types/react | 18.3.28 | ^19.0.0 | P0 |
| @types/react-dom | 18.3.28 | ^19.0.0 | P0 |
| @storybook/* | 10.3.3 | 8.x | P1 |
| @testing-library/react | 14.2.0 | 16.x | P1 |
| vitest | 1.3.0 | ^3.0.0 | P1 |
| lucide-react | 1.7.0 | 最新 | P2 |
| @vitejs/plugin-react | 4.2.0 | 4.3.x | P2 |

---

## 4️⃣ 升级步骤清单

### 阶段 1：类型定义更新 (P0) — 预计 2 小时

```bash
# 更新 React 类型定义
npm install --save-exact @types/react@^19.0.0 @types/react-dom@^19.0.0

# 验证无 TypeScript 错误
npx tsc --noEmit
```

**预期问题**：
- `useRef()` 需要传入参数
- JSX 命名空间变更

### 阶段 2：测试框架更新 (P1) — 预计 4 小时

```bash
# 更新 Vitest
npm install --save-dev vitest@^3.0.0 @vitest/browser-playwright@^4.0.0

# 更新 Testing Library
npm install --save-dev @testing-library/react@^16.0.0 @testing-library/jest-dom@^6.4.0
```

**运行回归测试**：
```bash
npm run test
npm run test:e2e
```

### 阶段 3：Storybook 更新 (P1) — 预计 8 小时

```bash
# Storybook 8.x 支持 React 19
npm install --save-dev @storybook/react@^8.0.0 @storybook/react-vite@^8.0.0
```

**验证 Storybook**：
```bash
npm run storybook
```

### 阶段 4：Next.js 16 适配 (P0) — 预计 6 小时

#### 4.1 异步化 Request APIs
检查并更新所有使用同步 `cookies()`, `headers()`, `params` 的文件：

```typescript
// ❌ 同步 (Next.js 15)
export default function Page({ params, searchParams }) {
  const { slug } = params;
  const query = searchParams;
}

// ✅ 异步 (Next.js 16)
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params;
  const query = await props.searchParams;
}
```

#### 4.2 重命名 middleware
```bash
mv middleware.ts proxy.ts
# 更新函数名
```

#### 4.3 更新 next/image 配置
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  images: {
    minimumCacheTTL: 60,        // 如需旧行为
    qualities: [50, 75, 100],   // 如需多质量
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // 如需 16px
  }
}
```

### 阶段 5：React 19 优化 (P2) — 预计 8 小时

#### 5.1 启用 React Compiler
```typescript
// next.config.ts
const nextConfig = {
  reactCompiler: true,
}
```

#### 5.2 逐步采用新 Hooks
- 优先在表单场景使用 `useActionState`
- 使用 `useOptimistic` 改进 UX
- 考虑将 `forwardRef` 迁移到新 `ref` prop

---

## 5️⃣ 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 第三方库不兼容 | 高 | 中 | 隔离测试，备选降级 |
| 类型变更导致编译错误 | 中 | 低 | 增量更新类型定义 |
| Turbopack 不兼容 | 中 | 低 | 提供 `--webpack` 回退 |
| 运行时性能回退 | 低 | 低 | React Compiler 性能基准测试 |

---

## 6️⃣ 回滚方案

### 方案 A：npm 版本锁定
```bash
# 快速回滚
npm install --save-exact next@15.5.12 react@18.3.1 react-dom@18.3.1
```

### 方案 B：Git 回滚
```bash
git checkout <commit-hash-before-upgrade>
npm install
```

---

## 7️⃣ 预计工时

| 阶段 | 任务 | 预计工时 |
|------|------|----------|
| 1 | 类型定义更新 | 2 小时 |
| 2 | 测试框架更新 | 4 小时 |
| 3 | Storybook 更新 | 8 小时 |
| 4 | Next.js 16 适配 | 6 小时 |
| 5 | React 19 优化 | 8 小时 |
| - | **总计** | **28 小时** |

---

## 8️⃣ 附录：React 19 Breaking Changes 速查

| 移除项 | 迁移 |
|--------|------|
| `propTypes` / `defaultProps` | 使用 TypeScript |
| String refs | 使用 ref callbacks |
| `React.createFactory` | 使用 JSX |
| `ReactDOM.render` | 使用 `createRoot` |
| `act()` 从 react-dom/test-utils | 从 react 导入 |
| `findDOMNode` | 使用 ref |

---

## 9️⃣ 推荐行动

### 立即行动
1. ✅ 主版本已升级完成
2. ⏳ 更新 `@types/react` 和 `@types/react-dom` 到 ^19.0.0
3. ⏳ 运行 `npx tsc --noEmit` 检查类型错误

### 短期 (1 周)
4. 更新 Vitest 和 Testing Library
5. 更新 Storybook 到 8.x
6. 适配 Async Request APIs

### 中期 (2 周)
7. 启用 React Compiler 并监控性能
8. 逐步采用 React 19 新 Hooks

---

*报告生成时间: 2026-03-30 14:40 UTC*
*咨询师: 📚 咨询师 (minimax)*
