# 架构审查报告 - 7zi-frontend

**日期**: 2026-03-28
**架构师**: AI架构师

## 📊 当前架构概览

### 技术栈

- **框架**: Next.js 16.2.1 (App Router) + React 19.2.4
- **状态管理**: Zustand 5.0.12
- **UI库**: Radix UI + Lucide React + Tailwind CSS
- **3D渲染**: Three.js + React Three Fiber
- **实时通信**: Socket.IO
- **测试**: Vitest + Playwright

### 架构模式

```
src/
├── app/          # Next.js App Router (Server Components优先)
├── components/   # 功能组件分层 (19+ 个子目录)
├── lib/          # 业务逻辑层 (35+ 个模块)
├── stores/       # Zustand 状态管理
├── contexts/     # React Context
├── hooks/        # 自定义 Hooks
└── i18n/         # 国际化 (next-intl)
```

## ✅ 优势

### 1. **性能优化到位**

- ✅ React Compiler 启用
- ✅ Turbopack 加速构建
- ✅ Webpack分包策略极其详细 (9个cacheGroups)
- ✅ 包体积严格控制 (maxEntrypointSize: 300KB)
- ✅ 服务端外部包配置正确 (sharp, better-sqlite3)

### 2. **分层清晰**

- ✅ 组件按业务功能分组 (dashboard, meeting, chat, etc.)
- ✅ lib/ 层职责明确 (auth, db, cache, websocket, etc.)
- ✅ 类型定义集中管理 (src/types/)

### 3. **安全配置完善**

- ✅ 严格的HTTP安全头 (HSTS, X-Frame-Options, etc.)
- ✅ CSP配置 (特别是SVG)
- ✅ 权限管理 (src/lib/permissions)

### 4. **测试覆盖良好**

- ✅ 单元测试 (Vitest)
- ✅ E2E测试 (Playwright)
- ✅ API集成测试
- ✅ **tests**/ 目录结构合理

## ⚠️ 问题识别

### 1. **组件结构过度碎片化**

**问题**: 19+ 个组件子目录,部分职责重叠

```
components/
├── shared/      # 通用组件?
├── ui/         # UI基础组件?
├── fallbacks/  # 错误降级?
├── errors/     # 错误处理?
```

**影响**:

- 开发者难以定位组件
- 可能存在重复代码
- 维护成本增加

**建议**:

- 合并相似目录: `errors/` + `fallbacks/` → `error-handling/`
- 明确 `shared/` vs `ui/` 职责边界
- 考虑将通用UI组件迁移到 `ui/`, 业务组件保留在 `components/`

### 2. **lib/ 层职责过重**

**问题**: 35+ 个子模块,部分功能交叉

```
lib/
├── api/         # API客户端?
├── services/    # 服务层?
├── agent/       # Agent相关?
├── agents/      # 复数?
├── agent-communication/  # Agent通信?
```

**影响**:

- 循环依赖风险
- 职责边界模糊

**建议**:

- 重构 Agent 模块: `agent/`, `agents/`, `agent-communication/` → `agent/`
- 统一 API 层: 合并 `api/` 和 `services/` 中非数据库相关服务
- 建立清晰的依赖图 (使用 `madge` 或 `dependency-cruiser`)

### 3. **缺少领域驱动设计 (DDD)**

**问题**: 结构偏向技术分层,而非业务领域

```
当前: app/, components/, lib/, stores/
理想: meeting/, chat/, collaboration/, analytics/
```

**影响**:

- 跨模块重构困难
- 新开发者难以理解业务上下文

**建议**: **不立即重构**,但建议:

- 使用 path alias 明确业务边界: `@/modules/meeting/`, `@/modules/chat/`
- 为新功能采用 Feature-based Slicing

### 4. **状态管理策略不一致**

**问题**: 同时存在 `stores/` (Zustand) 和 `contexts/` (React Context)

```
stores/        # Zustand
contexts/      # React Context
```

**影响**:

- 状态管理方式不统一
- 可能存在重复状态

