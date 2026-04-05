# React 性能优化总结

**最后更新**: 2026-04-04
**版本**: 1.12.3

---

## 概述

本文档总结了 7zi-frontend 项目的 React 性能优化工作。

---

## 已启用的优化

### 1. React Compiler

```typescript
// next.config.ts
reactCompiler: {
  compilationMode: 'annotation',
}
```

- **状态**: ✅ 已启用
- **说明**: 使用 annotation 模式，仅对添加 'use memo' 的组件进行优化

### 2. Tree Shaking

```typescript
// next.config.ts - optimizePackageImports
experimental: {
  optimizePackageImports: [
    'lucide-react',
    'zustand',
    'date-fns',
    'three',
    'recharts',
    'zod',
    'react-i18next',
    'clsx',
    'tailwind-merge',
  ],
}
```

- **状态**: ✅ 已配置

### 3. 代码分割 (splitChunks)

```typescript
// next.config.ts - webpack 配置
config.optimization.splitChunks = {
  chunks: 'all',
  cacheGroups: {
    // 独立分包策略
    'three-core': { /* ... */ },
    'chart-libs': { /* ... */ },
    'lucide-icons': { /* ... */ },
    'react-core': { /* ... */ },
    'next-core': { /* ... */ },
  },
}
```

- **状态**: ✅ 已配置
- **效果**: 大型库已单独打包

### 4. 压缩

```typescript
compress: true,
generateEtags: true,
```

- **状态**: ✅ 已启用

### 5. 生产环境优化

```typescript
// 移除 console.log
compiler: {
  removeConsole: isProduction
    ? { exclude: ['error', 'warn', 'info'] }
    : false,
}
```

- **状态**: ✅ 已配置

---

## Bundle 大小现状

| 页面 | 当前大小 | 目标 | 状态 |
|------|----------|------|------|
| 登录页 | 802 KiB | 300 KiB | ❌ |
| 定价页 | 608 KiB | 300 KiB | ❌ |
| 首页 | 570 KiB | 300 KiB | ❌ |
| 知识图谱 | 572 KiB | 300 KiB | ❌ |

---

## 优化建议

### 高优先级

1. **React Flow 动态导入**
   - 预期减少: 200-300 KB
   - 实施: 将 React Flow 组件改为 dynamic 导入

2. **Polyfills 优化**
   - 检查并移除不必要的 polyfills

### 中优先级

3. **富文本编辑器按需加载**
4. **页面组件代码分割**

---

## 验证方法

```bash
# 构建分析
npm run build

# 检查 chunk 大小
ls -lh .next/static/chunks/*.js | sort -k5 -h
```

---

## 相关文档

- [Bundle 分析报告 v1.12.3](./REPORT_BUNDLE_ANALYSIS_v1123.md)
- [代码优化报告](./CODE_OPTIMIZATION_REPORT.md)
