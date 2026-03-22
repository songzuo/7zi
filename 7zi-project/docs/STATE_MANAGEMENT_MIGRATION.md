# 状态管理迁移计划

**项目**: 7zi-frontend  
**创建日期**: 2026-03-06  
**架构师**: AI Architect

---

## 1. 迁移概述

### 1.1 目标

将分散的状态管理统一迁移到 **Zustand**，同时保留 React Context 用于低频全局设置。

### 1.2 迁移范围

| 模块 | 当前方案 | 目标方案 | 优先级 |
|------|----------|----------|--------|
| SettingsContext | React Context | **保留** | - |
| Dashboard 数据 | useDashboardData | Zustand Store | P0 |
| 聊天状态 | useChat | Zustand Store | P1 |
| GitHub 数据 | useGitHubData | Zustand Store | P1 |
| 通知状态 | 无 | Zustand Store | P2 |

### 1.3 时间估算

| 阶段 | 内容 | 估时 |
|------|------|------|
| Phase 1 | Dashboard Store | 2 天 |
| Phase 2 | Chat Store | 1 天 |
| Phase 3 | GitHub Store | 1 天 |
| Phase 4 | 优化与测试 | 2 天 |
| **总计** | | **6 天** |

---

## 2. Phase 1: Dashboard Store 迁移

### 2.1 目标

- 创建 `useDashboardStore`
- 移除 `useDashboardData` hook
- 实现数据共享和缓存

### 2.2 实现计划

#### Step 1: 安装依赖

```bash
npm install zustand
```

#### Step 2: 创建 Store

```typescript
// src/stores/dashboardStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// 类型定义
export interface AIMember {
  id: string;
  name: string;
  role: string;
  emoji: string;
  avatar: string;
  status: 'idle' | 'working' | 'busy' | 'offline';
  provider: string;
  currentTask?: string;
  completedTasks: number;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string; color: string }>;
  assignee?: { login: string; avatar_url: string } | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface ActivityItem {
  id: string;
  type: 'commit' | 'issue' | 'comment';
  title: string;
  author: string;
  avatar?: string;
  timestamp: string;
  url: string;
}

interface DashboardState {
  // 数据
  members: AIMember[];
  issues: GitHubIssue[];
  activities: ActivityItem[];
  
  // 加载状态
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // 操作
  fetchAllData: () => Promise<void>;
  updateMemberStatus: (memberId: string, status: AIMember['status']) => void;
  refreshData: () => Promise<void>;
}

// AI 成员初始数据
const AI_MEMBERS: AIMember[] = [
  // ... 成员数据
];

// Store 实现
export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      members: AI_MEMBERS,
      issues: [],
      activities: [],
      isLoading: false,
      error: null,
      lastUpdated: null,

      // 获取所有数据
      fetchAllData: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const [issuesData, commitsData] = await Promise.all([
            fetchIssues(),
            fetchCommits(),
          ]);
          
          const activities = mergeActivities(issuesData, commitsData);
          
          set({
            issues: issuesData,
            activities,
            isLoading: false,
            lastUpdated: new Date(),
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '数据加载失败',
            isLoading: false,
          });
        }
      },

      // 更新成员状态
      updateMemberStatus: (memberId, status) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId ? { ...m, status } : m
          ),
        }));
      },

      // 刷新数据
      refreshData: async () => {
        await get().fetchAllData();
      },
    }),
    { name: 'dashboard-store' }
  )
);

// 选择器
export const useMembers = () => useDashboardStore((s) => s.members);
export const useIssues = () => useDashboardStore((s) => s.issues);
export const useActivities = () => useDashboardStore((s) => s.activities);
export const useDashboardLoading = () => useDashboardStore((s) => s.isLoading);
export const useDashboardError = () => useDashboardStore((s) => s.error);

// 派生数据选择器
export const useDashboardStats = () =>
  useDashboardStore((s) => ({
    totalMembers: s.members.length,
    working: s.members.filter((m) => m.status === 'working').length,
    busy: s.members.filter((m) => m.status === 'busy').length,
    idle: s.members.filter((m) => m.status === 'idle').length,
    offline: s.members.filter((m) => m.status === 'offline').length,
    openIssues: s.issues.filter((i) => i.state === 'open').length,
    closedIssues: s.issues.filter((i) => i.state === 'closed').length,
  }));
```

