# 贡献指南

感谢你对 7zi Frontend 项目的兴趣！本文档将帮助你了解如何为项目做出贡献。

## 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境设置](#开发环境设置)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [项目结构](#项目结构)

## 行为准则

- 尊重所有贡献者
- 保持建设性的讨论
- 接受建设性批评
- 关注对社区最有利的事情

## 如何贡献

### 报告 Bug

如果你发现了 Bug，请通过 GitHub Issues 提交，包含以下信息：

1. **标题**：简洁描述问题
2. **描述**：详细说明发生了什么
3. **复现步骤**：
   ```markdown
   1. 打开页面 '...'
   2. 点击按钮 '...'
   3. 滚动到 '...'
   4. 看到错误
   ```
4. **预期行为**：应该发生什么
5. **实际行为**：实际发生了什么
6. **截图**：如果适用
7. **环境**：
   - OS: [e.g. macOS, Windows, Linux]
   - Browser: [e.g. Chrome, Firefox, Safari]
   - Version: [e.g. 22]

### 提出新功能

1. 先在 Issues 中讨论你的想法
2. 等待维护者反馈
3. 获得批准后再开始开发

## 开发环境设置

### 前置要求

- Node.js >= 18.x
- npm >= 9.x
- Git

### 本地设置

```bash
# 1. Fork 仓库到你的 GitHub 账号

# 2. 克隆你的 Fork
git clone https://github.com/<your-username>/7zi-frontend.git
cd 7zi-frontend

# 3. 添加上游仓库
git remote add upstream https://github.com/7zi/7zi-frontend.git

# 4. 安装依赖
npm install

# 5. 复制环境变量
cp .env.example .env.local

# 6. 启动开发服务器
npm run dev
```

### 验证设置

```bash
# 运行类型检查
npm run type-check

# 运行 lint
npm run lint

# 运行测试
npm run test:run

# 构建项目
npm run build
```

## 代码规范

### TypeScript

- 使用 TypeScript 编写所有新代码
- 避免使用 `any`，优先使用具体类型
- 为组件 props 定义接口

```typescript
// ✅ 推荐
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  // ...
}

// ❌ 避免
export function Button(props: any) {
  // ...
}
```

### React 组件

- 使用函数组件和 Hooks
- 组件命名使用 PascalCase
- 文件名使用 PascalCase.tsx

```typescript
// ✅ 推荐
export function UserProfile({ user }: UserProfileProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="user-profile">
      {/* ... */}
    </div>
  );
}

// ❌ 避免
export class UserProfile extends React.Component {
  // ...
}
```

### 文件组织

```typescript
// 组件文件结构
// 1. 导入
import { useState } from 'react';
import { Button } from './Button';

// 2. 类型定义
interface Props {
  // ...
}

// 3. 常量
const DEFAULT_VALUE = 'default';

// 4. 组件
export function MyComponent({ }: Props) {
  // Hooks
  const [state, setState] = useState();
  
  // 事件处理
  const handleClick = () => {};
  
  // 渲染
  return (
    <div>
      {/* ... */}
    </div>
  );
}
```

### 样式

- 使用 Tailwind CSS
- 遵循移动优先原则
- 使用语义化的类名

```tsx
// ✅ 推荐
<div className="flex flex-col md:flex-row gap-4 p-4 bg-white dark:bg-gray-800">
  {/* ... */}
</div>

// ❌ 避免（内联样式）
<div style={{ display: 'flex', padding: '16px' }}>
  {/* ... */}
</div>
```

### 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 组件 | PascalCase | `UserProfile.tsx` |
| Hook | camelCase + use 前缀 | `useFetch.ts` |
| 工具函数 | camelCase | `formatDate.ts` |
| 常量 | UPPER_SNAKE_CASE | `API_BASE_URL` |
| 类型/接口 | PascalCase | `UserProfileProps` |

### ESLint 和 Prettier

项目已配置 ESLint 和 Prettier，请在提交前运行：

