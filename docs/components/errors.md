# ⚠️ 错误处理组件文档

## 概述

错误处理组件库提供统一的错误分析和展示功能，支持多种错误类型识别、中英文错误消息、错误页面展示等。

## 组件列表

| 组件 | 文件 | 说明 |
|------|------|------|
| error-utils | `error-utils.ts` | 错误分析工具函数 |
| ForbiddenPage | `ForbiddenPage.tsx` | 403 禁止访问页面 |
| UnauthorizedPage | `UnauthorizedPage.tsx` | 401 未授权页面 |
| ErrorDisplay | `ErrorDisplay.tsx` | 错误展示组件 |

---

## 1. error-utils 错误分析工具

### 用途说明

提供通用的错误分析和转换函数，用于统一处理不同来源的错误。

### 功能特性

- ✅ 自动识别错误类型（网络、认证、权限、服务器等）
- ✅ 生成用户友好的错误标题和消息
- ✅ 支持中英文国际化
- ✅ 支持自定义默认值

### 导出函数

```typescript
// 分析错误类型
function analyzeErrorType(error: Error): ErrorType

// 获取错误标题
function getErrorTitle(errorType: ErrorType, defaultTitle: string): string

// 获取错误消息
function getErrorMessage(errorType: ErrorType, defaultMessage: string): string
```

### ErrorType 类型

```typescript
type ErrorType = 
  | 'network'      // 网络错误
  | 'not-found'     // 页面不存在
  | 'unauthorized'  // 未授权
  | 'forbidden'     // 禁止访问
  | 'server'       // 服务器错误
  | 'generic'      // 通用错误
```

### 使用示例

```typescript
import { 
  analyzeErrorType, 
  getErrorTitle, 
  getErrorMessage 
} from '@/components/errors/error-utils'

function handleError(error: Error) {
  // 分析错误类型
  const errorType = analyzeErrorType(error)
  
  // 获取用户友好的错误标题
  const title = getErrorTitle(errorType, '发生错误')
  
  // 获取用户友好的错误消息
  const message = getErrorMessage(errorType, '请稍后重试')
  
  return { errorType, title, message }
}

// 使用
const { errorType, title, message } = handleError(new Error('Network error'))
console.log(errorType) // 'network'
console.log(title)     // '网络连接失败'
console.log(message)  // '请检查您的网络连接，然后重试'
```

### 错误消息映射

| ErrorType | 中文标题 | 中文消息 |
|-----------|----------|----------|
| network | 网络连接失败 | 请检查您的网络连接，然后重试 |
| not-found | 页面不存在 | 您访问的页面不存在或已被移除 |
| unauthorized | 需要登录 | 请登录后继续访问此页面 |
| forbidden | 没有权限 | 您没有权限访问此页面 |
| server | 服务器错误 | 服务器暂时无法处理请求，请稍后重试 |
| generic | (默认标题) | (默认消息) |

---

## 2. ForbiddenPage 403 禁止访问页面

### 用途说明

显示 403 禁止访问错误页面，提供清晰的权限不足提示和返回首页选项。

### 使用示例

```tsx
import { ForbiddenPage } from '@/components/errors'

function ErrorPages() {
  return (
    <Routes>
      <Route path="/forbidden" element={
        <ForbiddenPage 
          message="您没有权限访问此页面"
          onGoHome={() => navigate('/')}
        />
      } />
    </Routes>
  )
}
```

### Props 接口

```typescript
interface ForbiddenPageProps {
  /** 自定义错误消息 */
  message?: string
  /** 返回首页回调 */
  onGoHome?: () => void
  /** 自定义类名 */
  className?: string
}
```

---

## 3. UnauthorizedPage 401 未授权页面

### 用途说明

显示 401 未授权错误页面，提供登录提示和跳转选项。

### 使用示例

```tsx
import { UnauthorizedPage } from '@/components/errors'

function ErrorPages() {
  return (
    <Routes>
      <Route path="/unauthorized" element={
        <UnauthorizedPage 
          message="请登录后继续访问"
          onLogin={() => navigate('/login')}
          onGoBack={() => navigate(-1)}
        />
      } />
    </Routes>
  )
}
```

### Props 接口

```typescript
interface UnauthorizedPageProps {
  /** 自定义错误消息 */
  message?: string
  /** 登录回调 */
  onLogin?: () => void
  /** 返回回调 */
  onGoBack?: () => void
  /** 自定义类名 */
  className?: string
}
```

---

## 4. ErrorDisplay 错误展示组件

### 用途说明

通用的错误展示组件，支持多种错误类型的显示。

### Props 接口

```typescript
interface ErrorDisplayProps {
  /** 错误类型 */
  errorType: ErrorType
  /** 错误标题 */
  title?: string
  /** 错误消息 */
  message?: string
  /** 是否显示重试按钮 */
  showRetry?: boolean
  /** 重试回调 */
  onRetry?: () => void
  /** 关闭回调 */
  onClose?: () => void
  /** 自定义类名 */
  className?: string
}
```

### 使用示例

```tsx
import { ErrorDisplay } from '@/components/errors'

function App() {
  const [error, setError] = useState<Error | null>(null)
  
  if (error) {
    const errorType = analyzeErrorType(error)
    
    return (
      <ErrorDisplay
        errorType={errorType}
        showRetry={true}
        onRetry={() => {
          setError(null)
          refetch()
        }}
        onClose={() => setError(null)}
      />
    )
  }
  
  return <div>Content</div>
}
```

---

## 集成示例

### 完整的错误处理组件

```tsx
import { 
  ForbiddenPage, 
  UnauthorizedPage, 
  ErrorDisplay,
  analyzeErrorType,
  getErrorTitle,
  getErrorMessage
} from '@/components/errors'

function ErrorHandler({ error, onRetry }: { error: Error, onRetry?: () => void }) {
  const errorType = analyzeErrorType(error)
  const title = getErrorTitle(errorType, '发生错误')
  const message = getErrorMessage(errorType, '请稍后重试')
  
  switch (errorType) {
    case 'forbidden':
      return <ForbiddenPage message={message} />
    case 'unauthorized':
      return <UnauthorizedPage message={message} />
    default:
      return (
        <ErrorDisplay
          errorType={errorType}
          title={title}
          message={message}
          showRetry={!!onRetry}
          onRetry={onRetry}
        />
      )
  }
}
```

### 在 React Router 中使用

```tsx
import { Routes, Route } from 'react-router-dom'
import { ForbiddenPage, UnauthorizedPage } from '@/components/errors'

function App() {
  return (
    <Routes>
      {/* 其他路由... */}
      
      <Route path="/403" element={
        <ForbiddenPage 
          message="您没有权限访问此页面"
          onGoHome={() => navigate('/')}
        />
      } />
      
      <Route path="/401" element={
        <UnauthorizedPage 
          message="请先登录"
          onLogin={() => navigate('/login')}
        />
      } />
    </Routes>
  )
}
```

---

## 注意事项

1. **error-utils** 依赖 `@/lib/errors` 中的错误类型定义
2. **ForbiddenPage** 和 **UnauthorizedPage** 使用 Tailwind CSS 样式
3. **ErrorDisplay** 支持自定义图标和操作按钮
4. 所有错误消息支持国际化扩展

---

## 相关文档

- [错误类型定义](../../lib/errors/unified-types.ts)
- [错误代码定义](../../lib/errors/index.ts)
- [ErrorBoundary 组件](../errors/ErrorBoundary.tsx)
