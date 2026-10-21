# HEARTBEAT - 持续工作调度

## 最后检查: 2026-10-21 16:30 UTC

### 调度状态
- **子代理模型问题**: ✅ 已修复（2026-10-21 07:39 修改 openclaw.json）
  - primary=fallback=`minimax/MiniMax-M2.7`（config validate 通过）
- **当前活跃任务**: 0（全部由主管直接执行）
- **失败模式**: 偶发 `API rate limit reached`（FailoverError），非模型配置问题

### 🔴 本轮修复：7zi.com 域名解析错误
- **现象**: 本机 `curl https://7zi.com` 超时（000），而 Cloudflare 真实 IP 直连返回 403/200
- **根因**: `/etc/hosts` 中残留陈旧硬编码 `165.99.43.61 7zi.com`（该源站已不可达，443 端口不通）
- **修复**: 改为 `104.21.59.229 7zi.com`（Cloudflare 权威解析值）
- **结果**: `7zi.com` 恢复 200（0.87s），浏览器 UA 正常
- ⚠️ 原文件已备份到 `/tmp/hosts.bak.*`；该行会被系统模板覆盖，需固化方案

### 本轮完成（18:30）
1. **TypeScript 错误 -85**（282 → 197）— 提交 `fa0c56ecf`
   - `logger.ts`: error/data 放宽为 `unknown`，新增 `toError()` 归一化（解决 37 处）
   - `api/projects/route.ts`: `updateProject/deleteProject/getProject` 改用 `ctx.user`（解决 15 处 `Cannot find name 'user'`）
   - `pwa/web-push-service.ts`: 区分原生 `PushSubscription` 与本地序列化接口，新增 `toSerializableSubscription()`（8 处）
2. **测试基线对比**（全量 vitest，约 5 分钟/轮）
   - 基线 (HEAD): 65 文件失败 / 215 用例失败
   - 修改后: 64 文件失败 / 214 用例失败 → **无回归**，净减 1

### 系统状态（正常）
| 项 | 状态 |
|---|---|
| 配置校验 | ✅ Config valid |
| 磁盘 | 75% (108G/145G) |
| PM2 7zi-shop | online (2天, :3001) |
| Nginx | active |
| Docker | 4 容器全 healthy |
| 7zi-backend 测试 | 10 套件 / 111 用例全绿 |
| 7zi-frontend tsc | 197 errors (非测试 ~103 / 测试 ~94) |

### 待关注
1. **`/etc/hosts` 固化** — 7zi.com 行的临时修改会在系统重装/模板刷新时丢失，需改 `cloud.cfg` 或部署脚本
2. **Git 未提交**：`T1_VITEST_TESTFIX_20261021.md`、`state/tasks.json`、`T4_SMS_CHANNEL_TEST_20261021.md`
3. **TypeScript 剩余 197 错误**，主要热点：
   - `useAnalytics.ts` — `AnalyticsService` 缺 `getWorkflowStats/getExecutionTrend/getExecutionDetails`（API 漂移）
   - `client-notification-manager.ts` — 导入不存在的 `websocketManager` 单例（重构后未补导出）+ 3 个类型与 DOM 全局冲突
   - `form-validator.ts` — 类型谓词不可赋值 + `AsyncValidator` 强转不安全
   - `useRichTextEditor.ts` — `Placeholder` 未导入、`SetContentOptions` 用法过时
4. **测试失败 64 文件 / 214 用例**（多为基线存量）：
   - `notification-system.test.ts` — 相对导入路径错（`./notification-types` 应为 `../notification-types`）
   - `notification-init.test.ts` — 期望 `console.log` 但实现走 logger
   - `web-push-service.test.ts` — 6 个失败，mock 未提供 `PushManager`，基线已失败
5. **npm 漏洞**：22 个（7 high），主因 uuid/exceljs 传递依赖，force fix 会破坏 exceljs
6. **workflow-engine 历史套件** 207 用例有 1 个失败（resumeAndCheckpoint），且未纳入根级 jest
7. **7zi-backend 未接入 CI**，覆盖率阈值无法作为门禁
8. **⚠️ 自动清理脚本**（`scripts/cleanup-unused-imports.cjs`、`fix-any-types.cjs`）会误改类型，
   之后再运行务必配 `tsc --noEmit` 校验
