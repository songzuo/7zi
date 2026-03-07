# 7zi Studio - 开源项目日志

> 📅 项目启动：2026-03-05  
> 🌐 GitHub: https://github.com/songzuo/7zi  
> 📝 原则：公开透明 | 只隐藏密码 | 实时更新

---

## 1. 项目介绍

### 🎯 愿景

7zi Studio 是一个由 AI 驱动的创新工作室，致力于探索人机协作的新模式。我们相信 AI 不是替代人类，而是增强人类创造力，让每个人都能成为超级个体。

**核心理念：**
- AI 与人类协同工作，而非替代
- 开源透明，共建共享
- 快速迭代，持续学习
- 技术民主化，降低创造门槛

### 👥 11 位 AI 团队成员

| 角色 | 职责 | 提供商 |
|------|------|--------|
| 🌟 智能体世界专家 | 视角转换、未来布局 | minimax |
| 📚 咨询师 | 研究分析 | minimax |
| 🏗️ 架构师 | 架构设计 | self-claude |
| ⚡ Executor | 执行实现 | volcengine |
| 🛡️ 系统管理员 | 运维部署 | bailian |
| 🧪 测试员 | 测试调试 | minimax |
| 🎨 设计师 | UI设计 | self-claude |
| 📣 推广专员 | 推广SEO | volcengine |
| 💼 销售客服 | 销售客服 | bailian |
| 💰 财务 | 财务会计 | minimax |
| 📺 媒体 | 媒体宣传 | self-claude |

### 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────┐
│                    用户层                            │
│  (Telegram / Discord / Web Interface)               │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                  OpenClaw 框架                       │
│  - 子代理管理系统                                     │
│  - 技能系统 (Skills)                                 │
│  - 工具集成 (Browser/Exec/Message/etc)              │
│  - 记忆系统 (Memory)                                 │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                 AI 模型层                            │
│  MiniMax | Volcengine | Bailian | Self-Claude      │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                 基础设施层                           │
│  - 自部署服务器                                      │
│  - Next.js 前端                                      │
│  - 数据库 & 存储                                     │
└─────────────────────────────────────────────────────┘
```

---

## 2. 开发时间线

### 📅 2026-03-05: 项目启动

- ✅ 确定项目愿景和目标
- ✅ 组建 11 人 AI 团队
- ✅ 搭建基础开发环境
- ✅ 创建 GitHub 仓库

### 📅 2026-03-06: 网站开发

- 🔄 Next.js 项目初始化
- 🔄 基础页面结构设计
- 🔄 AI 团队介绍页面
- 🔄 项目文档系统

### 📅 持续更新...

> 本日志将实时更新项目进展。欢迎通过 GitHub Issues 参与贡献！

---

## 3. 技术决策

### ⚛️ Next.js 选型原因

**为什么选择 Next.js：**

1. **SSR/SSG 支持** - 优秀的 SEO 表现，适合公开项目展示
2. **API Routes** - 内置后端能力，简化架构
3. **TypeScript 友好** - 类型安全，减少运行时错误
4. **生态成熟** - 丰富的插件和社区支持
5. **Vercel 部署** - 一键部署，但也支持自托管
6. **App Router** - 现代化的路由系统，支持 React Server Components

**技术栈：**
- Framework: Next.js 14+
- Language: TypeScript
- Styling: Tailwind CSS
- State: Zustand / React Context
- Database: PostgreSQL / SQLite

### 🚀 自建部署方案

**部署架构：**

```yaml
服务组成:
  - 前端服务：Next.js (Node.js)
  - 反向代理：Nginx / Caddy
  - 数据库：PostgreSQL
  - 缓存：Redis
  - 监控：Prometheus + Grafana
  - 日志：ELK Stack

部署方式:
  - Docker Compose (开发/测试)
  - Kubernetes (生产环境)
  - CI/CD: GitHub Actions
```

**优势：**
- 完全控制数据和隐私
- 降低成本（相比云服务）
- 可定制化程度高
- 学习 DevOps 实践

### 🤖 AI 团队协作架构

**主管 (Director) 模式：**

```
人类主人
    │
    ▼
AI 主管 (协调者)
    │
    ├── 任务分解
    ├── 分配子代理
    ├── 主持会议
    ├── 汇总结果
    └── 汇报主人
    │
    ▼
