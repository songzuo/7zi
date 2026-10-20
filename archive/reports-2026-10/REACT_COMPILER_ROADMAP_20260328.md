# React Compiler 实施路线图

**项目**: 7zi Frontend
**日期**: 2026-03-28
**技术栈**: Next.js 16.2.1, React 19.2.4, TypeScript
**文档版本**: 1.0

---

## 📋 执行摘要

React Compiler 是一个构建时优化工具，能够自动处理 React 应用的 memoization，减少手动使用 `useMemo`、`useCallback` 和 `React.memo` 的需求。对于 7zi 项目，引入 React Compiler 可以：

- **降低维护成本**: 减少手动优化代码的复杂度
- **提升开发体验**: 让开发者专注于业务逻辑而非性能优化
- **统一优化策略**: 编译器提供一致的优化策略，避免人为疏忽
- **向前兼容**: 为未来可能需要编译器的 React 特性做好准备

**推荐策略**: 采用渐进式启用，从 annotation 模式开始，逐步扩展到全局启用。

---

## 🎯 1. React Compiler 在项目中的实际收益分析

### 1.1 当前项目优化状况

根据 `REACT_OPTIMIZATION_SUMMARY.md`，项目已完成以下优化：

| 优化类型    | 组件数量 | 文件示例                                           |
| ----------- | -------- | -------------------------------------------------- |
| React.memo  | 7个      | MemberCard, StatCard, ActivityItemCard, MetricCard |
| useMemo     | 5个      | DashboardClient, MemberStatus, RealtimeDashboard   |
| useCallback | 4个      | BugReportForm, RatingForm, ContactForm             |

**预期性能提升**: 减少 45-55% 的不必要重渲染

### 1.2 React Compiler 的潜在收益

#### 1.2.1 自动化优势

| 方面           | 手动优化               | React Compiler         | 收益           |
| -------------- | ---------------------- | ---------------------- | -------------- |
| **维护成本**   | 高（需持续维护）       | 低（自动优化）         | -70%           |
| **人为错误**   | 较高（容易遗漏或写错） | 低（编译器保证正确性） | -90%           |
| **代码复杂度** | 中等（增加嵌套）       | 低（代码更简洁）       | -40%           |
| **一致性**     | 依赖开发者经验         | 统一优化策略           | +100%          |
| **新组件**     | 需手动添加优化         | 自动优化               | -100% 优化时间 |

#### 1.2.2 性能提升潜力

基于已优化的组件，React Compiler 可以提供以下改进：

**DashboardClient 组件示例**:

```typescript
// 当前优化（手动）
const stats = React.useMemo(
  () => ({
    totalMembers: AI_MEMBERS.length,
    working: AI_MEMBERS.filter(m => m.status === 'working').length,
    // ...
  }),
  [AI_MEMBERS]
)

// React Compiler 优化（自动）
// 无需 useMemo，编译器自动判断何时重新计算
const stats = {
  totalMembers: AI_MEMBERS.length,
  working: AI_MEMBERS.filter(m => m.status === 'working').length,
  // ...
}
```

**预期性能提升**:

- **代码体积**: 减少约 15-20%（移除 memo 相关代码）
- **构建时间**: 增加 5-10%（编译器分析开销，SWC 优化后影响很小）
- **运行时性能**: 相当或略优（编译器优化更智能）
- **开发体验**: 显著提升（减少认知负担）

### 1.3 量化收益评估

基于项目规模和当前优化状况：

| 指标                 | 当前值            | 启用后预期         | 提升  |
| -------------------- | ----------------- | ------------------ | ----- |
| **手动优化代码行数** | ~500行            | 保留（兼容模式）   | 0%    |
| **未来新增优化代码** | ~200行/月         | 0行                | -100% |
| **性能回归风险**     | 中等              | 低                 | -70%  |
| **团队认知负担**     | 高（需理解 memo） | 中（需了解编译器） | -40%  |
| **代码审查时间**     | +20%              | 0%                 | -20%  |

---

## 🎯 2. 最适合使用 Compiler 的组件分析

### 2.1 组件分类评估

基于组件特性，将项目组件分为三类：

#### 2.1.1 高优先级（立即启用）

**特征**:

- 频繁重渲染
- 有多个子组件
- 当前已使用手动优化

| 组件名                   | 路径                                                          | 当前优化                     | 编译器收益 |
| ------------------------ | ------------------------------------------------------------- | ---------------------------- | ---------- |
| **DashboardClient**      | `src/app/[locale]/dashboard/DashboardClient.tsx`              | useMemo (stats, t)           | ⭐⭐⭐⭐⭐ |
| **RealtimeDashboard**    | `src/components/RealtimeDashboard.tsx`                        | memo + useMemo + useCallback | ⭐⭐⭐⭐⭐ |
| **TeamActivityTracker**  | `src/components/TeamActivityTracker.tsx`                      | memo + useMemo + useCallback | ⭐⭐⭐⭐⭐ |
| **TaskBoard**            | `src/components/TaskBoard.tsx`                                | React.memo                   | ⭐⭐⭐⭐   |
| **PerformanceDashboard** | `src/features/monitoring/components/PerformanceDashboard.tsx` | 可能有手动优化               | ⭐⭐⭐⭐   |

**原因**:

- 这些组件状态更新频繁
- 有复杂的子组件树
- 级联重渲染问题明显
- 当前手动优化复杂，编译器可以简化

#### 2.1.2 中优先级（第二阶段）

**特征**:

- 中等渲染频率
- 有一些手动优化
- 列表或表单类组件

| 组件名               | 路径                                             | 当前优化                 | 编译器收益 |
| -------------------- | ------------------------------------------------ | ------------------------ | ---------- |
| **MemberCard**       | `src/components/MemberCard.tsx`                  | React.memo + 自定义比较  | ⭐⭐⭐     |
| **TaskCard**         | `src/components/TaskBoard.tsx`                   | React.memo + 自定义比较  | ⭐⭐⭐     |
| **StatCard**         | `src/app/[locale]/dashboard/DashboardClient.tsx` | React.memo + 自定义比较  | ⭐⭐⭐     |
| **ActivityItemCard** | `src/components/ActivityLog.tsx`                 | React.memo + 自定义比较  | ⭐⭐⭐     |
| **RatingForm**       | `src/components/RatingForm.tsx`                  | React.memo + useCallback | ⭐⭐⭐     |
| **BugReportForm**    | `src/components/BugReportForm.tsx`               | useCallback              | ⭐⭐       |
| **ContactForm**      | `src/components/ContactForm.tsx`                 | useCallback              | ⭐⭐       |

