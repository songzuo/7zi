/**
 * 测试设置文件
 *
 * 配置全局测试环境和工具
 */

/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */

import '@testing-library/jest-dom'
import { vi, afterAll } from 'vitest'
// 本文件是 .ts（不是 .tsx），不能写 JSX —— lucide-react mock 用 createElement 实现。
import { createElement } from 'react'

// Set test environment variables first
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key'
process.env.AGENT_ENCRYPTION_SECRET = process.env.AGENT_ENCRYPTION_SECRET || 'test-jwt-secret-key'

// Import global mocks (must be before any test code runs)
import '@/test/vi-mocks'

// ---------------------------------------------------------------------------
// MSW —— 拦截 fetch('http://localhost:3000/api/...')
//
// 根级 CI（.github/workflows/ci.yml 的 test-unit）用根 vitest.config.ts，
// setupFiles 只挂了本文件。tests/api-integration/** 的用例全部是
// fetch('http://localhost:3000/api/xxx') 打真实服务器 —— 但 CI 不起服务，
// 于是 100% 'TypeError: fetch failed'。
//
// tests/api-integration/vitest.config.ts 里本来有 MSW setup，但那只在
// `npm run test:api`（cd 进该目录跑）时生效，根 CI 跑不到。
// 这里把同一套 handlers 挂到根 setup 上，两个入口行为就一致了。
// ---------------------------------------------------------------------------
//
// 注意：必须动态 import。msw/node 在**模块求值时**就用 defineProperty 把
// global.WebSocket 定义成只读，而本文件后面还要给 global.WebSocket 赋 MockWebSocket
// —— 静态 import 会让那行抛 'Cannot assign to read only property WebSocket'，
// 结果整个文件 0 test。
import { server as mswServer } from './api-integration/mocks/handlers'

// listen() 必须在**模块顶层**调用，不能放 beforeAll。
//
// vitest 的执行顺序是：
//   1. import setupFiles（tests/setup.ts）
//   2. import 测试文件 —— 测试文件的顶层代码在这里跑
//   3. 跑 beforeAll / beforeEach
//
// MSW 的 listen() 会**替换 global.fetch**。如果放在 beforeAll（第 3 步），
// 它就把第 2 步里测试自己设的 `global.fetch = vi.fn()` 覆盖掉了 ——
// 于是测试里 `(global.fetch as any).mockResolvedValue(...)` 报
// 'global.fetch.mockResolvedValue is not a function'。
//
// 放在顶层（第 1 步）就对了：
//   - 需要 MSW 拦截的测试（api-integration）：它们不自己改 global.fetch，
//     用的是 MSW 包装后的 fetch。
//   - 自己 mock fetch 的测试（组件测试）：第 2 步顶层 `global.fetch = vi.fn()`
//     在 MSW 之后执行，测试的 mock 覆盖 MSW 的包装，互不干扰。
//
// 静态 import 的副作用（msw/node 在模块求值时把 global.WebSocket 定义成
// 只读）已经被下面的 Object.defineProperty 修掉了 —— 顺序是
//   import msw（WebSocket 变只读）→ defineProperty 改回可写。
mswServer.listen({
  onUnhandledRequest: 'warn',
})

afterAll(() => {
  mswServer.close()
})

// Add TextEncoder/TextDecoder polyfill for jsdom environment
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util')
  global.TextEncoder = TextEncoder
  global.TextDecoder = TextDecoder
}

// Fix for jose v6 in Node.js environment
// Ensure crypto module is properly polyfilled
if (typeof global.crypto === 'undefined') {
  const { webcrypto } = require('crypto')
  global.crypto = webcrypto

  // Additional polyfills for jose v6 compatibility
  if (!global.crypto.subtle) {
    global.crypto.subtle = webcrypto.subtle
  }
}

