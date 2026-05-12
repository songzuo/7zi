# v1.14.3 Next.js 16 全面兼容 & Evomap Gateway 部署指南

**生成日期**: 2026-05-10
**服务器**: 7zi.com (172.67.184.212 / 104.21.59.229)
**当前版本**: 7zi-frontend v1.14.3

---

## 一、当前部署状态

### 1.1 服务器信息

| 项目 | 状态 |
|------|------|
| 主机 | 7zi.com (CDN: 172.67.184.212 / 104.21.59.229) |
| 应用目录 | `/opt/7zi-frontend` |
| 前端服务 | Next.js 16.2 (Port 3000) |
| API Gateway | API Gateway v3.0 (Port 2000) |
| Evomap Gateway | GEP-A2A 协议服务 (Port 8080) |
| 服务管理 | PM2 |
| SSL | Cloudflare CDN |

### 1.2 应用结构

```
/opt/7zi-frontend/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── page.tsx           # 首页
│   └── layout.tsx         # 根布局
├── src/
│   ├── components/        # React 组件
│   ├── lib/              # 核心库
│   │   ├── agents/       # AI Agent 系统
│   │   ├── ai/           # AI 模型路由
│   │   ├── workflow/      # 工作流引擎
│   │   └── evomap/       # Evomap Gateway 集成
│   └── hooks/            # React Hooks
├── public/               # 静态资源
├── next.config.ts        # Next.js 配置
├── package.json          # 依赖管理
└── ecosystem.config.js   # PM2 配置
```

---

## 二、技术栈版本

### 2.1 核心依赖版本

| 组件 | 版本 | 说明 |
|------|------|------|
| **Next.js** | 16.2.4 | App Router, Turbopack 支持 |
| **React** | 19.2 | 最新 React 稳定版 |
| **React Compiler** | 配置完成 | Babel 模式，可选启用 |
| **TypeScript** | 5.9.x | 严格模式 |
| **PM2** | Latest | 进程管理 |
| **Node.js** | 22.x | 运行时 |

### 2.2 关键依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `@ducanh2912/next-pwa` | 10.2.9 | PWA 离线能力 |
| `next-themes` | Latest | Dark Mode |
| `zustand` | Latest | 状态管理 |
| `jose` | Latest | JWT 认证 |
| `nodemailer` | Latest | 邮件告警 |

---

## 三、部署前检查

### 3.1 环境准备

```bash
# 检查 Node.js 版本
node --version  # >= 22.x required

# 检查 npm/pnpm 版本
pnpm --version  # >= 9.x recommended

# 检查磁盘空间
df -h /opt

# 检查内存
free -h
```

### 3.2 依赖检查

```bash
cd /opt/7zi-frontend

# 安装依赖
pnpm install

# 检查依赖健康
pnpm audit
```

### 3.3 环境变量配置

```bash
# .env.production
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://7zi.com/api
NEXT_PUBLIC_WS_URL=wss://7zi.com/ws

# AI 模型配置
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
GOOGLE_API_KEY=your-key
DEEPSEEK_API_KEY=your-key

# JWT 配置
JWT_SECRET=your-secret-key

# Evomap Gateway
EVOMAP_GATEWAY_URL=http://localhost:8080
EVOMAP_NODE_ID=7zi-frontend-node
```

---

## 四、Next.js 16.x 部署

### 4.1 构建命令

```bash
# 生产构建 (使用 Turbopack)
pnpm build

# 构建输出在 .next 目录
```

### 4.2 Next.js 16 特定配置

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // React 19 支持
  reactStrictMode: true,
  
  // Turbopack 生产构建
  experimental: {
    // Turbopack 已内置，无需额外配置
  },
  
  // PWA 配置
  ...(process.env.NODE_ENV === 'production' ? {
    headers: async () => [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ],
  } : {}),
  
  // 图片优化
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
  
  // 国际化
  i18n: {
    locales: ['en', 'zh'],
    defaultLocale: 'zh',
  },
}

export default nextConfig
```

### 4.3 React 19.x 注意事项

**已完成的 React 19 优化**:
- React Compiler (Babel) 已配置完成
- `useMemo`/`useCallback` 优化已应用
- Suspense 边界已优化
- SWC 插件已集成

**兼容性说明**:
- 大部分组件已兼容 React 19
- 如遇兼容性问题，可通过 `ENABLE_REACT_COMPILER=false` 禁用 React Compiler
- 详见 `scripts/check-react-compiler-compatibility.sh`

---

## 五、PM2 部署配置

### 5.1 PM2 配置文件

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: '7zi-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: '/opt/7zi-frontend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '1G',
      error_file: '/opt/7zi-frontend/logs/error.log',
      out_file: '/opt/7zi-frontend/logs/out.log',
      time: true,
      // 重启策略
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      name: 'evomap-gateway',
      script: 'node_modules/@evomap/gateway/dist/index.js',
      args: '--port 8080 --node-id 7zi-frontend-node',
      cwd: '/opt/7zi-frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        EVOMAP_GATEWAY_URL: 'http://localhost:8080',
      },
      error_file: '/opt/7zi-frontend/logs/evomap-error.log',
      out_file: '/opt/7zi-frontend/logs/evomap-out.log',
    },
  ],
}
```

### 5.2 PM2 常用命令

```bash
# 启动所有应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs 7zi-frontend
pm2 logs evomap-gateway

# 重启应用
pm2 restart 7zi-frontend
pm2 restart evomap-gateway

# 重启所有
pm2 restart all

# 停止应用
pm2 stop 7zi-frontend

# 删除应用
pm2 delete 7zi-frontend

# 集群模式扩容
pm2 scale 7zi-frontend 4

# 保存进程列表
pm2 save

# 开机自启配置
pm2 startup
pm2 save
```