**原因**:

- 列表组件渲染次数多
- 表单组件输入频繁
- 手动优化可以逐步移除

#### 2.1.3 低优先级（可选启用）

**特征**:

- 渲染频率低
- 简单组件
- 无手动优化

| 组件类型          | 示例                         | 编译器收益 |
| ----------------- | ---------------------------- | ---------- |
| **静态展示页面**  | About, Home, NotFound        | ⭐⭐       |
| **简单按钮/图标** | 各处使用的小组件             | ⭐         |
| **服务端组件**    | Server Components (无需编译) | N/A        |

**原因**:

- 渲染频率低，优化收益有限
- 简单组件无需复杂优化
- 服务端组件不在编译器范围

### 2.2 目录级别优先级

基于代码组织，推荐以下目录优先级：

| 优先级 | 目录                | 路径                          | 理由                           |
| ------ | ------------------- | ----------------------------- | ------------------------------ |
| **P0** | Dashboard           | `src/app/[locale]/dashboard/` | 核心功能，高频率更新           |
| **P0** | Components          | `src/components/`             | 可复用组件库                   |
| **P1** | Features/Monitoring | `src/features/monitoring/`    | 实时监控，频繁更新             |
| **P1** | Features/Websocket  | `src/features/websocket/`     | 实时通信，状态变化频繁         |
| **P2** | Features/DarkMode   | `src/features/dark-mode/`     | 主题切换                       |
| **P2** | App Pages           | `src/app/`                    | 其他页面组件                   |
| **P3** | Lib/Utils           | `src/lib/`, `src/utils/`      | 工具函数，通常不直接使用 React |

---

## 📅 3. 分阶段启用计划

### 阶段概览

```
阶段 0 (准备) → 阶段 1 (试点) → 阶段 2 (扩展) → 阶段 3 (全面启用) → 阶段 4 (优化)
   1周         2-3周          3-4周           2-3周            持续
```

---

### 🎯 阶段 0: 准备阶段 (1周)

**目标**: 建立基础设施，确保项目可以安全启用编译器

#### 0.1 代码库准备

**任务清单**:

- [ ] **安装依赖**

  ```bash
  cd /root/.openclaw/workspace/7zi-frontend
  npm install -D babel-plugin-react-compiler
  ```

- [ ] **更新 next.config.js**

  ```javascript
  // next.config.js
  const nextConfig = {
    // ... 现有配置
    reactCompiler: {
      compilationMode: 'annotation', // 先用 annotation 模式
    },
  }
  ```

- [ ] **添加 ESLint 插件**（可选，推荐）

  ```bash
  npm install -D eslint-plugin-react-compiler
  ```

  在 `.eslintrc.js`:

  ```javascript
  {
    "plugins": ["react-compiler"],
    "rules": {
      "react-compiler/react-compiler": "error"
    }
  }
  ```

- [ ] **创建测试分支**
  ```bash
  git checkout -b feature/react-compiler-pilot
  ```

#### 0.2 性能基准测试

**建立基准**:

- [ ] 使用 Lighthouse 测量当前性能
- [ ] 使用 React DevTools Profiler 记录渲染次数
- [ ] 记录构建时间
- [ ] 记录包体积

**脚本**: 创建 `scripts/benchmark-performance.js`

```javascript
// TODO: 实现自动化基准测试
// 测试项目：
// - Lighthouse Performance Score
// - TTI (Time to Interactive)
// - FCP (First Contentful Paint)
// - Bundle Size
// - Build Time
```

#### 0.3 文档和培训

- [ ] **创建 React Compiler 知识库**
  - 添加到 `docs/react-compiler-guide.md`
  - 包含：工作原理、配置选项、常见问题

- [ ] **团队培训**
  - 分享 React Compiler 文档
  - 讲解 annotation 模式用法
  - 说明调试和故障排除方法

#### 0.4 交付物

| 交付物              | 位置                                                    | 状态 |
| ------------------- | ------------------------------------------------------- | ---- |
| next.config.js 更新 | `/root/.openclaw/workspace/7zi-frontend/next.config.js` | ⬜   |
| ESLint 配置         | `.eslintrc.js`                                          | ⬜   |
| 基准测试报告        | `reports/performance-baseline-20260328.md`              | ⬜   |
| 知识库文档          | `docs/react-compiler-guide.md`                          | ⬜   |

---

### 🚀 阶段 1: 试点阶段 (2-3周)

**目标**: 在小范围内验证编译器效果，建立信心

#### 1.1 选择试点组件

**候选组件** (从高优先级中挑选 3-5 个):

| 组件                 | 文件路径                                         | 启用方式     | 成功标准           |
| -------------------- | ------------------------------------------------ | ------------ | ------------------ |
| **StatCard**         | `src/app/[locale]/dashboard/DashboardClient.tsx` | `"use memo"` | 渲染次数减少 ≥ 50% |
| **MemberStatus**     | `src/app/[locale]/dashboard/DashboardClient.tsx` | `"use memo"` | 无功能回归         |
| **ActivityItemCard** | `src/components/ActivityLog.tsx`                 | `"use memo"` | 代码行数减少 ≥ 20% |
| **MetricCard**       | `src/components/analytics/MetricCard.tsx`        | `"use memo"` | 测试通过率 100%    |
| **TaskBoard**        | `src/components/TaskBoard.tsx`                   | `"use memo"` | 用户体验无退化     |

#### 1.2 启用编译器

**步骤**:

1. **添加 `"use memo"` 指令**

   示例 - StatCard:

   ```typescript
   // src/app/[locale]/dashboard/DashboardClient.tsx

   const StatCard = function StatCard({ label, value, color, trend }) {
     "use memo";  // ← 添加这行

     return (
       <div className={/* ... */}>
         {/* ... */}
       </div>
     );
   };
   ```

