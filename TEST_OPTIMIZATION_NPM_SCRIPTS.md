# 测试优化 - 配置更新说明

## 📝 需要添加到 package.json 的脚本

请将以下脚本添加到 `package.json` 的 `scripts` 部分：

```json
{
  "scripts": {
    "test:fast": "node scripts/run-test-groups.js fast",
    "test:normal": "node scripts/run-test-groups.js normal",
    "test:slow": "node scripts/run-test-groups.js slow",
    "test:all": "node scripts/run-test-groups.js all",
    "test:parallel": "vitest --config vitest.config.optimized.ts",
    "test:analyze": "node scripts/analyze-test-complexity.js",
    "test:benchmark": "node scripts/test-performance-benchmark.js"
  }
}
```

---

## 完整的 package.json scripts 示例

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "analyze": "ANALYZE=true npm run build",

    "test": "vitest",
    "test:unit": "vitest --config vitest.config.test.ts",
    "test:integration": "vitest --config vitest.config.integration.ts",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",

    "test:fast": "node scripts/run-test-groups.js fast",
    "test:normal": "node scripts/run-test-groups.js normal",
    "test:slow": "node scripts/run-test-groups.js slow",
    "test:all": "node scripts/run-test-groups.js all",
    "test:parallel": "vitest --config vitest.config.optimized.ts",
    "test:analyze": "node scripts/analyze-test-complexity.js",
    "test:benchmark": "node scripts/test-performance-benchmark.js"
  }
}
```

---

## 🚀 更新命令

你可以手动编辑 `package.json`，或者运行：

```bash
# 备份 package.json
cp package.json package.json.backup

# 更新（手动编辑后保存）
# vim package.json
```

---

## 使用新脚本

```bash
# 快速测试（开发时）
npm run test:fast

# 常规测试（PR检查）
npm run test:normal

# 完整测试（CI/CD）
npm run test:all

# 并行测试（推荐生产）
npm run test:parallel

# 分析测试复杂度
npm run test:analyze

# 性能基准测试
npm run test:benchmark
```

---

## ⚠️ 注意事项

更新 `package.json` 后，请验证脚本可用：

```bash
npm run test:fast  # 应该显示 "快速测试（低复杂度）"
npm run test:analyze  # 应该重新生成 test-complexity-analysis.json
```
