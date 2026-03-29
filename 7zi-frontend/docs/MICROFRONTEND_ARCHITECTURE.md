# 7zi-Frontend 微前端架构方案

> **文档版本**: 1.0.0
> **创建日期**: 2026-03-28
> **架构师**: AI架构师
> **目标**: 从单仓库架构迁移到微前端架构，提升可维护性、可扩展性和独立部署能力

---

## 📋 目录

- [1. 现状分析](#1-现状分析)
- [2. 架构方案设计](#2-架构方案设计)
- [3. 技术选型](#3-技术选型)
- [4. 实施路线图](#4-实施路线图)
- [5. 详细实施指南](#5-详细实施指南)
- [6. 风险评估与应对](#6-风险评估与应对)
- [7. 监控与治理](#7-监控与治理)

---

## 1. 现状分析

### 1.1 当前架构概览

**技术栈**:
- **框架**: Next.js 14.2.0 (App Router)
- **UI库**: React 18.2.0
- **状态管理**: Zustand 4.5.0
- **实时通信**: Socket.io Client 4.7.0
- **构建工具**: Next.js 内置
- **测试**: Vitest + Playwright

**项目结构**:
```
src/
├── app/                    # Next.js App Router 页面
│   ├── api/               # API 路由
│   ├── notification-demo/
│   ├── websocket-status-demo/
│   └── monitoring-example/
├── components/             # React 组件
│   ├── notifications/      # 通知中心相关 (308行 - NotificationCenter)
│   └── websocket/          # WebSocket 组件 (358行 - WebSocketStatusPanel)
├── hooks/                  # 自定义 Hooks
├── lib/                    # 工具库和服务
│   ├── api/
│   ├── audit/
│   ├── monitoring/
│   ├── rate-limit/
│   └── services/
└── test/                   # 测试工具
```

### 1.2 当前架构的优势

✅ **开发效率高**
- 单一仓库，代码共享方便
- 统一的构建和部署流程
- 依赖管理简单

✅ **TypeScript 支持**
- 类型安全
- 良好的 IDE 支持

✅ **性能优化**
- Next.js SSR/SSG
- 图片优化
- 代码分割

✅ **测试覆盖完善**
- 单元测试 (Vitest)
- E2E测试 (Playwright)

### 1.3 当前架构的痛点

❌ **单点风险**
- 一个构建失败，整个应用不可用
- 代码耦合度较高

❌ **部署依赖**
- 所有改动必须整体部署
- 无法独立发布功能模块

❌ **团队协作限制**
- 代码冲突频繁
- 难以支持多团队并行开发

❌ **性能挑战**
- 初始包体积较大
- 动态导入虽然存在，但不够灵活

❌ **扩展性受限**
- 新增功能需要修改主应用
- 难以独立维护和升级模块

### 1.4 关键组件分析

| 组件名称 | 行数 | 职责 | 复杂度 | 优先级拆分 |
|---------|------|------|--------|-----------|
| WebSocketStatusPanel | 358 | WebSocket连接状态监控 | 高 | ⭐⭐⭐⭐⭐ |
| NotificationCenter | 308 | 通知中心UI和逻辑 | 高 | ⭐⭐⭐⭐⭐ |
| 监控页面 | 329 | 监控数据展示 | 中 | ⭐⭐⭐ |
| 通知Demo页面 | 282 | 通知功能演示 | 低 | ⭐⭐ |
| 图片优化页面 | 202 | 图片优化示例 | 低 | ⭐ |

---

## 2. 架构方案设计

### 2.1 推荐方案：Module Federation 2.0

**核心理念**: 在运行时动态加载独立构建的模块，实现代码共享和独立部署

#### 2.1.1 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     Host Application                         │
│                  (Next.js 14 + App Router)                  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   路由层     │  │  全局状态    │  │  共享依赖    │      │
│  │ (App Router) │  │  (Zustand)   │  │  (UI Libs)   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │              │
└─────────┼─────────────────┼─────────────────┼──────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────┴─────────────────┴─────────────────┴──────────────┐
│              Module Federation Runtime                      │
│                    (动态加载 + 共享)                         │
└─────────┬─────────────────┬─────────────────┬──────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │  Remote  │      │  Remote  │      │  Remote  │
    │ Notifications     │  WebSocket  │   Monitoring│
    │  Module  │      │  Module  │      │  Module  │
    │  (Vite)  │      │  (Vite)  │      │  (Vite)  │
    └──────────┘      └──────────┘      └──────────┘
          │                 │                 │
          ▼                 ▼                 ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │ 独立部署  │      │ 独立部署  │      │ 独立部署  │
    │ 独立版本  │      │ 独立版本  │      │ 独立版本  │
    │ 独立构建  │      │ 独立构建  │      │ 独立构建  │
    └──────────┘      └──────────┘      └──────────┘
```

#### 2.1.2 模块划分

| 模块 | 类型 | 职责 | 技术栈 | 端口 |
|------|------|------|--------|------|
| **Host** | 宿主应用 | 路由、布局、全局状态 | Next.js 14 + React 18 | 3000 |
| **notifications** | 远程模块 | 通知中心功能 | Vite + React 18 | 3001 |
| **websocket** | 远程模块 | WebSocket状态面板 | Vite + React 18 | 3002 |
| **monitoring** | 远程模块 | 监控仪表盘 | Vite + React 18 | 3003 |
| **shared** | 共享库 | 通用组件、工具、类型 | Vite + TypeScript | 3004 |

#### 2.1.3 依赖共享策略

```typescript
// Module Federation 配置
{
  shared: {
    'react': { singleton: true, requiredVersion: '^18.2.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
    'zustand': { singleton: true, requiredVersion: '^4.5.0' },
    'socket.io-client': { singleton: true, requiredVersion: '^4.7.0' },
    'date-fns': { singleton: false, requiredVersion: '^3.6.0' },
    'clsx': { singleton: false, requiredVersion: '^2.1.0' },
  }
}
```

### 2.2 备选方案对比

| 维度 | Module Federation | Qwik SPA | Single Repo Monorepo |
|------|------------------|----------|---------------------|
| **独立部署** | ✅ 完全独立 | ✅ 完全独立 | ❌ 整体部署 |
| **代码共享** | ✅ 运行时共享 | ⚠️ 需要包管理 | ✅ 直接共享 |
| **性能** | ⚠️ 网络开销 | ✅ 最佳 | ✅ 最优 |
| **学习曲线** | ⚠️ 中等 | ❌ 陡峭 | ✅ 平缓 |
| **生态** | ✅ 成熟 | ⚠️ 新兴 | ✅ 成熟 |
| **适合Next.js** | ✅ 完美支持 | ⚠️ 需要改造 | ✅ 原生 |

**推荐理由**: Module Federation 与 Next.js 14 集成良好，生态成熟，学习曲线适中，完美平衡了独立部署和代码共享的需求。

---

## 3. 技术选型

### 3.1 核心技术栈

| 技术选型 | 版本 | 用途 |
|---------|------|------|
| **@module-federation/vite** | latest | Module Federation 支持 |
| **Next.js** | 14.2.0 | Host 应用框架 |
| **Vite** | 5.x | Remote 应用构建 |
| **React** | 18.2.0 | UI框架 |
| **TypeScript** | 5.3+ | 类型安全 |
| **Zustand** | 4.5.0 | 状态管理 |
| **Socket.io Client** | 4.7.0 | 实时通信 |

### 3.2 开发工具

| 工具 | 版本 | 用途 |
|------|------|------|
| **Vitest** | 1.3+ | 单元测试 |
| **Playwright** | 1.42+ | E2E测试 |
| **ESLint** | latest | 代码规范 |
| **Prettier** | latest | 代码格式化 |
| **Turbo** (可选) | latest | Monorepo构建优化 |

### 3.3 部署工具

| 工具 | 用途 |
|------|------|
| **Docker** | 容器化部署 |
| **Nginx** | 反向代理和静态资源服务 |
| **GitHub Actions** | CI/CD流水线 |
| **PM2** | 进程管理 |

---

## 4. 实施路线图

### 4.1 阶段划分

```
阶段1: 基础设施搭建 (Week 1-2)
  ↓
阶段2: 共享模块提取 (Week 3)
  ↓
阶段3: Remote模块迁移 (Week 4-6)
  ↓
阶段4: 集成测试与优化 (Week 7)
  ↓
阶段5: 生产部署与监控 (Week 8)
```

### 4.2 详细任务清单

#### 🏗️ 阶段1: 基础设施搭建 (Week 1-2)

**Week 1: Monorepo 结构设计**

- [ ] 设置 Monorepo 目录结构
- [ ] 配置 `@module-federation/vite` 插件
- [ ] 创建 Host 应用基础架构
- [ ] 创建 Remote 应用模板
- [ ] 配置 TypeScript 路径别名

**Week 2: 开发环境配置**

- [ ] 配置本地多端口开发环境
- [ ] 设置热更新 (HMR) 跨模块
- [ ] 配置 ESLint/Prettier 共享规则
- [ ] 设置共享的 TypeScript 配置
- [ ] 配置测试环境 (Vitest + Playwright)

#### 📦 阶段2: 共享模块提取 (Week 3)

**任务列表**:

- [ ] 创建 `packages/shared` 模块
- [ ] 提取通用类型定义 (`types/`)
- [ ] 提取通用工具函数 (`utils/`)
- [ ] 提取通用 Hooks (`hooks/`)
- [ ] 提取样式系统 (`styles/`)
- [ ] 编写共享模块测试

**提取清单**:

```typescript
// packages/shared/types/index.ts
export interface WebSocketState { ... }
export interface Notification { ... }
export interface MonitoringData { ... }

// packages/shared/utils/index.ts
export { formatDate } from './date'
export { cn } from './clsx'
export { validateEmail } from './validation'

// packages/shared/hooks/index.ts
export { useWebSocket } from './useWebSocket'
export { useNotifications } from './useNotifications'
export { useMonitoring } from './useMonitoring'
```

#### 🚀 阶段3: Remote模块迁移 (Week 4-6)

**Week 4: Notifications 模块迁移**

- [ ] 创建 `apps/notifications` 项目
- [ ] 配置 Module Federation (Remote 端)
- [ ] 迁移 `NotificationCenter` 组件 (308行)
- [ ] 迁移 `NotificationToast` 组件
- [ ] 迁移通知相关 Hooks
- [ ] 配置独立路由和状态管理
- [ ] 编写模块测试

**Week 5: WebSocket 模块迁移**

- [ ] 创建 `apps/websocket` 项目
- [ ] 配置 Module Federation (Remote 端)
- [ ] 迁移 `WebSocketStatusPanel` 组件 (358行)
- [ ] 迁移 WebSocket 相关服务
- [ ] 配置独立路由和状态管理
- [ ] 编写模块测试

**Week 6: Monitoring 模块迁移**

- [ ] 创建 `apps/monitoring` 项目
- [ ] 配置 Module Federation (Remote 端)
- [ ] 迁移监控页面组件 (329行)
- [ ] 迁移监控相关服务
- [ ] 配置独立路由和状态管理
- [ ] 编写模块测试

#### 🧪 阶段4: 集成测试与优化 (Week 7)

**集成测试**:

- [ ] Host 应用集成所有 Remote 模块
- [ ] 端到端测试 (Playwright)
- [ ] 性能测试 (加载时间、包体积)
- [ ] 错误边界测试
- [ ] 离线降级测试

**性能优化**:

- [ ] 配置预加载策略
- [ ] 优化共享依赖加载
- [ ] 配置错误边界和降级
- [ ] 实现模块懒加载
- [ ] 优化构建产物体积

#### 🚢 阶段5: 生产部署与监控 (Week 8)

**部署准备**:

- [ ] 配置 Docker 镜像构建
- [ ] 设置 Nginx 反向代理
- [ ] 配置 CI/CD 流水线
- [ ] 设置环境变量管理
- [ ] 配置域名和 SSL

**监控与告警**:

- [ ] 设置应用性能监控 (APM)
- [ ] 配置错误追踪 (Sentry)
- [ ] 设置日志收集
- [ ] 配置告警规则
- [ ] 编写运维文档

---

## 5. 详细实施指南

### 5.1 项目结构设计

#### 5.1.1 Monorepo 目录结构

```
7zi-frontend/
├── apps/
│   ├── host/                    # Host 应用 (Next.js)
│   │   ├── src/
│   │   ├── package.json
│   │   ├── next.config.js
│   │   └── vite.config.ts       # Module Federation 配置
│   │
│   ├── notifications/            # Notifications Remote
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── websocket/               # WebSocket Remote
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── monitoring/              # Monitoring Remote
│       ├── src/
│       ├── package.json
│       └── vite.config.ts
│
├── packages/
│   ├── shared/                 # 共享库
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── utils/
│   │   │   ├── hooks/
│   │   │   └── components/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ui/                     # 共享UI组件 (可选)
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
│
├── docker/
│   ├── host.Dockerfile
│   ├── notifications.Dockerfile
│   ├── websocket.Dockerfile
│   └── monitoring.Dockerfile
│
├── nginx/
│   ├── nginx.conf
│   └── ssl/
│
├── .github/
│   └── workflows/
│       ├── ci-host.yml
│       ├── ci-remote.yml
│       └── deploy.yml
│
├── package.json                 # 根 package.json
├── pnpm-workspace.yaml         # Workspace 配置
├── turbo.json                  # Turbo 配置 (可选)
└── tsconfig.json               # 根 TypeScript 配置
```

#### 5.1.2 根配置文件

**package.json**:
```json
{
  "name": "7zi-frontend-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.3.0",
    "@module-federation/vite": "^2.0.0"
  }
}
```

**pnpm-workspace.yaml**:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**turbo.json**:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    }
  }
}
```

### 5.2 Module Federation 配置

#### 5.2.1 Host 应用配置

**apps/host/vite.config.ts**:
```typescript
import { federation } from '@module-federation/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'host',
      remotes: {
        notifications: 'http://localhost:3001/assets/remoteEntry.js',
        websocket: 'http://localhost:3002/assets/remoteEntry.js',
        monitoring: 'http://localhost:3003/assets/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.2.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
        zustand: { singleton: true, requiredVersion: '^4.5.0' },
        'socket.io-client': { singleton: true, requiredVersion: '^4.7.0' },
        '@7zi/shared': { singleton: true },
      },
    }),
  ],
  build: {
    target: 'esnext',
    modulePreload: false,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
```

**apps/host/next.config.js**:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@7zi/shared'],
  webpack: (config, { isServer }) => {
    // Module Federation 配置由 Vite 处理
    return config
  },
}

module.exports = nextConfig
```

**apps/host/src/app/layout.tsx**:
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '7zi Frontend',
  description: 'Micro-frontend Architecture',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

**apps/host/src/app/page.tsx**:
```typescript
'use client'

import dynamic from 'next/dynamic'

// 动态导入 Remote 模块
const NotificationsApp = dynamic(
  () => import('notifications/NotificationApp'),
  {
    loading: () => <div>Loading Notifications...</div>,
    ssr: false,
  }
)

const WebSocketApp = dynamic(
  () => import('websocket/WebSocketApp'),
  {
    loading: () => <div>Loading WebSocket...</div>,
    ssr: false,
  }
)

const MonitoringApp = dynamic(
  () => import('monitoring/MonitoringApp'),
  {
    loading: () => <div>Loading Monitoring...</div>,
    ssr: false,
  }
)

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <nav className="bg-gray-800 text-white p-4">
        <h1 className="text-2xl font-bold">7zi Frontend</h1>
      </nav>

      <div className="container mx-auto p-4 space-y-8">
        <section id="notifications">
          <h2 className="text-xl font-bold mb-4">Notifications</h2>
          <NotificationsApp />
        </section>

        <section id="websocket">
          <h2 className="text-xl font-bold mb-4">WebSocket Status</h2>
          <WebSocketApp />
        </section>

        <section id="monitoring">
          <h2 className="text-xl font-bold mb-4">Monitoring</h2>
          <MonitoringApp />
        </section>
      </div>
    </main>
  )
}
```

#### 5.2.2 Notifications Remote 配置

**apps/notifications/vite.config.ts**:
```typescript
import { federation } from '@module-federation/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'notifications',
      filename: 'remoteEntry.js',
      exposes: {
        './NotificationApp': './src/NotificationApp.tsx',
        './NotificationCenter': './src/components/NotificationCenter.tsx',
        './NotificationToast': './src/components/NotificationToast.tsx',
        './useNotifications': './src/hooks/useNotifications.ts',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.2.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
        zustand: { singleton: true, requiredVersion: '^4.5.0' },
        '@7zi/shared': { singleton: true },
      },
    }),
  ],
  build: {
    target: 'esnext',
    modulePreload: false,
  },
  server: {
    port: 3001,
    origin: 'http://localhost:3001',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@7zi/shared': fileURLToPath(new URL('../../packages/shared/src', import.meta.url)),
    },
  },
})
```

**apps/notifications/src/NotificationApp.tsx**:
```typescript
import { NotificationCenter } from './components/NotificationCenter'

