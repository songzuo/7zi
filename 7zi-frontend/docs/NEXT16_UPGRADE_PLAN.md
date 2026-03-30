# Next.js 16 升级计划

**创建日期**: 2026-03-30  
**项目**: 7zi-frontend  
**当前版本**: Next.js 16.2.1, React 19.2.4  
**状态**: ✅ 已完成基础升级，存在依赖兼容性问题需要解决

---

## 📊 执行摘要

### 当前状态
项目**已经升级**到 Next.js 16.2.1 和 React 19.2.4，但存在以下问题：

1. **依赖兼容性问题**: 多个第三方库期望 React 18，导致 npm 报错
2. **Storybook 兼容性**: Storybook 10.3.3 期望 React 18
3. **Testing Library 兼容性**: @testing-library/react 期望 React 18
4. **类型定义问题**: @types/react 和 @types/react-dom 版本不匹配

### 升级风险评估
- **风险等级**: 🟡 中等
- **预计工时**: 4-6 小时（解决依赖兼容性）
- **回滚难度**: 简单（Git 版本控制）

---

## 1. 项目依赖现状

### 1.1 核心框架版本
```json
{
  "next": "16.2.1",           // ✅ 已升级到 Next.js 16
  "react": "^19.2.4",          // ✅ 已升级到 React 19
  "react-dom": "^19.2.4"       // ✅ 已升级到 React 19
}
```

### 1.2 依赖兼容性问题清单

#### 🔴 高优先级（影响开发/构建）

| 依赖包 | 当前版本 | 期望版本 | 影响 |
|--------|---------|---------|------|
| `@storybook/nextjs-vite` | 10.3.3 | React 18 | Storybook 可能无法正常运行 |
| `@testing-library/react` | 14.2.0 | React 18 | 测试可能失败 |
| `@testing-library/user-event` | 14.5.0 | React 18 | 测试可能失败 |
| `lucide-react` | 1.7.0 | React 18 | UI 组件库 |
| `babel-plugin-react-compiler` | 1.0.0 | React 实验版本 | React Compiler 配置 |

#### 🟡 中优先级（影响开发体验）

| 依赖包 | 当前版本 | 期望版本 | 影响 |
|--------|---------|---------|------|
| `styled-jsx` | 5.1.6 | React 18 | 样式处理 |
| `vitest` | 1.3.0 | 多版本冲突 | 单元测试 |
| `vite` | 8.0.3 | 多版本冲突 | 构建工具 |

#### 🟢 低优先级（开发工具）

| 依赖包 | 当前版本 | 期望版本 | 影响 |
|--------|---------|---------|------|
| `@chromatic-com/storybook` | 5.1.1 | React 18 | Storybook 部署 |
| `storybook` | 10.3.3 | React 18 | Storybook CLI |

### 1.3 @react-three/drei 状态
**结论**: 项目中**未安装** @react-three/drei，无需考虑其兼容性。

---

## 2. Next.js 16 重大变化

### 2.1 核心架构变化

#### ✅ Turbopack 默认启用
- **Next.js 16**: Turbopack 稳定，`next dev` 和 `next build` 默认使用 Turbopack
- **影响**: 构建速度大幅提升
- **迁移**: 
  - 移除 `--turbopack` 标志（不再需要）
  - 如需使用 Webpack，添加 `--webpack` 标志
  - `experimental.turbopack` 配置移至顶级 `turbopack`

```js
// Next.js 15
{
  experimental: {
    turbopack: { /* options */ }
  }
}

// Next.js 16
{
  turbopack: { /* options */ }
}
```

#### ⚠️ Webpack 配置冲突
- 如果项目有自定义 webpack 配置，`next build` 会失败
- 解决方案：
  1. 使用 `next build --turbopack` 忽略 webpack 配置
  2. 迁移 webpack 配置到 Turbopack 兼容选项
  3. 使用 `next build --webpack` 继续使用 Webpack

### 2.2 异步 Request APIs（重大破坏性变更）

#### 完全移除同步访问
Next.js 15 引入了异步 Request APIs 作为破坏性变更，但提供了临时的同步兼容性。  
**Next.js 16 完全移除了同步访问**。

#### 受影响的 API

| API | 变化 |
|-----|------|
| `cookies()` | 必须使用 `await cookies()` |
| `headers()` | 必须使用 `await headers()` |
| `draftMode()` | 必须使用 `await draftMode()` |
| `params` (pages/layouts) | 必须使用 `await props.params` |
| `searchParams` (pages) | 必须使用 `await props.searchParams` |

