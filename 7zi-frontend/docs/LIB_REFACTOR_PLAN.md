# src/lib/ 目录重构计划

**版本**: v1.14.1  
**目标**: 将 src/lib/ 重构为 `src/core/` + `src/features/` 结构  
**依据**: 基于模块职责分类，分析依赖关系，制定渐进式迁移方案

---

## 一、当前 src/lib/ 目录分析

### 1.1 目录清单（43个子目录 + 16个根文件）

#### 根目录散文件（16个）
```
api-clients.ts         # API客户端配置
api-rate-limit.ts      # API限速
api-types.ts           # API类型定义
auth.ts                # 认证核心逻辑
dynamic-import.tsx      # 动态导入工具
errors.ts              # 错误类定义
logger.ts              # 日志工具
notification-init.ts  # 通知初始化
permissions.ts         # 权限核心逻辑（22KB大型文件）
socket.ts              # WebSocket socket包装
utils.ts               # 通用工具函数（generateSecureId, cn等）
validation-schemas.ts  # Zod验证模式
validation.ts          # 验证核心
websocket-compression.ts    # WebSocket压缩
websocket-instance-manager.ts  # WebSocket实例管理
websocket-manager.ts         # WebSocket管理器
```

#### 子目录（43个）
```
agents/          # Agent相关
ai/              # AI对话
alerting/        # 告警服务
analytics/       # 分析统计
api/             # API错误处理
audio/           # 音频处理
audit/           # 审计日志
auth/            # 认证子模块
automation/      # 自动化引擎
cache/           # 热数据缓存
collab/          # 实时协作
db/              # 数据库存储
editor/          # 编辑器扩展
error-reporting/ # 错误上报
evomap/          # Evomap集成
execution/       # 执行引擎
i18n/            # 国际化
keyboard/        # 快捷键
knowledge/       # 知识库RAG
mcp/             # MCP服务器
middleware/      # 中间件
monitoring/      # 性能监控
offline/         # 离线支持
performance/     # 性能优化
permissions/     # 权限管理
pwa/             # PWA支持
rate-limit/      # 限流
reporting/       # 报告生成
search/          # 搜索功能
security/        # 安全头部
seo/             # SEO元数据
services/        # 通知服务
storage/         # 存储抽象
theme/           # 主题系统
tools/           # 工具执行器
utils/           # 工具散文件
validation/      # 表单验证
webhook/         # Webhook管理
websocket/       # WebSocket核心
workflow/        # 工作流编排
workflows/        # 工作流存储
```

---

## 二、迁移分类决策

### 2.1 分类原则

| 类别 | 定义 | 目标位置 |
|------|------|----------|
| **core** | 基础设施型模块，不含业务逻辑，可被任意功能复用 | `src/core/` |
| **features** | 业务功能型模块，有明确的功能边界和业务语义 | `src/features/` |

### 2.2 分类结果

#### 🔧 迁移到 `src/core/`（基础设施）

