# 测试运行速度优化方案

## 📊 当前状态分析

### 测试概况

- **测试文件总数**: 312 个
- **测试用例总数**: ~1,478 个（估算）
- **当前配置**: 单进程串行执行（maxThreads: 1, maxConcurrency: 1）
- **主要问题**:
  - 所有测试串行运行，无法利用多核 CPU
  - 高复杂度测试（204个，65%）阻塞整体进度
  - 内存限制过低（2GB），限制了并行能力

### 复杂度分布

| 复杂度级别    | 文件数 | 占比 | 特点                        |
| ------------- | ------ | ---- | --------------------------- |
| 🔴 高 (>50)   | 204    | 65%  | 100+ 测试用例，1000+ 行代码 |
| 🟡 中 (20-50) | 83     | 27%  | 20-100 测试用例             |
| 🟢 低 (<20)   | 25     | 8%   | <20 测试用例，快速执行      |

## 🚀 优化方案

### 方案 1: 并行化优化（推荐）

#### 配置更改

```diff
- maxThreads: 1
- minThreads: 1
- maxConcurrency: 1
+ maxThreads: 4-8 (根据CPU核心数)
+ minThreads: 2
+ maxConcurrency: 4-8
- singleFork: true
+ singleFork: false
```

#### 预期效果

- **提速**: 3-5x（假设8核CPU）
- **内存需求**: 4-8GB
- **风险**: 中等（需要修复并发问题）

#### 文件

- `vitest.config.optimized.ts` - 并行化配置
- 直接替换现有 `vitest.config.ts` 即可使用

---

### 方案 2: 测试分组执行

#### 分组策略

```
快速测试 (fast)   → 25 文件   → 5 分钟
常规测试 (normal) → 83 文件   → 15 分钟
慢速测试 (slow)   → 204 文件  → 30 分钟
```

#### 使用方式

```bash
# 运行所有测试（分阶段）
npm run test:all

# 运行快速测试
npm run test:fast

# 运行特定分组
node scripts/run-test-groups.js fast|normal|slow
```

#### 预期效果

- **快速反馈**: 5分钟内运行25个简单测试
- **并行执行**: 各组可以并行运行（如果使用多个进程）
- **灵活性**: 根据需求选择运行哪些测试
- **提速**: 2-3x（整体）

#### 文件

- `vitest.config.fast.ts` - 快速测试配置
- `vitest.config.normal.ts` - 常规测试配置
- `vitest.config.slow.ts` - 慢速测试配置
- `scripts/run-test-groups.js` - 分组运行脚本
- `scripts/analyze-test-complexity.js` - 复杂度分析脚本

---

### 方案 3: 混合方案（最佳）

#### 配置

1. **并行化**: 使用 `vitest.config.optimized.ts`
2. **分组**: 保留分组配置，用于特定场景
3. **智能调度**:
   - 开发时：运行 `test:fast` 获得快速反馈
   - PR检查：运行 `test:normal` 检查大部分功能
   - CI/CD：运行 `test:all` 确保完整覆盖

#### 预期效果

- **开发体验**: 快速测试 <1分钟
- **PR检查**: 10-15分钟
- **完整CI**: 30-40分钟（vs 原来可能 >60分钟）
- **总体提速**: 3-5x

## 📝 实施步骤

### Step 1: 备份当前配置

```bash
cp vitest.config.ts vitest.config.ts.backup
```

### Step 2: 应用并行化配置

```bash
cp vitest.config.optimized.ts vitest.config.ts
```

### Step 3: 测试新配置

```bash
# 运行少量测试验证
npm run test -- --run src/lib/utils-core.test.ts

# 运行快速测试组
node scripts/run-test-groups.js fast
```

### Step 4: 添加 npm scripts

在 `package.json` 中添加：

```json
{
  "scripts": {
    "test:fast": "node scripts/run-test-groups.js fast",
    "test:normal": "node scripts/run-test-groups.js normal",
    "test:slow": "node scripts/run-test-groups.js slow",
    "test:all": "node scripts/run-test-groups.js all",
    "test:parallel": "vitest --config vitest.config.optimized.ts"
  }
}
```

### Step 5: CI/CD 调整

根据需要调整 CI 配置，建议：

- 开发分支：只运行 `test:fast`
- 功能分支：运行 `test:normal`
- 主分支：运行 `test:all`

## ⚠️ 注意事项

### 并行化风险

1. **测试隔离问题**: 某些测试可能共享状态或依赖执行顺序
2. **资源竞争**: 并行访问数据库/文件系统可能导致问题
3. **内存限制**: 需要确保服务器有足够内存（建议 >8GB）

### 应对策略

1. **先小规模测试**: 运行 `test:fast` 验证并行化
2. **查看失败测试**: 注意是否有新的失败测试
3. **调整并发数**: 根据实际情况调整 `maxConcurrency`
4. **使用测试隔离**: 确保每个测试独立运行

### 调试建议

```bash
# 运行单个测试文件检查隔离性
vitest run --isolate src/lib/utils.test.ts

# 禁用并发对比结果
vitest run --no-coverage --no-isolate

# 查看详细日志
vitest run --reporter=verbose
```

## 📈 预期改进

| 指标         | 当前     | 优化后    | 改进        |
| ------------ | -------- | --------- | ----------- |
| 快速测试时间 | N/A      | <1分钟    | ✓           |
| 常规测试时间 | N/A      | 10-15分钟 | ✓           |
| 完整测试时间 | 60+ 分钟 | 30-40分钟 | **40-50%↓** |
| 并发度       | 1        | 4-8       | **4-8x↑**   |
| CPU利用率    | 12.5%    | 50-100%   | **4-8x↑**   |

## 🎯 后续优化建议

1. **修复慢速测试**: 找出并优化最慢的50个测试
2. **Mock优化**: 减少不必要的真实API调用
3. **数据库隔离**: 使用测试数据库或内存数据库
4. **缓存策略**: 利用 Vitest 缓存功能
5. **测试拆分**: 将大型测试文件拆分为多个小文件

## 📄 相关文件

- `vitest.config.optimized.ts` - 并行化主配置
- `vitest.config.fast.ts` - 快速测试配置
- `vitest.config.normal.ts` - 常规测试配置
- `vitest.config.slow.ts` - 慢速测试配置
- `scripts/analyze-test-complexity.js` - 复杂度分析
- `scripts/run-test-groups.js` - 分组运行脚本
- `test-complexity-analysis.json` - 复杂度分析结果

---

**生成时间**: 2026-03-23
**分析工具**: Vitest 4.1.0 + 自定义脚本
**测试文件**: 312 个