11 位子代理 (专家团队)
```

**会议系统：**
- 每日站会 - 进度同步
- 规划会 - 方案制定
- 问题研讨 - 技术分析
- 评审会 - 代码/方案评审
- 投票决策 - 民主决策

**通信协议：**
- 子代理通过 `subagents` 工具创建和管理
- 结果通过 push-based 方式自动回传
- 避免轮询，减少 API 调用

---

## 4. 开源链接

### 🔗 核心仓库

- **GitHub:** https://github.com/songzuo/7zi
- **文档:** `/docs/` 目录
- **问题追踪:** GitHub Issues

### 📜 部署脚本

```bash
# 快速部署脚本 (示例)
#!/bin/bash

# 克隆项目
git clone https://github.com/songzuo/7zi.git
cd 7zi

# 安装依赖
npm install

# 环境变量配置
cp .env.example .env
# 编辑 .env 文件配置密钥

# 构建
npm run build

# 启动
npm start
```

### ⚙️ 配置文件

**核心配置：**

```yaml
# openclaw.config.yaml
gateway:
  port: 8080
  host: 0.0.0.0

models:
  default: minimax/MiniMax-M2.5
  providers:
    - minimax
    - volcengine
    - bailian
    - self-claude

skills:
  enabled:
    - coding-agent
    - weather
    - team-meeting
    - healthcheck
```

**环境变量模板：**

```bash
# .env.example
OPENCLAW_GATEWAY_TOKEN=your_token_here
MINIMAX_API_KEY=sk-xxx
VOLCENGINE_API_KEY=xxx
BAILIAN_API_KEY=xxx

# 数据库
DATABASE_URL=postgresql://user:pass@localhost:5432/7zi

# 不要提交真实密钥到 Git!
```

---

## 5. 学习心得

### 🧗 挑战与解决

#### 挑战 1: 多模型协调

**问题：** 11 个 AI 模型来自不同提供商，API 格式和响应方式各异。

**解决：**
- 统一抽象层：OpenClaw 框架提供标准接口
- 错误处理：统一的重试和降级机制
- 成本控制：设置 token 预算和优先级

#### 挑战 2: 状态管理

**问题：** 子代理任务需要追踪进度，但不能频繁轮询。

**解决：**
- Push-based 架构：子代理完成后主动通知
- 会话管理：每个子代理有独立 session ID
- 日志记录：关键操作写入 memory 文件

#### 挑战 3: 知识同步

**问题：** 团队成员（AI）之间如何共享上下文？

**解决：**
- 共享工作区：`/root/.openclaw/workspace/`
- 记忆系统：daily notes + long-term memory
- 文档驱动：所有决策写入 markdown

### 💡 经验总结

1. **文档先行** - 写下来比记在脑子里可靠
2. **小步快跑** - 快速迭代优于完美规划
3. **透明公开** - 开源让项目更有生命力
4. **人机协作** - AI 是工具，人是决策者
5. **持续学习** - 每天进步一点点

---

## 📝 更新日志

| 日期 | 更新内容 | 作者 |
|------|----------|------|
| 2026-03-06 | 初始版本创建 | 记录员 |
| 2026-03-06 | 添加部署状态追踪 | 记录员 |

---

## 6. 部署状态

### 📊 当前状态 (2026-03-06)

| 项目 | 状态 | 备注 |
|------|------|------|
| **GitHub** | ✅ 已推送 | 代码已同步到仓库 |
| **7zi.com** | 🔄 等待 SSH 密钥配置 | 服务器已准备，待密钥配置 |
| **visa.7zi.com 链接** | ✅ 已添加 | 域名链接已配置 |

### 🔐 SSH 配置步骤

**需要配置 SSH 密钥：**

1. 生成 SSH 密钥（如未生成）：
   ```bash
   ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519
   ```

2. 公钥位置：
   ```
   ~/.ssh/id_ed25519.pub
   ```

3. 将公钥复制到服务器：
   ```bash
   ssh-copy-id root@7zi.com
   ```

4. 验证连接：
   ```bash
   ssh root@7zi.com
   ```

### 📋 下一步计划

- [ ] 等待 SSH 密钥配置完成
- [ ] 执行部署脚本
- [ ] 验证网站访问
- [ ] 配置 HTTPS 证书
- [ ] 设置监控和日志

---

> 📌 **备注：** 本文档遵循公开透明原则，除敏感信息（API 密钥、密码等）外，所有内容对外公开。欢迎通过 GitHub 参与讨论和贡献！
