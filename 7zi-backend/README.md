# 7zi Backend Services

统一的后端服务目录，整合了 WebSocket 服务器和工作流引擎。

## 📁 目录结构

```
7zi-backend/
├── package.json           # 统一依赖管理
├── README.md              # 本文档
├── bin/                   # 启动脚本
│   ├── start-websocket.sh
│   ├── start-workflow.sh
│   └── start-all.sh
├── websocket/             # WebSocket 服务 (Socket.IO)
│   ├── websocket-server.js  # 服务入口
│   ├── lib/                # 纯逻辑模块 (可独立测试)
│   │   ├── config.js       # 环境变量加载与默认值
│   │   ├── server.js       # HTTP/WS 服务核心
│   │   ├── auth.js         # 认证中间件
│   │   ├── jwt-secret.js   # JWT 密钥校验
│   │   ├── room-manager.js # 房间生命周期管理
│   │   └── handlers.js     # 事件处理器
│   └── __tests__/          # Jest 测试 (10 套件 / 111 用例)
└── workflow-engine/       # 工作流引擎 (Express)
    ├── server.js
    ├── __tests__/          # Jest 测试
    └── jest.config.js
```

## 🚀 快速开始

### 前置要求
- Node.js >= 18.0.0
- pnpm (推荐) 或 npm

### 安装依赖

```bash
cd 7zi-backend
pnpm install
```

### 启动服务

**启动所有服务:**
```bash
pnpm start
# 或使用脚本
./bin/start-all.sh
```

**仅启动 WebSocket 服务:**
```bash
pnpm start:websocket
# 或使用脚本
./bin/start-websocket.sh
```

**仅启动工作流引擎:**
```bash
pnpm start:workflow
# 或使用脚本
./bin/start-workflow.sh
```

## ⚙️ 环境变量

### WebSocket 服务
| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3002 | WebSocket 服务端口（`bin/start-all.sh` 中为 `WS_PORT`，默认 3010） |
| `NEXT_PUBLIC_SITE_URL` | http://localhost:3000 | CORS 允许的源 |
| `LOG_LEVEL` | info | 日志级别 |

### 工作流引擎
| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3002 | 工作流服务端口（`bin/start-all.sh` 中为 `WF_PORT`，默认 3011） |
| `DATABASE_URL` | - | 数据库连接字符串 |
| `REDIS_URL` | redis://localhost:6379 | Redis 连接字符串 |

### 端口速查

| 服务 | 直接运行 | `bin/start-all.sh` |
|------|---------|-------------------|
| WebSocket | 3002 | 3010 |
| 工作流引擎 | 3002 | 3011 |
| 7zi-frontend | 3000 | - |

## 📡 API 端点

### WebSocket 事件

**房间管理:**
- `room:create` - 创建房间
- `room:join` - 加入房间
- `room:leave` - 离开房间
- `room:close` - 关闭房间

**实时协作:**
- `cursor:move` - 光标移动
- `typing:start` - 开始输入
- `typing:stop` - 停止输入
- `presence:update` - 在线状态更新

### REST API (工作流引擎)

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | /api/workflows | 获取工作流列表 |
| POST | /api/workflows | 创建工作流 |
| GET | /api/workflows/:id | 获取工作流详情 |
| PUT | /api/workflows/:id | 更新工作流 |
| DELETE | /api/workflows/:id | 删除工作流 |
| POST | /api/workflows/:id/execute | 执行工作流 |

## 🧪 测试

```bash
# 运行所有测试
pnpm test

# 仅测试 WebSocket
pnpm test:websocket

# 仅测试工作流
pnpm test:workflow

# 覆盖率（WebSocket，lines 阈值 60%）
npx jest websocket/ --coverage
```

当前基线：10 个测试套件 / 111 个用例全绿，WebSocket lines 覆盖率 95.2%。

## 📝 迁移说明

原服务位置:
- `server/` → `7zi-backend/websocket/`
- `workflow-engine/backend/` → `7zi-backend/workflow-engine/`

如果你的部署脚本引用了旧路径，请更新为新路径。

## 🔗 相关文档

- [WebSocket 架构](../docs/WEBSOCKET.md)
- [工作流引擎设计](../docs/workflow-engine.md)
- [实时协作系统](../docs/realtime-collab/)

---

*最后更新: 2026-10-20*
