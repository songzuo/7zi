# 架构整合方案报告 - 后端代码 Consolidation

**日期**: 2026-10-20  
**角色**: 🏗️ 架构师  
**状态**: 已完成调研

---

## 1. 当前后端代码分布

### 1.1 `server/` 目录
- **性质**: 独立的 WebSocket 服务器（Socket.IO）
- **文件**:
  - `websocket-server.js` - 主 WebSocket 服务器，提供实时协作功能（房间管理、文档协作、光标跟踪等）
  - `sentry-ws.js` - Sentry APM 集成
  - `test-websocket.js` / `test-sentry-apm.js` - 测试文件
- **依赖**: 无独立 `package.json`，依赖全局安装的 Socket.IO 等
- **端口**: 默认 3001
- **定位**: 7zi 前端的实时协作后端

### 1.2 `workflow-engine/backend/` 目录
- **性质**: 工作流引擎 API 服务
- **文件**:
  - `server.js` - Express API 服务器（工作流 CRUD + 执行引擎）
  - `src/engine/` - 核心引擎代码（节点、执行器）
  - `websocket/` - WebSocket 集成示例
  - `test/` / `coverage/` - 测试
  - `package.json` - **已有 `engines` 字段** (`node >=18.0.0`)
- **端口**: 默认 3001（与 websocket-server 冲突！）
- **定位**: 工作流自动化引擎

### 1.3 问题诊断

| 问题 | 描述 |
|------|------|
| **分散部署** | 两个后端服务各自独立，无统一入口 |
| **端口冲突** | `workflow-engine/backend` 和 `server/websocket-server.js` 都默认用 3001 |
| **依赖管理割裂** | `workflow-engine/backend` 有独立 `package.json`，而 `server/` 依赖全局包 |
| **根目录 `package.json`** | 是 **7zi-frontend** 的配置，不是后端 monorepo |
| **workflow-engine 定位混乱** | 本身是独立项目（frontend/backend/v111/docs），但被嵌入 7zi 工作区 |

---

## 2. 整合方案

### 2.1 方案 A（推荐）: 统一为 `7zi-backend/`

```
workspace/
├── 7zi-frontend/          # Next.js 前端（已有）
├── 7zi-backend/            # 新建：统一后端
│   ├── server/             # 原 server/ 内容（WebSocket 服务）
│   ├── workflow-engine/     # 原 workflow-engine/backend/ 内容
│   └── package.json        # 统一后端 package.json
├── workflow-engine/         # 可降级为参考/模板库，或移除
└── ...
```

**优点**:
- 清晰的前后端分离
- `7zi-backend/server/` 和 `7zi-backend/workflow-engine/` 职责分明
- 统一 `package.json` 管理所有后端依赖
- 消除端口冲突（通过不同端口或进程管理）

**缺点**:
- 需要迁移文件
- workflow-engine 需决定是保留为独立项目还是完全合并

### 2.2 方案 B: 保留现状，合并端口配置

仅解决端口冲突，不移动代码。

**优点**: 最少改动  
**缺点**: 代码组织无改善

---

## 3. 建议的合并步骤（方案 A）

### Phase 1: 创建新结构
```bash
mkdir -p 7zi-backend/{server,workflow-engine}
```

### Phase 2: 迁移文件
```bash
mv server/* 7zi-backend/server/
mv workflow-engine/backend/* 7zi-backend/workflow-engine/
```

### Phase 3: 统一 package.json
在 `7zi-backend/package.json` 中合并两个服务的依赖和脚本。

### Phase 4: 更新部署脚本
- 更新 `DEPLOYMENT.md`
- 更新 `start.sh` 启动脚本

### Phase 5: 清理
- 决定是否保留原 `workflow-engine/` 目录（作为模板库？）
- 确认 `server/` 原目录已清空

---

## 4. engines 字段检查结果

| 文件 | engines 字段 | 值 |
|------|-------------|-----|
| `workflow-engine/backend/package.json` | ✅ 有 | `node >=18.0.0` |
| `package.json` (根目录) | ❌ 无 | N/A（是 frontend 的配置） |
| `server/` 目录 | ❌ 无 | 无独立 package.json |

**建议**: 根目录 `package.json` 不需要 `engines` 字段（它是 frontend 配置）。如果采用方案 A，应在 `7zi-backend/package.json` 中统一添加。

---

## 5. 架构图（方案 A）

```
┌─────────────────────────────────────────────────────────┐
│                    7zi 工作区 workspace/                   │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐   ┌──────────────────────────────┐    │
│  │ 7zi-frontend │   │       7zi-backend/            │    │
│  │   (Next.js)  │   │  ┌────────────────────────┐  │    │
│  │              │   │  │  server/               │  │    │
│  │  - Port 3000 │   │  │  (WebSocket/Socket.IO)│  │    │
│  │  - 实时协作   │   │  │  - Port 3001           │  │    │
│  │  - 工作流 UI  │   │  └────────────────────────┘  │    │
│  └──────────────┘   │  ┌────────────────────────┐  │    │
│                     │  │  workflow-engine/       │  │    │
│                     │  │  (Express API + Engine)│  │    │
│                     │  │  - Port 3002           │  │    │
│                     │  └────────────────────────┘  │    │
│                     │  ┌────────────────────────┐  │    │
│                     │  │  package.json          │  │    │
│                     │  │  (统一依赖管理)         │  │    │
│                     │  └────────────────────────┘  │    │
│                     └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## 6. 下一步行动

| 优先级 | 行动 | 负责 |
|--------|------|------|
| P0 | 解决端口冲突（3001→3002 for workflow-engine） | 架构师 |
| P1 | 创建 `7zi-backend/` 目录结构 | 架构师 |
| P2 | 迁移并合并 `package.json` | 架构师 |
| P2 | 更新部署文档 | 系统管理员 |

---

**结论**: 推荐**方案 A**，将散落的 `server/` 和 `workflow-engine/backend/` 统一到 `7zi-backend/` 目录下，实现清晰的前后端分离架构。
