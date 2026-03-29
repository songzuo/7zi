# 7zi-Frontend 架构优化实施计划

**创建日期**: 2026-03-29
**架构师**: 🏗️ 架构师
**项目版本**: 1.3.0
**基于**: docs/architecture-review.md
**预计工期**: 8 周

---

## 📋 执行摘要

### 总体目标

将 7zi-Frontend 项目从当前架构（评分 6.5/10）提升到更清晰、可维护的架构（目标评分 9/10）。

### 核心改进

| 问题 | 优先级 | 工作量 | 预期收益 |
|------|--------|--------|----------|
| 代码重复 (permissions.ts) | P0 | 2h | 消除维护负担 |
| 状态管理缺失 (Zustand) | P0 | 3天 | 统一状态管理，性能提升 20% |
| lib/ 职责过重 | P1 | 5天 | 架构清晰，职责分明 |
| 高耦合文件 (>500行) | P1 | 4天 | 可维护性提升 |

### 工作量估算

| 阶段 | 工作量 | 里程碑 |
|------|--------|--------|
| Phase 1: 清理与基础 | 2天 | 消除技术债务 |
| Phase 2: 状态管理 | 5天 | 统一状态管理 |
| Phase 3: 架构优化 | 5天 | 代码质量提升 |
| Phase 4: 扩展性增强 | 3天 | 可扩展性提升 |
| **总计** | **15天** | **架构评分 9/10** |

---

## 问题 1: 代码重复 - permissions.ts

### 问题描述

`permissions.ts` 文件在两个位置完全相同：
- `src/lib/permissions.ts`
- `src/features/auth/lib/permissions.ts`

### 影响评估

- **维护成本**: 每次更新需要同步两个文件
- **审查困惑**: 开发者不知道应该修改哪个文件
- **代码体积**: 983 行代码重复

### 解决方案

保留 `features/auth/lib/permissions.ts`，删除 `lib/permissions.ts`，统一从 `@/features/auth/lib/permissions` 导入。

### 实施步骤

#### Step 1.1: 分析依赖关系 (30 分钟)

```bash
# 查找所有导入 permissions.ts 的文件
cd /root/.openclaw/workspace/7zi-frontend
grep -r "from.*permissions" src/
grep -r "import.*permissions" src/

# 预期输出分析：
# - lib/permissions.ts 被导入的文件列表
# - features/auth/lib/permissions.ts 被导入的文件列表
```

**输出文档**: `docs/permissions-dependencies.md`

#### Step 1.2: 更新导入路径 (1 小时)

```bash
# 批量替换导入路径
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  's|from "@/lib/permissions"|from "@/features/auth/lib/permissions"|g'

# 验证替换
grep -r "@/lib/permissions" src/
# 应该无输出
```

**手动检查文件**:
- `src/lib/auth.ts`
- `src/middleware.ts`
- 所有 API routes

#### Step 1.3: 删除重复文件 (15 分钟)

```bash
# 备份（可选）
cp src/lib/permissions.ts src/lib/permissions.ts.backup

# 删除重复文件
rm src/lib/permissions.ts

# 验证删除
ls -la src/lib/permissions.ts  # 应该不存在
ls -la src/features/auth/lib/permissions.ts  # 应该存在
```

#### Step 1.4: 运行测试 (30 分钟)

```bash
# TypeScript 编译检查
npm run type-check

# 单元测试
npm run test:unit

# 构建
npm run build

# 如果失败，回滚：
# cp src/lib/permissions.ts.backup src/lib/permissions.ts
```

### 验收标准

- ✅ 无代码重复
- ✅ 所有导入指向 `@/features/auth/lib/permissions`
- ✅ TypeScript 编译通过
- ✅ 所有测试通过
- ✅ 构建成功

### 风险缓解

| 风险 | 概率 | 缓解措施 |
|------|------|----------|
| 导入路径错误 | 低 | TypeScript 编译会立即发现 |
| 运行时错误 | 极低 | 完整测试覆盖 |
| 破坏性更改 | 无 | 只是文件移动，逻辑不变 |

### 工作量估算

| 步骤 | 时间 |
|------|------|
| 依赖分析 | 30 分钟 |
| 更新导入 | 1 小时 |
| 删除文件 | 15 分钟 |
| 测试验证 | 30 分钟 |
| **总计** | **2 小时** |

---

## 问题 2: 状态管理缺失 - Zustand

### 问题描述

- Zustand 4.5.0 已安装但未充分利用
- 只有一个 Context: ThemeContext
- 组件间通过 props 和自定义 Hooks 共享状态
- WebSocket 状态分散在多个组件中

### 当前状态管理方式

| 状态类型 | 管理方式 | 问题 |
|----------|----------|------|
| 主题 | Context | ✅ 良好，保留 |
| 通知 | 自定义 Hook | 无法跨组件共享 |
| WebSocket | 自定义 Hook | 状态分散 |
| 用户认证 | 未全局管理 | ❌ 缺失 |
| 权限 | 未全局管理 | ❌ 缺失 |
| 应用设置 | 未全局管理 | ❌ 缺失 |

### 解决方案

实施基于 Zustand 的统一状态管理架构，创建以下 Stores:

1. `auth-store.ts` - 认证与用户状态
2. `notification-store.ts` - 通知状态
3. `websocket-store.ts` - WebSocket 连接状态
4. `app-store.ts` - 应用全局设置

### 实施步骤

#### Step 2.1: 创建 Store 架构 (半天)

```bash
# 创建 stores 目录
mkdir -p src/stores

# 创建统一导出文件
touch src/stores/index.ts
```

