# 测试指南

> 7zi 项目的完整测试文档

## 📋 目录

- [测试工具链](#测试工具链)
- [测试配置](#测试配置)
- [运行测试](#运行测试)
- [测试示例](#测试示例)
- [Mock 使用指南](#mock-使用指南)
- [最佳实践](#最佳实践)
- [故障排除](#故障排除)

---

## 🛠️ 测试工具链

### 核心工具

| 工具 | 版本 | 用途 |
|------|------|------|
| **Vitest** | 4.0.18 | 现代化测试框架，兼容 Jest API |
| **React Testing Library** | 16.x | React 组件测试工具 |
| **JSDOM** | 28.x | 浏览器环境模拟 |
| **@vitest/coverage-v8** | 最新 | 代码覆盖率收集 |

### 为什么选择 Vitest？

- ⚡ **极速**: 基于 Vite，测试启动和热更新速度极快
- 🔧 **兼容 Jest**: 平滑迁移，API 完全兼容
- 📦 **内置功能**: Mock、Snapshot、UI 等开箱即用
- 🔄 **监视模式**: 文件变化自动重新运行测试

---

## ⚙️ 测试配置

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
})
```

### 测试设置文件

```typescript
// __tests__/setup.ts
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// 每个测试后自动清理
afterEach(() => {
  cleanup()
})

// 全局 Mock
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
```

---

## 🚀 运行测试

### 基本命令

```bash
# 监视模式 (开发推荐)
pnpm test

# 单次运行 (CI 环境)
pnpm test:run

# 生成覆盖率报告
pnpm test:coverage

# 运行特定测试文件
pnpm test Button.test.tsx

# 运行匹配名称的测试
pnpm test -t "should render"
```

### npm scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 📝 测试示例

### 1. 单元测试 (工具函数)

```typescript
// lib/utils.test.ts
import { describe, it, expect } from 'vitest'
import { formatDate, truncateText, capitalize } from './utils'

describe('formatDate', () => {
  it('formats date correctly', () => {
    const date = new Date('2026-03-06T12:00:00Z')
    expect(formatDate(date)).toBe('2026-03-06')
  })

  it('handles invalid input', () => {
    expect(formatDate(null)).toBe('')
  })
})

describe('truncateText', () => {
  it('truncates long text', () => {
    expect(truncateText('Hello World', 5)).toBe('Hello...')
  })

  it('keeps short text unchanged', () => {
    expect(truncateText('Hi', 10)).toBe('Hi')
  })
})

describe('capitalize', () => {
  it('capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello')
  })

  it('handles empty string', () => {
    expect(capitalize('')).toBe('')
  })
})
```

### 2. 组件测试

```typescript
// components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from './Button'

describe('Button Component', () => {
  describe('rendering', () => {
    it('renders with text', () => {
      render(<Button>Click Me</Button>)
      expect(screen.getByRole('button')).toHaveTextContent('Click Me')
    })

    it('applies variant styles', () => {
      render(<Button variant="primary">Primary</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-blue-500')
    })

    it('shows loading spinner when loading', () => {
      render(<Button loading>Submit</Button>)
      expect(screen.getByRole('button')).toBeDisabled()
      expect(screen.getByTestId('spinner')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onClick when clicked', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click</Button>)
      
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when disabled', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick} disabled>Click</Button>)
      
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has correct type attribute', () => {
      render(<Button type="submit">Submit</Button>)
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
    })

    it('supports aria-label', () => {
      render(<Button aria-label="Close dialog">×</Button>)
      expect(screen.getByLabelText('Close dialog')).toBeInTheDocument()
    })
  })
})
```

### 3. 自定义 Hook 测试

```typescript
// hooks/useCounter.test.ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useCounter } from './useCounter'

describe('useCounter Hook', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter())
    expect(result.current.count).toBe(0)
  })

  it('initializes with custom value', () => {
    const { result } = renderHook(() => useCounter(10))
    expect(result.current.count).toBe(10)
  })

  it('increments count', () => {
    const { result } = renderHook(() => useCounter())
    
    act(() => {
      result.current.increment()
    })
    
    expect(result.current.count).toBe(1)
  })

  it('decrements count', () => {
    const { result } = renderHook(() => useCounter(5))
    
    act(() => {
      result.current.decrement()
    })
    
    expect(result.current.count).toBe(4)
  })

  it('resets to initial value', () => {
    const { result } = renderHook(() => useCounter(10))
    
    act(() => {
      result.current.increment()
      result.current.reset()
    })
    
    expect(result.current.count).toBe(10)
  })
})
```

### 4. 异步测试

```typescript
// components/UserProfile.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { UserProfile } from './UserProfile'

// Mock API
vi.mock('./api', () => ({
  fetchUser: vi.fn().mockResolvedValue({
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
  }),
}))

describe('UserProfile', () => {
  it('shows loading state initially', () => {
    render(<UserProfile userId={1} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('displays user data after loading', async () => {
    render(<UserProfile userId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
    
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('handles error state', async () => {
    vi.mocked(fetchUser).mockRejectedValueOnce(new Error('Network error'))
    
    render(<UserProfile userId={1} />)
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})
```

---

## 🎭 Mock 使用指南

### 函数 Mock

```typescript
import { vi } from 'vitest'

// 创建 Mock 函数
const mockFn = vi.fn()

// 设置返回值
mockFn.mockReturnValue('hello')
mockFn.mockReturnValueOnce('first call')

// 设置实现
mockFn.mockImplementation((x) => x * 2)

// Mock Promise
mockFn.mockResolvedValue('async result')
mockFn.mockRejectedValue(new Error('failed'))

// 检查调用
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
expect(mockFn).toHaveBeenCalledTimes(3)

// 清除调用记录
mockFn.mockClear()
```

### 模块 Mock

```typescript
// Mock 整个模块
vi.mock('./api', () => ({
  fetchUser: vi.fn().mockResolvedValue({ id: 1, name: 'Test' }),
  fetchPosts: vi.fn().mockResolvedValue([]),
}))

// Mock 部分导出
vi.mock('./utils', async (importOriginal) => {
  const mod = await importOriginal()
  return {
    ...mod,
    // 只 Mock 特定函数
    formatDate: vi.fn().mockReturnValue('2026-03-06'),
  }
})
```

### Timer Mock

```typescript
import { vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('calls callback after delay', () => {
  const callback = vi.fn()
  setTimeout(callback, 1000)
  
  // 快进时间
  vi.advanceTimersByTime(1000)
  
  expect(callback).toHaveBeenCalled()
})

it('handles intervals', () => {
  const callback = vi.fn()
  setInterval(callback, 100)
  
  vi.advanceTimersByTime(350) // 3.5 次
  
  expect(callback).toHaveBeenCalledTimes(3)
})
```

### 全局对象 Mock

```typescript
// localStorage Mock
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// fetch Mock
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: 'test' }),
})

// IntersectionObserver Mock
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
```

### React 组件 Mock

```typescript
// Mock 子组件
vi.mock('./ChildComponent', () => ({
  ChildComponent: ({ name }) => <div data-testid="mock-child">{name}</div>,
}))

// Mock hooks
vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Test User' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))
```

---

## ✅ 最佳实践

### 1. 测试用户可见行为

```typescript
// ❌ 测试实现细节
expect(component.state('isLoading')).toBe(true)

// ✅ 测试用户可见状态
expect(screen.getByText('Loading...')).toBeInTheDocument()
```

### 2. 使用语义化查询

```typescript
// 优先级从高到低
1. getByRole('button', { name: 'Submit' })
2. getByLabelText('Email')
3. getByPlaceholderText('Enter email')
4. getByText('Submit')
5. getByTestId('submit-button')  // 最后手段
```

### 3. 测试隔离

```typescript
// 每个测试独立运行，不依赖执行顺序
describe('UserList', () => {
  beforeEach(() => {
    // 重置状态
    vi.clearAllMocks()
  })

  it('shows empty state', () => {
    render(<UserList users={[]} />)
    expect(screen.getByText('No users')).toBeInTheDocument()
  })

  it('renders user list', () => {
    render(<UserList users={[{ id: 1, name: 'John' }]} />)
    expect(screen.getByText('John')).toBeInTheDocument()
  })
})
```

### 4. 描述性测试名称

```typescript
// ❌ 含糊不清
it('works', () => {})

// ✅ 清晰描述
it('displays error message when API fails', () => {})
```

### 5. AAA 模式

```typescript
it('increments counter on button click', () => {
  // Arrange - 准备
  render(<Counter />)
  
  // Act - 执行
  fireEvent.click(screen.getByText('+'))
  
  // Assert - 断言
  expect(screen.getByText('1')).toBeInTheDocument()
})
```

---

## 🔧 故障排除

### 常见问题

#### 1. "Cannot find module" 错误

```typescript
// vitest.config.ts 添加别名
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

#### 2. CSS 文件导入报错

```typescript
// __tests__/setup.ts
vi.mock('*.css', () => ({}))
vi.mock('*.scss', () => ({}))
```

#### 3. Next.js 组件报错

```typescript
// Mock next/router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: '/',
  }),
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt }) => <img src={src} alt={alt} />,
}))
```

#### 4. WebSocket 连接错误

```typescript
// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}))
```

#### 5. 覆盖率不达标

```bash
# 查看详细覆盖率
pnpm test:coverage

# 打开 HTML 报告
open coverage/index.html
```

### 调试技巧

```typescript
// 使用 debug 输出 DOM
import { screen, debug } from '@testing-library/react'

it('debugs the DOM', () => {
  render(<Component />)
  debug() // 输出当前 DOM 结构
  debug(screen.getByRole('button')) // 输出特定元素
})

// 使用 test.only 只运行特定测试
it.only('this test runs alone', () => {})

// 使用 test.skip 跳过测试
it.skip('this test is skipped', () => {})
```

---

## 📚 参考资源

- [Vitest 官方文档](https://vitest.dev/)
- [React Testing Library 文档](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing JavaScript (Kent C. Dodds)](https://testingjavascript.com/)
- [Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

*最后更新: 2026-03-06*