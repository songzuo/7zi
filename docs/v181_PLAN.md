# v1.8.1 功能规划与优先级排序

**版本**: v1.8.1  
**规划日期**: 2026-04-02  
**基于**: v1.8.0 (已部署)  
**规划者**: AI 主管

---

## 📋 执行摘要

v1.8.1 是一个**技术债务清理与稳定性增强**版本，聚焦于修复 v1.8.0 遗留的 27 个 TypeScript 错误、完成监控告警渠道集成、以及补齐测试覆盖。

**核心目标**:

1. TypeScript 错误清零
2. 监控告警渠道完善 (Slack 集成)
3. Workflow Orchestrator 测试补全
4. 根因分析功能完善

**预计工期**: 2 周 (2026-04-03 ~ 2026-04-16)

---

## 📊 v1.8.0 完成情况回顾

### ✅ 已完成功能

| 功能模块                         | 完成度 | 状态      |
| -------------------------------- | ------ | --------- |
| **Visual Workflow Orchestrator** | 100%   | ✅ 已完成 |
| **Workflow Canvas 组件**         | 100%   | ✅ 已完成 |
| **Email 配置模块**               | 100%   | ✅ 已完成 |
| **Email 服务**                   | 100%   | ✅ 已完成 |
| **告警模板**                     | 100%   | ✅ 已完成 |
| **Alerting 系统集成**            | 100%   | ✅ 已完成 |
| **WebSocket 监控**               | 100%   | ✅ 已完成 |
| **Sentry API 现代化**            | 100%   | ✅ 已完成 |

### ⚠️ 遗留问题

- **TypeScript 错误**: 27 个未修复
- **测试覆盖**: Workflow Orchestrator 缺少完整测试
- **监控告警**: 缺少 Slack 渠道集成
- **根因分析**: CallChainTracer 类型定义不完整

---

## 🎯 v1.8.1 功能规划

### 优先级定义

- **P0 (阻断)**: 必须完成，影响系统稳定性或发布
- **P1 (重要)**: 应该完成，显著提升用户体验
- **P2 (优化)**: 可以推迟，锦上添花

---

## 🔴 P0 功能 (阻断 - 必须完成)

### P0-1: TypeScript 错误清零

**目标**: 修复所有 27 个 TypeScript 编译错误

**错误分布**:

| 文件                                               | 错误数 | 类型              | 难度 |
| -------------------------------------------------- | ------ | ----------------- | ---- |
| `src/lib/economy/wallet.ts`                        | 10     | 类型不匹配        | 中   |
| `src/components/workflow/designer/index.tsx`       | 4      | 类型定义缺失      | 低   |
| `src/lib/performance/root-cause-analysis/*.ts`     | 5      | 类型转换错误      | 中   |
| `src/tools/agent-cli.ts`                           | 5      | 类型断言          | 低   |
| `src/components/TaskBoardSearch.tsx`               | 1      | 类型参数不匹配    | 低   |
| `src/lib/websocket/monitoring-middleware.ts`       | 1      | Socket 类型不兼容 | 低   |
| `src/lib/performance/root-cause-analysis/index.ts` | 1      | 导出冲突          | 低   |

**修复策略**:

1. **wallet.ts (10 错误)**
   - 问题: `QueryOptions` 接口与 `InMemoryTransactionRepository` 参数类型不匹配
   - 修复: 统一 `startDate`/`endDate` 为 `number | Date` 类型
   - 工作量: 2-3 小时

2. **workflow/designer/index.tsx (4 错误)**
   - 问题: `WorkflowNode` 缺少 `name` 属性
   - 修复: 添加 `name` 字段到节点数据结构
   - 工作量: 1-2 小时

3. **root-cause-analysis (5 错误)**
   - 问题: `CallChainTree` 类型定义不完整
   - 修复: 补充 `rootId`, `nodes` 属性
   - 工作量: 2-3 小时

4. **agent-cli.ts (5 错误)**
   - 问题: 类型断言和导入缺失
   - 修复: 添加 `ScheduleDecision` 导入，使用类型断言
   - 工作量: 1 小时

5. **其他 (3 错误)**
   - TaskBoardSearch.tsx: 修复泛型参数
   - monitoring-middleware.ts: 修复 Socket 类型
   - index.ts: 重命名冲突导出
   - 工作量: 1 小时

**总工作量**: 8-10 小时

**负责人**: ⚡ Executor

**完成标准**: `npx tsc --noEmit` 返回 0 错误

---

### P0-2: Workflow Orchestrator 单元测试

**目标**: 为核心 Workflow 组件编写完整单元测试

**待测试模块**:

