# Next.js 15 升级评估报告

**评估日期**: 2026-03-25
**当前版本**: Next.js 14 + React 19
**目标版本**: Next.js 15 + React 19
**评估状态**: ✅ 建议升级（中等优先级）

---

## 执行摘要

基于对 Next.js 15 和 React 19 最新特性的研究，**建议升级到 Next.js 15**。升级将带来显著的性能提升和开发体验改进，但需要处理一些破坏性变更。建议在**Q2 2026**（第二季度）进行升级，给予充分的测试和调整时间。

**关键收益**:

- Turbopack 开发性能提升 76.7% 启动速度，96.3% 快速刷新
- 生产构建性能提升 2-5 倍（多核环境）
- React 19 Actions 简化表单处理
- 更好的 TypeScript 支持

**主要风险**:

- 异步 Request API 需要代码重构
- 缓存语义变更可能影响应用行为
- React 19 移除多个废弃 API

---

## 一、Next.js 15 主要新特性

### 1.1 核心性能改进

#### Turbopack Dev（稳定版）

- **开发服务器启动速度**: 最快提升 76.7%
- **代码更新速度**: 最快提升 96.3%（Fast Refresh）
- **初始路由编译**: 最快提升 45.8%
- **状态**: 生产可用，已在 vercel.com、v0.app 等大型应用中使用

#### Turbopack Builds（Beta，Next.js 15.5）

- **生产构建性能**: 2-5 倍速度提升（取决于项目规模和 CPU 核心数）
  - 小型项目（10K 模块）: 4 倍（30 核机器）
  - 中型项目（40K 模块）: 2.5 倍（30 核机器）
  - 大型项目（70K 模块）: 5 倍（30 核机器）
- **生产性能**: 与 Webpack 相当或更好的 JavaScript/CSS 包大小
- **限制**:
  - 小型项目/机器提升不明显（Webpack 持久缓存优势）
  - CSS 顺序可能与 Webpack 不同
  - 某些边缘场景打包优化略逊于 Webpack

### 1.2 React 19 集成

- **App Router**: 使用 React 19（生产就绪）
- **Pages Router**: 保持 React 18 兼容性（可选升级）
- **React Compiler（实验性）**: 自动优化组件，减少 useMemo/useCallback 需求
- **水合错误改进**: 更清晰的错误消息和源代码显示

### 1.3 开发体验改进

#### 自动化升级工具

```bash
npx @next/codemod@canary upgrade latest
```

- 自动更新依赖
- 显示可用的 codemods
- 引导应用转换

#### 静态路由指示器（开发时）

- 可视化显示静态/动态路由
- 帮助性能优化
- 可通过配置禁用

#### 增强的 Form 组件（`next/form`）

```jsx
import Form from 'next/form'
;<Form action="/search">
  <input name="query" />
  <button type="submit">Submit</button>
</Form>
```

- 自动预取布局和 loading UI
- 客户端导航（保留布局和状态）
- 渐进式增强（JavaScript 未加载时仍可工作）

#### next.config.ts 支持

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* 配置选项 */
}

export default nextConfig
```

### 1.4 服务器端改进

#### 异步 Request APIs（破坏性变更）

以下 API 现在需要 `await`:

- `cookies()`
- `headers()`
- `params`
- `searchParams`

**示例**:

```jsx
// ❌ Next.js 14
import { cookies } from 'next/headers';
export default function AdminPanel() {
  const cookieStore = cookies();
  const token = cookieStore.get('token');
}

// ✅ Next.js 15
import { cookies } from 'next/headers';
export default async function AdminPanel() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
}
```

**自动迁移**:

```bash
npx @next/codemod@canary next-async-request-api .
```

#### instrumentation.js（稳定版）

```jsx
export async function onRequestError(err, request, context) {
  // 捕获所有服务器端错误
  await fetch('https://...', {
    method: 'POST',
    body: JSON.stringify({ message: err.message, request, context }),
  })
}

