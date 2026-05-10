# 性能分析报告 - 2026-05-10

## 📊 项目概述
- **项目**: 7zi-frontend (Next.js 16.2.4 + React 19)
- **版本**: 1.14.2
- **架构**: 全栈应用 (API Routes + 前端)

---

## 🚨 关键性能问题

### 1. **重型依赖 (占用磁盘/内存大)**

| 依赖 | 占用 | 风险 | 建议 |
|------|------|------|------|
| `three` + `@react-three` | **38MB + 5.2MB** | 3D渲染包过大，SSR有负担 | 保持动态导入，避免SSR |
| `exceljs` | **23MB** | Excel处理库极大 | 考虑替代: `xlsx` (更轻量) |
| `better-sqlite3` | **12MB** | 原生模块，SSR问题 | 仅Server-side使用 |
| `recharts` | **8.8MB** | 图表库较大 | 已配置单独code-splitting |
| `lodash` + `lodash-es` | **4.9MB + 2.7MB** | 重复打包 | ✅ 已用webpack alias统一到lodash-es |
| `jspdf` | 大型PDF库 | 客户端渲染慢 | 考虑服务端生成PDF |

### 2. **循环依赖风险**
- 项目使用 `madge` 检测，有循环依赖检测脚本
- **建议**: 定期运行 `npm run dep:check`

### 3. **内存泄漏风险点**
- `bull` (队列) - 需要正确清理
- `better-sqlite3` - 长连接可能泄漏
- WebSocket handlers - 需要心跳/重连机制
- `zustand` stores - 避免无限增长的state

---

## ✅ 已有的性能优化

### Webpack 配置
```js
// 代码分割策略 - 已配置
- react-core: 单独打包 react/react-dom
- chart-libs: recharts 单独打包
- three-libs: three.js 单独打包
- utils-libs: lodash等工具库单独打包
```

### 图片优化
```js
- formats: ['image/avif', 'image/webp']
- minimumCacheTTL: 31536000 (1年)
- 已配置 remotePatterns
```

### Lodash 优化
```js
// 已通过 webpack alias 统一使用 lodash-es
resolve.alias: {
  'lodash': 'lodash-es',
  'lodash/': 'lodash-es/',
}
```

---

## 🔧 优化建议

### P0 - 紧急
1. **解决 `serialize-javascript` 高危漏洞**
   - `npm audit fix --force`
   - 注意: 会降级 `@ducanh2912/next-pwa` 到 8.7.1

2. **升级 `bull` 队列** (破坏性变更)
   - 当前 1.1.3 → 4.16.5
   - 需测试所有队列相关功能

### P1 - 重要
3. **考虑替换 `exceljs`**
   - 23MB太大
   - 替代: `xlsx` (约1MB) 或 `exceljs轻量版`

4. **检查 `better-sqlite3` 使用**
   - 确保仅在服务端导入
   - 验证连接池配置

5. **内存监控**
   - 配置 `NODE_OPTIONS='--max-old-space-size=4096'` (测试已配置)
   - 生产环境建议 2GB 限制

### P2 - 改进
6. **PDF生成优化**
   - 考虑 `pdf-lib` (仅300KB) 替代 `jspdf`
   - 或服务端使用 `puppeteer` / `playwright`

7. **3D资源延迟加载**
   - 确保 `@react-three/*` 完全动态导入
   - 使用 `Suspense` + `lazy`

---

## 📈 配置检查

### next.config.ts ✅
- `reactStrictMode: true` ✅
- `output: 'standalone'` ✅
- `optimizeCss: true` ✅
- `optimizePackageImports: ['lucide-react', 'recharts']` ✅

### Webpack splitChunks ✅
- 已配置 5 个独立 chunk 组
- `maxInitialRequests: 25` ✅

---

## 📝 总结

项目已有较好的性能优化基础:
- 代码分割策略完善
- 图片优化配置正确
- Lodash 统一使用 ES 版本

**主要风险**:
1. 安全漏洞 (serialize-javascript, bull)
2. 大型依赖 (three, exceljs)
3. 需要验证升级兼容性

**建议优先处理**: 高危漏洞 + bull 升级兼容性测试
