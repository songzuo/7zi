# lib/ 目录重构计划

## 执行时间
2026-03-30 21:45

## 背景
根据 Sprint 3 规划，lib/ 层存在重复模块需要合并优化。

## 当前目录结构分析

### 1. performance/ 和 performance-monitoring/ 合并

**目录分析：**

- `performance/` (4 个文件):
  - budget.ts - 性能预算管理
  - custom-metrics.ts - 自定义指标跟踪
  - index.ts - Web Vitals 相关导出
  - web-vitals.ts - Web Vitals 监控

- `performance-monitoring/` (多个子模块):
  - anomaly-detection/ - 异常检测
  - root-cause-analysis/ - 根因分析
  - alerting/ - 告警系统
  - budget-control/ - 预算控制
  - index.ts - 高级功能导出

**引用分析：**
- `src/features/monitoring/components/EnhancedPerformanceDashboard.tsx` 引用了 `@/lib/performance`
- `src/app/monitoring-example/page.tsx` 引用了 `@/lib/performance`
- 没有代码引用 `performance-monitoring`（可能是新功能未使用）

**合并策略：**
1. 将 `performance-monitoring/` 的所有内容合并到 `performance/`
2. 重命名冲突文件：`budget.ts` → `budget-manager.ts`（保留 budget-control/budget.ts）
3. 更新 index.ts 导出所有功能
4. 删除 `performance-monitoring/` 目录

### 2. rate-limit/ 和 security/rate-limit/ 分析

**目录分析：**
- `rate-limit/` 存在，包含完整的限流功能
- `security/rate-limit/` 不存在

**结论：** 无需合并，保留 `rate-limit/`

### 3. monitoring/ 分析

**目录分析：**
- `monitoring/` 存在，包含基础监控功能
- 未发现 `monitoring/hooks/` 子目录

**结论：** 保持现状

### 4. hooks/ 分析

**目录分析：**
- 未发现独立的 `hooks/` 目录
- 没有其他 hooks 子目录

**结论：** 无需合并

## 执行计划

### 步骤 1: 备份性能相关文件
```bash
tar -czf lib-performance-backup.tar.gz src/lib/performance/ src/lib/performance-monitoring/
```

### 步骤 2: 合并 performance-monitoring 到 performance
1. 复制所有子目录到 `performance/`
2. 处理文件名冲突
3. 合并 index.ts 导出

### 步骤 3: 更新 import 路径
- 无需更新（当前代码都引用 `performance/`）

### 步骤 4: 删除 performance-monitoring 目录

### 步骤 5: 验证构建
```bash
npm run build
```

## 预期结果

- 消除 `performance-monitoring/` 目录
- 所有性能监控功能统一在 `performance/`
- 保持向后兼容（无 import 路径变更）
- 构建通过

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 文件名冲突 | 中 | 重命名 budget.ts → budget-manager.ts |
| 类型导出冲突 | 低 | 检查 index.ts 重复导出 |
| 测试失败 | 低 | 运行所有相关测试 |

---

## ✅ 执行状态

- [x] 目录结构分析
- [x] 引用分析
- [x] 备份 - `lib-performance-backup-20260330.tar.gz`
- [x] 合并 - performance-monitoring/ 内容已合并到 performance/
- [x] 验证构建 - npm run build 成功 (exit code 0)
- [x] 清理 - performance-monitoring/ 目录已删除
- [x] 文档更新 - README.md 和 docs/v1.5.0-ARCHITECTURE.md 已更新

## 执行结果

### 合并后的 performance/ 目录结构
```
src/lib/performance/
├── __tests__/
├── alerting/
│   ├── __tests__/
│   ├── alerter.ts
│   ├── channels.ts
│   └── types.ts
├── anomaly-detection/
│   ├── algorithms/
│   ├── baseline.ts
│   ├── detector.ts
│   └── filters.ts
├── budget-control/
├── root-cause-analysis/
├── budget-manager.ts (原 budget.ts)
├── custom-metrics.ts
├── index.ts (合并后的入口)
└── web-vitals.ts
```

### 关键变更
1. `budget.ts` → `budget-manager.ts` (避免与 budget-control/ 冲突)
2. `performance/index.ts` 现在导出所有模块：
   - Web Vitals 监控
   - 自定义指标跟踪
   - 性能预算管理
   - 异常检测
   - 根因分析
   - 告警系统

### 验证
- ✅ 构建成功 (npm run build)
- ✅ 无 import 路径变更 (向后兼容)
- ✅ 目录结构简化

---

**执行完成时间：** 2026-03-30 21:50
**执行者：** 🏗️ 架构师子代理
