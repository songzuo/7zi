# 5 分钟快速开始

**最后更新**: 2026-03-22  
**版本**: v1.0.6  
**难度**: ⭐ 简单  
**时间**: 5-10 分钟

---

## 🎯 目标

在 5 分钟内完成 7zi Platform 的本地部署并启动开发服务器。

---

## ✅ 前置要求

确保你的系统已安装：

- [ ] **Node.js 22+** - 检查：`node --version`
- [ ] **Git** - 检查：`git --version`
- [ ] **npm 10+** 或 **pnpm 8+** - 检查：`npm --version` 或 `pnpm --version`

### 安装 Node.js (如未安装)

```bash
# macOS (使用 Homebrew)
brew install node@22

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows
# 下载安装包：https://nodejs.org/
```

### 安装 pnpm (可选，但推荐)

```bash
npm install -g pnpm
```

---

## 🚀 快速部署

### 步骤 1: 克隆仓库 (30 秒)

```bash
git clone https://github.com/songzuo/7zi.git
cd 7zi
```

### 步骤 2: 安装依赖 (2-3 分钟)

```bash
# 使用 npm
npm install

# 或使用 pnpm（更快）
pnpm install
```

### 步骤 3: 配置环境变量 (1 分钟)

```bash
# 复制环境变量示例文件
cp .env.example .env.local

# 编辑 .env.local
nano .env.local
```

**最小配置**:
```bash
# 应用配置
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 数据库（使用 SQLite）
DATABASE_URL=file:./data/db.sqlite

# AI 模型 API（至少配置一个）
# 选择你的提供商并配置对应的 API Key

# OpenAI (可选)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxx

# Anthropic Claude (可选)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxx

# MiniMax (可选)
MINIMAX_API_KEY=xxxxxxxxxxxxxxxxxxx

# Bailian (阿里云，可选)
BAILIAN_API_KEY=xxxxxxxxxxxxxxxxxxx

# Volcengine (字节跳动，可选)
VOLCENGINE_API_KEY=xxxxxxxxxxxxxxxxxxx
```

**完整配置**:
```bash
# 应用配置
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 数据库
DATABASE_URL=file:./data/db.sqlite

# AI 模型 API
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
MINIMAX_API_KEY=your_key_here
BAILIAN_API_KEY=your_key_here
VOLCENGINE_API_KEY=your_key_here

# 邮件通知（可选）
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_password

# 监控（可选）
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxx@sentry.io/xxxxxx

# GitHub 集成（可选）
NEXT_PUBLIC_GITHUB_OWNER=songzuo
NEXT_PUBLIC_GITHUB_REPO=7zi
NEXT_PUBLIC_GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

> 💡 **获取 API Key**:  
> - OpenAI: https://platform.openai.com/api-keys
> - Anthropic: https://console.anthropic.com/settings/keys
> - MiniMax: https://api.minimax.chat/user-center/basic-information/interface-key
> - Bailian: https://bailian.console.aliyun.com/
> - Volcengine: https://console.volcengine.com/ark

### 步骤 4: 初始化数据库 (30 秒)

```bash
# 创建数据库并初始化表
npm run db:init

# 或运行迁移
npm run migrate
```

### 步骤 5: 启动开发服务器 (30 秒)

```bash
# 使用 npm
npm run dev

# 或使用 pnpm
pnpm dev
```

### 步骤 6: 访问应用 (立即)

打开浏览器访问：

- **主页**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard
- **设置**: http://localhost:3000/settings
- **API 文档**: http://localhost:3000/api/docs

---

## ✅ 验证部署

### 检查清单

- [ ] 开发服务器启动成功，显示 `Ready in Xms`
- [ ] 浏览器可以访问 http://localhost:3000
- [ ] Dashboard 页面显示 11 位 AI 成员
- [ ] 无控制台错误 (F12 打开 DevTools 检查)
- [ ] 可以创建和管理任务
- [ ] 通知系统正常工作

### 预期效果

```
✓ Ready in 2.5s
○ Local:   http://localhost:3000
○ Network: http://192.168.1.100:3000

  ○  /                         (size: 5 kB)
  ○  /dashboard                (size: 12 kB)
  ○  /settings                 (size: 8 kB)
  ○  /api/health               (size: 0.5 kB)
```

---

## 🎨 v1.0.6 核心功能

部署成功后，你可以体验以下功能：

### 🔔 实时通知系统
- WebSocket 实时推送
- 多种通知类型 (success/error/warning/info/task_assigned)
- 四种优先级 (low/medium/high/urgent)
- 通知历史记录和已读/未读状态
- Email 通知集成

### 🔐 RBAC 权限系统
- 5 种内置角色（ADMIN/MANAGER/MEMBER/VIEWER/GUEST）
- 45 种细粒度权限
- 自定义角色和权限创建
- 用户-角色-权限三级权限体系

### 🎨 主题系统
- 7 种预设主题
- 自定义颜色、间距、圆角、字体
- light/dark/system 三种模式
- localStorage 持久化存储
- 主题配置导入导出

### 📊 Dashboard
- 实时任务状态追踪
- 团队工作效率可视化
- 性能指标监控
- 自定义图表和报表

### ⚡ 性能优化
- 虚拟滚动
- 懒加载组件
- React.memo 优化
- API 缓存机制

---

## 🐛 常见问题

### 问题 1: `node --version` 显示版本低于 22

**解决方案:**
```bash
# 使用 nvm 升级 Node.js
nvm install 22
nvm use 22

# 或使用 nvm-windows（Windows）
nvm-windows install 22.0.0
```

### 问题 2: 安装依赖时出错

**解决方案:**
```bash
# 清理缓存
npm cache clean --force
# 或 pnpm store prune

