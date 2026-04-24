# 7zi Studio 架构速查

**版本**: v1.14.1  
**更新**: 2026-04-23  
**技术栈**: Next.js 16.2.4 + React 19.2.4 + TypeScript + Zustand + Socket.IO

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
│   ├── lib/                    # 工具库 (73个模块, 435K 行)
│   │   ├── api/                # API 客户端
│   │   ├── websocket-manager.ts # WebSocket 管理
│   │   ├── auth/               # 认证
│   │   ├── permissions.ts      # 权限系统
│   │   ├── performance/        # 性能监控
│   │   ├── workflow/           # 工作流引擎
│   │   ├── ai/                # AI 集成
│   │   ├── collab/            # 实时协作
│   │   └── ...
│   ├── stores/                 # Zustand 状态管理
│   ├── hooks/                 # 自定义 Hooks
│   ├── types/                 # TypeScript 类型
│   └── locales/               # 国际化资源
├── tests/                      # Vitest 测试配置
├── e2e/                       # Playwright E2E 测试
└── docs/                      # 详细文档 (276 个)
```

---

## 📦 核心模块状态

| 模块 | 状态 | 行数 | 说明 |
|------|------|------|------|
| **WebSocket Manager** | ✅ 成熟 | ~1455 | 心跳监控、重连、压缩 |
| **权限系统** | ✅ 成熟 | ~945 | RBAC、45+ 细粒度权限 |
| **状态管理** | ⚠️ 需优化 | - | Store 职责需明确 |
| **API 层** | ⚠️ 需优化 | - | 缺少统一抽象 |
| **错误处理** | ⚠️ 需统一 | - | 分散且重复 |
| **a2a/ 模块** | 🔄 清理中 | ~2000 | 3,301 未使用导出待清理 |

---

## 🚀 常用命令

```bash
# 开发
pnpm dev                    # 启动开发服务器
pnpm dev:turbo             # Turbopack 开发模式
pnpm build                  # 生产构建

# 测试
pnpm test                   # 运行测试
pnpm test:e2e              # E2E 测试
pnpm test:coverage          # 覆盖率报告

# 代码质量
pnpm lint                   # ESLint 检查
pnpm typecheck              # TypeScript 检查
```

---

## 📊 架构健康

| 维度 | 评分 | 说明 |
|------|------|------|
| 代码组织 | 6/10 | lib/ 臃肿，需瘦身 |
| 状态管理 | 6/10 | Store 职责需明确 |
| API 设计 | 6/10 | 缺少统一抽象 |
| 错误处理 | 5/10 | 分散且重复 |
| 测试覆盖 | 7/10 | 整体较好 |
| 文档质量 | 7/10 | ✅ INDEX.md 完善 |
| **总体** | **6.5/10** | 中等健康 |

---

## ⚠️ 技术债务

| 优先级 | 问题 | 预估工作量 | 状态 |
|--------|------|-----------|------|
| P0 | ai-site 重启问题 | 2-4h | ❌ 待调查 |
| P0 | 错误处理统一 | 1-2d | 🔄 进行中 |
| P1 | lib/ 目录瘦身 | 2-3d | 🔄 进行中 |
| P1 | Store 职责规范 | 2d | 📋 规划中 |
| P2 | API 层抽象统一 | 2-3d | 📋 规划中 |

### lib/ 优化数据

- **子模块**: 73+
- **总代码行**: 435,167
- **未使用导出**: 3,301 个 (471 个文件)
- **Top 清理目标**: a2a/ 模块 (~40 未使用导出)

---

## 🔧 常见问题

| 问题 | 解决方案 |
|------|---------|
| 权限问题 | 检查 `src/lib/permissions.ts` |
| WebSocket 断开 | 检查 `src/lib/websocket-manager.ts` |
| 构建失败 | 运行 `pnpm typecheck` |
| 测试失败 | 检查 `tests/` 目录 |

---

## 📚 详细文档

- **文档索引**: [docs/INDEX.md](./docs/INDEX.md) - 276 个文档
- **API 文档**: [docs/API.md](./docs/API.md)
- **部署指南**: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- **CHANGELOG**: [CHANGELOG.md](./CHANGELOG.md)

---

## 🔗 部署状态

| 环境 | URL | 状态 |
|------|-----|------|
| 生产 | https://7zi.com | ✅ 运行中 |
| Visa | https://visa.7zi.com | ✅ 运行中 |
| 7zi-main (PM2) | localhost:3000 | ✅ 46h 无重启 |
| bot5 | 182.43.36.134 | ✅ 正常运行 |
| bot6 | 本机 | ✅ 磁盘 48% |

---

*此文档为架构速查，详细信息请参考 [docs/INDEX.md](./docs/INDEX.md)*
