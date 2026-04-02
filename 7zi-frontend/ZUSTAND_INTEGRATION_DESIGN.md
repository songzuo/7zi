# Zustand 状态管理集成方案

## 📋 文档信息

- **项目**: 7zi-frontend
- **创建日期**: 2026-03-22
- **版本**: 1.0.0
- **作者**: 📚 咨询师
- **状态**: 设计阶段

---

## 📊 目录

1. [当前状态管理分析](#当前状态管理分析)
2. [Zustand 集成方案](#zustand-集成方案)
3. [Store 结构设计](#store-结构设计)
4. [选择器模式设计](#选择器模式设计)
5. [迁移步骤](#迁移步骤)
6. [风险评估](#风险评估)
7. [性能优化](#性能优化)
8. [测试策略](#测试策略)

---

## 1. 当前状态管理分析

### 1.1 现状概览

目前 7zi-frontend 项目主要使用以下状态管理方式：

| 方式         | 用途           | 文件                       | 代码量   |
| ------------ | -------------- | -------------------------- | -------- |
| `useState`   | 组件级状态     | 各组件                     | 广泛使用 |
| `useContext` | 跨组件状态共享 | `NotificationProvider.tsx` | 单一使用 |
| 自定义 Hooks | 封装业务逻辑   | `useNotifications.ts`      | 305 行   |

### 1.2 当前架构痛点

#### 🔴 问题 1: Context 导致的不必要重渲染

**位置**: `src/components/notifications/NotificationProvider.tsx`

```tsx
// 当前实现 - Context 传递整个状态对象
const NotificationContext = createContext<NotificationContextValue | null>(null)

function NotificationProvider({ children, ...options }) {
  const notifications = useNotifications(options)

  const contextValue = useMemo(() => notifications, [notifications])

  return (
    <NotificationContext.Provider value={contextValue}>{children}</NotificationContext.Provider>
  )
}
```

**问题**:

- `UseNotificationsReturn` 包含多个状态：`notifications`, `unreadCount`, `status`, `isConnected` 等
- 任何状态变化都会导致所有消费者重渲染
- 即使消费者只使用 `unreadCount`，`notifications` 数组变化也会触发重渲染

#### 🔴 问题 2: Hook 职责过重

**位置**: `src/hooks/useNotifications.ts` (305 行)

**问题**:

- Hook 包含状态管理 + 业务逻辑 + Socket 连接管理
- 难以测试和维护
- 状态更新逻辑分散在多个 `useCallback` 中
- 缺乏清晰的数据流

**代码示例**:

```typescript
export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  // 状态定义 (3 个 state)
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  // Refs (2 个 ref)
  const socketRef = useRef<Socket | null>(null);
  const isMounted = useRef(true);

  // 多个 useCallback 函数 (7 个)
  const connect = useCallback(...)
  const disconnect = useCallback(...)
  const markAsRead = useCallback(...)
  const markAllAsRead = useCallback(...)
  const deleteNotification = useCallback(...)
  const refreshNotifications = useCallback(...)

  // 复杂的 useEffect 逻辑
}
```

#### 🔴 问题 3: 缺乏统一的状态管理架构

**问题**:

- 通知状态独立管理，与其他状态（如用户、UI）没有关联
- 未来添加新功能时，需要重复实现类似的状态管理逻辑
- 没有全局状态管理模式
- 难以追踪状态变化和调试

#### 🔴 问题 4: 性能优化空间有限

**问题**:

- 无法细粒度控制组件订阅
- 没有状态持久化机制
- 缺乏时间旅行调试能力
- 无法在非 React 环境中访问状态

### 1.3 性能影响评估

| 指标             | 当前方案            | 优化潜力       |
| ---------------- | ------------------- | -------------- |
| 不必要重渲染次数 | 高（Context 传播）  | ↓ 70-90%       |
| 状态更新开销     | 中（多个 setState） | ↓ 50%          |
| 组件重渲染深度   | 全局传播            | 按需订阅       |
| 调试复杂度       | 高（状态分散）      | 低（集中管理） |

---

## 2. Zustand 集成方案

### 2.1 为什么选择 Zustand

#### ✅ 优势对比

| 特性              | Zustand | Redux       | Jotai   | Recoil    | Context |
| ----------------- | ------- | ----------- | ------- | --------- | ------- |
| 学习曲线          | 低 ⭐   | 高 ⭐⭐⭐⭐ | 中 ⭐⭐ | 高 ⭐⭐⭐ | 低 ⭐   |
| 代码量            | 少      | 多          | 少      | 中        | 中      |
| 性能              | 优秀    | 优秀        | 优秀    | 良好      | 差      |
| TypeScript 支持   | 优秀    | 优秀        | 优秀    | 良好      | 中      |
| DevTools          | ✅      | ✅          | ⚠️      | ✅        | ❌      |
| 持久化            | ✅ 内置 | 需插件      | 需插件  | 需插件    | 需手动  |
| Server Components | ✅ 兼容 | ⚠️          | ✅      | ⚠️        | ❌      |
| Bundle Size       | ~2KB    | ~3KB        | ~3KB    | ~22KB     | 0       |

**选择 Zustand 的原因**:

1. **零样板代码** - 不需要 actions、reducers、dispatch
2. **优秀的性能** - 自动选择器优化，避免不必要重渲染
3. **TypeScript 友好** - 完整的类型推断
4. **内置持久化** - 一行代码实现 localStorage/sessionStorage
5. **Next.js 兼容** - 完美支持 App Router 和 Server Components
6. **学习成本低** - API 简洁直观

### 2.2 核心设计原则

#### 原则 1: 按功能域拆分 Store

将状态按功能领域拆分为独立的 Store：

```typescript
// ✅ 推荐：按功能拆分
stores/
├── authStore.ts       // 认证和用户状态
├── notificationStore.ts  // 通知状态
├── uiStore.ts         // UI 状态
├── cacheStore.ts      // 缓存状态
└── index.ts           // 统一导出
```

**优势**:

- 关注点分离，每个 Store 职责单一
- 减少 Store 体积，提高可维护性
- 按需加载（未来可优化）

#### 原则 2: 选择器模式避免重渲染

使用细粒度选择器，只订阅需要的状态片段：

```typescript
// ✅ 推荐：细粒度选择器
const unreadCount = useNotificationStore(state => state.unreadCount)

// ❌ 避免：订阅整个 state
const notifications = useNotificationStore()
```

#### 原则 3: Actions 与状态分离

将状态更新逻辑集中到 actions 中，便于测试和复用：

```typescript
interface NotificationStore {
  // State
  notifications: Notification[]
  unreadCount: number

  // Actions
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
  refreshNotifications: () => Promise<void>
}
```

#### 原则 4: 异步状态处理

使用专门的异步 action 处理 API 调用：

```typescript
interface AuthStore {
  // State
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Async Actions
  login: (credentials: Credentials) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}
```

### 2.3 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                         UI Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Component  │  │  Component  │  │  Component  │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
┌──────────────────────────┼──────────────────────────────────┐
│                    Selector Layer                           │
│  (useAuthStore, useNotificationStore, useUIStore, etc.)    │
└──────────────────────────┼──────────────────────────────────┘
│                          │                                  │
┌──────────────────────────┼──────────────────────────────────┐
│                    Store Layer (Zustand)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  AuthStore  │  │NotifStore  │  │   UIStore   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
│                          │                                  │
┌──────────────────────────┼──────────────────────────────────┐
│                    Service Layer                            │
│  (API calls, Socket connections, Business logic)            │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Store 结构设计

### 3.1 认证和用户状态 (authStore)

```typescript
// src/stores/authStore.ts

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, Credentials, Session } from '@/lib/auth'

interface AuthState {
  // State
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (credentials: Credentials) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  updateUser: (updates: Partial<User>) => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async credentials => {
        set({ isLoading: true, error: null })

        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
          })

          const result = await response.json()

          if (!result.success) {
            throw new Error(result.error || 'Login failed')
          }

          set({
            user: result.user,
            session: result.session,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      },

      logout: async () => {
        set({ isLoading: true })

        try {
          await fetch('/api/auth/logout', { method: 'POST' })

          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        } catch (error) {
          set({ isLoading: false })
        }
      },

      refreshSession: async () => {
        const { session, user } = get()

        if (!session || !user) return

        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: session.token }),
          })

          const result = await response.json()

          if (result.success) {
            set({ session: result.session })
          } else {
            // Session expired, logout
            get().logout()
          }
        } catch (error) {
          console.error('Failed to refresh session:', error)
        }
      },

      updateUser: updates => {
        set(state => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }))
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage), // 敏感数据存 session
      partialize: state => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }), // 不持久化 loading/error
    }
  )
)

// Selectors
export const selectUser = (state: AuthState) => state.user
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated
export const selectIsLoading = (state: AuthState) => state.isLoading
```

### 3.2 通知状态 (notificationStore)

```typescript
// src/stores/notificationStore.ts

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { Socket } from 'socket.io-client'
import type {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationFilter,
} from '@/lib/services/notification'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface NotificationState {
  // State
  notifications: Notification[]
  unreadCount: number
  status: ConnectionStatus
  isConnected: boolean
  socket: Socket | null

  // Actions
  connect: (userId?: string, teamId?: string) => void
  disconnect: () => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
  refreshNotifications: (filter?: NotificationFilter) => Promise<void>
  addNotification: (notification: Notification) => void
  updateNotification: (id: string, updates: Partial<Notification>) => void

  // Computed Selectors (derived state)
  getUnreadNotifications: () => Notification[]
  getNotificationsByType: (type: NotificationType) => Notification[]
  getNotificationsByPriority: (priority: NotificationPriority) => Notification[]
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set, get) => ({
      // Initial State
      notifications: [],
      unreadCount: 0,
      status: 'disconnected',
      isConnected: false,
      socket: null,

      // Actions
      connect: async (userId, teamId) => {
        set({ status: 'connecting' })

        try {
          const { io } = await import('socket.io-client')
          const socketUrl =
            process.env.NEXT_PUBLIC_NOTIFICATION_SOCKET_URL || 'http://localhost:3001'

          const socket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
          })

          socket.on('connect', () => {
            set({ status: 'connected', isConnected: true })

            socket.emit('subscribe', { userId, teamId })
          })

          socket.on('initial_notifications', (initialNotifs: Notification[]) => {
            set({
              notifications: initialNotifs,
              unreadCount: initialNotifs.filter(n => !n.read).length,
            })
          })

          socket.on('notification', (notification: Notification) => {
            set(state => ({
              notifications: [notification, ...state.notifications],
              unreadCount: !notification.read ? state.unreadCount + 1 : state.unreadCount,
            }))

            // Show browser notification
            if (
              typeof window !== 'undefined' &&
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico',
              })
            }
          })

          socket.on('notification_read', (notificationId: string) => {
            set(state => ({
              notifications: state.notifications.map(n =>
                n.id === notificationId ? { ...n, read: true } : n
              ),
              unreadCount: Math.max(0, state.unreadCount - 1),
            }))
          })

          socket.on('notification_deleted', (notificationId: string) => {
            set(state => {
              const notification = state.notifications.find(n => n.id === notificationId)
              const filtered = state.notifications.filter(n => n.id !== notificationId)

              return {
                notifications: filtered,
                unreadCount:
                  notification && !notification.read
                    ? Math.max(0, state.unreadCount - 1)
                    : state.unreadCount,
              }
            })
          })

          socket.on('disconnect', () => {
            set({ status: 'disconnected', isConnected: false })
          })

          socket.on('connect_error', () => {
            set({ status: 'error', isConnected: false })
          })

          set({ socket })
        } catch (error) {
          console.error('Failed to connect:', error)
          set({ status: 'error', isConnected: false })
        }
      },

      disconnect: () => {
        const { socket } = get()

        if (socket) {
          socket.disconnect()
          set({ socket: null, status: 'disconnected', isConnected: false })
        }
      },

      markAsRead: id => {
        const { socket } = get()

        if (socket?.connected) {
          socket.emit('mark_read', id)
        }

        // Optimistic update
        set(state => ({
          notifications: state.notifications.map(n => (n.id === id ? { ...n, read: true } : n)),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }))
      },

      markAllAsRead: () => {
        const { socket } = get()

        if (socket?.connected) {
          socket.emit('mark_all_read', {})
        }

        set({
          notifications: state => state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        })
      },

      deleteNotification: id => {
        set(state => {
          const notification = state.notifications.find(n => n.id === id)
          const filtered = state.notifications.filter(n => n.id !== id)

          return {
            notifications: filtered,
            unreadCount:
              notification && !notification.read
                ? Math.max(0, state.unreadCount - 1)
                : state.unreadCount,
          }
        })
      },

      refreshNotifications: async filter => {
        try {
          const { user } = get() // Import from authStore if needed

          const params = new URLSearchParams()
          if (user?.id) params.append('userId', user.id)
          if (filter?.type) params.append('type', filter.type as string)
          if (filter?.priority) params.append('priority', filter.priority as string)
          if (filter?.read !== undefined) params.append('read', String(filter.read))

          const response = await fetch(`/api/notifications?${params}`)
          const result = await response.json()

          if (result.success && result.data) {
            set({
              notifications: result.data,
              unreadCount: result.meta?.unreadCount || 0,
            })
          }
        } catch (error) {
          console.error('Failed to refresh notifications:', error)
        }
      },

      addNotification: notification => {
        set(state => ({
          notifications: [notification, ...state.notifications],
          unreadCount: !notification.read ? state.unreadCount + 1 : state.unreadCount,
        }))
      },

      updateNotification: (id, updates) => {
        set(state => ({
          notifications: state.notifications.map(n => (n.id === id ? { ...n, ...updates } : n)),
        }))
      },

      // Computed Selectors
      getUnreadNotifications: () => {
        return get().notifications.filter(n => !n.read)
      },

      getNotificationsByType: type => {
        return get().notifications.filter(n => n.type === type)
      },

      getNotificationsByPriority: priority => {
        return get().notifications.filter(n => n.priority === priority)
      },
    }),
    {
      name: 'notification-store',
    }
  )
)

// Selectors
export const selectNotifications = (state: NotificationState) => state.notifications
export const selectUnreadCount = (state: NotificationState) => state.unreadCount
export const selectIsConnected = (state: NotificationState) => state.isConnected
export const selectUnreadNotifications = (state: NotificationState) =>
  state.notifications.filter(n => !n.read)
```

### 3.3 UI 状态 (uiStore)

```typescript
// src/stores/uiStore.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface UIState {
  // Theme
  theme: Theme

  // Sidebar
  sidebarCollapsed: boolean
  sidebarWidth: number

  // Modal
  activeModal: string | null
  modalData: any

  // Toast/Notifications UI
  toasts: Toast[]

  // Loading States
  globalLoading: boolean
  loadingStates: Record<string, boolean>

  // Actions
  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  openModal: (modalId: string, data?: any) => void
  closeModal: () => void
  showToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  setGlobalLoading: (loading: boolean) => void
  setComponentLoading: (componentId: string, loading: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    set => ({
      // Initial State
      theme: 'system',
      sidebarCollapsed: false,
      sidebarWidth: 250,
      activeModal: null,
      modalData: null,
      toasts: [],
      globalLoading: false,
      loadingStates: {},

      // Actions
      setTheme: theme => set({ theme }),

      toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarWidth: width => set({ sidebarWidth: width }),

      openModal: (modalId, data) => set({ activeModal: modalId, modalData: data }),

      closeModal: () => set({ activeModal: null, modalData: null }),

      showToast: toast => {
        const id = Math.random().toString(36).substr(2, 9)
        set(state => ({
          toasts: [...state.toasts, { ...toast, id }],
        }))

        // Auto-remove after 5 seconds
        setTimeout(() => {
          set(state => ({
            toasts: state.toasts.filter(t => t.id !== id),
          }))
        }, 5000)
      },

      removeToast: id =>
        set(state => ({
          toasts: state.toasts.filter(t => t.id !== id),
        })),

      setGlobalLoading: loading => set({ globalLoading: loading }),

      setComponentLoading: (componentId, loading) =>
        set(state => ({
          loadingStates: { ...state.loadingStates, [componentId]: loading },
        })),
    }),
    {
      name: 'ui-storage',
      partialize: state => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarWidth: state.sidebarWidth,
      }), // 只持久化部分 UI 状态
    }
  )
)

// Selectors
export const selectTheme = (state: UIState) => state.theme
export const selectSidebarCollapsed = (state: UIState) => state.sidebarCollapsed
export const selectActiveModal = (state: UIState) => state.activeModal
```

### 3.4 缓存状态 (cacheStore)

```typescript
// src/stores/cacheStore.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl?: number // Time to live in milliseconds
}

interface CacheState {
  // Cache storage
  cache: Record<string, CacheEntry<any>>

  // Actions
  set: <T>(key: string, data: T, ttl?: number) => void
  get: <T>(key: string) => T | null
  has: (key: string) => boolean
  invalidate: (key: string) => void
  clear: () => void
  clearExpired: () => void
}

export const useCacheStore = create<CacheState>()(
  persist(
    (set, get) => ({
      cache: {},

      set: <T>(key: string, data: T, ttl?: number) => {
        set(state => ({
          cache: {
            ...state.cache,
            [key]: {
              data,
              timestamp: Date.now(),
              ttl,
            },
          },
        }))
      },

      get: <T>(key: string): T | null => {
        const entry = get().cache[key]

        if (!entry) return null

        // Check TTL
        if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
          get().invalidate(key)
          return null
        }

        return entry.data as T
      },

      has: (key: string) => {
        return get().cache[key] !== undefined
      },

      invalidate: (key: string) => {
        set(state => {
          const newCache = { ...state.cache }
          delete newCache[key]
          return { cache: newCache }
        })
      },

      clear: () => set({ cache: {} }),

      clearExpired: () => {
        const now = Date.now()
        set(state => {
          const newCache: Record<string, CacheEntry<any>> = {}

          for (const [key, entry] of Object.entries(state.cache)) {
            if (!entry.ttl || now - entry.timestamp <= entry.ttl) {
              newCache[key] = entry
            }
          }

          return { cache: newCache }
        })
      },
    }),
    {
      name: 'cache-storage',
    }
  )
)
```

### 3.5 统一导出

```typescript
// src/stores/index.ts

export { useAuthStore, selectUser, selectIsAuthenticated } from './authStore'
export {
  useNotificationStore,
  selectNotifications,
  selectUnreadCount,
  selectIsConnected,
} from './notificationStore'
export { useUIStore, selectTheme, selectSidebarCollapsed, selectActiveModal } from './uiStore'
export { useCacheStore } from './cacheStore'
```

---

## 4. 选择器模式设计

### 4.1 基础选择器

```typescript
// ✅ 推荐：直接选择单一状态片段
const unreadCount = useNotificationStore(state => state.unreadCount)
```

**优势**:

- 只在 `unreadCount` 变化时重渲染
- `notifications` 数组变化不会影响该组件
- 性能最优

### 4.2 派生选择器

```typescript
// ✅ 推荐：使用派生选择器避免重复计算
const unreadNotifications = useNotificationStore(state => state.notifications.filter(n => !n.read))

// ❌ 避免：在组件中重复计算
const notifications = useNotificationStore(state => state.notifications)
const unreadNotifications = notifications.filter(n => !n.read) // 每次渲染都计算
```

### 4.3 多选择器组合

```typescript
// ✅ 推荐：同时选择多个状态片段
const [notifications, unreadCount, isConnected] = useNotificationStore(state => [
  state.notifications,
  state.unreadCount,
  state.isConnected,
])
```

**优势**:

- 只在任一选择的状态变化时重渲染
- 减少组件中调用 `useNotificationStore` 的次数

### 4.4 自定义 Hook 封装复杂选择器

```typescript
// hooks/useAuth.ts
import { useAuthStore } from '@/stores'

export function useAuth() {
  const user = useAuthStore(state => state.user)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const isLoading = useAuthStore(state => state.isLoading)
  const error = useAuthStore(state => state.error)

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    isAdmin: user?.role === 'admin',
  }
}

// 使用
const { user, isAdmin, isLoading } = useAuth()
```

### 4.5 浅比较选择器

对于数组/对象，使用浅比较优化：

```typescript
import { shallow } from 'zustand/shallow'

// ✅ 推荐：使用 shallow 比较对象
const { notifications, unreadCount } = useNotificationStore(
  state => ({ notifications: state.notifications, unreadCount: state.unreadCount }),
  shallow
)

// ✅ 推荐：使用 shallow 比较数组
const notifications = useNotificationStore(
  state => state.notifications.filter(n => n.type === 'task'),
  shallow
)
```

### 4.6 性能对比

| 场景                      | 当前方案                 | Zustand + 选择器                  | 性能提升 |
| ------------------------- | ------------------------ | --------------------------------- | -------- |
| 只读取 `unreadCount`      | 每次通知更新都重渲染     | 只在 `unreadCount` 变化时重渲染   | ↓ 90%    |
| 读取 `notifications` 列表 | 每次连接状态变化都重渲染 | 只在 `notifications` 变化时重渲染 | ↓ 80%    |
| 深度嵌套组件              | 逐级 Context 传播        | 直接订阅 Store                    | ↓ 70%    |

---

## 5. 迁移步骤

### 5.1 阶段 1: 准备阶段 (1-2 天)

#### 步骤 1.1: 安装依赖

```bash
cd /root/.openclaw/workspace/7zi-frontend
npm install zustand
```

#### 步骤 1.2: 创建 Store 目录结构

```bash
mkdir -p src/stores
```

#### 步骤 1.3: 创建基础 Store 文件

创建以下文件：

- `src/stores/authStore.ts`
- `src/stores/notificationStore.ts`
- `src/stores/uiStore.ts`
- `src/stores/cacheStore.ts`
- `src/stores/index.ts`

#### 步骤 1.4: 添加 TypeScript 类型支持

```typescript
// src/types/store.d.ts
import type { StateCreator } from 'zustand'

export type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never

export const createSelectors = <S extends StateCreator<object>>(store: S) => {
  return (state: ReturnType<S>) => ({
    ...state,
    use: Object.keys(state).reduce(
      (acc, key) => {
        acc[key] = () => state()[key as keyof typeof state]
        return acc
      },
      {} as { [K in keyof ReturnType<S>]: () => ReturnType<S>[K] }
    ),
  })
}
```

### 5.2 阶段 2: 实现 Store (2-3 天)

#### 步骤 2.1: 实现 authStore

按照 [3.1 节](#31-认证和用户状态-authstore) 的设计实现。

#### 步骤 2.2: 实现 notificationStore

按照 [3.2 节](#32-通知状态-notificationstore) 的设计实现。

#### 步骤 2.3: 实现 uiStore 和 cacheStore

按照 [3.3 节](#33-ui-状态-uistore) 和 [3.4 节](#34-缓存状态-cachestore) 的设计实现。

#### 步骤 2.4: 添加单元测试

```typescript
// src/stores/__tests__/authStore.test.ts
import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '../authStore'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
  })

  it('should update user on login', async () => {
    const { result } = renderHook(() => useAuthStore())

    await act(async () => {
      await result.current.login({ username: 'test', password: 'password' })
    })

    expect(result.current.user).toBeDefined()
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('should clear user on logout', async () => {
    const { result } = renderHook(() => useAuthStore())

    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })
})
```

### 5.3 阶段 3: 迁移现有组件 (3-5 天)

#### 步骤 3.1: 迁移 NotificationProvider

**修改前** (`src/components/notifications/NotificationProvider.tsx`):

```tsx
export default memo(NotificationProvider)
export function useNotificationContext(): NotificationContextValue {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider')
  }
  return context
}
```

**修改后**:

```tsx
// 保留 Provider 以兼容现有代码，内部使用 Zustand
import { useNotificationStore } from '@/stores'

export function useNotificationContext() {
  // 直接使用 Zustand store
  const notifications = useNotificationStore(state => state.notifications)
  const unreadCount = useNotificationStore(state => state.unreadCount)
  const isConnected = useNotificationStore(state => state.isConnected)

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead: useNotificationStore(state => state.markAsRead),
    markAllAsRead: useNotificationStore(state => state.markAllAsRead),
    deleteNotification: useNotificationStore(state => state.deleteNotification),
    refreshNotifications: useNotificationStore(state => state.refreshNotifications),
  }
}

// Provider 变为可选的连接管理器
function NotificationProvider({ children, autoConnect = true, userId, teamId }) {
  useEffect(() => {
    if (autoConnect) {
      useNotificationStore.getState().connect(userId, teamId)
    }

    return () => {
      useNotificationStore.getState().disconnect()
    }
  }, [autoConnect, userId, teamId])

  return <>{children}</>
}

export default memo(NotificationProvider)
```

#### 步骤 3.2: 迁移 demo 页面

**修改前**:

```tsx
function DemoContent() {
  const { notifications, unreadCount, isConnected, markAllAsRead } = useNotificationContext()
  const [showCenter, setShowCenter] = useState(false)
  // ...
}
```

**修改后**:

```tsx
function DemoContent() {
  // 直接使用选择器
  const notifications = useNotificationStore(state => state.notifications)
  const unreadCount = useNotificationStore(state => state.unreadCount)
  const isConnected = useNotificationStore(state => state.isConnected)
  const markAllAsRead = useNotificationStore(state => state.markAllAsRead)

  const [showCenter, setShowCenter] = useState(false)
  // ...
}
```

#### 步骤 3.3: 逐步替换组件

优先级顺序：

1. 高频更新组件（通知、实时数据）2.用户认证相关组件
2. UI 状态相关组件（侧边栏、模态框）
3. 缓存相关组件

**每个组件迁移步骤**:

1. 在组件顶部添加 `import { useXStore } from '@/stores';`
2. 替换 `useContext` 调用为 Zustand 选择器
3. 移除不必要的 Provider 包裹
4. 测试组件功能
5. 提交代码

### 5.4 阶段 4: 清理和优化 (2-3 天)

#### 步骤 4.1: 移除旧的 Context 文件

```bash
# 备份后删除
mv src/components/notifications/NotificationProvider.tsx src/components/notifications/NotificationProvider.tsx.bak
mv src/hooks/useNotifications.ts src/hooks/useNotifications.ts.bak
```

#### 步骤 4.2: 更新导入语句

全局搜索替换：

- `@/hooks/useNotifications` → `@/stores/notificationStore`
- `@/components/notifications/NotificationProvider` → `@/stores/notificationStore` (如需要)

#### 步骤 4.3: 性能优化

```typescript
// 启用 Zustand DevTools（开发环境）
import { devtools } from 'zustand/middleware'

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set, get) => ({
      /* ... */
    }),
    { name: 'notification-store' }
  )
)

// 启用持久化（如需要）
import { persist, createJSONStorage } from 'zustand/middleware'
```

#### 步骤 4.4: 添加文档和示例

创建 `docs/ZUSTAND_GUIDE.md`：

```markdown
# Zustand 状态管理指南

## 快速开始

### 读取状态

\`\`\`typescript
// 读取单一状态
const unreadCount = useNotificationStore(state => state.unreadCount);

// 读取多个状态（使用 shallow）
import { shallow } from 'zustand/shallow';

const { notifications, unreadCount } = useNotificationStore(
state => ({ notifications: state.notifications, unreadCount: state.unreadCount }),
shallow
);

// 使用自定义 Hook
const { user, isAuthenticated } = useAuth();
\`\`\`

### 更新状态

\`\`\`typescript
// 直接更新
useNotificationStore.getState().markAsRead(notificationId);

// 通过 action 更新
const markAsRead = useNotificationStore(state => state.markAsRead);
markAsRead(notificationId);
\`\`\`

### 最佳实践

1. ✅ 使用细粒度选择器避免不必要重渲染
2. ✅ 对于对象/数组选择器，使用 shallow 比较
3. ✅ 将复杂逻辑封装到自定义 Hook 中
4. ✅ 在非 React 环境中使用 `store.getState()`
5. ❌ 避免在组件中订阅整个 state
   \`\`\`
```

### 5.5 阶段 5: 测试和验证 (2-3 天)

#### 步骤 5.1: 单元测试

```typescript
// src/stores/__tests__/notificationStore.test.ts
import { renderHook, act, waitFor } from '@testing-library/react'
import { useNotificationStore } from '../notificationStore'
import { io } from 'socket.io-client'

jest.mock('socket.io-client')

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.getState().disconnect()
  })

  it('should connect to socket server', async () => {
    const mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      connected: false,
    }

    ;(io as jest.Mock).mockReturnValue(mockSocket)

    const { result } = renderHook(() => useNotificationStore())

    await act(async () => {
      result.current.connect('user-123', 'team-456')
    })

    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function))
  })

  it('should mark notification as read', () => {
    const { result } = renderHook(() => useNotificationStore())

    act(() => {
      result.current.addNotification({
        id: '1',
        title: 'Test',
        message: 'Test message',
        read: false,
        type: 'info',
        priority: 'medium',
        createdAt: new Date(),
      })
    })

    expect(result.current.unreadCount).toBe(1)

    act(() => {
      result.current.markAsRead('1')
    })

    expect(result.current.notifications[0].read).toBe(true)
    expect(result.current.unreadCount).toBe(0)
  })
})
```

#### 步骤 5.2: 集成测试

使用 Playwright 测试用户流程：

```typescript
// e2e/notifications.spec.ts
import { test, expect } from '@playwright/test'

test('notification flow', async ({ page }) => {
  await page.goto('/notification-demo')

  // 等待连接
  await expect(page.getByText('Connected')).toBeVisible()

  // 发送通知
  await page.click('button:has-text("Info")')

  // 验证通知显示
  await expect(page.getByText('Test info Notification')).toBeVisible()

  // 验证未读计数
  await expect(page.locator('.notification-badge')).toHaveText('1')

  // 标记为已读
  await page.click('[data-testid="mark-as-read"]')

  // 验证已读状态
  await expect(page.locator('.notification-badge')).toBeHidden()
})
```

#### 步骤 5.3: 性能测试

使用 React Profiler 验证性能改进：

```typescript
// 使用 React DevTools Profiler
// 对比迁移前后的重渲染次数和渲染时间
```

**预期指标**:

- 组件重渲染次数 ↓ 70-90%
- 平均渲染时间 ↓ 50%
- 内存使用无明显增加

#### 步骤 5.4: 手动测试清单

- [ ] 用户登录/登出流程
- [ ] 通知接收和显示
- [ ] 通知标记已读/删除
- [ ] WebSocket 连接状态
- [ ] 侧边栏折叠/展开
- [ ] 主题切换
- [ ] 缓存读取和失效
- [ ] 页面刷新后状态恢复
- [ ] 浏览器后退/前进
- [ ] 并发状态更新

### 5.6 阶段 6: 部署和监控 (1 天)

#### 步骤 6.1: 预发布测试

1. 在预发布环境完整测试
2. 收集性能指标
3. 检查控制台错误
4. 验证所有功能正常

#### 步骤 6.2: 灰度发布

1. 先发布到内部测试环境
2. 逐步开放给测试用户
3. 监控错误率和性能
4. 收集用户反馈

#### 步骤 6.3: 全量发布

1. 发布到生产环境
2. 监控关键指标：
   - 错误率
   - 页面加载时间
   - 渲染性能
   - 用户反馈

#### 步骤 6.4: 回滚计划

如果出现严重问题：

1. 立即回滚到上一版本
2. 分析问题原因
3. 修复后重新测试
4. 按照阶段 5 重新验证

---

## 6. 风险评估

### 6.1 技术风险

| 风险                          | 影响 | 概率 | 缓解措施                                   |
| ----------------------------- | ---- | ---- | ------------------------------------------ |
| Socket.IO 与 Zustand 集成复杂 | 高   | 中   | 先在隔离环境测试，编写完整集成测试         |
| 状态同步问题                  | 高   | 中   | 使用乐观更新，添加重试机制                 |
| 性能退化                      | 中   | 低   | 使用 React Profiler 监控，对比迁移前后指标 |
| TypeScript 类型错误           | 中   | 中   | 严格类型检查，运行时验证                   |
| 持久化数据格式不兼容          | 中   | 低   | 添加数据迁移脚本，版本标记                 |

### 6.2 时间风险

| 阶段       | 预估时间     | 缓冲时间   | 总计             |
| ---------- | ------------ | ---------- | ---------------- |
| 准备阶段   | 1-2 天       | 1 天       | 2-3 天           |
| 实现 Store | 2-3 天       | 1 天       | 3-4 天           |
| 迁移组件   | 3-5 天       | 2 天       | 5-7 天           |
| 清理优化   | 2-3 天       | 1 天       | 3-4 天           |
| 测试验证   | 2-3 天       | 1 天       | 3-4 天           |
| 部署监控   | 1 天         | 0.5 天     | 1.5 天           |
| **总计**   | **11-17 天** | **6.5 天** | **17.5-23.5 天** |

**建议**: 预留 3-4 周时间完成迁移

### 6.3 兼容性风险

#### 破坏性变更

1. **API 变更**: `useNotificationContext()` → `useNotificationStore()`
   - **影响**: 所有使用通知状态的组件
   - **缓解**: 保留兼容层，逐步迁移

2. **Provider 移除**: 不再需要 `NotificationProvider` 包裹
   - **影响**: 布局文件和根组件
   - **缓解**: 使用可选 Provider，内部使用 Zustand

3. **类型变更**: Store 接口与 Hook 返回值可能不同
   - **影响**: TypeScript 严格模式下的类型检查
   - **缓解**: 提供类型兼容层

### 6.4 团队风险

| 风险               | 影响 | 缓解措施                   |
| ------------------ | ---- | -------------------------- |
| 团队不熟悉 Zustand | 中   | 组织培训，提供文档和示例   |
| 并发开发冲突       | 中   | 使用功能分支，代码审查     |
| 测试覆盖不足       | 高   | 强制要求单元测试，集成测试 |
| 知识传承问题       | 低   | 完善文档，代码注释         |

### 6.5 运行时风险

#### 风险 1: 内存泄漏

**场景**: Socket 连接未正确清理导致内存泄漏

**缓解**:

```typescript
useEffect(() => {
  store.connect(userId, teamId)

  return () => {
    store.disconnect() // 确保清理
  }
}, [userId, teamId])
```

#### 风险 2: 竞态条件

**场景**: 快速连续的异步操作导致状态不一致

**缓解**:

```typescript
// 使用请求 ID 或序列号
const requestIdRef = useRef(0)

const fetchData = async () => {
  const requestId = ++requestIdRef.current

  const response = await fetch('/api/data')
  const result = await response.json()

  // 只处理最新的请求
  if (requestId === requestIdRef.current) {
    store.setData(result)
  }
}
```

#### 风险 3: 状态覆盖

**场景**: 多个组件同时更新同一状态导致覆盖

**缓解**:

```typescript
// 使用函数式更新
setNotifications(prev => [...prev, newNotification]) // ✅ 正确
setNotifications([...notifications, newNotification]) // ❌ 可能过时
```

---

## 7. 性能优化

### 7.1 渲染优化

#### 优化 1: 使用细粒度选择器

**优化前**:

```tsx
function NotificationBadge() {
  const { notifications, unreadCount } = useNotificationContext()
  // notifications 变化也会导致重渲染
  return <Badge count={unreadCount} />
}
```

**优化后**:

```tsx
function NotificationBadge() {
  // 只订阅 unreadCount
  const unreadCount = useNotificationStore(state => state.unreadCount)
  return <Badge count={unreadCount} />
}
```

**性能提升**: 90% ↓ 重渲染次数

#### 优化 2: 使用 shallow 比较

**优化前**:

```tsx
function NotificationList() {
  // 每次对象引用变化都重渲染
  const { notifications, unreadCount } = useNotificationStore(state => ({
    notifications: state.notifications,
    unreadCount: state.unreadCount,
  }))
  // ...
}
```

**优化后**:

```tsx
import { shallow } from 'zustand/shallow'

function NotificationList() {
  // 只在 notifications 或 unreadCount 内容变化时重渲染
  const { notifications, unreadCount } = useNotificationStore(
    state => ({
      notifications: state.notifications,
      unreadCount: state.unreadCount,
    }),
    shallow
  )
  // ...
}
```

#### 优化 3: 使用 React.memo 包裹组件

```tsx
const NotificationItem = React.memo(({ notification, onMarkRead, onDelete }) => {
  return <div>{/* ... */}</div>
})
```

### 7.2 计算优化

#### 优化 1: 派生状态缓存

```typescript
// 使用 useMemo 缓存计算结果
const unreadNotifications = useNotificationStore(
  state => state.notifications.filter(n => !n.read),
  shallow
)

// 或者使用 Zustand 的派生状态
export const useUnreadNotifications = () =>
  useNotificationStore(state => state.getUnreadNotifications())
```

#### 优化 2: 虚拟滚动

对于长列表，使用虚拟滚动减少渲染节点：

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualNotificationList() {
  const notifications = useNotificationStore(state => state.notifications)

  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: notifications.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
  })

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <NotificationItem
            key={virtualItem.key}
            notification={notifications[virtualItem.index]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
```

### 7.3 网络优化

#### 优化 1: 请求去重

```typescript
// 使用缓存避免重复请求
const fetchData = async () => {
  // 先检查缓存
  const cached = useCacheStore.getState().get('api-data')
  if (cached) return cached

  // 发起请求
  const response = await fetch('/api/data')
  const result = await response.json()

  // 缓存结果
  useCacheStore.getState().set('api-data', result, 60000) // 1 分钟 TTL

  return result
}
```

#### 优化 2: 批量操作

```typescript
// 批量标记已读，减少网络请求
const markMultipleAsRead = async (ids: string[]) => {
  await fetch('/api/notifications/mark-read-batch', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
}
```

### 7.4 性能监控

使用 Zustand DevTools 监控状态变化：

```typescript
import { devtools } from 'zustand/middleware'

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set, get) => ({
      /* ... */
    }),
    {
      name: 'notification-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
)
```

**使用方法**:

1. 打开 React DevTools
2. 切换到 "Zustand" 标签
3. 查看状态变化历史
4. 时间旅行调试

---

## 8. 测试策略

### 8.1 单元测试

#### 测试目标

- Store actions 正确性
- 状态更新逻辑
- 选择器计算正确性

#### 测试框架: Vitest

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

#### 测试示例

```typescript
// src/stores/__tests__/authStore.test.ts
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuthStore } from '../authStore'
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAuthStore())

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('should update user on successful login', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            user: { id: '1', username: 'test', email: 'test@example.com' },
            session: {
              token: 'token-123',
              userId: '1',
              expiresAt: new Date(),
              createdAt: new Date(),
            },
          }),
      })
    ) as any

    const { result } = renderHook(() => useAuthStore())

    await act(async () => {
      await result.current.login({ username: 'test', password: 'password' })
    })

    await waitFor(() => {
      expect(result.current.user).toEqual({
        id: '1',
        username: 'test',
        email: 'test@example.com',
      })
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should handle login failure', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Invalid credentials',
          }),
      })
    ) as any

    const { result } = renderHook(() => useAuthStore())

    await act(async () => {
      await result.current.login({ username: 'test', password: 'wrong' })
    })

    await waitFor(() => {
      expect(result.current.error).toBe('Invalid credentials')
      expect(result.current.isAuthenticated).toBe(false)
    })
  })
})
```

### 8.2 集成测试

#### 测试目标

- Store 与组件集成
- Socket.IO 集成
- 持久化集成

#### 测试示例

```typescript
// src/stores/__tests__/notificationStore.integration.test.ts
import { renderHook, act, waitFor } from '@testing-library/react'
import { useNotificationStore } from '../notificationStore'
import { io } from 'socket.io-client'
import { Server } from 'socket.io'

