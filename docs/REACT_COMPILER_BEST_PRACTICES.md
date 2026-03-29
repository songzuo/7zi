# React Compiler 最佳实践文档

**版本**: v1.0
**更新日期**: 2026-03-29
**适用于**: 7zi Frontend v1.4.0+

---

## 📋 目录

1. [概述](#概述)
2. [启用配置](#启用配置)
3. [使用指南](#使用指南)
4. [性能优化](#性能优化)
5. [常见问题](#常见问题)
6. [故障排查](#故障排查)

---

## 概述

### 什么是 React Compiler？

React Compiler 是 React 团队推出的自动优化编译器，它可以：

- **自动 memoization**: 无需手动使用 `useMemo`、`useCallback`、`React.memo`
- **优化重渲染**: 减少不必要的组件重渲染
- **提升性能**: 典型场景下可提升 20-40% 的运行时性能
- **减少代码**: 移除冗余的手动优化代码

### 为什么使用 React Compiler？

**优势**:
- ✅ 自动优化，无需手动干预
- ✅ 更少样板代码，提高开发效率
- ✅ 更好的运行时性能
- ✅ 遵循 React 最佳实践

**权衡**:
- ⚠️ 构建时间增加 5-15%
- ⚠️ 需要遵循 Rules of Hooks
- ⚠️ 部分第三方库可能不兼容

---

## 启用配置

### 环境变量

**服务端环境变量** (构建时):

```bash
# 启用/禁用 React Compiler
ENABLE_REACT_COMPILER=true

# 编译模式
REACT_COMPILER_MODE=opt-out  # opt-in | opt-out | all

# 排除模式 (可选)
REACT_COMPILER_EXCLUDE_PATTERNS=**/third-party/**,**/legacy/**
```

**客户端环境变量** (运行时):

```bash
# 用于运行时检查
NEXT_PUBLIC_REACT_COMPILER_ENABLED=true
```

### 三种编译模式

#### 1. `opt-in` 模式 (推荐初期使用)

只编译指定的目录：

```bash
ENABLE_REACT_COMPILER=true
REACT_COMPILER_MODE=opt-in
```

**默认包含目录**:
- `src/components/features`
- `src/components/dashboard`
- `src/components/tasks`
- `src/app/[locale]/dashboard`

**适用场景**:
- 初期测试
- 风险规避
- 逐步启用

#### 2. `opt-out` 模式 (推荐生产使用)

编译所有文件，排除黑名单：

```bash
ENABLE_REACT_COMPILER=true
REACT_COMPILER_MODE=opt-out
REACT_COMPILER_EXCLUDE_PATTERNS=**/third-party/**,**/legacy/**
```

**默认排除**:
- `node_modules`
- `.next`
- `build`
- `dist`
- `src/lib/third-party`
- `src/components/legacy`

**适用场景**:
- 全面启用
- 最佳性能
- 已验证环境

#### 3. `all` 模式 (谨慎使用)

编译所有文件：

```bash
ENABLE_REACT_COMPILER=true
REACT_COMPILER_MODE=all
```

**适用场景**:
- 特殊需求
- 全面测试
- 需要谨慎使用

---

## 使用指南

### 1. 启用流程

**步骤 1: 运行兼容性检测**

```bash
# 检查代码兼容性
./scripts/check-react-compiler-compatibility.sh

# 或使用 Node.js 版本
node scripts/check-react-compiler-compatibility.js
```

**步骤 2: 修复问题**

如果发现严重问题（错误），必须修复后才能启用：

```tsx
// ❌ 错误: 条件语句中的 Hook
if (condition) {
  useEffect(() => { ... }, []);
}

// ✅ 修复: 在 Hook 内部检查条件
useEffect(() => {
  if (condition) { ... }
}, []);
```

**步骤 3: 使用 opt-in 模式测试**

```bash
# 更新 .env
ENABLE_REACT_COMPILER=true
REACT_COMPILER_MODE=opt-in

# 清理缓存并构建
rm -rf .next
pnpm build

# 测试
pnpm start
```

**步骤 4: 验证性能**

访问 `/react-compiler-verify` 页面进行手动测试。

**步骤 5: 扩展到 opt-out 模式**

```bash
# 更新 .env
REACT_COMPILER_MODE=opt-out

# 重新构建
rm -rf .next
pnpm build
```

### 2. 禁用流程

**方法 1: 使用回滚脚本**

```bash
# 一键禁用
./scripts/rollback-react-compiler.sh disable

# 查看状态
./scripts/rollback-react-compiler.sh status

# 恢复
./scripts/rollback-react-compiler.sh restore
```

**方法 2: 手动禁用**

```bash
# 更新 .env
ENABLE_REACT_COMPILER=false
NEXT_PUBLIC_REACT_COMPILER_ENABLED=false

# 清理缓存
rm -rf .next

# 重新构建
pnpm build
```

### 3. 性能测试

**自动化测试**:

```bash
# 运行性能测试脚本
./scripts/quick-perf-test.sh

# 查看报告
cat reports/react-compiler-performance-*.md
```

**手动测试**:

1. 打开 `/react-compiler-verify` 页面
2. 检查 React Compiler 状态
3. 执行各种操作
4. 对比 FPS 和渲染次数
5. 使用 React DevTools Profiler 详细分析

---

## 性能优化

### 1. 可以移除的代码

React Compiler 启用后，可以逐步移除以下手动优化：

**React.memo**:

```tsx
// ❌ 不再需要
export default React.memo(function MyComponent({ data }) {
  return <div>{data}</div>;
});

// ✅ 简化为
export default function MyComponent({ data }) {
  return <div>{data}</div>;
}
```

**useMemo**:

```tsx
// ❌ 不再需要
const memoizedValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

// ✅ 简化为
const memoizedValue = computeExpensiveValue(a, b);
```

**useCallback**:

```tsx
// ❌ 不再需要
const memoizedCallback = useCallback(() => {
  doSomething(a, b);
}, [a, b]);

// ✅ 简化为
const callback = () => {
  doSomething(a, b);
};
```

### 2. 需要保留的代码

**复杂计算且结果稳定**:

```tsx
// ✅ 保留: 大型数据集的复杂计算
const result = useMemo(() => {
  return heavyComputation(largeDataSet);
}, [largeDataSet]);
```

**传递给子组件的引用**:

```tsx
// ✅ 保留: 传递给大量子组件的回调
const handleSubmit = useCallback((data) => {
  // ...
}, [dependencies]);

return (
  <div>
    {items.map(item => (
      <Item key={item.id} onSubmit={handleSubmit} />
    ))}
  </div>
);
```

### 3. 构建优化

**使用 Turbopack**:

```bash
# 开发环境
pnpm dev --turbo

# 生产构建
pnpm build:turbo
```

**增量构建**:

```bash
# 使用 .next 缓存
pnpm build
```

---

## 常见问题

### Q1: 构建时间增加太多怎么办？

**A**: 使用以下方法优化：

1. 使用 Turbopack
2. 使用 `opt-in` 模式减少编译范围
3. 增量构建
4. CI/CD 缓存

### Q2: 某些组件不兼容怎么办？

**A**: 使用排除模式：

```bash
# 排除不兼容的文件
REACT_COMPILER_EXCLUDE_PATTERNS=**/third-party/**,**/legacy/**
```

或使用 `opt-in` 模式只编译兼容的组件。

### Q3: 如何验证 React Compiler 是否生效？

**A**: 有多种方法：

1. 检查构建日志中是否有 React Compiler 相关输出
2. 查看构建产物中是否包含 `react-compiler-runtime`
3. 访问 `/react-compiler-verify` 页面检查状态
4. 使用 React DevTools 查看重渲染次数

### Q4: 性能提升不明显怎么办？

**A**: 检查以下几点：

1. 确认 React Compiler 确实启用（检查构建日志）
2. 检查是否有不兼容的组件导致回退
3. 使用 React DevTools Profiler 分析重渲染
4. 确认测试场景确实存在性能问题

### Q5: 出现错误如何回滚？

**A**: 快速回滚步骤：

```bash
# 1. 禁用编译器
./scripts/rollback-react-compiler.sh disable

# 2. 重新构建
rm -rf .next
pnpm build

# 3. 部署
git push
```

---

## 故障排查

### 1. 构建失败

**检查清单**:

- [ ] 确认 Node.js 版本 ≥ 18
- [ ] 确认依赖已安装: `pnpm install`
- [ ] 检查是否有语法错误
- [ ] 检查是否有 TypeScript 错误
- [ ] 清理缓存: `rm -rf .next node_modules`
- [ ] 重新安装依赖: `pnpm install`

**常见错误**:

**错误 1: `Cannot read properties of undefined (reading 'H')`**

原因: Babel 配置冲突

解决:
```bash
# 移除 babel-plugin-react-compiler
pnpm remove babel-plugin-react-compiler

# 重命名 babel.config.js
mv babel.config.js babel.config.js.bak
```

**错误 2: `Module not found: Can't resolve 'react-is'`**

原因: 缺少依赖

解决:
```bash
pnpm add react-is
```

### 2. 运行时错误

**检查清单**:

- [ ] 检查浏览器控制台错误
- [ ] 检查是否有 Rules of Hooks 违规
- [ ] 检查是否有 props mutation
- [ ] 检查第三方库兼容性
- [ ] 使用 React DevTools 分析组件

**常见错误**:

**错误 1: `Rendered more hooks than during the previous render`**

原因: 条件语句中使用了 Hooks

解决:
```tsx
// ❌ 错误
if (condition) {
  useEffect(() => { ... }, []);
}

// ✅ 修复
useEffect(() => {
  if (condition) { ... }
}, []);
```

**错误 2: `Cannot update a component while rendering a different component`**

原因: 组件间状态更新冲突

解决: 使用 `useEffect` 延迟更新

### 3. 性能问题

**检查清单**:

- [ ] 确认 React Compiler 已启用
- [ ] 检查是否有组件未被编译
- [ ] 检查是否有内存泄漏
- [ ] 使用 React DevTools Profiler 分析
- [ ] 检查是否有大型计算

**性能优化建议**:

1. 使用 React DevTools Profiler 识别瓶颈
2. 检查是否有大型列表未使用虚拟化
3. 检查是否有不必要的 API 调用
4. 使用 Web Workers 处理大型计算
5. 使用 Suspense 和懒加载

---

## 监控和告警

### 1. 关键指标

| 指标 | 工具 | 警告阈值 | 严重阈值 |
|-----|------|----------|----------|
| Web Vitals | Lighthouse | < 90 | < 80 |
| FPS | React DevTools | < 50 | < 30 |
| 重渲染次数 | React DevTools | +50% | +100% |
| 错误率 | Sentry | > 1% | > 5% |
| 构建时间 | CI/CD | +20% | +50% |

### 2. 监控工具

**Lighthouse CI**:

```bash
npm install -g @lhci/cli
lhci autorun
```

**Sentry**:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
});
```

### 3. 告警配置

**Web Vitals 告警**:

```typescript
import { useReportWebVitals } from 'next/web-vitals';

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (metric.name === 'LCP' && metric.value > 2500) {
      // 发送告警
      sendAlert('LCP 过高', metric);
    }
  });

  return null;
}
```

---

## 参考资料

### 官方文档

- [React Compiler 官方文档](https://react.dev/learn/react-compiler)
- [Next.js React Compiler 配置](https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler)
- [React Compiler Working Group](https://github.com/reactwg/react-compiler)

### 项目文档

- `REACT_COMPILER_OPTIONAL_IMPLEMENTATION.md` - 实施报告
- `REACT_COMPILER_VERIFICATION_REPORT.md` - 验证报告
- `REACT_COMPILER_VERIFICATION_AND_OPTIMIZATION.md` - 优化报告
- `CHANGELOG.md` - 版本变更日志

---

**文档版本**: 1.0
**最后更新**: 2026-03-29
**下次审查**: 2026-04-29