export default function NotificationApp() {
  return (
    <div className="p-4 border rounded-lg bg-white">
      <NotificationCenter />
    </div>
  )
}
```

**apps/notifications/src/components/NotificationCenter.tsx**:
```typescript
'use client'

import { useState } from 'react'
import { useNotifications } from '@7zi/shared'
import { NotificationToast } from './NotificationToast'

export function NotificationCenter() {
  const { notifications, addNotification, removeNotification } = useNotifications()

  const handleAddTest = () => {
    addNotification({
      title: 'Test Notification',
      message: 'This is a test notification from the remote module',
      type: 'info',
    })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Notification Center</h3>
        <button
          onClick={handleAddTest}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Add Test Notification
        </button>
      </div>

      <div className="space-y-2">
        {notifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </div>
  )
}
```

#### 5.2.3 WebSocket Remote 配置

**apps/websocket/vite.config.ts**:
```typescript
import { federation } from '@module-federation/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'websocket',
      filename: 'remoteEntry.js',
      exposes: {
        './WebSocketApp': './src/WebSocketApp.tsx',
        './WebSocketStatusPanel': './src/components/WebSocketStatusPanel.tsx',
        './useWebSocket': './src/hooks/useWebSocket.ts',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.2.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
        zustand: { singleton: true, requiredVersion: '^4.5.0' },
        'socket.io-client': { singleton: true, requiredVersion: '^4.7.0' },
        '@7zi/shared': { singleton: true },
      },
    }),
  ],
  build: {
    target: 'esnext',
    modulePreload: false,
  },
  server: {
    port: 3002,
    origin: 'http://localhost:3002',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@7zi/shared': fileURLToPath(new URL('../../packages/shared/src', import.meta.url)),
    },
  },
})
```

**apps/websocket/src/components/WebSocketStatusPanel.tsx**:
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useWebSocket } from '@7zi/shared'

export function WebSocketStatusPanel() {
  const { isConnected, reconnect, stats, lastMessage } = useWebSocket('ws://localhost:8080')

  const statusColor = isConnected ? 'bg-green-500' : 'bg-red-500'

  return (
    <div className="p-4 border rounded-lg bg-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${statusColor}`} />
          <span className="font-semibold">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {!isConnected && (
          <button
            onClick={reconnect}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Reconnect
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-semibold">Messages Sent:</span>
          <span className="ml-2">{stats.messagesSent}</span>
        </div>
        <div>
          <span className="font-semibold">Messages Received:</span>
          <span className="ml-2">{stats.messagesReceived}</span>
        </div>
        <div>
          <span className="font-semibold">Last Ping:</span>
          <span className="ml-2">{stats.lastPing}ms</span>
        </div>
        <div>
          <span className="font-semibold">Uptime:</span>
          <span className="ml-2">{stats.uptime}s</span>
        </div>
      </div>

      {lastMessage && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
          <span className="font-semibold">Last Message:</span>
          <pre className="mt-1 overflow-auto">{JSON.stringify(lastMessage, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
```

#### 5.2.4 Monitoring Remote 配置

**apps/monitoring/vite.config.ts**:
```typescript
import { federation } from '@module-federation/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'monitoring',
      filename: 'remoteEntry.js',
      exposes: {
        './MonitoringApp': './src/MonitoringApp.tsx',
        './MonitoringDashboard': './src/components/MonitoringDashboard.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.2.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
        zustand: { singleton: true, requiredVersion: '^4.5.0' },
        'date-fns': { singleton: false, requiredVersion: '^3.6.0' },
        '@7zi/shared': { singleton: true },
      },
    }),
  ],
  build: {
    target: 'esnext',
    modulePreload: false,
  },
  server: {
    port: 3003,
    origin: 'http://localhost:3003',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@7zi/shared': fileURLToPath(new URL('../../packages/shared/src', import.meta.url)),
    },
  },
})
```

### 5.3 共享模块设计

#### 5.3.1 Shared Package 配置

**packages/shared/package.json**:
```json
{
  "name": "@7zi/shared",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "zustand": "^4.5.0",
    "socket.io-client": "^4.7.0",
    "date-fns": "^3.6.0",
    "clsx": "^2.1.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.3.0",
    "vitest": "^1.3.0"
  }
}
```

**packages/shared/tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### 5.3.2 Shared Types

**packages/shared/src/types/index.ts**:
```typescript
/**
 * WebSocket 相关类型
 */

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR',
}