describe('notificationStore integration', () => {
  let ioServer: Server
  let clientSocket: any

  beforeAll(() => {
    ioServer = new Server(3001)
    ioServer.on('connection', socket => {
      socket.on('subscribe', ({ userId, teamId }) => {
        socket.emit('initial_notifications', [])
      })

      socket.on('mark_read', id => {
        socket.emit('notification_read', id)
      })
    })
  })

  afterAll(() => {
    ioServer.close()
  })

  beforeEach(() => {
    useNotificationStore.getState().disconnect()
  })

  it('should connect and receive initial notifications', async () => {
    const { result } = renderHook(() => useNotificationStore())

    await act(async () => {
      result.current.connect('user-123')
    })

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })
  })
})
```

### 8.3 E2E 测试

#### 测试框架: Playwright

```bash
npm install -D @playwright/test
```

#### 测试示例

```typescript
// e2e/notifications.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Notification System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/notification-demo')
  })

  test('should display notification count badge', async ({ page }) => {
    // 等待连接
    await expect(page.getByText('Connected')).toBeVisible()

    // 发送通知
    await page.click('button:has-text("Info")')

    // 验证徽章显示
    const badge = page.locator('.notification-badge')
    await expect(badge).toBeVisible()
    await expect(badge).toHaveText('1')
  })

  test('should mark notification as read', async ({ page }) => {
    // 发送通知
    await page.click('button:has-text("Info")')

    // 标记为已读
    await page.click('[data-testid="mark-as-read"]')

    // 验证徽章消失
    await expect(page.locator('.notification-badge')).toBeHidden()
  })

  test('should clear all notifications', async ({ page }) => {
    // 发送多个通知
    await page.click('button:has-text("Info")')
    await page.click('button:has-text("Success")')
    await page.click('button:has-text("Warning")')

    // 验证计数
    await expect(page.locator('.notification-badge')).toHaveText('3')

    // 清空所有
    await page.click('button:has-text("Clear All")')

    // 验证清空
    await expect(page.locator('.notification-badge')).toBeHidden()
    await expect(page.getByText('No notifications yet')).toBeVisible()
  })
})
```

### 8.4 性能测试

#### 使用 React Profiler

```typescript
import { Profiler } from 'react';

