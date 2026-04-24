# 🛠️ 7zi 构建修复计划

**生成时间**: 2026-04-24  
**项目**: 7zi-frontend (Next.js 16.2.4)  
**TypeScript 错误总数**: ~562 个错误，131 个唯一文件

---

## 📊 错误分类统计

### 1. Zod API 变更 (zod@4.3.6)
**文件**: `src/lib/validation/zod-adapter.ts`
**错误数**: ~50 个
**原因**: Zod 4.x 改变了内部 API（`$ZodCheck`, `ZodEffects`, `effect` 等）

**修复方案**: 
- 降级到 zod@3.x 或
- 重写 zod-adapter.ts 使用新的 v4 API

### 2. 测试文件导入错误
**文件**: 
- `src/lib/workflow/__tests__/replay-engine.test.ts`
- `src/lib/workflow/__tests__/versioning.test.ts`
- `src/components/notifications/__tests__/NotificationProvider.test.tsx`
**错误数**: ~15 个
**原因**: 
- `replay-engine.test.ts` 导入 `ExecutionHistory`, `NodeExecution`, `NodeExecutionStatus`, `TriggerType` 但未从 replay-engine.ts 导出
- `versioning.test.ts` 从 `@/types/workflow-version` 导入 `VersionBranch`, `SnapshotPolicy`, `CompressionRule` 但这些在 `@/lib/workflow/versioning` 中

### 3. 组件 API 不匹配
**文件**:
- `src/components/ui/Tabs.tsx`
- `src/components/monitoring/PerformanceMonitorDashboard.tsx`
- `src/components/monitoring/AlarmConfigPanel.tsx`
**错误数**: ~20 个
**原因**: Tabs/Select 组件的 `value`/`onValueChange` props 不存在

### 4. 缺失变量/类型引用
**文件**:
- `src/components/navigation/MobileLayout.tsx` ✅ 已修复
- `src/components/performance/PerformanceDashboard.tsx` (`PerformanceBudgetReport`)
- `src/hooks/usePerformanceMonitoring.ts` 等
**错误数**: ~30 个

### 5. UI 组件属性错误
**文件**:
- `src/components/ui/RichTextEditor/RichTextEditor.tsx`
- `src/components/webhook/WebhookLogViewer.tsx`
**错误数**: ~15 个

### 6. 其他库/API 不匹配
**文件**: 多个 `.test.ts` 文件
**错误数**: ~50 个

---

## ✅ 已修复的错误 (本次会话)

| # | 文件 | 错误类型 | 修复内容 |
|---|------|----------|----------|
| 1 | `src/lib/workflow/replay-engine.ts` | 缺失导出 | 添加 `NodeExecutionStatus`, `TriggerType` 导出 |
| 2 | `src/lib/workflow/__tests__/versioning.test.ts` | 导入路径错误 | 从 `@/lib/workflow/versioning` 而非 `@/types/workflow-version` 导入 |
| 3 | `src/components/navigation/MobileLayout.tsx` | 语法错误 | 修复损坏的 MobileNavProvider 函数定义，移除 `isOpen` 引用 |

---

## 📋 按优先级排序的修复步骤

### 🔴 P0 - 阻塞构建 (立即修复)

1. **zod-adapter.ts 重构**
   - 文件: `src/lib/validation/zod-adapter.ts`
   - 错误数: ~50
   - 方案: 降级 zod 到 3.x 版本或重写 adapter
   - 工作量: 2-3 小时

2. **Tabs/Select 组件 props 修复**
   - 文件: `src/components/ui/Tabs.tsx`, `src/components/monitoring/PerformanceMonitorDashboard.tsx`
   - 错误数: ~20
   - 方案: 检查组件 props 定义，更新使用处
   - 工作量: 1-2 小时

3. **NotificationProvider test 修复**
   - 文件: `src/components/notifications/__tests__/NotificationProvider.test.tsx`
   - 错误数: 3
   - 方案: 修正 `NotificationContextValue` 导入和类型
   - 工作量: 30 分钟

