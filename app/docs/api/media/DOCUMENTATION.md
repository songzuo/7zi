# AI Team Dashboard - 文档

![TypeDoc](https://img.shields.io/badge/TypeDoc-API%20Docs-blue)
![Storybook](https://img.shields.io/badge/Storybook-Component%20Stories-ff4785)
![License](https://img.shields.io/badge/license-MIT-green)

## 📚 文档资源

本项目包含多种文档，满足不同需求：

### 1. API 文档 (TypeDoc)

自动生成的 TypeScript API 文档，包含所有类型、接口、函数和类的详细说明。

```bash
# 生成 API 文档
npm run docs:api

# 生成并监听变化
npm run docs:api:watch

# 清理文档
npm run docs:clean
```

生成的文档位于 `docs/api/` 目录。

**在线访问**: 部署后可通过 `/docs/api/` 路径访问。

### 2. 组件库 (Storybook)

交互式组件开发和测试环境，展示所有 UI 组件及其状态。

```bash
# 启动 Storybook
npm run storybook

# 构建 Storybook 静态文件
npm run build-storybook
```

**功能**:
- 🎨 组件可视化展示
- 📝 自动生成文档
- 🎛️ 交互式控制面板
- ♿ 可访问性测试
- 🌙 深色模式支持

**组件列表**:
- `LoadingSpinner` - 加载动画
- `MemberCard` - AI 团队成员卡片
- `ProgressBar` - 进度条
- `TaskBoard` - 任务看板
- `ActivityLog` - 活动日志

### 3. README

项目基本说明和使用指南。见 [README.md](./README.md)。

### 4. 贡献指南

开发规范和贡献流程。见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
npm install
```

### 开发命令

```bash
# 启动开发服务器
npm run dev

# 运行测试
npm run test

# 代码检查
npm run lint

# 类型检查
npm run type-check

# 格式化代码
npm run format
```

---

## 📁 项目结构

```
app/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── page.tsx           # 首页
│   └── layout.tsx         # 根布局
├── components/            # React 组件
│   ├── Dashboard.tsx
│   ├── MemberCard.tsx
│   ├── ProgressBar.tsx
│   └── ...
├── lib/                   # 核心库
│   ├── db/               # 数据库
│   ├── tasks/            # 任务管理
│   └── export.ts         # 导出功能
├── hooks/                 # React Hooks
├── types/                 # TypeScript 类型定义
├── stories/               # Storybook 组件故事
├── __tests__/            # 测试文件
└── docs/                  # 文档输出目录
    └── api/              # TypeDoc API 文档
```

---

## 🧩 核心模块

### 任务管理 (`lib/tasks`)

```typescript
import { Task, TaskFilter, TaskStatus } from '@/lib/tasks/types';
import { fetchTasks, createTaskApi, updateTaskApi } from '@/lib/tasks/api';

// 获取任务列表
const tasks = await fetchTasks({ status: 'in_progress' });

// 创建任务
const newTask = await createTaskApi({
  title: '新任务',
  priority: 'high',
  status: 'todo',
  tags: [{ id: 'feature', name: 'Feature', color: 'blue' }],
});

// 更新任务状态
await updateTaskApi(taskId, { status: 'done' });
```

### 数据库 (`lib/db`)

使用 SQLite (better-sqlite3) 进行数据持久化。

```typescript
import { db } from '@/lib/db';
import { tasksRepository, tagsRepository } from '@/lib/db';

// 查询任务
const tasks = tasksRepository.findAll();

// 创建任务
const task = tasksRepository.create({
  title: '新任务',
  priority: 'high',
  // ...
});
```

---

## 📝 开发规范

### 命名规范

- **组件**: PascalCase (如 `MemberCard.tsx`)
- **文件**: camelCase (如 `useDashboardData.ts`)
- **常量**: SCREAMING_SNAKE_CASE (如 `DEFAULT_TAGS`)
- **类型/接口**: PascalCase (如 `TaskFilter`)

### 代码风格

项目使用 Prettier + ESLint 进行代码规范：

```bash
# 格式化代码
npm run format

# 检查格式
npm run format:check

# 修复 lint 问题
npm run lint:fix
```

### 提交规范

使用 Conventional Commits：

```
feat: 添加新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 重构
test: 测试
chore: 构建/工具
```

---

## 🔗 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Storybook 文档](https://storybook.js.org/docs)
- [TypeDoc 文档](https://typedoc.org/)

---

## 📄 License

MIT License - 详见 [LICENSE](./LICENSE) 文件。