#### 迁移示例

**之前（Next.js 15）：**
```typescript
// ❌ 同步访问（Next.js 16 不支持）
import { cookies } from 'next/headers'

export default function Page() {
  const cookieStore = cookies() // 同步
  const token = cookieStore.get('token')
  return <div>{token}</div>
}
```

**之后（Next.js 16）：**
```typescript
// ✅ 异步访问
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies() // 异步
  const token = cookieStore.get('token')
  return <div>{token}</div>
}
```

#### 使用类型生成工具
```bash
npx next typegen
```
自动生成类型辅助：
- `PageProps<'/path'>`
- `LayoutProps<'/path'>`
- `RouteContext`

### 2.3 React 19.2 集成

Next.js 16 内置 React 19.2，包含以下新特性：

#### 🎯 View Transitions API
```typescript
import { ViewTransition } from 'react'

function MyComponent() {
  return (
    <ViewTransition>
      <div>动画内容</div>
    </ViewTransition>
  )
}
```

#### 🎯 useEffectEvent
```typescript
import { useEffectEvent } from 'react'

function MyComponent() {
  const logEvent = useEffectEvent((event) => {
    console.log(event)
  })
  
  useEffect(() => {
    // logEvent 是稳定的，不需要在依赖数组中
  }, [])
}
```

#### 🎯 Activity API
```typescript
import { Activity } from 'react'

function MyComponent() {
  return (
    <Activity mode="hidden">
      <div>隐藏但保持状态</div>
    </Activity>
  )
}
```

### 2.4 React Compiler 支持

Next.js 16 内置 React Compiler 支持（稳定版）。

#### 启用 React Compiler
```js
// next.config.js
module.exports = {
  reactCompiler: true,
}
```

#### 安装依赖
```bash
npm install -D babel-plugin-react-compiler
```

#### React Compiler 的优势
- **自动 memoization**: 无需手动使用 `useMemo`、`useCallback`、`React.memo`
- **性能提升**: 自动优化组件渲染
- **代码简化**: 减少样板代码

#### React Compiler 的注意事项
- 编译时间会增加（使用 Babel）
- 需要测试确保编译结果正确
- 可以逐步启用（增量采用策略）

### 2.5 middleware 重命名为 proxy

**重要变化**: `middleware` 文件名已弃用，重命名为 `proxy`。

#### 迁移步骤
```bash
# 重命名文件
mv middleware.ts proxy.ts
# 或
mv middleware.js proxy.js
```

#### 配置更新
```js
// Next.js 15
{
  skipMiddlewareUrlNormalize: true
}

// Next.js 16
{
  skipProxyUrlNormalize: true
}
```

**注意**: `proxy` 运行时为 `nodejs`，不支持 `edge` 运行时。如需使用 edge 运行时，继续使用 `middleware`。

### 2.6 缓存 APIs 变化

#### revalidateTag 新签名
```typescript
// 新增 cacheLife 参数
revalidateTag('article-123', 'max')
```

#### 新增 updateTag API
```typescript
import { updateTag } from 'next/cache'

// 提供读写一致性（用户立即看到更改）
updateTag('user-123')
```

#### cacheLife 和 cacheTag 稳定化
```typescript
// 不再需要 unstable_ 前缀
import { cacheLife, cacheTag } from 'next/cache'
```

### 2.7 图像优化变化

#### 本地图像查询字符串要求
```js
// next.config.js
{
  images: {
    localPatterns: [
      {
        pathname: '/assets/**',
        search: '?v=1',
      },
    ],
  },
}
```

#### 默认值变更

| 配置项 | Next.js 15 | Next.js 16 |
|--------|-----------|-----------|
| `minimumCacheTTL` | 60 秒 | 4 小时 |
| `imageSizes` | 包含 16 | 移除 16 |
| `qualities` | 所有质量 | 仅 [75] |
| `maximumRedirects` | 无限制 | 3 |

### 2.8 移除的功能

#### 完全移除
- ❌ AMP 支持
- ❌ `next lint` 命令（使用 ESLint CLI）
- ❌ `serverRuntimeConfig` 和 `publicRuntimeConfig`
- ❌ `experimental.dynamicIO`（使用 `cacheComponents`）
- ❌ `unstable_rootParams`
- ❌ `next/legacy/image` 组件

#### 并行路由 default.js 要求
所有并行路由槽现在需要明确的 `default.js` 文件。

