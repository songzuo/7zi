# 7zi-frontend 代码重复分析

## 最严重的5个重复问题

### 1. PerformanceDashboard (333行)

- **位置**: `src/components/PerformanceDashboard.tsx` vs `src/features/monitoring/components/PerformanceDashboard.tsx`
- **重复度**: 100% (完全重复)
- **影响**: 333行
- **使用情况**: 只有 `@/features/monitoring` 导出使用
- **建议**: 删除 `src/components/` 版本

### 2. EnhancedPerformanceDashboard (575行)

- **位置**: `src/components/EnhancedPerformanceDashboard.tsx` vs `src/features/monitoring/components/EnhancedPerformanceDashboard.tsx`
- **重复度**: 99% (只有微小差异)
- **影响**: 575行
- **使用情况**:
  - `src/app/monitoring-example/page.tsx` 使用 `@/components/EnhancedPerformanceDashboard`
  - `@/features/monitoring` 导出自己的版本
- **建议**: 更新导入后删除 `src/components/` 版本

### 3. SimplePerformanceDashboard (200行)

- **位置**: `src/components/SimplePerformanceDashboard.tsx` vs `src/features/monitoring/components/SimplePerformanceDashboard.tsx`
- **重复度**: 99%
- **影响**: 200行
- **使用情况**: 只有 `@/features/monitoring` 导出使用
- **建议**: 删除 `src/components/` 版本

### 4. WebSocketStatusPanel (321行)

- **位置**: `src/components/websocket/WebSocketStatusPanel.tsx` vs `src/features/websocket/components/WebSocketStatusPanel.tsx`
- **重复度**: 99.5% (仅差一个 "use memo")
- **影响**: 321行
- **使用情况**:
  - `src/components/websocket/index.ts` 导出
  - 无任何地方使用 features/websocket/components 版本
- **建议**: 保留 `src/components/websocket/` 版本，删除 features 版本

### 5. Modal (171行)

- **位置**: `src/components/ui/Modal.tsx` vs `src/shared/components/ui/Modal.tsx`
- **重复度**: 99% (差异: 'use client' 和 "use memo")
- **影响**: 171行
- **使用情况**:
  - 5个组件使用 `@/components/ui/Modal`
  - 无组件使用 shared 版本
- **建议**: 删除 `src/shared/components/ui/Modal.tsx`