**建议**:

- 明确使用规则:
  - Zustand: 全局状态、跨组件共享状态
  - Context: 主题、国际化、Provider模式
- 审查现有 `contexts/` 是否都可以迁移到 Zustand

### 5. **Next.js 配置过于复杂**

**问题**: Webpack配置超过150行,cacheGroups配置过于细粒度

```typescript
// next.config.ts
cacheGroups: {
  'three-libs': { priority: 60, maxSize: 300000 },
  'chart-libs': { priority: 50, maxSize: 200000 },
  // ... 7个自定义 group
}
```

**影响**:

- 构建时间增加
- 维护困难
- 过度优化 (可能是 micro-optimization)

**建议**:

- 简化为3个核心分组: `vendor`, `framework`, `common`
- 让 Webpack 自动分包,只在必要时手动干预
- 使用 Bundle Analyzer 验证简化后的效果

## 🎯 改进建议 (优先级排序)

### P0 (立即执行)

1. **合并 `lib/agent*` 模块** → 减少目录碎片化
2. **明确状态管理规范** → Zustand vs Context 使用边界
3. **运行依赖分析** → 检测循环依赖

```bash
# 安装依赖分析工具
npm install -D madge

# 检查循环依赖
npx madge --circular src/
```

### P1 (本迭代)

4. **重构组件目录结构**

   ```
   components/
   ├── ui/              # 基础UI组件 (按钮、输入框等)
   ├── layouts/         # 布局组件
   ├── features/        # 业务功能组件
   │   ├── meeting/
   │   ├── chat/
   │   └── ...
   └── error-handling/  # 错误处理组件
   ```

5. **简化 Webpack 配置**
   ```typescript
   cacheGroups: {
     vendor: {
       test: /[\\/]node_modules[\\/]/,
       name: 'vendors',
       chunks: 'all',
     },
     framework: {
       test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
       name: 'framework',
       priority: 10,
     },
   }
   ```

### P2 (下个版本)

6. **引入 Feature-based 目录结构** (可选)

   ```
   src/
   ├── features/
   │   ├── meeting/
   │   │   ├── components/
   │   │   ├── hooks/
   │   │   ├── store.ts
   │   │   └── types.ts
   │   └── chat/
   │       └── ...
   └── shared/          # 通用工具、组件、hooks
   ```

7. **建立架构决策记录 (ADR)**
   - 创建 `docs/architecture/adr-001-zustand-vs-context.md`
   - 记录每个架构决策的原因和权衡

## 📈 架构健康度评分

| 维度       | 评分 | 说明                       |
| ---------- | ---- | -------------------------- |
| 分层清晰度 | 7/10 | 清晰但有碎片化问题         |
| 可维护性   | 6/10 | lib/ 层过于复杂            |
| 性能优化   | 9/10 | Webpack配置过度,但有效     |
| 可扩展性   | 7/10 | 缺少DDD,但App Router支持好 |
| 测试覆盖   | 8/10 | 单元测试+E2E完善           |
| 文档完整性 | 7/10 | 技术文档多,但缺少架构图    |

**总体评分**: **7.3/10** (良好,有改进空间)

## 🔧 快速改进清单

- [ ] 合并 `lib/agent*` 目录 (1天)
- [ ] 统一状态管理策略 (2天)
- [ ] 运行循环依赖检测 (0.5天)
- [ ] 简化 Webpack 配置 (0.5天)
- [ ] 重构组件目录结构 (3天)
- [ ] 建立架构决策记录 (ADR) (1天)

## 📝 结论

7zi-frontend 项目架构整体**健康**,技术选型先进 (Next.js 16 + React 19 + Turbopack),性能优化到位。

主要问题集中在**目录结构碎片化**和**lib/ 层职责过重**,这些问题不影响当前开发,但会在项目规模扩大后成为瓶颈。

**建议采用渐进式重构**,优先解决 P0 问题,避免大爆炸式重构。

---

**架构师**: AI架构师
**审核人**: 待定
**下次审查**: 2026-04-28
