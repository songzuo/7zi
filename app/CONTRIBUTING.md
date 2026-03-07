# 贡献指南

感谢你考虑为 AI Team Dashboard 贡献代码！本文档将帮助你了解开发流程和规范。

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境设置](#开发环境设置)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [测试规范](#测试规范)
- [文档规范](#文档规范)

---

## 行为准则

### 我们的承诺

为了营造开放和友好的环境，我们承诺：

- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

### 不可接受的行为

- 使用性化的语言或图像
- 侮辱性/贬损性评论和人身攻击
- 公开或私下的骚扰
- 未经许可发布他人的私人信息
- 其他在专业环境中不恰当的行为

---

## 如何贡献

### 报告 Bug

如果你发现了 bug，请创建 [Issue](../../issues) 并包含：

1. **清晰的标题**: 简要描述问题
2. **复现步骤**: 详细说明如何重现
3. **预期行为**: 你期望发生什么
4. **实际行为**: 实际发生了什么
5. **环境信息**: Node 版本、浏览器、操作系统等
6. **截图**: 如果适用，添加截图帮助解释

### 提出新功能

1. 先创建 [Issue](../../issues) 讨论功能
2. 说明功能的用例和好处
3. 等待维护者反馈
4. 获得批准后开始实现

### 提交 Pull Request

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 进行更改
4. 运行测试 (`npm run test:run`)
5. 提交更改 (`git commit -m 'feat: add amazing feature'`)
6. 推送到分支 (`git push origin feature/amazing-feature`)
7. 创建 Pull Request

---

## 开发环境设置

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### 安装步骤

```bash
# 1. Clone 仓库
git clone https://github.com/yourusername/ai-team-dashboard.git
cd ai-team-dashboard/app

# 2. 安装依赖
npm install

# 3. 复制环境变量
cp .env.example .env.local

# 4. 启动开发服务器
npm run dev

# 5. 在浏览器打开 http://localhost:3000
```

### 开发工具

推荐使用 VS Code 并安装以下扩展：

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Hero

---

## 开发流程

### 分支策略

- `main` - 生产分支，受保护
- `develop` - 开发分支
- `feature/*` - 特性分支
- `fix/*` - Bug 修复分支
- `docs/*` - 文档更新分支

### 工作流程

1. **创建分支**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **编写代码**
   - 遵循代码规范
   - 编写单元测试
   - 更新相关文档

3. **本地测试**
   ```bash
   npm run lint          # 代码检查
   npm run type-check    # 类型检查
   npm run test:run      # 运行测试
   npm run format:check  # 格式检查
   ```

4. **提交代码**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **推送并创建 PR**
   ```bash
   git push origin feature/your-feature
   ```

---

## 代码规范

### TypeScript

- 使用 TypeScript 编写所有代码
- 为所有函数和组件添加类型注解
- 避免使用 `any`，使用 `unknown` 或具体类型
- 为公共 API 添加 JSDoc 注释

```typescript
/**
 * 创建新任务
 * @param taskData - 任务数据（不包含 id 和时间戳）
 * @returns 创建的任务对象
 * @throws {Error} 如果任务创建失败
 */
export async function createTaskApi(
  taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Task> {
  // 实现...
}
```

### React

- 使用函数组件和 Hooks
- 组件命名使用 PascalCase
- Props 接口命名: `ComponentNameProps`
- 使用 `export` 而不是 `export default`

```typescript
interface MemberCardProps {
  member: AIMember;
  compact?: boolean;
}

export const MemberCard: React.FC<MemberCardProps> = ({ member, compact = false }) => {
  // 实现...
};
```

### 样式

- 使用 Tailwind CSS
- 遵循移动优先原则
- 支持深色模式

```typescript
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  {/* 内容 */}
</div>
```

### 文件命名

- 组件: `PascalCase.tsx` (如 `MemberCard.tsx`)
- 工具函数: `camelCase.ts` (如 `formatDate.ts`)
- Hooks: `use*.ts` (如 `useDashboardData.ts`)
- 类型: `types.ts` 或 `*.d.ts`
- 测试: `*.test.ts` 或 `*.test.tsx`

---

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型 (type)

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构（既不是新功能也不是 bug 修复）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关
- `ci`: CI/CD 相关

### 示例

```bash
# 新功能
git commit -m "feat(tasks): add task filtering by priority"

# Bug 修复
git commit -m "fix(dashboard): fix member card status color"

# 文档
git commit -m "docs(readme): update installation instructions"

# 重构
git commit -m "refactor(api): simplify task update logic"
```

---

## 测试规范

### 单元测试

使用 Vitest 编写单元测试：

```typescript
import { describe, it, expect } from 'vitest';
import { calculateStats } from '@/lib/tasks/utils';

describe('calculateStats', () => {
  it('should calculate completion rate correctly', () => {
    const tasks = [
      { status: 'done' },
      { status: 'done' },
      { status: 'in_progress' },
    ];
    
    const stats = calculateStats(tasks);
    expect(stats.completionRate).toBe(66.67);
  });
});
```

### 测试文件位置

- 单元测试: `__tests__/` 目录
- 组件测试: 与组件同目录 `*.test.tsx`
- 集成测试: `__tests__/integration/`

### 运行测试

```bash
# 运行所有测试
npm run test

# 运行一次（CI 模式）
npm run test:run

# 生成覆盖率报告
npm run test:run -- --coverage
```

---

## 文档规范

### JSDoc 注释

为公共 API 添加 JSDoc：

```typescript
/**
 * 任务筛选条件接口
 * @interface TaskFilter
 * @property {TaskPriority} [priority] - 按优先级筛选
 * @property {TaskStatus} [status] - 按状态筛选
 * @property {string[]} [tags] - 按标签 ID 筛选
 */
export interface TaskFilter {
  priority?: TaskPriority;
  status?: TaskStatus;
  tags?: string[];
}
```

### README 更新

如果添加新功能，请更新：
- 功能列表
- 使用示例
- API 文档链接

### Storybook 组件

为所有 UI 组件添加 Storybook 故事：

```typescript
// stories/MyComponent.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import MyComponent from '@/components/MyComponent';

const meta = {
  title: 'Components/MyComponent',
  component: MyComponent,
  tags: ['autodocs'],
} satisfies Meta<typeof MyComponent>;

export default meta;
```

---

## 🙏 感谢

感谢你的贡献！每一份贡献都让这个项目变得更好。

如有问题，请随时创建 Issue 或联系维护者。