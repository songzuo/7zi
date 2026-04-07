# 7zi 项目 v1.4.0 架构分析报告

**日期**: 2026-04-07  
**角色**: 🏗️ 架构师子代理  
**任务**: 分析并设计 7zi 项目 v1.4.0 技术架构  
**状态**: ✅ 完成

---

## 📋 执行摘要

项目当前状态（v1.13.0）已完成 Next.js 16 迁移，进入 v1.4.0 架构优化阶段。发现以下关键问题需要处理：

| 领域 | 优先级 | 核心问题 |
|------|--------|----------|
| **Bundle 优化** | 🔴 P0 | Three.js 重复打包，主包超 400KB |
| **测试覆盖** | 🔴 P0 | ~60% 覆盖率，19 个空测试文件 |
| **lib 目录膨胀** | 🟠 P1 | 40+ 顶级目录，组织混乱 |
| **TypeScript 质量** | 🟠 P1 | 571 个 TS 错误，155 处 `any` 类型 |
| **循环依赖** | 🟠 P1 | 6+ 处循环依赖（db/、monitoring/） |
| **监控体系分散** | 🟡 P2 | 两套性能模块重叠 |

---

## 1. 当前架构分析

### 1.1 项目结构总览

```
/root/.openclaw/workspace/
├── 7zi-frontend/          # Next.js 16 前端 (主项目)
│   ├── src/
│   │   ├── app/           # App Router 页面
│   │   ├── features/      # 功能模块
│   │   └── lib/           # 核心库 (40+ 目录)
│   ├── public/
│   ├── tests/             # E2E / 集成测试
│   └── next.config.ts     # Next.js 16 配置
│
├── 7zi-project/           # Node.js 后端 (轻量)
│   └── src/lib/           # API 服务
│
├── 7zi-monitoring/         # Python 监控服务
│   ├── src/alerts/        # 告警规则
│   ├── src/collectors/    # 数据采集
│   └── requirements.txt   # pyyaml, aiohttp
│
└── 部署配置
    ├── docker-compose.*.yml
    ├── Dockerfile(.production)
    └── 7zi-nginx.conf
```

### 1.2 前端技术栈

| 技术 | 版本 | 状态 |
|------|------|------|
| Next.js | 16.2.1 | ✅ 最新 |
| React | 19.2.4 | ✅ 最新 |
| TypeScript | 5.x | ⚠️ 571 错误 |
| Zustand | 5.0.12 | ✅ |
| Tailwind CSS | 3.x | ✅ |
| Socket.IO | 4.8.3 | ✅ |
| Three.js | 0.183.2 | ⚠️ 重复打包 |
| Vitest | 4.1.2 | ⚠️ 可升级 v5 |

### 1.3 lib/ 目录结构（40+ 模块）

```
src/lib/
├── __tests__/              # 通用测试工具
├── agents/                 # AI Agent 核心
├── agent-scheduler/        # Agent 调度
├── ai/                    # AI 能力
├── alerting/               # 告警系统
├── analytics/             # 分析统计
├── api/                   # API 客户端
├── api-clients.ts         # API 入口
├── api-rate-limit.ts      # 限流
├── api-types.ts           # API 类型
├── audio/                 # 音频处理
├── audit/                 # 审计日志
├── auth.ts                # 认证
├── auth/                  # 认证模块
├── automation/            # 自动化引擎
├── cache/                 # 缓存
├── collab/                # 实时协作 (CRDT)
├── db/                    # 数据库
├── dynamic-import.tsx     # 动态导入
├── editor/                # 富文本编辑器
├── error-reporting/       # 错误上报
├── errors.ts              # 错误定义
├── execution/             # 执行引擎
├── i18n/                  # 国际化
├── keyboard/              # 快捷键
├── knowledge/             # 知识库
├── logger.ts              # 日志
├── mcp/                   # MCP 协议
├── middleware/            # 中间件
├── monitoring/            # 监控 (约3000行)
├── notification-init.ts   # 通知初始化
├── offline/               # PWA 离线
├── performance/           # 性能基础版 (~1500行)
├── permissions.ts         # 权限
├── pwa/                   # PWA
├── rate-limit/            # 限流
├── reporting/             # 报表
├── search/                # 搜索
├── security/              # 安全
├── seo/                   # SEO
├── services/              # 服务层
├── socket.ts              # Socket 入口
├── storage/               # 存储
├── theme/                 # 主题
├── tools/                 # 工具
├── utils.ts               # 工具函数
├── utils/                 # 工具模块
├── validation/            # 验证
├── validation-schemas.ts   # Zod schemas
├── validation.ts          # 验证入口
└── webhook/               # Webhook
```

