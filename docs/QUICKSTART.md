# 5 分钟快速开始

**最后更新**: 2026-03-06  
**难度**: ⭐ 简单  
**时间**: 5-10 分钟

---

## 🎯 目标

在 5 分钟内完成 7zi Studio 的本地部署并启动开发服务器。

---

## ✅ 前置要求

确保你的系统已安装：

- [ ] **Node.js 22+** - 检查：`node --version`
- [ ] **Git** - 检查：`git --version`
- [ ] **pnpm 8+** (推荐) 或 **npm 10+** - 检查：`pnpm --version`

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

### 安装 pnpm

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
# 进入 app 目录
cd app

# 安装依赖 (使用 pnpm，推荐)
pnpm install

# 或使用 npm
npm install
```

### 步骤 3: 配置环境变量 (1 分钟)

```bash
# 复制环境变量示例文件
cp .env.example .env.local

# 编辑 .env.local (可选，仅用于 GitHub 集成)
nano .env.local
```

**最小配置 (无需 GitHub Token):**
```bash
NEXT_PUBLIC_GITHUB_OWNER=songzuo
NEXT_PUBLIC_GITHUB_REPO=7zi
# NEXT_PUBLIC_GITHUB_TOKEN=  # 可选，不填则使用未认证 API
```

**推荐配置 (带 GitHub Token):**
```bash
NEXT_PUBLIC_GITHUB_OWNER=songzuo
NEXT_PUBLIC_GITHUB_REPO=7zi
NEXT_PUBLIC_GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

> 💡 **获取 GitHub Token:**  
> 访问 https://github.com/settings/tokens  
> 创建 Classic Token，勾选 `repo` 和 `read:user` 权限

### 步骤 4: 启动开发服务器 (30 秒)

```bash
# 启动开发服务器
pnpm dev

# 或使用 npm
npm run dev
```

### 步骤 5: 访问应用 (立即)

打开浏览器访问：

- **主页**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard

---

## ✅ 验证部署

### 检查清单

- [ ] 开发服务器启动成功，显示 `Ready in Xms`
- [ ] 浏览器可以访问 http://localhost:3000
- [ ] Dashboard 页面显示 11 位 AI 成员
- [ ] 无控制台错误 (F12 打开 DevTools 检查)

### 预期效果

```
✓ Ready in 2.5s
○ Local:   http://localhost:3000
○ Network: http://192.168.1.100:3000
```

---

## 🐛 常见问题

### 问题 1: `node --version` 显示版本低于 22

**解决方案:**
```bash
# 使用 nvm 升级 Node.js
nvm install 22
nvm use 22
```

### 问题 2: 安装依赖时出错

**解决方案:**
```bash
# 清理缓存
pnpm store prune
npm cache clean --force

# 删除 node_modules 和锁文件
rm -rf node_modules package-lock.json pnpm-lock.yaml

# 重新安装
pnpm install
```

### 问题 3: 端口 3000 被占用

**解决方案:**
```bash
# 方案 A: 使用其他端口
pnpm dev -p 3001

# 方案 B: 查找并关闭占用进程
lsof -ti:3000 | xargs kill -9  # macOS/Linux
```

### 问题 4: GitHub API 速率限制

**症状:** 控制台显示 `403 rate limit exceeded`

**解决方案:**
```bash
# 在 .env.local 中配置 GitHub Token
NEXT_PUBLIC_GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

未认证：60 次/小时  
已认证：5000 次/小时

---

## 📁 项目结构

```
7zi/
├── app/                    # Next.js 应用主目录
│   ├── dashboard/         # Dashboard 页面
│   ├── components/        # React 组件
│   ├── hooks/            # 自定义 Hooks
│   └── lib/              # 工具函数
├── docs/                 # 项目文档
├── deploy-scripts/       # 部署脚本
├── .github/              # GitHub Actions 配置
└── README.md             # 项目主文档
```

---

## 🎓 下一步

完成快速开始后，你可以：

1. **阅读完整文档**
   - [架构说明](./ARCHITECTURE.md) (待创建)
   - [开发指南](./DEVELOPMENT.md) (待创建)
   - [API 参考](./API-REFERENCE.md)

2. **自定义配置**
   - 修改 AI 成员配置
   - 添加新的数据源
   - 自定义 UI 主题

3. **部署到生产环境**
   - [Docker 部署](../DEPLOYMENT.md)
   - [Vercel 部署](../CI-CD-SETUP.md)
   - [服务器部署](../deploy-scripts/README.md)

---

## 📞 获取帮助

遇到问题？

- **查看文档**: [docs/INDEX.md](./INDEX.md)
- **提交 Issue**: https://github.com/songzuo/7zi/issues
- **邮件支持**: support@7zi.com

---

**🎉 恭喜！你已成功部署 7zi Studio！**