```tsx
// app/@modal/default.tsx
import { notFound } from 'next/navigation'

export default function Default() {
  notFound() // 或 return null
}
```

---

## 3. React 19 新特性

### 3.1 Actions（重大改进）

Actions 是 React 19 的核心特性，简化了数据变更和状态管理。

#### 传统方式（Before）
```typescript
function UpdateName() {
  const [name, setName] = useState("")
  const [error, setError] = useState(null)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async () => {
    setIsPending(true)
    const error = await updateName(name)
    setIsPending(false)
    if (error) {
      setError(error)
      return
    }
    redirect("/path")
  }

  return (
    <div>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button onClick={handleSubmit} disabled={isPending}>Update</button>
      {error && <p>{error}</p>}
    </div>
  )
}
```

#### 使用 Actions（After）
```typescript
import { useActionState } from 'react'

function UpdateName() {
  const [error, submitAction, isPending] = useActionState(
    async (previousState, formData) => {
      const error = await updateName(formData.get("name"))
      if (error) return error
      redirect("/path")
      return null
    },
    null,
  )

  return (
    <form action={submitAction}>
      <input type="text" name="name" />
      <button type="submit" disabled={isPending}>Update</button>
      {error && <p>{error}</p>}
    </form>
  )
}
```

**优势**:
- 自动处理 pending 状态
- 自动错误处理
- 支持乐观更新
- 表单自动重置

### 3.2 use() API

新的 `use()` API 用于在渲染中读取资源。

#### 读取 Promise
```typescript
import { use } from 'react'

function Comments({ commentsPromise }) {
  const comments = use(commentsPromise)
  return comments.map(comment => <p key={comment.id}>{comment}</p>)
}

function Page({ commentsPromise }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Comments commentsPromise={commentsPromise} />
    </Suspense>
  )
}
```

#### 读取 Context
```typescript
import { use } from 'react'

function Heading({ children }) {
  if (children == null) return null
  
  // 可以在条件语句中使用（useContext 不支持）
  const theme = use(ThemeContext)
  return <h1 style={{ color: theme.color }}>{children}</h1>
}
```

### 3.3 ref 作为 prop

**重大变化**: 函数组件现在可以直接访问 `ref` 作为 prop，无需 `forwardRef`。

#### 之前
```typescript
import { forwardRef } from 'react'

const MyInput = forwardRef(({ placeholder }, ref) => {
  return <input placeholder={placeholder} ref={ref} />
})
```

#### 现在
```typescript
function MyInput({ placeholder, ref }) {
  return <input placeholder={placeholder} ref={ref} />
}
```

### 3.4 Context 简化

#### 之前
```typescript
<ThemeContext.Provider value="dark">
  {children}
</ThemeContext.Provider>
```

#### 现在
```typescript
<ThemeContext value="dark">
  {children}
</ThemeContext>
```

### 3.5 ref 清理函数

```typescript
<input
  ref={(ref) => {
    // ref 创建
    
    // 返回清理函数
    return () => {
      // ref 清理
    }
  }}
/>
```

### 3.6 文档元数据支持

React 19 原生支持在组件中渲染 `<title>`、`<link>`、`<meta>` 标签，自动提升到 `<head>`。

```typescript
function BlogPost({ post }) {
  return (
    <article>
      <h1>{post.title}</h1>
      <title>{post.title}</title>
      <meta name="author" content="Josh" />
      <link rel="author" href="https://twitter.com/joshcstory/" />
      <p>Content...</p>
    </article>
  )
}
```

### 3.7 样式表支持

React 19 自动管理样式表加载顺序。

```typescript
function Component() {
  return (
    <>
      <link rel="stylesheet" href="foo" precedence="default" />
      <link rel="stylesheet" href="bar" precedence="high" />
      <article className="foo-class bar-class">
        {/* ... */}
      </article>
    </>
  )
}
```

### 3.8 React Compiler 与手动优化

#### React Compiler 自动化的场景

**✅ 可以移除 useMemo/useCallback：**

```typescript
// 之前
function MyComponent({ items }) {
  const filteredItems = useMemo(
    () => items.filter(item => item.active),
    [items]
  )
  
  const handleClick = useCallback(() => {
    console.log('clicked')
  }, [])
  
  return <ChildComponent items={filteredItems} onClick={handleClick} />
}

// 之后（React Compiler 自动优化）
function MyComponent({ items }) {
  const filteredItems = items.filter(item => item.active)
  const handleClick = () => console.log('clicked')
  
  return <ChildComponent items={filteredItems} onClick={handleClick} />
}
```

