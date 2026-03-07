# 贡献指南

> 感谢你对 7zi Studio 项目的兴趣！我们欢迎任何形式的贡献。

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境](#开发环境)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [项目结构](#项目结构)
- [常见问题](#常见问题)

## 🎯 行为准则

我们致力于为社区营造一个友好、包容的环境。请遵循以下原则：

1. **尊重他人** - 保持友好和专业的态度
2. **包容差异** - 欢迎不同背景和技能水平的贡献者
3. **建设性反馈** - 提出建议时保持积极和具体
4. **专注于项目** - 讨论应围绕项目本身展开

## 🚀 如何贡献

### 报告 Bug

1. 搜索现有 [Issues](https://github.com/songzuo/7zi/issues) 确保没有重复
2. 创建新 Issue，使用 bug 模板
3. 包含以下信息：
   - 清晰的标题和描述
   - 复现步骤
   - 预期行为 vs 实际行为
   - 环境信息 (OS, Node 版本等)
   - 相关截图或日志

### 提出新功能

1. 创建 [Feature Request](https://github.com/songzuo/7zi/issues/new?template=feature_request.md)
2. 描述功能的用途和价值
3. 提供可能的实现方案
4. 考虑与其他功能的兼容性

### 贡献代码

1. Fork 项目仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 编写代码并添加测试
4. 提交更改 (`git commit -m 'Add amazing feature'`)
5. 推送分支 (`git push origin feature/amazing-feature`)
6. 创建 Pull Request

## 💻 开发环境

### 前置要求

- Node.js 22+
- pnpm 8+ (推荐) 或 npm 10+
- Git

### 本地开发

```bash
# 1. Fork 并克隆仓库
git clone https://github.com/YOUR_USERNAME/7zi.git
cd 7zi

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local

# 4. 启动开发服务器
pnpm dev
```

### 运行测试

```bash
# 运行所有测试 (监视模式)
pnpm test

# 单次运行测试
pnpm test:run

# 生成覆盖率报告
pnpm test:coverage

# 运行 lint
pnpm lint

# 修复 lint 问题
pnpm lint:fix
```

### 测试文件命名规范

| 文件类型 | 命名规则 | 示例 |
|---------|---------|------|
| 单元测试 | `*.test.ts` | `utils.test.ts` |
| 组件测试 | `*.test.tsx` | `Button.test.tsx` |
| 集成测试 | `*.integration.test.ts` | `api.integration.test.ts` |
| E2E 测试 | `*.e2e.test.ts` | `login.e2e.test.ts` |

**测试文件位置**: 与源文件同目录或 `__tests__/` 目录

```
components/
├── Button.tsx
├── Button.test.tsx      # 同目录测试
└── __tests__/
    └── Button.styles.test.tsx  # 或集中测试
```

### 编写组件测试

使用 **React Testing Library** 编写组件测试：

```tsx
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('shows loading state', () => {
    render(<Button loading>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

**测试原则**:
1. **测试用户行为**，而非实现细节
2. **使用语义化查询**: `getByRole`, `getByText`, `getByLabelText`
3. **Mock 外部依赖**: API 调用、路由、第三方库
4. **保持测试独立**: 每个测试应可单独运行

详细测试指南请参考 [测试文档](./docs/TESTING.md)

## 📝 提交规范

### 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型 (type)**:
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式 (不影响功能)
- `refactor`: 重构 (既不是新功能也不是修复)
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

**示例**:

```bash
# 功能
git commit -m "feat(dashboard): add member status filter"

# 修复
git commit -m "fix(api): resolve rate limit issue"

# 文档
git commit -m "docs(readme): update installation steps"
```

### 提交前检查

- [ ] 代码通过 lint 检查
- [ ] 所有测试通过
- [ ] 代码已格式化
- [ ] 提交信息符合规范

## 🔄 Pull Request 流程

### 创建 PR

1. 确保本地分支是最新的
2. 创建 PR 到 `main` 分支
3. 填写 PR 模板
4. 链接相关 Issue

### PR 模板

```markdown
## 描述
<!-- 简要描述这个 PR 做了什么 -->

## 修复的问题
<!-- 链接相关 Issue: Closes #123 -->

## 变更内容
<!-- 列出主要变更 -->

## 测试
<!-- 描述如何测试这些变更 -->

## 截图 (如有)
<!-- 添加相关截图 -->
```

### 审查流程

1. 自动化检查 (CI) 运行
2. 至少一名维护者审查
3. 解决所有评论
4. 合并到 main 分支

## 📂 项目结构

```
7zi/
├── app/                    # Next.js 主应用
│   ├── dashboard/         # 看板页面
│   ├── components/        # React 组件
│   ├── hooks/            # 自定义 Hooks
│   ├── lib/              # 工具函数
│   └── server/           # 服务端代码
├── docs/                  # 项目文档
├── skills/                # OpenClaw 技能
├── deploy-scripts/        # 部署脚本
├── openclaw-kb/          # OpenClaw 知识库
└── ...
```

### 主要目录说明

| 目录 | 说明 |
|------|------|
| `app/` | Next.js 应用核心代码 |
| `app/components/` | UI 组件 |
| `app/hooks/` | React Hooks |
| `docs/` | 项目文档 |
| `skills/` | OpenClaw 技能定义 |

## ❓ 常见问题

### 如何开始？

1. 查看 [README.md](../README.md) 了解项目
2. 查看 [开发文档](docs/DEVELOPMENT.md) 配置环境
3. 寻找标有 `good first issue` 的 Issue 开始

### 我可以贡献哪些内容？

- 🐛 Bug 修复
- ✨ 新功能
- 📝 文档改进
- 🎨 UI/UX 改进
- ⚡ 性能优化
- 🧪 添加测试

### 如何获得帮助？

- 📬 邮件: support@7zi.com
- 💬 GitHub Discussions
- 🐛 提交 Issue

### 贡献者许可协议

通过贡献代码，你同意将你的作品按 [MIT License](../LICENSE) 许可。

## 🏆 贡献者

感谢所有为项目做出贡献的人！

<!-- 贡献者列表将通过 GitHub API 自动生成 -->

---

**提示**: 如果你有任何问题，欢迎在 [GitHub Discussions](https://github.com/songzuo/7zi/discussions) 中提问。

*感谢你的贡献！🎉*