export interface ConnectionStats {
  messagesSent: number
  messagesReceived: number
  lastPing: number
  uptime: number
  reconnectAttempts: number
}

/**
 * 通知相关类型
 */

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

export interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType
  timestamp: Date
  read?: boolean
  actions?: NotificationAction[]
}

export interface NotificationAction {
  label: string
  action: () => void
  variant?: 'primary' | 'secondary' | 'danger'
}

/**
 * 监控相关类型
 */

export interface MonitoringMetrics {
  cpu: number
  memory: number
  disk: number
  network: {
    in: number
    out: number
  }
}

export interface Alert {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  timestamp: Date
  resolved: boolean
}
```

#### 5.3.3 Shared Hooks

**packages/shared/src/hooks/useWebSocket.ts**:
```typescript
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { ConnectionState, ConnectionStats } from '../types'

interface UseWebSocketOptions {
  url: string
  autoConnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export function useWebSocket(options: UseWebSocketOptions | string) {
  const config = typeof options === 'string' ? { url: options } : options
  const {
    url,
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = config

  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [stats, setStats] = useState<ConnectionStats>({
    messagesSent: 0,
    messagesReceived: 0,
    lastPing: 0,
    uptime: 0,
    reconnectAttempts: 0,
  })
  const [lastMessage, setLastMessage] = useState<any>(null)

  const connect = useCallback(() => {
    if (!socketRef.current) {
      const socket = io(url, { autoConnect: false })
      socketRef.current = socket

      socket.on('connect', () => setIsConnected(true))
      socket.on('disconnect', () => setIsConnected(false))
      socket.on('message', (data) => {
        setLastMessage(data)
        setStats((prev) => ({ ...prev, messagesReceived: prev.messagesReceived + 1 }))
      })
    }
    socketRef.current?.connect()
  }, [url])

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect()
  }, [])