<Profiler id="NotificationList" onRender={onRenderCallback}>
  <NotificationList />
</Profiler>
```

#### 测试指标

| 指标           | 目标       | 测量方法                |
| -------------- | ---------- | ----------------------- |
| 组件重渲染次数 | ↓ 70%      | React DevTools Profiler |
| 平均渲染时间   | ↓ 50%      | React DevTools Profiler |
| 内存使用       | 无显著增加 | Chrome DevTools Memory  |
| 包体积         | +2KB       | webpack-bundle-analyzer |

---

## 9. 总结与建议

### 9.1 核心优势

✅ **性能提升**:

- 组件重渲染次数减少 70-90%
- 细粒度状态订阅，避免不必要更新
- 内置选择器优化

✅ **开发体验**:

- 零样板代码
- TypeScript 完整支持
- 内置 DevTools 和持久化
- 学习曲线低

✅ **可维护性**:

- 按功能域拆分 Store
- 状态和逻辑集中管理
- 易于测试和调试

✅ **Next.js 兼容**:

- 完美支持 App Router
- 兼容 Server Components
- 无 SSR 问题

### 9.2 迁移建议

#### 推荐的迁移策略

**渐进式迁移** (推荐):

- 优点: 风险低，可随时回滚
- 缺点: 时间较长
- 适合: 大型项目，团队不熟悉 Zustand

**一次性迁移**:

- 优点: 彻底清理旧代码
- 缺点: 风险高，难以回滚
- 适合: 小型项目，团队熟悉 Zustand

#### 迁移优先级

1. **高优先级**: 高频更新的状态（通知、实时数据）
2. **中优先级**: 用户认证、UI 状态
3. **低优先级**: 缓存、工具函数

### 9.3 后续优化方向

#### 短期 (1-2 周)

- [ ] 完成基础 Store 实现
- [ ] 迁移通知相关组件
- [ ] 添加单元测试

#### 中期 (1-2 月)

- [ ] 迁移所有组件
- [ ] 添加 E2E 测试
- [ ] 性能监控和优化

#### 长期 (3-6 月)

- [ ] 考虑引入 Zustand 中间件（immer、redux-undo 等）
- [ ] 实现时间旅行调试
- [ ] 建立状态管理最佳实践文档

### 9.4 关键注意事项

⚠️ **务必遵守**:

1. **不要在渲染中修改 state** - 使用 `useEffect` 或事件处理函数
2. **使用函数式更新** - 避免状态覆盖
3. **正确清理副作用** - Socket 连接、定时器等
4. **保持选择器纯净** - 避免副作用和状态修改
5. **测试覆盖** - 特别是异步操作和错误处理

⚠️ **避免常见错误**:

```typescript
// ❌ 错误：在渲染中调用 action
function Component() {
  useNotificationStore.getState().connect() // 每次渲染都执行
}

