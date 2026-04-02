# Zustand Store 使用示例

本文档提供了所有 Zustand Store 的使用示例和最佳实践。

---

## 📦 安装和导入

### 导入 Store

```typescript
// 方式 1: 从统一入口导入 (推荐)
import { useAuthStore, useNotificationStore, useAppStore, useWebSocketStore } from '@/stores'

// 方式 2: 从具体 Store 文件导入
import { useAuthStore } from '@/stores/auth-store'
```

---

## 🔐 认证状态管理 (useAuthStore)

### 基础使用

```typescript
import { useAuthStore } from '@/stores';

function LoginButton() {
  const { login, isLoading, error } = useAuthStore();

  const handleLogin = async () => {
    try {
      await login('user@example.com', 'password');
      console.log('登录成功');
    } catch (err) {
      console.error('登录失败:', error);
    }
  };

  return (
    <button onClick={handleLogin} disabled={isLoading}>
      {isLoading ? '登录中...' : '登录'}
    </button>
  );
}
```

### 检查认证状态

```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <div>请先登录</div>;
  }

  return <>{children}</div>;
}
```

### 使用选择器优化性能

```typescript
// ✅ 好的做法 - 只订阅需要的切片
function UserGreeting() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return <div>你好, {user?.name}!</div>;
}

// ❌ 不好的做法 - 订阅整个 store
function UserGreetingBad() {
  const { user, isAuthenticated, token, isLoading, error } = useAuthStore();

  return <div>你好, {user?.name}!</div>;
}
```

### 更新用户信息

```typescript
function ProfileForm() {
  const { user, updateProfile } = useAuthStore();

  const handleUpdate = (name: string) => {
    updateProfile({ name });
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleUpdate('新名字');
    }}>
      <input defaultValue={user?.name} />
      <button type="submit">更新</button>
    </form>
  );
}
```

### 登出

```typescript
function LogoutButton() {
  const { logout } = useAuthStore();

  return <button onClick={logout}>登出</button>;
}
```

---

## 🔔 通知状态管理 (useNotificationStore)

### 使用快捷方法

```typescript
import { useNotificationStore } from '@/stores';

function ActionButtons() {
  const { success, error, warning, info } = useNotificationStore();

  return (
    <div>
      <button onClick={() => success('成功', '操作已完成')}>
        成功通知
      </button>
      <button onClick={() => error('错误', '操作失败')}>
        错误通知
      </button>
      <button onClick={() => warning('警告', '请注意')}>
        警告通知
      </button>
      <button onClick={() => info('信息', '这是信息')}>
        信息通知
      </button>
    </div>
  );
}
```

### 显示未读数量

```typescript
function NotificationBell() {
  const { unreadCount } = useNotificationStore((state) => state.unreadCount);

  return (
    <div className="relative">
      <BellIcon />
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full">
          {unreadCount}
        </span>
      )}
    </div>
  );
}
```

### 显示通知列表

```typescript
function NotificationList() {
  const { notifications, markAsRead, removeNotification } = useNotificationStore(
    (state) => state.notifications
  );

  return (
    <ul>
      {notifications.map((notification) => (
        <li
          key={notification.id}
          className={notification.read ? 'opacity-50' : 'font-bold'}
        >
          <div>{notification.title}</div>
          <div>{notification.message}</div>
          <button onClick={() => markAsRead(notification.id)}>
            标记已读
          </button>
          <button onClick={() => removeNotification(notification.id)}>
            删除
          </button>
        </li>
      ))}
    </ul>
  );
}
```

### 使用过滤器

```typescript
function FilteredNotifications() {
  const { getFilteredNotifications } = useNotificationStore();

  const errorNotifications = getFilteredNotifications({ type: 'error' });
  const unreadNotifications = getFilteredNotifications({ read: false });

  return (
    <div>
      <h3>错误通知</h3>
      {errorNotifications.map((n) => (
        <div key={n.id}>{n.title}</div>
      ))}

      <h3>未读通知</h3>
      {unreadNotifications.map((n) => (
        <div key={n.id}>{n.title}</div>
      ))}
    </div>
  );
}
```

---

## 🌐 WebSocket 状态管理 (useWebSocketStore)

### 连接和断开

```typescript
import { useWebSocketStore } from '@/stores';

function ChatApp() {
  const { status, connect, disconnect, messages } = useWebSocketStore(
    (state) => ({
      status: state.status,
      connect: state.connect,
      disconnect: state.disconnect,
      messages: state.messages,
    })
  );

  useEffect(() => {
    connect('ws://localhost:3000');
    return () => disconnect();
  }, []);

  const statusColor = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500',
    disconnected: 'bg-gray-500',
    error: 'bg-red-500',
    reconnecting: 'bg-orange-500',
  };

  return (
    <div>
      <div className={`w-3 h-3 rounded-full ${statusColor[status]}`} />
      <ul>
        {messages.map((msg) => (
          <li key={msg.id}>
            {msg.direction}: {msg.type}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 发送消息

```typescript
function SendMessage() {
  const { sendMessage, status } = useWebSocketStore();

  const handleClick = () => {
    if (status === 'connected') {
      sendMessage('chat', { text: 'Hello' });
    }
  };

  return <button onClick={handleClick}>发送消息</button>;
}
```

### 显示连接统计

```typescript
function ConnectionStats() {
  const { stats, latency } = useWebSocketStore((state) => ({
    stats: state.stats,
    latency: state.latency,
  }));

  return (
    <div>
      <div>已接收: {stats.messagesReceived}</div>
      <div>已发送: {stats.messagesSent}</div>
      <div>延迟: {latency}ms</div>
    </div>
  );
}
```

---

## 🎨 应用设置管理 (useAppStore)

### 侧边栏控制

```typescript
import { useAppStore } from '@/stores';

