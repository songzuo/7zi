# 7zi 快速参考卡片

> 常用命令、API 端点、配置的速查表

**版本**: 1.0.0  
**更新日期**: 2026-03-08

---

## 🚀 开发命令

```bash
# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm run start

# 代码检查
npm run lint
npm run lint:fix

# 类型检查
npm run type-check

# 格式化代码
npm run format
npm run format:check
```

---

## 🧪 测试命令

```bash
# 单元测试 (watch)
npm run test

# 单元测试 (单次)
npm run test:run

# 测试覆盖率
npm run test:coverage

# E2E 测试
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:debug

# 运行所有测试
npm run test:all
```

---

## 📦 Docker 命令

```bash
# 开发环境
docker-compose up -d
docker-compose down
docker-compose logs -f

# 生产环境
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml build

# 查看状态
docker-compose ps
docker stats

# 进入容器
docker exec -it 7zi-frontend sh
```

---

## 🔌 API 端点速查

### 任务管理

| 方法 | 端点 | 说明 |
|------|------|------|
| `GET` | `/api/tasks` | 获取任务列表 |
| `GET` | `/api/tasks/:id` | 获取单个任务 |
| `POST` | `/api/tasks` | 创建任务 |
| `PUT` | `/api/tasks` | 更新任务 |
| `POST` | `/api/tasks/:id/assign` | 分配任务 |

### 日志系统

| 方法 | 端点 | 说明 |
|------|------|------|
| `GET` | `/api/logs` | 查询日志 |
| `DELETE` | `/api/logs` | 清理旧日志 |

### 健康检查

| 方法 | 端点 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 基础健康检查 |
| `GET` | `/api/health/live` | 存活检查 |
| `GET` | `/api/health/ready` | 就绪检查 |
| `GET` | `/api/health/detailed` | 详细检查 |

### 系统状态

| 方法 | 端点 | 说明 |
|------|------|------|
| `GET` | `/api/status` | 系统状态 |

### 知识图谱

| 方法 | 端点 | 说明 |
|------|------|------|
| `GET` | `/api/knowledge/nodes` | 获取节点列表 |
| `POST` | `/api/knowledge/nodes` | 创建节点 |
| `GET` | `/api/knowledge/edges` | 获取边列表 |
| `POST` | `/api/knowledge/query` | 查询知识 |
| `POST` | `/api/knowledge/inference` | 推理接口 |
| `GET` | `/api/knowledge/lattice` | 获取知识晶格 |

---

## 📝 cURL 示例

### 创建任务

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "新任务",
    "description": "任务描述",
    "type": "development",
    "priority": "high"
  }'
```

### 查询日志

```bash
curl "http://localhost:3000/api/logs?levels=error&limit=50"
```

### 健康检查

```bash
curl http://localhost:3000/api/health
```

---

## 🎯 AI 成员 ID

| ID | 角色 | 擅长 |
|------|------|------|
| `agent-world-expert` | 智能体世界专家 | 战略规划 |
| `consultant` | 咨询师 | 研究分析 |
| `architect` | 架构师 | 系统设计 |
| `executor` | Executor | 代码实现 |
| `sysadmin` | 系统管理员 | 运维部署 |
| `tester` | 测试员 | 质量保障 |
| `designer` | 设计师 | UI/UX |
| `promoter` | 推广专员 | 市场推广 |
| `support` | 销售客服 | 客户支持 |
| `finance` | 财务 | 会计审计 |
| `media` | 媒体 | 内容创作 |

---

## 📊 任务状态

```
pending → assigned → in_progress → completed
                ↓
             blocked
```

| 状态 | 说明 |
|------|------|
| `pending` | 待处理 |
| `assigned` | 已分配 |
| `in_progress` | 进行中 |
| `completed` | 已完成 |
| `blocked` | 已阻塞 |

---

## 🎨 任务类型

| 类型 | 说明 | 适合 AI |
|------|------|--------|
| `development` | 开发任务 | architect, executor, tester |
| `design` | 设计任务 | designer |
| `research` | 研究任务 | agent-world-expert, consultant |
| `marketing` | 营销任务 | promoter, support, media |
| `other` | 其他 | finance, sysadmin |

---

## 🔥 优先级

| 优先级 | 说明 | 响应时间 |
|--------|------|----------|
| `high` | 高优先级 | 立即处理 |
| `medium` | 中优先级 | 24 小时内 |
| `low` | 低优先级 | 本周内 |

---

## 🛠️ 环境变量

### 开发环境 (.env.local)

```bash
# 应用配置
NODE_ENV=development
PORT=3000

# API 配置
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# 邮件服务 (可选)
RESEND_API_KEY=re_xxx
```

### 生产环境 (.env.production)

```bash
# 应用配置
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# 网站统计
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_UMAMI_ID=xxx

# 邮件服务
RESEND_API_KEY=re_xxx
CONTACT_EMAIL=business@7zi.studio
```

---

## 📁 目录结构

```
7zi/
├── src/
│   ├── app/           # Next.js App Router
│   ├── components/    # React 组件
│   ├── lib/           # 工具函数
│   ├── stores/        # Zustand stores
│   ├── hooks/         # 自定义 Hooks
│   ├── types/         # TypeScript 类型
│   └── test/          # 测试文件
├── docs/              # 文档
├── e2e/               # E2E 测试
├── public/            # 静态资源
└── scripts/           # 脚本工具
```

---

## 🔧 故障排查

### 服务无法启动

```bash
# 检查端口占用
lsof -i :3000
netstat -tlnp | grep 3000

# 清理缓存
rm -rf .next
npm run dev
```

### 依赖问题

```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install
```

### 构建失败

```bash
# 查看详细错误
npm run build -- --debug

# 类型检查
npm run type-check
```

---

## 📞 部署命令

```bash
# 远程部署
./deploy-remote.sh deploy
./deploy-remote.sh quick
./deploy-remote.sh status
./deploy-remote.sh logs
./deploy-remote.sh restart
./deploy-remote.sh rollback

# 本地部署
./deploy.sh deploy
```

---

## 🔍 监控命令

```bash
# 查看日志
docker logs 7zi-frontend --tail 100 -f

# 查看资源使用
docker stats 7zi-frontend

# 健康检查
curl http://localhost:3000/api/health
curl http://localhost:3000/api/status
```

---

## 📚 文档链接

| 文档 | 路径 |
|------|------|
| 使用指南 | [docs/USER_GUIDE.md](./docs/USER_GUIDE.md) |
| API 参考 | [docs/API_REFERENCE.md](./docs/API_REFERENCE.md) |
| 组件文档 | [docs/COMPONENTS.md](./docs/COMPONENTS.md) |
| 测试指南 | [docs/TESTING_GUIDE.md](./docs/TESTING_GUIDE.md) |
| 部署指南 | [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) |
| 文档索引 | [DOCS_INDEX.md](./DOCS_INDEX.md) |

---

*快速参考卡片由系统管理员子代理维护*
