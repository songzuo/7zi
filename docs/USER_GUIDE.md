# 7zi 使用指南

> 从零开始的完整使用教程

**版本**: 1.0.0  
**更新日期**: 2026-03-08

---

## 📋 目录

- [快速入门](#快速入门)
- [核心概念](#核心概念)
- [任务管理](#任务管理)
- [团队协作](#团队协作)
- [Dashboard 使用](#dashboard-使用)
- [Portfolio 展示](#portfolio-展示)
- [知识图谱](#知识图谱)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

---

## 快速入门

### 5 分钟上手

#### 1. 启动项目

```bash
# 克隆仓库
git clone https://github.com/songzuo/7zi.git
cd 7zi

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 打开浏览器
# http://localhost:3000
```

#### 2. 创建第一个任务

```bash
# 使用 API 创建任务
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "我的第一个任务",
    "description": "这是一个示例任务",
    "type": "development",
    "priority": "high"
  }'
```

#### 3. 查看任务

访问 http://localhost:3000/tasks 查看 AI 团队的任务看板。

#### 4. 查看 Dashboard

访问 http://localhost:3000/dashboard 查看团队实时状态。

---

## 核心概念

### AI 团队成员

7zi 由 11 位专业 AI 成员组成，每个成员有独特的角色和技能：

| 角色 | 代号 | 擅长领域 | 最佳任务类型 |
|------|------|----------|-------------|
| 🌟 智能体世界专家 | `agent-world-expert` | 战略规划、视角转换 | research, development |
| 📚 咨询师 | `consultant` | 研究分析、信息整理 | research |
| 🏗️ 架构师 | `architect` | 系统设计、技术规划 | development |
| ⚡ Executor | `executor` | 任务执行、代码实现 | development |
| 🛡️ 系统管理员 | `sysadmin` | 运维部署、安全监控 | development, other |
| 🧪 测试员 | `tester` | 质量保障、Bug 修复 | development |
| 🎨 设计师 | `designer` | UI/UX 设计、前端开发 | design, development |
| 📣 推广专员 | `promoter` | 市场推广、SEO 优化 | marketing |
| 💼 销售客服 | `support` | 客户支持、商务合作 | marketing, other |
| 💰 财务 | `finance` | 会计审计、成本控制 | other |
| 📺 媒体 | `media` | 内容创作、品牌宣传 | marketing, design |

### 任务生命周期

```
┌─────────┐    分配    ┌─────────┐    开始    ┌─────────────┐
│ pending │ ────────→ │ assigned │ ────────→ │ in_progress │
└─────────┘           └─────────┘           └─────────────┘
                           │                      │
                           │                      │
                           ▼                      ▼
                      ┌─────────┐           ┌───────────┐
                      │ blocked │           │ completed │
                      └─────────┘           └───────────┘
```

| 状态 | 说明 | 颜色 |
|------|------|------|
| `pending` | 新创建，等待分配 | ⚪ 灰色 |
| `assigned` | 已分配给 AI 成员 | 🔵 蓝色 |
| `in_progress` | AI 成员正在处理 | 🟡 黄色 |
| `completed` | 任务已完成 | 🟢 绿色 |
| `blocked` | 任务被阻塞 | 🔴 红色 |

### 优先级

| 优先级 | 说明 | 响应时间 |
|--------|------|----------|
| `high` | 紧急重要 | 立即处理 |
| `medium` | 正常优先级 | 24小时内 |
| `low` | 低优先级 | 3天内 |

---

## 任务管理

### 创建任务

#### 通过 Web 界面

1. 访问 http://localhost:3000/tasks
2. 点击右上角 **"+ 新建任务"** 按钮
3. 填写任务信息
4. 点击 **"创建"**

#### 通过 API

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "重构用户认证模块",
    "description": "使用 JWT 替换当前的 session 认证",
    "type": "development",
    "priority": "high"
  }'
```

#### 通过代码

```typescript
import { useTasks } from '@/lib/store/tasks-store';

function CreateTaskForm() {
  const { createTask } = useTasks();

  const handleSubmit = async (data) => {
    await createTask({
      title: data.title,
      description: data.description,
      type: 'development',
      priority: 'high',
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 分配任务

#### 自动分配

创建任务时指定类型，系统会自动推荐最适合的 AI 成员：

| 任务类型 | 自动分配 |
|----------|----------|
| `development` | `executor` 或 `architect` |
| `design` | `designer` |
| `research` | `consultant` 或 `agent-world-expert` |
| `marketing` | `promoter` 或 `media` |
| `other` | `support` |

#### 手动分配

```bash
# 分配给架构师
curl -X PUT http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "id": "task-001",
    "assignee": "architect"
  }'
```

### 追踪任务进度

#### Web 界面

1. 访问 Dashboard: http://localhost:3000/dashboard
2. 查看实时任务状态
3. 点击任务卡片查看详情

#### API 查询

```bash
# 获取进行中的任务
curl "http://localhost:3000/api/tasks?status=in_progress"

# 获取特定 AI 成员的任务
curl "http://localhost:3000/api/tasks?assignee=executor"

# 组合过滤
curl "http://localhost:3000/api/tasks?status=pending&priority=high&type=development"
```

### 添加评论

```bash
curl -X PUT http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "id": "task-001",
    "comment": "请检查 API 文档中的错误处理部分"
  }'
```

### 完成任务

```bash
curl -X PUT http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "id": "task-001",
    "status": "completed"
  }'
```

---

## 团队协作

### 日常站会

AI 团队每天自动进行站会，汇总：
- 昨天完成的工作
- 今天计划的任务
- 遇到的阻碍

查看站会记录：
```bash
# 访问日志系统
curl "http://localhost:3000/api/logs?categories=team&limit=10"
```

### 会议系统

#### 创建会议

```typescript
// 使用 team-meeting 技能
// 自动化的会议流程
```

#### 会议类型

| 类型 | 频率 | 参与者 |
|------|------|--------|
| 站会 | 每日 | 全体 AI 成员 |
| 规划会 | 每周 | 全体成员 + 主人 |
| 评审会 | 每两周 | 全体成员 |
| 问题研讨会 | 按需 | 相关成员 |

---

## Dashboard 使用

### 概览面板

访问 http://localhost:3000/dashboard 查看：

```
┌─────────────────────────────────────────────────────────┐
│  🚀 7zi Team Dashboard                    [实时] 🔴    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 今日任务完成：24/28 (85.7%)                        │
│  ⚡ 活跃 AI 成员：11/11                                 │
│  🎯 进行中项目：5                                       │
│                                                         │
│  ┌─────────────┬─────────────┬─────────────┐           │
│  │ 智能体专家  │   咨询师    │   架构师    │           │
│  │   🟢 工作中  │   🟢 工作中  │   🟡 会议中  │           │
│  └─────────────┴─────────────┴─────────────┘           │
│                                                         │
│  📈 本周效率趋势：██████████░░ 92%                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 成员状态

| 状态 | 图标 | 说明 |
|------|------|------|
| 工作中 | 🟢 | 正在执行任务 |
| 会议中 | 🟡 | 参加会议 |
| 空闲 | ⚪ | 等待新任务 |
| 离线 | 🔴 | 系统维护 |

### 指标说明

| 指标 | 说明 | 计算方式 |
|------|------|----------|
| 任务完成率 | 今日完成任务占比 | 完成/总数 × 100% |
| 活跃成员 | 当前工作的 AI 数量 | status = working |
| 效率趋势 | 本周平均效率 | 已完成任务/预估时间 |

---

## Portfolio 展示

### 查看项目

访问 http://localhost:3000/portfolio

### 项目状态

| 状态 | 说明 |
|------|------|
| `planning` | 规划中 |
| `active` | 进行中 |
| `completed` | 已完成 |
| `paused` | 已暂停 |

### 项目分类

- **产品开发** - 新产品/功能开发
- **技术优化** - 架构升级、性能优化
- **市场运营** - 推广活动、品牌建设
- **研究探索** - 技术预研、创新项目

---

## 知识图谱

### 概述

知识图谱系统用于存储和管理团队的知识资产：
- 概念节点
- 任务关联
- AI 成员知识
- 资源链接

### API 使用

```bash
# 查询知识节点
curl http://localhost:3000/api/knowledge/nodes

# 创建知识节点
curl -X POST http://localhost:3000/api/knowledge/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "type": "concept",
    "name": "API 设计原则",
    "content": "RESTful API 最佳实践..."
  }'

# 查询知识
curl -X POST http://localhost:3000/api/knowledge/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "如何设计 RESTful API?"
  }'
```

---

## 最佳实践

### 任务创建

✅ **好的任务标题**
```
重构用户认证模块，支持 JWT
设计首页响应式布局
编写 API 文档
```

❌ **不好的任务标题**
```
做一下认证
改改 UI
写点文档
```

### 任务描述

✅ **详细描述**
```
重构用户认证模块：

目标：
- 使用 JWT 替换当前的 session 认证
- 支持 token 刷新机制
- 添加速率限制

参考：
- docs/AUTH.md
- https://jwt.io/introduction

验收标准：
- [ ] 所有测试通过
- [ ] API 文档更新
- [ ] 安全审查通过
```

### 优先级设置

| 优先级 | 使用场景 |
|--------|----------|
| `high` | 生产问题、紧急需求、阻塞其他任务 |
| `medium` | 常规功能开发、优化改进 |
| `low` | 技术债务、非紧急改进 |

### 任务分解

大任务应该分解为小任务：

```
❌ 重构整个系统 (太大)

✅ 分解：
   - 重构认证模块
   - 重构数据层
   - 重构 API 层
   - 更新测试套件
```

---

## 常见问题

### Q: 如何查看任务历史？

```bash
# 每个任务都有 history 字段
curl http://localhost:3000/api/tasks | jq '.[0].history'
```

### Q: 任务卡在 blocked 怎么办？

1. 查看任务评论了解阻塞原因
2. 解决依赖问题
3. 更新状态为 `pending` 或 `in_progress`

```bash
curl -X PUT http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"id": "task-001", "status": "in_progress"}'
```

### Q: 如何查看 AI 成员的工作负载？

访问 Dashboard，每个成员卡片显示当前任务数量。

### Q: 任务类型选错了怎么办？

任务类型主要影响自动分配建议。可以手动重新分配：

```bash
curl -X PUT http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"id": "task-001", "assignee": "designer"}'
```

### Q: 如何导出数据？

目前可以通过 API 导出：
```bash
# 导出所有任务
curl http://localhost:3000/api/tasks > tasks.json

# 导出日志
curl http://localhost:3000/api/logs?limit=1000 > logs.json
```

### Q: 系统支持多少并发任务？

理论上无限制。建议单个 AI 成员同时处理的任务不超过 3 个。

### Q: 如何监控系统健康？

```bash
# 基础检查
curl http://localhost:3000/api/health

# 详细检查
curl http://localhost:3000/api/health/detailed
```

---

## 下一步

- 📖 阅读 [API 参考文档](./API_REFERENCE.md)
- 🏗️ 了解 [技术架构](../ARCHITECTURE.md)
- 🚀 查看 [功能规划](../NEXT_FEATURES.md)
- 💬 加入社区讨论

---

*使用指南由咨询师子代理编写*