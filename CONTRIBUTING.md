# 贡献指南

> 感谢你对 7zi Studio 项目的兴趣！我们欢迎任何形式的贡献。

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境](#开发环境)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [项目结构](#项目结构)
- [v1.5.0 开发流程](#v150-开发流程)
- [常见问题](#常见问题)

## 🎯 行为准则

我们致力于为社区营造一个友好、包容的环境。请遵循以下原则：

1. **尊重他人** - 保持友好和专业的态度
2. **包容差异** - 欢迎不同背景和技能水平的贡献者
3. **建设性反馈** - 提出建议时保持积极和具体
4. **专注于项目** - 讨论应围绕项目本身展开

## 🚀 如何贡献

### 报告 Bug

1. 搜索现有 [Issues](https://github.com/songzuo/7zi/issues) 确保没有重复
2. 创建新 Issue，使用 bug 模板
3. 包含以下信息：
   - 清晰的标题和描述
   - 复现步骤
   - 预期行为 vs 实际行为
   - 环境信息 (OS, Node 版本等)
   - 相关截图或日志

### 提出新功能

1. 创建 [Feature Request](https://github.com/songzuo/7zi/issues/new?template=feature_request.md)
2. 描述功能的用途和价值
3. 提供可能的实现方案
4. 考虑与其他功能的兼容性

### 贡献代码

1. Fork 项目仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 编写代码并添加测试
4. 提交更改 (`git commit -m 'Add amazing feature'`)
5. 推送分支 (`git push origin feature/amazing-feature`)
6. 创建 Pull Request

## 🧪 测试指南

### 测试统计

| 指标                    | 数值                             |
| ----------------------- | -------------------------------- |
| **测试文件数**          | 490+                             |
| **测试覆盖率**          | 96% (v1.5.0 Agent Learning 系统) |
| **单元测试**            | 100+ 文件                        |
| **集成测试**            | 50+ 文件                         |
| **E2E 测试**            | 30+ 场景                         |
| **性能监控测试**        | ✅ 新增 (v1.1.0)                 |
| **Agent Learning 测试** | ✅ 新增 (v1.5.0, 96% 覆盖率)     |

### 运行测试

```bash
# 运行所有测试 (监视模式)
pnpm test
npm test

# 单次运行测试
pnpm test:run
npm run test:run

# 生成覆盖率报告
pnpm test:coverage
npm run test:coverage

# 运行特定测试文件
pnpm test src/components/Button.test.tsx

# 运行 E2E 测试
pnpm test:e2e
npm run test:e2e

# 运行测试并生成详细报告
pnpm test -- --reporter=verbose

# 运行性能监控测试 (v1.1.0 新增)
pnpm test:perf
npm run test:perf
```

### 测试文件命名规范

| 文件类型 | 命名规则                | 示例                      |
| -------- | ----------------------- | ------------------------- |
| 单元测试 | `*.test.ts`             | `utils.test.ts`           |
| 组件测试 | `*.test.tsx`            | `Button.test.tsx`         |
| 集成测试 | `*.integration.test.ts` | `api.integration.test.ts` |
| E2E 测试 | `*.e2e.test.ts`         | `login.e2e.test.ts`       |

**测试文件位置**: 与源文件同目录或 `__tests__/` 目录

```
components/
├── Button.tsx
├── Button.test.tsx      # 同目录测试
└── __tests__/
    └── Button.styles.test.tsx  # 或集中测试
```

### 编写组件测试

使用 **React Testing Library** 编写组件测试：

```tsx
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)

    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('shows loading state', () => {
    render(<Button loading>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

**测试原则**:

1. **测试用户行为**，而非实现细节
2. **使用语义化查询**: `getByRole`, `getByText`, `getByLabelText`
3. **Mock 外部依赖**: API 调用、路由、第三方库
4. **保持测试独立**: 每个测试应可单独运行
5. **覆盖边界情况**: 空值、错误状态、极端输入

### 测试覆盖率要求

- **新功能**: 测试覆盖率不低于 80%
- **核心组件**: 测试覆盖率不低于 90%
- **API 路由**: 必须有集成测试覆盖
- **关键业务逻辑**: 必须有单元测试覆盖

详细测试指南请参考 [测试文档](./docs/TESTING.md)

## ⚡ 性能优化指南 (v1.1.0)

### 代码分割与懒加载

v1.1.0 引入了完整的代码分割优化策略，所有贡献者必须遵循以下规范：

#### 动态导入大型依赖

```typescript
// ✅ 正确：动态导入大型库
import dynamic from 'next/dynamic';

const XLSX = dynamic(() => import('xlsx'), {
  loading: () => <LoadingSpinner />,
  ssr: false // 对于不兼容 SSR 的库
});

// ❌ 错误：静态导入大型库
import XLSX from 'xlsx'; // 会增加主 bundle 大小
```

#### React.lazy 组件

```tsx
import { lazy, Suspense } from 'react'

// ✅ 使用 React.lazy 延迟加载组件
const HeavyChart = lazy(() => import('./HeavyChart'))
const SettingsPanel = lazy(() => import('./SettingsPanel'))

function Dashboard() {
  return (
    <div>
      <Suspense fallback={<LoadingSpinner />}>
        <HeavyChart />
      </Suspense>

      <Suspense fallback={<LoadingSpinner />}>
        <SettingsPanel />
      </Suspense>
    </div>
  )
}
```

#### splitChunks 配置优化

```javascript
// next.config.js
module.exports = {
  webpack: config => {
    config.optimization.splitChunks = {
      chunks: 'all',
      minSize: 20000,
      maxSize: 244000,
      cacheGroups: {
        default: false,
        vendors: false,
        // 框架单独打包
        framework: {
          name: 'framework',
          chunks: 'all',
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
          priority: 40,
          enforce: true,
        },
        // UI 库单独打包
        lib: {
          test(module) {
            return module.size() > 160000 && /node_modules/.test(module.identifier())
          },
          name(module) {
            const hash = crypto.createHash('sha1')
            hash.update(module.identifier())
            return `lib-${hash.digest('hex').slice(0, 8)}`
          },
          priority: 30,
          minChunks: 1,
          reuseExistingChunk: true,
        },
      },
    }
    return config
  },
}
```

### L1/L2 缓存使用

```typescript
// ✅ 使用 L1 内存缓存（快速）
import { l1Cache } from '@/lib/cache/l1-cache'

const data = await l1Cache.get('key', async () => {
  return fetchFromAPI()
})

// ✅ 使用 L2 Redis 缓存（分布式）
import { l2Cache } from '@/lib/cache/l2-cache'

const data = await l2Cache.get(
  'key',
  async () => {
    return expensiveComputation()
  },
  { ttl: 3600 }
) // 1小时过期
```

### 性能监控集成

```typescript
// ✅ 集成性能监控
import { performanceMonitor } from '@/lib/performance/monitor'

export async function fetchData() {
  const startTime = performance.now()

  try {
    const data = await fetchAPI()

    // 记录成功指标
    performanceMonitor.recordMetric({
      operation: 'fetchData',
      duration: performance.now() - startTime,
      status: 'success',
      timestamp: Date.now(),
    })

    return data
  } catch (error) {
    // 记录失败指标
    performanceMonitor.recordMetric({
      operation: 'fetchData',
      duration: performance.now() - startTime,
      status: 'error',
      error: error.message,
      timestamp: Date.now(),
    })

    throw error
  }
}
```

### 浏览器兼容性配置

确保在 `package.json` 中正确配置 `browserslist`：

```json
{
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
  }
}
```

这会显著减少不必要的 polyfills，减少 bundle 大小。

详细性能优化指南请参考 [性能优化文档](./docs/PERFORMANCE_OPTIMIZATION.md)

## 💻 开发环境

### 前置要求

- Node.js 22+
- pnpm 8+ (推荐) 或 npm 10+
- Git

### 本地开发

```bash
# 1. Fork 并克隆仓库
git clone https://github.com/YOUR_USERNAME/7zi.git
cd 7zi

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local

# 4. 启动开发服务器
pnpm dev
```

### 运行测试

```bash
# 运行所有测试 (监视模式)
pnpm test

# 单次运行测试
pnpm test:run

# 生成覆盖率报告
pnpm test:coverage

# 运行 lint
pnpm lint

# 修复 lint 问题
pnpm lint:fix
```

### 测试文件命名规范

| 文件类型 | 命名规则                | 示例                      |
| -------- | ----------------------- | ------------------------- |
| 单元测试 | `*.test.ts`             | `utils.test.ts`           |
| 组件测试 | `*.test.tsx`            | `Button.test.tsx`         |
| 集成测试 | `*.integration.test.ts` | `api.integration.test.ts` |
| E2E 测试 | `*.e2e.test.ts`         | `login.e2e.test.ts`       |

**测试文件位置**: 与源文件同目录或 `__tests__/` 目录

```
components/
├── Button.tsx
├── Button.test.tsx      # 同目录测试
└── __tests__/
    └── Button.styles.test.tsx  # 或集中测试
```

### 编写组件测试

使用 **React Testing Library** 编写组件测试：

```tsx
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)

    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('shows loading state', () => {
    render(<Button loading>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

**测试原则**:

1. **测试用户行为**，而非实现细节
2. **使用语义化查询**: `getByRole`, `getByText`, `getByLabelText`
3. **Mock 外部依赖**: API 调用、路由、第三方库
4. **保持测试独立**: 每个测试应可单独运行
5. **覆盖边界情况**: 空值、错误状态、极端输入

### 测试覆盖率要求

- **新功能**: 测试覆盖率不低于 80%
- **核心组件**: 测试覆盖率不低于 90%
- **API 路由**: 必须有集成测试覆盖
- **关键业务逻辑**: 必须有单元测试覆盖

详细测试指南请参考 [测试文档](./docs/TESTING.md)

## 📝 代码规范

### TypeScript 代码规范

#### 类型定义

✅ **推荐做法**:

```typescript
// 使用接口定义对象结构
interface User {
  id: string
  name: string
  email: string
}

// 使用类型别名定义联合类型
type Status = 'active' | 'inactive' | 'pending'

// 泛型使用
interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}
```

❌ **避免做法**:

```typescript
// ❌ 避免 any 类型
const data: any = fetchData()

// ✅ 使用 unknown 替代 any
const data: unknown = fetchData()
if (isValidData(data)) {
  processData(data as UserData)
}
```

#### 函数命名和结构

```typescript
// ✅ 命名规范：动词开头，清晰表达意图
async function fetchUserById(userId: string): Promise<User> {
  // ...
}

function validateEmail(email: string): boolean {
  // ...
}

function createUser(userData: CreateUserDto): Promise<User> {
  // ...
}

// ✅ 回调函数命名：handle + 动作
function handleClick(event: React.MouseEvent) {
  // ...
}

function handleFormSubmit(data: FormData) {
  // ...
}
```

#### React 组件规范

```tsx
// ✅ 组件命名：PascalCase
interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
}

export function Button({ children, onClick, variant = 'primary', disabled }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled} className={`btn btn-${variant}`}>
      {children}
    </button>
  )
}

// ✅ 使用 TypeScript 定义 props
interface UserCardProps {
  user: User
  onEdit?: (user: User) => void
  onDelete?: (userId: string) => void
}
```

### 命名约定

| 类型      | 命名规范         | 示例                               |
| --------- | ---------------- | ---------------------------------- |
| 组件      | PascalCase       | `UserCard`, `Dashboard`            |
| 函数      | camelCase        | `fetchUser`, `handleSubmit`        |
| 变量      | camelCase        | `userName`, `isActive`             |
| 常量      | UPPER_SNAKE_CASE | `API_URL`, `MAX_RETRIES`           |
| 类        | PascalCase       | `UserService`, `ApiClient`         |
| 接口/类型 | PascalCase       | `User`, `ApiResponse<T>`           |
| 文件      | kebab-case       | `user-service.ts`, `user-card.tsx` |

### ESLint & Prettier 配置说明

#### ESLint 配置

项目使用 **ESLint 9** + **Flat Config** 格式进行代码质量检查。

**配置文件**:

- `eslint.config.mjs` - 主配置文件（Flat Config 格式）
- `.eslintignore` - 忽略规则

**ESLint 规则集**:

- `eslint-config-next/core-web-vitals` - Next.js 核心规则（Web Vitals 优化）
- `eslint-config-next/typescript` - TypeScript 特定规则
- `eslint-plugin-storybook` - Storybook 组件规则

**忽略文件/目录**:

- 构建输出：`.next/**`, `out/**`, `build/**`, `dist/**`
- 依赖：`node_modules/**`
- 测试文件：`**/*.test.ts`, `**/*.test.tsx`, `**/__tests__/**`, `__mocks__/**`
- 配置文件：`*.config.js`, `*.config.ts`, `*.config.mjs`
- 备份目录：`_app_backup/**`, `archive/**`, `**/backup/**`
- 公共资源：`public/**`

**运行 ESLint**:

```bash
# 检查代码
pnpm lint
# 或
npm run lint

# 自动修复问题
pnpm lint:fix
# 或
npm run lint:fix
```

#### Prettier 配置

项目使用 **Prettier** 进行代码格式化，遵循 Next.js 官方风格。

**Prettier 规则**:

- 使用 Next.js 内置的 Prettier 配置
- 2 空格缩进
- 单引号字符串
- 行尾分号（根据项目配置）
- 最大行长 80 字符

**运行 Prettier**:

```bash
# 格式化代码
pnpm format
# 或
npm run format

# 检查格式（不修改文件）
pnpm format:check
# 或
npm run format:check
```

**格式化范围**:

- TypeScript/JavaScript：`**/*.{ts,tsx,js,jsx}`
- 配置文件：`**/*.json`
- 样式文件：`**/*.css`

#### 开发工作流

推荐的开发工作流：

```bash
# 1. 开发完成后，运行类型检查
pnpm type-check

# 2. 运行 ESLint 检查
pnpm lint

# 3. 如果有 ESLint 错误，尝试自动修复
pnpm lint:fix

# 4. 运行 Prettier 格式化
pnpm format

# 5. 运行测试
pnpm test:run

# 6. 提交代码
git add .
git commit -m "feat: your feature description"
```

### Git 提交规范

在 7zi 项目中，我们使用统一的错误处理系统。所有开发者必须遵循以下规范：

### API 路由错误处理

✅ **必须使用 `withErrorHandling` 包装器**:

```typescript
import { withErrorHandling, createSuccessResponse } from '@/lib/api/error-handler'

export const GET = withErrorHandling(async (request: Request) => {
  const data = await fetchData()
  return createSuccessResponse(data)
})
```

✅ **使用标准化的错误响应函数**:

```typescript
import {
  createValidationError,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError,
} from '@/lib/api/error-handler'

// 验证错误 (400)
if (!email) {
  return createValidationError('Email is required')
}

// 未找到错误 (404)
if (!user) {
  return createNotFoundError('User not found')
}

// 未授权错误 (401)
if (!isAuthenticated) {
  return createUnauthorizedError('Please log in')
}

// 禁止访问错误 (403)
if (!hasPermission) {
  return createForbiddenError('Access denied')
}
```

❌ **禁止直接返回 NextResponse.json 错误**:

```typescript
// ❌ 错误示例
return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
return NextResponse.json({ error: error.message }, { status: 500 })
```

### 组件错误边界

✅ **为异步组件添加错误边界**:

```tsx
import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper'

function MyComponent() {
  return (
    <ErrorBoundaryWrapper title="组件加载失败" showReset variant="compact">
      <AsyncComponent />
    </ErrorBoundaryWrapper>
  )
}
```

✅ **为 React.lazy 组件使用错误边界**:

```tsx
import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper'
import { Suspense } from 'react'

const LazyComponent = lazy(() => import('./LazyComponent'))

function App() {
  return (
    <ErrorBoundaryWrapper title="加载失败">
      <Suspense fallback={<LoadingSpinner />}>
        <LazyComponent />
      </Suspense>
    </ErrorBoundaryWrapper>
  )
}
```

### 错误日志记录

✅ **使用 logger 而不是 console.error**:

```typescript
import { logger } from '@/lib/logger'

// 正确方式
logger.error('Failed to process request', error, {
  category: 'api',
  endpoint: '/api/users',
  sensitive: false,
})
```

❌ **禁止使用 console.error**:

```typescript
// ❌ 错误示例 - 会在生产环境暴露敏感信息
console.error('Failed to encrypt backup:', error)
```

### 安全注意事项

⚠️ **绝对禁止在错误消息中暴露**:

- 加密密钥
- 密码
- 会话令牌
- 文件路径
- 数据库查询
- 内部 API 端点

✅ **生产环境错误响应**:

```typescript
// 用户友好的消息
return createUnauthorizedError('Please log in to continue')
```

❌ **技术细节暴露**:

```typescript
// ❌ 不要暴露技术细节
return createUnauthorizedError('JWT token missing in Authorization header')
```

### 完整示例

```typescript
import { NextRequest } from 'next/server'
import {
  withErrorHandling,
  createSuccessResponse,
  createValidationError,
} from '@/lib/api/error-handler'
import { logger } from '@/lib/logger'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { email, password } = await request.json()

  // 验证输入
  if (!email || !password) {
    return createValidationError('Email and password are required')
  }

  if (!isValidEmail(email)) {
    return createValidationError('Invalid email format')
  }

  // 业务逻辑
  const user = await authenticateUser(email, password)

  // 记录成功日志（非敏感信息）
  logger.info('User authenticated successfully', { userId: user.id })

  return createSuccessResponse({ token: user.token })
})
```

### 相关文档

- 📖 [错误处理完整指南](./docs/ERROR_HANDLING_GUIDE.md)
- 📋 [错误处理审计报告](./ERROR_HANDLING_AUDIT.md)
- 🛠️ [API 错误处理器实现](./src/lib/api/error-handler.ts)

## 📝 Git 提交规范

### 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型 (type)**:

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式 (不影响功能)
- `refactor`: 重构 (既不是新功能也不是修复)
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关
- `ci`: CI/CD 配置相关
- `revert`: 回滚提交

**作用域 (scope)**:

- `dashboard`: 仪表板相关
- `api`: API 路由
- `components`: 组件
- `hooks`: React Hooks
- `lib`: 工具库
- `docs`: 文档
- `deploy`: 部署相关

### 提交示例

```bash
# 功能
git commit -m "feat(dashboard): add member status filter"

# 修复
git commit -m "fix(api): resolve rate limit issue"

# 文档
git commit -m "docs(readme): update installation steps"

# 性能优化
git commit -m "perf(components): optimize button rendering with memo"

# 测试
git commit -m "test(api): add integration tests for auth endpoints"

# 重构
git commit -m "refactor(auth): simplify token validation logic"
```

### 提交前检查清单

- [ ] 代码通过 ESLint 检查
- [ ] 代码通过 Prettier 格式化检查
- [ ] 所有测试通过 (`npm run test:run`)
- [ ] 提交信息符合规范
- [ ] 新功能有对应测试用例
- [ ] 文档已更新（如有必要）
- [ ] 没有敏感信息泄露

### ESLint 配置说明

项目使用 **ESLint 9** + **Flat Config** 格式进行代码质量检查。

#### 配置文件

- `eslint.config.mjs` - 主配置文件（Flat Config 格式）
- `.eslintignore` - 忽略规则

#### ESLint 规则集

- `eslint-config-next/core-web-vitals` - Next.js 核心规则（Web Vitals 优化）
- `eslint-config-next/typescript` - TypeScript 特定规则
- `eslint-plugin-storybook` - Storybook 组件规则

#### 忽略文件/目录

以下文件和目录会被 ESLint 自动忽略：

- 构建输出：`.next/**`, `out/**`, `build/**`, `dist/**`
- 依赖：`node_modules/**`
- 测试文件：`**/*.test.ts`, `**/*.test.tsx`, `**/__tests__/**`, `__mocks__/**`
- 配置文件：`*.config.js`, `*.config.ts`, `*.config.mjs`
- 备份目录：`_app_backup/**`, `archive/**`, `**/backup/**`
- 公共资源：`public/**`

#### 运行 ESLint

```bash
# 检查代码
pnpm lint
# 或
npm run lint

# 自动修复问题
pnpm lint:fix
# 或
npm run lint:fix
```

### Prettier 配置说明

项目使用 **Prettier** 进行代码格式化。

#### Prettier 规则

项目使用 Next.js 内置的 Prettier 配置，与 Next.js 官方风格保持一致。

#### 运行 Prettier

```bash
# 格式化代码
pnpm format
# 或
npm run format

# 检查格式（不修改文件）
pnpm format:check
# 或
npm run format:check
```

#### 格式化范围

Prettier 会格式化以下类型的文件：

- TypeScript/JavaScript：`**/*.{ts,tsx,js,jsx}`
- 配置文件：`**/*.json`
- 样式文件：`**/*.css`

### 开发工作流

推荐的开发工作流：

```bash
# 1. 开发完成后，运行类型检查
pnpm type-check

# 2. 运行 ESLint 检查
pnpm lint

# 3. 如果有 ESLint 错误，尝试自动修复
pnpm lint:fix

# 4. 运行 Prettier 格式化
pnpm format

# 5. 运行测试
pnpm test:run

# 6. 提交代码
git add .
git commit -m "feat: your feature description"
```

### 分支命名规范

```
feature/<feature-name>      # 新功能
bugfix/<bug-description>     # Bug 修复
hotfix/<hotfix-description>  # 紧急修复
refactor/<description>       # 重构
docs/<description>           # 文档更新
release/<version>            # 发布版本
```

示例：

```bash
git checkout -b feature/rate-limiting-system
git checkout -b bugfix/login-auth-error
git checkout -b hotfix/security-patch
```

## 🔄 Pull Request 流程

### 创建 PR

1. 确保本地分支是最新的
2. 创建 PR 到 `main` 分支
3. 填写 PR 模板
4. 链接相关 Issue

### PR 模板

```markdown
## 描述

<!-- 简要描述这个 PR 做了什么 -->

## 修复的问题

<!-- 链接相关 Issue: Closes #123 -->

## 变更内容

<!-- 列出主要变更 -->

## 测试

<!-- 描述如何测试这些变更 -->

## 截图 (如有)

<!-- 添加相关截图 -->
```

### 审查流程

1. 自动化检查 (CI) 运行
2. 至少一名维护者审查
3. 解决所有评论
4. 合并到 main 分支

## 📂 项目结构

```
7zi/
├── app/                    # Next.js 主应用
│   ├── dashboard/         # 看板页面
│   ├── components/        # React 组件
│   ├── hooks/            # 自定义 Hooks
│   ├── lib/              # 工具函数
│   └── server/           # 服务端代码
├── docs/                  # 项目文档
├── skills/                # OpenClaw 技能
├── deploy-scripts/        # 部署脚本
├── openclaw-kb/          # OpenClaw 知识库
└── ...
```

### 主要目录说明

| 目录              | 说明                 |
| ----------------- | -------------------- |
| `app/`            | Next.js 应用核心代码 |
| `app/components/` | UI 组件              |
| `app/hooks/`      | React Hooks          |
| `docs/`           | 项目文档             |
| `skills/`         | OpenClaw 技能定义    |

## 🚀 v1.5.0 开发流程

### 新开发工作流

v1.5.0 引入了更规范的开发流程，确保代码质量和团队协作效率。

#### 1. 开发流程概览

```
Fork → 创建分支 → 开发 → 本地测试 → 提交 → PR → Code Review → 合并
```

#### 2. 分支管理策略

```bash
# 主分支
main              # 生产环境代码（只接受 PR）

# 开发分支
develop           # 开发集成分支
feature/*         # 新功能分支
bugfix/*          # Bug 修复分支
hotfix/*          # 紧急修复分支
refactor/*        # 重构分支
```

**分支命名规范**:

```
feature/<feature-name>      # 示例: feature/agent-dashboard-ui
bugfix/<issue-id>-desc      # 示例: bugfix/123-login-error
hotfix/<hotfix-desc>       # 示例: hotfix/security-patch
refactor/<module-name>     # 示例: refactor/permission-system
```

#### 3. 开发工作流步骤

##### 步骤 1: 创建功能分支

```bash
# 确保主分支最新
git checkout main
git pull origin main

# 创建功能分支
git checkout -b feature/agent-dashboard-ui
```

##### 步骤 2: 开发与本地测试

```bash
# 1. 类型检查
pnpm type-check

# 2. ESLint 检查
pnpm lint

# 3. 自动修复 ESLint 问题
pnpm lint:fix

# 4. Prettier 格式化
pnpm format

# 5. 运行测试
pnpm test:run

# 6. 生成覆盖率报告（可选）
pnpm test:coverage
```

##### 步骤 3: 提交代码

```bash
# 暂存文件
git add .

# 提交（使用规范的提交信息）
git commit -m "feat(dashboard): add agent status panel component"

# 推送到远程
git push origin feature/agent-dashboard-ui
```

**提交信息规范**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型 (type)**:

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式 (不影响功能)
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

**提交示例**:

```bash
# 新功能
git commit -m "feat(dashboard): add agent status panel component

- Implement real-time status display for all 11 agents
- Add load indicators and progress bars
- Integrate with WebSocket for live updates"

# Bug 修复
git commit -m "fix(api): resolve rate limit issue in auth endpoint

- Fix rate limiter not being applied correctly
- Add proper error handling for exceeded limits"

# 重构
git commit -m "refactor(permissions): migrate PermissionContext to Zustand

- Replace Context API with Zustand state management
- Improve performance by reducing unnecessary re-renders
- Update all component usages"
```

##### 步骤 4: 创建 Pull Request

1. 在 GitHub 上创建 PR
2. 填写 PR 模板
3. 链接相关 Issue（如适用）
4. 等待 CI 检查通过
5. 等待 Code Review

**PR 模板**:

```markdown
## 📝 描述

<!-- 简要描述这个 PR 做了什么 -->

## 🎯 目标

<!-- 这个 PR 解决了什么问题或实现了什么功能 -->

## 🔧 变更内容

<!-- 列出主要变更 -->

### 新增

-

### 修改

-

### 删除

-

## ✅ 测试

<!-- 描述如何测试这些变更 -->

### 测试步骤

1.
2.
3.

### 测试结果

- [ ] 所有测试通过
- [ ] 手动测试通过
- [ ] 覆盖率达标

## 📸 截图 (如有)

<!-- 添加相关截图 -->

## 🔗 相关 Issue

<!-- 链接相关 Issue: Closes #123 -->

## ⚠️ 注意事项

<!-- 有什么需要特别注意的 -->

## 📋 检查清单

- [ ] 代码通过 ESLint 检查
- [ ] 代码通过 Prettier 格式化
- [ ] 所有测试通过
- [ ] 新功能有对应测试用例
- [ ] 文档已更新（如有必要）
- [ ] 没有敏感信息泄露
```

##### 步骤 5: Code Review

1. 维护者进行代码审查
2. 解决所有评论
3. 更新代码并重新测试
4. 合并到 main 分支

#### 4. 本地测试命令详解

```bash
# 类型检查（推荐每次提交前运行）
pnpm type-check
# 检查所有 TypeScript 类型错误

# ESLint 检查
pnpm lint
# 检查代码质量问题

# ESLint 自动修复
pnpm lint:fix
# 自动修复可修复的 ESLint 问题

# Prettier 格式化
pnpm format
# 格式化所有代码

# Prettier 检查（不修改文件）
pnpm format:check
# 检查代码格式是否符合规范

# 运行所有测试（监视模式）
pnpm test
# 交互式测试运行，适合开发时使用

# 单次运行所有测试
pnpm test:run
# CI/CD 命令，非交互式

# 运行特定测试文件
pnpm test src/components/Button.test.tsx

# 生成覆盖率报告
pnpm test:coverage
# 生成 HTML 格式的覆盖率报告，位于 coverage/ 目录

# 运行 E2E 测试
pnpm test:e2e
# 运行端到端测试

# 运行性能监控测试
pnpm test:perf
# v1.1.0 新增，运行性能相关测试
```

#### 5. 开发最佳实践

##### 代码质量要求

1. **类型安全**: 所有代码必须有完整的 TypeScript 类型定义
2. **测试覆盖率**: 新功能测试覆盖率不低于 80%，核心组件不低于 90%
3. **代码格式**: 代码必须通过 Prettier 格式化
4. **代码规范**: 代码必须通过 ESLint 检查（0 错误，0 警告）

##### 提交前检查清单

```bash
# 自动化检查脚本（推荐）
pnpm type-check && pnpm lint && pnpm format:check && pnpm test:run
```

**手动检查清单**:

- [ ] 类型检查通过 (`pnpm type-check`)
- [ ] ESLint 检查通过 (`pnpm lint`)
- [ ] Prettier 格式检查通过 (`pnpm format:check`)
- [ ] 所有测试通过 (`pnpm test:run`)
- [ ] 提交信息符合规范
- [ ] 新功能有测试用例
- [ ] 文档已更新（如需要）
- [ ] 没有敏感信息

#### 6. CI/CD 自动化

项目使用 GitHub Actions 进行自动化检查：

**CI 检查包括**:

- TypeScript 类型检查
- ESLint 代码检查
- Prettier 格式检查
- 单元测试运行
- 测试覆盖率检查
- 构建验证

**注意**: 只有当所有 CI 检查通过后，PR 才能合并。

#### 7. Code Review 原则

**审查者**:

- 关注代码质量和架构设计
- 检查是否有安全漏洞
- 验证测试覆盖是否充分
- 提供建设性反馈

**贡献者**:

- 及时响应 Review 评论
- 解释设计决策（如有必要）
- 虚心接受建议
- 保持开放和尊重的态度

#### 8. 合并策略

- **Squash Merge**: 将多个提交合并为一个（推荐）
- **Merge Commit**: 保留完整的提交历史
- **Rebase**: 保持提交历史线性（需要谨慎使用）

**注意**: 无论使用哪种合并方式，都应确保 `main` 分支保持稳定。

## ❓ 常见问题

### 如何开始？

1. 查看 [README.md](../README.md) 了解项目
2. 查看 [开发文档](docs/DEVELOPMENT.md) 配置环境
3. 寻找标有 `good first issue` 的 Issue 开始

### 我可以贡献哪些内容？

- 🐛 Bug 修复
- ✨ 新功能
- 📝 文档改进
- 🎨 UI/UX 改进
- ⚡ 性能优化
- 🧪 添加测试

### 如何获得帮助？

- 📬 邮件: support@7zi.com
- 💬 GitHub Discussions
- 🐛 提交 Issue

### 贡献者许可协议

通过贡献代码，你同意将你的作品按 [MIT License](../LICENSE) 许可。

## 🏆 贡献者

感谢所有为项目做出贡献的人！

<!-- 贡献者列表将通过 GitHub API 自动生成 -->

---

**提示**: 如果你有任何问题，欢迎在 [GitHub Discussions](https://github.com/songzuo/7zi/discussions) 中提问。

_感谢你的贡献！🎉_
