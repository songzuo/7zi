# 7zi-frontend 构建状态报告

**日期**: 2026-04-28  
**版本**: 1.14.1  
**构建命令**: `pnpm build` (webpack mode, production)

---

## ✅ 构建结果: 成功

构建完成，所有 67 个页面成功生成。

---

## 📊 关键指标

| 指标 | 状态 |
|------|------|
| 生产构建 | ✅ 成功 |
| Standalone 输出 | ✅ 存在 |
| TypeScript 验证 | ⚠️ 绕过 (ignoreBuildErrors: true) |
| 静态页面生成 | ✅ 67/67 完成 |
| PWA Service Worker | ✅ 生成 |

---

## ⚠️ 警告信息

### 1. TypeScript 导出警告
```
./src/lib/websocket/index.ts
export 'WebSocketClient' (reexported as 'WebSocketClient') was not found in './manager'
(possible exports: CONNECTION_STATE_STORAGE_KEY, ConnectionState, ..., WebSocketManager)
```

**影响**: collaboration-cursor-demo 页面使用了 `WebSocketClient`，但该类未从 manager 模块导出。

**导入链路**:
```
./src/lib/websocket/index.ts
└─> ./src/lib/websocket-manager.ts
    └─> ./src/features/collab/hooks/useCollabWebSocket.ts
        └─> ./src/app/collaboration-cursor-demo/page.tsx
```

**状态**: 构建成功，但存在运行时风险。已通过 `ignoreBuildErrors: true` 绕过。

### 2. 资源大小警告

**超过推荐大小 (250 KiB)**:
- `three-core-c173e56c.75ccb75ea2f51766.js` (345 KiB)
- `three-core-2129d44f.5e42ceec5e5933ef.js` (365 KiB)

**entrypoint 超过推荐大小 (300 KiB)**:
- `main` (767 KiB combined)

**建议**: 考虑对 Three.js 进行代码分割或动态导入优化。

### 3. Cache-Control 警告
```
Warning: Custom Cache-Control headers detected for the following routes:
  - /_next/static/:path*
```
建议检查 PWA 配置中的缓存策略。

---

## 📦 Standalone 输出

路径: `.next/standalone/7zi-frontend/`

```
7zi-frontend/
├── data/
├── node_modules/
├── package.json
└── server.js
```

Standalone 构建成功，可以独立部署。

---

## 🔧 依赖版本

| 依赖 | 版本 |
|------|------|
| next | 16.2.4 |
| react | 19.2.5 |
| react-dom | 19.2.5 |
| typescript | 5.9.3 |
| zustand | 5.0.12 |
| @tiptap/core | 2.27.2 |
| socket.io-client | 4.8.3 |
| three | 0.183.2 |

---

## 📋 总结

- **构建成功**: ✅ 是
- **可部署**: ✅ 是
- **需要关注**: WebSocketClient 导出缺失可能导致运行时错误
- **PWA**: ✅ 已生成 Service Worker