| 模块 | 原因 |
|------|------|
| **api/** | HTTP错误处理、请求日志，是所有网络请求的基础设施 |
| **audio/** | 音频处理（Whisper、STT、Diarization），纯技术能力 |
| **cache/** | 热数据缓存框架，无业务依赖 |
| **db/** | IndexedDB/Draft存储抽象，基础设施存储层 |
| **error-reporting/** | 全局错误收集、上报、重试机制 |
| **i18n/** | 国际化基础设施 |
| **keyboard/** | 快捷键管理框架 |
| **mcp/** | MCP协议服务器实现 |
| **middleware/** | CSRF、限流中间件 |
| **monitoring/** | 性能监控基础设施 |
| **offline/** | 离线存储和同步框架 |
| **performance/** | 性能指标收集、预算控制、异常检测 |
| **security/** | HTTP安全头部 |
| **storage/** | 存储抽象层 |
| **theme/** | 主题系统 |
| **utils/** | 通用工具函数（clsx/twMerge/cn等） |
| **validation/** | 表单验证框架 |
| **websocket/** | WebSocket核心协议 |
| **webhook/** | Webhook投递基础设施 |
| **api-clients.ts** | API客户端配置入口 |
| **api-rate-limit.ts** | 通用限速逻辑 |
| **api-types.ts** | API类型定义 |
| **errors.ts** | 错误类定义 |
| **logger.ts** | 日志工具 |
| **permissions.ts** | 权限检查核心（大型文件，含22KB逻辑） |

#### 🎯 迁移到 `src/features/`（业务功能）

| 模块 | 原因 |
|------|------|
| **agents/** | Agent业务逻辑（学习、调度） |
| **ai/** | AI对话业务 |
| **alerting/** | 告警业务服务 |
| **analytics/** | 站点分析统计业务 |
| **automation/** | 自动化引擎业务 |
| **editor/** | 编辑器扩展（TipTap） |
| **evomap/** | Evomap业务集成 |
| **execution/** | 执行历史业务 |
| **knowledge/** | 知识库RAG业务 |
| **permissions/** | 权限管理业务UI/组件 |
| **pwa/** | PWA特性业务 |
| **rate-limit/** | 限流业务管理 |
| **reporting/** | 报告生成业务 |
| **search/** | 搜索业务功能 |
| **seo/** | SEO元数据业务 |
| **services/** | 通知服务业务 |
| **workflow/** | 工作流编排业务 |
| **workflows/** | 工作流存储业务 |
| **dynamic-import.tsx** | 动态导入（偏业务使用） |
| **notification-init.ts** | 通知初始化（业务入口） |
| **socket.ts** | WebSocket连接管理（业务层） |
| **auth.ts** | 认证业务逻辑 |

#### ⚠️ 已有对应模块（可能冲突）

| src/lib/模块 | src/features/已存在 | 处理方案 |
|-------------|---------------------|---------|
| **collab/** | `src/features/collab/` | collab技术层移至`src/core/collab/`，features/collab作为业务封装层 |
| **audit/** | `src/features/audit/` | 合并：lib/audit的logger移至`src/core/audit/logger`，features/audit保持业务层 |
| **auth/** | `src/features/auth/` | lib/auth/的子模块移至`src/core/auth/`（api-auth, encrypted-storage, jwt），features/auth保持业务层 |

---

## 三、目标目录结构

### 3.1 `src/core/` 结构（26个模块）

```
src/core/
├── api/                    # HTTP错误处理
│   ├── error-handler.ts
│   ├── error-logger.ts
│   ├── rooms/
│   └── index.ts
├── audio/                  # 音频处理
│   ├── AudioProcessor.ts
│   ├── STTRouter.ts
│   ├── SpeakerDiarization.ts
│   ├── TranscriptionStream.ts
│   ├── WhisperClient.ts
│   ├── audio-recorder.ts
│   ├── audio-utils.ts
│   ├── speech-to-text.ts
│   ├── types.ts
│   ├── utils.ts
│   └── index.ts
├── auth/                   # 认证基础设施
│   ├── api-auth.ts
│   ├── encrypted-storage.ts
│   ├── jwt.ts
│   └── index.ts
├── cache/                  # 热数据缓存
│   ├── hot-data-cache.ts
│   └── index.ts
├── collab/                 # 实时协作基础设施
│   ├── CRDTOperations.ts
│   ├── CollabClient.ts
│   ├── conflict-resolver.ts
│   ├── cursor-sync.ts
│   ├── state-manager.ts
│   └── index.ts
├── db/                     # 数据库存储抽象
│   ├── draft-storage.ts
│   ├── draft-storage.types.ts
│   ├── draft-storage-hooks.ts
│   ├── feedback-storage.ts
│   ├── feedback-types.ts
│   ├── query-optimizer.ts
│   ├── storage.ts
│   └── index.ts
├── error-reporting/        # 错误上报
│   ├── error-log-history.ts
│   ├── error-reporting.ts
│   ├── global-error-handler.ts
│   ├── retry.ts
│   └── index.ts
├── i18n/                   # 国际化
│   ├── client.ts
│   ├── config.ts
│   ├── server.ts
│   └── index.ts
├── keyboard/               # 快捷键
│   ├── defaults.ts
│   ├── shortcut-manager.ts
│   ├── shortcut-registry.ts
│   └── index.ts
├── mcp/                    # MCP协议
│   ├── server.ts
│   └── index.ts
├── middleware/              # 中间件
│   ├── csrf.ts
│   ├── rate-limit-middleware.ts
│   └── index.ts
├── monitoring/             # 性能监控
│   ├── aggregator.ts
│   ├── alert-engine.ts
│   ├── channels/
│   ├── client/
│   ├── config.ts
│   ├── monitor.ts
│   ├── storage.ts
│   ├── types.ts
│   ├── utils.ts
│   └── index.ts
├── offline/                # 离线支持
│   ├── conflict-resolver.ts
│   ├── storage.ts
│   ├── sync-manager.ts
│   ├── example.tsx
│   └── index.ts
├── performance/            # 性能优化
│   ├── alerting/
│   ├── anomaly-detection/
│   ├── batch-request.ts
│   ├── budget-control/
│   ├── budget-manager.ts
│   ├── cache-strategy.ts
│   ├── custom-metrics.ts
│   ├── metrics-aggregator.ts
│   ├── metrics-collector.ts
│   ├── metrics-report.ts
│   ├── metrics-types.ts
│   ├── offline-storage.ts
│   ├── optimization-utils.ts
│   ├── performance-hooks.ts
│   └── index.ts
├── permissions/            # 权限核心
│   ├── constants.ts
│   ├── types.ts
│   └── index.ts
├── security/               # 安全
│   ├── headers.ts
│   ├── headers.test.ts
│   ├── prototype-pollution-guard.ts
│   └── index.ts
├── storage/                # 存储抽象
│   ├── draft-storage.ts
│   ├── execution-state-storage.ts
│   └── index.ts
├── theme/                  # 主题
│   ├── ThemeContext.tsx
│   ├── ThemeSwitcher.tsx
│   ├── theme-config.ts
│   ├── theme-script.ts
│   ├── types.ts
│   ├── useThemeSwitch.ts
│   └── index.ts
├── utils/                  # 工具函数
│   ├── image.ts
│   └── index.ts
├── validation/             # 表单验证
│   ├── async-validators.ts
│   ├── form-validator.ts
│   ├── types.ts
│   ├── use-validation.ts
│   ├── validators.ts
│   ├── zod-adapter.ts
│   └── index.ts
├── websocket/              # WebSocket核心
│   ├── core.ts
│   ├── manager.ts
│   ├── types.ts
│   ├── constants.ts
│   └── index.ts
├── webhook/                # Webhook
│   ├── WebhookManager.ts
│   ├── delivery.ts
│   ├── types.ts
│   └── index.ts
├── api-clients.ts          # API客户端入口
├── api-rate-limit.ts       # 限速逻辑
├── api-types.ts            # API类型
├── errors.ts               # 错误类
├── logger.ts               # 日志
├── permissions.ts         # 权限核心（大型文件）
├── validation-schemas.ts   # Zod模式
├── validation.ts           # 验证核心
├── websocket-compression.ts # WS压缩
├── websocket-instance-manager.ts  # WS实例管理
└── websocket-manager.ts    # WS管理
```

### 3.2 `src/features/` 补充结构（新增15个模块）

```
src/features/               # 已有: audit, auth, collab, dashboard, mcp, monitoring, rate-limit, websocket
                            # 新增:
├── agents/                # Agent业务（原lib/agents）
│   ├── learning/
│   ├── scheduler/
│   └── index.ts
├── ai/                    # AI对话业务（原lib/ai）
│   ├── dialogue/
│   └── index.ts
├── alerting/              # 告警服务（原lib/alerting）
│   ├── MultiChannelAlertService.ts
│   ├── channels/
│   ├── examples.ts
│   └── index.ts
├── analytics/             # 分析统计（原lib/analytics）
│   ├── ga4.ts
│   ├── metrics.ts
│   ├── service.ts
│   ├── types.ts
│   └── index.ts
├── automation/             # 自动化引擎（原lib/automation）
│   ├── automation-engine.ts
│   ├── automation-hooks.ts
│   ├── automation-storage.ts
│   ├── default-templates.ts
│   └── index.ts
├── editor/                # 编辑器扩展（原lib/editor）
│   ├── tiptap-extension.ts
│   └── index.ts
├── evomap/                # Evomap集成（原lib/evomap）
│   ├── gateway.ts
│   ├── types.ts
│   ├── use-evomap.ts
│   └── index.ts
├── execution/             # 执行引擎（原lib/execution）
│   ├── execution-storage.ts
│   ├── useExecutionPersistence.ts
│   ├── examples.ts
│   └── index.ts
├── knowledge/             # 知识库（原lib/knowledge）
│   ├── document-pipeline.ts
│   ├── rag-qa.ts
│   ├── smart-retriever.ts
│   ├── vector-store.ts
│   ├── types.ts
│   └── index.ts
├── pwa/                  # PWA业务（原lib/pwa）
│   ├── service-worker-manager.ts
│   ├── utils.ts
│   ├── web-push-service.ts
│   └── index.ts
├── reporting/            # 报告生成（原lib/reporting）
│   ├── data-aggregator.ts
│   ├── nlg-processor.ts
│   ├── report-generator.ts
│   └── index.ts
├── search/              # 搜索业务（原lib/search）
│   ├── fuzzy-search.ts
│   ├── highlighter.tsx
│   ├── search-history.ts
│   ├── suggestions.ts
│   └── index.ts
├── seo/                 # SEO业务（原lib/seo）
│   ├── metadata.ts
│   └── index.ts
├── services/            # 通知服务（原lib/services）
│   ├── client-notification-manager.ts
│   ├── email.ts
│   ├── notification-center.tsx
│   ├── notification-enhanced.ts
│   ├── notification-indexeddb.ts
│   ├── notification-manager.ts
│   ├── notification-storage.ts
│   ├── notification-types.ts
│   ├── notification.ts
│   ├── notifications.ts
│   ├── use-notifications.ts
│   └── index.ts
└── workflow/            # 工作流编排（原lib/workflow）
    ├── VisualWorkflowOrchestrator.ts
    ├── execution-history-store.ts
    ├── replay-engine.ts
    ├── template-system.ts
    ├── versioning.ts
    ├── workflow-analytics.ts
    └── index.ts
```

---

## 四、迁移步骤

### 阶段一：基础设施准备（core层）

**顺序 1-3：创建目录骨架**

```bash
# 1. 创建 core 目录结构
mkdir -p src/core/{api,audio,auth,cache,collab,db,error-reporting,i18n,keyboard,mcp,middleware,monitoring,offline,performance,permissions,security,storage,theme,utils,validation,websocket,webhook}

# 2. 创建 features 新模块目录
mkdir -p src/features/{agents,ai,alerting,analytics,automation,editor,evomap,execution,knowledge,pwa,reporting,search,seo,services,workflow}

# 3. 创建 __tests__ 目录
mkdir -p src/core/__tests__
```

**顺序 4-8：迁移无依赖的基础模块（先行）**

```bash
# 4. 迁移 utils（零依赖）
mv src/lib/utils/ src/core/utils/

# 5. 迁移 errors.ts
mv src/lib/errors.ts src/core/errors.ts

# 6. 迁移 logger.ts
mv src/lib/logger.ts src/core/logger.ts

# 7. 迁移 api-types.ts
mv src/lib/api-types.ts src/core/api-types.ts

# 8. 迁移 security/
mv src/lib/security/ src/core/security/
```

**顺序 9-15：迁移基础设施子目录**

```bash
# 9. 迁移 storage/
mv src/lib/storage/ src/core/storage/

# 10. 迁移 cache/
mv src/lib/cache/ src/core/cache/

# 11. 迁移 validation/
mv src/lib/validation/ src/core/validation/

# 12. 迁移 validation-schemas.ts 和 validation.ts
mv src/lib/validation-schemas.ts src/core/validation-schemas.ts
mv src/lib/validation.ts src/core/validation.ts

# 13. 迁移 theme/
mv src/lib/theme/ src/core/theme/

# 14. 迁移 i18n/
mv src/lib/i18n/ src/core/i18n/

# 15. 迁移 api/
mv src/lib/api/ src/core/api/
```

**顺序 16-22：迁移中间件/协议层**

```bash
# 16. 迁移 middleware/
mv src/lib/middleware/ src/core/middleware/

# 17. 迁移 websocket/ 核心文件
mv src/lib/websocket/ src/core/websocket/
mv src/lib/websocket-compression.ts src/core/websocket-compression.ts
mv src/lib/websocket-instance-manager.ts src/core/websocket-instance-manager.ts
mv src/lib/websocket-manager.ts src/core/websocket-manager.ts

# 18. 迁移 webhook/
mv src/lib/webhook/ src/core/webhook/

# 19. 迁移 keyboard/
mv src/lib/keyboard/ src/core/keyboard/

# 20. 迁移 mcp/
mv src/lib/mcp/ src/core/mcp/

# 21. 迁移 audio/
mv src/lib/audio/ src/core/audio/

# 22. 迁移 error-reporting/
mv src/lib/error-reporting/ src/core/error-reporting/
```

**顺序 23-30：迁移复杂基础设施**

```bash
# 23. 迁移 db/
mv src/lib/db/ src/core/db/

# 24. 迁移 offline/
mv src/lib/offline/ src/core/offline/

# 25. 迁移 collab/ → src/core/collab/（注意与 features/collab 区分）
mv src/lib/collab/ src/core/collab/

# 26. 迁移 performance/
mv src/lib/performance/ src/core/performance/

# 27. 迁移 monitoring/
mv src/lib/monitoring/ src/core/monitoring/

# 28. 迁移 auth/ 子模块 → src/core/auth/
mkdir -p src/core/auth/
mv src/lib/auth/*.ts src/core/auth/

# 29. 迁移 permissions.ts（大型文件）
mv src/lib/permissions.ts src/core/permissions.ts

# 30. 迁移 permissions/ → src/core/permissions/
mv src/lib/permissions/ src/core/permissions/
```

**顺序 31-35：收尾 core 层**

```bash
# 31. 迁移 api-clients.ts 和 api-rate-limit.ts
mv src/lib/api-clients.ts src/core/api-clients.ts
mv src/lib/api-rate-limit.ts src/core/api-rate-limit.ts

# 32. 迁移 socket.ts（WebSocket业务封装）
mv src/lib/socket.ts src/core/socket.ts

# 33. 迁移 __tests__/
mv src/lib/__tests__/ src/core/__tests__/
```

### 阶段二：features层迁移

**顺序 36-42：迁移业务模块**

```bash
# 36. 迁移 agents/
mv src/lib/agents/ src/features/agents/

# 37. 迁移 ai/
mv src/lib/ai/ src/features/ai/

# 38. 迁移 alerting/
mv src/lib/alerting/ src/features/alerting/

# 39. 迁移 analytics/
mv src/lib/analytics/ src/features/analytics/

# 40. 迁移 automation/
mv src/lib/automation/ src/features/automation/

# 41. 迁移 execution/
mv src/lib/execution/ src/features/execution/

# 42. 迁移 knowledge/
mv src/lib/knowledge/ src/features/knowledge/
```

**顺序 43-50：迁移剩余业务模块**

```bash
# 43. 迁移 services/
mv src/lib/services/ src/features/services/

# 44. 迁移 search/
mv src/lib/search/ src/features/search/

# 45. 迁移 reporting/
mv src/lib/reporting/ src/features/reporting/

# 46. 迁移 workflow/ 和 workflows/
mv src/lib/workflow/ src/features/workflow/
mv src/lib/workflows/ src/features/workflows/

# 47. 迁移 editor/
mv src/lib/editor/ src/features/editor/

# 48. 迁移 evomap/
mv src/lib/evomap/ src/features/evomap/

# 49. 迁移 pwa/
mv src/lib/pwa/ src/features/pwa/

# 50. 迁移 seo/
mv src/lib/seo/ src/features/seo/
```

**顺序 51-53：收尾文件**

```bash
# 51. 迁移 auth.ts
mv src/lib/auth.ts src/features/auth/auth.ts

# 52. 迁移 dynamic-import.tsx
mv src/lib/dynamic-import.tsx src/features/dynamic-import.tsx

# 53. 迁移 notification-init.ts
mv src/lib/notification-init.ts src/features/notification-init.ts
```

### 阶段三：路径别名更新

**更新 tsconfig.json 路径映射：**

```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@/core/*": ["./src/core/*"],
    "@/features/*": ["./src/features/*"],
    "@/shared/*": ["./src/shared/*"]
  }
}
```

**批量替换 import 路径：**

```bash
# 使用 sed 批量替换（需要验证）
# 替换 @/lib/ → @/core/
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i "s|from ['\"]@/lib/|from '@/core/|g"

# 替换完成后删除空的 src/lib/
rm -rf src/lib/
```

---

## 五、依赖关系图（迁移顺序依据）

```
Level 0 (无依赖，可最先迁移):
  ├── utils/
  ├── errors.ts
  ├── logger.ts
  ├── api-types.ts
  └── security/

Level 1 (依赖 Level 0):
  ├── storage/
  ├── cache/
  ├── validation/ (需要 api-types)
  ├── theme/ (需要 errors)
  └── i18n/

Level 2 (依赖 Level 1):
  ├── api/
  ├── middleware/
  ├── websocket/ (需要 errors, utils)
  ├── webhook/ (需要 errors)
  ├── keyboard/
  └── mcp/

Level 3 (依赖 Level 2):
  ├── audio/ (需要 errors)
  ├── error-reporting/
  ├── db/ (需要 storage)
  ├── offline/ (需要 storage, db)
  └── collab/ (需要 websocket, errors)

Level 4 (依赖多个 Level):
  ├── performance/ (需要 monitoring, db, storage)
  ├── monitoring/ (需要 error-reporting, storage)
  └── auth/ (需要 security, storage, db)

Level 5 (业务模块，依赖 core):
  ├── agents/, ai/, alerting/, analytics/, automation/, editor/
  ├── evomap/, execution/, knowledge/, pwa/, reporting/
  ├── search/, seo/, services/, workflow/, workflows/
```

---

## 六、影响评估

### 6.1 构建影响

| 影响项 | 程度 | 说明 |
|--------|------|------|
| **TypeScript 路径别名** | ⚠️ 中 | tsconfig.json 需要添加 `@/core/*` 映射 |
| **ESLint/Prettier** | ✅ 小 | 无实质变化，仅路径更新 |
| **Vitest 测试** | ⚠️ 中 | 测试文件 import 路径需要同步更新 |
| **Next.js 编译** | ✅ 小 | 不影响 webpack bundling，仅文件移动 |
| **CI/CD** | ✅ 小 | 需要更新 paths 替换脚本 |

### 6.2 运行影响

| 影响项 | 程度 | 说明 |
|--------|------|------|
| **运行时行为** | ✅ 无 | 仅文件位置变更，无逻辑修改 |
| **性能** | ✅ 无 | 不影响运行时性能 |
| **功能完整性** | ✅ 无 | 所有模块保持不变 |

### 6.3 风险缓解

1. **分阶段迁移**：core 层先行，features 层后行，每阶段可构建验证
2. **保留旧路径别名**：过渡期内可同时支持 `@/lib/` 和 `@/core/`
3. **Git 分支**：在独立分支执行，完成后 PR 合并
4. **自动化测试**：迁移后运行 `npm run build` 和 `npm test` 验证

### 6.4 预估工作量

| 阶段 | 目录迁移 | 路径替换 | 测试验证 | 总计 |
|------|---------|---------|---------|------|
| core层 | 26个 | ~200处 | 1小时 | **2-3天** |
| features层 | 18个 | ~150处 | 1小时 | **2天** |
| 收尾 | - | ~50处 | 0.5小时 | **0.5天** |
| **总计** | **44个** | **~400处** | **2.5小时** | **4-5天** |

---

## 七、过渡方案（推荐）

为避免一次性全量迁移的风险，推荐**渐进式迁移**：

### 方案A：按依赖层级迁移（推荐）

```
Step 1: 迁移 Level 0-1（utils, errors, logger, api-types, security, storage, cache, validation, theme, i18n）
Step 2: 迁移 Level 2-3（api, middleware, websocket, webhook, keyboard, mcp, audio, error-reporting, db, offline, collab）
Step 3: 迁移 Level 4（performance, monitoring, auth）
Step 4: 迁移 Level 5（所有业务模块）
Step 5: 删除 src/lib/，更新 tsconfig
```

### 方案B：按 features 模块逐个迁移

```
每次只迁移一个 lib/ 子目录到 features/，同步更新所有 import，完成后构建验证
```

---

## 八、关键注意事项

1. **`permissions.ts`（22KB）**：这个大型文件包含核心权限逻辑，迁移时需要特别小心，确保完整性和测试覆盖
2. **`websocket/` vs `socket.ts`**：websocket/ 是核心协议层，socket.ts 是业务封装层，拆分到不同位置
3. **`collab/` 冲突**：src/lib/collab/ 移至 src/core/collab/，src/features/collab/ 保持不变
4. **测试文件**：__tests__ 目录跟随主模块迁移，但内部 import 路径需要同步更新
5. **index.ts 导出**：每个迁移后的模块需要检查 index.ts 的导出是否正确
