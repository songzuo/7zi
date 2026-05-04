# 架构健康检查报告 - 2026-05-04

## 发现的问题

1. **features/ 目录几乎为空** - `features/` 下仅有 `notifications` 有效运行，`agents`、`ai`、`auth` 等子目录均为空。这是典型"架构规划但未落地"的问题，建议清理或真正启用。

2. **lib/ 模块过于臃肿** - `monitoring`(1.5M)、`agents`(1.2M)、`workflow`(1M)、`ai`(900K) 四个模块合计超过 4MB+，存在"上帝模块"风险。建议按职责拆分为更小的子模块。

3. **超大型单文件** - `optimized-anomaly-detector.ts`(1557行)、`enhanced-anomaly-detector.ts`(1401行)、`bottleneck-detector.ts`(1395行) 等多个文件超过 1000 行，急需拆分。

4. **src/workflows 与 lib/workflow 存在重叠** - `src/workflows/` 和 `lib/workflow/` 同时存在且功能有交叉（均有 Parser/Executor 类），职责边界不清晰。

5. **lib/utils/index.ts 已标注 @deprecated** - 但仍在导出，建议尽快完成迁移，删除聚合入口避免混淆。

6. **index.ts 过大** - `observability/index.ts`(714行)、`logger/index.ts`(465行) 承担了过多 re-export，不符合单一职责。

7. **permissions.ts 单文件 956 行** - 建议按 v1/v2 分离模式进一步拆分。

## 建议

- 清理空的 `features/` 子目录或补充实现
- 对 1000+ 行的文件制定拆解计划（优先级：高）
- 合并或明确区分 `src/workflows` 和 `lib/workflow` 的边界
- 完成 `lib/utils` 废弃迁移

---
*检查时间: 2026-05-04 02:04 | 深度: 1/1 | 工作目录: /root/.openclaw/workspace*