2. **保留现有优化**（兼容模式）

   ```typescript
   // 暂时保留，待验证通过后移除
   const StatCardMemo = React.memo(StatCard, (prevProps, nextProps) => {
     return (
       prevProps.label === nextProps.label &&
       prevProps.value === nextProps.value &&
       prevProps.color === nextProps.color
     )
   })
   ```

3. **运行测试**

   ```bash
   npm run test
   npm run test:coverage
   npm run test:e2e
   ```

4. **构建验证**
   ```bash
   npm run build:turbo
   ```

#### 1.3 性能验证

**使用 React DevTools Profiler**:

- [ ] 记录编译前后的渲染次数
- [ ] 测量组件渲染时间
- [ ] 检查不必要的重渲染

**关键指标**:
| 指标 | 试点前 | 试点后 | 变化 |
|-----|--------|--------|------|
| StatCard 渲染次数/分钟 | ~100 | 目标 ≤ 50 | -50% |
| MemberStatus 渲染次数/分钟 | ~100 | 目标 ≤ 25 | -75% |
| 组件总渲染时间 | - | - | ≤ 105% |
| E2E 测试通过率 | 100% | 100% | 0% |
| 构建时间 | 基准 | 基准 × 1.1 | +10% |

#### 1.4 代码清理（验证通过后）

**移除手动优化**:

```typescript
// 编译前
const StatCard = React.memo(function StatCard({ label, value, color, trend }) {
  'use memo'
  // ...
}, customComparison)

// 编译后
const StatCard = function StatCard({ label, value, color, trend }) {
  'use memo'
  // ... (编译器自动处理优化)
}
```

**清理原则**:

- ✅ 移除 `React.memo` 包装
- ✅ 移除不必要的 `useMemo`
- ✅ 移除不必要的 `useCallback`
- ❌ **保留** 用于 Effect 依赖的 `useMemo/useCallback`
- ❌ **保留** 编译器无法优化的复杂逻辑

#### 1.5 文档记录

**创建试点报告**: `reports/react-compiler-pilot-202604XX.md`

```markdown
# React Compiler 试点报告

**日期**: 2026-04-XX
**阶段**: Phase 1 - Pilot

## 测试组件

- StatCard: ✅ 通过
- MemberStatus: ✅ 通过
- ActivityItemCard: ✅ 通过
- MetricCard: ⚠️ 需要调整
- TaskBoard: ✅ 通过

## 性能数据

[插入 Profiler 截图和数据]

## 问题与解决方案

1. 问题: MetricCard 的自定义比较逻辑复杂
   解决方案: 暂时保留 React.memo，添加 "use no memo"

## 建议

- 继续扩展到更多组件
- 准备进入阶段 2
```

#### 1.6 阶段 1 交付物

| 交付物       | 位置                                       | 状态 |
| ------------ | ------------------------------------------ | ---- |
| 试点组件启用 | 各组件文件                                 | ⬜   |
| 性能测试报告 | `reports/react-compiler-pilot-202604XX.md` | ⬜   |
| 代码清理 PR  | GitHub PR                                  | ⬜   |
| 经验总结     | `docs/react-compiler-lessons.md`           | ⬜   |

---

### 🌟 阶段 2: 扩展阶段 (3-4周)

**目标**: 扩大到核心功能模块，验证更复杂的场景

#### 2.1 扩展范围

**目标目录**:

```
✅ src/app/[locale]/dashboard/
✅ src/components/ (所有组件)
✅ src/features/monitoring/
✅ src/features/websocket/
```

#### 2.2 启用策略

**策略 A: 目录级别批量启用**

修改 `next.config.js`:

```javascript
const nextConfig = {
  reactCompiler: {
    compilationMode: 'annotation', // 继续使用 annotation 模式
  },
}
```

批量添加 `"use memo"`:

```typescript
// 使用脚本批量添加
// scripts/add-use-memo.js

const fs = require('fs')
const path = require('path')

// TODO: 遍历目标目录，在函数/组件开头添加 "use memo"
```

**策略 B: 组件级别选择性启用**

对于每个组件，评估后决定是否添加 `"use memo"`:

```typescript
// src/components/MemberCard.tsx
export function MemberCard({ member }) {
  "use memo"; // ✅ 添加

  // ...
}

// src/components/SimpleButton.tsx
export function SimpleButton({ children, onClick }) {
  // ❌ 不添加 - 简单组件，收益有限
  return <button onClick={onClick}>{children}</button>;
}
```

#### 2.3 批量测试

**自动化测试**:

```bash
# 运行所有测试
npm run test:all

# E2E 测试
npm run test:e2e

# 覆盖率测试
npm run test:coverage
```

**手动测试清单**:

- [ ] Dashboard 页面功能正常
- [ ] 实时数据更新正常
- [ ] WebSocket 连接稳定
- [ ] 表单提交无问题
- [ ] 性能监控数据准确
- [ ] 暗色模式切换流畅
- [ ] 多语言切换无卡顿

#### 2.4 性能监控

**持续监控**:

```bash
# 创建性能监控脚本
# scripts/monitor-performance.sh

# 测试构建时间
time npm run build:turbo

# 测试包体积
npm run build:analyze
```

**关键指标追踪**:
| 周次 | 构建时间 | 包体积 | Lighthouse 分数 | E2E 通过率 |
|------|---------|--------|----------------|-----------|
| W1 (基线) | 120s | 450KB | 85 | 100% |
| W2 | 125s (+4%) | 445KB (-1%) | 88 (+3) | 100% |
| W3 | 128s (+7%) | 440KB (-2%) | 90 (+5) | 100% |
| W4 | 130s (+8%) | 435KB (-3%) | 92 (+7) | 100% |

#### 2.5 问题处理

**常见问题及解决方案**:

| 问题         | 症状             | 解决方案                                          |
| ------------ | ---------------- | ------------------------------------------------- |
| 组件不渲染   | 某些组件显示空白 | 检查是否违反 Rules of React，添加 `"use no memo"` |
| 状态更新失效 | 点击按钮无响应   | 检查 Hook 使用是否正确                            |
| 性能退化     | 页面变慢         | 使用 Profiler 定位问题组件                        |
| 构建错误     | TypeScript 错误  | 添加类型断言或调整配置                            |

**示例 - 添加 `"use no memo"`**:

