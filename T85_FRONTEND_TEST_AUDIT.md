# T85 前端测试套件健康普查报告

**执行人**：🧪 测试员 T85
**仓库**：`/root/.openclaw/workspace/7zi-frontend`
**时间**：2026-10-24 05:39–05:52 (Asia/Shanghai)
**命令**：`npx vitest run --reporter=json`（全量，两轮：修复前 / 修复后）
**配置**：vitest 5.0.5，jsdom，pool=forks，**testTimeout=12s / hookTimeout=10s / retry=1**，include=`src/**/*.{test,spec}.{ts,tsx}` + `tests/**/*.{test,spec}.{ts,tsx}`

---

## 1. 全量统计数字

| 指标 | 修复前 | 修复后 | 变化 |
|---|---|---|---|
| 收集到的测试文件 | 262 | 261 | -1（vitest 不再误收 Playwright 用例） |
| **失败文件数** | **54** | **50** | **-4** |
| 用例总数 | 5727 | 5831 | +104（原「文件级崩溃」的文件现在能真正执行） |
| 通过用例 | 5500 | 5572 | +72 |
| **失败用例数** | **195** | **227** | +32（`tests/api-integration/notifications.test.ts` 语法修复后暴露出的真实断言失败） |
| pending | 32 | 32 | — |

> 失败用例数上升不是"变差"：修复前 `notifications.test.ts` / `mobile-components.test.ts` 是**整个文件解析崩溃**，其 104 个用例根本没被执行、也没被计入。现在它们能跑了，真实断言问题被暴露出来。
> `src/lib/collab/**` 全部通过；`tests/features/collab-client.test.ts`（15 失败）属 T82 范围，本次**未触碰**。

---

## 2. 失败用例清单及分类（修复后剩余 50 文件 / 227 用例）

### A. 导入 / 模块解析失败（3 文件）
| 文件 | 现象 | 分类 |
|---|---|---|
| `tests/api-integration/agents.test.ts` | `Failed to resolve import "./helpers"` | 导入失败（后端测试基建缺失 + `supertest` 未安装） |
| `tests/api-integration/collab.test.ts` | 同上 | 导入失败（同上） |
| `src/components/monitoring/__tests__/PerformanceMonitorDashboard.test.tsx` | `There was an error when mocking a module`（vi.mock 工厂引用了顶层变量，hoist 报错） | 导入失败 / mock hoist |

### B. 解析 / 收集配置错误（**已全部修复**，见第 4 节）
`tests/api-integration/notifications.test.ts`（多余右括号）、`tests/features/mobile-components.test.ts`（.ts 里写 JSX）、`tests/e2e/multi-agent-collaboration.spec.ts`（Playwright 用例被 vitest 收集）、`tests/lib/workflow/types.test.ts`（相对路径错）、`src/hooks/__tests__/usePerformanceMonitoring.test.ts` 与 `src/components/ui/feedback/__tests__/ErrorFallback.test.tsx`（ESM 下 `require()` 无法解析 `@/` 别名）。

### C. 超时（1 用例）
- `src/hooks/__tests__/useTouchGestures.test.ts` → *should toggle zoom on double-tap*：`Test timed out in 12000ms`（双击检测用了真实 setTimeout，fake timer 未推进）。

### D. 手势 / 触摸事件未触发（40 用例）— 最大单一簇
- `src/hooks/__tests__/useTouchGestures.test.ts`（25）
- `src/hooks/__tests__/useSwipe.test.ts`（16）
共同特征：断言 `expect(onRight).toHaveBeenCalled()` 全部为 0 次调用。原因：React 19 + jsdom 下 `fireEvent.touchStart/touchMove` 构造的 TouchEvent 与 hook 内部读取的 `e.touches[0]` 不匹配（jsdom 未实现 TouchEvent 构造，Touch 对象缺失）。**属实现/测试基建问题，不宜在本次盲改。**