**❌ 仍需手动优化的场景：**

1. **昂贵的计算**（编译器无法判断计算成本）
```typescript
// 保留 useMemo - 编译器不知道 calculateExpensiveValue 是否昂贵
const result = useMemo(() => calculateExpensiveValue(data), [data])
```

2. **自定义比较函数**
```typescript
// 保留 useMemo - 自定义比较逻辑
const result = useMemo(() => computeValue(a, b), [a, b], customCompare)
```

3. **依赖外部状态的副作用**
```typescript
// 保留 useCallback - 作为 useEffect 依赖
const handler = useCallback(() => {
  // ...
}, [dependency])

useEffect(() => {
  subscribe(handler)
  return () => unsubscribe(handler)
}, [handler])
```

---

## 4. 升级步骤清单

### 4.1 预升级检查 ✅

- [x] 备份当前代码（Git commit）
- [x] 确认 Node.js 版本 >= 20.9.0
- [x] 确认 TypeScript 版本 >= 5.1.0
- [x] 确认浏览器支持：Chrome 111+, Edge 111+, Firefox 111+, Safari 16.4+

### 4.2 核心框架升级 ✅（已完成）

```bash
# 升级核心依赖
npm install next@latest react@latest react-dom@latest

# 升级类型定义
npm install -D @types/react@latest @types/react-dom@latest
```

### 4.3 运行 Codemod

```bash
# 自动升级代码
npx @next/codemod@canary upgrade latest

# 这将自动处理：
# - Async Request APIs 迁移
# - middleware 到 proxy 重命名
# - unstable_ 前缀移除
# - experimental_ppr 移除
```

### 4.4 手动代码迁移

#### 4.4.1 异步 Request APIs（高优先级）

**搜索模式：**
```bash
# 查找同步 API 使用
grep -r "cookies()" --include="*.ts" --include="*.tsx"
grep -r "headers()" --include="*.ts" --include="*.tsx"
grep -r "draftMode()" --include="*.ts" --include="*.tsx"
```

**迁移步骤：**
1. 将函数标记为 `async`
2. 在 API 调用前添加 `await`
3. 更新类型定义（使用 `npx next typegen`）

#### 4.4.2 middleware 重命名（如果使用）

```bash
# 重命名文件
mv middleware.ts proxy.ts

# 更新函数名
# export function middleware() => export function proxy()
```

#### 4.4.3 更新 next.config.js

```js
// 移除 experimental.turbopack
module.exports = {
  // 之前
  experimental: {
    turbopack: { /* options */ }
  },
  
  // 之后
  turbopack: { /* options */ }
}
```

### 4.5 解决依赖兼容性问题 🔴

#### 4.5.1 升级 Storybook（推荐）

```bash
# 检查最新版本
npm outdated @storybook/nextjs-vite

# 升级到支持 React 19 的版本
npm install @storybook/nextjs-vite@latest \
  @storybook/addon-a11y@latest \
  @storybook/addon-docs@latest \
  @storybook/addon-onboarding@latest \
  @storybook/addon-vitest@latest \
  storybook@latest
```

**如果 Storybook 尚不支持 React 19：**
- 方案 1: 暂时使用 React 18 进行 Storybook 开发
- 方案 2: 等待 Storybook 发布 React 19 支持
- 方案 3: 使用 `--legacy-peer-deps` 标志

#### 4.5.2 升级 Testing Library

```bash
# 升级到支持 React 19 的版本
npm install @testing-library/react@latest \
  @testing-library/user-event@latest \
  @testing-library/jest-dom@latest
```

#### 4.5.3 升级 UI 组件库

```bash
# 升级 Lucide React
npm install lucide-react@latest
```

#### 4.5.4 处理依赖冲突

**选项 1: 等待库更新（推荐）**
- 大多数库会在 React 19 稳定后更新
- 检查 GitHub issues 和 releases

**选项 2: 使用 --legacy-peer-deps**
```bash
npm install --legacy-peer-deps
```

**选项 3: 使用 overrides（package.json）**
```json
{
  "overrides": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  }
}
```

### 4.6 启用 React Compiler（可选）

```bash
# 安装 React Compiler
npm install -D babel-plugin-react-compiler
```

```js
// next.config.js
module.exports = {
  reactCompiler: true,
}
```

**增量启用：**
```typescript
// 按组件启用
// @ts-expect-error React Compiler directive
'use memo'

function MyComponent() {
  // ...
}
```