### 5.3 PM2 监控

```bash
# 查看实时监控
pm2 monit

# 查看详细状态
pm2 show 7zi-frontend

# 查看进程信息
pm2 list
```

---

## 六、Evomap Gateway 部署

### 6.1 概述

Evomap Gateway 是连接智能体世界和 Evomap 系统的核心服务，支持 GEP-A2A 协议。

### 6.2 功能特性

- **节点注册**: 自动注册到 Evomap Hub
- **心跳检测**: GEP-A2A 协议心跳验证
- **Gene/Capsule 发布**: 支持发布 AI 资产
- **任务领取**: 从 Hub 领取任务
- **资产获取**: 获取 Hub 上的资产

### 6.3 部署步骤

#### 步骤 1: 安装依赖

```bash
cd /opt/7zi-frontend
pnpm add @evomap/gateway
```

#### 步骤 2: 配置环境变量

```bash
# .env
EVOMAP_HUB_URL=https://hub.evomap.com
EVOMAP_NODE_ID=7zi-frontend-node
EVOMAP_NODE_NAME=7zi Frontend Gateway
EVOMAP_HEARTBEAT_INTERVAL=30000
```

#### 步骤 3: 启动服务

```bash
# 使用 PM2 启动
pm2 start ecosystem.config.js --only evomap-gateway

# 或直接启动
node node_modules/@evomap/gateway/dist/index.js --port 8080
```

#### 步骤 4: 验证部署

```bash
# 检查健康状态
curl http://localhost:8080/health

# 检查节点注册状态
curl http://localhost:8080/api/node/status
```

### 6.4 GEP-A2A 协议说明

**心跳端点**: `POST /api/heartbeat`
**节点注册**: `POST /api/node/register`
**任务发布**: `POST /api/gene/publish`
**Capsule 获取**: `GET /api/capsule/:id`

---

## 七、部署步骤

### 7.1 部署前备份

```bash
# 备份当前应用
cp -r /opt/7zi-frontend /opt/7zi-frontend.backup-$(date +%Y%m%d-%H%M%S)

# 备份数据库（如有）
cp /opt/7zi-frontend/api-gateway.db /opt/7zi-frontend/backups/
```

### 7.2 拉取最新代码

```bash
cd /opt/7zi-frontend
git fetch origin
git checkout v1.14.3
```

### 7.3 安装依赖

```bash
pnpm install
```

### 7.4 数据库迁移（如有）

```bash
# 运行数据库迁移
pnpm db:migrate

# 或
alembic upgrade head
```

### 7.5 构建

```bash
pnpm build
```

### 7.6 启动服务

```bash
# 停止旧进程
pm2 stop all

# 启动新进程
pm2 start ecosystem.config.js
```

### 7.7 验证部署

```bash
# 检查服务状态
pm2 status

# 检查健康端点
curl http://localhost:3000/health
curl http://localhost:8080/health

# 检查 API 文档
curl http://localhost:3000/api/health
```

---

## 八、部署后验证

### 8.1 功能验证清单

- [ ] 首页可访问 `/`
- [ ] API 文档可访问 `/api/docs`
- [ ] 用户登录功能正常
- [ ] WebSocket 连接正常
- [ ] Evomap Gateway 已注册
- [ ] Dark Mode 切换正常
- [ ] PWA 离线功能正常

### 8.2 性能验证

```bash
# 检查响应时间
curl -o /dev/null -s -w '%{time_total}s\n' http://localhost:3000/

# 预期: < 200ms
```

### 8.3 监控验证

- [ ] PM2 监控显示正常
- [ ] 日志无错误
- [ ] 内存使用正常 (< 1GB per instance)

---

## 九、回滚计划

### 9.1 自动回滚

```bash
# 回滚到上一个版本
git checkout <previous-version>
pnpm build
pm2 restart all
```

### 9.2 手动回滚

```bash
# 1. 停止服务
pm2 stop all

# 2. 恢复备份
rm -rf /opt/7zi-frontend
mv /opt/7zi-frontend.backup-YYYYMMDD-HHMMSS /opt/7zi-frontend

# 3. 重启
pm2 start ecosystem.config.js
```

---

## 十、常见问题排查

### 10.1 PM2 重启次数过多

**症状**: `pm2 restarts > 10`

**排查**:
```bash
pm2 logs 7zi-frontend --lines 100
```

**常见原因**:
- 内存不足 → 增加 `max_memory_restart`
- 端口被占用 → 检查 `lsof -i :3000`
- 代码错误 → 检查错误日志

### 10.2 构建失败

**排查**:
```bash
# 清理构建缓存
rm -rf .next node_modules/.cache
pnpm build
```

### 10.3 Evomap Gateway 连接失败

**排查**:
```bash
# 检查 Hub 连接
curl -v http://localhost:8080/health

# 检查环境变量
grep EVOMAP .env
```

---

## 十一、维护计划

### 11.1 日常维护

- **每日**: 检查 PM2 状态、日志
- **每周**: 检查磁盘空间、内存趋势
- **每月**: 数据库备份、安全审计

### 11.2 升级计划

- 使用 Git flow 管理版本
- 灰度发布: 先更新 1/4 实例，确认后全量
- Evomap Gateway 与主应用独立升级

---

## 十二、联系信息

### 技术支持

- **运维团队**: ops@7zi.com
- **开发团队**: dev@7zi.com

### 文档更新

- **更新日期**: 2026-04-25
- **更新人**: AI 系统管理员
- **版本**: 1.4

---

**备注**: 本文档基于 v1.14.1 版本编写，涵盖 Next.js 16.2 和 React 19.2 部署要求。
