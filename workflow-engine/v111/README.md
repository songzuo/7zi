# OpenClaw Workflow Engine v1.11.0

> 企业级智能工作流编排引擎 - 支持 DAG、分布式执行、Bull 队列和 Redis 持久化

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/openclaw-workflow-engine.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

## ✨ 特性

### 🎯 核心功能

- **DAG 支持**: 完整的有向无环图（DAG）工作流定义
- **可视化设计**: 支持拖拽式节点编辑（配合前端）
- **异步执行**: 基于 Bull 的异步任务队列
- **分布式部署**: 支持多节点集群部署
- **状态持久化**: Redis 存储工作流和执行状态
- **断点续传**: 定期检查点，支持从断点恢复
- **失败重试**: 多种退避策略（固定、线性、指数）
- **超时控制**: 防止任务无限期运行

### 🧩 节点类型

#### Trigger 节点
- `trigger.cron` - Cron 定时触发
- `trigger.webhook` - Webhook 触发
- `trigger.event` - 事件触发
- `trigger.manual` - 手动触发

#### Action 节点
- `action.http` - HTTP 请求
- `action.script` - 脚本执行
- `action.email` - 发送邮件
- `action.slack` - Slack 通知
- `action.database` - 数据库操作
- `action.transform` - 数据转换

#### Logic 节点
- `logic.condition` - 条件判断
- `logic.switch` - 多分支选择
- `logic.loop` - 循环迭代
- `logic.parallel` - 并行执行
- `logic.wait` - 等待/延迟

#### Integration 节点
- `integration.openai` - OpenAI 集成
- `integration.minimax` - Minimax 集成
- `integration.claude` - Claude 集成
- `integration.custom` - 自定义集成

### 🚀 高级特性

- **调度器**: Cron 表达式支持，自动触发工作流
- **事件驱动**: Webhook 和事件触发
- **依赖调度**: 基于 DAG 的依赖关系调度
- **任务优先级**: 支持不同优先级的任务
- **实时监控**: 执行状态实时追踪
- **REST API**: 完整的 RESTful API
- **OpenAPI 文档**: 自动生成的 API 文档
- **版本控制**: ✨ 工作流版本管理、回滚、分支和标签 (v1.11.0 新增)

## 📦 安装

### 前置要求

- Node.js 18.x 或更高版本
- Redis 6.x 或更高版本
- npm 或 yarn

### 安装

```bash
# 克隆仓库
git clone https://github.com/openclaw/workflow-engine.git
cd workflow-engine/v111

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件
```

## 🚀 快速开始

### 1. 启动 Redis

```bash
# 使用 Docker
docker run -d -p 6379:6379 redis:7-alpine

# 或使用本地 Redis
redis-server
```

### 2. 配置环境变量

编辑 `.env` 文件：

```env
PORT=3001
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
MAX_PARALLEL_TASKS=10
CHECKPOINT_INTERVAL=5000
```

### 3. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

服务将在 `http://localhost:3001` 启动。

### 4. 创建工作流

```bash
curl -X POST http://localhost:3001/api/workflows \
  -H "Content-Type: application/json" \
  -d @examples/data-pipeline.json
```

### 5. 执行工作流

```bash
curl -X POST http://localhost:3001/api/workflows/{workflow-id}/execute \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "inputValue": 100
    }
  }'
```

## 📚 API 文档

完整的 API 文档请参考 [docs/API.md](docs/API.md)