### 4.7 测试验证

#### 4.7.1 单元测试
```bash
npm run test
```

#### 4.7.2 E2E 测试
```bash
npm run test:e2e
```

#### 4.7.3 构建测试
```bash
npm run build
```

#### 4.7.4 开发服务器
```bash
npm run dev
```

#### 4.7.5 生产服务器
```bash
npm run build
npm run start
```

---

## 5. 需要修改的代码

### 5.1 高优先级（必须修改）

#### 5.1.1 Server Components 中的同步 API
```typescript
// ❌ 之前
import { cookies, headers } from 'next/headers'

export default function Page() {
  const cookieStore = cookies()
  const headersList = headers()
  // ...
}

// ✅ 之后
import { cookies, headers } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const headersList = await headers()
  // ...
}
```

#### 5.1.2 Page 和 Layout 中的 params
```typescript
// ❌ 之前
export default function Page({ params }) {
  const { slug } = params
  // ...
}

// ✅ 之后
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params
  // ...
}
```

#### 5.1.3 并行路由 default.js
```bash
# 为每个并行路由创建 default.js
touch app/@modal/default.tsx
```

```typescript
// app/@modal/default.tsx
import { notFound } from 'next/navigation'

export default function Default() {
  notFound()
}
```

### 5.2 中优先级（建议修改）

#### 5.2.1 移除 forwardRef
```typescript
// ❌ 之前
import { forwardRef } from 'react'

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, ...props }, ref) => {
    return (
      <div>
        <label>{label}</label>
        <input ref={ref} {...props} />
      </div>
    )
  }
)

// ✅ 之后
function Input({ label, ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return (
    <div>
      <label>{label}</label>
      <input ref={ref} {...props} />
    </div>
  )
}
```

#### 5.2.2 简化 Context Provider
```typescript
// ❌ 之前
<ThemeContext.Provider value={value}>
  {children}
</ThemeContext.Provider>

// ✅ 之后
<ThemeContext value={value}>
  {children}
</ThemeContext>
```

#### 5.2.3 使用 Actions 替代表单处理
```typescript
// ❌ 之前
function ContactForm() {
  const [isPending, setIsPending] = useState(false)
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsPending(true)
    await submitForm(new FormData(e.target))
    setIsPending(false)
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={isPending}>Submit</button>
    </form>
  )
}

// ✅ 之后
function ContactForm() {
  const [, submitAction, isPending] = useActionState(
    async (prev, formData) => {
      await submitForm(formData)
      return null
    },
    null
  )
  
  return (
    <form action={submitAction}>
      <button type="submit" disabled={isPending}>Submit</button>
    </form>
  )
}
```

### 5.3 低优先级（可选优化）

#### 5.3.1 移除不必要的 useMemo/useCallback（如果启用 React Compiler）
```typescript
// 如果启用了 React Compiler，这些可以移除
const filteredItems = items.filter(item => item.active)
const handleClick = () => console.log('clicked')
```

#### 5.3.2 使用 use() API 简化 Context 读取
```typescript
// ❌ 之前
function Component({ show }) {
  const theme = useContext(ThemeContext)
  if (!show) return null
  return <div style={{ color: theme.color }}>...</div>
}

// ✅ 之后
function Component({ show }) {
  if (!show) return null
  const theme = use(ThemeContext) // 可以在条件中使用
  return <div style={{ color: theme.color }}>...</div>
}
```

---

## 6. 风险评估

### 6.1 高风险项 🔴

| 风险项 | 影响 | 概率 | 缓解措施 |
|--------|------|------|----------|
| 第三方库不支持 React 19 | 高 | 中 | 使用 `--legacy-peer-deps` 或等待库更新 |
| 异步 API 迁移遗漏 | 高 | 低 | 使用 codemod + 全面测试 |
| 并行路由缺少 default.js | 高 | 低 | 构建时会报错，易于发现 |

### 6.2 中风险项 🟡

| 风险项 | 影响 | 概率 | 缓解措施 |
|--------|------|------|----------|
| Webpack 配置不兼容 Turbopack | 中 | 中 | 使用 `--webpack` 标志或迁移配置 |
| middleware 重命名遗漏 | 中 | 低 | 全局搜索 `middleware` |
| React Compiler 编译错误 | 中 | 低 | 逐步启用 + 测试 |

### 6.3 低风险项 🟢