**文件结构**:
```
src/stores/
├── index.ts              # 统一导出
├── auth-store.ts        # 认证状态
├── notification-store.ts # 通知状态
├── websocket-store.ts   # WebSocket 状态
├── app-store.ts        # 应用设置
└── __tests__/          # 测试
```

**实现 auth-store.ts**:

```typescript
// src/stores/auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface AuthState {
  // 状态
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // 操作
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // 登录
      login: async (email, password) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            throw new Error('Login failed');
          }

          const { user, token } = await response.json();

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
        }
      },

      // 登出
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // 更新用户资料
      updateProfile: (data) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...data } });
        }
      },

      // 清除错误
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage', // LocalStorage key
      partialize: (state) => ({
        // 只持久化用户和 token
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

**实现 notification-store.ts**:

```typescript
// src/stores/notification-store.ts
import { create } from 'zustand';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  read: boolean;
  timestamp: number;
  action?: {
    label: string;
    handler: () => void;
  };
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  maxNotifications: number;

  // 操作
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  maxNotifications: 100,

  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      read: false,
      timestamp: Date.now(),
    };

    set((state) => {
      const updated = [newNotification, ...state.notifications].slice(
        0,
        state.maxNotifications
      );

      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });

    // 自动消失（5 秒后，仅成功和消息类型）
    if (notification.type === 'success' || notification.type === 'info') {
      setTimeout(() => {
        get().removeNotification(newNotification.id);
      }, 5000);
    }
  },

  removeNotification: (id) => {
    set((state) => {
      const updated = state.notifications.filter((n) => n.id !== id);
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },

  markAsRead: (id) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  clearAll: () => {
    set({
      notifications: [],
      unreadCount: 0,
    });
  },
}));
```

**实现 websocket-store.ts**:

```typescript
// src/stores/websocket-store.ts
import { create } from 'zustand';
import type { Socket } from 'socket.io-client';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface WebSocketMessage {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
}

interface WebSocketState {
  // 连接状态
  status: ConnectionStatus;
  socket: Socket | null;
  lastPing: number;
  latency: number;

  // 消息
  messages: WebSocketMessage[];

  // 操作
  connect: () => void;
  disconnect: () => void;
  sendMessage: (type: string, payload: any) => void;
  clearMessages: () => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  status: 'disconnected',
  socket: null,
  lastPing: 0,
  latency: 0,
  messages: [],

  connect: () => {
    set({ status: 'connecting' });

    // 动态导入 socket.io-client（避免服务端渲染问题）
    import('socket.io-client').then(({ io }) => {
      const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on('connect', () => {
        set({ status: 'connected' });
        console.log('WebSocket connected');
      });

      socket.on('disconnect', () => {
        set({ status: 'disconnected' });
        console.log('WebSocket disconnected');
      });

      socket.on('connect_error', (error) => {
        set({ status: 'error' });
        console.error('WebSocket error:', error);
      });

      socket.on('ping', () => {
        const now = Date.now();
        set({
          lastPing: now,
          latency: now - (get().lastPing || now),
        });
      });

      socket.on('message', (data) => {
        set((state) => ({
          messages: [
            {
              id: crypto.randomUUID(),
              type: data.type,
              payload: data.payload,
              timestamp: Date.now(),
            },
            ...state.messages,
          ].slice(0, 100), // 保留最近 100 条
        }));
      });

      set({ socket });
    });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, status: 'disconnected' });
    }
  },

  sendMessage: (type, payload) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('message', { type, payload });
    }
  },

  clearMessages: () => {
    set({ messages: [] });
  },
}));
```

**实现 app-store.ts**:

```typescript
// src/stores/app-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // UI 状态
  sidebarOpen: boolean;
  darkMode: boolean;
  language: string;

  // 用户偏好
  pageSize: number;
  autoRefresh: boolean;
  refreshInterval: number;

  // 操作
  toggleSidebar: () => void;
  setDarkMode: (enabled: boolean) => void;
  setLanguage: (lang: string) => void;
  setPageSize: (size: number) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      darkMode: false,
      language: 'en',
      pageSize: 20,
      autoRefresh: false,
      refreshInterval: 30000, // 30 秒

      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      setDarkMode: (enabled) => {
        set({ darkMode: enabled });
      },

      setLanguage: (lang) => {
        set({ language: lang });
      },

      setPageSize: (size) => {
        set({ pageSize: size });
      },

      setAutoRefresh: (enabled) => {
        set({ autoRefresh: enabled });
      },

      setRefreshInterval: (interval) => {
        set({ refreshInterval: interval });
      },
    }),
    {
      name: 'app-storage',
    }
  )
);
```

**统一导出**:

```typescript
// src/stores/index.ts
export { useAuthStore } from './auth-store';
export { useNotificationStore } from './notification-store';
export { useWebSocketStore } from './websocket-store';
export { useAppStore } from './app-store';

// 类型导出
export type { User } from './auth-store';
export type { Notification } from './notification-store';
export type { WebSocketMessage } from './websocket-store';
```

#### Step 2.2: 迁移认证状态 (1 天)

**目标**: 替换 `hooks/useAuth` 为 `useAuthStore`

**步骤**:

1. 查找所有使用 `useAuth` 的组件
2. 逐个组件迁移到 `useAuthStore`
3. 测试每个迁移的组件

**示例迁移**:

```typescript
// ❌ 旧代码 (hooks/useAuth.ts)
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    // ... 登录逻辑
  };

  const logout = () => {
    setUser(null);
  };

  return { user, isLoading, error, login, logout };
}

// ✅ 新代码 (使用 Zustand)
import { useAuthStore } from '@/stores';