// ✅ 正确：使用 useEffect
function Component() {
  useEffect(() => {
    useNotificationStore.getState().connect()
  }, [])
}
```

### 9.5 参考资源

#### 官方文档

- [Zustand 官方文档](https://docs.pmnd.rs/zustand)
- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [Next.js 文档](https://nextjs.org/docs)

#### 社区资源

- [Zustand Recipes](https://github.com/pmndrs/zustand#recipes)
- [Zustand 最佳实践](https://docs.pmnd.rs/zustand/guides/best-practices)

#### 相关工具

- [immer](https://immerjs.github.io/immer/) - 不可变状态更新
- [redux-undo](https://github.com/omnidan/redux-undo) - 撤销/重做
- [zustand-middleware-immer](https://github.com/immerjs/immer/tree/main/packages/zustand-middleware-immer) - Zustand Immer 中间件

---

## 10. 附录

### 10.1 迁移检查清单

#### 准备阶段

- [ ] 安装 Zustand
- [ ] 创建 Store 目录结构
- [ ] 添加 TypeScript 类型
- [ ] 配置测试环境

#### 实现阶段

- [ ] 实现 authStore
- [ ] 实现 notificationStore
- [ ] 实现 uiStore
- [ ] 实现 cacheStore
- [ ] 添加单元测试

#### 迁移阶段

- [ ] 迁移 NotificationProvider
- [ ] 迁移 demo 页面
- [ ] 迁移高优先级组件
- [ ] 迁移中优先级组件
- [ ] 迁移低优先级组件

#### 优化阶段

- [ ] 移除旧的 Context 文件
- [ ] 更新导入语句
- [ ] 启用 DevTools
- [ ] 启用持久化
- [ ] 性能优化

#### 测试阶段

- [ ] 单元测试
- [ ] 集成测试
- [ ] E2E 测试
- [ ] 性能测试
- [ ] 手动测试

#### 部署阶段

- [ ] 预发布测试
- [ ] 灰度发布
- [ ] 全量发布
- [ ] 监控和验证

### 10.2 常见问题 FAQ

#### Q1: Zustand 和 Redux 哪个更好？

**A**: 这取决于项目规模和团队偏好：

- **选择 Zustand**:
  - 项目中小型，不需要复杂的中间件
  - 团队希望快速开发，减少样板代码
  - 关注性能和简洁性

- **选择 Redux Toolkit**:
  - 大型企业应用，需要完整的生态系统
  - 团队熟悉 Redux 和其工具链
  - 需要时间旅行调试和高级中间件

#### Q2: Zustand 的学习成本高吗？

**A**: 很低！基本概念只需要 30 分钟：

```typescript
// 1. 创建 Store
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// 2. 使用 Store
function Component() {
  const count = useStore((state) => state.count);
  const increment = useStore((state) => state.increment);
  return <button onClick={increment}>{count}</button>;
}
```

#### Q3: 如何在非 React 环境使用 Zustand？

**A**: 直接使用 `store.getState()` 和 `store.setState()`:

```typescript
import { useNotificationStore } from '@/stores'

