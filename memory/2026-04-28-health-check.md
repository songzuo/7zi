# 7zi-frontend 健康检查报告

**检查日期**: 2026-04-28
**版本**: 1.14.1

---

## 1. 构建状态: ❌ 失败

- **问题**: `better-sqlite3` 原生模块未编译
- **原因**: `node_modules/.pnpm/better-sqlite3@12.8.0` 缺少 `.node` 绑定文件
- **影响**: API 路由 `/api/feedback/export` 和 `/api/feedback/response` 启动时崩溃
- **建议**: 在目标机器上运行 `pnpm rebuild better-sqlite3` 重新编译原生模块

---

## 2. TypeScript 错误: ⚠️ 7 个错误

| 文件 | 行号 | 问题 |
|------|------|------|
| `src/lib/validation/form-validator.ts` | 210, 218 | 类型转换错误：`ValidationRule` → `AsyncValidator` 不兼容 |
| `src/lib/validation/use-validation.ts` | 215 | 返回类型不匹配 |
| `src/lib/validation/validators.ts` | 409, 414 | `Type 'Number' has no call signatures` |
| `src/lib/validation/validators.ts` | 444 | 类型转换错误 |
| `src/lib/webhook/__tests__/webhook.test.ts` | 309 | Mock 类型不匹配 |
| `src/lib/workflow/__tests__/replay-engine.test.ts` | 29 | `triggerType` 属性不存在于 `ExecutionHistory` |

---

## 3. 测试通过率: ⚠️ 部分失败

- **结果**: 大部分通过，2 个测试重试后仍失败
- **失败测试**:
  - `PerformanceChart.test.tsx`: `handles mouse events on chart` (超时 2048ms)
  - `PerformanceChart.test.tsx`: `removes tooltip on mouse leave` (超时 2071ms)
  - `retry-engine.test.ts`: `应该在达到最大重试次数后放弃` (超时 2048ms)
- **问题**: 均为超时相关，可能是测试环境性能问题或异步逻辑问题

---

## 4. 安全漏洞: ⚠️ 9 个漏洞

| 漏洞 | 严重性 | 状态 |
|------|--------|------|
| postcss <8.5.10 (XSS) | moderate | 已有覆盖 |
| serialize-javascript (RCE+DoS) | high | **已有 pnpm.overrides** 覆盖 (>=7.0.5) |
| uuid <14.0.0 | moderate | 已有 pnpm.overrides 覆盖 (>=14.0.0) |
| workbox-build → serialize-javascript | high | 已被 overrides 覆盖 |

**注**: `serialize-javascript` 和 `uuid` 通过 `package.json` 的 `pnpm.overrides` 已强制使用安全版本。

---

## 5. 环境配置: ⚠️ 缺失

- `.env.production` 文件**不存在**
- 仅存在 `.env.example`（149行，模板完整）
- **建议**: 部署前必须创建 `.env.production` 并填充以下关键变量：
  - `JWT_SECRET`（生产必须 64+ 字符随机密钥）
  - `DATABASE_URL`（MongoDB 连接）
  - `NEXT_PUBLIC_APP_URL`
  - 其他 API 密钥等

---

## 总结

| 项目 | 状态 |
|------|------|
| 构建 | ❌ 需修复 native 模块 |
| TypeScript | ⚠️ 7 个类型错误 |
| 测试 | ⚠️ 偶发超时失败 |
| 安全 | ✅ overrides 已覆盖高危漏洞 |
| 环境配置 | ❌ 缺少 .env.production |

**优先处理**:
1. 部署前运行 `pnpm rebuild better-sqlite3` 修复 native 绑定
2. 创建并完善 `.env.production`
3. 修复 TypeScript 类型错误
