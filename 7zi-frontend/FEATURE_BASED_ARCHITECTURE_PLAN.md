# Feature-Based 架构改进方案

**项目**: 7zi-frontend  
**日期**: 2026-03-28  
**架构师**: 🏗️ AI架构师

---

## 📋 目录

1. [当前结构分析](#1-当前结构分析)
2. [问题总结](#2-问题总结)
3. [Feature-Based 架构设计](#3-feature-based-架构设计)
4. [渐进式迁移计划](#4-渐进式迁移计划)
5. [高耦合组件识别](#5-高耦合组件识别)
6. [实施风险与缓解](#6-实施风险与缓解)
7. [验收标准](#7-验收标准)

---

## 1. 当前结构分析

### 1.1 现有目录结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── auth/
│   │   ├── mcp/
│   │   ├── notifications/
│   │   ├── projects/
│   │   └── users/
│   ├── notification-demo/
│   ├── websocket-status-demo/
│   └── monitoring-example/
│
├── components/            # 组件层 (碎片化)
│   ├── notifications/     # 通知组件 (相对集中)
│   ├── websocket/         # WebSocket组件
│   ├── PerformanceDashboard.tsx
│   ├── SimplePerformanceDashboard.tsx
│   └── websocket-stability-demo.tsx
│
├── hooks/                 # 自定义 Hooks
│   ├── useDebounce.ts
│   ├── useNotifications.ts
│   ├── useNotificationsStable.ts
│   └── useWebSocketStatus.ts
│
├── lib/                   # 业务逻辑层 (过重)
│   ├── api/               # API 相关
│   ├── audit/             # 审计日志
│   ├── db/                # 数据库
│   ├── mcp/                # MCP 服务器
│   ├── monitoring/         # 监控
│   ├── rate-limit/         # 限流
│   ├── services/           # 服务层
│   ├── auth.ts
│   ├── logger.ts
│   ├── permissions.ts
│   ├── socket.ts
│   ├── validation.ts
│   ├── validation-schemas.ts
│   ├── notification-init.ts
│   └── websocket-manager.ts
│
└── middleware.ts           # 中间件
```

### 1.2 文件统计

| 类别           | 数量 | 问题               |
| -------------- | ---- | ------------------ |
| 组件 (.tsx)    | ~10  | 部分职责重叠       |
| 业务逻辑 (.ts) | 35+  | 碎片化,耦合严重    |
| Hooks (.ts)    | 5    | 相对健康           |
| API Routes     | 15+  | 分散在 app/api/ 下 |

---

## 2. 问题总结

### 2.1 对比 ARCHITECTURE_REVIEW_20260328.md 提到的问题

| 问题                 | 严重程度  | 当前状态                           |
| -------------------- | --------- | ---------------------------------- |
| **组件结构碎片化**   | ⚠️ 中     | components/ 有 3 个子目录,其他散落 |
| **lib/ 层职责过重**  | 🔴 高     | 35+ 模块,功能交叉                  |
| **缺少 DDD**         | ⚠️ 中     | 纯技术分层,无业务边界              |
| **状态管理不一致**   | ✅ 已解决 | stores/ 和 contexts/ 不存在        |
| **Next.js 配置复杂** | ⚠️ 中     | 需单独评估                         |

### 2.2 核心问题

1. **lib/ 层耦合严重**
   - `websocket-manager.ts` 依赖 `logger.ts`
   - `permissions.ts` 依赖 `auth.ts`
   - `notification-init.ts` 依赖 `services/notification.ts`
   - 循环依赖风险高

2. **组件定位困难**
   - `PerformanceDashboard.tsx` 和 `SimplePerformanceDashboard.tsx` 在根目录
   - `websocket-stability-demo.tsx` 在根目录
   - Demo 页面与业务组件混在一起

3. **缺乏业务边界**
   - 所有业务逻辑都在 `lib/`
   - 无法按业务领域切割代码

---

## 3. Feature-Based 架构设计

### 3.1 目标结构

```
src/
├── app/                              # Next.js App Router (不变)
│
├── features/                         # ✨ Feature-based 目录
│   ├── auth/                         # 认证功能
│   │   ├── components/               # Auth 组件
│   │   │   ├── LoginForm.tsx
│   │   │   └── ...
│   │   ├── hooks/                    # Auth Hooks
│   │   │   └── useAuth.ts
│   │   ├── lib/                      # Auth 业务逻辑
│   │   │   ├── auth.ts
│   │   │   └── permissions.ts
│   │   ├── api/                      # Auth API 路由
│   │   │   └── route.ts
│   │   └── types.ts                  # Auth 类型定义
│   │
│   ├── notifications/                # 通知功能
│   │   ├── components/
│   │   │   ├── NotificationProvider.tsx
│   │   │   ├── NotificationCenter.tsx
│   │   │   ├── NotificationToast.tsx
│   │   │   └── NotificationToaster.tsx
│   │   ├── hooks/
│   │   │   ├── useNotifications.ts
│   │   │   └── useNotificationsStable.ts
│   │   ├── lib/
│   │   │   ├── notification.ts
│   │   │   ├── notification-enhanced.ts
│   │   │   ├── notification-storage.ts
│   │   │   └── email.ts
│   │   ├── api/
│   │   │   ├── route.ts
│   │   │   ├── [id]/route.ts
│   │   │   ├── preferences/[userId]/route.ts
│   │   │   ├── stats/route.ts
│   │   │   ├── enhanced/route.ts
│   │   │   └── socket/route.ts
│   │   ├── types.ts
│   │   └── index.ts                  # 公共导出
│   │
│   ├── websocket/                    # WebSocket 功能
│   │   ├── components/
│   │   │   └── WebSocketStatusPanel.tsx
│   │   ├── hooks/
│   │   │   └── useWebSocketStatus.ts
│   │   ├── lib/
│   │   │   ├── websocket-manager.ts
│   │   │   └── socket.ts
│   │   ├── api/
│   │   │   └── route.ts
│   │   └── types.ts
│   │
│   ├── monitoring/                   # 监控功能
│   │   ├── components/
│   │   │   ├── PerformanceDashboard.tsx
│   │   │   └── SimplePerformanceDashboard.tsx
│   │   ├── hooks/
│   │   │   └── useMonitoring.ts
│   │   ├── lib/
│   │   │   ├── monitor.ts
│   │   │   ├── storage.ts
│   │   │   ├── config.ts
│   │   │   └── utils.ts
│   │   ├── api/
│   │   │   └── route.ts
│   │   └── types.ts
│   │
│   ├── mcp/                          # MCP 功能
│   │   ├── lib/
│   │   │   ├── server.ts
│   │   │   └── types.ts
│   │   └── api/
│   │       └── rpc/route.ts
│   │
│   ├── rate-limit/                   # 限流功能
│   │   ├── lib/
│   │   │   ├── limiter.ts
│   │   │   ├── storage.ts
│   │   │   ├── memory-storage.ts
│   │   │   ├── redis-storage.ts
│   │   │   └── config.ts
│   │   └── api/
│   │       └── route.ts
│   │
│   └── audit/                        # 审计功能
│       ├── lib/
│       │   ├── logger.ts
│       │   └── types.ts
│       └── api/
│           └── route.ts
│
├── shared/                           # ✨ 共享目录
│   ├── components/                   # 通用 UI 组件
│   │   ├── ui/                       # 基础 UI (Button, Input 等)
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── ...
│   │   └── layout/                   # 布局组件
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── ...
│   │
│   ├── hooks/                        # 通用 Hooks
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   └── ...
│   │
│   ├── lib/                          # 通用工具
│   │   ├── logger.ts
│   │   ├── validation.ts
│   │   ├── validation-schemas.ts
│   │   └── ...
│   │
│   ├── db/                           # 数据库
│   │   └── storage.ts
│   │
│   └── types/                        # 全局类型
│       └── index.ts
│
├── contexts/                         # React Context (如果需要)
│   └── (migrated from components/notifications)
│
└── middleware.ts                      # 中间件 (保持)
```

### 3.2 核心原则

1. **Feature First**: 每个业务功能是独立的 feature 目录
2. **Self-Contained**: feature 目录内包含组件、hooks、lib、api
3. **Shared is Explicit**: 共享代码必须放在 `shared/`
4. **No Circular Dependencies**: feature 之间不能相互依赖
5. **Monolithic lib/ Forbidden**: 禁止在根 lib/ 目录放业务代码

### 3.3 依赖规则

```
┌─────────────┐
│    app/     │  ← Page Routes
└──────┬──────┘
       │ imports
       ▼
┌──────────────────────────────────────┐
│           features/                  │
│  ┌─────────┐  ┌─────────┐  ┌──────┐ │
│  │   auth  │  │notifica │  │  mcp │ │
│  │         │  │  tions  │  │      │ │
│  └────┬────┘  └────┬────┘  └──┬───┘ │
│       │            │          │     │
└───────┼────────────┼──────────┼─────┘
        │            │          │
        ▼            ▼          ▼
┌──────────────────────────────────────┐
│            shared/                   │
│  (components, hooks, lib, db, types) │
└──────────────────────────────────────┘
```

**规则**:

- `app/` → `features/` → `shared/`
- `features/` → `shared/` (feature 之间不能直接依赖)
- `features/` 之间通信通过 `shared/` 事件总线或 API

---

## 4. 渐进式迁移计划

### 4.1 Phase 1: 准备阶段 (1-2 天)

**目标**: 建立基础设施,不影响现有功能

```bash
# 1. 创建目录结构
mkdir -p src/features/{auth,notifications,websocket,monitoring,mcp,rate-limit,audit}
mkdir -p src/shared/{components/ui,components/layout,hooks,lib,db,types}

# 2. 创建 index.ts 导出模式
# 每个 feature 有 index.ts 导出公共 API
```

**任务**:

- [ ] 创建 `shared/lib/logger.ts` 移动 `lib/logger.ts`
- [ ] 创建 `shared/lib/validation.ts` 移动 `lib/validation.ts`
- [ ] 创建 `shared/db/storage.ts` 移动 `lib/db/storage.ts`
- [ ] 创建 `shared/types/index.ts` 收集全局类型

### 4.2 Phase 2: Notifications Feature 迁移 (2-3 天)

**目标**: 将通知相关代码迁移到 `features/notifications/`

**迁移清单**:

- [ ] `src/components/notifications/` → `src/features/notifications/components/`
- [ ] `src/hooks/useNotifications.ts` → `src/features/notifications/hooks/`
- [ ] `src/hooks/useNotificationsStable.ts` → `src/features/notifications/hooks/`
- [ ] `src/lib/services/notification*.ts` → `src/features/notifications/lib/`
- [ ] `src/lib/notification-init.ts` → `src/features/notifications/lib/`
- [ ] `src/app/api/notifications/` → `src/features/notifications/api/`
- [ ] 更新 `app/notification-demo/` 引用路径

**验证**:

```bash
# 运行测试
npm test -- --run features/notifications

# 检查构建
npm run build
```

### 4.3 Phase 3: WebSocket Feature 迁移 (1-2 天)

**迁移清单**:

- [ ] `src/components/websocket/` → `src/features/websocket/components/`
- [ ] `src/hooks/useWebSocketStatus.ts` → `src/features/websocket/hooks/`
- [ ] `src/lib/websocket-manager.ts` → `src/features/websocket/lib/`
- [ ] `src/lib/socket.ts` → `src/features/websocket/lib/`
- [ ] `src/app/websocket-status-demo/` → `src/features/websocket/`
- [ ] 更新 `components/websocket-stability-demo.tsx` 引用

### 4.4 Phase 4: Auth Feature 迁移 (1-2 天)

**迁移清单**:

- [ ] `src/lib/auth.ts` → `src/features/auth/lib/`
- [ ] `src/lib/permissions.ts` → `src/features/auth/lib/`
- [ ] `src/app/api/auth/` → `src/features/auth/api/`
- [ ] 创建 `src/features/auth/hooks/useAuth.ts`

### 4.5 Phase 5: 其他 Features (2-3 天)

**Monitoring**:

- [ ] `src/lib/monitoring/` → `src/features/monitoring/lib/`
- [ ] `src/components/PerformanceDashboard.tsx` → `src/features/monitoring/components/`
- [ ] `src/components/SimplePerformanceDashboard.tsx` → `src/features/monitoring/components/`
- [ ] `src/app/monitoring-example/` → `src/features/monitoring/`

**Rate-Limit**:

- [ ] `src/lib/rate-limit/` → `src/features/rate-limit/lib/`
- [ ] `src/middleware.ts` 中引用更新

**MCP**:

- [ ] `src/lib/mcp/` → `src/features/mcp/lib/`
- [ ] `src/app/api/mcp/` → `src/features/mcp/api/`

**Audit**:

- [ ] `src/lib/audit/` → `src/features/audit/lib/`

### 4.6 Phase 6: 清理 (1 天)

**任务**:

- [ ] 删除空的 `src/lib/` 目录
- [ ] 删除空的 `src/components/` 目录
- [ ] 更新所有路径别名配置 (`tsconfig.json`)
- [ ] 更新 `next.config.ts` 外部包配置
- [ ] 运行完整测试套件
- [ ] 更新 `README.md` 和架构文档

### 4.7 时间线总览

```
Week 1: Phase 1-2 (Notifications)
Week 2: Phase 3-4 (WebSocket + Auth)
Week 3: Phase 5 (其他 Features)
Week 4: Phase 6 (清理 + 文档)

总计: ~4 周
```

---

## 5. 高耦合组件识别

### 5.1 高耦合分析

| 组件/模块                  | 依赖数量 | 耦合类型                          | 优先级 |
| -------------------------- | -------- | --------------------------------- | ------ |
| `websocket-manager.ts`     | 3        | 依赖 logger, auth                 | 🔴 高  |
| `permissions.ts`           | 2        | 依赖 auth                         | 🔴 高  |
| `notification-init.ts`     | 4        | 依赖 notification, email, storage | 🔴 高  |
| `middleware.ts`            | 5        | 依赖多个 lib 模块                 | 🔴 高  |
| `auth.ts`                  | 2        | 依赖 User 类型                    | 🟡 中  |
| `services/notification.ts` | 3        | 依赖 storage, email               | 🟡 中  |

### 5.2 优先处理的高耦合组件

#### 🔴 Priority 1: `middleware.ts`

```typescript
// 当前问题: 直接依赖多个 lib 模块
import { RateLimiter } from '../lib/rate-limit/limiter'
import { MemoryRateLimitStorage } from '../lib/rate-limit/memory-storage'
import { RedisRateLimitStorage } from '../lib/rate-limit/redis-storage'
import { getRateLimitForPath, RateLimitConfig } from '../lib/rate-limit/config'

// 建议: 创建 shared/lib/rate-limit/index.ts 统一导出
```

#### 🔴 Priority 2: `websocket-manager.ts`

```typescript
// 当前问题: 依赖 logger
import { logger } from '@/lib/logger'

// 建议: 通过依赖注入或 shared/lib/logger
```

#### 🔴 Priority 3: `notification-init.ts`

```typescript
// 当前问题: 依赖多个服务
import { notificationService } from '../services/notification'
import { emailService } from '../services/email'
import { notificationStorage } from '../services/notification-storage'

// 建议: 迁移到 features/notifications/lib/ 后内部依赖
```

### 5.3 耦合解决方案

**方案 1: 依赖注入**

```typescript
// shared/lib/logger.ts
export interface Logger {
  info(msg: string): void
  error(msg: string, error?: Error): void
}

export class ConsoleLogger implements Logger {
  info(msg: string) {
    console.log(msg)
  }
  error(msg: string, error?: Error) {
    console.error(msg, error)
  }
}

export const logger = new ConsoleLogger()
```

**方案 2: 共享类型提取**

```typescript
// shared/types/index.ts
export interface User {
  id: string
  email: string
  role: UserRole
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}
```

---

## 6. 实施风险与缓解

### 6.1 风险矩阵

| 风险         | 影响 | 可能性 | 缓解措施                |
| ------------ | ---- | ------ | ----------------------- |
| 路径引用断裂 | 高   | 中     | 使用路径别名 + IDE 重构 |
| 循环依赖     | 高   | 低     | 依赖分析工具检查        |
| 测试失败     | 中   | 中     | 增量测试,每阶段验证     |
| 构建失败     | 高   | 低     | 分阶段构建验证          |
| 团队不熟悉   | 中   | 高     | 文档 + 内部培训         |

### 6.2 缓解措施

1. **路径别名保护**

   ```typescript
   // tsconfig.json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/features/*": ["src/features/*"],
         "@/shared/*": ["src/shared/*"]
       }
     }
   }
   ```

2. **依赖检查自动化**

   ```bash
   # 安装 madge
   npm install -D madge

   # 定期检查循环依赖
   npx madge --circular src/ --extensions ts,tsx
   ```

3. **渐进式合并**
   - 每次只迁移一个 feature
   - 迁移后立即运行测试
   - 确认无误后再进行下一个

### 6.3 回滚计划

如果迁移出现问题:

1. 使用 Git 分支管理
2. 每个 Phase 独立分支
3. 问题 feature 可独立回滚

---

## 7. 验收标准

### 7.1 架构指标

| 指标           | 目标      | 测量方法                         |
| -------------- | --------- | -------------------------------- |
| lib/ 目录大小  | < 10 文件 | `find src/lib -type f \| wc -l`  |
| feature 内聚性 | > 80%     | 手动审查                         |
| 循环依赖       | 0         | `madge --circular`               |
| 路径别名使用   | 100%      | `grep -r "@/features\|@/shared"` |

### 7.2 功能验收

- [ ] 所有测试通过 (`npm test -- --run`)
- [ ] 构建成功 (`npm run build`)
- [ ] 通知功能正常
- [ ] WebSocket 连接正常
- [ ] API 路由响应正常
- [ ] 中间件限流正常

### 7.3 文档验收

- [ ] 更新 `ARCHITECTURE_REVIEW.md`
- [ ] 创建 `docs/FEATURE_BASED_ARCHITECTURE.md`
- [ ] 更新 `README.md` 目录结构
- [ ] 建立 ADR (Architecture Decision Records)

---

## 📝 总结

Feature-Based 架构将带来:

**收益**:

- ✅ 业务边界清晰
- ✅ 代码定位容易
- ✅ 团队协作简化
- ✅ 利于微前端拆分
- ✅ 测试更容易隔离

**成本**:

- ⚠️ 迁移需要 ~4 周
- ⚠️ 需要团队适应新结构
- ⚠️ 暂时降低开发速度

**建议**: 采用渐进式迁移,优先处理高耦合组件,确保每个阶段稳定后再继续。

---

**架构师**: 🏗️ AI架构师  
**审核状态**: 待审核  
**下次审查**: 迁移 Phase 2 完成后
