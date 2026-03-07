# 开发环境配置指南

**最后更新**: 2026-03-06  
**难度**: ⭐⭐ 中等  
**时间**: 15-30 分钟

---

## 🎯 目标

配置完整的 7zi Studio 开发环境，包括代码编辑器、调试工具和开发工作流。

---

## 📋 前置要求

### 必需软件

| 软件 | 版本 | 安装链接 |
|------|------|----------|
| Node.js | 22+ | https://nodejs.org/ |
| Git | 2.30+ | https://git-scm.com/ |
| pnpm | 8+ | https://pnpm.io/ |
| VS Code | 最新 | https://code.visualstudio.com/ |

### 推荐软件

| 软件 | 用途 | 安装链接 |
|------|------|----------|
| Docker Desktop | 容器化开发 | https://www.docker.com/ |
| Postman | API 测试 | https://www.postman.com/ |
| TablePlus | 数据库管理 | https://tableplus.com/ |

---

## 🚀 安装步骤

### 步骤 1: 安装 Node.js 22

```bash
# 检查当前版本
node --version

# macOS (使用 nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
nvm use 22

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows
# 下载安装包：https://nodejs.org/dist/v22.x.x/node-v22.x.x-x64.msi
```

### 步骤 2: 安装 pnpm

```bash
# 使用 npm 安装
npm install -g pnpm

# 验证安装
pnpm --version
```

### 步骤 3: 克隆仓库

```bash
# 克隆仓库
git clone https://github.com/songzuo/7zi.git
cd 7zi

# 查看分支
git branch -a

# 切换到开发分支 (如有)
git checkout develop
```

### 步骤 4: 安装依赖

```bash
# 进入 app 目录
cd app

# 安装依赖
pnpm install

# 验证安装
pnpm list
```

### 步骤 5: 配置环境变量

```bash
# 复制环境变量示例
cp .env.example .env.local

# 编辑环境变量
nano .env.local
```

**完整环境变量配置:**

```bash
# ====================
# GitHub API 配置
# ====================
NEXT_PUBLIC_GITHUB_OWNER=songzuo
NEXT_PUBLIC_GITHUB_REPO=7zi
NEXT_PUBLIC_GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# ====================
# 应用配置
# ====================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# ====================
# 认证配置 (如使用)
# ====================
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# ====================
# 数据库配置 (如使用)
# ====================
DATABASE_URL=postgresql://user:password@localhost:5432/7zi

# ====================
# 邮件配置 (如使用)
# ====================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# ====================
# AI 模型配置
# ====================
MINIMAX_API_KEY=your-minimax-key
VOLCENGINE_API_KEY=your-volcengine-key
BAILIAN_API_KEY=your-bailian-key

# ====================
# 监控配置 (可选)
# ====================
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx
```

### 步骤 6: 启动开发服务器

```bash
# 启动开发服务器 (热重载)
pnpm dev

# 指定端口
pnpm dev -p 3001

# 启用调试模式
pnpm dev --debug
```

---

## 🛠️ VS Code 配置

### 推荐扩展

创建 `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "dsznajder.es7-react-js-snippets",
    "prisma.prisma",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

### 工作区设置

创建 `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  },
  "tailwindCSS.experimental.classRegex": [
    ["class[nN]ame\\s*=\\s*['\"]([^'\"]*)['\"]"]
  ],
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "emmet.includeLanguages": {
    "typescript": "typescriptreact",
    "typescriptreact": "typescriptreact"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### 调试配置

创建 `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "pnpm dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    },
    {
      "name": "Next.js: debug full stack",
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev"],
      "console": "integratedTerminal",
      "restart": true,
      "env": {
        "NODE_OPTIONS": "--inspect"
      },
      "attachSimplePort": 9229
    }
  ]
}
```

---

## 🧪 测试配置

### 运行测试

```bash
# 运行所有测试
pnpm test

# 监听模式 (开发时推荐)
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage

# 运行特定测试文件
pnpm test MemberCard.test.tsx

# 运行 E2E 测试 (如有)
pnpm test:e2e
```

### 测试文件示例

```typescript
// app/__tests__/components/MemberCard.test.tsx
import { render, screen } from '@testing-library/react';
import MemberCard from '@/components/MemberCard';

describe('MemberCard', () => {
  it('renders member name correctly', () => {
    render(
      <MemberCard
        name="智能体世界专家"
        role="视角转换、未来布局"
        status="working"
      />
    );
    
    expect(screen.getByText('智能体世界专家')).toBeInTheDocument();
  });

  it('displays correct status indicator', () => {
    render(
      <MemberCard
        name="咨询师"
        role="研究分析"
        status="busy"
      />
    );
    
    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-red-500');
  });
});
```

---

## 📝 代码规范

### ESLint 配置

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off"
  }
}
```

### Prettier 配置

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

### 运行代码检查

```bash
# 检查代码质量
pnpm lint

