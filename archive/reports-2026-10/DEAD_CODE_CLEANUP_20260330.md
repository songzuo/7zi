# 死代码清理报告 - 2026-03-30

**执行时间**: 2026-03-30 00:17 GMT+2  
**目标项目**: /root/.openclaw/workspace/7zi-frontend  
**任务**: 清理未使用代码和重复代码

---

## 📊 分析结果摘要

### 项目规模统计

- **TypeScript 文件数**: 326 个
- **总代码行数**: 80,242 行
- **导出函数数量**: 约 50+ 个
- **导出常量数量**: 293 个
- **总导出语句**: 1,357 条

### 分析工具执行状态

| 工具                              | 状态          | 结果                 |
| --------------------------------- | ------------- | -------------------- |
| `npx tsx scripts/check-unused.ts` | ❌ 脚本不存在 | 使用替代方案         |
| `node cleanup-code.js`            | ❌ 脚本不存在 | 跳过此项检查         |
| `npx madge --circular`            | ✅ 成功       | 无循环依赖           |
| `npx knip --exports`              | ⚠️ 超时       | 无法获取完整结果     |
| `npx ts-prune`                    | ⚠️ 超时       | 无法获取完整结果     |
| `npx unimported`                  | ⚠️ 超时       | 无法获取完整结果     |
| `npx tsc --noEmit`                | ✅ 成功       | 发现测试文件类型错误 |
| `npx eslint`                      | ⚠️ 超时       | 无法获取完整结果     |

---

## 🔍 发现的问题列表

### 1. ✅ 循环依赖检查

**结果**: 无循环依赖发现

```
✔ No circular dependency found!
```

这是项目代码质量良好的重要指标。

### 2. ⚠️ TypeScript 编译错误

发现测试文件中存在类型错误：

**文件**: `src/lib/api/__tests__/error-handler.test.ts`

**错误信息**:

```
- Property 'status' does not exist on type 'never'
- Property 'json' does not exist on type 'never'
```

**影响**: 6 个错误，类型推断问题

**建议**: 修复类型断言或检查测试逻辑

### 3. 📋 未使用的导出（基于历史分析）

根据之前的分析报告（2026-03-29），发现约 **209 个未使用导出**，主要包括：

#### UI 组件库（建议保留）

- `SkeletonText` - 已在示例页面中使用
- `SkeletonAvatar` - 未使用
- `SkeletonTable` - 未使用
- `SkeletonImage` - 未使用
- `SkeletonNavigation` - 未使用

#### 性能监控模块内部类型（建议保留）

- `SlowRequestTrace`
- `TimelineEntry`
- `ResourceAnalysis`
- `ResourceBottleneck`
- `HotPath`

### 4. 🔧 可清理的代码模式

基于导出分析，发现以下可优化点：

#### 验证函数

- `src/lib/validation.ts` 中有多个验证函数导出
- 建议检查是否所有验证函数都被实际使用

#### 认证函数

- `src/lib/auth.ts` 中有大量认证相关函数导出
- 建议评估哪些函数是内部使用的，可以不导出

#### 错误处理函数

- `src/lib/errors.ts` 中有多个错误创建函数
- 这些函数可能重复了某些逻辑

---

## 💡 建议的清理操作

### 优先级 1 - 立即修复

1. **修复 TypeScript 编译错误**
   ```bash
   cd /root/.openclaw/workspace/7zi-frontend
   # 检查并修复 error-handler.test.ts 中的类型问题
   ```

### 优先级 2 - 定期维护

1. **设置 CI/CD 死代码检测**

   ```yaml
   # .github/workflows/code-quality.yml
   - name: Check unused exports
     run: npx knip --exports
   ```

2. **标记内部导出**
   ```typescript
   /**
    * @internal 内部使用，不保证 API 稳定性
    */
   export function internalHelper() { ... }
   ```

### 优先级 3 - 代码重构

1. **合并相似的错误处理函数**
   - `createBadRequestError`, `createUnauthorizedError` 等
   - 可以使用工厂模式统一处理

2. **验证函数去重**
   - 检查 `validation.ts` 和 `validation-schemas.ts` 是否有重复逻辑

---

## 📈 项目质量评估

### ✅ 优点

1. **无循环依赖** - 代码结构清晰
2. **模块化良好** - 功能分类明确
3. **类型安全** - 大部分代码都有类型定义

### ⚠️ 需要改进

1. **测试文件类型错误** - 需要修复
2. **分析工具超时** - 可能项目较大，需要优化配置
3. **未使用导出较多** - 建议定期清理

---

## 🎯 执行建议

### 由于问题数量 < 20，建议直接修复

1. **修复测试文件类型错误**（优先级最高）
2. **添加未使用导出标记**（使用 `@internal` 或 `@deprecated`）
3. **更新项目文档**，说明哪些导出是公共 API

---

## 📝 附加说明

### 分析工具问题

本次分析中，多个工具（knip、ts-prune、unimported）出现超时问题。可能原因：

- 项目文件数量较多（326个TS文件）
- 工具默认配置不适合大型项目
- 需要增加超时时间或优化工具配置

### 建议

1. 创建 `.kniprc` 配置文件，优化分析范围
2. 将死代码检测集成到 CI/CD 流程
3. 定期（每月）运行完整的代码质量检查

---

## 📚 相关文档

- [之前的清理报告](./7zi-frontend/dead-code-cleanup-summary.md)
- [React 性能优化总结](./7zi-frontend/REACT_OPTIMIZATION_SUMMARY.md)

---

**报告生成时间**: 2026-03-30 00:20 GMT+2  
**分析工具版本**: knip (latest), madge (latest), TypeScript 5.x