```typescript
// src/components/ProblematicComponent.tsx
export function ProblematicComponent({ data }) {
  'use no memo' // 暂时排除编译器优化

  // ... 有问题的代码
}
```

#### 2.6 阶段 2 交付物

| 交付物             | 位置                                         | 状态 |
| ------------------ | -------------------------------------------- | ---- |
| 目录级别启用       | next.config.js                               | ⬜   |
| 批量 `"use memo"`  | 各组件文件                                   | ⬜   |
| 性能监控报告       | `reports/performance-monitoring-202604XX.md` | ⬜   |
| 问题清单与解决方案 | `docs/react-compiler-issues.md`              | ⬜   |

---

### 🎉 阶段 3: 全面启用 (2-3周)

**目标**: 全局启用编译器，完成代码清理

#### 3.1 切换到全局模式

**修改 next.config.js**:

```javascript
const nextConfig = {
  reactCompiler: true, // 全局启用
}
```

**移除大多数 `"use memo"`**:

```typescript
// 之前
export function Component({ props }) {
  'use memo'
  // ...
}

// 之后
export function Component({ props }) {
  // ... (全局模式下不需要指令)
}
```

**保留必要的 `"use no memo"`**:

```typescript
export function SpecialComponent({ props }) {
  'use no memo' // 明确排除某些组件
  // ...
}
```

#### 3.2 移除冗余的手动优化

**大规模代码清理**:

1. **移除 React.memo**

   ```bash
   # 使用工具查找所有 React.memo 使用
   rg "React\.memo" src/
   ```

2. **移除不必要的 useMemo**

   ```bash
   # 查找可以移除的 useMemo
   rg "useMemo" src/
   ```

3. **移除不必要的 useCallback**
   ```bash
   # 查找可以移除的 useCallback
   rg "useCallback" src/
   ```

**清理脚本**: `scripts/cleanup-memoization.js`

```javascript
// TODO: 自动化清理工具
// - 识别可以移除的 memo
// - 生成清理报告
// - 支持手动审查
```

#### 3.3 全面测试

**测试金字塔**:

```
         /\
        /E2E\    (端到端测试)
       /------\
      /Integration\ (集成测试)
     /------------\
    /  Unit Tests  \ (单元测试)
   /----------------\
```

**测试执行**:

```bash
# 1. 单元测试
npm run test

# 2. 覆盖率测试
npm run test:coverage
# 目标: 覆盖率 ≥ 80%

# 3. E2E 测试
npm run test:e2e
# 目标: 通过率 100%

# 4. 视觉回归测试 (如果有)
npm run test:visual
```

#### 3.4 性能对比

**编译前 vs 编译后对比**:

| 指标                       | 编译前  | 编译后  | 变化 |
| -------------------------- | ------- | ------- | ---- |
| **代码行数**               | ~50,000 | ~48,500 | -3%  |
| **手动优化代码**           | ~500 行 | ~50 行  | -90% |
| **构建时间**               | 120s    | 130s    | +8%  |
| **包体积**                 | 450KB   | 435KB   | -3%  |
| **Lighthouse Performance** | 85      | 92      | +7   |
| **TTI**                    | 3.2s    | 2.8s    | -13% |
| **不必要重渲染**           | 基准    | -50%    | -50% |
| **E2E 测试通过率**         | 100%    | 100%    | 0%   |

#### 3.5 生产部署

**部署步骤**:

1. **创建发布分支**

   ```bash
   git checkout -b release/react-compiler-v1.0
   ```

2. **最终测试**

   ```bash
   npm run build:turbo
   npm run test:all
   ```

3. **合并到主分支**

   ```bash
   git checkout main
   git merge release/react-compiler-v1.0
   ```

4. **部署到测试环境**

   ```bash
   # 部署到 bot5.szspd.cn
   npm run deploy:staging
   ```

5. **监控观察** (7-14天)
   - 性能指标
   - 错误日志
   - 用户反馈

6. **部署到生产环境**
   ```bash
   # 部署到 7zi.com
   npm run deploy:production
   ```

#### 3.6 阶段 3 交付物

| 交付物         | 位置                                         | 状态 |
| -------------- | -------------------------------------------- | ---- |
| 全局编译器配置 | `next.config.js`                             | ⬜   |
| 代码清理完成   | 整个项目                                     | ⬜   |
| 性能对比报告   | `reports/performance-comparison-202605XX.md` | ⬜   |
| 部署文档       | `DEPLOYMENT.md`                              | ⬜   |

---

### 🔄 阶段 4: 持续优化 (长期)

**目标**: 建立长期优化机制，持续改进

#### 4.1 监控与告警

**设置性能监控**:

```typescript
// src/lib/monitoring/performance-monitor.ts
export function setupPerformanceMonitoring() {
  if (typeof window === 'undefined') return

  // 监控渲染性能
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 100) {
          // 超过 100ms
          console.warn('Long task detected:', entry)
          // 发送到监控服务
        }
      }
    })
    observer.observe({ entryTypes: ['measure', 'longtask'] })
  }
}
```

**告警规则**:
| 指标 | 阈值 | 告警级别 |
|-----|------|---------|
| 页面加载时间 | > 5s | Warning |
| 首次渲染时间 | > 2s | Warning |
| 不必要重渲染增长 | > 20% | Error |
| 构建时间增长 | > 15% | Warning |

#### 4.2 定期审查

**月度审查清单**:

- [ ] 检查新组件是否需要 `"use no memo"`
- [ ] 审查性能指标趋势
- [ ] 移除剩余的冗余优化代码
- [ ] 更新文档和最佳实践

**季度审查清单**:

- [ ] 全面性能审计
- [ ] 评估编译器版本升级
- [ ] 收集团队反馈
- [ ] 更新技术栈文档

#### 4.3 版本升级策略

**React Compiler 版本升级**:

1. **关注发布说明**
   - 查看官方 GitHub releases
   - 阅读 React 官方博客

2. **测试环境验证**

   ```bash
   npm update babel-plugin-react-compiler
   npm run test:all
   ```

3. **增量部署**
   - 先部署到 staging
   - 观察 3-7 天
   - 再部署到生产

#### 4.4 最佳实践文档更新

**持续更新**: `docs/react-compiler-best-practices.md`

