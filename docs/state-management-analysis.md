# 7zi-frontend 状态管理方案调研报告

**调研日期**: 2026-03-06  
**调研人**: 咨询师  
**项目**: 7zi-frontend (Next.js 16.1.6 + React 19.2.3)

---

## 📋 目录

1. [当前状态管理分析](#1-当前状态管理分析)
2. [方案评估](#2-方案评估)
3. [对比分析](#3-对比分析)
4. [推荐方案](#4-推荐方案)
5. [迁移路径](#5-迁移路径)

---

## 1. 当前状态管理分析

### 1.1 项目概况

| 项目属性 | 值 |
|---------|-----|
| 框架 | Next.js 16.1.6 |
| React | 19.2.3 |
| 代码规模 | ~11,216 行 TypeScript/TSX |
| 主要功能 | 展示网站 + Dashboard + AI 聊天 |

### 1.2 当前状态管理方式

项目目前采用 **原生 React 状态管理**，未引入任何第三方状态管理库。

#### 使用的模式

| 模式 | 使用场景 | 代码位置 |
|------|---------|---------|
| **useState + useEffect** | 组件内状态、数据获取 | `useFetch.ts`, `useChat.ts`, `useDashboardData.ts` |
| **Context API** | 全局设置（主题、用户偏好） | `SettingsContext.tsx`, `ThemeProvider.tsx` |
| **Custom Hooks** | 封装业务逻辑 | `useLocalStorage.ts`, `useFetch.ts`, `useGitHubData.ts` |

#### 现有 Context 列表

```
src/contexts/
└── SettingsContext.tsx     # 用户偏好设置（主题、语言、通知）

src/components/
└── ThemeProvider.tsx        # 主题状态管理
```

#### 现有 Hooks 列表

```
src/hooks/
├── useFetch.ts              # 通用数据获取
├── useDashboardData.ts      # Dashboard 数据获取
├── useGitHubData.ts         # GitHub API 数据获取
├── useLocalStorage.ts       # localStorage 封装
└── useIntersectionObserver.ts  # 可见性观察
```

### 1.3 当前方案的优缺点

#### ✅ 优点

1. **零依赖** - 不增加包体积
2. **简单直接** - 学习成本低，团队容易上手
3. **React 19 优化** - 新版 React 对 Context 性能有所改善
4. **适合当前规模** - 项目是展示型网站，状态不复杂

#### ❌ 缺点

1. **Context 性能问题** - 任何 Context 值变化会导致所有消费者重渲染
2. **缺乏 DevTools** - 调试困难，无法追踪状态变化
3. **代码重复** - 多个 Hook 重复实现加载/错误/刷新逻辑
4. **缺乏缓存** - 每次切换页面重新获取数据
5. **缺乏中间件** - 无法实现持久化、日志等横切关注点
6. **类型安全弱** - Context 默认值处理繁琐

### 1.4 当前痛点

```
痛点 1: 数据获取逻辑重复
- useFetch.ts (70 行)
- useDashboardData.ts (180 行)  
- useGitHubData.ts (200 行)
→ 都实现了 loading/error/refetch 逻辑

痛点 2: 无数据缓存
- 每次页面切换都重新 fetch
- 无请求去重
- 无后台刷新

痛点 3: Context 膨胀风险
- SettingsContext 已经包含 theme + language + notifications
- 未来添加更多设置会导致 Provider 嵌套地狱

痛点 4: 无状态持久化策略
- localStorage 操作分散在各处
- 无统一的序列化/反序列化
- 无版本迁移机制
```

---

## 2. 方案评估

### 2.1 Zustand

**官网**: https://zustand-demo.pmnd.rs/  
**GitHub**: https://github.com/pmndrs/zustand  
**版本**: v4.x / v5.x

#### 概述

Zustand 是一个极简的状态管理库，基于 Flux 模式但去除了样板代码。

#### 核心特性

```typescript
// 极简 API
import { create } from 'zustand';

const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// 使用
function Component() {
  const count = useStore((state) => state.count);
  const increment = useStore((state) => state.increment);
}
```

#### 优点 ✅

| 优点 | 说明 |
|------|------|
| **极小体积** | ~1.2KB gzipped |
| **零样板代码** | 无需 actions/reducers/types |
| **选择器优化** | 自动避免不必要的重渲染 |
| **TypeScript 友好** | 类型推断完善 |
| **中间件生态** | persist, devtools, immer, etc. |
| **React 18/19 支持** | 完美支持 Concurrent Mode |
| **无需 Provider** | 可在组件外使用 |
| **SSR 友好** | Next.js 集成简单 |

#### 缺点 ❌

| 缺点 | 说明 |
|------|------|
| **非响应式** | 需要手动调用 set |
| **缺乏数据获取** | 需要自己实现或配合 React Query |
| **学习曲线** | 独特的 API 风格需要适应 |
| **社区较小** | 相比 Redux 生态较小 |

#### 适用场景

- ✅ 客户端状态管理
- ✅ 中小型项目
- ✅ 需要极简方案
- ✅ 需要在组件外访问状态

#### 代码示例

```typescript
// stores/settingsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    enabled: boolean;
    sound: boolean;
    email: boolean;
    push: boolean;
  };
}

interface SettingsStore {
  settings: UserSettings;
  setTheme: (theme: UserSettings['theme']) => void;
  setLanguage: (language: string) => void;
  setNotifications: (notifications: Partial<UserSettings['notifications']>) => void;
  resetSettings: () => void;
}

const defaultSettings: UserSettings = {
  theme: 'system',
  language: 'zh',
  notifications: {
    enabled: true,
    sound: true,
    email: false,
    push: true,
  },
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      setTheme: (theme) => set((state) => ({ 
        settings: { ...state.settings, theme } 
      })),
      setLanguage: (language) => set((state) => ({ 
        settings: { ...state.settings, language } 
      })),
      setNotifications: (notifications) => set((state) => ({ 
        settings: { 
          ...state.settings, 
          notifications: { ...state.settings.notifications, ...notifications } 
        } 
      })),
      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: '7zi-user-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// 使用
function SettingsPanel() {
  const { settings, setTheme, setLanguage } = useSettingsStore();
  
  // 自动选择器优化，只有 settings.theme 变化才重渲染
  const theme = useSettingsStore((state) => state.settings.theme);
}
```

---

### 2.2 Jotai

**官网**: https://jotai.org/  
**GitHub**: https://github.com/pmndrs/jotai  
**版本**: v2.x

#### 概述

Jotai 是原子化状态管理库，灵感来自 Recoil，但更轻量。

#### 核心概念

```typescript
// 原子 - 最小状态单元
import { atom, useAtom } from 'jotai';

const countAtom = atom(0);

// 派生原子
const doubleAtom = atom((get) => get(countAtom) * 2);

// 使用
function Component() {
  const [count, setCount] = useAtom(countAtom);
}
```

#### 优点 ✅

| 优点 | 说明 |
|------|------|
| **原子化设计** | 细粒度更新，最小化重渲染 |
| **极小体积** | ~2.5KB gzipped |
| **派生状态** | 自动计算依赖关系 |
| **异步支持** | 原生支持 async/await |
| **TypeScript 友好** | 完善的类型推断 |
| **无需 Provider** | 可选的 Provider 模式 |
| **React 18/19 支持** | Concurrent Mode 兼容 |

#### 缺点 ❌

| 缺点 | 说明 |
|------|------|
| **概念新颖** | 需要理解原子思维 |
| **缺乏数据获取** | 需要配合其他库 |
| **调试工具较弱** | DevTools 功能有限 |
| **社区较小** | 相对较新，生态不成熟 |

#### 适用场景

- ✅ 细粒度状态更新
- ✅ 复杂的派生状态
- ✅ 需要原子化的项目
- ✅ 性能敏感场景

#### 代码示例

```typescript
// atoms/settings.ts
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// 基础原子 - 自动持久化
export const themeAtom = atomWithStorage<'light' | 'dark' | 'system'>(
  '7zi-theme',
  'system'
);

export const languageAtom = atomWithStorage<string>('7zi-language', 'zh');

export const notificationsAtom = atomWithStorage({
  key: '7zi-notifications',
  initialValue: {
    enabled: true,
    sound: true,
    email: false,
    push: true,
  },
});

// 派生原子
export const isDarkAtom = atom((get) => {
  const theme = get(themeAtom);
  if (theme === 'system') {
    // SSR 时返回 false
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return theme === 'dark';
});

// 使用
function ThemeToggle() {
  const [theme, setTheme] = useAtom(themeAtom);
  const isDark = useAtomValue(isDarkAtom);
  
  return (
    <button onClick={() => setTheme(isDark ? 'light' : 'dark')}>
      {isDark ? '🌙' : '☀️'}
    </button>
  );
}
```

---

### 2.3 React Query + Context

**官网**: https://tanstack.com/query  
**GitHub**: https://github.com/TanStack/query  
**版本**: v5.x

#### 概述

React Query (TanStack Query) 是强大的服务端状态管理库，专注于数据获取、缓存、同步。

#### 核心概念

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// 查询
const { data, isLoading, error } = useQuery({
  queryKey: ['issues', owner, repo],
  queryFn: () => fetchIssues(owner, repo),
});

// 变更
const mutation = useMutation({
  mutationFn: updateIssue,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['issues'] });
  },
});
```

#### 优点 ✅

| 优点 | 说明 |
|------|------|
| **专注数据获取** | 最佳实践的数据获取方案 |
| **自动缓存** | 智能缓存策略 |
| **后台刷新** | 自动重新验证数据 |
| **请求去重** | 避免重复请求 |
| **乐观更新** | 即时 UI 反馈 |
| **DevTools** | 强大的调试工具 |
| **SSR 支持** | Next.js 集成完善 |
| **离线支持** | 配合 Persistence 插件 |

#### 缺点 ❌

| 缺点 | 说明 |
|------|------|
| **非全功能** | 只管理服务端状态，需要配合其他方案 |
| **学习曲线** | 概念较多（Query, Mutation, Invalidation） |
| **体积较大** | ~13KB gzipped |
| **需要 Provider** | QueryClientProvider 包裹 |

#### 适用场景

- ✅ 大量 API 调用
- ✅ 需要缓存和后台刷新
- ✅ 复杂的数据依赖
- ✅ 实时数据同步

#### 代码示例

```typescript
// hooks/useGitHubQuery.ts
import { useQuery } from '@tanstack/react-query';

export function useGitHubIssues(owner: string, repo: string, token?: string) {
  return useQuery({
    queryKey: ['github', 'issues', owner, repo],
    queryFn: async () => {
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
      };
      if (token) headers['Authorization'] = `token ${token}`;
      
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=50`,
        { headers }
      );
      
      if (!response.ok) throw new Error('Failed to fetch issues');
      
      const data = await response.json();
      return data.filter((item: any) => !item.pull_request);
    },
    staleTime: 5 * 60 * 1000, // 5 分钟
    gcTime: 10 * 60 * 1000, // 10 分钟
    refetchOnWindowFocus: true,
  });
}

// hooks/useGitHubCommits.ts
export function useGitHubCommits(owner: string, repo: string, token?: string) {
  return useQuery({
    queryKey: ['github', 'commits', owner, repo],
    queryFn: async () => {
      // ... fetch logic
    },
    staleTime: 5 * 60 * 1000,
  });
}

// 使用
function Dashboard() {
  const { data: issues, isLoading: loadingIssues } = useGitHubIssues('songzhuo', 'openclaw-workspace');
  const { data: commits, isLoading: loadingCommits } = useGitHubCommits('songzhuo', 'openclaw-workspace');
  
  // 自动缓存、去重、后台刷新
}
```

---

### 2.4 Redux Toolkit

**官网**: https://redux-toolkit.js.org/  
**GitHub**: https://github.com/reduxjs/redux-toolkit  
**版本**: v2.x

#### 概述

Redux Toolkit (RTK) 是 Redux 官方推荐的方式，大幅简化 Redux 使用。

#### 核心概念

```typescript
import { createSlice, configureStore } from '@reduxjs/toolkit';

const settingsSlice = createSlice({
  name: 'settings',
  initialState: { theme: 'system' },
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
  },
});

const store = configureStore({
  reducer: {
    settings: settingsSlice.reducer,
  },
});
```

#### 优点 ✅

| 优点 | 说明 |
|------|------|
| **官方标准** | Redux 生态成熟，文档完善 |
| **DevTools** | 最强大的调试工具 |
| **中间件生态** | thunk, saga, observable, etc. |
| **可预测性** | 单一 Store，时间旅行调试 |
| **RTK Query** | 内置数据获取方案 |
| **TypeScript 支持** | 良好的类型推断 |

#### 缺点 ❌

| 缺点 | 说明 |
|------|------|
| **体积较大** | ~11KB gzipped (RTK) + Redux |
| **概念多** | Store, Slice, Reducer, Action, Dispatch, Selector |
| **样板代码** | 相比其他方案仍有冗余 |
| **学习曲线陡** | 需要理解 Redux 模式 |
| **过度工程** | 对小型项目来说太重 |

#### 适用场景

- ✅ 大型企业级应用
- ✅ 复杂状态逻辑
- ✅ 需要强调试能力
- ✅ 团队熟悉 Redux

#### 代码示例

```typescript
// store/settingsSlice.ts
import { createSlice } from '@reduxjs/toolkit';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    enabled: boolean;
    sound: boolean;
    email: boolean;
    push: boolean;
  };
}

const initialState: SettingsState = {
  theme: 'system',
  language: 'zh',
  notifications: {
    enabled: true,
    sound: true,
    email: false,
    push: true,
  },
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action) => {
      state.language = action.payload;
    },
    setNotifications: (state, action) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    resetSettings: () => initialState,
  },
});

export const { setTheme, setLanguage, setNotifications, resetSettings } = settingsSlice.actions;
export default settingsSlice.reducer;

// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import settingsReducer from './settingsSlice';

export const store = configureStore({
  reducer: {
    settings: settingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// hooks/useSettings.ts
import { useSelector, useDispatch } from 'react-redux';
import { setTheme } from '@/store/settingsSlice';

export function useSettings() {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings);
  
  const handleSetTheme = (theme: 'light' | 'dark' | 'system') => {
    dispatch(setTheme(theme));
  };
  
  return { settings, setTheme: handleSetTheme };
}
```

---

## 3. 对比分析

### 3.1 核心指标对比

| 指标 | Zustand | Jotai | React Query + Context | Redux Toolkit |
|------|---------|-------|----------------------|---------------|
| **体积 (gzipped)** | ~1.2KB | ~2.5KB | ~13KB + Context | ~11KB |
| **学习曲线** | 低 | 中 | 中 | 高 |
| **样板代码** | 极少 | 少 | 中 | 中 |
| **TypeScript** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **DevTools** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **性能** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **SSR 支持** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **数据获取** | ❌ | ❌ | ⭐⭐⭐⭐⭐ | RTK Query ⭐⭐⭐⭐⭐ |
| **中间件** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **社区规模** | 中 | 小 | 大 | 大 |

### 3.2 功能对比

| 功能需求 | Zustand | Jotai | React Query | Redux Toolkit |
|----------|---------|-------|-------------|---------------|
| **客户端状态** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **服务端状态** | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | RTK Query ⭐⭐⭐⭐ |
| **表单状态** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **UI 状态** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **持久化** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **实时更新** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **复杂派生** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

### 3.3 场景匹配度

针对 7zi-frontend 项目的具体需求：

| 场景 | Zustand | Jotai | React Query + Context | Redux Toolkit |
|------|---------|-------|----------------------|---------------|
| **用户设置管理** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **GitHub API 数据** | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | RTK Query ⭐⭐⭐⭐ |
| **AI 聊天状态** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **主题切换** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **团队规模（小）** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 4. 推荐方案

### 4.1 推荐组合

**🏆 主推荐：Zustand + React Query**

```
┌─────────────────────────────────────────────────┐
│                   7zi-frontend                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────┐    ┌─────────────────┐   │
│  │    Zustand      │    │  React Query    │   │
│  │  (客户端状态)    │    │  (服务端状态)    │   │
│  └─────────────────┘    └─────────────────┘   │
│         │                        │             │
│    ┌────▼────┐              ┌────▼────┐       │
│    │ 用户设置 │              │ GitHub  │       │
│    │ UI 状态  │              │   API   │       │
│    │ 聊天状态  │              │   数据   │       │
│    │ 主题切换  │              │  缓存   │       │
│    └─────────┘              └─────────┘       │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 4.2 推荐理由

#### 为什么选择 Zustand？

1. **极小体积** - 仅 1.2KB，对包体积影响最小
2. **零样板代码** - 替换现有 Context 几乎无需额外代码
3. **完美适配** - 非常适合客户端状态（设置、UI、聊天）
4. **中间件生态** - `persist` 中间件完美解决 localStorage 需求
5. **学习成本低** - 团队 1 小时即可上手
6. **TypeScript 友好** - 类型推断完善，开发体验好
7. **Next.js 集成** - SSR 支持完善

#### 为什么选择 React Query？

1. **解决核心痛点** - 替换重复的数据获取 Hooks
2. **自动缓存** - 解决页面切换重复请求问题
3. **后台刷新** - Dashboard 自动刷新更优雅
4. **请求去重** - 避免并发重复请求
5. **DevTools** - 强大的调试能力
6. **最佳实践** - 数据获取的行业标准

#### 为什么不选其他方案？

| 方案 | 不选理由 |
|------|---------|
| **Jotai** | 原子化思维与项目风格不符，生态较小 |
| **Redux Toolkit** | 对当前项目规模过度工程，学习成本高 |
| **纯 Context** | 无法解决数据获取和缓存问题 |

### 4.3 架构设计

```
src/
├── stores/                    # Zustand stores
│   ├── settingsStore.ts       # 用户设置
│   ├── themeStore.ts          # 主题状态
│   └── chatStore.ts           # 聊天状态
│
├── hooks/                     # React Query hooks
│   ├── useGitHubIssues.ts     # GitHub Issues 查询
│   ├── useGitHubCommits.ts    # GitHub Commits 查询
│   └── useGitHubStats.ts      # GitHub 统计查询
│
├── providers/
│   └── QueryProvider.tsx      # React Query Provider
│
└── lib/
    └── queryClient.ts         # Query Client 配置
```

---

## 5. 迁移路径

### 5.1 迁移计划

**分 4 个阶段，每阶段 1-2 天**

```
Phase 1: 准备工作 (1 天)
    │
    ├── 安装依赖
    ├── 配置 React Query
    └── 创建基础结构
    
    ↓
    
Phase 2: Zustand 迁移 (2 天)
    │
    ├── 迁移 SettingsContext → settingsStore
    ├── 迁移 ThemeProvider → themeStore
    └── 更新组件使用新 Store
    
    ↓
    
Phase 3: React Query 迁移 (2 天)
    │
    ├── 迁移 useDashboardData → useGitHubIssues/Commits
    ├── 迁移 useFetch → React Query
    └── 移除旧的 Hooks
    
    ↓
    
Phase 4: 测试与优化 (1 天)
    │
    ├── 更新测试
    ├── 性能验证
    └── 文档更新
```

### 5.2 Phase 1: 准备工作

#### 1. 安装依赖

```bash
cd ~/7zi-project/7zi-frontend

# Zustand
pnpm add zustand

# React Query
pnpm add @tanstack/react-query
```

#### 2. 配置 React Query

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分钟
      gcTime: 10 * 60 * 1000, // 10 分钟
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});
```

```typescript
// src/providers/QueryProvider.tsx
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

```typescript
// src/app/layout.tsx (更新)
import { QueryProvider } from '@/providers/QueryProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
```

### 5.3 Phase 2: Zustand 迁移

#### 1. 创建 Settings Store

```typescript
// src/stores/settingsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Locale } from '@/i18n/config';

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: Locale;
  notifications: {
    enabled: boolean;
    sound: boolean;
    email: boolean;
    push: boolean;
  };
}

interface SettingsStore {
  settings: UserSettings;
  setTheme: (theme: UserSettings['theme']) => void;
  setLanguage: (language: Locale) => void;
  setNotifications: (notifications: Partial<UserSettings['notifications']>) => void;
  resetSettings: () => void;
}

const defaultSettings: UserSettings = {
  theme: 'system',
  language: 'zh',
  notifications: {
    enabled: true,
    sound: true,
    email: false,
    push: true,
  },
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      setTheme: (theme) => set((state) => ({ 
        settings: { ...state.settings, theme } 
      })),
      setLanguage: (language) => set((state) => ({ 
        settings: { ...state.settings, language } 
      })),
      setNotifications: (notifications) => set((state) => ({ 
        settings: { 
          ...state.settings, 
          notifications: { ...state.settings.notifications, ...notifications } 
        } 
      })),
      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: '7zi-user-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// 选择器 Hooks（优化性能）
export const useTheme = () => useSettingsStore((state) => state.settings.theme);
export const useLanguage = () => useSettingsStore((state) => state.settings.language);
export const useNotifications = () => useSettingsStore((state) => state.settings.notifications);
```

#### 2. 更新组件使用

```typescript
// src/components/SettingsPanel.tsx (更新)
import { useSettingsStore, useTheme, useNotifications } from '@/stores/settingsStore';

export function SettingsPanel() {
  // 旧方式
  // const { settings, setTheme, setNotifications } = useSettings();
  
  // 新方式
  const { settings, setTheme, setLanguage, setNotifications, resetSettings } = useSettingsStore();
  const theme = useTheme();
  const notifications = useNotifications();
  
  // 组件代码基本不变
}
```

#### 3. 删除旧文件

```bash
# 迁移完成后删除
rm src/contexts/SettingsContext.tsx
```

### 5.4 Phase 3: React Query 迁移

#### 1. 创建 Query Hooks

```typescript
// src/hooks/useGitHubIssues.ts
import { useQuery } from '@tanstack/react-query';

export function useGitHubIssues(owner: string, repo: string, token?: string | null) {
  return useQuery({
    queryKey: ['github', 'issues', owner, repo],
    queryFn: async () => {
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
      };
      if (token) headers['Authorization'] = `token ${token}`;
      
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=50`,
        { headers }
      );
      
      if (!response.ok) {
        if (response.status === 404) throw new Error(`仓库 ${owner}/${repo} 不存在`);
        if (response.status === 403) throw new Error('GitHub API 速率限制');
        throw new Error(`获取 Issues 失败: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.filter((item: any) => !item.pull_request);
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
```

```typescript
// src/hooks/useGitHubCommits.ts
import { useQuery } from '@tanstack/react-query';

export function useGitHubCommits(owner: string, repo: string, token?: string | null) {
  return useQuery({
    queryKey: ['github', 'commits', owner, repo],
    queryFn: async () => {
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
      };
      if (token) headers['Authorization'] = `token ${token}`;
      
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits?per_page=30`,
        { headers }
      );
      
      if (!response.ok) throw new Error(`获取 Commits 失败: ${response.statusText}`);
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}
```

```typescript
// src/hooks/useGitHubStats.ts
import { useQuery } from '@tanstack/react-query';

export function useGitHubStats(owner: string, repo: string, token?: string | null) {
  return useQuery({
    queryKey: ['github', 'stats', owner, repo],
    queryFn: async () => {
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
      };
      if (token) headers['Authorization'] = `token ${token}`;
      
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        { headers }
      );
      
      if (!response.ok) throw new Error(`获取统计失败: ${response.statusText}`);
      
      const data = await response.json();
      return {
        stars: data.stargazers_count,
        forks: data.forks_count,
        openIssues: data.open_issues_count,
      };
    },
    staleTime: 10 * 60 * 1000, // 统计数据变化较慢
  });
}
```

#### 2. 组合 Hook

```typescript
// src/hooks/useDashboardData.ts (重构)
import { useGitHubIssues } from './useGitHubIssues';
import { useGitHubCommits } from './useGitHubCommits';
import { useGitHubStats } from './useGitHubStats';
import { useMemo } from 'react';

export function useDashboardData(owner: string, repo: string, token?: string | null) {
  const issuesQuery = useGitHubIssues(owner, repo, token);
  const commitsQuery = useGitHubCommits(owner, repo, token);
  const statsQuery = useGitHubStats(owner, repo, token);
  
  // 合并活动
  const activities = useMemo(() => {
    if (!issuesQuery.data || !commitsQuery.data) return [];
    
    const items: ActivityItem[] = [];
    
    commitsQuery.data.forEach(commit => {
      items.push({
        id: `commit-${commit.sha}`,
        type: 'commit',
        title: commit.commit.message.split('\n')[0],
        author: commit.commit.author.name,
        avatar: commit.author?.avatar_url,
        timestamp: commit.commit.author.date,
        url: commit.html_url,
      });
    });
    
    issuesQuery.data.forEach(issue => {
      items.push({
        id: `issue-${issue.number}`,
        type: 'issue',
        title: `#${issue.number}: ${issue.title}`,
        author: issue.assignee?.login || '未分配',
        avatar: issue.assignee?.avatar_url,
        timestamp: issue.updated_at,
        url: issue.html_url,
      });
    });
    
    return items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);
  }, [issuesQuery.data, commitsQuery.data]);
  
  return {
    issues: issuesQuery.data ?? [],
    commits: commitsQuery.data ?? [],
    stats: statsQuery.data ?? null,
    activities,
    isLoading: issuesQuery.isLoading || commitsQuery.isLoading || statsQuery.isLoading,
    error: issuesQuery.error?.message || commitsQuery.error?.message || statsQuery.error?.message || null,
    refetch: () => {
      issuesQuery.refetch();
      commitsQuery.refetch();
      statsQuery.refetch();
    },
  };
}```

#### 3. 更新 Dashboard 组件

```typescript
// src/app/dashboard/page.tsx (更新)
import { useDashboardData } from '@/hooks/useDashboardData';

export default function DashboardPage() {
  const GITHUB_OWNER = process.env.NEXT_PUBLIC_GITHUB_OWNER || 'songzhuo';
  const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || 'openclaw-workspace';
  const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN;
  
  const {
    issues,
    commits,
    stats,
    activities,
    isLoading,
    error,
    refetch
  } = useDashboardData(GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN);
  
  // 组件代码基本不变
}
```

#### 4. 删除旧文件

```bash
# 迁移完成后删除
rm src/hooks/useFetch.ts
# useDashboardData.ts 和 useGitHubData.ts 保留但重构
```

### 5.5 Phase 4: 测试与优化

#### 1. 更新测试

```typescript
// src/test/stores/settingsStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useSettingsStore } from '@/stores/settingsStore';

describe('settingsStore', () => {
  beforeEach(() => {
    // 重置 store
    useSettingsStore.setState({
      settings: {
        theme: 'system',
        language: 'zh',
        notifications: {
          enabled: true,
          sound: true,
          email: false,
          push: true,
        },
      },
    });
  });

  it('should update theme', () => {
    act(() => {
      useSettingsStore.getState().setTheme('dark');
    });
    
    expect(useSettingsStore.getState().settings.theme).toBe('dark');
  });

  it('should update notifications', () => {
    act(() => {
      useSettingsStore.getState().setNotifications({ sound: false });
    });
    
    expect(useSettingsStore.getState().settings.notifications.sound).toBe(false);
  });

  it('should reset settings', () => {
    act(() => {
      useSettingsStore.getState().setTheme('dark');
      useSettingsStore.getState().resetSettings();
    });
    
    expect(useSettingsStore.getState().settings.theme).toBe('system');
  });
});
```

#### 2. 性能验证

```typescript
// 验证选择器优化
import { useSettingsStore } from '@/stores/settingsStore';

// ❌ 不好：整个 settings 对象变化都会重渲染
const { settings } = useSettingsStore();

// ✅ 好：只有 theme 变化才重渲染
const theme = useSettingsStore((state) => state.settings.theme);
```

---

## 6. 总结

### 6.1 最终推荐

| 方案 | 推荐度 | 适用场景 |
|------|--------|---------|
| **Zustand + React Query** | ⭐⭐⭐⭐⭐ | **7zi-frontend 项目** |
| Zustand 单独使用 | ⭐⭐⭐⭐ | 纯客户端状态 |
| Jotai | ⭐⭐⭐ | 原子化思维团队 |
| Redux Toolkit | ⭐⭐⭐ | 大型企业级应用 |

### 6.2 预期收益

| 收益项 | 说明 |
|--------|------|
| **包体积** | +1.2KB (Zustand) + 13KB (React Query) ≈ +14KB |
| **代码减少** | 预计减少 300-500 行重复代码 |
| **性能提升** | 缓存命中率 80%+，减少 60% API 请求 |
| **开发效率** | 新功能开发提速 30% |
| **维护性** | 统一模式，降低认知负担 |

### 6.3 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| 学习曲线 | 提供培训文档，1 天上手 |
| 迁移 Bug | 分阶段迁移，保留旧代码备份 |
| SSR 问题 | Zustand 和 React Query 都有 SSR 指南 |
| 类型错误 | 严格的 TypeScript 配置 |

### 6.4 后续行动

1. **立即行动** - 安装依赖，配置基础设施
2. **本周完成** - Phase 1-2（准备工作 + Zustand 迁移）
3. **下周完成** - Phase 3-4（React Query 迁移 + 测试）
4. **持续优化** - 根据使用情况调整配置

---

## 附录

### A. 参考资源

- [Zustand 官方文档](https://zustand-demo.pmnd.rs/)
- [React Query 官方文档](https://tanstack.com/query)
- [Zustand + React Query 最佳实践](https://github.com/pmndrs/zustand/wiki/Testing)
- [Next.js + React Query 集成](https://tanstack.com/query/latest/docs/react/guides/ssr)

### B. 示例代码仓库

```
src/
├── stores/              # Zustand stores
│   ├── settingsStore.ts
│   ├── themeStore.ts
│   └── chatStore.ts
│
├── hooks/               # React Query hooks
│   ├── useGitHubIssues.ts
│   ├── useGitHubCommits.ts
│   └── useGitHubStats.ts
│
├── providers/
│   └── QueryProvider.tsx
│
└── lib/
    └── queryClient.ts
```

### C. 迁移检查清单

- [ ] 安装依赖
- [ ] 配置 React Query Provider
- [ ] 创建 Zustand stores
- [ ] 迁移 SettingsContext
- [ ] 迁移 ThemeProvider
- [ ] 创建 React Query hooks
- [ ] 迁移 useDashboardData
- [ ] 更新组件使用新 hooks
- [ ] 删除旧文件
- [ ] 更新测试
- [ ] 性能验证
- [ ] 文档更新

---

**报告完成日期**: 2026-03-06  
**咨询师**: AI 咨询师  
**版本**: 1.0
