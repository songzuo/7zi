# 后端目录整合报告 — 2026-10-21

**日期**: 2026-10-21  
**角色**: 🏗️ 架构师  
**状态**: 已完成（基于 commit `c95d8af04` / `fba4ed154`）

---

## 1. 整合背景

项目根目录存在两套独立后端服务，分散在 `server/` 和 `workflow-engine/backend/`，存在以下问题：

| 问题 | 描述 |
|------|------|
| 部署分散 | 两个后端服务各自独立，无统一入口 |
| 端口冲突 | `workflow-engine/backend` 与 `server/websocket-server.js` 均默认 3001 |
| 依赖管理割裂 | `workflow-engine/backend` 有独立 `package.json`，`server/` 依赖全局包 |
| 定位混乱 | `workflow-engine/` 本身是独立项目（frontend/backend/v111/docs），被嵌入 7zi 工作区 |

---

## 2. 新目录结构

```
workspace/
├── 7zi-frontend/              # Next.js 前端（已有）
└── 7zi-backend/                # ✅ 新建：统一后端 monorepo
    ├── package.json            # 统一依赖管理
    ├── README.md
    ├── bin/                    # 启动脚本
    │   ├── start-websocket.sh
    │   ├── start-workflow.sh
    │   └── start-all.sh
    ├── websocket/              # 原 server/ → WebSocket 服务 (Socket.IO)
    │   ├── websocket-server.js
    │   ├── sentry-ws.js
    │   └── test-websocket.js
    ├── websocket-service/      # ✅ 新增：独立 WebSocket 微服务（Docker 支持）
    │   ├── package.json
    │   ├── Dockerfile
    │   ├── README.md
    │   ├── src/
    │   └── test/
    ├── workflow-engine/         # 原 workflow-engine/backend/
    │   ├── server.js
    │   ├── src/
    │   ├── websocket/
    │   ├── package.json        # 已保留 engines: { node: '>=18.0.0' }
    │   └── test/
    └── workflow-service/        # ✅ 新增：独立工作流微服务（Docker 支持）
        ├── package.json
        ├── Dockerfile
        ├── README.md
        ├── src/
        ├── bin/
        └── test/
```

---

## 3. 各服务职责

### 3.1 `websocket/`（原 `server/`）

- **职责**: Socket.IO WebSocket 服务器，提供实时协作功能（房间管理、文档协作、光标同步等）
- **启动命令**: `node websocket/websocket-server.js`
- **端口**: `WS_PORT` 环境变量，默认 **3010**
- **无独立 `package.json`**，依赖 `7zi-backend/package.json`

### 3.2 `websocket-service/`

- **职责**: `websocket/` 的独立微服务封装，支持 Docker 部署
- **启动命令**: `npm start`（容器内）
- **特性**: 独立 `package.json`、Dockerfile、独立测试

### 3.3 `workflow-engine/`（原 `workflow-engine/backend/`）

- **职责**: Express API 服务器 — 工作流 CRUD + 执行引擎
- **启动命令**: `node workflow-engine/server.js`
- **端口**: `WF_PORT` 环境变量，默认 **3011**
- **已有 `engines` 字段**: `node >= 18.0.0`

### 3.4 `workflow-service/`

- **职责**: `workflow-engine/` 的独立微服务封装，支持 Docker 部署
- **启动命令**: `npm start`（容器内）
- **特性**: 独立 `package.json`、Dockerfile、独立测试

---

## 4. 启动方式

### 4.1 独立启动（推荐调试用）

```bash
# WebSocket 服务（端口 3010）
./bin/start-websocket.sh
# 或
WS_PORT=3010 node websocket/websocket-server.js

# 工作流引擎（端口 3011）
./bin/start-workflow.sh
# 或
WF_PORT=3011 node workflow-engine/server.js
```

### 4.2 并行启动（生产用）

```bash
./bin/start-all.sh
# 使用 concurrently 同时启动两个服务
```

### 4.3 Docker 部署

```bash
# 各服务独立容器
docker build -t 7zi-websocket-service ./7zi-backend/websocket-service/
docker build -t 7zi-workflow-service ./7zi-backend/workflow-service/
```

---

## 5. 迁移映射表

| 原路径 | 新路径 | 说明 |
|--------|--------|------|
| `workspace/server/` | `workspace/7zi-backend/websocket/` | 整体移入 |
| `workspace/server/websocket-server.js` | `workspace/7zi-backend/websocket/websocket-server.js` | 同名文件 |
| `workspace/workflow-engine/backend/` | `workspace/7zi-backend/workflow-engine/` | 整体移入 |
| `workspace/workflow-engine/backend/server.js` | `workspace/7zi-backend/workflow-engine/server.js` | 同名文件 |
| —（新增） | `workspace/7zi-backend/websocket-service/` | 微服务封装 |
| —（新增） | `workspace/7zi-backend/workflow-service/` | 微服务封装 |
| `workspace/server/` | 可安全删除（已迁移） | 清理 |
| `workspace/workflow-engine/backend/` | 可安全删除（已迁移） | 清理 |

---

## 6. 与根目录 `server/` / `workflow-engine/` 的关系

- **根目录 `server/`**（若仍存在）: 已废弃，内容已迁移至 `7zi-backend/websocket/`。部署时应删除。
- **根目录 `workflow-engine/`**: 其 `backend/` 子目录已迁移至 `7zi-backend/workflow-engine/`。`workflow-engine/` 的 `frontend/`、`v111/`、`docs/` 等其他部分保持不变，作为独立参考项目存在。

---

## 7. 端口分配

| 服务 | 默认端口 | 环境变量 |
|------|---------|---------|
| WebSocket | 3010 | `WS_PORT` |
| Workflow Engine | 3011 | `WF_PORT` |
| 7zi-frontend | 3000 | — |

> ⚠️ 原两服务均默认 3001，已解决冲突。