# 删除 node_modules 和锁文件
rm -rf node_modules package-lock.json pnpm-lock.yaml

# 重新安装
npm install
```

### 问题 3: 数据库初始化失败

**解决方案:**
```bash
# 手动创建数据库目录
mkdir -p data

# 检查 better-sqlite3 是否正确安装
npm rebuild better-sqlite3

# 重新初始化
npm run db:init
```

### 问题 4: 端口 3000 被占用

**解决方案:**
```bash
# 方案 A: 使用其他端口
npm run dev -- -p 3001

# 方案 B: 查找并关闭占用进程
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### 问题 5: AI 模型 API 调用失败

**解决方案:**
```bash
# 检查 API Key 是否正确配置
cat .env.local | grep API_KEY

# 验证 API Key 是否有效
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"test"}]}'
```

### 问题 6: TypeScript 编译错误

**解决方案:**
```bash
# 清理构建缓存
rm -rf .next

# 重新安装依赖
npm install

# 检查 TypeScript 配置
npm run type-check
```

---

## 📁 项目结构

```
7zi/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由 (65+ 端点)
│   │   ├── auth/         # 认证相关
│   │   ├── users/        # 用户管理
│   │   ├── tasks/        # 任务管理
│   │   ├── notifications/# 通知系统
│   │   ├── rbac/         # 权限管理
│   │   └── ...           # 其他 API
│   ├── (dashboard)/      # Dashboard 页面组
│   ├── (auth)/           # 认证页面组
│   ├── layout.tsx        # 根布局
│   └── page.tsx          # 首页
│
├── components/            # React 组件 (80+)
│   ├── ui/               # 基础 UI 组件
│   ├── dashboard/        # Dashboard 组件
│   ├── auth/             # 认证组件
│   ├── notifications/    # 通知组件
│   └── ...               # 其他组件
│
├── lib/                   # 核心库 (26 模块)
│   ├── db.ts             # 数据库操作
│   ├── permissions.ts    # 权限系统
│   ├── notifications.ts  # 通知系统
│   ├── websocket.ts      # WebSocket 管理
│   ├── logger.ts         # 日志系统
│   └── ...               # 其他工具
│
├── hooks/                 # 自定义 React Hooks
│   ├── useAuth.ts         # 认证 Hook
│   ├── useNotifications.ts # 通知 Hook
│   └── ...                # 其他 Hooks
│
├── stores/                # Zustand 状态管理
│   ├── authStore.ts       # 认证状态
│   └── ...                # 其他 Store
│
├── types/                 # TypeScript 类型定义
│   ├── api.ts             # API 类型
│   ├── models.ts          # 数据模型
│   └── ...                # 其他类型
│
├── i18n/                  # 国际化配置
│   ├── locales/          # 语言文件
│   └── config.ts         # i18n 配置
│
├── tests/                 # 测试文件 (490+)
│   ├── unit/             # 单元测试
│   ├── integration/      # 集成测试
│   └── e2e/              # E2E 测试
│
├── docs/                  # 文档 (119 个文件)
│   ├── API-*.md          # API 文档
│   ├── ARCHITECTURE.md   # 架构文档
│   └── ...               # 其他文档
│
├── scripts/               # 构建和部署脚本
├── .github/               # GitHub Actions CI/CD
├── docker/                # Docker 配置
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── README.md
└── CHANGELOG.md
```

---

## 🎓 下一步

完成快速开始后，你可以：

### 1. 阅读完整文档

- [📖 README.md](../README.md) - 项目介绍和功能特性
- [🏗️ ARCHITECTURE.md](./ARCHITECTURE.md) - 系统架构设计
- [💻 DEVELOPMENT.md](./DEVELOPMENT.md) - 开发指南
- [📡 API-COMPLETE-REFERENCE.md](./API-COMPLETE-REFERENCE.md) - 完整 API 文档
- [🧪 TESTING.md](./TESTING.md) - 测试指南

### 2. 自定义配置

- 修改 AI 成员配置（11 位专业角色）
- 添加新的数据源和集成
- 自定义 UI 主题和样式
- 配置 RBAC 权限系统

### 3. 开发和测试

```bash
# 运行测试
npm test

# 生成覆盖率报告
npm run test:coverage

# 运行 E2E 测试
npm run test:e2e

# 类型检查
npm run type-check

# 代码格式化
npm run format
```

### 4. 部署到生产环境

- [🐳 Docker 部署](./DEPLOYMENT-GUIDE.md) - Docker 容器化部署
- [☁️ Vercel 部署](../DEPLOY.md) - Vercel 平台部署
- [🔄 CI/CD 配置](./CI-CD-SETUP.md) - GitHub Actions 自动化部署
- [🖥️ 服务器部署](../deploy-scripts/README.md) - 服务器手动部署

---

## 📞 获取帮助

遇到问题？

- **查看文档**: [docs/INDEX.md](./INDEX.md)
- **API 文档**: [docs/API-COMPLETE-REFERENCE.md](./API-COMPLETE-REFERENCE.md)
- **提交 Issue**: https://github.com/songzuo/7zi/issues
- **讨论区**: https://github.com/songzuo/7zi/discussions
- **邮件支持**: support@7zi.com

---

## 🎉 恭喜！

你已成功部署 **7zi Platform v1.0.6**！

现在你可以：
- ✅ 使用 11 位 AI 成员协作工作
- ✅ 管理任务和项目
- ✅ 使用实时通知系统
- ✅ 配置 RBAC 权限控制
- ✅ 自定义主题和界面
- ✅ 分析团队工作效率

**开始探索吧！** 🚀