// Ensure TextEncoder/TextDecoder are available globally
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util')
  global.TextEncoder = TextEncoder
  global.TextDecoder = TextDecoder
}

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock next-intl
//
// 之前一律返回 `namespace:key`（例如 `contact.form:submit`）——
// 这不是真实 i18n 的行为：真实 next-intl 返回的是**文案**，不是 key 路径。
// 结果组件测试里 getByRole('button', { name: /send message/i }) 这种
// 按可见文案查的断言全查不到（组件测试失败的真实原因之一）。
//
// 这里给一小份常用 key 的**真实英文文案**，其余仍回落到 key 路径。
const MOCK_I18N_STRINGS: Record<string, string> = {
  'contact.form.name': 'Your Name',
  'contact.form.email': 'Your Email',
  'contact.form.company': 'Company',
  'contact.form.subject': 'Subject',
  'contact.form.message': 'Message',
  'contact.form.submit': 'Send Message',
  'contact.form.sending': 'Sending...',
  'contact.form.success': 'Message sent successfully',
  'contact.form.error': 'Failed to send message',
}

const mockUseTranslations = (namespace?: string) => (key: string) => {
  const full = namespace ? `${namespace}.${key}` : key
  return MOCK_I18N_STRINGS[full] ?? (namespace ? `${namespace}:${key}` : key)
}

vi.mock('next-intl', () => ({
  useTranslations: mockUseTranslations,
  useLocale: () => 'en',
  useFormatter: () => ({
    dateTime: (date: Date) => date.toISOString(),
    number: (num: number) => num.toString(),
    currency: (value: number, currency: string) => `${value} ${currency}`,
  }),
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: vi.fn(),
}))

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: vi.fn(),
}))