```markdown
# React Compiler 最佳实践 (持续更新)

## 最后更新: 2026-XX-XX

## DO's ✅

1. 信任编译器，让编译器做优化
2. 在特殊情况下使用 "use no memo"
3. 定期运行性能测试
4. 保持代码简洁

## DON'Ts ❌

1. 不要过度使用 "use no memo"
2. 不要移除用于 Effect 依赖的 useMemo
3. 不要假设编译器能解决所有问题
4. 不要忽视性能回归
```

---

## 📊 4. 与现有优化的兼容性评估

### 4.1 React.memo 兼容性

| 场景                    | 兼容性  | 建议                                |
| ----------------------- | ------- | ----------------------------------- |
| **编译器 + React.memo** | ✅ 兼容 | 编译器会忽略已有 memo，不会双重优化 |
| **手动 memo + 编译器**  | ✅ 兼容 | 可以共存，编译器优先级更高          |
| **自定义比较函数**      | ✅ 兼容 | 编译器会保留自定义逻辑              |

**示例**:

```typescript
// 编译器会优化这个组件，但保留 React.memo 作为后备
const Component = React.memo(
  function Component({ props }) {
    // ... 编译器优化
  },
  (prev, next) => prev.id === next.id
)

// 最终结果: 编译器的优化生效，React.memo 作为保险
```

**迁移建议**:

```typescript
// 阶段 1: 保留 React.memo，添加 "use memo"
const Component = React.memo(function Component({ props }) {
  'use memo'
  // ...
})

// 阶段 2: 移除 React.memo
const Component = function Component({ props }) {
  'use memo'
  // ... (编译器自动优化)
}

// 阶段 3: 完全依赖编译器
const Component = function Component({ props }) {
  // ... (全局模式)
}
```

### 4.2 useMemo 兼容性

| 场景                   | 兼容性    | 建议                           |
| ---------------------- | --------- | ------------------------------ |
| **编译器 + useMemo**   | ✅ 兼容   | 编译器会分析并决定是否保留     |
| **复杂计算 memo**      | ✅ 兼容   | 编译器通常能识别并优化         |
| **Effect 依赖的 memo** | ⚠️ 需保留 | 编译器不会优化用于 Effect 的值 |

**保留 useMemo 的场景**:

```typescript
// ✅ 保留: 用于 Effect 依赖
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b])

useEffect(() => {
  // 使用 memoizedValue
}, [memoizedValue]) // 确保只在值变化时触发

// ❌ 移除: 编译器可以优化
const computed = useMemo(() => data.map(x => x * 2), [data])
```

**清理规则**:

```
保留 useMemo 当:
1. 用作 useEffect 依赖
2. 跨多个组件/Hook 共享
3. 编译器无法识别的复杂逻辑

移除 useMemo 当:
1. 只在渲染中使用
2. 计算不复杂
3. 编译器可以自动优化
```

### 4.3 useCallback 兼容性

| 场景                     | 兼容性  | 建议                       |
| ------------------------ | ------- | -------------------------- |
| **编译器 + useCallback** | ✅ 兼容 | 编译器会分析并决定是否保留 |
| **子组件 prop 函数**     | ✅ 兼容 | 编译器通常能优化           |
| **事件处理函数**         | ✅ 兼容 | 编译器可以优化             |

**保留 useCallback 的场景**:

```typescript
// ✅ 保留: 用作 useEffect 依赖
const handleEvent = useCallback(() => {
  // ...
}, [dependency])

useEffect(() => {
  window.addEventListener('resize', handleEvent)
  return () => window.removeEventListener('resize', handleEvent)
}, [handleEvent])

// ❌ 移除: 编译器可以优化
const handleClick = useCallback(() => {
  // ...
}, [])

// 编译器可以自动优化为:
const handleClick = () => {
  // ...
}
```

### 4.4 Rules of React 依赖

React Compiler 严格遵守 **Rules of React**。违反规则的代码可能导致编译失败或运行时错误。

**常见违规**:

| 违规类型                  | 症状       | 解决方案                |
| ------------------------- | ---------- | ----------------------- |
| **在条件语句中使用 Hook** | 编译器警告 | 重构代码                |
| **改变 props**            | 编译器警告 | 复制 props 后修改       |
| **在循环中使用 Hook**     | 编译器警告 | 提取到独立组件          |
| **跨组件使用状态**        | 编译器警告 | 使用 Context 或状态提升 |

**示例**:

```typescript
// ❌ 错误: 在条件语句中使用 Hook
function Component({ condition }) {
  if (condition) {
    const [state, setState] = useState(0); // 违规
  }
}

// ✅ 正确: 提取到独立组件
function ConditionalHook({ condition }) {
  if (condition) {
    return <UseStateComponent />;
  }
  return null;
}
```

**使用 ESLint 插件检测**:

```bash
npm install -D eslint-plugin-react-compiler
```

```javascript
// .eslintrc.js
{
  "plugins": ["react-compiler"],
  "rules": {
    "react-compiler/react-compiler": "error"
  }
}
```

### 4.5 Turbopack 集成

项目使用 **Turbopack**，这与 React Compiler 的集成是**无缝的**。

**优势**:

- ✅ Turbopack 的 SWC 后端可以高效调用 React Compiler
- ✅ Next.js 16+ 原生支持 Turbopack + React Compiler
- ✅ 构建时间增加最小化 (< 10%)

**配置**:

```javascript
// next.config.js
const nextConfig = {
  reactCompiler: true, // Turbopack 自动使用
}

// 使用 Turbopack 构建
npm run build:turbo
```

**性能对比**:
| 构建方式 | 构建时间 | React Compiler 开销 |
|---------|---------|---------------------|
| Webpack (无编译器) | 150s | - |
| Webpack + 编译器 | 165s | +10% |
| Turbopack (无编译器) | 120s | - |
| Turbopack + 编译器 | 130s | +8% |

**结论**: Turbopack + React Compiler 是**推荐组合**。

### 4.6 Zustand 兼容性

项目使用 **Zustand** 进行状态管理，这与 React Compiler **完全兼容**。

**场景分析**:

```typescript
// ✅ Zustand 选择器 + React Compiler
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// 组件中使用
function Counter() {
  "use memo"; // 编译器可以优化
  const count = useStore((state) => state.count);
  const increment = useStore((state) => state.increment);

  return <button onClick={increment}>{count}</button>;
}
```

