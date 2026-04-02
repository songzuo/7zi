# React Compiler 配置报告

**日期**: 2026-03-29
**状态**: ✅ 配置完成

---

## 摘要

成功完成 React Compiler 配置，构建验证通过。

---

## 配置变更

### 1. 创建 `babel.config.js`

```javascript
module.exports = {
  presets: ['next/babel'],
  plugins: [
    [
      'babel-plugin-react-compiler',
      {
        target: '19', // React 19 目标
      },
    ],
  ],
}
```

**位置**: `/root/.openclaw/workspace/babel.config.js`

### 2. 更新 `next.config.ts`

**修复问题**: 合并重复的 `experimental` 配置块，并将 `reactCompiler` 移至顶级配置（Next.js 16+ 要求）

**变更前**:

```typescript
// 配置在 experimental 内部（已废弃）
experimental: {
  reactCompiler: { ... }
}
```

**变更后**:

```typescript
// reactCompiler 现在是顶级配置
{
  ...(reactCompilerEnabled && {
    reactCompiler: {
      sources: (filename) => { ... }
    }
  }),

  experimental: {
    optimizeCss: true,
    optimizePackageImports: [...]
  }
}
```

---

## 环境变量

启用 React Compiler 需要:

```bash
ENABLE_REACT_COMPILER=true
```

可选配置:

```bash
REACT_COMPILER_MODE=opt-out    # 或 opt-in
REACT_COMPILER_EXCLUDE_PATTERNS=pattern1,pattern2
```

---

## 构建验证

```bash
ENABLE_REACT_COMPILER=true npm run build
```

**结果**: ✅ 构建成功

**输出**:

```
▲ Next.js 16.2.1 (Turbopack)
- Environments: .env.production
- Experiments (use with caution):
  ✓ optimizeCss
  · optimizePackageImports

  Creating an optimized production build ...
  Using external babel configuration from /root/.openclaw/workspace/babel.config.js

Process exited with code 0.
```

---

## 依赖状态

| 依赖                          | 版本   | 状态      |
| ----------------------------- | ------ | --------- |
| `babel-plugin-react-compiler` | ^1.0.0 | ✅ 已安装 |
| `react`                       | 19.x   | ✅ 兼容   |

---

## 使用方式

### 开发环境

```bash
ENABLE_REACT_COMPILER=true npm run dev
```

### 生产构建

```bash
ENABLE_REACT_COMPILER=true npm run build
```

### 持久启用

在 `.env.production` 或 `.env.local` 中添加:

```
ENABLE_REACT_COMPILER=true
```

---

## 源文件过滤规则

### 默认排除（黑名单）

- `node_modules`
- `.next`
- `build`
- `dist`
- `src/lib/third-party`
- `src/components/legacy`
- `src/app/standalone`

### opt-in 模式

设置 `REACT_COMPILER_MODE=opt-in` 后，仅编译以下目录:

- `src/components/features`
- `src/components/dashboard`
- `src/components/tasks`
- `src/app/[locale]/dashboard`

---

## 警告信息（非阻塞）

1. **`images.domains` 已废弃**
   - 建议迁移到 `images.remotePatterns`

2. **多 lockfile 检测**
   - 建议在 next.config.ts 中设置 `turbopack.root`

---

## 下一步建议

1. **性能验证**: 使用 React DevTools 比较优化前后性能
2. **持续监控**: 在 CI/CD 中添加 `ENABLE_REACT_COMPILER=true`
3. **清理配置**: 处理上述非阻塞警告

---

## 文件清单

| 文件              | 操作 |
| ----------------- | ---- |
| `babel.config.js` | 新建 |
| `next.config.ts`  | 修改 |

---

**配置完成** ✅