  const reconnect = useCallback(() => {
    disconnect()
    setTimeout(connect, 100)
  }, [connect, disconnect])

  const send = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
      setStats((prev) => ({ ...prev, messagesSent: prev.messagesSent + 1 }))
    }
  }, [])

  useEffect(() => {
    if (autoConnect) {
      connect()
    }
    return () => disconnect()
  }, [autoConnect, connect, disconnect])

  return {
    isConnected,
    stats,
    lastMessage,
    connect,
    disconnect,
    reconnect,
    send,
  }
}
```

**packages/shared/src/hooks/useNotifications.ts**:
```typescript
'use client'

import { useState, useCallback } from 'react'
import { create } from 'zustand'
import { Notification, NotificationType } from '../types'

interface NotificationStore {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  markAsRead: (id: string) => void
  clearAll: () => void
}

const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  addNotification: (notification) => set((state) => ({
    notifications: [
      {
        ...notification,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
      },
      ...state.notifications,
    ],
  })),
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id),
  })),
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    ),
  })),
  clearAll: () => set({ notifications: [] }),
}))

export function useNotifications() {
  return useNotificationStore()
}

export function useNotificationActions() {
  const { addNotification, removeNotification, markAsRead, clearAll } = useNotificationStore()

  return {
    success: (title: string, message: string) => {
      addNotification({ title, message, type: NotificationType.SUCCESS })
    },
    error: (title: string, message: string) => {
      addNotification({ title, message, type: NotificationType.ERROR })
    },
    warning: (title: string, message: string) => {
      addNotification({ title, message, type: NotificationType.WARNING })
    },
    info: (title: string, message: string) => {
      addNotification({ title, message, type: NotificationType.INFO })
    },
    remove: removeNotification,
    markRead: markAsRead,
    clear: clearAll,
  }
}
```

**packages/shared/src/hooks/useMonitoring.ts**:
```typescript
'use client'