#### Step 3: 更新 Dashboard 页面

```typescript
// src/app/dashboard/page.tsx
'use client';

import { useEffect } from 'react';
import { useDashboardStore, useDashboardStats, useMembers, useIssues, useActivities } from '@/stores/dashboardStore';

export default function DashboardPage() {
  // 选择性订阅
  const fetchAllData = useDashboardStore((s) => s.fetchAllData);
  const isLoading = useDashboardStore((s) => s.isLoading);
  const lastUpdated = useDashboardStore((s) => s.lastUpdated);
  
  // 派生数据
  const stats = useDashboardStats();
  const members = useMembers();
  const issues = useIssues();
  const activities = useActivities();

  // 初始加载
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // 自动刷新
  useEffect(() => {
    const timer = setInterval(fetchAllData, 30000);
    return () => clearInterval(timer);
  }, [fetchAllData]);

  // 渲染逻辑
  // ...
}
```

### 2.3 验证清单

- [ ] Store 正确初始化
- [ ] 数据获取功能正常
- [ ] 选择器避免不必要重渲染
- [ ] DevTools 正常工作
- [ ] 测试用例通过

---

## 3. Phase 2: Chat Store 迁移

### 3.1 目标

- 创建 `useChatStore`
- 实现消息持久化
- 支持多会话

### 3.2 实现计划

```typescript
// src/stores/chatStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  memberId?: string;
}

interface ChatState {
  // 消息
  messages: Message[];
  
  // UI 状态
  inputValue: string;
  isTyping: boolean;
  selectedMemberId: string;
  
  // 操作
  setInputValue: (value: string) => void;
  setSelectedMemberId: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      inputValue: '',
      isTyping: false,
      selectedMemberId: '',

      setInputValue: (value) => set({ inputValue: value }),
      setSelectedMemberId: (id) => set({ selectedMemberId: id }),

      sendMessage: async (content) => {
        // 添加用户消息
        const userMessage: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content,
          timestamp: new Date(),
        };

        set((state) => ({
          messages: [...state.messages, userMessage],
          inputValue: '',
          isTyping: true,
        }));

        // 模拟 AI 回复
        await new Promise((r) => setTimeout(r, 750));

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: generateResponse(content, get().selectedMemberId),
          timestamp: new Date(),
          memberId: get().selectedMemberId || undefined,
        };

        set((state) => ({
          messages: [...state.messages, assistantMessage],
          isTyping: false,
        }));
      },

      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ messages: state.messages }),
    }
  )
);

// 选择器
export const useMessages = () => useChatStore((s) => s.messages);
export const useIsTyping = () => useChatStore((s) => s.isTyping);
export const useInputValue = () => useChatStore((s) => s.inputValue);
```

---

## 4. Phase 3: GitHub Store 迁移

### 4.1 目标

- 创建 `useGitHubStore`
- 统一 GitHub API 调用
- 实现请求缓存

### 4.2 实现计划

```typescript
// src/stores/githubStore.ts
import { create } from 'zustand';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface GitHubState {
  // 缓存
  cache: Map<string, CacheEntry<unknown>>;
  
  // 速率限制
  rateLimit: {
    remaining: number;
    reset: number;
  } | null;
  
  // 操作
  fetch: <T>(endpoint: string, options?: { ttl?: number }) => Promise<T>;
  invalidate: (key: string) => void;
  clearCache: () => void;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

export const useGitHubStore = create<GitHubState>((set, get) => ({
  cache: new Map(),
  rateLimit: null,

  fetch: async <T,>(endpoint: string, options?: { ttl?: number }) => {
    const cache = get().cache;
    const cacheKey = endpoint;
    const ttl = options?.ttl ?? CACHE_TTL;

    // 检查缓存
    const cached = cache.get(cacheKey) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    // 发起请求
    const response = await fetch(`https://api.github.com/${endpoint}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    // 更新速率限制信息
    const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0');
    const reset = parseInt(response.headers.get('X-RateLimit-Reset') || '0');
    set({ rateLimit: { remaining, reset } });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    // 更新缓存
    const newCache = new Map(cache);
    newCache.set(cacheKey, { data, timestamp: Date.now(), ttl });
    set({ cache: newCache });

    return data as T;
  },

  invalidate: (key) => {
    const cache = get().cache;
    const newCache = new Map(cache);
    newCache.delete(key);
    set({ cache: newCache });
  },

  clearCache: () => {
    set({ cache: new Map() });
  },
}));
```

---

## 5. Phase 4: 优化与测试

### 5.1 性能优化

#### 组件 Memo 化

```typescript
// src/components/MemberCard.tsx
import { memo } from 'react';