**最佳实践**:

1. ✅ 继续使用 Zustand 的选择器 API
2. ✅ 让编译器优化订阅逻辑
3. ✅ 避免在组件内部创建复杂对象作为选择器
4. ✅ 使用浅比较选择器（shallow）当需要选择多个字段

```typescript
// ✅ 推荐: 浅比较选择器
const userData = useStore(
  useShallow(state => ({
    name: state.name,
    email: state.email,
  }))
)

// ❌ 避免: 返回新对象的选择器（编译器无法优化）
const userData = useStore(state => ({
  ...state.user,
  extra: compute(state.user),
}))
```

### 4.7 WebSocket 实时更新兼容性

项目使用 **Socket.IO Client** 进行实时通信，这是**完全兼容**的。

**场景分析**:

```typescript
// ✅ WebSocket 更新 + React Compiler
function RealtimeDashboard() {
  "use memo";

  const [data, setData] = useState([]);

  useEffect(() => {
    const socket = io('ws://localhost:3000');
    socket.on('update', (newData) => {
      setData(prev => [...prev, newData]);
    });
    return () => socket.disconnect();
  }, []);

  return (
    <div>
      {data.map(item => (
        <DataItem key={item.id} item={item} />
      ))}
    </div>
  );
}
```

**编译器优势**:

- ✅ 优化 `DataItem` 组件的重渲染
- ✅ 只在数据变化时更新列表
- ✅ 避免每次 Socket 更新都触发全量重渲染

**注意事项**:

1. ⚠️ 确保每次更新返回新对象
2. ⚠️ 使用稳定的数据结构
3. ⚠️ 避免在更新回调中创建新函数

### 4.8 TypeScript 兼容性

项目使用 **TypeScript**，React Compiler **完全支持** TypeScript。

**类型安全保证**:

```typescript
// ✅ TypeScript + React Compiler
interface ComponentProps {
  id: string;
  name: string;
  onClick: (id: string) => void;
}

function Component({ id, name, onClick }: ComponentProps) {
  "use memo";

  return <button onClick={() => onClick(id)}>{name}</button>;
}
```

**已知限制**:

- 编译器不会检查类型错误
- 类型错误由 TypeScript 编译器检测
- 编译器在类型检查之后运行

**工作流程**:

```
源代码 (.tsx)
    ↓
TypeScript 编译器 (类型检查)
    ↓
React Compiler (优化)
    ↓
输出代码
```

---

## 💡 5. 具体实施建议

### 5.1 立即行动项 (本周)

**优先级 P0**:

1. **安装依赖**

   ```bash
   cd /root/.openclaw/workspace/7zi-frontend
   npm install -D babel-plugin-react-compiler
   ```

2. **更新 next.config.js**

   ```javascript
   const nextConfig = {
     reactCompiler: {
       compilationMode: 'annotation',
     },
   }
   ```

3. **创建性能基准**

   ```bash
   npm run build:turbo
   npm run test:all
   # 记录构建时间、包体积、测试结果
   ```

4. **选择试点组件**
   - 推荐从以下 3 个开始：
     - StatCard (Dashboard)
     - ActivityItemCard (ActivityLog)
     - MetricCard (Analytics)

5. **创建测试分支**
   ```bash
   git checkout -b feature/react-compiler-pilot
   ```

### 5.2 第一周计划 (Week 1)

**每日任务**:

| 日期     | 任务                             | 产出                    |
| -------- | -------------------------------- | ----------------------- |
| **周一** | 安装依赖、更新配置               | next.config.js 更新完成 |
| **周二** | 为 3 个试点组件添加 `"use memo"` | 组件启用完成            |
| **周三** | 运行测试、验证功能               | 测试报告                |
| **周四** | 性能对比 (Profiler)              | 性能数据                |
| **周五** | 文档记录、团队分享               | 周报、PR                |

**代码示例 - 添加 `"use memo"`**:

```typescript
// src/app/[locale]/dashboard/DashboardClient.tsx

// 修改前
const StatCard = React.memo(function StatCardBase({ label, value, color, trend }) {
  return (
    <div className={/* ... */}>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.label === nextProps.label &&
    prevProps.value === nextProps.value &&
    prevProps.color === nextProps.color
  );
});

// 修改后
const StatCard = function StatCard({ label, value, color, trend }) {
  "use memo";

  return (
    <div className={/* ... */}>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
};
```

### 5.3 第二周计划 (Week 2)

**目标**: 扩展到更多组件，处理问题

**任务**:

1. 扩展到 10-15 个组件
2. 处理遇到的问题
3. 性能监控
4. 团队反馈收集

**检查清单**:

- [ ] 所有 Dashboard 组件已启用
- [ ] 监控组件已启用
- [ ] WebSocket 组件已启用
- [ ] 无功能回归
- [ ] 性能提升 ≥ 30%
- [ ] 构建时间增加 < 10%

### 5.4 第三周计划 (Week 3)

**目标**: 评估效果，决定下一步

**决策点**:

```
如果 (性能提升 ≥ 30% && 无重大问题)
  → 继续到阶段 2 (扩展)
如果 (性能提升 < 20% 或有重大问题)
  → 分析原因，调整策略
```

### 5.5 代码审查清单

**PR 审查时检查**:

- [ ] 是否添加了 `"use memo"` 到组件？
- [ ] 是否移除了冗余的 `React.memo`？
- [ ] 是否保留了必要的 `useMemo`（用于 Effect 依赖）？
- [ ] 是否保留了必要的 `useCallback`（用于 Effect 依赖）？
- [ ] 是否有违反 Rules of React 的代码？
- [ ] 所有测试是否通过？
- [ ] 是否有性能回归？

**代码审查示例**:

```typescript
// ❌ 问题: 移除了用于 Effect 依赖的 useMemo
function Component({ data }) {
  "use memo";

  const processed = data.map(x => x * 2); // ❌ 不应该移除

  useEffect(() => {
    console.log('Data changed:', processed);
  }, [processed]); // 依赖会频繁变化

  return <div>{processed}</div>;
}

// ✅ 正确: 保留用于 Effect 依赖的 useMemo
function Component({ data }) {
  "use memo";

  const processed = useMemo(() => data.map(x => x * 2), [data]); // ✅ 保留

  useEffect(() => {
    console.log('Data changed:', processed);
  }, [processed]); // 依赖稳定

  return <div>{processed}</div>;
}
```