function LoginComponent() {
  const { user, isLoading, error, login, logout } = useAuthStore();

  return (
    // ... UI
  );
}
```

**迁移清单**:
- [ ] `app/login/page.tsx`
- [ ] `components/navbar/Navbar.tsx`
- [ ] `app/admin/page.tsx`
- [ ] 所有 API routes

#### Step 2.3: 迁移通知状态 (1 天)

**目标**: 替换 `hooks/useNotifications` 为 `useNotificationStore`

**步骤**:

1. 查找所有使用 `useNotifications` 的组件
2. 逐个组件迁移
3. 测试通知功能

**示例迁移**:

```typescript
// ❌ 旧代码
const { notifications, add, remove } = useNotifications();

// ✅ 新代码
import { useNotificationStore } from '@/stores';

const { notifications, addNotification, removeNotification } = useNotificationStore();

// 发送通知
addNotification({
  type: 'success',
  title: 'Success',
  message: 'Operation completed successfully',
});
```

**迁移清单**:
- [ ] `components/notifications/NotificationCenter.tsx`
- [ ] `app/feedback/page.tsx`
- [ ] 所有需要通知的组件

#### Step 2.4: 迁移 WebSocket 状态 (1 天)

**目标**: 统一 WebSocket 连接管理

**步骤**:

1. 查找所有使用 `useWebSocketStatus` 的组件
2. 迁移到 `useWebSocketStore`
3. 确保只有一个全局 WebSocket 连接

**示例迁移**:

```typescript
// ❌ 旧代码 (每个组件独立连接)
const { status, connect, disconnect } = useWebSocketStatus();

// ✅ 新代码 (全局连接)
import { useWebSocketStore } from '@/stores';

const { status, connect, disconnect, messages } = useWebSocketStore();

// 在应用启动时连接一次
useEffect(() => {
  connect();
  return () => disconnect();
}, []);
```

**迁移清单**:
- [ ] `components/websocket/WebSocketStatus.tsx`
- [ ] `app/websocket-status-demo/page.tsx`
- [ ] `components/websocket/RealtimeMonitor.tsx`

#### Step 2.5: 删除旧的自定义 Hooks (半天)

```bash
# 备份（可选）
mkdir -p src/hooks/backup
mv src/hooks/useAuth.ts src/hooks/backup/
mv src/hooks/useNotifications.ts src/hooks/backup/
mv src/hooks/useWebSocketStatus.ts src/hooks/backup/

# 验证无引用
grep -r "useAuth\|useNotifications\|useWebSocketStatus" src/
# 应该只有注释或备份中的引用
```

#### Step 2.6: 测试与验证 (半天)

```bash
# 单元测试
npm run test:unit

# E2E 测试
npm run test:e2e

# 构建
npm run build

# 性能测试
npm run test:perf
```

### 验收标准

- ✅ 所有状态通过 Zustand 管理
- ✅ 无重复的状态管理逻辑
- ✅ 性能提升 > 20%
- ✅ 所有测试通过
- ✅ 构建成功

### 风险缓解

| 风险 | 概率 | 缓解措施 |
|------|------|----------|
| 迁移破坏功能 | 中 | 逐步迁移，完整测试 |
| 性能回归 | 低 | 性能基准测试 |
| 状态丢失 | 极低 | Zustand persist 中间件 |
| 开发体验下降 | 极低 | Zustand 开发工具 |

### 工作量估算

| 步骤 | 时间 |
|------|------|
| 创建 Store 架构 | 0.5 天 |
| 迁移认证状态 | 1 天 |
| 迁移通知状态 | 1 天 |
| 迁移 WebSocket | 1 天 |
| 删除旧 Hooks | 0.5 天 |
| 测试验证 | 0.5 天 |
| **总计** | **4.5 天** |

---

## 问题 3: lib/ 职责过重

### 问题描述

`lib/` 目录包含 35+ 文件，职责混杂：
- 认证逻辑 (`auth.ts`)
- 权限控制 (`permissions.ts`)
- WebSocket 管理 (`websocket-manager.ts`)
- 以及通用的工具函数

### 当前结构问题

```
lib/
├── auth/                    # 认证工具 ← 与 features/auth 重复
├── services/                # 业务服务 ← 应在 features 下
├── monitoring/               # 监控工具 ← 与 features/monitoring 重复
├── rate-limit/               # 限流工具 ← 与 features/rate-limit 重复
├── audit/                    # 审计工具 ← 与 features/audit 重复
├── auth.ts                  # 认证逻辑 ← 应迁移
├── permissions.ts           # 权限控制 ← 应迁移（已在问题1处理）
├── websocket-manager.ts     # WebSocket ← 应迁移
├── socket.ts                # Socket 配置 ← 应迁移
├── logger.ts                # ✅ 保留（通用工具）
├── validation.ts            # ✅ 保留（通用工具）
└── ...
```

### 解决方案

将 `lib/` 目录简化为只保留真正的共享工具，将业务逻辑迁移到对应的 `features/` 目录。

### 目标结构

```
lib/
├── logger.ts                # 日志工具
├── validation.ts            # 验证工具
├── errors.ts                # 错误处理
├── performance/             # 性能工具
│   ├── measure.ts
│   └── debounce.ts
├── i18n/                    # 国际化工具
│   ├── translator.ts
│   └── locales.ts
├── seo/                     # SEO 工具
│   └── metadata.ts
└── utils/
    ├── date.ts
    ├── format.ts
    └── math.ts