### 🟡 P1 - 高优先级 (本周修复)

4. **LazyLoadImage test 修复**
   - 文件: `src/components/performance/__tests__/LazyLoadImage.test.tsx`
   - 错误数: 2
   - 原因: IntersectionObserver mock 类型不匹配
   - 工作量: 30 分钟

5. **Workflow replay-engine exports**
   - ✅ 已完成

6. **PerformanceBudgetReport 引用**
   - 文件: `src/components/performance/PerformanceDashboard.tsx`
   - 错误: `Cannot find name 'PerformanceBudgetReport'`
   - 工作量: 1 小时

### 🟠 P2 - 中优先级 (本月修复)

7. **Test files mock 类型修复** (~30 个文件)
   - 多为 mock 类型不匹配
   - 需要统一测试工具函数

8. **webhook.test.ts fetch mock**
   - 文件: `src/lib/webhook/__tests__/webhook.test.ts`
   - 需要调整 mock 返回类型

9. **其他组件 props 错误**
   - RichTextEditor, WebhookLogViewer 等
   - ~15 个错误

---

## 🗂️ 冗余目录清单

### 要删除的目录 (建议备份后删除)

| 目录 | 原因 | 建议 |
|------|------|------|
| `/root/.openclaw/workspace/7zi` | 仅含 docs 的空目录 (2个文件) | 删除或合并到 docs/ |
| `/root/.openclaw/workspace/7zi-project` | 孤立的旧项目 (无 src 实际代码) | 删除 |
| `/root/.openclaw/workspace/7zi-monitoring` | Python 独立监控项目，非前端 | 评估是否需要 |
| `/root/.openclaw/workspace/7zi-test` | 未确认用途 | 检查后删除 |
| `/root/.openclaw/workspace/7zi-deploy.tar.gz` | 旧部署包 | 删除或归档 |
| `7zi-financial-analysis-report.md` | 文档应移入 docs/ | 移动到 docs/finance/ |

### 要清理的文件 (建议删除)

| 文件 | 原因 |
|------|------|
| `*.backup`, `*.ts.backup`, `*.js.backup` | 备份文件堆积 |
| `next.config.js.backup`, `next.config.ts.backup` | 配置备份 |
| `eslint-report.txt`, `eslint_output.txt`, `eslint_output_new.txt` | 旧的 ESLint 报告 |
| `Dockerfile.*` (多个) | 重复的 Dockerfile |
| `docker-compose.*.yml` (多个) | 重复的 compose 文件 |
| `tsconfig.tsbuildinfo` | 构建缓存，应在 .gitignore |
| `audit-result.json`, `eslint_quality.json` | 旧的审计报告 |
| `test-results.json` (2.8MB) | 过大的测试结果文件 |

---

## 📈 构建健康度

| 指标 | 修复前 | 修复后 (本次) |
|------|--------|---------------|
| TypeScript 错误总数 | ~562 | ~545 |
| 唯一错误文件数 | 131 | ~128 |
| 构建状态 | ⚠️ 警告 (非阻塞) | ✅ 警告 (非阻塞) |

**注意**: Next.js 16 build 命令实际成功 (exit code 0)，但有 562 个 TypeScript 类型错误。

---

## 🚀 快速修复命令

```bash
# 查看当前错误统计
cd /root/.openclaw/workspace/7zi-frontend && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l

# 查看唯一错误文件
cd /root/.openclaw/workspace/7zi-frontend && npx tsc --noEmit 2>&1 | grep "error TS" | sed 's/(.*//' | sort -u

# 运行构建
cd /root/.openclaw/workspace/7zi-frontend && npm run build
```

---

## 📝 后续行动

1. [ ] 修复 zod-adapter.ts (P0)
2. [ ] 修复 Tabs/Select props (P0)
3. [ ] 清理冗余目录 (P1)
4. [ ] 修复剩余测试文件 (P1)
5. [ ] 清理备份文件 (P2)