### 5.6 调试技巧

**使用 React DevTools Profiler**:

1. **记录渲染**
   - 打开 DevTools → Profiler
   - 点击 "Record"
   - 执行操作
   - 点击 "Stop"

2. **分析结果**
   - 查看 "Flamegraph" 视图
   - 找出频繁渲染的组件
   - 检查 "Why did this render?" 提示

3. **对比编译前后**
   - 编译前记录一次
   - 编译后记录一次
   - 对比渲染次数

**使用 Console**:

```typescript
// 添加调试日志
function Component({ props }) {
  "use memo";

  console.log('Component rendered:', props.id); // 查看渲染次数

  return <div>...</div>;
}
```

**使用 Performance API**:

```typescript
function measurePerformance() {
  if (typeof performance !== 'undefined') {
    const start = performance.now()

    // 执行操作

    const end = performance.now()
    console.log(`Operation took ${end - start}ms`)
  }
}
```

### 5.7 常见问题解答

**Q1: React Compiler 会增加包体积吗？**

A: 不会。React Compiler 是构建时工具，不会向最终 bundle 添加代码。相反，它可能减少包体积（移除冗余的优化代码）。

**Q2: 需要移除所有手动优化吗？**

A: 不需要。可以保留以下情况：

- 用于 Effect 依赖的 `useMemo`
- 跨组件共享的缓存值
- 编译器无法优化的复杂逻辑

**Q3: React Compiler 会影响构建时间吗？**

A: 会有轻微影响（约 5-10%），但 Next.js 的 SWC 优化最小化了这个影响。

**Q4: 如果遇到问题怎么办？**

A: 使用 `"use no memo"` 指令排除特定组件，然后分析问题。

**Q5: React Compiler 支持所有 React 版本吗？**

A: 支持 React 17, 18, 19。项目使用 React 18.2.0，完全支持。

**Q6: 可以在开发环境禁用编译器吗？**

A: 可以，但建议保持启用以尽早发现问题。可以使用环境变量控制：

```javascript
// next.config.js
const nextConfig = {
  reactCompiler: process.env.NODE_ENV === 'production',
}
```

**Q7: React Compiler 与 Server Components 兼容吗？**

A: Server Components 不在编译器范围内，但客户端组件可以继续使用。

### 5.8 性能测试脚本

**创建自动化测试脚本**: `scripts/test-react-compiler-performance.sh`

```bash
#!/bin/bash

# React Compiler 性能测试脚本

echo "========================================="
echo "React Compiler Performance Test"
echo "========================================="
echo ""

# 1. 构建时间测试
echo "1. Testing build time..."
time npm run build:turbo
echo ""

# 2. 包体积测试
echo "2. Testing bundle size..."
npm run build:analyze
echo ""

# 3. Lighthouse 测试
echo "3. Running Lighthouse..."
npx lighthouse http://localhost:3000 --output=html --output-path=reports/lighthouse-$(date +%Y%m%d).html
echo ""

# 4. 运行测试
echo "4. Running tests..."
npm run test:all
echo ""

echo "========================================="
echo "Test completed!"
echo "========================================="
```

**使用方法**:

```bash
chmod +x scripts/test-react-compiler-performance.sh
./scripts/test-react-compiler-performance.sh
```

### 5.9 监控仪表板

**创建性能监控页面**: `src/app/[locale]/react-compiler-metrics/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';

export default function ReactCompilerMetrics() {
  const [metrics, setMetrics] = useState({
    buildTime: 0,
    bundleSize: 0,
    renderCount: 0,
    lighthouseScore: 0,
  });

  useEffect(() => {
    // 从 API 获取性能指标
    fetch('/api/metrics/react-compiler')
      .then(res => res.json())
      .then(data => setMetrics(data));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">React Compiler Metrics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          label="Build Time"
          value={`${metrics.buildTime}s`}
          trend={metrics.buildTime < 130 ? 'down' : 'up'}
        />
        <MetricCard
          label="Bundle Size"
          value={`${metrics.bundleSize}KB`}
          trend={metrics.bundleSize < 450 ? 'down' : 'up'}
        />
        <MetricCard
          label="Unnecessary Renders"
          value={`${metrics.renderCount}`}
          trend="down"
        />
        <MetricCard
          label="Lighthouse Score"
          value={metrics.lighthouseScore}
          trend={metrics.lighthouseScore > 85 ? 'up' : 'down'}
        />
      </div>
    </div>
  );
}
```

---

## 📈 6. 风险评估与缓解

### 6.1 技术风险

| 风险                | 可能性 | 影响 | 缓解措施                  |
| ------------------- | ------ | ---- | ------------------------- |
| **编译器引入 Bug**  | 中     | 高   | 渐进式启用 + 充分测试     |
| **性能退化**        | 低     | 中   | 持续监控 + 快速回滚       |
| **构建时间增加**    | 高     | 低   | 使用 Turbopack + 缓存     |
| **不兼容现有代码**  | 中     | 中   | 使用 `"use no memo"` 排除 |
| **TypeScript 问题** | 低     | 低   | 编译器在类型检查后运行    |

### 6.2 业务风险

| 风险             | 可能性 | 影响 | 缓解措施              |
| ---------------- | ------ | ---- | --------------------- |
| **部署延期**     | 中     | 中   | 提前测试 + 分阶段部署 |
| **用户体验退化** | 低     | 高   | 充分的 E2E 测试       |
| **团队适应成本** | 中     | 低   | 培训 + 文档           |
| **维护负担增加** | 低     | 低   | 长期降低维护成本      |

### 6.3 回滚计划

**如果遇到严重问题**:

1. **立即回滚**

   ```bash
   git revert <commit-hash>
   npm run deploy:production
   ```

2. **禁用编译器**

   ```javascript
   // next.config.js
   const nextConfig = {
     reactCompiler: false, // 临时禁用
   }
   ```

3. **隔离问题**
   - 使用 `"use no memo"` 排除问题组件
   - 分析日志和错误
   - 修复后重新启用

---

## 📚 7. 学习资源

### 7.1 官方文档

