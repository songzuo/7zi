# React act() 警告和测试隔离问题修复方案

**日期**: 2026-04-28  
**类型**: 测试修复  
**状态**: 分析完成

---

## 问题概览

| 文件 | 问题类型 | 根本原因 |
|------|----------|----------|
| `AlarmConfigPanel.test.tsx` | act() 警告 | 异步 useEffect 未被 act() 包装 |
| `HistoryDataPanel.test.tsx` | act() 警告 | 异步 useEffect 未被 act() 包装 |
| `suggestions.spec.ts` | 测试隔离 | localStorage 清理不彻底 + 构造函数立即加载 |

---

## 1. AlarmConfigPanel.test.tsx

### 根本原因

组件 `AlarmConfigPanel.tsx` 在 `useEffect` 中调用异步函数 `loadRules()` 和 `loadRecentAlarms()`：

```tsx
useEffect(() => {
  loadRules()
  loadRecentAlarms()
}, [])
```

测试直接调用 `render(<AlarmConfigPanel />)` 后立即断言，但 React 的异步状态更新（`setRules`, `setRecentAlarms`）不在 `act()` 包装内，导致警告：

```
Warning: An update to AlarmConfigPanel inside a test was not wrapped in act(...)
```

### 代码修复建议

**方案 A**: 使用 `waitFor` 包装异步断言（推荐）

```tsx
import { render, screen, waitFor, act } from '@testing-library/react'

it('renders default alarm rules', async () => {
  await act(async () => {
    render(<AlarmConfigPanel />)
  })
  
  await waitFor(() => {
    expect(screen.getByText('Error Rate Alert')).toBeInTheDocument()
    expect(screen.getByText('Response Time Alert')).toBeInTheDocument()
    expect(screen.getByText('Operation Duration Alert')).toBeInTheDocument()
  })
})
```

**方案 B**: 等待数据加载完成后再断言

```tsx
it('renders aggregated metrics cards', async () => {
  render(<HistoryDataPanel />)
  
  // 等待 useEffect 完成并状态更新
  await waitFor(() => {
    expect(screen.getByText('API Requests')).toBeInTheDocument()
  }, { timeout: 3000 })
})
```

### 修复代码片段

```tsx
// 修改后的测试
it('renders default alarm rules', async () => {
  render(<AlarmConfigPanel />)
  
  await waitFor(() => {
    expect(screen.getByText('Error Rate Alert')).toBeInTheDocument()
  })
  
  await waitFor(() => {
    expect(screen.getByText('Response Time Alert')).toBeInTheDocument()
  })
  
  await waitFor(() => {
    expect(screen.getByText('Operation Duration Alert')).toBeInTheDocument()
  })
})

it('renders recent alarms section when alarms exist', async () => {
  const { monitor } = await import('@/lib/monitoring')
  vi.mocked(monitor.getAlarms).mockResolvedValueOnce([...])
  
  await act(async () => {
    render(<AlarmConfigPanel />)
  })
  
  await waitFor(() => {
    expect(screen.getByText('Recent Alarms')).toBeInTheDocument()
  })
})
```

---

## 2. HistoryDataPanel.test.tsx

### 根本原因

类似 `AlarmConfigPanel`，`HistoryDataPanel.tsx` 在 `useEffect` 中调用异步 `loadData()`：

```tsx
useEffect(() => {
  loadData()
}, [timeRange, metricType])
```

测试在 `render()` 后立即检查需要异步加载的内容（如 "API Requests", "Operations", "Errors" 等聚合指标卡片），导致 act() 警告。

### 代码修复建议

```tsx
it('renders aggregated metrics cards', async () => {
  render(<HistoryDataPanel />)
  
  // 等待聚合数据加载完成
  await waitFor(() => {
    expect(screen.getByText('API Requests')).toBeInTheDocument()
    expect(screen.getByText('Operations')).toBeInTheDocument()
    expect(screen.getByText('Errors')).toBeInTheDocument()
  }, { timeout: 5000 })
})

it('displays aggregated metrics values', async () => {
  render(<HistoryDataPanel />)
  
  await waitFor(() => {
    expect(screen.getByText('100')).toBeInTheDocument()
  })
})

it('displays error breakdown', async () => {
  render(<HistoryDataPanel />)
  
  await waitFor(() => {
    expect(screen.getByText('NetworkError')).toBeInTheDocument()
  })
})
```