export async function register() {
  // 初始化可观测性 SDK
}
```

#### unstable_after（实验性）

```jsx
import { unstable_after as after } from 'next/server'

export default function Layout({ children }) {
  // 次要任务（在响应流完成后执行）
  after(() => {
    logAnalytics()
  })

  // 主要任务
  return <>{children}</>
}
```

#### Server Actions 安全增强

- 未使用的 Actions 不会暴露到客户端
- 使用不可猜测的、非确定性的 ID
- 定期重新计算 ID 以增强安全性

### 1.5 缓存语义变更（破坏性变更）

#### GET Route Handlers 不再默认缓存

```js
// Next.js 14: 默认缓存
export async function GET(request) {}

// Next.js 15: 默认不缓存
// 如需缓存，需显式配置
export const dynamic = 'force-static'
```

#### 客户端路由缓存默认不缓存页面

- **Next.js 14**: 页面组件默认缓存 30 秒
- **Next.js 15**: 页面组件 staleTime = 0（始终反映最新数据）
- **恢复旧行为**:

```ts
// next.config.ts
const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
  },
}
```

### 1.6 TypeScript 改进（Next.js 15.5）

#### 类型路由（稳定）

```ts
// next.config.ts
const nextConfig = {
  typedRoutes: true, // 现已稳定！
};

// 完整的路径类型安全
<Link href="/blog/example-slug?ui=dark">Read Post</Link> // ✅
<Link href="/invalid-route">Broken Link</Link> // ❌ 编译时错误
```

#### 路由导出验证（Turbopack）

- 自动验证 pages、layouts 和 route handlers
- 使用 TypeScript 的 `satisfies` 操作符
- 在 `next build` 时捕获无效导出

#### 路由 Props 助手

```tsx
// 自动生成的全局类型
export default function DashboardLayout(props: LayoutProps<'/dashboard'>) {
  return (
    <div>
      {props.children}
      {props.analytics} {/* 完全类型的并行路由插槽 */}
      {props.team} {/* 完全类型的并行路由插槽 */}
    </div>
  )
}
```

#### next typegen 命令

```bash
# 手动生成类型（无需运行 dev 或 build）
next typegen [directory]

# CI 工作流
next typegen && tsc --noEmit
```

### 1.7 自托管改进

- **Cache-Control 控制**: 更精确的 stale-while-revalidate 期间配置
- **默认过期时间**: 更新为 1 年（确保 CDN 正确应用）
- **自定义 Cache-Control**: 不再覆盖自定义值
- **图像优化**: `next start` 时自动使用 `sharp`

### 1.8 其他改进

#### Node.js 中间件（稳定，Next.js 15.5）

```ts
export const config = {
  runtime: 'nodejs', // 现已稳定！
}

export function middleware(request: NextRequest) {
  // 完整的 Node.js API 访问
  const fs = require('fs')
  const crypto = require('crypto')
  // ...
}
```

#### ESLint 9 支持

- 支持 ESLint 9
- 保持向后兼容（仍可使用 ESLint 8）
- 升级 `eslint-plugin-react-hooks` 到 v5.0.0

#### next lint 弃用（Next.js 15.5）

- `next lint` 命令将在 Next.js 16 中移除
- 新项目使用直接 ESLint 配置或 Biome
- 迁移命令:

```bash
npx @next/codemod@latest next-lint-to-eslint-cli .
```

---

## 二、React 19 新特性及其在 Next.js 中的应用

### 2.1 Actions（异步过渡）

自动处理挂起状态、错误、表单和乐观更新:

```jsx
// ❌ 旧方式
function UpdateName() {
  const [error, setError] = useState(null)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async () => {
    setIsPending(true)
    const error = await updateName(name)
    setIsPending(false)
    if (error) setError(error)
  }

  return (
    <button onClick={handleSubmit} disabled={isPending}>
      Update
    </button>
  )
}

