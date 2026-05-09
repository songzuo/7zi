# 测试套件验证报告 - 2026-05-09

## 测试状态
**部分通过** — 测试可运行，但有部分失败

## 测试命令
```bash
pnpm test:run
```

## 测试概况
- **总测试文件**: 大量测试文件
- **总测试数**: 数千个测试
- **通过**: 大部分测试通过
- **失败**: 4个测试文件共46个测试失败
- **跳过**: 部分测试被跳过
- **耗时**: 约 ~50秒

## 失败的测试

### 1. `src/lib/auth/__tests__/auth.test.ts` (1个失败)
- ❌ `should reject invalid email` — 50ms

### 2. `src/lib/workflow/__tests__/history.test.ts` (16个失败)
- ❌ `should filter by workflowId` — 34ms
- ❌ `should filter by operation type` — 2ms
- ❌ `should filter by userId` — 2ms
- ❌ `should filter by success status` — 2ms
- ❌ `should return summary statistics` — 2ms
- ❌ `should support pagination` — 2ms
- ❌ `should filter by time range` — 1ms
- ❌ `should export to CSV format` — 2ms
- ❌ `should escape CSV values with quotes` — 2ms
- ❌ `should export to JSON format` — 2ms
- ❌ `should include summary in export` — 1ms
- ❌ `should return audit statistics` — 1ms
- ❌ `should delete old history entries` — 1ms
- ❌ `should keep recent entries` — 2ms
- ❌ `should delete all history for a workflow` — 1ms
- ❌ `should record multiple operations in a transaction` — 2ms

### 3. `tests/automation/default-templates.test.ts` (11个失败)
- ❌ `应该从模板创建新规则`
- ❌ `应该生成唯一的规则 ID`
- ❌ `新规则的状态应该是 paused`
- ❌ `应该重置执行统计`
- ❌ `应该更新创建和修改时间`
- ❌ `应该支持覆盖模板字段`
- ❌ `应该支持覆盖触发器`
- ❌ `应该支持覆盖动作`
- ❌ `应该支持覆盖条件`
- ❌ `应该支持覆盖限制`
- ❌ `应该保留模板的元数据`

### 4. `tests/automation/default-templates-edge-cases.test.ts` (18个失败)
- 多个关于覆盖处理和规则创建的测试失败

## 警告/非错误问题

以下为**正常行为**的警告：
- 图表组件测试中 `The width(0) and height(0) of chart should be greater than 0` — 属于正常警告
- React `act()` 警告 — 测试中的 state 更新警告，不影响测试结果
- BudgetConfig 错误日志 — 测试预期行为

## 建议

### 高优先级修复

1. **auth.test.ts** — 检查邮箱验证逻辑，`should reject invalid email` 测试失败
2. **history.test.ts** — 16个测试失败，可能与 mock 数据或数据库查询相关，需要检查过滤和分页逻辑
3. **default-templates** — 自动化模板相关的测试失败，可能需要检查 `createRuleFromTemplate` 函数实现

### 建议
- 这些失败测试多为**业务逻辑测试**，而非依赖或环境问题
- 建议分配给相应的子代理修复
- 测试框架本身运行正常，vitest 配置无误