import { useState, useEffect } from 'react'
import { MonitoringMetrics, Alert } from '../types'

export function useMonitoring(refreshInterval: number = 5000) {
  const [metrics, setMetrics] = useState<MonitoringMetrics>({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: { in: 0, out: 0 },
  })
  const [alerts, setAlerts] = useState<Alert[]>([])

  useEffect(() => {
    // 模拟监控数据更新
    const interval = setInterval(() => {
      setMetrics({
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100,
        network: {
          in: Math.random() * 1000,
          out: Math.random() * 1000,
        },
      })
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval])

  return {
    metrics,
    alerts,
  }
}
```

**packages/shared/src/index.ts**:
```typescript
// Types
export * from './types'

// Hooks
export * from './hooks/useWebSocket'
export * from './hooks/useNotifications'
export * from './hooks/useMonitoring'

// Utils
export * from './utils'
```

---

### 5.4 独立部署策略

#### 5.4.1 Docker 镜像配置

**docker/host.Dockerfile**:
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY apps/host ./apps/host
COPY packages ./packages

WORKDIR /app/apps/host
RUN pnpm build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/apps/host/.next ./.next
COPY --from=builder /app/apps/host/package*.json ./
COPY --from=builder /app/apps/host/node_modules ./node_modules
COPY --from=builder /app/apps/host/public ./public

EXPOSE 3000

CMD ["npm", "start"]
```

**docker/notifications.Dockerfile**:
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY apps/notifications ./apps/notifications
COPY packages ./packages

WORKDIR /app/apps/notifications
RUN pnpm build

FROM nginx:alpine

COPY --from=builder /app/apps/notifications/dist /usr/share/nginx/html

COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

**nginx/default.conf**:
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # 支持 Module Federation
    location / {
        try_files $uri $uri/ /index.html;
        add_header Access-Control-Allow-Origin *;
    }

    # 预加载 remoteEntry.js
    location /assets/remoteEntry.js {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

#### 5.4.2 Nginx 反向代理配置

**nginx/nginx.conf**:
```nginx
upstream host {
    server host:3000;
}

upstream notifications {
    server notifications:80;
}

upstream websocket {
    server websocket:80;
}

upstream monitoring {
    server monitoring:80;
}

server {
    listen 80;
    server_name 7zi.com www.7zi.com;

    # Host 应用
    location / {
        proxy_pass http://host;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Remote 模块
    location /notifications/ {
        proxy_pass http://notifications/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /websocket/ {
        proxy_pass http://websocket/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /monitoring/ {
        proxy_pass http://monitoring/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket 升级
    location /ws/ {
        proxy_pass http://host;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

#### 5.4.3 部署脚本

**scripts/deploy.sh**:
```bash
#!/bin/bash

set -e

# 配置
REGISTRY="registry.7zi.com"
PROJECT="7zi-frontend"
VERSION=${1:-latest}

echo "🚀 开始部署 7zi-Frontend..."

# 构建并推送镜像
echo "📦 构建镜像..."

# Host
docker build -f docker/host.Dockerfile -t $REGISTRY/$PROJECT/host:$VERSION .
docker push $REGISTRY/$PROJECT/host:$VERSION

# Notifications
docker build -f docker/notifications.Dockerfile -t $REGISTRY/$PROJECT/notifications:$VERSION .
docker push $REGISTRY/$PROJECT/notifications:$VERSION

# WebSocket
docker build -f docker/websocket.Dockerfile -t $REGISTRY/$PROJECT/websocket:$VERSION .
docker push $REGISTRY/$PROJECT/websocket:$VERSION

# Monitoring
docker build -f docker/monitoring.Dockerfile -t $REGISTRY/$PROJECT/monitoring:$VERSION .
docker push $REGISTRY/$PROJECT/monitoring:$VERSION

echo "✅ 镜像构建并推送完成"

# 更新部署（假设使用 kubectl 或 docker-compose）
echo "🔄 更新部署..."
# kubectl set image deployment/host host=$REGISTRY/$PROJECT/host:$VERSION
# kubectl set image deployment/notifications notifications=$REGISTRY/$PROJECT/notifications:$VERSION
# kubectl set image deployment/websocket websocket=$REGISTRY/$PROJECT/websocket:$VERSION
# kubectl set image deployment/monitoring monitoring=$REGISTRY/$PROJECT/monitoring:$VERSION

echo "✅ 部署完成！"
```

---

### 5.5 CI/CD 流水线

#### 5.5.1 Host 应用 CI

**.github/workflows/ci-host.yml**:
```yaml
name: CI - Host Application

on:
  push:
    branches: [main, develop]
    paths:
      - 'apps/host/**'
      - 'packages/**'
  pull_request:
    branches: [main]
    paths:
      - 'apps/host/**'
      - 'packages/**'

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build shared
        run: pnpm --filter @7zi/shared build

      - name: Build host
        run: pnpm --filter host build

      - name: Lint
        run: pnpm --filter host lint

      - name: Test
        run: pnpm --filter host test

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: host-build
          path: apps/host/.next
```

#### 5.5.2 Remote 应用 CI

**.github/workflows/ci-remote.yml**:
```yaml
name: CI - Remote Applications

on:
  push:
    branches: [main, develop]
    paths:
      - 'apps/notifications/**'
      - 'apps/websocket/**'
      - 'apps/monitoring/**'
      - 'packages/**'
  pull_request:
    branches: [main]

jobs:
  build-notifications:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @7zi/shared build
      - run: pnpm --filter notifications build
      - run: pnpm --filter notifications test
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: notifications-build
          path: apps/notifications/dist

  build-websocket:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @7zi/shared build
      - run: pnpm --filter websocket build
      - run: pnpm --filter websocket test
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: websocket-build
          path: apps/websocket/dist

  build-monitoring:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @7zi/shared build
      - run: pnpm --filter monitoring build
      - run: pnpm --filter monitoring test
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: monitoring-build
          path: apps/monitoring/dist
```

#### 5.5.3 部署流水线

**.github/workflows/deploy.yml**:
```yaml
name: Deploy

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Login to Docker Registry
        uses: docker/login-action@v2
        with:
          registry: registry.7zi.com
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push images
        run: ./scripts/deploy.sh ${{ github.ref_name }}

      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: 7zi.com
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/7zi-frontend
            docker-compose pull
            docker-compose up -d
            docker system prune -f
```

---

## 6. 风险评估与应对

### 6.1 技术风险

| 风险 | 影响 | 概率 | 应对策略 |
|------|------|------|---------|
| **Module Federation 兼容性问题** | 高 | 中 | 充分测试、保留降级方案 |
| **版本冲突导致运行时错误** | 高 | 中 | 使用 singleton 共享依赖、严格版本管理 |
| **网络延迟影响模块加载** | 中 | 高 | 预加载、缓存策略、SSR 降级 |
| **跨域问题** | 中 | 中 | 配置 CORS、同源部署选项 |
| **构建时间过长** | 低 | 中 | 使用 Turbo、缓存优化 |

### 6.2 运维风险

| 风险 | 影响 | 概率 | 应对策略 |
|------|------|------|---------|
| **多模块部署复杂** | 中 | 高 | 自动化部署、蓝绿发布 |
| **依赖管理困难** | 中 | 中 | Monorepo 工具、版本锁定 |
| **监控和调试困难** | 高 | 中 | 分布式追踪、统一日志 |
| **回滚复杂** | 高 | 低 | 版本化部署、快速回滚脚本 |
| **扩缩容挑战** | 中 | 中 | 容器化、自动扩缩容 |

### 6.3 应对措施

#### 6.3.1 降级策略

**模块加载失败降级**:
```typescript
// apps/host/src/components/ErrorBoundary.tsx
'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  fallback: React.ReactNode
}

interface State {
  hasError: boolean
}

export class ModuleErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Module load error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

// 使用示例
<ModuleErrorBoundary fallback={<div>Module temporarily unavailable</div>}>
  <NotificationsApp />
</ModuleErrorBoundary>
```

#### 6.3.2 版本兼容性检查

```typescript
// apps/host/src/utils/versionCheck.ts
export async function checkModuleCompatibility(
  moduleName: string,
  requiredVersion: string
): Promise<boolean> {
  try {
    const response = await fetch(`/${moduleName}/health`)
    const data = await response.json()
    // 检查版本兼容性
    return isCompatible(data.version, requiredVersion)
  } catch {
    return false
  }
}

function isCompatibility(current: string, required: string): boolean {
  // 简单的语义化版本比较
  const [major] = current.split('.')
  const [reqMajor] = required.split('.')
  return major === reqMajor
}
```

#### 6.3.3 离线降级方案

```typescript
// apps/host/src/hooks/useOfflineMode.ts
export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    isOnline,
    shouldLoadRemote: isOnline,
  }
}
```

---

## 7. 监控与治理

### 7.1 应用性能监控 (APM)

#### 7.1.1 集成 Sentry

**packages/shared/src/monitoring/sentry.ts**:
```typescript
import * as Sentry from '@sentry/react'