// Mock lucide-react icons
//
// 这里必须覆盖**代码库实际用到的全部**图标名。
// 之前只列了 25 个，组件里用到清单外的图标（如 RefreshCw）时，
// Vitest 会在渲染阶段抛
//   [vitest] No "RefreshCw" export is defined on the "lucide-react" mock
// 而异常发生在 render() 里 —— 结果是**整个测试文件**的用例全部失败，
// 不是只有用到该图标的那一个失败。
//
// 说明：曾试过用 Proxy 兜底，但 Vitest 不接受 Proxy 作为 mock 工厂的返回值
// （报 "Cannot create proxy with a non-object as target or handler"），
// 所以改为生成显式清单。
//
// 该清单由脚本扫描 src/ tests/ app/ 下所有
//   import { ... } from 'lucide-react'
// 语句自动生成。新增图标时请一并更新。
//
// ⚠️ 图标**不能返回 null**（2026-10-27 实测）：
// 原本每个图标都是 `vi.fn(() => null)`，于是渲染结果里**一个 svg 都没有**。
// 凡是靠 className 定位图标的断言全部落空 ——
// 例如 StarRating 的半星用 `absolute top-0 left-0` 定位 StarHalf，
// 断言 `container.querySelectorAll('.absolute').length > 0` 永远为 0，
// 而这跟组件实现毫无关系。
//
// → 改成渲染一个真实元素并**透传 className**：
// 既保留"不需要真 svg"的初衷，又让 className 断言可用。
vi.mock('lucide-react', () => ({
  Activity: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Activity', className })
  ),
  AlertCircle: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'AlertCircle', className })
  ),
  AlertTriangle: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'AlertTriangle', className })
  ),
  ArrowDown: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'ArrowDown', className })
  ),
  ArrowRight: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'ArrowRight', className })
  ),
  ArrowUp: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'ArrowUp', className })
  ),
  ArrowUpDown: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'ArrowUpDown', className })
  ),
  BarChart3: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'BarChart3', className })
  ),
  Bell: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Bell', className })
  ),
  BookOpen: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'BookOpen', className })
  ),
  Bot: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Bot', className })
  ),
  Calendar: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Calendar', className })
  ),
  Check: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Check', className })
  ),
  CheckCircle: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'CheckCircle', className })
  ),
  CheckCircle2: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'CheckCircle2', className })
  ),
  ChevronDown: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'ChevronDown', className })
  ),
  ChevronLeft: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'ChevronLeft', className })
  ),
  ChevronRight: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'ChevronRight', className })
  ),
  ChevronUp: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'ChevronUp', className })
  ),
  Clock: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Clock', className })
  ),
  Copy: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Copy', className })
  ),
  Cpu: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Cpu', className })
  ),
  Crown: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Crown', className })
  ),
  Database: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Database', className })
  ),
  DollarSign: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'DollarSign', className })
  ),
  Download: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Download', className })
  ),
  Edit3: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Edit3', className })
  ),
  Eye: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Eye', className })
  ),
  EyeOff: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'EyeOff', className })
  ),
  FileJson: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'FileJson', className })
  ),
  FileSpreadsheet: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'FileSpreadsheet', className })
  ),
  FileText: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'FileText', className })
  ),
  Filter: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Filter', className })
  ),
  Flag: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Flag', className })
  ),
  GitCompare: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'GitCompare', className })
  ),
  Globe: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Globe', className })
  ),
  GripVertical: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'GripVertical', className })
  ),
  HardDrive: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'HardDrive', className })
  ),
  HelpCircle: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'HelpCircle', className })
  ),
  History: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'History', className })
  ),
  Home: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Home', className })
  ),
  Image: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Image', className })
  ),
  Info: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Info', className })
  ),
  Layout: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Layout', className })
  ),
  LayoutDashboard: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'LayoutDashboard', className })
  ),
  LineChart: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'LineChart', className })
  ),
  ListTodo: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'ListTodo', className })
  ),
  Loader2: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Loader2', className })
  ),
  Lock: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Lock', className })
  ),
  LucideIcon: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'LucideIcon', className })
  ),
  Mail: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Mail', className })
  ),
  MessageCircle: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'MessageCircle', className })
  ),
  MessageSquare: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'MessageSquare', className })
  ),
  Mic: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Mic', className })
  ),
  MicOff: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'MicOff', className })
  ),
  Minus: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Minus', className })
  ),
  MoreHorizontal: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'MoreHorizontal', className })
  ),
  MoreVertical: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'MoreVertical', className })
  ),
  MousePointer: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'MousePointer', className })
  ),
  Pause: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Pause', className })
  ),
  PauseCircle: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'PauseCircle', className })
  ),
  Phone: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Phone', className })
  ),
  PieChart: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'PieChart', className })
  ),
  Play: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Play', className })
  ),
  Plus: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Plus', className })
  ),
  Redo2: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Redo2', className })
  ),
  RefreshCw: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'RefreshCw', className })
  ),
  RotateCcw: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'RotateCcw', className })
  ),
  Save: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Save', className })
  ),
  Search: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Search', className })
  ),
  Send: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Send', className })
  ),
  Server: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Server', className })
  ),
  Settings: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Settings', className })
  ),
  Shield: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Shield', className })
  ),
  Star: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Star', className })
  ),
  StarHalf: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'StarHalf', className })
  ),
  Subscript: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Subscript', className })
  ),
  ThumbsUp: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'ThumbsUp', className })
  ),
  Timer: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Timer', className })
  ),
  Trash2: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Trash2', className })
  ),
  TrendingDown: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'TrendingDown', className })
  ),
  TrendingUp: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'TrendingUp', className })
  ),
  Undo2: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Undo2', className })
  ),
  Upload: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Upload', className })
  ),
  User: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'User', className })
  ),
  UserPlus: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'UserPlus', className })
  ),
  Users: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Users', className })
  ),
  Wifi: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Wifi', className })
  ),
  WifiOff: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'WifiOff', className })
  ),
  X: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'X', className })
  ),
  XCircle: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'XCircle', className })
  ),
  Zap: vi.fn(({ className }: { className?: string }) =>
    createElement('span', { 'data-lucide': 'Zap', className })
  ),
}))

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.OPEN
  onmessage: ((event: MessageEvent) => void) | null = null
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: ((event: Event) => void) | null = null

  send = vi.fn()
  close = vi.fn()

  constructor() {
    setTimeout(() => {
      if (this.onopen) this.onopen()
    }, 0)
  }
}

// jsdom 把 global.WebSocket 定义成**只读的 getter 属性**（没有 setter），
// 直接赋值会抛 'Cannot assign to read only property WebSocket'。
// 必须先 redefineProperty 换成可写属性。
//
// 这个错误发生在 setup 文件顶层 —— 整个 setup 抛异常 → **所有**用到
// global.WebSocket 的测试文件全部 0 用例 / 全红。
// （msw/node 也会在模块求值时把 WebSocket define 成只读，所以这里要抢在它前面。）
Object.defineProperty(global, 'WebSocket', {
  value: MockWebSocket,
  writable: true,
  configurable: true,
})

