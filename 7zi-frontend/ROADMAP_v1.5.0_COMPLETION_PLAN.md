# v1.5.0 功能完成路线图

**创建日期:** 2026-03-30
**创建者:** 🌟 智能体世界专家
**当前完成度:** 45%
**目标完成度:** 100%
**预计完成时间:** 2026-04-03 (3-4 天)

---

## 📊 执行摘要

### 当前状态

v1.5.0 专注于 **AI Agent 调度系统增强** + **技术债务清理**。目前核心基础设施已完成，但仍有关键功能需要完善。

| 模块 | 完成度 | 状态 | 阻塞 |
|------|--------|------|------|
| **auth.middleware 模块** | 100% | ✅ 完成 | 无 |
| **lib/ 层结构分析** | 100% | ✅ 完成 | 无 |
| **API 错误处理标准化** | 61% | 🟡 进行中 | 无 |
| **中间件统一** | 40% | 🟡 部分完成 | 无 |
| **Agent Dashboard UI** | 60% | 🟡 部分完成 | 无 |
| **WebSocket 房间系统 UI** | 0% | ❌ 未开始 | 依赖 v1.4.0 |
| **PermissionContext → Zustand 迁移** | 0% | ❌ 未开始 | 无 |
| **配置管理优化** | 0% | ❌ 未开始 | 无 |

### 关键差距

1. **API 一致性问题**: 7/18 路由未迁移到标准错误处理
2. **中间件重叠**: 两套认证中间件并存，需要统一
3. **Agent Dashboard UI**: 部分组件待完善
4. **状态管理迁移**: PermissionContext 需迁移至 Zustand

---

## 🎯 核心目标

### P0 - 必须完成 (阻塞发布)

1. ✅ **API 错误处理标准化** - 确保所有 API 响应格式一致
2. ✅ **中间件统一** - 消除重复代码，统一认证逻辑
3. ⚠️ **PermissionContext → Zustand 迁移** - 简化状态管理

### P1 - 建议完成 (提升质量)

4. **配置管理优化** - 统一 Feature Flags 管理
5. **Agent Dashboard UI 完善** - 补充缺失功能
6. **文档完善** - 补充 API 文档和迁移指南

### P2 - 可选完成 (锦上添花)

7. **WebSocket 房间系统 UI** - 可视化房间管理
8. **性能监控告警** - 邮件/Slack 告警渠道

---

## 📋 详细任务清单

### P0-1: API 错误处理标准化

**优先级:** P0 (高)
**负责人:** ⚡ Executor
**预计工时:** 1.5 小时
**依赖:** 无

#### 任务详情

迁移剩余 7 个 API 路由到标准错误处理器 (`src/lib/api/error-handler.ts`)

| 文件路径 | 状态 | 工时 |
|---------|------|------|
| `src/app/api/feedback/route.ts` | ❌ 未迁移 | 30min |
| `src/app/api/feedback/stats/route.ts` | ❌ 未迁移 | 15min |
| `src/app/api/feedback/response/route.ts` | ❌ 未迁移 | 15min |
| `src/app/api/feedback/export/route.ts` | ❌ 未迁移 | 15min |
| `src/app/api/search/route.ts` | ❌ 未迁移 | 15min |
| `src/app/api/data/import/route.ts` | ❌ 未迁移 | 15min |

#### 实施步骤

1. **替换错误响应格式**
   ```typescript
   // ❌ 旧格式
   return NextResponse.json(
     { success: false, error: 'Not Found', message: '反馈不存在' },
     { status: 404 }
   );

   // ✅ 新格式
   return createErrorResponse(
     'NOT_FOUND',
     '反馈不存在',
     404
   );
   ```

2. **替换日志记录**
   ```typescript
   // ❌ 旧格式
   console.error('[Feedback API] GET error:', error);

   // ✅ 新格式
   logger.error('Feedback API error', { error, method: 'GET' });
   ```

3. **添加时间戳**
   - 所有响应自动包含 `timestamp` 字段

#### 验收标准

