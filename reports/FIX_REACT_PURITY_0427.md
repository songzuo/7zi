# React 渲染纯度修复报告

**日期**: 2026-04-27
**问题**: React 组件中 `Date.now()` 在渲染期间被重复调用，导致渲染纯度问题和不必要的重渲染

---

## 修复概述

将组件中直接调用 `Date.now()` 的模式替换为使用 `useRef` 存储稳定时间戳的方案，确保时间戳在单个渲染周期内保持一致。

---

## 修改的文件

### 1. `src/components/dashboard/ScheduleHistory.tsx`

| 行号 | 修改内容 |
|------|----------|
| 13 | 添加 `useRef` 到 import: `import { FC, useState, useEffect, useMemo, useRef } from 'react'` |
| 229 | 函数签名变更: `filterByTimeRange` 增加 `now: number` 参数 |
| 434 | 添加稳定时间戳: `const nowRef = useRef(Date.now())` |
| 456 | 传递稳定时间戳: `filterByTimeRange(result, timeRange, nowRef.current, customStartTime, customEndTime)` |

**修改详情**:
- 工具函数 `filterByTimeRange` 改为接收 `now` 参数而非内部调用 `Date.now()`
- 主组件添加 `useRef` 存储初始化时的时间戳

### 2. `src/components/dashboard/TaskQueueView.tsx`

| 行号 | 修改内容 |
|------|----------|
| 97 | `TaskCardProps` 接口增加 `currentTime?: number` 属性 |
| 204 | `formatTime` 函数签名变更: 增加可选参数 `now?: number` |
| 225 | `formatDeadline` 函数签名变更: 增加可选参数 `now?: number` |
| 367 | `TaskCard` 组件接收 `currentTime` 参数 |
| 374 | 调用 `formatDeadline` 时传入 `currentTime` |
| 476 | 调用 `formatTime` 时传入 `currentTime` |
| 548 | 添加稳定时间戳: `const nowRef = useRef(Date.now())` |
| 996, 1023 | `TaskCard` 调用时传递 `currentTime={nowRef.current}` |

**修改详情**:
- 工具函数 `formatTime` 和 `formatDeadline` 改为接收可选的 `now` 参数
- 内部使用三元操作符 `now ?? Date.now()` 提供向后兼容
- `TaskCard` 组件接收 `currentTime` prop 并传递给格式化函数
- 主组件 `TaskQueueView` 添加 `useRef` 存储时间戳
- 所有 `TaskCard` 实例调用处传递 `currentTime={nowRef.current}`

---

## 技术方案

### 问题模式（修复前）
```tsx
// 每次渲染都重新调用 Date.now()
function formatTime(timestamp: number): string {
  const now = Date.now()  // ❌ 渲染纯度问题
  const diff = now - timestamp
  // ...
}
```

### 修复后模式
```tsx
// 工具函数接收 now 参数
function formatTime(timestamp: number, now?: number): string {
  const currentTime = now ?? Date.now()  // ✅ 可选参数提供回退
  const diff = currentTime - timestamp
  // ...
}

// 组件内使用 useRef 存储稳定时间戳
const nowRef = useRef(Date.now())

// 渲染时传递稳定时间戳
<TaskCard currentTime={nowRef.current} />
```

---

## 影响范围

### 已修复
- `ScheduleHistory.tsx`: `filterByTimeRange` 函数内的日期计算
- `TaskQueueView.tsx`: `formatTime` 和 `formatDeadline` 函数内的日期计算

### 未修复（工具函数/非渲染路径）
以下文件中的 `Date.now()` 位于工具函数或非渲染路径，不影响 React 渲染纯度：
- `src/lib/audit-log/*.ts` - 后端服务层
- `src/lib/db/*.ts` - 数据库层
- `src/components/workflow/*.tsx` - 一次性 ID 生成
- 测试文件

---

## 验证方法

1. 运行 `npm run build` 确认无编译错误
2. 运行相关单元测试确认功能正常
3. 可使用 React DevTools Profiler 验证重渲染是否减少
