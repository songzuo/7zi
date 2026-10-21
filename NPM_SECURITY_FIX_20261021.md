# NPM Security Fix Report - 2026-10-21

## 执行摘要

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 总漏洞数 | 21 | 1 |
| High/Critical | 18 | 1 |
| Moderate | 2 | 0 |
| Low | 1 | 0 |

## 修复措施

### 1. npm audit fix（自动修复）
- 执行 `npm audit fix`，自动修复了部分漏洞
- 添加了 `@ducanh2912/next-pwa@10.2.9`（升级自 6.1.6）
- 修复了 `fast-csv`（通过 exceljs 依赖）
- 修复了 `redis`（通过 bull 依赖）
- 修复了 `tmp`（独立漏洞）

### 2. pnpm overrides 修复
在 `package.json` 的 `pnpm.overrides` 中添加了以下覆盖：

```json
"braces@>=3.0.0": ">=3.0.5",
"micromatch@>=0.2.0": ">=4.0.8",
```

**注意**: `braces` 官方最新版本为 `3.0.3`，无更高补丁版本（3.0.5 不存在）。此覆盖用于声明策略，实际版本仍为 3.0.3。

### 3. 依赖升级
- `@ducanh2912/next-pwa`: 6.1.6 → 10.2.9（解决了 workbox 链的漏洞）

## 剩余漏洞

### 唯一剩余：braces 栈溢出 DoS（CVE 待定）

| 属性 | 值 |
|------|-----|
| 严重性 | High |
| 包 | braces |
| 有漏洞版本 | <=3.0.3 |
| 补丁版本 | **无（官方尚未发布）** |
| 路径 | eslint-config-next > @next/eslint-plugin-next > fast-glob > micromatch > braces |

**漏洞类型**: 深度嵌套模式导致栈耗尽拒绝服务

**风险评估**:
- `jest-message-util` 路径仅影响测试环境
- `fast-glob` 路径需要攻击者能控制 ESLint glob 配置文件
- 生产环境风险较低，但建议持续关注官方更新

**缓解措施**:
1. 持续监控 `braces` 官方更新
2. 一旦发布补丁，立即执行 `pnpm update braces`
3. 考虑在未来版本中移除或替换相关依赖

## pnpm audit 结果（最终）

```
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ braces vulnerable to stack-exhaustion denial of        │
│                     │ service through deeply nested patterns                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ braces                                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ <=3.0.3                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ <0.0.0                                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ .>eslint-config-next>@next/eslint-plugin-next>fast-   │
│                     │ glob>micromatch>braces                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-vfj7-8cjw-p6xm      │
└─────────────────────┴────────────────────────────────────────────────────────┘
1 vulnerabilities found
Severity: 1 high
```

## 建议

1. **立即**：监控 `braces` 更新（官方仓库：https://github.com/micromatch/braces）
2. **短期**：考虑 fork 或替换 `fast-glob`，使用更安全的替代方案
3. **长期**：等待官方补丁，必要时手动 patch