- [ ] 所有 API 响应使用 `error-handler.ts` 函数
- [ ] 错误类型使用 `ErrorType` enum
- [ ] 所有响应包含 `timestamp`
- [ ] TypeScript 编译无错误
- [ ] 现有测试通过

---

### P0-2: 中间件统一

**优先级:** P0 (高)
**负责人:** ⚡ Executor
**预计工时:** 1 小时
**依赖:** P0-1

#### 任务详情

统一使用 `src/lib/auth/api-auth.ts`，弃用 `src/middleware/auth.middleware.ts`

**当前使用情况:**
| 中间件 | 使用路由 | 行数 |
|--------|---------|------|
| `api-auth.ts` | notifications/*, a2a/*, projects, users, feedback | ~150 行 |
| `auth.middleware.ts` | search, data/import | ~80 行 |

#### 实施步骤

1. **迁移路由**
   - 将 `search/route.ts` 从 `authMiddleware` 改为 `withAuth`
   - 将 `data/import/route.ts` 从 `authMiddleware` 改为 `withAuth`

2. **弃用旧中间件**
   ```typescript
   // 在 auth.middleware.ts 顶部添加
   /**
    * @deprecated 使用 src/lib/auth/api-auth.ts 代替
    */
   ```

3. **更新导入路径**
   ```typescript
   // ❌ 旧导入
   import { authMiddleware } from '@/middleware/auth.middleware';

   // ✅ 新导入
   import { withAuth } from '@/lib/auth/api-auth';
   ```

#### 验收标准

- [ ] search 和 data/import 使用 `withAuth`
- [ ] `auth.middleware.ts` 标记为 deprecated
- [ ] 所有认证逻辑通过 `api-auth.ts`
- [ ] 认证测试全部通过
- [ ] TypeScript 编译无错误

---

### P0-3: PermissionContext → Zustand 迁移

**优先级:** P0 (高)
**负责人:** 🏗️ 架构师 + ⚡ Executor
**预计工时:** 4 小时
**依赖:** P0-2

#### 任务详情

将权限状态从 React Context 迁移至 Zustand，简化状态管理

#### 当前状态

**PermissionContext 使用情况:**
- `src/components/PermissionProvider.tsx`
- 使用钩子: `usePermissions()`
- 状态: userRoles, permissions, loading, error

#### 实施步骤

1. **创建 Zustand Store**
   ```typescript
   // src/stores/permission-store.ts
   import { create } from 'zustand';
   import { subscribeWithSelector } from 'zustand/middleware';

   interface PermissionState {
     userRoles: string[];
     permissions: Set<string>;
     loading: boolean;
     error: Error | null;

     // Actions
     setUserRoles: (roles: string[]) => void;
     addPermission: (permission: string) => void;
     removePermission: (permission: string) => void;
     hasPermission: (permission: string) => boolean;
     hasRole: (role: string) => boolean;
   }

   export const usePermissionStore = create<PermissionState>()(
     subscribeWithSelector((set, get) => ({
       userRoles: [],
       permissions: new Set(),
       loading: false,
       error: null,

       setUserRoles: (roles) => set({ userRoles: roles }),
       addPermission: (permission) => set((state) => ({
         permissions: new Set(state.permissions).add(permission),
       })),
       removePermission: (permission) => set((state) => {
         const newPermissions = new Set(state.permissions);
         newPermissions.delete(permission);
         return { permissions: newPermissions };
       }),
       hasPermission: (permission) => get().permissions.has(permission),
       hasRole: (role) => get().userRoles.includes(role),
     }))
   );
   ```

2. **迁移组件**
   - 替换 `usePermissions()` 为 `usePermissionStore()`
   - 更新权限检查逻辑
   - 移除 PermissionProvider 包装

3. **更新布局**
   ```typescript
   // app/layout.tsx
   // ❌ 移除
   // <PermissionProvider>
   //   {children}
   // </PermissionProvider>

   // ✅ 使用 Zustand，无需 Provider
   ```

#### 迁移清单

| 组件/文件 | 当前实现 | 目标实现 | 工时 |
|----------|---------|---------|------|
| `app/layout.tsx` | PermissionProvider | 移除 Provider | 30min |
| `app/api/.../route.ts` | 权限检查 | Zustand | 1h |
| `src/components/*` | usePermissions() | usePermissionStore() | 1.5h |
| 测试更新 | Context 测试 | Store 测试 | 1h |

#### 验收标准

- [ ] PermissionContext 完全移除
- [ ] 所有权限检查使用 Zustand
- [ ] 40+ 组件更新完成
- [ ] 所有测试通过
- [ ] 性能无明显下降

---

### P1-1: 配置管理优化

**优先级:** P1 (中)
**负责人:** 🏗️ 架构师
**预计工时:** 1.5 小时
**依赖:** 无

#### 任务详情

创建统一的 Feature Flags 配置文件，消除分散的环境变量

#### 实施步骤

1. **创建配置文件**
   ```typescript
   // src/lib/config/features.ts
   export const features = {
     // MCP (Model Context Protocol)
     enableMCP: process.env.ENABLE_MCP === 'true',

     // Notifications
     enableNotifications: process.env.DISABLE_NOTIFICATIONS !== 'true',
     enableEmailNotifications: process.env.ENABLE_EMAIL === 'true',
     enablePushNotifications: process.env.ENABLE_PUSH === 'true',

     // Rate Limiting
     enableRateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
     rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15min
     rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),

     // Monitoring
     enablePerformanceMonitoring: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
     enableErrorTracking: process.env.ENABLE_ERROR_TRACKING === 'true',

     // AI Agent
     enableAgentScheduler: process.env.ENABLE_AGENT_SCHEDULER !== 'false',
     enableAgentDashboard: process.env.ENABLE_AGENT_DASHBOARD === 'true',

     // WebSocket
     enableWebSocket: process.env.ENABLE_WEBSOCKET !== 'false',
     enableWebSocketRooms: process.env.ENABLE_WEBSOCKET_ROOMS === 'true',

     // Security
     enableCSRF: process.env.ENABLE_CSRF !== 'false',
     enableTwoFactorAuth: process.env.ENABLE_2FA === 'true',

     // Development
     enableDebugMode: process.env.NODE_ENV === 'development',
     enableDevTools: process.env.ENABLE_DEV_TOOLS === 'true',
   } as const;

   export type FeatureName = keyof typeof features;

   export function isFeatureEnabled(feature: FeatureName): boolean {
     return features[feature];
   }

   export function getFeatures(): Record<string, boolean> {
     return Object.fromEntries(
       Object.entries(features).map(([key, value]) => [key, !!value])
     );
   }
   ```

2. **创建环境变量验证**
   ```typescript
   // src/lib/config/env-validation.ts
   import { z } from 'zod';

   const envSchema = z.object({
     // Required
     DATABASE_URL: z.string().url(),
     JWT_SECRET: z.string().min(32),

     // Optional
     ENABLE_MCP: z.string().optional(),
     DISABLE_NOTIFICATIONS: z.string().optional(),
     ENABLE_RATE_LIMIT: z.string().optional(),
     // ... 其他环境变量
   });

   export const validateEnv = () => {
     try {
       envSchema.parse(process.env);
       return { success: true, errors: null };
     } catch (error) {
       if (error instanceof z.ZodError) {
         return { success: false, errors: error.errors };
       }
       throw error;
     }
   };
   ```

3. **更新 .env.example**
   - 添加完整的环境变量列表
   - 添加注释说明每个变量的用途

#### 验收标准

- [ ] 统一的 features 配置文件
- [ ] 环境变量验证机制
- [ ] 更新的 .env.example
- [ ] TypeScript 类型安全
- [ ] 启动时验证环境变量

---

### P1-2: Agent Dashboard UI 完善

**优先级:** P1 (中)
**负责人:** 🎨 设计师 + 🧪 测试员
**预计工时:** 3 小时
**依赖:** P0-3

#### 任务详情

完善 Agent Dashboard UI 组件，补充缺失功能

#### 当前状态

已完成组件 (来自 v1.4.0):
- ✅ AgentStatusPanel - 显示所有 Agent 状态
- ✅ TaskQueueView - 任务队列可视化
- ✅ ScheduleHistory - 调度历史记录
- ✅ ManualOverride - 手动任务控制

待完善功能:
- ⚠️ 实时状态更新
- ⚠️ 任务详情弹窗
- ⚠️ 批量操作
- ⚠️ 导出功能
- ⚠️ 响应式优化

#### 实施步骤

1. **实时状态优化**
   - 优化 WebSocket 事件监听
   - 添加状态变更动画
   - 添加连接状态指示器

2. **任务详情弹窗**
   - 创建 TaskDetailModal 组件
   - 显示任务完整信息
   - 显示执行日志

3. **批量操作**
   - 批量取消任务
   - 批量重新分配
   - 批量暂停/恢复

4. **导出功能**
   - 导出调度历史 (CSV/JSON)
   - 导出任务统计报告

5. **响应式优化**
   - 适配移动端布局
   - 优化触摸交互

#### 工作量分解

| 任务 | 工时 | 优先级 |
|------|------|--------|
| 实时状态优化 | 45min | 高 |
| TaskDetailModal | 1h | 高 |
| 批量操作 | 45min | 中 |
| 导出功能 | 30min | 低 |
| 响应式优化 | 30min | 中 |

#### 验收标准

- [ ] 实时状态更新流畅
- [ ] 任务详情弹窗完整
- [ ] 批量操作可用
- [ ] 导出功能正常
- [ ] 移动端体验良好
- [ ] 所有测试通过

---

### P1-3: 文档完善

**优先级:** P1 (中)
**负责人:** 📚 咨询师
**预计工时:** 2 小时
**依赖:** 所有 P0 任务

#### 任务详情

补充完善 v1.5.0 相关文档

#### 文档清单

| 文档 | 状态 | 工时 |
|------|------|------|
| `docs/API.md` 更新 | ⚠️ 需更新 | 45min |
| `docs/AUTHENTICATION.md` (新) | ❌ 未创建 | 30min |
| `docs/MIGRATION_GUIDE_v1.5.0.md` (新) | ❌ 未创建 | 30min |
| `CHANGELOG.md` v1.5.0 更新 | ⚠️ 需更新 | 15min |

#### 实施步骤

1. **更新 API.md**
   - 添加新增的 API 端点
   - 添加错误响应格式说明
   - 添加认证示例

2. **创建 AUTHENTICATION.md**
   - 认证流程说明
   - JWT 使用指南
   - 权限系统说明
   - 中间件使用示例

3. **创建 MIGRATION_GUIDE_v1.5.0.md**
   - 从 v1.4.0 升级步骤
   - 权限迁移指南
   - 中间件迁移指南
   - 可能的 Breaking Changes

4. **更新 CHANGELOG.md**
   - 补充 v1.5.0 最终变更
   - 添加迁移指南链接
   - 添加已知问题和解决方案

#### 验收标准

- [ ] API.md 完整更新
- [ ] AUTHENTICATION.md 创建完成
- [ ] MIGRATION_GUIDE_v1.5.0.md 创建完成
- [ ] CHANGELOG.md 更新完成
- [ ] 所有文档链接正确

---

### P2-1: WebSocket 房间系统 UI (可选)

**优先级:** P2 (低)
**负责人:** 🎨 设计师 + ⚡ Executor
**预计工时:** 2 天
**依赖:** v1.4.0 完成

#### 任务详情

为 WebSocket 房间系统创建可视化管理界面

#### 功能需求

1. **房间列表视图**
   - 显示所有房间
   - 房间类型过滤
   - 参与者数量

2. **房间详情视图**
   - 房间信息显示
   - 参与者列表
   - 消息历史

3. **房间管理**
   - 创建房间
   - 编辑房间设置
   - 删除房间

4. **参与者管理**
   - 踢出/封禁用户
   - 更改用户角色
   - 查看用户状态

#### 组件清单

| 组件 | 工时 | 说明 |
|------|------|------|
| RoomList | 4h | 房间列表 |
| RoomDetail | 4h | 房间详情 |
| RoomSettings | 3h | 房间设置 |
| ParticipantList | 3h | 参与者列表 |
| ParticipantActions | 2h | 用户操作 |

#### 验收标准

- [ ] 房间列表正常显示
- [ ] 房间详情完整
- [ ] 房间管理功能可用
- [ ] 参与者管理功能可用
- [ ] 实时更新正常

---

### P2-2: 性能监控告警 (可选)

**优先级:** P2 (低)
**负责人:** ⛡️ 系统管理员 + 🧪 测试员
**预计工时:** 1 天
**依赖:** 无

#### 任务详情

为性能监控系统添加告警渠道

#### 功能需求

1. **邮件告警**
   - SMTP 配置
   - 告警邮件模板
   - 收件人管理

2. **Slack 告警**
   - Webhook 配置
   - 消息格式
   - 渠道映射

3. **告警规则**
   - CPU 使用率 > 80%
   - 内存使用率 > 85%
   - API 响应时间 > 2s
   - 错误率 > 5%

#### 实施步骤

1. **创建告警服务**
   ```typescript
   // src/lib/monitoring/alert-service.ts
   interface AlertChannel {
     type: 'email' | 'slack' | 'webhook';
     config: Record<string, unknown>;
   }

   interface AlertRule {
     id: string;
     name: string;
     condition: (metrics: PerformanceMetrics) => boolean;
     channels: AlertChannel[];
     enabled: boolean;
   }

   class AlertService {
     // 发送告警
     sendAlert(rule: AlertRule, metrics: PerformanceMetrics): Promise<void>;

     // 管理告警规则
     addRule(rule: AlertRule): void;
     removeRule(ruleId: string): void;
     updateRule(ruleId: string, updates: Partial<AlertRule>): void;

     // 检查指标
     checkMetrics(metrics: PerformanceMetrics): Promise<void>;
   }
   ```

2. **集成到性能监控**
   - 定期检查指标
   - 触发告警
   - 记录告警历史

3. **配置管理**
   - 告警规则配置
   - 渠道配置
   - 启用/禁用规则

#### 验收标准

- [ ] 邮件告警正常
- [ ] Slack 告警正常
- [ ] 告警规则工作
- [ ] 告警历史记录
- [ ] 配置管理可用

---

## 📅 实施时间表

### Sprint 1 (Day 1): 基础设施标准化

| 时间 | 任务 | 负责人 | 工时 |
|------|------|--------|------|
| 09:00-10:30 | P0-1: API 错误处理标准化 | ⚡ Executor | 1.5h |
| 10:30-11:30 | P0-2: 中间件统一 | ⚡ Executor | 1h |
| 11:30-12:00 | 测试验证 | 🧪 测试员 | 0.5h |
| 14:00-15:00 | P1-1: 配置管理优化 | 🏗️ 架构师 | 1h |
| 15:00-16:00 | 环境变量验证 | 🏗️ 架构师 | 1h |
| 16:00-17:00 | 文档更新 (API.md) | 📚 咨询师 | 1h |

**里程碑:** API 一致性达成

---

### Sprint 2 (Day 2): 状态管理迁移

| 时间 | 任务 | 负责人 | 工时 |
|------|------|--------|------|
| 09:00-11:00 | P0-3: PermissionContext → Zustand (Part 1) | ⚡ Executor | 2h |
| 11:00-12:00 | Store 测试编写 | 🧪 测试员 | 1h |
| 14:00-16:00 | P0-3: 组件迁移 (Part 2) | ⚡ Executor | 2h |
| 16:00-17:00 | 迁移测试验证 | 🧪 测试员 | 1h |

**里程碑:** Zustand 迁移完成

---

### Sprint 3 (Day 3): UI 完善

| 时间 | 任务 | 负责人 | 工时 |
|------|------|--------|------|
| 09:00-10:00 | P1-2: 实时状态优化 | 🎨 设计师 | 1h |
| 10:00-11:00 | TaskDetailModal 开发 | 🎨 设计师 | 1h |
| 11:00-12:00 | 批量操作实现 | 🎨 设计师 | 1h |
| 14:00-14:30 | 导出功能 | 🎨 设计师 | 0.5h |
| 14:30-15:30 | 响应式优化 | 🎨 设计师 | 1h |
| 15:30-16:30 | UI 测试 | 🧪 测试员 | 1h |

**里程碑:** Agent Dashboard UI 完成

---

### Sprint 4 (Day 3.5): 文档和收尾

| 时间 | 任务 | 负责人 | 工时 |
|------|------|--------|------|
| 09:00-10:00 | AUTHENTICATION.md 创建 | 📚 咨询师 | 1h |
| 10:00-10:30 | MIGRATION_GUIDE_v1.5.0.md | 📚 咨询师 | 0.5h |
| 10:30-11:00 | CHANGELOG.md 更新 | 📚 咨询师 | 0.5h |
| 11:00-12:00 | 最终测试验证 | 🧪 测试员 | 1h |
| 14:00-15:00 | 代码审查 | 🏗️ 架构师 | 1h |
| 15:00-16:00 | 发布准备 | ⛡️ 系统管理员 | 1h |

**里程碑:** v1.5.0 就绪发布

---

## 📊 优先级矩阵

```
高影响力 + 低工作量  →  立即执行 (P0)
├─ API 错误处理标准化 (1.5h)
├─ 中间件统一 (1h)
└─ 配置管理优化 (1.5h)

高影响力 + 高工作量  →  计划执行 (P0/P1)
├─ PermissionContext → Zustand (4h)
└─ Agent Dashboard UI 完善 (3h)

低影响力 + 低工作量  →  有空再做 (P1)
└─ 文档完善 (2h)

低影响力 + 高工作量  →  延后考虑 (P2)
├─ WebSocket 房间系统 UI (2d)
└─ 性能监控告警 (1d)
```

---

## 🎯 成功指标

### 完成度目标

| 指标 | 当前 | 目标 | 时间 |
|------|------|------|------|
| **总体完成度** | 45% | 100% | 3-4 天 |
| **P0 任务** | 60% | 100% | 2 天 |
| **P1 任务** | 20% | 100% | 4 天 |
| **测试覆盖率** | 98% | 98%+ | 持续 |
| **API 一致性** | 61% | 100% | 1 天 |

### 质量目标

- [ ] 所有 P0 任务 100% 完成
- [ ] 测试通过率 100%
- [ ] TypeScript 编译无错误
- [ ] 无明显性能回归
- [ ] 文档完整准确

---

## ⚠️ 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| **权限迁移引入 Bug** | 高 | 中 | 充分测试，保留回滚计划 |
| **API 中断** | 高 | 低 | 保持向后兼容，渐进式迁移 |
| **工期延误** | 中 | 中 | P2 任务可延后，P0 必须完成 |
| **性能下降** | 中 | 低 | 性能基准测试，对比前后指标 |
| **测试失败** | 低 | 低 | 并行开发测试，及时修复 |

---

## 🔄 回滚计划

### 如果 P0-3 (Zustand 迁移) 失败

1. **保留 PermissionContext 代码** - 不立即删除
2. **特性开关控制** - 使用 Feature Flag 切换
3. **渐进式迁移** - 按模块逐步迁移
4. **回滚步骤**
   ```bash
   # 恢复 PermissionContext
   git revert <Zustand 迁移 commit>
   git push origin main
   ```

### 如果 API 迁移引入问题

1. **保留旧格式支持** - 同时支持新旧格式
2. **API 版本控制** - 使用 `/api/v1/` 和 `/api/v2/`
3. **灰度发布** - 部分用户使用新 API

---

## 📝 交付物清单

### 代码交付

- [ ] 标准化 API 错误处理 (6 文件)
- [ ] 统一认证中间件 (2 文件)
- [ ] Zustand 权限 Store (1 文件)
- [ ] 统一配置管理 (2 文件)
- [ ] Agent Dashboard UI 完善 (5 组件)

### 文档交付

- [ ] `docs/API.md` (更新)
- [ ] `docs/AUTHENTICATION.md` (新)
- [ ] `docs/MIGRATION_GUIDE_v1.5.0.md` (新)
- [ ] `CHANGELOG.md` (更新)
- [ ] `ROADMAP_v1.5.0_COMPLETION_PLAN.md` (本文档)

### 测试交付

- [ ] API 标准化测试
- [ ] 权限迁移测试
- [ ] UI 组件测试
- [ ] 集成测试
- [ ] E2E 测试

---

## 🚀 下一步行动

### 立即执行 (今天)

1. ✅ **P0-1: API 错误处理标准化**
   - 负责人: ⚡ Executor
   - 预计时间: 1.5 小时

2. ✅ **P0-2: 中间件统一**
   - 负责人: ⚡ Executor
   - 预计时间: 1 小时

### 本周完成

3. **P0-3: PermissionContext → Zustand 迁移**
   - 负责人: ⚡ Executor + 🏗️ 架构师
   - 预计时间: 4 小时

4. **P1-1: 配置管理优化**
   - 负责人: 🏗️ 架构师
   - 预计时间: 1.5 小时

5. **P1-2: Agent Dashboard UI 完善**
   - 负责人: 🎨 设计师 + 🧪 测试员
   - 预计时间: 3 小时

6. **P1-3: 文档完善**
   - 负责人: 📚 咨询师
   - 预计时间: 2 小时

### 可选任务 (延后)

7. P2-1: WebSocket 房间系统 UI (2 天)
8. P2-2: 性能监控告警 (1 天)

---

## 📞 联系方式

如有问题，请联系：

- **项目负责人**: 🏗️ 架构师
- **技术支持**: ⚡ Executor
- **测试协调**: 🧪 测试员
- **文档支持**: 📚 咨询师

---

**文档版本:** 1.0.0
**最后更新:** 2026-03-30 19:12 CET
**状态:** 待执行

---

## 附录 A: 功能优先级排序

### P0 - 必须完成 (阻塞发布)

1. **API 错误处理标准化** (1.5h)
   - 影响: 所有 API 用户
   - 工作量: 低
   - 风险: 低

2. **中间件统一** (1h)
   - 影响: 开发体验、维护性
   - 工作量: 低
   - 风险: 低

3. **PermissionContext → Zustand 迁移** (4h)
   - 影响: 性能、代码质量
   - 工作量: 中
   - 风险: 中

### P1 - 建议完成 (提升质量)

4. **配置管理优化** (1.5h)
   - 影响: 可维护性
   - 工作量: 低
   - 风险: 低

5. **Agent Dashboard UI 完善** (3h)
   - 影响: 用户体验
   - 工作量: 中
   - 风险: 低

6. **文档完善** (2h)
   - 影响: 可用性
   - 工作量: 低
   - 风险: 低

### P2 - 可选完成 (锦上添花)

7. **WebSocket 房间系统 UI** (2d)
   - 影响: 高级用户
   - 工作量: 高
   - 风险: 中

8. **性能监控告警** (1d)
   - 影响: 运维效率
   - 工作量: 中
   - 风险: 中

---

## 附录 B: 工作量汇总

| 任务分类 | 任务数 | 总工时 | 占比 |
|---------|--------|--------|------|
| **P0** | 3 | 6.5h | 35% |
| **P1** | 3 | 6.5h | 35% |
| **P2** | 2 | 3d | 30% |
| **总计** | 8 | ~19h | 100% |

**P0+P1 预计完成时间:** 2-3 天
**全部完成预计时间:** 4-5 天 (含 P2)

---

## 附录 C: 团队分工

| 角色 | 职责 | 主要任务 |
|------|------|---------|
| **🏗️ 架构师** | 技术设计、代码审查 | P0-3, P1-1, 代码审查 |
| **⚡ Executor** | 功能实现 | P0-1, P0-2, P0-3 |
| **🧪 测试员** | 测试、质量保证 | 所有测试任务 |
| **🎨 设计师** | UI/UX 优化 | P1-2 |
| **📚 咨询师** | 文档编写 | P1-3 |
| **⛡️ 系统管理员** | 部署、运维 | 发布准备 |

---

**🎯 v1.5.0 发布目标日期: 2026-04-03**

**📋 下次审查: 2026-03-31 (每日站会)**
