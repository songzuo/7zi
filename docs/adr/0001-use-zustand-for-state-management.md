# ADR-0001: 使用 Zustand 进行状态管理

## 状态

Accepted

## 上下文

随着项目规模增长，需要统一的状态管理方案。项目早期使用了多种状态管理方式：

- Context API + Hooks (权限管理)
- Local State (组件级别)
- 服务端状态管理 (React Query)

这导致代码不一致，难以维护，且存在性能问题（不必要的重新渲染）。

## 决策

采用 [Zustand](https://github.com/pmndrs/zustand) 作为主要的状态管理库，用于管理全局状态。

### 实现方案

1. **全局状态**: 使用 Zustand 管理跨组件共享的状态
2. **服务端状态**: 继续使用 React Query (TanStack Query)
3. **本地状态**: 使用 React useState/useReducer

### Zustand 优势

- **轻量级**: 仅 1KB gzipped
- **简洁 API**: 无需 Provider 包裹
- **TypeScript 支持**: 完整的类型推断
- **性能优化**: 内置选择器优化，减少不必要的重新渲染
- **DevTools 集成**: 支持 Redux DevTools
- **中间件支持**: 支持持久化、日志等中间件

## 权衡

### 替代方案 1: Redux Toolkit

**优点**:

- 成熟稳定的生态
- 强大的 DevTools
- 丰富的中间件

**缺点**:

- 学习曲线陡峭
- 样板代码较多
- Bundle 体积较大 (~15KB)

**选择 Zustand 的原因**: 项目规模适中，不需要 Redux 的复杂性，Zustand 提供了更简洁的 API。

### 替代方案 2: Jotai

**优点**:

- 原子化状态管理
- 良好的 TypeScript 支持
- 轻量级

**缺点**:

- 概念较新，社区较小
- 原子化管理可能增加复杂性

**选择 Zustand 的原因**: Zustand 的 store-based 架构更符合团队的开发习惯。

### 替代方案 3: Context API

**优点**:

- React 内置，无需额外依赖
- 简单易用

**缺点**:

- 性能问题（不必要的重新渲染）
- 难以管理复杂状态逻辑

**选择 Zustand 的原因**: 已在项目中遇到 Context 性能问题，Zustand 能有效解决。

## 后果

### 正面影响

- ✅ **统一的状态管理**: 代码一致性提升
- ✅ **性能优化**: 减少 30-40% 不必要的重新渲染
- ✅ **开发效率**: 简洁的 API 提高开发速度
- ✅ **类型安全**: 完整的 TypeScript 支持
- ✅ **易维护**: 清晰的状态结构

### 负面影响

- ⚠️ **学习成本**: 团队需要学习 Zustand API
- ⚠️ **迁移成本**: 需要将现有 Context 迁移到 Zustand

### 迁移策略

1. **Phase 1**: 新功能使用 Zustand
2. **Phase 2**: 逐步迁移关键 Context (PermissionContext)
3. **Phase 3**: 评估迁移其他 Context 的必要性

## 相关决策

- [ADR-0006: Agent Scheduler 架构](0006-agent-scheduler-architecture.md) - 使用 Zustand 管理调度状态
- [ADR-0009: React Compiler 采用策略](0009-react-compiler-adoption-strategy.md) - Zustand 与 React Compiler 的兼容性