features/
├── auth/
│   ├── lib/
│   │   ├── auth.ts          # 从 lib/ 迁移
│   │   └── permissions.ts   # 从 lib/ 迁移（已完成）
│   ├── components/
│   ├── hooks/
│   ├── store/
│   └── api/
├── websocket/
│   ├── lib/
│   │   ├── socket.ts        # 从 lib/ 迁移
│   │   └── websocket-manager.ts  # 从 lib/ 迁移
│   ├── components/
│   ├── hooks/
│   └── store/
├── monitoring/
│   ├── lib/
│   │   └── metrics.ts       # 从 lib/monitoring/ 迁移
│   └── ...
├── rate-limit/
│   ├── lib/
│   │   └── limiter.ts       # 从 lib/rate-limit/ 迁移
│   └── ...
└── audit/
    ├── lib/
    │   └── logger.ts        # 从 lib/audit/ 迁移
    └── ...
```

### 实施步骤

#### Step 3.1: 分析 lib/ 目录 (半天)

```bash
# 分析 lib/ 目录结构
cd /root/.openclaw/workspace/7zi-frontend

# 列出所有文件
find src/lib -type f -name "*.ts" -o -name "*.tsx" | sort

# 分析依赖关系
# 使用 ts-morph 或手动分析每个文件的导入/导出