| 模块                            | 优先级 | 测试用例数 | 工作量 |
| ------------------------------- | ------ | ---------- | ------ |
| `VisualWorkflowOrchestrator.ts` | 高     | 20+        | 4-5h   |
| `WorkflowCanvas.tsx`            | 高     | 15+        | 3-4h   |
| `nodes/*.tsx`                   | 中     | 10+        | 2-3h   |

**测试覆盖目标**: 90%+

**负责人**: 🧪 测试员

**完成标准**: 所有测试通过，覆盖率 > 90%

---

### P0-3: 监控告警 Slack 渠道集成

**目标**: 完成 Slack 告警通知渠道

**功能要求**:

- Slack Webhook 集成
- 支持 Markdown 格式化
- 告警级别颜色区分
- 历史记录保存

**实现文件**:

- `src/lib/alerting/SlackAlertService.ts` (新建)
- `src/lib/alerting/index.ts` (更新)

**环境变量**:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
SLACK_ALERTING_ENABLED=true
SLACK_CHANNEL=#alerts
```

**工作量**: 3-4 小时

**负责人**: ⚡ Executor

---

## 🟡 P1 功能 (重要 - 应该完成)

### P1-1: 根因分析功能完善

**目标**: 完善 CallChainTracer 类型定义和测试

**待修复问题**:

- `CallChainTree` 类型缺少 `rootId`, `nodes` 属性
- 测试文件类型断言错误

**改进内容**:

1. 补充类型定义
2. 修复测试用例
3. 添加集成测试

**工作量**: 4-5 小时

**负责人**: 🏗️ 架构师

---

### P1-2: WebSocket 监控文档完善

**目标**: 创建完整的 WebSocket 监控使用文档

**文档内容**:

- API 参考
- 配置说明
- 使用示例
- 故障排查

**输出文件**: `docs/lib/websocket-monitoring.md`

**工作量**: 2-3 小时

**负责人**: 📚 咨询师

---

### P1-3: Agent Economy 钱包修复

**目标**: 修复 wallet.ts 中的类型错误

**修复内容**:

1. 统一 `QueryOptions` 接口
2. 修复 `findByWalletId` 方法签名
3. 添加类型安全检查

**工作量**: 2-3 小时

**负责人**: ⚡ Executor

---

## 🟢 P2 功能 (优化 - 可以推迟)

### P2-1: 性能优化 - 首屏加载

**目标**: LCP < 1s

**优化方向**:

- 代码分割优化
- 图片预加载
- 字体优化

**工作量**: 8-10 小时

**推迟原因**: v1.8.2 可继续优化

---

### P2-2: API 响应格式统一

**目标**: 统一所有 API 响应格式

**工作量**: 4-5 小时

**推迟原因**: 不影响核心功能

---

### P2-3: 组件响应式设计增强

**目标**: 移动端体验优化

**工作量**: 6-8 小时

**推迟原因**: v1.8.2 可继续

---

## 📅 实施时间线

### Week 1 (2026-04-03 ~ 2026-04-09)

| 日期    | 任务                                      | 负责人      | 状态   |
| ------- | ----------------------------------------- | ----------- | ------ |
| Day 1-2 | TypeScript 错误修复 (wallet.ts, workflow) | ⚡ Executor | 待开始 |
| Day 3-4 | TypeScript 错误修复 (其他)                | ⚡ Executor | 待开始 |
| Day 5   | Slack 告警集成                            | ⚡ Executor | 待开始 |
| Day 5-6 | Workflow Orchestrator 测试                | 🧪 测试员   | 待开始 |

### Week 2 (2026-04-10 ~ 2026-04-16)

| 日期    | 任务                 | 负责人        | 状态   |
| ------- | -------------------- | ------------- | ------ |
| Day 1-2 | 根因分析完善         | 🏗️ 架构师     | 待开始 |
| Day 3   | 文档完善             | 📚 咨询师     | 待开始 |
| Day 4-5 | 集成测试 + 回归测试  | 🧪 测试员     | 待开始 |
| Day 5   | 发布准备 + CHANGELOG | 🛡️ 系统管理员 | 待开始 |

---

## 📊 成功指标

| 指标              | 当前值 | 目标值        | 提升  |
| ----------------- | ------ | ------------- | ----- |
| TypeScript 错误   | 27     | 0             | -100% |
| Workflow 测试覆盖 | 0%     | 90%+          | +90%  |
| 告警渠道          | Email  | Email + Slack | +1    |
| 文档完整性        | 70%    | 95%           | +25%  |

---

## 🔗 相关文档

### v1.8.0 相关

- `CHANGELOG.md` - v1.8.0 版本变更日志
- `memory/2026-04-02.md` - 今日开发日志
- `docs/TECH_DEBT_ASSESSMENT_v180.md` - 技术债务评估
- `docs/AGENT_WORLD_STRATEGY_v180.md` - 智能体世界战略
- `docs/COMPETITIVE_ANALYSIS_v180.md` - 竞争分析

### v1.8.1 输出

- `docs/v181_PLAN.md` - 本文档
- `src/lib/alerting/SlackAlertService.ts` - Slack 告警服务
- `src/lib/workflow/*.test.ts` - Workflow 测试文件
- `docs/lib/websocket-monitoring.md` - WebSocket 监控文档

---

## ⚠️ 风险评估

| 风险                      | 级别 | 影响     | 缓解措施                 |
| ------------------------- | ---- | -------- | ------------------------ |
| TypeScript 修复引入新 bug | 中   | 功能回归 | 充分测试 + 代码审查      |
| 类型系统重构范围扩大      | 中   | 工期延长 | 先评估影响范围，逐步修复 |
| 测试编写时间超预期        | 低   | 发布延期 | 优先核心功能测试         |

---

## 🚀 v1.8.2 规划预览

v1.8.2 预计在 v1.8.1 发布后 2 周内发布，主要包含：

1. **P2 功能补全**: 性能优化、响应式设计
2. **更多告警渠道**: PagerDuty、钉钉
3. **Agent Economy 完善**: 钱包功能增强
4. **第三方集成**: GitHub Actions 集成

---

## 📝 附录

### A. TypeScript 错误详细列表

```
1. src/components/TaskBoardSearch.tsx(115,11): TS2322 - 类型参数不匹配
2. src/components/workflow/designer/index.tsx(84,9): TS2322 - 缺少 name 属性
3. src/components/workflow/designer/index.tsx(85,9): TS2322 - EdgeType 不兼容
4. src/components/workflow/designer/index.tsx(99,26): TS2322 - 缺少 name 属性
5. src/lib/economy/wallet.ts(105,9): TS2416 - 方法签名不匹配
6. src/lib/economy/wallet.ts(124,47): TS18048 - 可能 undefined
7. src/lib/economy/wallet.ts(127,47): TS18048 - 可能 undefined
8. src/lib/economy/wallet.ts(130,47): TS2365 - 类型运算错误
9. src/lib/economy/wallet.ts(130,62): TS18048 - 可能 undefined
10. src/lib/economy/wallet.ts(133,47): TS2365 - 类型运算错误
11. src/lib/economy/wallet.ts(133,62): TS18048 - 可能 undefined
12. src/lib/economy/wallet.ts(214,5): TS2322 - 类型不匹配
13. src/lib/performance/root-cause-analysis/call-chain-tracer.test.ts(658,14): TS18047 - 可能 null
14. src/lib/performance/root-cause-analysis/call-chain-tracer.test.ts(658,19): TS2339 - 属性不存在
15. src/lib/performance/root-cause-analysis/call-chain-tracer.test.ts(659,14): TS18047 - 可能 null
16. src/lib/performance/root-cause-analysis/call-chain-tracer.test.ts(659,19): TS2339 - 属性不存在
17. src/lib/performance/root-cause-analysis/call-chain-tracer.test.ts(660,14): TS18047 - 可能 null
18. src/lib/performance/root-cause-analysis/call-chain-tracer.test.ts(660,19): TS2339 - 属性不存在
19. src/lib/performance/root-cause-analysis/call-chain-tracer.ts(833,12): TS2352 - 类型转换错误
20. src/lib/performance/root-cause-analysis/index.ts(109,3): TS2484 - 导出冲突
21. src/lib/websocket/monitoring-middleware.ts(54,38): TS2345 - Socket 类型不兼容
22. src/tools/agent-cli.ts(57,45): TS2769 - 重载不匹配
23. src/tools/agent-cli.ts(94,7): TS2322 - 类型不匹配
24. src/tools/agent-cli.ts(121,7): TS2322 - 类型不匹配
25. src/tools/agent-cli.ts(149,19): TS2322 - 类型不匹配
26. src/tools/agent-cli.ts(608,20): TS2304 - 找不到名称
```

### B. 子代理任务分配

| 子代理        | 任务                             | 工作量 |
| ------------- | -------------------------------- | ------ |
| ⚡ Executor   | TypeScript 错误修复 + Slack 集成 | 12-15h |
| 🧪 测试员     | Workflow 测试 + 回归测试         | 8-10h  |
| 🏗️ 架构师     | 根因分析完善                     | 4-5h   |
| 📚 咨询师     | 文档完善                         | 2-3h   |
| 🛡️ 系统管理员 | 发布准备                         | 2-3h   |

**总计**: 28-36 小时

---

**文档生成时间**: 2026-04-02 20:40  
**版本**: v1.0  
**状态**: 待审批