---

## 2. 关键问题分析

### 2.1 Three.js 重复打包问题 🔴 P0

**问题**: Three.js 在两处被打包：
1. 根 `package.json` → `node_modules/three`
2. `7zi-frontend/package.json` → `node_modules/three`

**影响**: Bundle 体积增大，可能包含两套 Three.js 实例。

**已配置优化** (`next.config.ts`):
```typescript
experimental: {
  optimizePackageImports: ['@react-three/drei', '@react-three/fiber', 'three'],
},
// webpack chunk 分离已配置
```

**建议**:
1. 从根 `package.json` 移除 `three`（如果不是根项目自己需要）
2. 验证 `7zi-frontend/node_modules/three` 是唯一实例
3. 确认 Three.js 组件全部使用 `dynamic()` 懒加载

### 2.2 测试覆盖率 ~60% + 19 个空测试 🔴 P0

**当前状态**:
- `lib/workflow/` 覆盖率: ~32%
- `lib/collab/` 覆盖率: ~55%
- 大型文件覆盖困难: `CollabClient.ts` (814行, 0%), `VisualWorkflowOrchestrator.ts` (831行, 3.86%)

**19 个空测试文件**:
- 大型复杂模块缺少有效测试
- 需要拆分为更小可测试单元

**建议**:
1. 为 0% 覆盖率的模块编写基础存在性测试
2. 补充 `conflict-resolver.ts` (72.9% → 80%+)
3. `state-manager.ts` (74.2% → 80%+) 补充连接状态转换测试
4. 为 `CollabClient` 等大型模块创建 mock-friendly 封装层

### 2.3 lib/ 目录膨胀 🟠 P1

**问题**: 40+ 顶级目录，组织混乱，维护成本高。

**建议结构**:
```
src/lib/
├── core/           # 核心能力（auth, db, errors, utils）
│   ├── auth/
│   ├── db/
│   ├── errors.ts
│   └── utils/
├── features/       # 功能模块
│   ├── agents/
│   ├── workflow/
│   ├── collab/
│   └── ...
├── infrastructure/ # 基础设施
│   ├── api/
│   ├── cache/
│   ├── monitoring/
│   └── storage/
└── shared/         # 共享代码
    ├── i18n/
    ├── validation/
    └── theme/
```

### 2.4 循环依赖 6+ 处 🟠 P1

**位置**:
- `db/` 模块内部
- `monitoring/` 模块内部

**工具**: `madge --circular src/` 检测

### 2.5 两套性能模块重叠 🟡 P2

| 模块 | 行数 | 状态 |
|------|------|------|
| `lib/performance/` | ~1500 | 基础版 |
| `lib/monitoring/` | ~3000 | 升级版 |

**建议**: 合并到 `lib/monitoring/`，统一入口。

---

## 3. v1.4.0 架构优化方案

### 3.1 性能优化 🔴 P0

#### Bundle 优化
- [ ] **Three.js 去重**: 移除根 `package.json` 中的 `three` 依赖
- [ ] **懒加载验证**: 确认所有 3D 组件使用 `dynamic()` 
- [ ] **Route-based splitting**: `next.config.ts` 已配置，继续完善
- [ ] **目标**: 主包 <300KB (当前 >400KB)

#### LCP 优化
- [ ] 图片使用 `next/image` + AVIF/WebP
- [ ] 首屏组件骨架屏
- [ ] 预加载关键资源
- [ ] **目标**: LCP <1.5s (当前 ~2.5s)