### E. 断言不符 —— 产品行为已演进，测试期望过时（~120 用例）
| 文件 | 失败数 | 现象 |
|---|---|---|
| `tests/api-integration/notifications.test.ts` | 32 | 鉴权 mock 不生效，接口返回 403 而非 401/201/400；错误体结构从 `message` 变 `{type,message}` |
| `tests/api-integration/a2a-jsonrpc.test.ts` | 23 | 期望 200/201 实得 400（后端契约差异） |
| `src/lib/__tests__/validation-schemas-security.test.ts` | 11 | `sanitizeSqlString/NoSqlString/Html/CommandString` 期望过时的净化结果 |
| `src/lib/performance/alerting/__tests__/alerter.test.ts` | 10 | 全项目改用结构化 logger 后，`console.log` 断言（`[EMAIL]`/`[SLACK]`…）不再成立 |
| `src/app/api/health/__tests__/server-actions.test.ts` | 7 | `response` 为 undefined，Server Action 调用姿势已变 |
| `src/lib/pwa/__tests__/web-push-service.test.ts` | 6 | jsdom 无 ServiceWorker / Push API，`isSupported` 恒 false |
| `src/lib/ai/dialogue/__tests__/EnhancedIntentAnalyzer.test.ts` | 6 | 意图分类算法调整（greeting/command/compliment… 判为 question/unknown） |
| `src/components/monitoring/__tests__/AlarmConfigPanel.test.tsx` | 6 | 文案变更 + `Metric`/`Threshold` 等 label 重复 |
| `src/features/monitoring/components/SimplePerformanceDashboard.test.tsx` | 5 | 指标文本格式变更（`150.00ms`）、`Errors` 重复、`custom-class` 未透传 |
| `src/app/api/feedback/response/__tests__/route.test.ts` | 5 | `Database not initialized`（better-sqlite3 未初始化） |
| `src/lib/validation/__tests__/validators.test.ts` | 4 | `email/minLength/pattern/url` 的"空值跳过"语义与实现不一致 |
| `src/app/api/auth/__tests__/route.test.ts` | 4 | 登录/注册/重置全部 **501 Not Implemented**（后端未接入） |
| `src/components/ui/feedback/__tests__/ErrorFallback.test.tsx` | 4 | 组件文案/结构变更（`Show Error Details`、`Custom Action` 找不到） |
| `src/features/dashboard/__tests__/Dashboard.test.tsx` | 1 | `CPU 使用率` 出现多处，getByText 歧义 |
| `src/components/monitoring/__tests__/HistoryDataPanel.test.tsx` | 2 | 下拉项文案变更（`Last 15 minutes`、`All Metrics`） |
| `src/components/monitoring/__tests__/PerformanceChart.test.tsx` | 2 | recharts tooltip 未渲染 → `toBeInTheDocument` 收到 null |
| `src/components/performance/__tests__/LazyLoadImage.test.tsx` | 2 | IntersectionObserver 被 mock 成箭头函数，`new Mock()` 报 "is not a constructor" |
| `src/components/performance/__tests__/VirtualizedList.test.tsx` | 1 | 期望 `absolute` 定位类，实际未使用 |
| `src/components/WorkflowEditor/__tests__/Toolbar.test.tsx` | 2 | onExport/onImport 载荷新增 `exportedAt/version/id/name` 字段 |
| `src/components/feedback/__tests__/EmotionSelector.test.tsx` | 1 | rating 期望 5 实际 4（默认选中态不同） |
| `src/hooks/__tests__/usePerformanceMonitoring.test.ts` | 2 | ①"服务端不初始化"在 jsdom 下恒为 true；②`trackAPIRequest` 实参与期望不一致 |
| `src/lib/webhook/__tests__/webhook.test.ts` | 3 | 订阅隔离失效（触发数 2/4）、超时态期望 `timeout` 实得 `retrying` |
| `src/lib/services/__tests__/notification-system.test.ts` | 1 | 通知按类型分组数量不符 |
| `src/lib/services/__tests__/notification-service.edge-cases.test.ts` | 1 | ID 格式期望 `notif_\d+_` 实得 `notif_<hash>` |
| `src/lib/audio/__tests__/utils.test.ts` | 1 | 同上：`audio_\d+_` 期望 |
| `src/lib/audio/__tests__/audio-utils.test.ts` | 1 | Vitest+jsdom 无法读取 jsdom Blob 字节（上游 bug） |
| `src/lib/audio/__tests__/STTRouter.test.ts` | 2 | 所有 STT provider 均失败（fallback 链未生效） |
| `src/lib/search/__tests__/highlighter.spec.ts` | 1 | 预览截断长度期望 `hello wo` 实得 `hello worl...` |
| `src/lib/__tests__/storage.test.ts` | 1 | 按创建时间查询返回 0 条 |
| `src/lib/__tests__/socket.test.ts` | 1 | 初始化成功日志未打印（logger 改造） |
| `src/lib/i18n/__tests__/client.test.ts` | 1 | `initReactI18next.use()` 未被调用 |
| `src/lib/alerting/__tests__/MultiChannelNotifications.test.ts` | 1 | 期望调用 2 次实得 5 次 |
| `src/hooks/__tests__/useWorkflowTemplate.test.ts` | 1 | 加载错误未置为错误态 |
| `src/hooks/__tests__/useDebounce.test.ts` | 1 | `maxWait` 取消后仍被调用 |
| `src/stores/__tests__/app-store.test.ts` | 1 | localStorage 未恢复设置 |
| `tests/features/knowledge-rag.test.ts` | 3 | 检索耗时为 0、无文档时未返回 `[无相关文档]`、引用段落数为 0 |
| `tests/features/audio-processor.test.ts` | 1 | 音频处理断言不符 |
| `tests/features/mobile-components.test.tsx` | 8 | **本次由语法崩溃转为可执行后暴露**：Touchable 不再透传 className/style/feedbackType、PullToRefresh 文案变更 |
| `tests/integration/workflow-orchestrator.test.ts` | 1 | 取消中的工作流状态为 `completed` 而非 `cancelled` |
| `tests/integration/websocket-room-system.test.ts` | 1 | 100 成员大房间少 1 人 |
| `tests/automation/automation-advanced-integration.test.ts` | 1 | transform 错误未优雅处理 |
| `tests/security-upgrade-verify.test.ts` | 1 | Next.js 版本断言过严（`expected 4 to be 2`） |
| `tests/lib/lucide-icons.test.ts` | 1 | lucide-react 版本期望 `^1.7` 实得 `^1.8.0` |