export function initSentry(dsn: string, environment: string) {
  Sentry.init({
    dsn,
    environment,
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay(),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeBreadcrumb(breadcrumb) {
      // 过滤敏感数据
      if (breadcrumb.category === 'xhr' && breadcrumb.data?.url) {
        breadcrumb.data.url = breadcrumb.data.url.replace(/token=[^&]+/, 'token=***')
      }
      return breadcrumb
    },
  })
}

export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, { extra: context })
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level)
}
```

#### 7.1.2 性能指标收集

```typescript
// packages/shared/src/monitoring/performance.ts
export function trackModuleLoad(moduleName: string, loadTime: number) {
  // 发送到 APM 系统
  console.log(`Module ${moduleName} loaded in ${loadTime}ms`)

  // 或发送到监控服务
  fetch('/api/metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'module_load',
      module: moduleName,
      loadTime,
      timestamp: Date.now(),
    }),
  })
}

export function trackUserAction(action: string, properties?: Record<string, any>) {
  console.log(`User action: ${action}`, properties)
}
```

### 7.2 日志收集

```typescript
// packages/shared/src/monitoring/logger.ts
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export class Logger {
  private moduleName: string

  constructor(moduleName: string) {
    this.moduleName = moduleName
  }

  private log(level: LogLevel, message: string, data?: any) {
    const entry = {
      level,
      module: this.moduleName,
      message,
      data,
      timestamp: new Date().toISOString(),
    }

    console.log(JSON.stringify(entry))

    // 发送到日志收集服务
    if (level === LogLevel.ERROR) {
      this.sendToRemote(entry)
    }
  }

  private async sendToRemote(entry: any) {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
    } catch (error) {
      console.error('Failed to send logs:', error)
    }
  }

  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data)
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data)
  }

  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data)
  }

  error(message: string, data?: any) {
    this.log(LogLevel.ERROR, message, data)
  }
}