#### 构建优化
- [ ] TypeScript 全量检查优化（当前 91s）
- [ ] Turbopack 生产构建（目前用 `--webpack`）
- [ ] **目标**: 构建时间 <90s

### 3.2 可扩展性增强 🔴 P0

#### 循环依赖修复
- [ ] `madge --circular src/lib/db/`
- [ ] `madge --circular src/lib/monitoring/`
- [ ] 消除 6+ 处循环依赖

#### lib/ 目录重构
- [ ] 创建 `core/`、`features/`、`infrastructure/`、`shared/` 四层结构
- [ ] 迁移 `performance/` → `monitoring/`
- [ ] 统一导出入口（barrel files）

### 3.3 技术债务清理 🟠 P1

#### TypeScript 质量
- [ ] 消除 571 个 TS 错误
- [ ] 减少 155 处 `any` 类型
- [ ] 升级 `@types/node` 到 LTS 22.x

#### 空测试填充
- [ ] 19 个空测试文件填充
- [ ] 覆盖率目标: 70%+ (当前 ~60%)

### 3.4 监控体系整合 🟡 P2

- [ ] 合并 `performance/` 和 `monitoring/`
- [ ] 统一监控 SDK
- [ ] 告警规则标准化

---

## 4. 优先级排序

### P0 (阻断性问题)
| 优先级 | 任务 | 预计工时 |
|--------|------|----------|
| P0-1 | Three.js 重复打包修复 | 1h |
| P0-2 | 19 个空测试填充 | 3h |
| P0-3 | 循环依赖修复 | 2h |
| P0-4 | TS 错误消除 (571 → 0) | 4h |

### P1 (重要改进)
| 优先级 | 任务 | 预计工时 |
|--------|------|----------|
| P1-1 | lib/ 目录结构重构 | 3h |
| P1-2 | 性能监控模块合并 | 2h |
| P1-3 | `any` 类型清理 | 3h |
| P1-4 | 测试覆盖率提升至 70% | 4h |

### P2 (优化增强)
| 优先级 | 任务 | 预计工时 |
|--------|------|----------|
| P2-1 | Turbopack 生产构建 | 2h |
| P2-2 | 告警配置标准化 | 2h |
| P2-3 | 依赖版本升级 (vitest v5) | 1h |

---

## 5. 实施步骤

### Phase 1: P0 问题修复 (Day 1)
```bash
# 1. Three.js 去重
cd /root/.openclaw/workspace
pnpm remove three  # 从根 package.json 移除
cd 7zi-frontend
pnpm add three@^0.183.2  # 确认前端只有一处

# 2. 循环依赖检测
cd 7zi-frontend
pnpm run dep:check

# 3. 空测试填充
find src -name "*.test.ts" -empty
```

### Phase 2: P1 改进 (Day 2-3)
- lib/ 重构规划
- TS any 清理
- 覆盖率提升

### Phase 3: P2 优化 (Day 4-5)
- Turbopack 生产构建
- 监控体系合并
- 依赖升级

---

## 6. 关键文件路径

| 文件 | 用途 |
|------|------|
| `7zi-frontend/next.config.ts` | Bundle 配置 |
| `7zi-frontend/src/lib/performance/` | 性能基础版 (~1500行) |
| `7zi-frontend/src/lib/monitoring/` | 监控升级版 (~3000行) |
| `7zi-monitoring/src/alerts/` | Python 告警规则 |
| `7zi-monitoring/requirements.txt` | Python 依赖 |
| `/root/.openclaw/workspace/memory/architecture-v140-20260407.md` | 本报告 |

---

## 7. 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| Three.js 移除导致功能损坏 | 低 | 高 | 先验证所有 3D 组件懒加载 |
| 测试填充后覆盖率未达标 | 中 | 中 | 拆分大型模块再测试 |
| lib/ 重构影响其他模块 | 中 | 高 | 保持 barrel file 兼容 |
| Turbopack 生产不稳定 | 低 | 中 | 保留 Webpack 回退 |

---

**报告生成时间**: 2026-04-07 20:55 GMT+2  
**下一步**: 由主代理分配任务给 Executor 子代理执行