---

## 3. 优先级修复清单

| P | 项目 | 文件 | 类型 | 状态 |
|---|---|---|---|---|
| **P0** | 多余右括号导致整文件无法解析 | `tests/api-integration/notifications.test.ts` | 语法 | ✅ 已修 |
| **P0** | `.ts` 文件里写 JSX | `tests/features/mobile-components.test.ts` → `.tsx` | 语法 | ✅ 已修（重命名） |
| **P0** | Playwright 用例被 vitest 收集 | `vitest.config.ts` + `tests/e2e/**` | 配置 | ✅ 已修（exclude） |
| **P0** | 相对路径 `../src/lib/...` 解析失败 | `tests/lib/workflow/types.test.ts` | 导入 | ✅ 已修 |
| **P0** | ESM 下 `require('@/...')` 无法解析别名 | `src/hooks/__tests__/usePerformanceMonitoring.test.ts` | 导入 | ✅ 已修（改 `await import`） |
| **P0** | 同上 | `src/components/ui/feedback/__tests__/ErrorFallback.test.tsx` | 导入 | ✅ 已修 |
| **P1** | `Object.defineProperty(process.env, ...)` 在新 Node 抛错 | `src/components/error-boundary/__tests__/ErrorBoundary.test.tsx` | 断言环境 | ✅ 已修（`vi.stubEnv`） |
| **P1** | logger 加时间戳前缀导致精确匹配失败 | `src/stores/__tests__/websocket-store.test.ts`、`websocket-store-enhanced.test.ts` | 断言 | ✅ 已修（`stringContaining`） |
| **P1** | 缺 `tests/api-integration/helpers.ts` + `supertest` 依赖 | `tests/api-integration/agents.test.ts`、`collab.test.ts` | 导入 | ⏳ 未修（需后端基建） |
| **P1** | vi.mock 工厂 hoist 报错 | `src/components/monitoring/__tests__/PerformanceMonitorDashboard.test.tsx` | mock | ⏳ 未修 |
| **P2** | 触摸/手势事件在 jsdom 下不触发（40 用例） | `useTouchGestures.test.ts`、`useSwipe.test.ts` | 基建 | ⏳ 未修 |
| **P2** | 结构化 logger 改造后 `console.log` 断言全失效（10 用例） | `src/lib/performance/alerting/__tests__/alerter.test.ts` | 断言 | ⏳ 未修（应改断言 logger 而非改产品代码） |
| **P2** | `sanitize*` 期望过时（11 用例） | `src/lib/__tests__/validation-schemas-security.test.ts` | 断言 | ⏳ 未修（属安全语义，需产品负责人确认后再动） |
| **P2** | 意图分类算法变更（7 用例） | `src/lib/ai/dialogue/__tests__/*` | 断言 | ⏳ 未修（需产品确认） |
| **P3** | UI 文案/结构漂移（约 20 用例） | monitoring / dashboard / feedback / ErrorFallback 等 | 断言 | ⏳ 未修（逐个对齐文案即可） |
| **P3** | 版本号断言过严 | `tests/security-upgrade-verify.test.ts`、`tests/lib/lucide-icons.test.ts` | 断言 | ⏳ 未修（放宽到"≥ 最低安全版本"更合理） |