// Mock IntersectionObserver with callback support
class MockIntersectionObserver {
  callback: IntersectionObserverCallback
  targets: Set<Element>

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback
    this.targets = new Set()

    // Trigger callback with default values
    setTimeout(() => {
      const entries: IntersectionObserverEntry[] = []
      for (const target of this.targets) {
        entries.push({
          target,
          isIntersecting: true,
          intersectionRatio: 1,
          boundingClientRect: target.getBoundingClientRect(),
          intersectionRect: new DOMRect(),
          rootBounds: null,
          time: performance.now(),
        })
      }
      if (entries.length > 0) {
        callback(entries, new IntersectionObserverMock(options))
      }
    }, 0)
  }

  observe(target: Element) {
    this.targets.add(target)
  }

  disconnect() {
    this.targets.clear()
  }

  unobserve(target: Element) {
    this.targets.delete(target)
  }
}

class IntersectionObserverMock implements IntersectionObserver {
  root = null
  rootMargin = ''
  thresholds: number[] = []

  constructor(_callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.root = options?.root ?? null
    this.rootMargin = options?.rootMargin ?? ''
    this.thresholds = Array.isArray(options?.threshold)
      ? options.threshold
      : [options?.threshold ?? 0]
  }

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}

global.ResizeObserver = MockResizeObserver as any

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
})

// Mock matchMedia (only in jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// Mock logger
//
// 同样要导出 `log` 便捷函数集合（见 src/test/vi-mocks.ts 里的同名说明），
// 否则 `import { log } from '@/lib/logger'` 会在运行期报
// "No 'log' export is defined on the mock"。
vi.mock('@/lib/logger', () => {
  const logger = {
    auth: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    api: vi.fn(),
    perf: vi.fn(),
    user: vi.fn(),
    security: vi.fn(),
    business: vi.fn(),
  }

  const log = {
    debug: (message: string, data?: Record<string, unknown>) => logger.debug(message, data),
    info: (message: string, data?: Record<string, unknown>) => logger.info(message, data),
    warn: (message: string, data?: Record<string, unknown>) => logger.warn(message, data),
    error: (message: string, error?: Error | unknown, data?: Record<string, unknown>) =>
      logger.error(message, error, data),
    fatal: (message: string, error?: Error | unknown, data?: Record<string, unknown>) =>
      logger.fatal(message, error, data),
    api: (message: string, data?: Record<string, unknown>, level?: string) =>
      logger.api(message, data, level),
    auth: (message: string, data?: Record<string, unknown>, level?: string) =>
      logger.auth(message, data, level),
    perf: (message: string, data?: Record<string, unknown>) => logger.perf(message, data),
    user: (message: string, data?: Record<string, unknown>) => logger.user(message, data),
    security: (message: string, data?: Record<string, unknown>, level?: string) =>
      logger.security(message, data, level),
    business: (message: string, data?: Record<string, unknown>) => logger.business(message, data),
  }

  return { logger, log }
})

// Mock web-vitals
vi.mock('web-vitals', () => ({
  onLCP: vi.fn(),
  onCLS: vi.fn(),
  onTTFB: vi.fn(),
  onFCP: vi.fn(),
  onINP: vi.fn(),
}))

// Mock Performance API
if (typeof performance === 'undefined') {
  global.performance = {} as any
}

if (!performance.mark) {
  performance.mark = vi.fn()
}
if (!performance.measure) {
  performance.measure = vi.fn()
}
if (!performance.clearMarks) {
  performance.clearMarks = vi.fn()
}
if (!performance.clearMeasures) {
  performance.clearMeasures = vi.fn()
}
if (!performance.getEntriesByType) {
  performance.getEntriesByType = vi.fn(() => [])
}
if (!performance.getEntries) {
  performance.getEntries = vi.fn(() => [])
}

// Mock requestIdleCallback
if (typeof window !== 'undefined' && !window.requestIdleCallback) {
  window.requestIdleCallback = vi.fn((cb: any) => setTimeout(cb, 0)) as any
  window.cancelIdleCallback = vi.fn(clearTimeout) as any
}

// Suppress console warnings for React 18 strict mode
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render')) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
