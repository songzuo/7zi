# 架构审查报告 - 2026-05-07

## 📁 目录结构分析

### 顶层结构
```
src/
├── app/           # Next.js App Router (页面路由)
├── components/    # React 组件
├── lib/           # 核心业务逻辑库
├── hooks/         # React 自定义 Hooks
├── middleware/    # 中间件
├── types/         # TypeScript 类型定义
├── test/          # 测试相关
└── tools/         # 工具脚本
```

### src/app/ 结构 (App Router)
- `[locale]/` - 国际化路由
- `actions/` - Server Actions
- `api/` - API 路由 (40+ 端点)
- `demo/` - Demo 页面
- `examples/` - 示例页面
- `offline/` - 离线页面

### src/lib/ 结构 (核心库 - 73+ 子目录)
**主要模块**:
| 模块 | 说明 |
|------|------|
| `ai/` | AI 相关功能 |
| `agents/` | 智能体系统 |
| `a2a/` | Agent-to-Agent 协议 |
| `auth/` | 认证授权 |
| `billing/` | 计费系统 |
| `cache/` | 缓存管理 |
| `collab/` | 协作功能 |
| `config-center/` | 配置中心 |
| `db/` | 数据库层 |
| `workflow/` | 工作流引擎 |
| `websocket/` | WebSocket 支持 |
| `realtime/` | 实时功能 |
| `search/` | 搜索功能 |
| `multi-agent/` | 多智能体 |
| `performance/` | 性能监控 |

### src/components/ 结构
- `ui/` - UI 基础组件
- `chat/` - 聊天组件
- `workflow/` - 工作流设计器
- `dashboard/` - 仪表盘
- `analytics/` - 分析组件
- ` Collaboration/` - 协作组件
- `admin/` - 管理后台

### API 路由结构 (src/app/api/)
```
api/
├── a2a/           # A2A 协议端点
├── admin/         # 管理 API
├── analytics/     # 分析 API
├── audit/         # 审计 API
├── auth/          # 认证 API (login/logout/register/me/token/verify/refresh/permissions)
├── billing/       # 计费 API
├── data/          # 数据 API
├── database/      # 数据库 API
├── export/        # 导出 API
├── feedback/     # 反馈 API
├── github/        # GitHub 集成
├── health/        # 健康检查
├── import/        # 导入 API
├── metrics/       # 指标 API
├── monitoring/    # 监控 API
├── multimodal/    # 多模态 API
├── performance/   # 性能 API
├── projects/      # 项目 API
├── rate-limit/    # 限流 API
├── ratings/       # 评分 API
├── rbac/          # 权限 API
├── reports/       # 报告 API
├── search/        # 搜索 API
├── stream/        # 流式 API
├── user/          # 用户 API
├── v1/            # v1 版本 API
├── workflow/      # 工作流 API
└── websocket/     # WebSocket API
```

---

## 🔧 核心模块职责

### 1. 数据库层 (src/lib/db/)
- `index-unified.ts` - 统一数据库入口
- `cache.ts` - 缓存管理
- `connection-pool.ts` - 连接池
- `performance-logger.ts` - 性能日志
- 包含迁移脚本和查询优化

### 2. 认证授权 (src/lib/auth/)
- JWT 实现
- RBAC 权限中间件
- Session 管理
- 审计日志

### 3. 工作流引擎 (src/lib/workflow/)
- 工作流设计器组件
- 执行引擎
- 版本管理

### 4. 协作系统 (src/lib/collab/, src/lib/collaboration/)
- 实时协作
- WebSocket 管理
- 冲突解决

### 5. AI/Agents (src/lib/ai/, src/lib/agents/)
- AI 模型集成
- 智能体管理
- 多智能体协作

---

## ⚠️ 潜在循环依赖

### 检测到的相对导入 (../)
以下文件存在相对路径导入，可能存在循环依赖风险：
```
src/lib/audit-log/storage/memory-storage.ts
src/lib/audit-log/storage/file-storage.ts
src/lib/db/cache.ts
src/lib/db/index-unified.ts
src/lib/db/migrations.ts
src/lib/db/feedback.ts
src/lib/db/performance-logger.ts
... (共 50+ 文件)
```

### 主要风险点
1. **lib/db ↔ lib/logger** - feedback.ts 等从 ../logger 导入
2. **lib/db ↔ lib/errors** - index-unified.ts 使用 ../errors/unified-error
3. **lib/db ↔ lib/middleware** - performance-logger.ts 从 ../middleware/db-performance 导入

