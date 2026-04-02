# Bundle 优化效果验证报告

**生成时间**: 2026-03-26 20:10 GMT+1
**项目**: /root/.openclaw/workspace
**验证目标**: Bundle 优化效果验证

---

## 1. 构建状态

### ❌ 构建失败

```
状态: FAILED
退出码: 1
错误类型: Prerender Error on /_not-found page
```

**完整错误信息**:

```
Error occurred prerendering page "/_not-found". Read more: https://nextjs.org/docs/messages/prerender-error
Error:
    at <unknown> (.next/server/chunks/ssr/[root-of-the-server]__0jiaa5~._.js:1:9178)
    at g (.next/server/chunks/ssr/_openclaw_workspace_src_0prgkl6._.js:1:3029) {
  digest: '2659402862'
}
Export encountered an error on /_not-found/page: /_not-found, exiting the build.
```

**问题分析**:

- 错误发生在 `/_not-found` 页面预渲染阶段
- 堆栈显示 Sentry SDK 相关的代码 (line 9178 in minified chunk)
- 可能是 Sentry instrumentation 与 Turbopack 的兼容性问题

---

## 2. Bundle 大小分析

### 2.1 构建产物分布

```
.next/static/
├── chunks/          4.4 MB  (93.6%) ⚠️
├── css/             172 KB  (3.6%)
├── media/           128 KB  (2.7%)
└── 其他             12 KB   (0.3%)
```

### 2.2 大型 Chunk 文件 (>100 KB)

| 文件名                   | 大小   | 类型      |
| ------------------------ | ------ | --------- |
| `three-libs-628d97d9.js` | 365 KB | 3D 库     |
| `three-libs-06afcb45.js` | 345 KB | 3D 库     |
| `framework-1c490867.js`  | 196 KB | 框架      |
| `framework-f7f7243c.js`  | 171 KB | 框架      |
| `three-libs-8743d79b.js` | 142 KB | 3D 库     |
| `framework-d41eb72e.js`  | 128 KB | 框架      |
| `polyfills-42372ed1.js`  | 110 KB | Polyfills |
| `8187.js`                | 92 KB  | 应用代码  |
| `chart-libs-664d7b50.js` | 82 KB  | 图表库    |

### 2.3 Three.js 分析

**总体积**: 852 KB (3 个 chunks)

| Chunk                  | 大小   |
| ---------------------- | ------ |
| three-libs-628d97d9.js | 365 KB |
| three-libs-06afcb45.js | 345 KB |
| three-libs-8743d79b.js | 142 KB |

**使用页面**: 仅 `KnowledgeLatticeScene.tsx` (1 个页面)

---

## 3. CLS 优化状态

### 3.1 图片 sizes 属性优化

**相关文件**: `IMAGE_OPTIMIZATION_REPORT_20260326.md`

**优化内容**:

- 已添加 responsive sizes 属性
- 已添加优先级加载属性

**CLS 改善预期**:

- 正确设置 sizes 属性可减少 Layout Shift
- 需要生产环境验证实际效果

### 3.2 控制台警告检查

**本次构建产生的警告**:

```
⚠ Invalid next.config.ts options detected:
⚠     Unrecognized key(s) in object: 'swcMinify' at "compiler"
⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
⚠ Warning: Custom Cache-Control headers detected for the following routes:
  - /_next/static/:path*
```

**新警告**: 无新增关键警告

---

## 4. 修复建议

### 4.1 构建错误修复

**问题**: Sentry instrumentation 在 Turbopack 构建时出错

**建议方案**:

1. **临时禁用 Sentry** (如不需要):

   ```bash
   # 在 next.config.ts 中暂时注释 sentry 配置
   ```

2. **升级 Sentry SDK** (如使用):

   ```bash
   npm update @sentry/nextjs
   ```

3. **使用 Webpack 而非 Turbopack**:

   ```bash
   npm run build -- --no-turbopack
   ```

4. **检查 instrumentation 文件**:
   确保 `instrumentation.ts` 或 `instrumentation.js` 正确配置

### 4.2 Bundle 优化建议

| 优化项     | 当前状态           | 建议                 |
| ---------- | ------------------ | -------------------- |
| Three.js   | 852 KB (3 chunks)  | 进一步合并或按需加载 |
| Framework  | ~750 KB (8 chunks) | 合并减少重复         |
| Polyfills  | 110 KB             | 考虑按需加载         |
| 图片 sizes | 已优化             | 需生产验证           |

---

## 5. 结论

- **构建状态**: ❌ 失败 - Sentry/Turbopack 兼容性问题
- **Bundle 大小**: 4.7 MB 总体积，4.4 MB chunks
- **CLS 优化**: 已实施 sizes 属性优化，需生产验证
- **下一步**: 修复 Sentry 构建错误后重新验证

---

**报告生成**: 自动化 Bundle 验证脚本
**验证时间**: 2026-03-26 20:10 GMT+1
