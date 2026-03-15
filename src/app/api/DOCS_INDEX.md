# 7zi API 文档索引

> 快速导航指南 | 完整文档见 [README.md](./README.md)

---

## 📋 API 端点速查表

| 模块 | 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|:----:|
| **认证** | `/api/auth/login` | POST | 用户登录 | ❌ |
| | `/api/auth/logout` | POST | 用户登出 | ❌ |
| | `/api/auth/refresh` | POST | 刷新令牌 | ❌ |
| | `/api/auth/me` | GET | 当前用户 | ✅ |
| **任务** | `/api/tasks` | GET | 任务列表 | 🔓 |
| | `/api/tasks` | POST | 创建任务 | 🔓 |
| | `/api/tasks` | PUT | 更新任务 | 🔓 |
| | `/api/tasks` | DELETE | 删除任务 | 🔒 |
| | `/api/tasks/:id/assign` | POST | AI 分配 | ✅ |
| | `/api/tasks/import` | POST | 批量导入 | 🔓 |
| **项目** | `/api/projects` | GET | 项目列表 | 🔓 |
| | `/api/projects` | POST | 创建项目 | ✅ |
| | `/api/projects/:id` | GET/PUT/DELETE | 项目操作 | 🔓/✅/✅ |
| | `/api/projects/:id/tasks` | GET | 项目任务 | 🔓 |
| **日志** | `/api/logs` | GET | 查询日志 | 🔓 |
| | `/api/logs` | DELETE | 清理日志 | 🔒 |
| | `/api/logs/export` | GET | 导出日志 | 🔓 |
| **健康** | `/api/health` | GET/HEAD | 基础检查 | ❌ |
| | `/api/health/ready` | GET | 就绪探针 | ❌ |
| | `/api/health/live` | GET | 存活探针 | ❌ |
| | `/api/health/detailed` | GET/HEAD | 详细报告 | ❌ |
| **状态** | `/api/status` | GET | 系统状态 | ❌ |
| **知识** | `/api/knowledge/nodes` | GET/POST | 节点操作 | ❌ |
| | `/api/knowledge/nodes/:id` | GET/PUT/DELETE | 单节点 | ❌ |
| | `/api/knowledge/edges` | GET/POST | 边操作 | ❌ |
| | `/api/knowledge/query` | POST | 知识查询 | ❌ |
| | `/api/knowledge/inference` | POST | 知识推理 | ❌ |
| | `/api/knowledge/lattice` | GET | 晶格结构 | ❌ |
| **通知** | `/api/notifications` | GET | 通知列表 | 🔓 |
| | `/api/notifications` | POST | 创建通知 | 🔓 |
| | `/api/notifications` | PUT | 标记已读 | 🔓 |
| | `/api/notifications` | DELETE | 删除通知 | 🔓 |
| **评论** | `/api/comments` | GET/POST | 评论操作 | ❌ |
| | `/api/comments/:id` | GET/PUT/DELETE | 单评论 | ❌ |
| **错误** | `/api/log-error` | POST | 上报错误 | ❌ |
| | `/api/log-error` | GET | 错误统计 | 🔒 |

**图例**: ❌ 无需认证 | 🔓 可选认证 | ✅ 必需认证 | 🔒 管理员

---

## 🚀 快速开始

### 1. 获取 CSRF Token

```bash
curl http://localhost:3000/api/auth?action=csrf
# 返回: { "success": true, "csrfToken": "xxx" }
```

### 2. 登录获取令牌

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
# 返回: { "success": true, "user": {...}, "csrfToken": "xxx" }
# Cookie: access_token=..., refresh_token=...
```

### 3. 调用 API

```bash
# 使用 Bearer Token
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"

# 或使用 Cookie
curl http://localhost:3000/api/auth/me \
  -H "Cookie: access_token=<token>"
```

---

## 📝 常用操作示例

### 创建任务

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <token>" \
  -d '{
    "title": "新功能开发",
    "description": "实现用户认证功能",
    "type": "development",
    "priority": "high",
    "projectId": "proj-001"
  }'
```

### 查询日志

```bash
curl "http://localhost:3000/api/logs?levels=error,warn&categories=api&limit=50"
```

### 知识推理

```bash
curl -X POST http://localhost:3000/api/knowledge/inference \
  -H "Content-Type: application/json" \
  -d '{
    "startNodeId": "node-001",
    "maxDepth": 3
  }'
```

---

## 📁 文件结构

```
src/app/api/
├── README.md              # 完整 API 文档
├── DOCS_INDEX.md          # 本文件（索引）
├── auth/                  # 认证 API
│   ├── route.ts           # 主路由
│   ├── login/route.ts     # 登录
│   ├── logout/route.ts    # 登出
│   ├── refresh/route.ts   # 刷新令牌
│   └── me/route.ts        # 用户信息
├── tasks/                 # 任务 API
│   ├── route.ts           # CRUD
│   ├── [id]/assign/       # AI 分配
│   └── import/            # 批量导入
├── projects/              # 项目 API
│   ├── route.ts           # CRUD
│   └── [id]/              # 单项操作
├── logs/                  # 日志 API
│   ├── route.ts           # 查询/删除
│   └── export/            # 导出
├── health/                # 健康检查
│   ├── route.ts           # 基础
│   ├── ready/             # 就绪
│   ├── live/              # 存活
│   └── detailed/          # 详细
├── status/                # 系统状态
│   └── route.ts
├── knowledge/             # 知识图谱
│   ├── nodes/             # 节点
│   ├── edges/             # 边
│   ├── query/             # 查询
│   ├── inference/         # 推理
│   └── lattice/           # 晶格
├── notifications/         # 通知
│   ├── route.ts
│   └── preferences/       # 偏好
├── comments/              # 评论
│   └── route.ts
├── log-error/             # 错误上报
│   └── route.ts
└── examples/              # 示例
    └── protected/         # 认证示例
```

---

## 🔒 安全说明

- **CSRF 保护**: 所有修改操作需要 `X-CSRF-Token` 头
- **认证**: 使用 JWT + HTTP-Only Cookie
- **授权**: 部分操作需要管理员权限
- **速率限制**: 登录接口限制 5 次/分钟

---

## 📊 性能特性

- **缓存**: 任务列表 2 分钟 TTL
- **分页**: 默认 20 条，最大 100 条
- **索引**: 任务存储使用 O(1) 索引查询
- **压缩**: 响应支持 gzip 压缩

---

*更多详情请参阅 [README.md](./README.md)*