// 使用示例
const logger = new Logger('notifications')
logger.info('Notification added', { id: '123' })
logger.error('Failed to load', { error: 'network timeout' })
```

### 7.3 健康检查端点

```typescript
// apps/notifications/src/health.ts
import { Logger } from '@7zi/shared/monitoring'

const logger = new Logger('notifications')

export async function healthCheck(req: Request) {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    dependencies: {
      '@7zi/shared': await checkDependency('@7zi/shared'),
    },
  }

  if (Object.values(checks.dependencies).some((status) => status !== 'ok')) {
    checks.status = 'degraded'
    logger.warn('Health check degraded', checks)
  }

  return Response.json(checks, {
    status: checks.status === 'ok' ? 200 : 503,
  })
}

async function checkDependency(name: string): Promise<'ok' | 'error'> {
  try {
    // 简单检查依赖是否可用
    return 'ok'
  } catch {
    return 'error'
  }
}
```

### 7.4 告警规则

```yaml
# prometheus/alerts.yml
groups:
  - name: microfrontend
    interval: 30s
    rules:
      - alert: ModuleLoadFailure
        expr: module_load_errors_total > 5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High module load error rate"

      - alert: ModuleLoadLatency
        expr: module_load_duration_seconds > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Module load taking too long"

      - alert: DependencyVersionMismatch
        expr: dependency_version_mismatch == 1
        for: 1m
        labels:
          severity: high
        annotations:
          summary: "Dependency version mismatch detected"