### 主要端点

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/workflows` | 创建工作流 |
| GET | `/api/workflows` | 获取所有工作流 |
| GET | `/api/workflows/:id` | 获取单个工作流 |
| PUT | `/api/workflows/:id` | 更新工作流 |
| DELETE | `/api/workflows/:id` | 删除工作流 |
| POST | `/api/workflows/:id/execute` | 执行工作流 |
| GET | `/api/executions/:id` | 获取执行状态 |
| POST | `/api/executions/:id/pause` | 暂停执行 |
| POST | `/api/executions/:id/resume` | 恢复执行 |
| POST | `/api/schedules` | 创建调度 |
| GET | `/api/queue/stats` | 获取队列统计 |

### 版本控制端点 (v1.11.0 新增)

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/workflows/:id/versions` | 创建新版本 |
| GET | `/api/workflows/:id/versions` | 获取版本列表 |
| GET | `/api/workflows/:id/versions/:versionId` | 获取版本详情 |
| POST | `/api/workflows/:id/rollback` | 回滚到指定版本 |
| GET | `/api/workflows/:id/versions/diff` | 对比两个版本 |
| POST | `/api/workflows/:id/branches` | 创建分支 |
| GET | `/api/workflows/:id/branches` | 获取分支列表 |
| DELETE | `/api/workflows/:id/branches/:name` | 删除分支 |
| POST | `/api/workflows/:id/tags` | 创建标签 |
| GET | `/api/workflows/:id/tags` | 获取标签列表 |
| DELETE | `/api/workflows/:id/tags/:name` | 删除标签 |
| GET | `/api/workflows/:id/timeline` | 获取版本时间线 |

## 🏗️ 项目结构

```
workflow-engine/v111/
├── src/
│   ├── api/                    # REST API
│   │   └── WorkflowAPI.ts
│   ├── engine/                 # 执行引擎
│   │   ├── WorkflowEngine.ts
│   │   └── executors/
│   │       └── index.ts
│   ├── queue/                  # 队列管理
│   │   └── QueueManager.ts
│   ├── scheduler/              # 调度器
│   │   └── Scheduler.ts
│   ├── storage/                # 存储层
│   │   └── RedisStorage.ts
│   ├── logging/                # 日志
│   │   └── Logger.ts
│   ├── types/                  # 类型定义
│   │   └── workflow.types.ts
│   └── index.ts                # 入口文件
├── docs/                       # 文档
│   ├── API.md
│   └── DEPLOYMENT.md
├── examples/                   # 示例工作流
│   ├── data-pipeline.json
│   └── webhook-integration.json
├── tests/                      # 测试
├── .env.example                # 环境变量示例
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 配置

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3001` |
| `REDIS_URL` | Redis 连接 URL | `redis://localhost:6379` |
| `LOG_LEVEL` | 日志级别 | `info` |
| `MAX_PARALLEL_TASKS` | 最大并行任务数 | `10` |
| `CHECKPOINT_INTERVAL` | 检查点间隔（毫秒） | `5000` |
| `OPENAI_API_KEY` | OpenAI API 密钥 | - |
| `MINIMAX_API_KEY` | Minimax API 密钥 | - |

### 工作流配置

```json
{
  "name": "My Workflow",
  "version": "1.0.0",
  "status": "published",
  "nodes": [
    {
      "id": "node_1",
      "type": "trigger.cron",
      "name": "Start",
      "config": {
        "cron": {
          "expression": "0 0 * * *",
          "timezone": "UTC"
        }
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2"
    }
  ]
}
```

## 🐳 Docker 部署

### 单容器部署

```bash
docker build -t openclaw-workflow-engine:v1.11.0 .
docker run -d -p 3001:3001 \
  -e REDIS_URL=redis://redis:6379 \
  openclaw-workflow-engine:v1.11.0
```

### Docker Compose

```bash
docker-compose up -d
```

详细的部署指南请参考 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## 📊 监控

### 健康检查

```bash
curl http://localhost:3001/health
```

### 队列统计

```bash
curl http://localhost:3001/api/queue/stats
```

### 执行状态

```bash
curl http://localhost:3001/api/executions/{execution-id}
```

## 🧪 测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行 lint
npm run lint

# 格式化代码
npm run format
```

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 📞 支持

- 文档: https://docs.openclaw.ai/workflow-engine
- GitHub Issues: https://github.com/openclaw/workflow-engine/issues
- 社区支持: https://community.openclaw.ai

## 🗺️ 路线图

### v1.12.0 (计划中)
- [ ] 可视化工作流编辑器（前端）
- [ ] 工作流版本控制
- [ ] RBAC 权限系统
- [ ] 更多集成节点

### v1.13.0 (计划中)
- [ ] 工作流市场
- [ ] AI 辅助工作流生成
- [ ] 实时协作编辑
- [ ] 性能优化

## 🙏 致谢

感谢所有贡献者和开源项目的支持！

---

**OpenClaw Team** © 2026