# 自动修复可修复的问题
pnpm lint:fix

# 格式化代码
pnpm format

# 检查类型
pnpm type-check
```

---

## 🐳 Docker 开发

### 使用 Docker 开发

```bash
# 构建开发镜像
docker-compose -f docker-compose.dev.yml build

# 启动开发容器
docker-compose -f docker-compose.dev.yml up

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f

# 进入容器
docker-compose -f docker-compose.dev.yml exec app bash
```

### docker-compose.dev.yml 示例

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    environment:
      - NODE_ENV=development
      - WATCHPACK_POLLING=true
    command: pnpm dev
```

---

## 🔧 开发工作流

### Git 工作流

```bash
# 创建功能分支
git checkout -b feature/your-feature-name

# 提交代码
git add .
git commit -m "feat: add new feature

- Description of change 1
- Description of change 2

Closes #123"

# 推送到远程
git push origin feature/your-feature-name

# 创建 Pull Request
# 访问 GitHub 创建 PR
```

### 提交信息规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**类型:**
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式 (不影响代码运行)
- `refactor`: 重构 (既不是新功能也不是 Bug 修复)
- `test`: 测试相关
- `chore`: 构建过程或辅助工具变动

**示例:**
```bash
git commit -m "feat(dashboard): add real-time status updates

- Implement WebSocket connection
- Add auto-refresh every 30 seconds
- Display loading state during updates

Closes #45"
```

---

## 🐛 调试技巧

### 浏览器调试

1. 打开 DevTools (F12)
2. 使用 React DevTools 检查组件
3. 使用 Network 面板查看 API 请求
4. 使用 Console 查看日志和错误

### 服务端调试

```typescript
// 在 API 路由中添加调试日志
export async function GET(request: Request) {
  console.log('Request received:', request.url);
  
  try {
    const data = await fetchData();
    console.log('Data fetched:', data);
    return Response.json(data);
  } catch (error) {
    console.error('Error fetching data:', error);
    return Response.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
```

### 使用 debugger 语句

```typescript
function complexCalculation(data: any) {
  debugger; // 执行到这里会暂停
  
  const result = data.map(item => {
    // 复杂逻辑
    return item;
  });
  
  return result;
}
```

---

## 📊 性能分析

### Next.js 内置分析

```bash
# 启用分析构建
pnpm build --profile

# 分析构建产物
pnpm analyze
```

### 使用 Chrome DevTools

1. 打开 Chrome DevTools
2. 切换到 Performance 标签
3. 点击录制按钮
4. 执行操作
5. 停止录制并分析

---

## 🔐 安全最佳实践

### 环境变量安全

```bash
# ✅ 正确：敏感信息放在 .env.local (不提交到 Git)
JWT_SECRET=super-secret-key

# ❌ 错误：不要硬编码在代码中
const JWT_SECRET = "super-secret-key"; // 不要这样做!
```

### .gitignore 配置

```gitignore
# 环境变量
.env.local
.env*.local

# 构建产物
.next/
out/
build/
dist/

# 依赖
node_modules/

# 日志
logs/
*.log
npm-debug.log*

# 测试
coverage/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

---

## 📚 相关资源

- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [项目 API 参考](./API-REFERENCE.md)

---

## 📞 获取帮助

遇到问题？

- **查看文档**: [docs/INDEX.md](./INDEX.md)
- **提交 Issue**: https://github.com/songzuo/7zi/issues
- **邮件支持**: dev@7zi.com

---

**开发愉快！🚀**