function SidebarToggle() {
  const { sidebarOpen, toggleSidebar } = useAppStore((state) => ({
    sidebarOpen: state.settings.sidebarOpen,
    toggleSidebar: state.toggleSidebar,
  }));

  return (
    <button onClick={toggleSidebar}>
      {sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
    </button>
  );
}
```

### 暗色模式切换

```typescript
function ThemeToggle() {
  const { darkMode, toggleDarkMode } = useAppStore((state) => ({
    darkMode: state.settings.darkMode,
    toggleDarkMode: state.toggleDarkMode,
  }));

  return (
    <button onClick={toggleDarkMode}>
      {darkMode ? '🌞 浅色模式' : '🌙 暗色模式'}
    </button>
  );
}
```

### 语言切换

```typescript
function LanguageSelect() {
  const { language, setLanguage } = useAppStore((state) => ({
    language: state.settings.language,
    setLanguage: state.setLanguage,
  }));

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
    >
      <option value="en">English</option>
      <option value="zh">中文</option>
      <option value="ja">日本語</option>
    </select>
  );
}
```

### 分页设置

```typescript
function PageSizeSelect() {
  const { pageSize, setPageSize } = useAppStore((state) => ({
    pageSize: state.settings.pageSize,
    setPageSize: state.setPageSize,
  }));

  return (
    <select
      value={pageSize}
      onChange={(e) => setPageSize(Number(e.target.value))}
    >
      <option value="10">10 条/页</option>
      <option value="20">20 条/页</option>
      <option value="50">50 条/页</option>
      <option value="100">100 条/页</option>
    </select>
  );
}
```

### 全局加载状态

```typescript
function DataLoader() {
  const { setGlobalLoading } = useAppStore();

  const loadData = async () => {
    setGlobalLoading(true, '正在加载数据...');

    try {
      await fetchSomeData();
    } finally {
      setGlobalLoading(false);
    }
  };

  return <button onClick={loadData}>加载数据</button>;
}

function GlobalLoading() {
  const { isGlobalLoading, globalLoadingMessage } = useAppStore((state) => ({
    isGlobalLoading: state.isGlobalLoading,
    globalLoadingMessage: state.globalLoadingMessage,
  }));

  if (!isGlobalLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-4 rounded shadow">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 rounded-full" />
        <p>{globalLoadingMessage}</p>
      </div>
    </div>
  );
}
```

---

## 🔧 最佳实践

### 1. 使用选择器避免不必要的重渲染

```typescript
// ❌ 不好 - 整个 store 变化都会触发重渲染
function MyComponent() {
  const { user, notifications, sidebarOpen } = useAppStore()
  // ...
}

// ✅ 好 - 只订阅需要的切片
function MyComponent() {
  const user = useAuthStore(state => state.user)
  const notifications = useNotificationStore(state => state.notifications)
  const sidebarOpen = useAppStore(state => state.settings.sidebarOpen)
  // ...
}
```

### 2. 使用浅比较

```typescript
import { shallow } from 'zustand/shallow'

// ✅ 多个属性使用浅比较
function MyComponent() {
  const { user, token } = useAuthStore(
    state => ({
      user: state.user,
      token: state.token,
    }),
    shallow
  )
  // ...
}
```

### 3. 避免在渲染中调用 action

```typescript
// ❌ 不好 - 每次渲染都创建新函数
function MyComponent() {
  const { updateProfile } = useAuthStore();

  return <button onClick={() => updateProfile({ name: 'New Name' })}>
    更新
  </button>;
}

// ✅ 好 - 使用 useCallback
function MyComponent() {
  const updateProfile = useAuthStore((state) => state.updateProfile);

  const handleClick = useCallback(() => {
    updateProfile({ name: 'New Name' });
  }, [updateProfile]);

  return <button onClick={handleClick}>更新</button>;
}
```

### 4. Store 重置

```typescript
// 在测试或用户登出时重置 Store
function App() {
  useEffect(() => {
    return () => {
      useAuthStore.getState().reset();
      useNotificationStore.getState().clearAll();
    };
  }, []);

  return <div>...</div>;
}
```

---

## 🧪 测试 Store

```typescript
import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '@/stores'

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().reset()
  })

  it('应该能登录', () => {
    const { result } = renderHook(() => useAuthStore())

    act(() => {
      result.current.loginWithToken('token', {
        id: '1',
        name: 'Test',
        email: 'test@test.com',
        role: 'user',
      })
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.name).toBe('Test')
  })
})
```

---

## 📚 相关文档

- [Zustand 官方文档](https://zustand-demo.pmnd.rs/)
- [Phase 1 进度报告](../architecture-phase1-progress.md)
- [架构修复计划](../architecture-fix-plan.md)

---

**文档版本**: 1.0
**创建日期**: 2026-03-29
**作者**: 🏗️ 架构师