```

---

## 8. 最佳实践

### 8.1 开发最佳实践

✅ **模块独立开发**
- 每个 Remote 模块应能独立运行和测试
- 使用 Storybook 进行组件隔离开发

✅ **共享依赖管理**
- 明确哪些依赖需要共享，哪些可以独立
- 使用 workspace 协议确保版本一致性

✅ **错误边界**
- 每个 Remote 模块外层包装错误边界
- 提供友好的降级 UI

✅ **类型安全**
- 共享类型定义在 @7zi/shared 包中
- 避免使用 any，充分利用 TypeScript

### 8.2 性能优化最佳实践

✅ **预加载策略**
```typescript
// apps/host/src/app/page.tsx
useEffect(() => {
  // 预加载高频使用的模块
  import('notifications/NotificationApp')
  import('websocket/WebSocketApp')
}, [])
```

✅ **代码分割**
- 使用 dynamic import 按需加载模块
- 配置 chunk 分割策略

✅ **缓存策略**
- 静态资源使用长期缓存
- remoteEntry.js 使用不可变缓存

### 8.3 团队协作最佳实践

✅ **代码审查**
- 跨模块变更需要相关模块团队审查
- 共享模块变更需要所有团队知情

✅ **版本发布**
- 遵循语义化版本规范
- Breaking changes 需要提前通知

✅ **文档维护**
- 每个模块维护自己的 README
- 及时更新接口变更文档

---

## 9. 迁移检查清单

### 9.1 迁移前准备

- [ ] 团队培训 Module Federation 概念
- [ ] 准备开发环境（多端口、HMR 配置）
- [ ] 设计模块边界和接口
- [ ] 准备共享依赖清单
- [ ] 制定回滚计划

### 9.2 迁移过程

- [ ] 创建 Monorepo 结构
- [ ] 配置 Module Federation
- [ ] 提取共享模块
- [ ] 逐个迁移 Remote 模块
- [ ] 集成测试
- [ ] 性能测试
- [ ] 用户验收测试

### 9.3 迁移后优化

- [ ] 配置监控和告警
- [ ] 优化加载性能
- [ ] 文档完善
- [ ] 团队培训
- [ ] 建立维护流程

---

## 10. 常见问题 FAQ

### Q1: Module Federation 是否支持 SSR？

**A**: 支持，但需要额外配置。推荐在 Client 组件中使用动态导入，避免 SSR 复杂性。

### Q2: 如何处理模块间的状态共享？

**A**: 推荐使用 Zustand 或 Context API。状态管理逻辑放在 @7zi/shared 包中，各模块通过状态管理器通信。

### Q3: 如何保证模块加载的可靠性？

**A**:
1. 实现错误边界和降级 UI
2. 配置重试机制
3. 提供离线模式
4. 监控加载失败率

### Q4: 如何处理不同模块的样式冲突？

**A**:
1. 使用 CSS Modules 或 CSS-in-JS
2. 采用 BEM 命名规范
3. 预设统一的设计系统
4. 定期审查全局样式

### Q5: 模块加载失败后如何降级？

**A**:
```typescript
const NotificationsApp = dynamic(
  () => import('notifications/NotificationApp').catch(() => {
    console.error('Failed to load notifications module')
    return import('@/components/FallbackNotifications')
  }),
  {
    loading: () => <Skeleton />,
  }
)
```

---

## 附录

### A. 参考资源

- [Module Federation 文档](https://module-federation.io/)
- [Webpack Module Federation Plugin](https://webpack.js.org/concepts/module-federation/)
- [Vite Plugin Federation](https://github.com/originjs/vite-plugin-federation)
- [Micro Frontends Best Practices](https://martinfowler.com/articles/micro-frontends.html)

### B. 工具推荐

- **构建工具**: Turbo, Nx
- **包管理**: pnpm, Yarn Workspaces
- **测试**: Vitest, Playwright, Testing Library
- **监控**: Sentry, New Relic, Datadog
- **部署**: Docker, Kubernetes, GitHub Actions

### C. 联系方式

如有问题或建议，请联系架构团队：

- **Email**: arch@7zi.com
- **Slack**: #7zi-architecture
- **GitHub**: https://github.com/7zi/7zi-frontend/issues

---

**文档维护**: 本文档应随着架构演进定期更新
**最后更新**: 2026-03-28
**维护者**: AI架构师