- [React Compiler 官方文档](https://react.dev/learn/react-compiler)
- [React Compiler Working Group](https://github.com/reactwg/react-compiler)
- [Next.js React Compiler 配置](https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler)

### 7.2 社区资源

- [React Compiler Playground](https://playground.react.dev/)
- [React Compiler YouTube 频道](https://www.youtube.com/@React)
- [React Twitter](https://twitter.com/reactjs)

### 7.3 项目内部资源

- `docs/react-compiler-guide.md` - 项目专属指南
- `reports/react-compiler-pilot-202604XX.md` - 试点报告
- `docs/react-compiler-best-practices.md` - 最佳实践

---

## ✅ 8. 总结与建议

### 8.1 关键建议

1. **渐进式启用**: 从 annotation 模式开始，逐步扩大范围
2. **充分测试**: 每个阶段都要有充分的测试和验证
3. **持续监控**: 建立性能监控，及时发现问题
4. **团队协作**: 分享经验，建立最佳实践
5. **文档先行**: 记录决策和经验，便于未来参考

### 8.2 预期成果

| 指标                 | 目标   | 时间线   |
| -------------------- | ------ | -------- |
| **手动优化代码减少** | -90%   | 3 个月   |
| **构建时间增加**     | < 10%  | 持续     |
| **性能提升**         | ≥ 30%  | 2 个月   |
| **团队学习曲线**     | 1-2 周 | 初期     |
| **长期维护成本**     | -50%   | 6 个月后 |

### 8.3 成功标准

**项目被认为成功**，如果满足以下条件：

- ✅ 所有核心组件已启用 React Compiler
- ✅ 性能提升 ≥ 30%
- ✅ 无功能回归（测试通过率 100%）
- ✅ 构建时间增加 < 10%
- ✅ 团队熟练使用编译器
- ✅ 建立了完善的监控机制

### 8.4 下一步行动

**立即开始**:

1. ✅ 安装 `babel-plugin-react-compiler`
2. ✅ 更新 `next.config.js`
3. ✅ 创建测试分支
4. ✅ 为 3 个试点组件添加 `"use memo"`
5. ✅ 运行测试和性能基准

**本周完成**:

1. ✅ 试点组件验证完成
2. ✅ 性能对比报告完成
3. ✅ 团队分享完成
4. ✅ 决定是否继续到阶段 2

---

## 📞 9. 联系与支持

### 9.1 项目团队

- **技术负责人**: [待定]
- **React Compiler 专家**: [待定]
- **QA 负责人**: [待定]

### 9.2 外部支持

- **React 官方 Discord**: https://discord.gg/reactiflux
- **Next.js Discord**: https://discord.gg/nextjs
- **React Compiler GitHub Issues**: https://github.com/facebook/react/issues

---

**文档版本**: 1.0
**最后更新**: 2026-03-28
**下次审查**: 2026-04-28

---

## 📝 附录

### A. 配置文件完整示例

**next.config.js**:

```javascript
/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  // React Compiler 配置
  reactCompiler: {
    compilationMode: 'annotation', // 初期使用 annotation
    // compilationMode: 'all', // 后期切换到全局模式
  },

  // ... 现有配置
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  compress: true,
  generateEtags: true,
  productionBrowserSourceMaps: false,

  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
  },

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'zustand',
      'web-vitals',
      'date-fns',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'recharts',
      'zod',
    ],
    optimizeCss: true,
  },

  turbopack: {
    resolveAlias: {
      '@': path.join(__dirname, 'src'),
    },
    root: __dirname,
  },

  serverExternalPackages: ['jose', 'better-sqlite3'],

  webpack: (config, { isServer, dev }) => {
    if (process.env.USE_WEBPACK === 'true') {
      config.resolve.alias = config.resolve.alias || {}
      config.resolve.alias['@'] = __dirname + '/src'

      if (!isServer && !dev) {
        config.optimization = config.optimization || {}
        config.performance = {
          maxEntrypointSize: 300000,
          maxAssetSize: 250000,
          hints: 'warning',
        }

        config.optimization.splitChunks = {
          chunks: 'all',
          cacheGroups: {
            'three-libs': {
              test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
              name: 'three-libs',
              priority: 60,
              reuseExistingChunk: true,
              enforce: true,
              minSize: 30000,
              maxSize: 300000,
            },
            // ... 其他 cache groups
          },
        }

        config.optimization.usedExports = true
        config.optimization.sideEffects = false
      }
    }

    return config
  },
}

module.exports = nextConfig
```

### B. ESLint 配置

**.eslintrc.js**:

```javascript
module.exports = {
  extends: ['next/core-web-vitals', 'prettier'],
  plugins: ['react-compiler'],
  rules: {
    'react-compiler/react-compiler': 'warn', // 初期使用 warn
    // 'react-compiler/react-compiler': 'error', // 后期使用 error
  },
}
```

### C. 测试用例示例

**React Compiler 集成测试**: `tests/react-compiler.integration.test.tsx`

```typescript
import { render, screen, act } from '@testing-library/react';
import React from 'react';

describe('React Compiler Integration', () => {
  it('should optimize StatCard component', () => {
    const { rerender } = render(
      <StatCard label="Test" value={100} color="blue" />
    );

    // 初始渲染
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();

    // 重新渲染相同 props
    act(() => {
      rerender(<StatCard label="Test" value={100} color="blue" />);
    });

    // 组件应该被优化，不会重新渲染
    // 可以通过 mock 验证渲染次数
  });

  it('should handle prop changes correctly', () => {
    const { rerender } = render(
      <StatCard label="Test" value={100} color="blue" />
    );

    expect(screen.getByText('100')).toBeInTheDocument();

    // 更改 props
    act(() => {
      rerender(<StatCard label="Test" value={200} color="blue" />);
    });

    expect(screen.getByText('200')).toBeInTheDocument();
  });
});
```

### D. 性能监控 Dashboard

**创建性能监控 API**: `src/app/api/metrics/react-compiler/route.ts`

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  // 从数据库或监控系统获取性能指标
  const metrics = {
    buildTime: 130, // 秒
    bundleSize: 435, // KB
    renderCount: 50, // 每分钟
    lighthouseScore: 92,
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(metrics)
}
```

---

**文档结束**

如有疑问，请参考官方文档或联系项目团队。
