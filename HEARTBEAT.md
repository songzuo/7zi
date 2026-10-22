# HEARTBEAT - 持续工作调度

## 最后检查: 2026-10-22 05:25 (Berlin)

### 🎉 今日里程碑汇总（全部经主管独立复跑验证）

| 项 | 起始 | 现状 |
|---|---|---|
| 前端 TypeScript 错误 | 425 | **0** |
| 前端 ESLint `src/lib` 错误 | 10+ | **0** |
| 工作流条件引擎缺陷 | 4 处 | **0**（含表达式注入风险）|
| 明文密码（跟踪文件） | 62 处 | **0** |
| 部署脚本源站 IP | 已下线 | **198.44.179.155**（已验证）|

### 本轮提交（7 个）
- `d66b7ce11` G-2 组类型修复（11 → 8）
- `c8c4c59d2` G-1 组类型修复（8 → **0**）
- `e89c0093e` no-case-declarations（9 处 case 加块）
- `adbcea929` **safeEval 引擎重写**（源码 bug，非测试问题）
- `113c6dc9b` src/lib lint 清理（8 文件）
- `c507675c9` / `2101e51f2` 心跳文档

### 关键成果
1. **Tailwind v4 工具类全丢**（整站样式静默失效）→ 已修
2. **safeEval 4 处缺陷**：裸变量名解析失败 / 字符串比较损坏 / 假值语义错误 / 运算符误判；
   变量改为 JS 字面量注入，**顺带消除表达式注入风险**
3. **jest haste map 不遍历符号链接** → `7zi-backend/workflow-engine` 的 `npm test`
   一直是 "No tests found"，等于从未真正跑过
4. **凭据泄露**：主仓库 + botmem 共 62 个跟踪文件明文密码 → `${SSH_PASSWORD}` 引用

### 仍在运行
- T22 sysadmin-backend-ci（7zi-backend README 端口 + GitHub Actions CI）
- T23 consultant-npm-vuln（npm 漏洞 22 个分级）

### 待关注
1. **git 历史仍含明文密码**（10+ commit）— 重写历史需主人决策
2. **GitHub PAT 建议轮换**（`~/.git-credentials` 与 botmem remote 曾内嵌）
3. **线上 7zi-project 暗色主题**：缺 `@custom-variant dark`，手动切主题时 `dark:` 类不生效
4. **`.env.secrets` 密码不统一**（短版 / 带 `$ZZ` 长版均可登录）— 请确认唯一正确密码
5. **backend ESLint 崩溃**：`@typescript-eslint/no-unused-expressions` 版本冲突（既有问题）

---

## 最后检查: 2026-10-21 19:05 (17:05 UTC)

### 🔴 本轮 P0 修复：Tailwind v4 工具类完全未生成（已提交 bfad61fa7）
- **现象**: `next build` exit 0，但产物 CSS 仅 **19,907 字节 / 149 条规则**，`.flex`/`.bg-white`/`.text-gray-500` 计数全为 **0** → 整站样式静默失效
- **根因**: `7zi-frontend/src/app/globals.css` 沿用 v3 写法，**从未 import Tailwind 入口**。项目已升到 tailwindcss@4.2.2，v4 必须 `@import "tailwindcss"`。`git log -S'@tailwind base'` 证实该文件历史从未有过 Tailwind 入口 —— 是从 `7zi-project` 拆分时丢失的
- **次生问题**: v4 默认 dark 走 `prefers-color-scheme`，而 `ThemeContext.tsx` 用 `classList.toggle('dark')` 手动切换 → 策略不一致
- **修复** (3 行): `@import 'tailwindcss'` + `@config '../../tailwind.config.js'`（复用 v3 格式配置的 CSS 变量色板/spacing/keyframes）+ `@custom-variant dark (&:where(.dark, .dark *))`
- **验证**: build exit 0；CSS **19,907 → 141,121 字节**；`.flex`/`.bg-white`/`.text-gray-500`/`.grid`/`.rounded-lg` 全部生成；`prefers-color-scheme` 包裹消除；content glob 之外的 `src/features` 类名（`bg-zinc-800`）亦正确产出
- **报告**: `TAILWIND_V4_P0_FIX_20261021.md`
- ⚠️ **未做视觉回归**（仅验证 CSS 结构）。工具类从 0 变全量后页面外观将显著变化（原为无样式裸 HTML），上线前需人工过关键页面
- ⚠️ **在线站点 7zi-project 同类问题**: 无 `@custom-variant dark`，69,671 字节（28%）`dark:` 规则被包在 `prefers-color-scheme` 内，而 `preferencesStore.ts` 手动切 class → 手动切主题时 `dark:text-zinc-*`(1017)/`dark:bg-zinc-*`(562) 不响应。**待主人确认后再改线上**

### 前一轮状态（18:40-18:45）

### 本轮状态（18:40-18:45）
- **tsc 错误 197 → 154**（-43），工作区 20 个改动文件（含 2 个新增测试文件）
- **子代理**: 5 个任务中 3 个仍运行、2 个已完成（TS修复 round3、暗色审查）
- **/etc/hosts 固化**: ✅ `etc-hosts-fix.service` enabled + active，另有 cloud-init 模板双路径写入
- **7zi.com**: 浏览器 UA → 200 (0.12s)，裸 curl → 403（Cloudflare 边缘拦截，非故障）
- **nginx**: active，配置校验通过
- **Docker**: 4 容器全 healthy
- **磁盘**: 75% (108G/145G)
- 报告文件尚未落盘（子代理仍在写），已见 T1/T2/T3/T4/T6 + DEV_TASKS 报告