---

## 4. 我实际修了哪些（全部在允许路径内，均未削弱断言、未 skip/todo/only、未删除用例）

1. **`tests/api-integration/notifications.test.ts`** — 第 111 行 `})))` → `}))`（vi.mock 工厂多了一个右括号）。文件从"解析崩溃"变为可执行。
2. **`tests/features/mobile-components.test.ts` → `tests/features/mobile-components.test.tsx`** — 文件内含 JSX 却用 `.ts` 扩展名，esbuild/oxc 直接解析失败。重命名为 `.tsx`（用例一个未删）。
3. **`vitest.config.ts`** — 新增 `exclude`，把 `tests/e2e/**` 排除出 vitest 收集（Playwright 用例由 `playwright.config.ts` 的 `testDir: './e2e'` 负责；此前它被 vitest 收集后必然报 `Playwright Test did not expect test.describe() to be called here`）。同时保留 vitest 默认 exclude 项。
4. **`tests/lib/workflow/types.test.ts`** — `from '../src/lib/workflows/types'` → `from '@/lib/workflows/types'`（走已配置的 `@` 别名）。**该文件现已全绿。**
5. **`src/hooks/__tests__/usePerformanceMonitoring.test.ts`** — 3 处 `require('@/lib/monitoring')` → `await import('@/lib/monitoring')`。3 个"Cannot find module"错误消除（剩余 2 个为行为断言问题）。
6. **`src/components/ui/feedback/__tests__/ErrorFallback.test.tsx`** — 4 处 `require('@/lib/error-reporting/retry')` → `await import('@/lib/error-reporting/retry')`。3 个"Cannot find module"错误消除。
7. **`src/components/error-boundary/__tests__/ErrorBoundary.test.tsx`** — `Object.defineProperty(process.env,'NODE_ENV',{value, writable:true})` 在 Node 22 下抛 `process.env only accepts a configurable, writable, and enumerable data descriptor`；改为 `vi.stubEnv('NODE_ENV', ...)` + `vi.unstubAllEnvs()`。**该文件现已全绿。**
8. **`src/stores/__tests__/websocket-store.test.ts` / `websocket-store-enhanced.test.ts`** — logger 现在输出带 `[时间戳] [WARN] [app]` 前缀，原精确字符串断言必然失败；改为 `expect.stringContaining('[WebSocket] Cannot send message: not connected')`，**仍完整校验原消息内容**。**两个文件现已全绿。**

