# 测试优化 - 快速开始指南

## 🚀 5分钟快速开始

### 选项 1: 直接应用并行优化（推荐）

```bash
# 1. 备份当前配置
cp vitest.config.ts vitest.config.ts.backup

# 2. 应用优化配置
cp vitest.config.optimized.ts vitest.config.ts

# 3. 运行测试验证
npm run test
```

**预期**: 测试时间减少 40-50%

---

### 选项 2: 使用分组测试（适合开发）

```bash
# 运行快速测试（5分钟内）
node scripts/run-test-groups.js fast

# 运行常规测试（15分钟内）
node scripts/run-test-groups.js normal

# 运行完整测试（30-40分钟）
node scripts/run-test-groups.js all

# 查看可用分组
node scripts/run-test-groups.js list
```

---

### 选项 3: 性能基准测试

```bash
# 对比优化前后的性能
node scripts/test-performance-benchmark.js
```

---

## 📝 配置文件说明

| 文件                         | 用途               | 何时使用     |
| ---------------------------- | ------------------ | ------------ |
| `vitest.config.ts`           | 当前配置（单进程） | 备份         |
| `vitest.config.optimized.ts` | 并行优化配置       | 推荐用于生产 |
| `vitest.config.fast.ts`      | 快速测试配置       | 开发调试     |
| `vitest.config.normal.ts`    | 常规测试配置       | PR检查       |
| `vitest.config.slow.ts`      | 慢速测试配置       | 按需运行     |

---

## 🎯 推荐工作流

### 开发环境

```bash
# 快速反馈：只运行快速测试
node scripts/run-test-groups.js fast

# 或者：监听模式
npm run test:watch -- --config vitest.config.fast.ts
```

### 功能开发

```bash
# 中等规模测试
node scripts/run-test-groups.js normal

# 或者：使用优化配置
npm run test -- --config vitest.config.optimized.ts
```

### PR 提交前

```bash
# 完整测试验证
npm run test:all

# 或者：优化配置的完整测试
npm run test -- --config vitest.config.optimized.ts --coverage
```

### CI/CD

```bash
# 快速检查（开发分支）
node scripts/run-test-groups.js fast

# 完整检查（主分支）
node scripts/run-test-groups.js all
```

---

## 🔧 遇到问题？

### 测试失败/不稳定

```bash
# 1. 禁用并发检查是否是并发问题
npm run test -- --no-concurrent

# 2. 降低并发数
# 编辑 vitest.config.optimized.ts，修改 maxConcurrency 为 2

# 3. 使用单进程模式
cp vitest.config.ts.backup vitest.config.ts
```

### 内存不足

```bash
# 增加内存限制
# 编辑 vitest.config.optimized.ts，修改 execArgv
execArgv: ['--max-old-space-size=6144'] // 6GB
```

### 测试顺序问题

```bash
# 1. 随机化顺序发现依赖问题
npm run test -- --sequence.shuffle

# 2. 运行单个文件检查隔离性
npm run test -- src/lib/utils.test.ts --isolate
```

---

## 📊 查看测试复杂度

```bash
# 重新分析测试复杂度
node scripts/analyze-test-complexity.js

# 查看结果
cat test-complexity-analysis.json
```

---

## ⚙️ 自定义并发数

根据服务器 CPU 核心数调整：

```typescript
// vitest.config.optimized.ts
import os from 'os'

const cpuCount = os.cpus().length
const maxWorkers = Math.max(2, cpuCount - 1) // 留一个核心

export default defineConfig({
  maxThreads: maxWorkers,
  minThreads: 2,
  test: {
    maxConcurrency: maxWorkers,
  },
})
```

---

## 📈 监控测试性能

```bash
# 生成性能报告
node scripts/test-performance-benchmark.js

# 查看历史性能数据
cat test-performance-benchmark.json
```

---

## 🎓 最佳实践

1. **开发阶段**: 使用 `fast` 模式，获得快速反馈
2. **提交前**: 运行 `normal` 模式，确保主要功能正常
3. **合并前**: 运行 `all` 模式，完整验证
4. **持续优化**: 定期查看性能基准，找出慢速测试并优化
5. **测试隔离**: 确保每个测试独立，不依赖执行顺序

---

## 🔍 故障排查命令

```bash
# 查看测试列表
npx vitest list

# 运行单个测试文件
npx vitest run src/lib/utils.test.ts

# 调试模式（进入浏览器）
npx vitest --ui

# 详细输出
npx vitest run --reporter=verbose

# 只运行失败的测试
npx vitest run --bail
```

---

## 📞 需要帮助？

查看完整文档：

- 优化方案: `TEST_OPTIMIZATION_REPORT.md`
- Vitest 文档: https://vitest.dev/

---

**提示**: 开始前，建议先运行 `node scripts/test-performance-benchmark.js` 了解当前性能基准。