```bash
# 检查代码
npm run lint

# 自动修复
npm run lint:fix

# 格式化代码
npm run format
```

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 格式

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### 类型

| 类型 | 描述 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: add AI chat component` |
| `fix` | Bug 修复 | `fix: resolve theme toggle issue` |
| `docs` | 文档更新 | `docs: update README` |
| `style` | 代码格式（不影响逻辑） | `style: format code` |
| `refactor` | 代码重构 | `refactor: extract utility functions` |
| `perf` | 性能优化 | `perf: optimize image loading` |
| `test` | 测试相关 | `test: add unit tests for utils` |
| `chore` | 构建/工具相关 | `chore: update dependencies` |
| `ci` | CI 配置 | `ci: add GitHub Actions workflow` |

### 示例

```bash
# 新功能
git commit -m "feat(dashboard): add project progress chart"

# Bug 修复
git commit -m "fix(theme): resolve flash on initial load"

# 破坏性变更
git commit -m "feat(api)!: change response format

BREAKING CHANGE: API response now returns { data, meta } instead of direct data"
```

## Pull Request 流程

### 创建 PR

1. **创建分支**

```bash
# 从 main 创建功能分支
git checkout main
git pull upstream main
git checkout -b feat/your-feature-name
```

2. **开发和测试**

```bash
# 编写代码
# 运行测试
npm run test:run
npm run lint
npm run type-check
```

3. **提交更改**

```bash
git add .
git commit -m "feat: your feature description"
```

4. **推送分支**

```bash
git push origin feat/your-feature-name
```

5. **创建 Pull Request**

- 在 GitHub 上创建 PR
- 填写 PR 模板
- 关联相关 Issue

### PR 标题格式

```
<type>(<scope>): <description>
```

### PR 检查清单

- [ ] 代码通过 `npm run lint`
- [ ] 类型检查通过 `npm run type-check`
- [ ] 测试通过 `npm run test:run`
- [ ] 构建成功 `npm run build`
- [ ] 遵循代码规范
- [ ] 添加了必要的测试
- [ ] 更新了相关文档

### 代码审查

- 保持耐心和尊重
- 专注于代码，不是个人
- 解释为什么需要更改
- 接受建议和改进

## 项目结构

```
7zi-frontend/
├── src/
│   ├── app/              # Next.js App Router 页面
│   │   ├── [locale]/     # 国际化路由
│   │   ├── api/          # API 路由
│   │   └── ...           # 页面目录
│   ├── components/       # React 组件
│   │   ├── AIChat/       # AI 聊天相关组件
│   │   ├── chat/         # 聊天组件
│   │   └── ...           # 其他组件
│   ├── hooks/            # 自定义 Hooks
│   ├── lib/              # 工具库
│   ├── types/            # TypeScript 类型
│   ├── i18n/             # 国际化配置
│   ├── contexts/         # React Context
│   └── test/             # 测试文件
├── public/               # 静态资源
├── .github/              # GitHub 配置
│   └── workflows/        # CI/CD 工作流
└── docs/                 # 文档
```

### 添加新组件

1. 在 `src/components/` 创建组件文件
2. 在 `src/components/index.ts` 导出
3. 在 `src/test/components/` 添加测试

```typescript
// src/components/MyComponent.tsx
interface MyComponentProps {
  title: string;
}

export function MyComponent({ title }: MyComponentProps) {
  return <div>{title}</div>;
}

// src/components/index.ts
export { MyComponent } from './MyComponent';
```

### 添加新页面

1. 在 `src/app/` 创建页面目录
2. 添加 `page.tsx` 文件
3. 添加 `error.tsx` 错误边界
4. 添加 `loading.tsx` 加载状态（可选）

```
src/app/new-page/
├── page.tsx       # 页面组件
├── error.tsx      # 错误处理
└── loading.tsx    # 加载状态
```

## 获取帮助

- 在 GitHub Issues 中提问
- 查看现有文档
- 联系维护者

---

再次感谢你的贡献！🎉
