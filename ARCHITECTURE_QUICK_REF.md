# 7zi Studio 架构速查

**版本**: v1.14.0  
**更新**: 2026-04-22  
**技术栈**: Next.js 16.2 + React 19 + TypeScript + Zustand + Socket.IO

---

## 🏗️ 项目结构

```
7zi-frontend/
├── src/
│   ├── app/                    # Next.js App Router (国际化)
│   ├── components/             # React 组件 (25+ 子目录)
│   │   ├── ui/                 # 基础 UI 组件
│   │   ├── WorkflowEditor/     # 工作流编辑器
│   │   ├── dashboard/          # 仪表盘组件
│   │   └── ...
│   ├── features/               # 功能模块 (10个)
│   │   ├── dashboard/
│   │   ├── websocket/
│   │   ├── collab/
│   │   └── ...
│   ├── lib/                    # 工具库 (41个模块)
│   │   ├── api/                # API 客户端
│   │   ├── websocket-manager.ts # WebSocket 管理 (1455行)
│   │   ├── auth/               # 认证
│   │   ├── permissions.ts      # 权限系统 (945行)
│   │   ├── performance/        # 性能监控
│   │   ├── workflow/           # 工作流引擎
│   │   └── ai/                # AI 集成
│   ├── stores/                 # Zustand 状态管理
│   ├── hooks/                 # 自定义 Hooks
│   ├── types/                 # TypeScript 类型
│   └── locales/               # 国际化资源
├── tests/                      # 测试配置
├── e2e/                       # E2E 测试
└── docs/                      # 详细文档
```

---

## 📦 核心模块

### WebSocket 模块 ✅
- **文件**: `src/lib/websocket-manager.ts` (1455行)
- **功能**: 心跳监控、指数退避重连、消息压缩 (50% 流量减少)
- **状态**: 架构成熟，功能完整

### 权限系统 ✅
- **文件**: `src/lib/permissions.ts` (945行)
- **功能**: RBAC、细粒度权限、角色管理
- **系统权限**: 45+ 细粒度权限
- **系统角色**: super_admin, admin, team_leader, developer, user, guest

### 状态管理 (Zustand) ⚠️
| Store | 行数 | 职责 |
|-------|------|------|
| `uiStore.ts` | 732 | UI 状态 |
| `filterStore.ts` | 640 | 过滤器状态 |
| `walletStore.ts` | 519 | 钱包管理 |
| `dashboardStore.ts` | 488 | 仪表盘 |
| `permissionStore.ts` | 368 | 权限状态 |

### API 层 ⚠️
- 位置: `src/lib/api/`
- 问题: API 客户端分散，缺少统一抽象

---

## 🚀 常用命令

```bash
# 开发
pnpm dev                 # 启动开发服务器
pnpm build               # 生产构建
pnpm lint                # ESLint 检查

# 测试
pnpm test                # 运行测试
pnpm test:e2e           # E2E 测试
pnpm test:coverage       # 覆盖率报告

# 代码质量
pnpm typecheck           # TypeScript 检查
pnpm analyze             # Bundle 分析
```

---

## 📊 架构健康

| 维度 | 评分 | 说明 |
|------|------|------|
| 代码组织 | 6/10 | 组件目录需重构 |
| 状态管理 | 6/10 | Store 职责需明确 |
| API 设计 | 6/10 | 缺少统一抽象 |
| 错误处理 | 5/10 | 分散且重复 |
| 测试覆盖 | 7/10 | 整体较好 |
| 文档质量 | 7/10 | ✅ INDEX.md 完善 |
| **总体** | **6.5/10** | 中等健康 |

---

## 🔧 常见问题

| 问题 | 解决方案 | 参考文档 |
|------|---------|---------|
| 权限问题 | 检查 `src/lib/permissions.ts` | [PERMISSIONS.md](./docs/PERMISSIONS.md) |
| WebSocket 断开 | 检查 `src/lib/websocket-manager.ts` | [WEBSOCKET.md](./docs/WEBSOCKET.md) |
| 构建失败 | 运行 `pnpm typecheck` | [DEPLOYMENT.md](./docs/DEPLOYMENT.md) |
| 测试失败 | 检查 `tests/` 目录 | [TESTING.md](./docs/TESTING.md) |
| 性能问题 | 查看性能监控模块 | [PERFORMANCE.md](./docs/PERFORMANCE.md) |

---

## 📚 详细文档

- **架构文档**: [docs/INDEX.md](./docs/INDEX.md) - 完整文档索引
- **API 文档**: [docs/API.md](./docs/API.md)
- **部署指南**: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- **开发指南**: [docs/DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md)
- **CHANGELOG**: [CHANGELOG.md](./CHANGELOG.md)

---

## ⚠️ 技术债务 (P0-P1)

| 优先级 | 问题 | 预估工作量 |
|--------|------|-----------|
| P0 | 错误处理架构统一 | 1-2 天 |
| P1 | API 层抽象统一 | 2-3 天 |
| P1 | Store 间依赖规范 | 2 天 |
| P2 | 组件目录重构 | 2-3 天 |

---

*此文档为架构速查，详细信息请参考 [docs/INDEX.md](./docs/INDEX.md)*