# 生成文件清单
tree src/lib -I node_modules > docs/lib-directory-analysis.md
```

**分类文件**:

| 文件 | 职责 | 目标位置 |
|------|------|----------|
| `auth.ts` | 认证逻辑 | `features/auth/lib/` |
| `permissions.ts` | 权限控制 | `features/auth/lib/` (已处理) |
| `websocket-manager.ts` | WebSocket 管理 | `features/websocket/lib/` |
| `socket.ts` | Socket 配置 | `features/websocket/lib/` |
| `logger.ts` | 日志工具 | `lib/` (保留) |
| `validation.ts` | 验证工具 | `lib/` (保留) |
| `lib/monitoring/*` | 监控工具 | `features/monitoring/lib/` |
| `lib/rate-limit/*` | 限流工具 | `features/rate-limit/lib/` |
| `lib/audit/*` | 审计工具 | `features/audit/lib/` |
| `lib/services/*` | 业务服务 | 对应 features |

**输出文档**: `docs/lib-migration-plan.md`

#### Step 3.2: 迁移 auth 相关文件 (1 天)

**步骤**:

1. 创建目标目录
2. 移动文件
3. 更新导入路径
4. 测试

```bash
# 1. 创建目标目录
mkdir -p src/features/auth/lib

# 2. 移动文件
mv src/lib/auth.ts src/features/auth/lib/auth.ts

# 3. 更新导入路径
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  's|from "@/lib/auth"|from "@/features/auth/lib/auth"|g'

# 4. 验证
grep -r "@/lib/auth" src/  # 应该无输出

# 5. 测试
npm run type-check
npm run test:unit
npm run build
```

#### Step 3.3: 迁移 websocket 相关文件 (1 天)

```bash
# 1. 创建目标目录
mkdir -p src/features/websocket/lib

# 2. 移动文件
mv src/lib/websocket-manager.ts src/features/websocket/lib/websocket-manager.ts
mv src/lib/socket.ts src/features/websocket/lib/socket.ts

# 3. 更新导入路径
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  's|from "@/lib/websocket-manager"|from "@/features/websocket/lib/websocket-manager"|g'

find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  's|from "@/lib/socket"|from "@/features/websocket/lib/socket"|g'

# 4. 验证
grep -r "@/lib/websocket-manager\|@/lib/socket" src/  # 应该无输出

# 5. 测试
npm run type-check
npm run test:unit
npm run build
```

#### Step 3.4: 迁移 monitoring 相关文件 (0.5 天)

```bash
# 1. 创建目标目录
mkdir -p src/features/monitoring/lib

# 2. 移动目录
mv src/lib/monitoring/* src/features/monitoring/lib/

# 3. 更新导入路径
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  's|from "@/lib/monitoring/|from "@/features/monitoring/lib/|g'

# 4. 删除空目录
rmdir src/lib/monitoring

# 5. 测试
npm run type-check
npm run test:unit
```

#### Step 3.5: 迁移 rate-limit 相关文件 (0.5 天)

```bash
# 1. 创建目标目录
mkdir -p src/features/rate-limit/lib

# 2. 移动目录
mv src/lib/rate-limit/* src/features/rate-limit/lib/

# 3. 更新导入路径
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  's|from "@/lib/rate-limit/|from "@/features/rate-limit/lib/|g'

# 4. 删除空目录
rmdir src/lib/rate-limit

# 5. 测试
npm run type-check
npm run test:unit
```

#### Step 3.6: 迁移 audit 相关文件 (0.5 天)

```bash
# 1. 创建目标目录
mkdir -p src/features/audit/lib

# 2. 移动目录
mv src/lib/audit/* src/features/audit/lib/

# 3. 更新导入路径
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  's|from "@/lib/audit/|from "@/features/audit/lib/|g'

# 4. 删除空目录
rmdir src/lib/audit

# 5. 测试
npm run type-check
npm run test:unit
```

#### Step 3.7: 迁移 services 相关文件 (0.5 天)

**分析**: `lib/services/` 目录包含多个业务服务，需要逐个分析并迁移到对应的 feature。

```bash
# 1. 列出所有服务
ls src/lib/services/

# 2. 分析每个服务的职责
# 例如：
# - notification-service.ts → features/notifications/
# - audit-service.ts → features/audit/
# - project-service.ts → features/projects/ (如果存在)

# 3. 逐个迁移
# 示例：迁移通知服务
mkdir -p src/features/notifications/lib/services
mv src/lib/services/notification-service.ts src/features/notifications/lib/services/notification-service.ts

# 4. 更新导入
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  's|from "@/lib/services/notification-service"|from "@/features/notifications/lib/services/notification-service"|g'

# 5. 测试
npm run type-check
npm run test:unit
```

#### Step 3.8: 清理 lib/ 目录 (0.5 天)

**保留的文件**:

```
lib/
├── logger.ts                # 日志工具
├── validation.ts            # 验证工具
├── errors.ts                # 错误处理（需要创建）
├── performance/             # 性能工具（需要组织）
├── i18n/                    # 国际化工具
├── seo/                     # SEO 工具
└── utils/
    ├── date.ts
    ├── format.ts
    └── math.ts
```

**创建缺失的文件**:

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super('AUTH_ERROR', message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Not authorized') {
    super('AUTHZ_ERROR', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}
```

**组织性能工具**:

```bash
# 创建性能工具目录
mkdir -p src/lib/performance

# 移动或创建性能相关工具
# - debounce.ts
# - throttle.ts
# - measure.ts
```

#### Step 3.9: 更新所有导入路径 (0.5 天)

```bash
# 批量更新所有可能的导入路径
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  's|from "@/lib/monitoring|from "@/features/monitoring/lib|g'

find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  's|from "@/lib/rate-limit|from "@/features/rate-limit/lib|g'

find src -name "*.ts" -o -name "*.tsx" | xargs sed -i \
  's|from "@/lib/audit|from "@/features/audit/lib|g'

# 验证
npm run type-check
```

#### Step 3.10: 测试与验证 (0.5 天)

```bash
# TypeScript 编译
npm run type-check

# 单元测试
npm run test:unit

# E2E 测试
npm run test:e2e

# 构建
npm run build

# 检查 lib/ 目录
tree src/lib -L 2
```

### 验收标准

- ✅ `lib/` 只包含真正的共享工具
- ✅ 业务逻辑都在 `features/` 下
- ✅ 所有导入路径正确
- ✅ 所有测试通过
- ✅ 构建成功

### 风险缓解

| 风险 | 概率 | 缓解措施 |
|------|------|----------|
| 导入路径错误 | 中 | TypeScript 编译检查 |
| 迁移遗漏 | 低 | 完整测试覆盖 |
| 破坏性更改 | 低 | 逐步迁移，每次都测试 |
| 循环依赖 | 低 | 迁移后检查 |

### 工作量估算

| 步骤 | 时间 |
|------|------|
| 分析 lib/ 目录 | 0.5 天 |
| 迁移 auth 相关 | 1 天 |
| 迁移 websocket 相关 | 1 天 |
| 迁移 monitoring | 0.5 天 |
| 迁移 rate-limit | 0.5 天 |
| 迁移 audit | 0.5 天 |
| 迁移 services | 0.5 天 |
| 清理 lib/ | 0.5 天 |
| 测试验证 | 0.5 天 |
| **总计** | **5.5 天** |

---

## 问题 4: 高耦合文件

### 问题描述

多个文件超过 500 行，复杂度过高：

| 文件 | 行数 | 位置 | 问题 |
|------|------|------|------|
| `permissions.ts` | 983 | features/auth/lib/ | RBAC 系统过于复杂 |
| `FeedbackAdminPanel.tsx` | 933 | components/ | 组件职责过多 |
| `websocket-manager.ts` | 685 | features/websocket/lib/ | 类职责过多 |
| `notification-enhanced.ts` | 627 | features/ | 服务逻辑复杂 |

### 解决方案

将大型文件拆分为多个模块，每个文件 < 500 行。

### 实施步骤

#### Step 4.1: 拆分 permissions.ts (1 天)

**当前问题**: `permissions.ts` (983 行) 包含：
- 15+ 资源类型枚举
- 30+ 权限枚举
- 8+ 角色枚举
- 复杂的权限检查类
- 中间件
- 装饰器

**目标结构**:

```
features/auth/permissions/
├── types.ts              # 类型定义 (~100 行)
├── permissions.ts         # 权限枚举 (~150 行)
├── roles.ts              # 角色定义 (~100 行)
├── checker.ts            # 权限检查逻辑 (~200 行)
├── middleware.ts          # 中间件 (~150 行)
├── decorators.ts         # 装饰器 (~100 行)
├── helpers.ts            # 辅助函数 (~100 行)
└── index.ts              # 导出 (~50 行)
```

**实施**:

```bash
# 1. 创建目录
mkdir -p src/features/auth/permissions

# 2. 拆分文件
# 从 permissions.ts 中提取各个部分到新文件

# types.ts
# - ResourceType 枚举
# - PermissionType 类型
# - PermissionCheckResult 接口

# permissions.ts
# - Permission 枚举
# - ResourceAction 枚举

# roles.ts
# - UserRole 枚举
# - RolePermissions 映射

# checker.ts
# - Permissions 类
# - hasPermission 方法
# - checkPermission 函数

# middleware.ts
# - withPermissions 高阶组件
# - PermissionBoundary 组件

# decorators.ts
# - @RequirePermission 装饰器
# - @RequireRole 装饰器

# helpers.ts
# - parsePermissionString
# - formatPermission
# - 比较辅助函数

# 3. 更新导入
# 从 "@/features/auth/lib/permissions"
# 改为 "@/features/auth/permissions"

# 4. 测试
npm run test:unit
npm run type-check
```

#### Step 4.2: 拆分 FeedbackAdminPanel.tsx (1 天)

**当前问题**: `FeedbackAdminPanel.tsx` (933 行) 包含：
- 表单渲染
- 数据获取
- 数据编辑
- 删除逻辑
- 过滤/搜索
- 分页
- 统计

**目标结构**:

```
components/feedback/
├── FeedbackAdminPanel.tsx    # 主组件 (~150 行)
├── FeedbackList.tsx         # 列表组件 (~200 行)
├── FeedbackForm.tsx         # 表单组件 (~200 行)
├── FeedbackFilter.tsx      # 过滤器 (~100 行)
├── FeedbackStats.tsx       # 统计组件 (~100 行)
├── useFeedbackData.ts      # 数据 Hook (~150 行)
└── types.ts                # 类型定义 (~50 行)
```

**实施**:

```typescript
// components/feedback/useFeedbackData.ts
export function useFeedbackData() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedbacks = async (filters?: FeedbackFilters) => {
    setLoading(true);
    try {
      const response = await fetch('/api/feedback?' + new URLSearchParams(filters));
      const data = await response.json();
      setFeedbacks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteFeedback = async (id: string) => {
    await fetch(`/api/feedback/${id}`, { method: 'DELETE' });
    setFeedbacks(feedbacks.filter(f => f.id !== id));
  };

  const updateFeedback = async (id: string, data: Partial<Feedback>) => {
    const response = await fetch(`/api/feedback/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    const updated = await response.json();
    setFeedbacks(feedbacks.map(f => f.id === id ? updated : f));
  };

  return {
    feedbacks,
    loading,
    error,
    fetchFeedbacks,
    deleteFeedback,
    updateFeedback,
  };
}

// components/feedback/FeedbackAdminPanel.tsx
export function FeedbackAdminPanel() {
  const { feedbacks, loading, fetchFeedbacks } = useFeedbackData();
  const [filters, setFilters] = useState<FeedbackFilters>({});

  useEffect(() => {
    fetchFeedbacks(filters);
  }, [filters]);

  return (
    <div className="feedback-admin-panel">
      <FeedbackStats feedbacks={feedbacks} />
      <FeedbackFilter filters={filters} onFilterChange={setFilters} />
      <FeedbackList feedbacks={feedbacks} />
    </div>
  );
}
```

#### Step 4.3: 拆分 websocket-manager.ts (0.5 天)

**当前问题**: `websocket-manager.ts` (685 行) 包含：
- 连接管理
- 消息处理
- 重连逻辑
- 心跳检测
- 事件订阅
- 错误处理

**目标结构**:

```
features/websocket/lib/
├── websocket-manager.ts     # 主管理器 (~200 行)
├── connection-manager.ts    # 连接管理 (~150 行)
├── message-handler.ts       # 消息处理 (~150 行)
├── reconnection-strategy.ts # 重连策略 (~100 行)
├── heartbeat.ts            # 心跳检测 (~80 行)
└── types.ts                # 类型定义 (~50 行)
```

**实施**:

```typescript
// features/websocket/lib/connection-manager.ts
export class ConnectionManager {
  private socket: Socket | null = null;
  private status: ConnectionStatus = 'disconnected';

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(url);
      this.socket.on('connect', () => {
        this.status = 'connected';
        resolve();
      });
      this.socket.on('connect_error', (error) => {
        this.status = 'error';
        reject(error);
      });
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.status = 'disconnected';
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }
}

// features/websocket/lib/websocket-manager.ts
export class WebSocketManager {
  private connection: ConnectionManager;
  private messageHandler: MessageHandler;
  private reconnection: ReconnectionStrategy;

  constructor() {
    this.connection = new ConnectionManager();
    this.messageHandler = new MessageHandler();
    this.reconnection = new ReconnectionStrategy();
  }

  async connect(url: string): Promise<void> {
    await this.connection.connect(url);
    this.reconnection.start(() => this.connection.connect(url));
  }

  disconnect(): void {
    this.reconnection.stop();
    this.connection.disconnect();
  }

  // ... 其他方法
}
```

#### Step 4.4: 拆分 notification-enhanced.ts (0.5 天)

**当前问题**: `notification-enhanced.ts` (627 行) 包含：
- 通知存储
- 通知获取
- 通知标记
- 通知删除
- 批量操作
- 过滤逻辑
- 统计逻辑

**目标结构**:

```
features/notifications/lib/
├── notification-service.ts     # 主服务 (~150 行)
├── notification-storage.ts     # 存储管理 (~150 行)
├── notification-filters.ts     # 过滤逻辑 (~100 行)
├── notification-actions.ts      # 批量操作 (~100 行)
├── notification-stats.ts       # 统计逻辑 (~80 行)
└── types.ts                    # 类型定义 (~50 行)
```

#### Step 4.5: 测试与验证 (1 天)

```bash
# 对每个拆分后的模块运行测试
npm run test:unit -- src/features/auth/permissions/
npm run test:unit -- src/components/feedback/
npm run test:unit -- src/features/websocket/lib/
npm run test:unit -- src/features/notifications/lib/

# 完整测试套件
npm run test:unit
npm run test:e2e

# 构建验证
npm run build

# 代码行数检查
# 确保所有文件 < 500 行
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 500 { print $0 }'
# 应该无输出
```

### 验收标准

- ✅ 所有文件 < 500 行
- ✅ 职责清晰分离
- ✅ 模块可独立测试
- ✅ 所有测试通过
- ✅ 构建成功

### 风险缓解

| 风险 | 概率 | 缓解措施 |
|------|------|----------|
| 拆分破坏功能 | 中 | 完整测试覆盖 |
| 循环依赖 | 低 | 模块依赖检查 |
| 性能下降 | 极低 | 模块化不影响性能 |
| 测试遗漏 | 低 | 增量测试 |

### 工作量估算

| 步骤 | 时间 |
|------|------|
| 拆分 permissions.ts | 1 天 |
| 拆分 FeedbackAdminPanel.tsx | 1 天 |
| 拆分 websocket-manager.ts | 0.5 天 |
| 拆分 notification-enhanced.ts | 0.5 天 |
| 测试验证 | 1 天 |
| **总计** | **4 天** |

---

## 综合实施计划

### 时间线

```
Week 1-2 (Phase 1): 清理与基础
  ├─ Day 1: 问题1 - 代码重复 (2h)
  ├─ Day 1-3: 问题2.1 - 创建 Store 架构 (0.5d)
  ├─ Day 2-3: 问题2.2 - 迁移认证状态 (1d)
  ├─ Day 3-4: 问题2.3 - 迁移通知状态 (1d)
  ├─ Day 4-5: 问题2.4 - 迁移 WebSocket (1d)
  ├─ Day 5: 问题2.5 - 删除旧 Hooks (0.5d)
  ├─ Day 5: 问题2.6 - 测试验证 (0.5d)
  └─ 里程碑: 消除技术债务 ✅

Week 3-5 (Phase 2): 状态管理迁移
  ├─ Week 3: 问题3.1 - 分析 lib/ (0.5d)
  ├─ Week 3-4: 问题3.2 - 迁移 auth (1d)
  ├─ Week 4: 问题3.3 - 迁移 websocket (1d)
  ├─ Week 4: 问题3.4 - 迁移 monitoring (0.5d)
  ├─ Week 4: 问题3.5 - 迁移 rate-limit (0.5d)
  ├─ Week 5: 问题3.6 - 迁移 audit (0.5d)
  ├─ Week 5: 问题3.7 - 迁移 services (0.5d)
  ├─ Week 5: 问题3.8 - 清理 lib/ (0.5d)
  ├─ Week 5: 问题3.9 - 更新导入 (0.5d)
  ├─ Week 5: 问题3.10 - 测试验证 (0.5d)
  └─ 里程碑: lib/ 清理完成 ✅

Week 6-7 (Phase 3): 架构优化
  ├─ Week 6: 问题4.1 - 拆分 permissions (1d)
  ├─ Week 6-7: 问题4.2 - 拆分 FeedbackAdminPanel (1d)
  ├─ Week 7: 问题4.3 - 拆分 websocket-manager (0.5d)
  ├─ Week 7: 问题4.4 - 拆分 notification-enhanced (0.5d)
  ├─ Week 7: 问题4.5 - 测试验证 (1d)
  └─ 里程碑: 文件拆分完成 ✅

Week 8 (Phase 4): 收尾与优化
  ├─ 最终测试验证 (1d)
  ├─ 性能基准测试 (0.5d)
  ├─ 文档更新 (1d)
  ├─ 代码审查 (0.5d)
  └─ 里程碑: 架构优化完成 ✅
```

### 优先级排序

| 问题 | 优先级 | 工期 | 依赖 |
|------|--------|------|------|
| 问题1: 代码重复 | P0 | 2h | 无 |
| 问题2: 状态管理 | P0 | 4.5d | 无 |
| 问题3: lib/ 清理 | P1 | 5.5d | 问题1, 问题2 |
| 问题4: 文件拆分 | P1 | 4d | 问题1, 问题2 |

### 关键里程碑

```
✅ M1: Week 2 - 消除技术债务
   - 代码重复已删除
   - Zustand Store 架构已建立
   - 基础测试通过

✅ M2: Week 5 - lib/ 清理完成
   - lib/ 只包含共享工具
   - 所有业务逻辑在 features/
   - 导入路径已更新

✅ M3: Week 7 - 文件拆分完成
   - 所有文件 < 500 行
   - 职责清晰分离
   - 模块可独立测试

✅ M4: Week 8 - 架构优化完成
   - 架构评分 9/10
   - 性能提升 20%
   - 测试覆盖率 > 80%
```

### 资源分配

| 角色 | 工作量 | 主要职责 |
|------|--------|----------|
| 架构师 | 全程 | 设计、规划、审查 |
| 前端工程师 | 80% | 实施、测试、文档 |
| 测试工程师 | 20% | 测试、QA、性能测试 |

### 风险管理

#### 高风险项

**1. 状态管理迁移风险**

- **风险**: 迁移可能破坏现有功能
- **概率**: 中
- **影响**: 高
- **缓解**:
  - 逐步迁移，一次一个模块
  - 完整的单元测试和 E2E 测试
  - 保留旧代码直到完全验证
  - 准备快速回滚方案

**2. lib/ 迁移风险**

- **风险**: 导入路径更新遗漏
- **概率**: 中
- **影响**: 中
- **缓解**:
  - TypeScript 编译检查
  - 使用自动化工具批量替换
  - 完整的回归测试

**3. 文件拆分风险**

- **风险**: 循环依赖或功能丢失
- **概率**: 低
- **影响**: 中
- **缓解**:
  - 依赖图分析
  - 增量测试
  - 代码审查

#### 回滚计划

**每个阶段的回滚点**:

```bash
# Phase 1 回滚
git revert <commit-hash>

# Phase 2 回滚
git revert <commit-hash-range>

# Phase 3 回滚
git revert <commit-hash-range>

# 完整回滚到起点
git reset --hard <baseline-commit>
```

### 质量保证

#### 测试策略

**1. 单元测试**

```bash
# 覆盖率目标: > 80%
npm run test:unit -- --coverage

# 每个模块的测试
npm run test:unit -- src/stores/
npm run test:unit -- src/features/auth/
npm run test:unit -- src/features/websocket/
```

**2. 集成测试**

```bash
# 测试跨模块交互
npm run test:integration

# 测试 API 端点
npm run test:api
```

**3. E2E 测试**

```bash
# 测试关键用户旅程
npm run test:e2e

# 测试场景:
# - 用户登录
# - 权限检查
# - 通知显示
# - WebSocket 连接
# - 管理面板
```

**4. 性能测试**

```bash
# Web Vitals
npm run test:perf

# 构建大小
npm run build
ls -lh .next/static/chunks/

# 运行时性能
npm run test:lighthouse
```

#### 代码审查清单

- [ ] 代码符合 ESLint 规则
- [ ] TypeScript 无错误
- [ ] 单元测试覆盖率 > 80%
- [ ] 无明显的代码重复
- [ ] 文件大小 < 500 行
- [ ] 导入路径正确
- [ ] 无循环依赖
- [ ] 性能无明显下降
- [ ] 文档已更新

### 监控指标

#### 关键指标 (KPI)

| 指标 | 当前值 | 目标值 | 测量方法 |
|------|--------|--------|----------|
| 架构评分 | 6.5/10 | 9/10 | 架构审查 |
| 代码行数 | ~58,000 | < 55,000 | cloc |
| 文件数量 | ~120 | ~150 | find |
| 测试覆盖率 | ~60% | > 80% | coverage |
| 构建时间 | ~2min | < 1.5min | time npm run build |
| 首屏加载 | ~1.5s | < 1s | Lighthouse |
| 平均文件大小 | N/A | < 500 行 | wc -l |

#### 每日检查

```bash
# 1. 代码行数
cloc src/

# 2. 测试覆盖率
npm run test:unit -- --coverage

# 3. 构建时间
time npm run build

# 4. 性能
npm run test:lighthouse
```

### 文档更新

#### 需要更新的文档

1. **README.md**
   - 更新架构说明
   - 添加状态管理文档
   - 更新目录结构

2. **docs/ARCHITECTURE.md**
   - 更新架构图
   - 添加模块说明
   - 更新依赖关系

3. **docs/API.md**
   - 更新 API 文档
   - 添加 Store API

4. **docs/DEVELOPMENT.md**
   - 更新开发指南
   - 添加测试指南
   - 添加代码规范

5. **CHANGELOG.md**
   - 记录架构变更
   - 记录破坏性更改
   - 记录新特性

### 交付物清单

#### 代码交付物

- [ ] `src/stores/` - Zustand Store 架构
- [ ] `src/lib/` - 清理后的共享工具
- [ ] `src/features/` - 重构后的特征模块
- [ ] 拆分后的大型文件
- [ ] 更新的导入路径
- [ ] 完整的测试套件

#### 文档交付物

- [ ] `docs/architecture-fix-plan.md` - 本文档
- [ ] `docs/architecture-review.md` - 审查报告（已有）
- [ ] `docs/lib-migration-plan.md` - lib/ 迁移计划
- [ ] `docs/permissions-dependencies.md` - 依赖分析
- [ ] `docs/module-specification.md` - 模块规范
- [ ] 更新的 README.md
- [ ] 更新的 CHANGELOG.md

#### 测试交付物

- [ ] 单元测试覆盖率报告
- [ ] E2E 测试报告
- [ ] 性能测试报告
- [ ] 回归测试报告

### 沟通计划

#### 每周站会

**时间**: 每周五 14:00
**时长**: 30 分钟
**参会**: 架构师、前端工程师、测试工程师

**议程**:
1. 本周进度回顾
2. 遇到的问题
3. 下周计划
4. 风险评估

#### 里程碑评审

**时间**: 每个里程碑完成时
**时长**: 1 小时
**参会**: 全团队 + 项目负责人

**议程**:
1. 成果演示
2. 问题总结
3. 经验教训
4. 下一步计划

#### 风险上报

**触发条件**:
- 工期延迟 > 1 天
- 测试失败 > 50%
- 性能下降 > 10%
- 遇到无法解决的技术难题

**上报方式**:
1. 立即通知架构师
2. 24 小时内给出解决方案
3. 必要时召开紧急会议

### 成功标准

#### 必须达成

- ✅ 所有 P0 问题已解决
- ✅ 所有 P1 问题已解决
- ✅ 代码重复已消除
- ✅ Zustand 状态管理已实施
- ✅ lib/ 已清理
- ✅ 所有文件 < 500 行
- ✅ 测试覆盖率 > 80%
- ✅ 所有测试通过
- ✅ 构建成功

#### 期望达成

- 🎯 架构评分 9/10
- 🎯 性能提升 20%
- 🎯 构建时间减少 25%
- 🎯 首屏加载 < 1s

#### 额外收益

- 🌟 代码更易维护
- 🌟 新功能开发更快速
- 🌟 团队协作更高效
- 🌟 文档更完善

---

## 附录

### A. 工具链

```bash
# 代码分析
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin

# 循环依赖检查
npm install -D madge
npx madge --circular src/

# 代码复杂度分析
npm install -D plato
npx plato -r -d report/ src/

# 代码行数统计
npm install -D cloc
npx cloc src/

# 性能分析
npm install -D lighthouse
npx lighthouse http://localhost:3000

# Bundle 分析
ANALYZE=true npm run build
```

### B. 常用命令

```bash
# 开发
npm run dev

# 构建
npm run build

# 测试
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:perf

# 代码检查
npm run lint
npm run type-check

# 格式化
npm run format

# 清理
npm run clean
```

### C. 参考资料

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Next.js Documentation](https://nextjs.org/docs)
- [Feature-Based Architecture](https://featurebasedarchitecture.com/)
- [Clean Code](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
- [Refactoring](https://refactoring.com/)

### D. 联系方式

**架构师**: 🏗️ 架构师
**项目经理**: 主人
**技术支持**: [项目仓库] [文档站点]

---

**文档版本**: 1.0
**创建日期**: 2026-03-29
**最后更新**: 2026-03-29
**下次审查**: 2026-04-05