验证（针对上述文件的复跑）：
```
src/stores/__tests__/websocket-store.test.ts            passed
src/stores/__tests__/websocket-store-enhanced.test.ts   passed
src/components/error-boundary/__tests__/ErrorBoundary.test.tsx  passed
tests/lib/workflow/types.test.ts                        passed
```

---

## 5. 留给别人的清单（根因不在我允许修改的路径内 / 需先做产品决策）

### 5.1 后端 / 契约相关（建议交由后端或 T8x 后端负责人）
| 现象 | 文件 | 用例数 |
|---|---|---|
| A2A JSON-RPC 状态码 400 vs 期望 200/201，task/agent 方法未实现 | `tests/api-integration/a2a-jsonrpc.test.ts` | 23 |
| 登录/注册/重置密码全部 501 Not Implemented | `src/app/api/auth/__tests__/route.test.ts` | 4 |
| `Database not initialized`（better-sqlite3 初始化缺失） | `src/app/api/feedback/response/__tests__/route.test.ts` | 5 |
| 缺 `tests/api-integration/helpers.ts` + `supertest` 依赖（后端式测试基建） | `tests/api-integration/agents.test.ts`、`collab.test.ts` | 2 文件 |
| `websocket-room-system` 大房间少 1 人 / `workflow-orchestrator` 取消态错误 | `tests/integration/*` | 2 |

### 5.2 `src/lib/collab/**` 与 T82 范围
- `tests/features/collab-client.test.ts`（15 失败）—— **T82 正在改，本次禁止触碰，未修改。**
- `src/lib/collab/__tests__/*` 全部通过，本次未修改 `src/lib/collab/**` 任何文件。

### 5.3 需要产品/业务确认后才能改断言（我不擅自改）
- `src/lib/__tests__/validation-schemas-security.test.ts`（11）：`sanitize*` 的净化语义（SQL/NoSQL/XSS/命令注入）——属安全行为，改断言前需安全负责人确认"期望值"与"实现"谁对。
- `src/lib/ai/dialogue/__tests__/EnhancedIntentAnalyzer.test.ts`（6）+ `integration.test.ts`（1）：意图分类结果变化。
- `src/lib/performance/alerting/__tests__/alerter.test.ts`（10）：全项目已迁到结构化 logger，建议把断言从 `console.log` 改为 mock logger（需先定 logger 统一入口）。
- `src/hooks/__tests__/useTouchGestures.test.ts`（25）、`useSwipe.test.ts`（16）：jsdom 不实现 TouchEvent 构造，建议改用 `PointerEvent` 或给 setup.ts 补 Touch polyfill；建议单独开一轮。
- 其余 UI 文案漂移类（monitoring / dashboard / feedback / ErrorFallback / Toolbar / EmotionSelector 等，约 20 用例）：逐条对齐即可，属低风险。

---

## 6. 备注
- 未执行任何 `git add / commit / push`；仅有一处 `git mv`（重命名 `mobile-components.test.ts` → `.tsx`）自动进入了 git index，如需干净状态可由负责人自行 `git reset -- <path>`。
- 未修改 `.github/workflows/**`、`7zi-backend/**`、`7zi-frontend/src/lib/collab/**`。
- 原始 JSON 报告：`/tmp/vitest_all.json`（修复前）、`/tmp/vitest_after.json`（修复后）。
