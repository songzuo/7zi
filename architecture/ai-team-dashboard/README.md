# AI 团队实时展示系统

> 实时展示 AI 团队成员工作状态、任务进度和贡献记录的完整解决方案

## 📁 项目结构

```
ai-team-dashboard/
├── README.md                 # 本文件
├── DESIGN.md                 # 技术方案文档
├── api/
│   └── API_DESIGN.md         # API 设计文档
├── backend/
│   ├── server.ts             # 后端服务主文件
│   ├── package.json          # 后端依赖
│   └── tsconfig.json         # TypeScript 配置
├── frontend/
│   ├── components/
│   │   └── Dashboard.tsx     # React 组件
│   ├── store/
│   │   └── dashboardStore.ts # Zustand 状态管理
│   ├── hooks/
│   │   └── useWebSocket.ts   # WebSocket Hook
│   ├── package.json          # 前端依赖
│   └── vite.config.ts        # Vite 配置
└── docker-compose.yml        # Docker 部署配置
```

## 🚀 快速开始

### 1. 环境准备

```bash
# Node.js >= 18
# Redis >= 7
# GitHub Personal Access Token
```

### 2. 配置环境变量

```bash
# .env
GITHUB_TOKEN=ghp_xxx
GITHUB_REPO=owner/repo
REDIS_URL=redis://localhost:6379
PORT=4000
FRONTEND_URL=http://localhost:3000
```

### 3. 启动服务

```bash
# 启动 Redis
docker run -d -p 6379:6379 redis:7-alpine

# 启动后端
cd backend
npm install
npm run dev

# 启动前端
cd frontend
npm install
npm run dev
```

### 4. 使用 Docker Compose

```bash
docker-compose up -d
```

## 📋 功能特性

### ✅ GitHub Issues 集成
- 实时显示团队任务
- 自动状态同步 (Webhook)
- 分页、筛选、排序

### ✅ AI 成员状态
- 11 个子代理实时状态
- 当前任务展示
- 历史贡献记录
- 技能展示

### ✅ 实时更新
- WebSocket 推送
- 自动重连
- 心跳检测

### ✅ 性能优化
- Redis 缓存 (TTL 可配置)
- 增量更新
- 虚拟列表

## 🔌 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/issues` | GET | 获取任务列表 |
| `/api/v1/issues/:number` | GET | 获取任务详情 |
| `/api/v1/members` | GET | 获取成员列表 |
| `/api/v1/members/:id` | GET | 获取成员详情 |
| `/api/v1/health` | GET | 健康检查 |
| `/api/v1/refresh` | POST | 刷新数据 |
| `/webhook/github` | POST | GitHub Webhook |

## 🔌 WebSocket 事件

### 客户端 → 服务器
- `subscribe` - 订阅频道
- `unsubscribe` - 取消订阅
- `ping` - 心跳

### 服务器 → 客户端
- `issue:created` - 新任务
- `issue:updated` - 任务更新
- `issue:closed` - 任务关闭
- `issue:assigned` - 任务分配
- `member:status` - 成员状态变更
- `system:refresh` - 数据刷新

## 🎨 前端组件

| 组件 | 说明 |
|------|------|
| `Dashboard` | 主仪表板 |
| `TaskBoard` | 任务看板 |
| `TaskCard` | 任务卡片 |
| `MemberList` | 成员列表 |
| `MemberCard` | 成员卡片 |
| `ContributionChart` | 贡献图表 |
| `StatusBadge` | 状态徽章 |

## 📊 技术栈

### 前端
- React 18 + TypeScript
- Zustand (状态管理)
- Socket.IO Client
- Tailwind CSS
- Vite

### 后端
- Node.js + Express
- Socket.IO
- Redis (缓存)
- Octokit (GitHub API)
- TypeScript

### 部署
- Docker + Docker Compose
- PM2 (进程管理)
- Nginx (反向代理)

## 🔐 安全考虑

- GitHub Token 加密存储
- HTTPS 强制
- CORS 配置
- API 速率限制
- Webhook 签名验证

## 📈 监控指标

- API 响应时间 (P95 < 200ms)
- WebSocket 连接数
- 缓存命中率 (>80%)
- GitHub API 调用次数

## 🛠️ 开发指南

### 添加新组件

```bash
# 创建组件文件
touch frontend/components/NewComponent.tsx

# 导出并在 Dashboard 中使用
```

### 添加新 API 端点

```typescript
// backend/server.ts
apiRouter.get('/new-endpoint', async (req, res) => {
  // 实现逻辑
});
```

### 添加新 WebSocket 事件

```typescript
// 服务器端
io.emit('custom:event', data);

// 客户端
socket.on('custom:event', (data) => {
  // 处理逻辑
});
```

## 📝 待办事项

- [ ] 实现完整的贡献统计图表
- [ ] 添加用户认证 (GitHub OAuth)
- [ ] 实现数据持久化 (PostgreSQL)
- [ ] 添加单元测试
- [ ] 添加 E2E 测试
- [ ] 优化移动端适配
- [ ] 添加深色模式

## 📄 许可证

MIT

---

**架构师**: 🏗️ AI 团队  
**创建时间**: 2026-03-06  
**版本**: 1.0.0