### 依赖关系
```
db/index-unified.ts
├── errors/unified-error.ts
├── errors/unified-types.ts
└── logger

db/feedback.ts
├── db/index (getDatabaseAsync)
└── logger

db/performance-logger.ts
├── middleware/db-performance
└── logger
```

---

## 🌐 API 架构概览

### 认证 API (/api/auth/)
- `login` - 用户登录
- `logout` - 用户登出
- `register` - 用户注册
- `me` - 获取当前用户
- `token` - Token 管理
- `verify` - 验证 Token
- `refresh` - 刷新 Token
- `permissions` - 权限查询

### 业务 API 分类
| 分类 | 端点数 | 主要功能 |
|------|--------|---------|
| 核心业务 | ~15 | projects, workflow, data, export/import |
| 监控运维 | ~12 | health, metrics, monitoring, performance |
| 用户系统 | ~8 | user, auth, ratings, feedback |
| 协作功能 | ~6 | collab, realtime, websocket |
| AI/Agent | ~6 | ai, agents, a2a, multimodal |

### 特点
1. **RESTful 风格** - 资源导向 URL
2. **版本化** - `/api/v1/` 用于版本过渡
3. **分层** - API 路由清晰分离
4. **监控完善** - 内置 health, metrics, performance 端点

---

## 🗄️ 数据库架构

**注意**: 未发现 Prisma schema 文件，项目可能使用：
- **SQLite** (better-sqlite3) - 轻量级嵌入式数据库
- **文件存储** - 用于审计日志、备份等

### 数据库相关文件
- `src/lib/db/index-unified.ts` - 统一入口
- `src/lib/db/cache.ts` - 缓存层
- `src/lib/db/connection-pool.ts` - 连接池
- `src/lib/db/migrations.ts` - 数据迁移

---

## 🏥 架构健康度评分

| 维度 | 评分 | 说明 |
|------|------|------|
| **目录结构** | 4/5 | 结构清晰，但 lib 下子目录过多(73+)，略显臃肿 |
| **模块化** | 4/5 | 职责分离良好，部分模块边界模糊 |
| **循环依赖** | 3/5 | 存在风险但可控，建议使用 madge 检测 |
| **API 设计** | 4/5 | RESTful 清晰，版本化支持好 |
| **类型安全** | 4/5 | TypeScript 全面使用，types 目录完善 |
| **测试覆盖** | 4/5 | 有 `__tests__` 目录，测试文件齐全 |
| **可维护性** | 3/5 | 大型项目需要更严格的模块边界 |

**总体评分: 3.7/5**

---

## 📋 改进建议

### 高优先级
1. **循环依赖治理**
   - 使用 `npm run dep:check` (madge) 定期检测
   - 考虑提取 shared types 到独立包
   - 避免 lib 内部直接相互导入

2. **模块合并/拆分**
   - `lib/collaboration` 和 `lib/collab` 名称相似，考虑合并
   - `lib/error` 和 `lib/errors` 重复，选择其一
   - 大型模块(ai, agents, workflow)考虑提取为独立 packages

3. **数据库 Schema 文档化**
   - 添加 Prisma schema 或 SQL 迁移文件
   - 记录 ER 图和数据字典

### 中优先级
4. **API 统一响应格式**
   - 确认所有 API 使用统一的 `unified-response.ts`
   
5. **中间件整合**
   - 检查 middleware 目录和 lib 下中间件是否有重复

6. **组件库整理**
   - `components/ui` 外的组件可考虑按功能域组织

### 低优先级
7. **国际化重构**
   - `[locale]/` 路由支持多语言是好的，但需确保完整覆盖

8. **文档完善**
   - 补充 API 文档 (OpenAPI/Swagger)
   - 更新 README 说明项目结构

---

## 📊 总结

**优点**:
- 架构完整，功能模块丰富
- TypeScript 类型安全
- 有测试覆盖和 CI/CD 脚本
- API 版本化支持好

**风险**:
- lib 目录过于庞大(73+ 子目录)，建议拆分
- 存在循环依赖隐患，需定期检测
- 数据库 schema 缺失，不利于团队协作

**下一步行动**:
1. 运行 `npm run dep:check` 生成依赖图
2. 考虑将大型模块(workflow, ai, agents)提取为独立 packages
3. 补充数据库 schema 和文档