| 风险项 | 影响 | 概率 | 缓解措施 |
|--------|------|------|----------|
| ref 清理函数类型错误 | 低 | 低 | TypeScript 会提示 |
| Context Provider 语法更新 | 低 | 低 | 向后兼容 |

---

## 7. 回滚方案

### 7.1 Git 版本回滚
```bash
# 查看提交历史
git log --oneline

# 回滚到升级前的提交
git reset --hard <commit-hash>

# 强制推送（如果已推送到远程）
git push --force
```

### 7.2 依赖版本回滚
```bash
# 恢复 package.json
git checkout HEAD~1 -- package.json package-lock.json

# 重新安装依赖
rm -rf node_modules
npm install
```

### 7.3 部署回滚
- Vercel: 使用 "Rollback to previous deployment" 功能
- 自托管: 切换到上一个 Docker 镜像或 Git 版本

---

## 8. 预计工时

### 8.1 任务分解

| 任务 | 预计工时 | 优先级 |
|------|---------|--------|
| 依赖兼容性解决 | 2-3 小时 | 🔴 高 |
| 异步 API 迁移 | 1-2 小时 | 🔴 高 |
| 并行路由 default.js | 0.5 小时 | 🔴 高 |
| 测试修复 | 1-2 小时 | 🟡 中 |
| React Compiler 启用 | 0.5 小时 | 🟢 低 |
| 文档更新 | 0.5 小时 | 🟢 低 |

### 8.2 总计
- **最小工时**: 4 小时
- **预计工时**: 5-6 小时
- **最大工时**: 8 小时（含测试和调试）

---

## 9. 升级后收益

### 9.1 性能提升
- ⚡ **Turbopack**: 开发构建速度提升 10x
- ⚡ **React Compiler**: 自动优化，减少不必要的渲染
- ⚡ **增量预取**: 更快的页面导航

### 9.2 开发体验提升
- 🎯 **Actions**: 简化表单和数据变更
- 🎯 **use() API**: 更灵活的资源读取
- 🎯 **ref 作为 prop**: 无需 forwardRef
- 🎯 **文档元数据**: 原生支持 title/meta 标签

### 9.3 新功能
- 🚀 **View Transitions**: 流畅的页面过渡动画
- 🚀 **useEffectEvent**: 更清晰的 Effect 逻辑
- 🚀 **Activity API**: 隐藏 UI 但保持状态
- 🚀 **Server Components**: 更好的服务端渲染支持

---

## 10. 升级检查清单

### 升级前
- [ ] 创建 Git 分支
- [ ] 备份 package.json 和 package-lock.json
- [ ] 记录当前依赖版本

### 升级中
- [ ] 升级 Next.js 和 React
- [ ] 运行 codemod
- [ ] 手动迁移异步 APIs
- [ ] 创建并行路由 default.js
- [ ] 更新 next.config.js
- [ ] 解决依赖兼容性问题

### 升级后
- [ ] 运行单元测试
- [ ] 运行 E2E 测试
- [ ] 本地开发服务器测试
- [ ] 构建测试
- [ ] 生产服务器测试
- [ ] 性能基准测试
- [ ] 更新文档

---

## 11. 参考资源

### 官方文档
- [Next.js 16 升级指南](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [React 19 发布公告](https://react.dev/blog/2024/12/05/react-19)
- [React 19 升级指南](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [React Compiler 文档](https://react.dev/learn/react-compiler)

### 迁移工具
- [Next.js Codemod](https://github.com/vercel/next.js/tree/canary/packages/next-codemod)
- [React Codemod](https://github.com/reactjs/react-codemod)
- [TypeScript Codemod](https://github.com/eps1lon/types-react-codemod)

### 社区资源
- [Next.js GitHub Discussions](https://github.com/vercel/next.js/discussions)
- [React GitHub Issues](https://github.com/facebook/react/issues)

---

## 12. 总结

### 当前状态
✅ 项目已成功升级到 Next.js 16.2.1 和 React 19.2.4  
⚠️ 存在第三方依赖兼容性问题需要解决

### 下一步行动
1. **立即**: 解决 Storybook 和 Testing Library 的依赖冲突
2. **本周**: 完成异步 API 迁移和测试
3. **下周**: 启用 React Compiler 并优化性能

### 成功标准
- ✅ 所有测试通过
- ✅ 构建成功
- ✅ 开发服务器正常运行
- ✅ 生产部署成功
- ✅ 无控制台错误或警告

---

**最后更新**: 2026-03-30  
**维护者**: 7zi-frontend 开发团队