### 需要修复的测试列表

| 测试名称 | 需要 waitFor 包装 |
|----------|-------------------|
| `renders aggregated metrics cards` | ✅ |
| `renders chart tabs` | ✅ |
| `renders raw metrics table` | ✅ |
| `shows export panel when export button clicked` | ✅ |
| `displays aggregated metrics values` | ✅ |
| `displays error breakdown` | ✅ |

---

## 3. suggestions.spec.ts

### 根本原因

**问题 1**: `localStorage.clear()` 检查不足

```tsx
beforeEach(() => {
  if (typeof localStorage !== 'undefined') {
    localStorage.clear()
  }
})
```

问题：`typeof localStorage !== 'undefined'` 在 JSDOM 环境中总是为 `true`，但如果 `SearchHistoryManager` 实例在测试间共享，构造函数可能在 `beforeEach` 之前就被调用。

**问题 2**: `SearchHistoryManager` 构造函数立即加载 localStorage

```tsx
constructor() {
  if (typeof window !== 'undefined') {
    this.load()  // 立即加载，可能在 clear() 之前
  }
}
```

当模块被 import 时，`SearchHistoryManager` 的单例可能在测试的 `beforeEach` 之前就已经加载了旧的 localStorage 数据。

### 代码修复建议

**方案 A**: 在每个测试前确保单例被重置

```tsx
import { searchHistoryManager } from '../suggestions'

describe('getSuggestions', () => {
  beforeEach(() => {
    // 确保单例状态被清除
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
    }
    // 重置管理器内部状态
    searchHistoryManager.clear?.()
  })
})
```

**方案 B**: 改进 localStorage 清理逻辑

```tsx
beforeEach(() => {
  // 清除所有可能的存储
  if (typeof localStorage !== 'undefined') {
    localStorage.clear()
    // 清除特定 key
    localStorage.removeItem('search-history-v1')
  }
})
```

**方案 C**: 使用 vi.spyOn 模拟 localStorage

```tsx
beforeEach(() => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    clear: vi.fn(),
    removeItem: vi.fn(),
  }
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  })
})
```

### 推荐的完整修复

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getSuggestions,
  recordSearch,
  clearSearchHistory,
  getRecentSearches,
  removeSearchHistory,
  getPopularSearches,
  updateMockData,
  // 确保导出单例以便重置
} from '../suggestions'

// 在模块级别重置 localStorage
const STORAGE_KEY = 'search-history-v1'

describe('getSuggestions', () => {
  beforeEach(() => {
    // 彻底清除存储
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
      localStorage.removeItem(STORAGE_KEY)
    }
  })
  
  afterEach(() => {
    // 测试后再次清理
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
    }
  })
  // ... tests
})
```

---

## 预估修复工作量

| 文件 | 修改测试数 | 复杂度 | 预估时间 |
|------|-----------|--------|----------|
| `AlarmConfigPanel.test.tsx` | 6-8 个 | 低 | 15 分钟 |
| `HistoryDataPanel.test.tsx` | 6-8 个 | 低 | 15 分钟 |
| `suggestions.spec.ts` | 3-5 个 | 中 | 20 分钟 |

**总计**: 约 45-60 分钟

---

## 关键修复原则

1. **所有异步状态更新必须用 `act()` 或 `waitFor()` 包装**
2. **每个测试的 beforeEach 必须彻底清理共享状态**
3. **组件的 useEffect 依赖项变化时，测试需要等待**
4. **对于依赖异步数据的断言，使用 `await waitFor()` 而非同步断言**

---

## 测试验证命令

修复完成后，运行以下命令验证：

```bash
cd 7zi-frontend
npm test -- --run src/components/monitoring/__tests__/AlarmConfigPanel.test.tsx
npm test -- --run src/components/monitoring/__tests__/HistoryDataPanel.test.tsx
npm test -- --run src/lib/search/__tests__/suggestions.spec.ts
```

预期结果：无 act() 警告，测试全部通过。