// 在任何地方（非 React 组件）
const store = useNotificationStore.getState()

// 读取状态
const notifications = store.notifications

// 更新状态
store.markAsRead('id-123')

// 监听状态变化
const unsubscribe = store.subscribe(state => {
  console.log('State changed:', state)
})
```

#### Q4: Zustand 支持 SSR 吗？

**A**: 完全支持！只需要注意：

1. 使用条件导入 Socket.IO 等浏览器 API
2. 使用 `persist` 中间件时设置 `skipHydration`
3. 在 Server Components 中不要直接使用 Store

```typescript
// ✅ 正确：客户端组件
'use client';
import { useStore } from '@/stores';

function Component() {
  const count = useStore((state) => state.count);
  return <div>{count}</div>;
}
```

#### Q5: 如何调试 Zustand 状态？

**A**: 使用 Zustand DevTools:

```typescript
import { devtools } from 'zustand/middleware'

export const useStore = create(
  devtools(
    set => ({
      // ...
    }),
    { name: 'my-store', enabled: process.env.NODE_ENV === 'development' }
  )
)
```

然后使用 React DevTools 的 "Zustand" 标签查看状态变化历史。

---

## 📝 变更日志

| 版本  | 日期       | 变更内容               |
| ----- | ---------- | ---------------------- |
| 1.0.0 | 2026-03-22 | 初始版本，完成设计方案 |

---

**文档结束**

如有疑问，请联系：

- 📚 咨询师
- 🏗️ 架构师

**状态**: ✅ 设计完成，等待审查