### 调度更新: 2026-10-21 18:35 (持续工作调度器)

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
| 7zi-frontend tsc | 154 errors（原 197）|

### 🔴 本轮主管直修：两个 P0（18:45-18:50）
详见 `INFRA_TAILWIND_FIX_20261021.md`

1. **P0-1 Tailwind 工具类全丢**（7zi-frontend）
   - 根因：Tailwind v4 必须 `@import 'tailwindcss'`，但 globals.css 从未引入
   - 修复：`@import 'tailwindcss'` + `@config '../../tailwind.config.js'` + `@custom-variant dark`
   - 验证：构建 CSS 19.9KB → 141KB，`--tw-` 0 → 1030，`.dark` 作用域 0 → 297，`next build` 成功
2. **P0-2 部署脚本指向已下线 IP + 明文密码**
   - `165.99.43.61`（22/443 均不可达）→ `198.44.179.155`（已验证为真实 7zi.com 源站，pm2 7zi-shop + 有效证书）
   - 明文密码 → `${SSH_PASSWORD}` 引用，脚本内明文计数 0
   - 备份在 `/tmp/deploy.sh.bak`、`/tmp/health-check.sh.bak`

### 🔐 本轮主管直修：凭据全面清除（19:00-19:20）
- 主工作区 + botmem 两个仓库，**62 个跟踪文件**的明文密码 → `${SSH_PASSWORD}` 引用
- 提交：`91f3e7c9d` / `7ef03c17b` / `f2f81e758` / botmem `4f5aaefaa0`
- `git grep 'ge20993344'` 全仓命中 **0**
- 顺带把 botmem `.git/config` 里明文 GitHub PAT 从 remote URL 移除（凭据已在 `~/.git-credentials`）

### 待关注
1. ~~**`/etc/hosts` 固化**~~ ✅ 已解决（`etc-hosts-fix.service` + cloud-init 模板双路径）
2. ~~**Git 未提交**~~ ✅ 本轮已全部提交
3. **git 历史仍含明文密码**（`34fead4a2` 等 10+ commit）— 是否重写历史需主人决策
   - 另：`~/.git-credentials` 与 botmem remote 曾内嵌 GitHub PAT，建议**轮换该 token**
4. **`.env.secrets` 与历史脚本中的密码值不同**（短版 / 带 `$ZZ` 长版，两者实测均可登录）— 请确认唯一正确密码并统一
5. **TypeScript 剩余 154 错误**（原 197，已由 round3 修复 -43），主要热点：
   - `useAnalytics.ts` — `AnalyticsService` 缺 `getWorkflowStats/getExecutionTrend/getExecutionDetails`（API 漂移）
   - `client-notification-manager.ts` — 导入不存在的 `websocketManager` 单例（重构后未补导出）+ 3 个类型与 DOM 全局冲突
   - `form-validator.ts` — 类型谓词不可赋值 + `AsyncValidator` 强转不安全
   - `useRichTextEditor.ts` — `Placeholder` 未导入、`SetContentOptions` 用法过时
6. **测试失败 64 文件 / 214 用例**（多为基线存量）：
   - `notification-system.test.ts` — 相对导入路径错（`./notification-types` 应为 `../notification-types`）
   - `notification-init.test.ts` — 期望 `console.log` 但实现走 logger
   - `web-push-service.test.ts` — 6 个失败，mock 未提供 `PushManager`，基线已失败
7. **npm 漏洞**：22 个（7 high），主因 uuid/exceljs 传递依赖，force fix 会破坏 exceljs
8. **workflow-engine 历史套件** 207 用例有 1 个失败（resumeAndCheckpoint），且未纳入根级 jest
9. **7zi-backend 未接入 CI**，覆盖率阈值无法作为门禁
10. **⚠️ 自动清理脚本**（`scripts/cleanup-unused-imports.cjs`、`fix-any-types.cjs`）会误改类型，
   之后再运行务必配 `tsc --noEmit` 校验

---

## 调度更新: 2026-10-21 18:35 (持续工作调度器)

**检查结果**: 空闲子代理 0 个 → 派发 5 个并行任务 (目标 3-5, 已达上限)

| # | 子代理 | 任务 | 模型 | 报告 |
|---|--------|------|------|------|
| 1 | Executor-TS修复 | 7zi-frontend tsc 197 错误 → 继续降, 选错误最多 3-5 文件 | minimax/M2.7 | TS_FIX_ROUND3_20261021.md |
| 2 | 测试员-SMS | 补齐 SMS 通道测试 + 全量 vitest 回归对比 | minimax/M2.7 | T7_SMS_CHANNEL_TEST_20261021.md |
| 3 | 系统管理员 | /etc/hosts 7zi.com 固化到 cloud-init/systemd, 防模板覆盖 | minimax/M2.7 | INFRA_HOSTS_HARDENING_20261021.md |
| 4 | 咨询师-安全 | 凭据泄漏面 + npm audit + CSP 差异 + 鉴权抽查 (只读) | minimax/M2.7 | SECURITY_AUDIT_ROUND2_20261021.md |
| 5 | 设计师-暗色 | 硬编码颜色审查 + 修 8 个高频组件 | minimax/M2.7 | DARK_MODE_REVIEW_20261021.md |

**红线 (已写入子代理任务)**: 不 git commit / 不覆盖未提交改动 / 不动 email-alert.ts、smtp-tester.ts / 不动 7zi-backend (除任务2测试)