// ✅ React 19 Actions
function UpdateName() {
  const [error, submitAction, isPending] = useActionState(async (previousState, formData) => {
    const error = await updateName(formData.get('name'))
    return error
  }, null)

  return (
    <form action={submitAction}>
      <input type="text" name="name" />
      <button type="submit" disabled={isPending}>
        Update
      </button>
      {error && <p>{error}</p>}
    </form>
  )
}
```

### 2.2 useOptimistic Hook

乐观更新 - 显示最终状态而异步请求正在进行:

```jsx
function ChangeName({ currentName, onUpdateName }) {
  const [optimisticName, setOptimisticName] = useOptimistic(currentName)

  const submitAction = async formData => {
    const newName = formData.get('name')
    setOptimisticName(newName)
    const updatedName = await updateName(newName)
    onUpdateName(updatedName)
  }

  return (
    <form action={submitAction}>
      <p>Your name is: {optimisticName}</p>
      <input type="text" name="name" disabled={currentName !== optimisticName} />
    </form>
  )
}
```

### 2.3 useFormStatus Hook

访问表单状态而无需向下传递 props:

```jsx
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  )
}
```

### 2.4 use API

在 render 中读取资源:

```jsx
import { use } from 'react'

function Comments({ commentsPromise }) {
  // use 会 Suspense 直到 promise 解析
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

### 2.5 ref 作为 prop

不再需要 `forwardRef`:

```jsx
// ❌ 旧方式
const MyInput = forwardRef(({ placeholder }, ref) => <input placeholder={placeholder} ref={ref} />)

// ✅ React 19
function MyInput({ placeholder, ref }) {
  return <input placeholder={placeholder} ref={ref} />
}
```

### 2.6 文档元数据支持

原生支持 `<title>`、`<link>`、`<meta>` 标签:

```jsx
function BlogPost({ post }) {
  return (
    <article>
      <h1>{post.title}</h1>
      <title>{post.title}</title>
      <meta name="author" content={Josh} />
      <link rel="author" href="https://twitter.com/joshcstory/" />
      <meta name="keywords" content={post.keywords} />
      <p>Eee equals em-see-squared...</p>
    </article>
  )
}
```

### 2.7 样式表支持

自动管理样式表加载顺序:

```jsx
function Component() {
  return (
    <Suspense fallback="loading...">
      <link rel="stylesheet" href="foo.css" precedence="default" />
      <link rel="stylesheet" href="bar.css" precedence="high" />
      <article className="foo-class bar-class">
        {...}
      </article>
    </Suspense>
  );
}
```

### 2.8 异步脚本支持

可以在组件树中渲染异步脚本:

```jsx
function MyComponent() {
  return (
    <div>
      <script async={true} src=".../script.js" />
      Hello World
    </div>
  )
}
```

### 2.9 资源预加载 API

```jsx
import { prefetchDNS, preconnect, preload, preinit } from 'react-dom'

function MyComponent() {
  preinit('https://.../script.js', { as: 'script' })
  preload('https://.../font.woff', { as: 'font' })
  preload('https://.../stylesheet.css', { as: 'style' })
  prefetchDNS('https://...')
  preconnect('https://...')
}
```

---

## 三、破坏性变更

### 3.1 Next.js 15 破坏性变更

#### 1. 异步 Request APIs

**影响**: 高

- `cookies()`、`headers()`、`params`、`searchParams` 现在是异步的
- 需要添加 `await` 关键字
- 需要将组件标记为 `async`

**迁移**:

```bash
npx @next/codemod@canary next-async-request-api .
```

#### 2. 缓存语义变更

**影响**: 中-高

- GET Route Handlers 默认不缓存
- 客户端路由缓存默认 staleTime = 0
- 可能影响应用性能和行为

**缓解**: 使用配置选项恢复旧行为进行测试

#### 3. next/image 变更

- 移除 `squoosh`，使用 `sharp`
- 默认 `Content-Disposition` 改为 `attachment`
- `src` 的前导或尾随空格将报错

#### 4. next/font 变更

- 移除外部 `@next/font` 包支持
- 移除 `font-family` 哈希

#### 5. 配置变更

- 默认启用 `swcMinify`
- 默认启用 `missingSuspenseWithCSRBailout`
- 默认启用 `outputFileTracing`
- 移除多个已弃用选项

#### 6. 移除的功能

- 自动 Speed Insights instrumentation
- `.xml` 扩展名的动态 sitemap 路由
- `export const runtime = "experimental-edge"`（改为 `"edge"`）
- `revalidateTag` 和 `revalidatePath` 在渲染期间调用会报错
- `next/dynamic` 的 `suspense` prop

#### 7. 最低 Node.js 版本

- 从 18.17.0 升级到 18.18.0

### 3.2 React 19 破坏性变更

#### 1. 移除 PropTypes 和函数组件的 defaultProps

```jsx
// ❌ 已移除
import PropTypes from 'prop-types';

function Heading({text}) {
  return <h1>{text}</h1>;
}
Heading.propTypes = {
  text: PropTypes.string,
};
Heading.defaultProps = {
  text: 'Hello, world!',
};

// ✅ 使用 TypeScript 或 ES6 默认参数
interface Props {
  text?: string;
}
function Heading({text = 'Hello, world!'}: Props) {
  return <h1>{text}</h1>;
}
```

#### 2. 移除 Legacy Context

```jsx
// ❌ 已移除
class Parent extends React.Component {
  static childContextTypes = {
    foo: PropTypes.string.isRequired,
  }
  getChildContext() {
    return { foo: 'bar' }
  }
}

// ✅ 使用新 Context API
const FooContext = React.createContext()

class Parent extends React.Component {
  render() {
    return (
      <FooContext value="bar">
        <Child />
      </FooContext>
    )
  }
}
```

#### 3. 移除字符串 refs

```jsx
// ❌ 已移除
class MyComponent extends React.Component {
  componentDidMount() {
    this.refs.input.focus()
  }
  render() {
    return <input ref="input" />
  }
}

// ✅ 使用 ref 回调
class MyComponent extends React.Component {
  componentDidMount() {
    this.input.focus()
  }
  render() {
    return <input ref={input => (this.input = input)} />
  }
}
```

#### 4. 移除 ReactDOM.render 和 ReactDOM.hydrate

```jsx
// ❌ 已移除
import { render } from 'react-dom'
render(<App />, document.getElementById('root'))

// ✅ 使用 createRoot
import { createRoot } from 'react-dom/client'
const root = createRoot(document.getElementById('root'))
root.render(<App />)
```

#### 5. 移除 ReactDOM.findDOMNode

```jsx
// ❌ 已移除
import { findDOMNode } from 'react-dom'

// ✅ 使用 DOM refs
function AutoselectingInput() {
  const ref = useRef(null)
  useEffect(() => {
    ref.current.select()
  }, [])
  return <input ref={ref} defaultValue="Hello" />
}
```

#### 6. 移除 UMD 构建

- React 19 不再提供 UMD 构建
- 使用 ESM CDN 如 esm.sh

#### 7. 错误处理变更

- 渲染中的错误不再重新抛出
- 需要更新错误报告逻辑
- 使用新的 `onUncaughtError` 和 `onCaughtError` 回调

### 3.3 TypeScript 破坏性变更

#### 1. useRef 需要参数

```ts
// ❌ 错误
useRef()

// ✅ 正确
useRef(undefined)
```

#### 2. ref 清理函数需要显式返回

```tsx
// ❌ 隐式返回
<div ref={current => (instance = current)} />

// ✅ 显式返回
<div ref={current => {instance = current}} />
```

#### 3. ReactElement props 默认为 unknown

```ts
type Example = ReactElement['props']
// 之前: 'any'
// 现在: 'unknown'
```

#### 4. JSX 命名空间变更

```ts
// 需要包裹在 declare module 中
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'my-element': {
        myElementProps: string
      }
    }
  }
}
```

---

## 四、升级风险评估

### 4.1 技术风险

| 风险项              | 严重程度 | 可能性 | 缓解措施                 |
| ------------------- | -------- | ------ | ------------------------ |
| 异步 API 重构       | 高       | 高     | 使用 codemod 自动迁移    |
| 缓存行为变化        | 中-高    | 中     | 配置恢复测试，逐步调整   |
| React 19 API 移除   | 中       | 中     | 升级到 React 18.3 预警   |
| Turbopack CSS 顺序  | 低       | 低     | 监控生产，必要时回退     |
| TypeScript 类型错误 | 中       | 中     | 使用 types-react-codemod |
| 第三方库兼容性      | 中       | 低     | 检查依赖兼容性           |

### 4.2 业务风险

| 风险项       | 严重程度 | 可能性 | 缓解措施             |
| ------------ | -------- | ------ | -------------------- |
| 升级期间停机 | 中       | 低     | 分阶段升级，充分测试 |
| 性能回归     | 低       | 中     | 性能基准测试         |
| 功能中断     | 低       | 低     | 全面的集成测试       |
| 学习曲线     | 低       | 中     | 团队培训，文档更新   |

### 4.3 兼容性检查

**需要检查的依赖**:

- 所有 React 组件库
- UI 框架（如 Tailwind UI、shadcn/ui 等）
- 表单库（React Hook Form、Formik 等）
- 状态管理库（Redux、Zustand、Jotai 等）
- 测试库（@testing-library/react 等）

**建议**: 升级前在 `npm outdated` 检查依赖，并查阅各库的升级指南。

---

## 五、升级步骤和注意事项

### 5.1 升级前准备

#### 1. 备份和分支

```bash
git checkout -b upgrade/nextjs-15
git commit -am "备份升级前状态"
```

#### 2. 检查当前状态

```bash
# 检查 Node.js 版本（需要 18.18.0+）
node --version

# 检查过期依赖
npm outdated

# 运行现有测试
npm test
```

#### 3. 创建性能基准

```bash
# 记录构建时间
time npm run build

# 记录开发服务器启动时间
time npm run dev
```

### 5.2 分阶段升级路径

#### 阶段 1: React 18.3（1-2 天）

```bash
npm install react@^18.3.0 react-dom@^18.3.0
npm install --save-dev @types/react@^18.3.0 @types/react-dom@^18.3.0
```

**目的**: 检测废弃 API 使用和潜在问题

**检查项**:

- [ ] 所有测试通过
- [ ] 开发服务器正常启动
- [ ] 无废弃警告

#### 阶段 2: Next.js 15（3-5 天）

```bash
# 使用自动升级 CLI
npx @next/codemod@canary upgrade latest

# 或手动升级
npm install next@latest react@latest react-dom@latest
```

**关键步骤**:

1. **异步 API 迁移**

```bash
npx @next/codemod@canary next-async-request-api .
```

2. **处理缓存变更**

```ts
// next.config.ts - 临时恢复旧行为以测试
const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
  },
}
```

3. **更新配置**

- 转换 `next.config.js` 为 `next.config.ts`
- 移除废弃配置选项
- 添加必要的实验性功能

4. **测试关键功能**

- [ ] 数据获取（async/await）
- [ ] 表单提交
- [ ] 路由导航
- [ ] 图片优化
- [ ] Server Actions

#### 阶段 3: React 19（2-3 天）

```bash
npm install react@^19.0.0 react-dom@^19.0.0
npm install --save-dev @types/react@^19.0.0 @types/react-dom@^19.0.0
```

**运行 React 19 codemods**:

```bash
# 运行所有 React 19 codemods
npx codemod@latest react/19/migration-recipe

# 手动运行特定 codemods
npx codemod@latest react/19/replace-string-ref .
npx codemod@latest react/19/replace-act-import .
npx codemod@latest react/prop-types-typescript .
```

**运行 TypeScript codemods**:

```bash
npx types-react-codemod@latest preset-19 ./app
```

**手动迁移项**:

- [ ] PropTypes → TypeScript
- [ ] Legacy Context → 新 Context API
- [ ] ReactDOM.render → createRoot
- [ ] 字符串 refs → ref 回调

#### 阶段 4: Turbopack 可选启用（1-2 天）

**开发环境**:

```bash
# 启用 Turbopack 开发服务器
next dev --turbo
```

**生产构建**（Next.js 15.5+）:

```bash
# 启用 Turbopack 构建（Beta）
next build --turbopack
```

**注意**: 首先在开发环境测试，然后在小规模生产环境验证。

### 5.3 测试清单

#### 功能测试

- [ ] 所有页面正常渲染
- [ ] 客户端导航工作正常
- [ ] 表单提交成功
- [ ] API 调用正常
- [ ] 图片加载正确
- [ ] SEO 元数据正确
- [ ] 中间件功能正常

#### 性能测试

- [ ] 开发服务器启动时间
- [ ] 热重载响应时间
- [ ] 构建时间
- [ ] 首次内容绘制 (FCP)
- [ ] 最大内容绘制 (LCP)
- [ ] Time to Interactive (TTI)

#### 兼容性测试

- [ ] 多浏览器测试（Chrome、Firefox、Safari、Edge）
- [ ] 移动设备测试
- [ ] 第三方集成测试
- [ ] SSR/SSG/ISR 验证

### 5.4 监控和回滚

#### 监控指标

```javascript
// 添加性能监控
export function reportWebVitals(metric) {
  console.log(metric)
  // 发送到分析服务
}
```

**关键指标**:

- 错误率
- API 响应时间
- 页面加载时间
- 用户交互响应

#### 回滚计划

```bash
# 如果升级失败
git checkout -
npm install  # 恢复之前的依赖
npm run build  # 验证构建成功
```

**回滚触发条件**:

- 生产错误率 > 1%
- 关键功能中断
- 性能显著下降
- 用户体验严重受损

---

## 六、建议的实施时间线

### 短期（1-2 周）：准备和评估

- [ ] 审查当前代码库
- [ ] 检查依赖兼容性
- [ ] 建立性能基准
- [ ] 创建升级分支
- [ ] 团队培训

### 中期（3-4 周）：升级和测试

**第 1 周**:

- 升级到 React 18.3
- 修复废弃警告
- 运行测试

**第 2 周**:

- 升级到 Next.js 15
- 应用 codemods
- 修复异步 API 问题
- 配置缓存策略

**第 3 周**:

- 升级到 React 19
- 应用 React codemods
- 手动迁移遗留代码
- 全面的集成测试

**第 4 周**:

- 启用 Turbopack 开发
- 性能优化
- 生产环境预发布测试

### 长期（1-2 个月）：稳定和优化

- [ ] 生产环境灰度发布
- [ ] 监控和调整
- [ ] 性能优化
- [ ] 团队反馈收集
- [ ] 文档更新

### 里程碑

| 里程碑   | 目标日期 | 完成标准                 |
| -------- | -------- | ------------------------ |
| 完成评估 | T+1 周   | 评估报告完成，风险已知   |
| 完成升级 | T+4 周   | 所有测试通过，性能不退化 |
| 生产部署 | T+6 周   | 灰度发布稳定，监控正常   |

---

## 七、建议和最佳实践

### 7.1 升级建议

#### ✅ 建议升级的情况

- 项目规模中大型，需要更好的构建性能
- 团队有时间和资源进行升级
- 依赖库已经支持 Next.js 15/React 19
- 需要使用新特性（Actions、useOptimistic 等）
- 可以容忍 1-2 个月的升级周期

#### ⚠️ 谨慎升级的情况

- 项目接近关键发布截止日期
- 依赖库尚未兼容
- 团队资源有限
- 对性能要求不高的小型项目

#### ❌ 建议暂缓的情况

- 项目即将发布（< 3 个月）
- 严重依赖已废弃的 API
- 第三方库兼容性问题无法解决
- 团队对新技术不熟悉

### 7.2 最佳实践

#### 1. 渐进式升级

- 不要一次性升级所有内容
- 逐步验证每个阶段
- 保持可回滚

#### 2. 充分测试

- 自动化测试覆盖率 > 80%
- E2E 测试覆盖关键用户流程
- 性能基准测试
- 多浏览器测试

#### 3. 监控和观察

- 实时错误监控（Sentry、LogRocket）
- 性能监控（Lighthouse、Web Vitals）
- 用户反馈收集
- A/B 测试

#### 4. 文档和培训

- 更新开发文档
- 记录升级经验
- 团队培训会
- 编写升级指南

#### 5. 社区参与

- 关注 Next.js 和 React 官方博客
- 参与 GitHub 讨论
- 报告问题和反馈
- 分享升级经验

### 7.3 性能优化建议

#### 启用 Turbopack 的条件

- 项目模块数 > 10K
- 构建时间 > 5 分钟
- 使用多核 CPU 服务器
- 可以容忍 CSS 顺序的细微差异

#### 缓存策略

```ts
// 推荐的缓存配置
const nextConfig = {
  // 根据数据特性配置
  // 静态内容：使用静态生成
  // 动态内容：使用 revalidate
  // 实时数据：使用 force-dynamic
}
```

#### Server Actions 优化

- 使用死代码消除减少包大小
- 合理使用 optimistic updates
- 错误处理和重试机制

---

## 八、工具和资源

### 8.1 官方工具

#### 升级工具

```bash
# Next.js 自动升级
npx @next/codemod@canary upgrade latest

# React 19 codemods
npx codemod@latest react/19/migration-recipe

# TypeScript codemods
npx types-react-codemod@latest preset-19 ./app
```

#### 开发工具

```bash
# 类型生成
next typegen

# 类型检查
tsc --noEmit

# 构建分析
npm run build -- --analyze
```

### 8.2 推荐阅读

#### 官方文档

- [Next.js 15 升级指南](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- [React 19 升级指南](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [Next.js 15 发布博客](https://nextjs.org/blog/next-15)
- [React 19 发布博客](https://react.dev/blog/2024/12/05/react-19)
- [Turbopack 文档](https://nextjs.org/docs/app/api-reference/turbopack)

#### 社区资源

- [Next.js GitHub Discussions](https://github.com/vercel/next.js/discussions)
- [React GitHub Discussions](https://github.com/facebook/react/discussions)
- [Vercel 社区论坛](https://github.com/vercel/vercel/discussions)
- [Codemod 文档](https://github.com/reactjs/react-codemod)

### 8.3 故障排除

#### 常见问题

**Q: 异步 API 导致的类型错误**

```ts
// 解决方案：显式定义返回类型
export async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // ...
}
```

**Q: Turbopack 构建失败**

```bash
# 回退到 Webpack
next build

# 或使用特定 Turbopack 配置
# next.config.ts
const nextConfig = {
  experimental: {
    turbopack: {
      // Turbopack 特定配置
    },
  },
};
```

**Q: React 19 第三方库不兼容**

```bash
# 检查库的兼容性
npm check-updates

# 寻找替代库或等待更新
```

---

## 九、结论和建议

### 最终建议

**建议**: ✅ **建议升级到 Next.js 15**

**理由**:

1. **性能收益显著**: Turbopack 提供的开发和生产性能提升是真实的
2. **长期技术债务**: React 19 移除的 API 需要升级，早升晚升都要升
3. **开发体验**: 新的特性和工具大幅提升开发效率
4. **社区支持**: 越晚升级，社区支持越少

**升级优先级**: 🟡 **中等优先级**

- 不是紧急升级（Next.js 14 仍支持）
- 但建议在 Q2 2026 完成
- 给予充分的测试和调整时间

### 关键成功因素

1. **充分的测试**: 自动化测试覆盖率 > 80%
2. \*\*渐进式