interface MemberCardProps {
  member: AIMember;
}

export const MemberCard = memo(function MemberCard({ member }: MemberCardProps) {
  // 组件实现
});
```

#### 选择器优化

```typescript
// 使用浅比较避免引用变化
import { shallow } from 'zustand/shallow';

// 多值选择
const { foo, bar } = useStore(
  (s) => ({ foo: s.foo, bar: s.bar }),
  shallow
);
```

### 5.2 测试计划

#### 单元测试

```typescript
// src/test/stores/dashboardStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useDashboardStore } from '@/stores/dashboardStore';

describe('DashboardStore', () => {
  beforeEach(() => {
    useDashboardStore.setState({
      issues: [],
      activities: [],
      isLoading: false,
      error: null,
    });
  });

  it('should initialize with default state', () => {
    const state = useDashboardStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.members).toHaveLength(11);
  });

  it('should update member status', () => {
    act(() => {
      useDashboardStore.getState().updateMemberStatus('executor', 'busy');
    });

    const member = useDashboardStore
      .getState()
      .members.find((m) => m.id === 'executor');
    expect(member?.status).toBe('busy');
  });
});
```

#### 集成测试

```typescript
// src/test/integration/dashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '@/app/dashboard/page';

describe('Dashboard Integration', () => {
  it('should render dashboard with members', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('AI 团队实时看板')).toBeInTheDocument();
    });
  });
});
```

---

## 6. 回滚计划

### 6.1 回滚触发条件

- 性能指标退化 > 10%
- 功能回归 > 0
- 用户报告重大问题

### 6.2 回滚步骤

1. 恢复 `useDashboardData` hook
2. 恢复 `useChat` hook
3. 移除 Zustand 依赖
4. 运行测试验证

### 6.3 分支策略

```
main
  └── feature/zustand-migration
        ├── phase-1-dashboard-store
        ├── phase-2-chat-store
        └── phase-3-github-store
```

---

## 7. 验收标准

### 7.1 功能验收

- [ ] 所有现有功能正常工作
- [ ] 测试覆盖率 ≥ 80%
- [ ] 无 TypeScript 错误
- [ ] 无 ESLint 警告

### 7.2 性能验收

- [ ] 首屏加载时间 ≤ 当前值
- [ ] 重渲染次数减少 ≥ 30%
- [ ] API 请求次数减少 ≥ 50%

### 7.3 文档验收

- [ ] Store 使用文档完整
- [ ] 迁移指南完整
- [ ] API 文档更新

---

## 8. 附录

### 8.1 Zustand API 速查

```typescript
// 创建 store
const useStore = create((set, get) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));

// 使用 store
const count = useStore((s) => s.count);
const increment = useStore((s) => s.increment);

// 外部访问
useStore.getState().count;
useStore.setState({ count: 10 });
```

### 8.2 中间件使用

```typescript
// DevTools
import { devtools } from 'zustand/middleware';
const useStore = create(devtools((set) => ({ ... })));

// 持久化
import { persist } from 'zustand/middleware';
const useStore = create(persist((set) => ({ ... }), { name: 'store' }));

// Immer
import { immer } from 'zustand/middleware/immer';
const useStore = create(immer((set) => ({ ... })));
```

### 8.3 参考资源

- [Zustand 官方文档](https://github.com/pmndrs/zustand)
- [Zustand 与 React Query 对比](https://tkdodo.eu/blog/zustand-and-react-query)
- [状态管理最佳实践](https://kentcdodds.com/blog/application-state-management-with-react)