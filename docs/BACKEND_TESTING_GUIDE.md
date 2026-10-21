# 后端测试指南（7zi-backend / Jest）

**创建日期**: 2026-10-21
**适用范围**: `7zi-backend/`（websocket + workflow-engine）
**框架**: Jest 29 + supertest
**相关文档**: [P1-7_WEBSOCKET_TESTS_20261021.md](../P1-7_WEBSOCKET_TESTS_20261021.md) · [ARCH_BACKEND_CONSOLIDATION_20261021.md](../ARCH_BACKEND_CONSOLIDATION_20261021.md)

---

## 1. 为什么要单独一份指南

前端使用 Vitest（`7zi-frontend/`），后端使用 Jest（`7zi-backend/`），两者测试命令、配置、目录约定完全不同。历史上出现过 `jest websocket/` 匹配不到任何测试文件（目录里只有手工冒烟脚本）导致「零覆盖却绿灯」的情况，因此后端测试需要显式的组织约定与校验。

---

## 2. 快速开始

```bash
cd 7zi-backend
npm install          # 首次需要（Node.js >= 18）
```

| 命令 | 作用 | 当前结果 |
|------|------|---------|
| `npm run test` | 依次跑 websocket + workflow-engine | **10 suites / 111 tests 全绿** |
| `npm run test:websocket` | 仅 WebSocket 服务 | 9 suites / 110 tests，行覆盖率 95.2% |
| `npm run test:workflow` | 仅 workflow-engine | 1 suite（`__tests__/basic.test.js`） |
| `npx jest websocket/ --coverage` | 覆盖率报告 | 输出到 `7zi-backend/coverage/` |
| `npm run lint` | ESLint | `eslint websocket/ workflow-engine/` |
| `npm run dev` | nodemon 热重载两个服务 | 调试用 |

> **注意**：`npm run test:workflow` 使用的是 `7zi-backend/package.json` 中的根级 jest 配置（`testMatch: **/__tests__/**/*.test.js`），
> 只匹配 `7zi-backend/workflow-engine/__tests__/` 下的文件。
> `workflow-engine/jest.config.js`（`testMatch: **/test/**/*.test.js`）指向的是软链接目标 `workflow-engine/backend/test/` 下的历史测试，
> 若要跑那一套需显式指定 rootDir（见 §6）。

---

## 3. 目录与测试文件组织

```
7zi-backend/
├── package.json                       # 根级 jest 配置 + npm scripts
├── coverage/                          # 覆盖率产物（gitignore 建议）
├── websocket/
│   ├── lib/                           # ← 被测代码（纯逻辑，可直接 require）
│   │   ├── config.js
│   │   ├── jwt-secret.js
│   │   ├── room-manager.js
│   │   ├── auth.js
│   │   ├── handlers.js
│   │   └── server.js
│   ├── websocket-server.js            # 组合根 / 进程入口（不参与覆盖率统计）
│   └── __tests__/                     # ← 测试目录
│       ├── helpers.js                 # 共享工具（非测试文件，不以 .test.js 结尾）
│       ├── config.test.js
│       ├── jwt-secret.test.js
│       ├── production-guard.test.js
│       ├── auth.test.js
│       ├── room-manager.test.js
│       ├── handlers.test.js
│       ├── server-lib.test.js
│       ├── server-entry.test.js
│       └── server.integration.test.js
└── workflow-engine/
    ├── jest.config.js                 # 独立 jest 配置
    └── __tests__/
        └── basic.test.js
```

### 命名与放置约定

1. **测试文件放在被测模块同级目录的 `__tests__/` 下**，文件名 `<module>.test.js`。
2. **共享工具放 `__tests__/helpers.js`**，不要以 `.test.js` 结尾，避免被当成测试套件。
3. **根级 `testMatch` 为 `**/__tests__/**/*.test.js`** —— 新测试必须放在 `__tests__/` 内，否则不会被执行。
4. **被测代码必须是纯模块**：不监听端口、不在 `require()` 时自启动、不在模块顶层读 `process.env`（改为通过参数注入）。
   这是让 `websocket/websocket-server.js` 变成组合根（`if (require.main === module) startServer()`）的前提。
5. **测试不得使用生产端口**：使用 `PORT=0` 或 `net.createServer().listen(0)` 拿随机空闲端口。

---

## 4. 覆盖率配置与阈值

根级 `7zi-backend/package.json` 中的 jest 配置：

```json
{
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/__tests__/**/*.test.js"],
    "collectCoverageFrom": ["websocket/lib/**/*.js"],
    "coverageDirectory": "<rootDir>/coverage",
    "coverageThreshold": { "global": { "lines": 60 } },
    "testTimeout": 20000
  }
}
```

| 指标 | 阈值 | 当前实际（websocket） |
|------|------|----------------------|
| **lines** | **≥ 60%** | **95.2%** |
| statements | 无硬阈值 | 94.78% |
| functions | 无硬阈值 | 98.03% |
| branches | 无硬阈值 | 83.57% |

`workflow-engine/jest.config.js` 同样设置 `coverageThreshold.global.lines = 60`。

> 阈值不达标时 Jest 会以非 0 退出码失败，可直接接入 CI 作为门禁。

---

## 5. 新增测试的约定

### 5.1 必须遵守

- **测试名描述行为而非实现**：用 `should ...` / `期望行为` 描述，例如 `should reject expired token`。
- **每个 `describe` 对应一个模块或一个功能域**，层级不超过 3 层。
- **禁止真实网络访问**：只允许 `127.0.0.1` 回环；JWT 一律用本地 `jsonwebtoken` 签发。
- **禁止真实计时器等待**：需要时间推进时注入假定时器（`jest.useFakeTimers()`），单测超时上限 20s。
- **不修改被测代码来迁就测试**：发现问题记录到报告，由实现方修复（参见 P1-7 报告中的 DEFECT 列表）。
- **不得新增依赖**：优先用 `jest` 内置能力 + 已有 `supertest` / `jsonwebtoken`。

### 5.2 依赖注入模式

`websocket/lib/` 下的模块统一支持注入，便于测试：

| 模块 | 可注入项 |
|------|---------|
| `config.js` | `loadConfig(env = process.env)` — 传入 env 对象 |
| `room-manager.js` | `logger`、`setTimeoutFn` / `clearTimeoutFn` |
| `auth.js` | `createAuthenticator({ jwtSecret, allowDemoMode, logger, randomId })` |
| `handlers.js` | `setupSocketHandlers(socket, { roomManager, logger })` |
| `server.js` | `createServer({ roomManager, authenticateSocket, setupSocketHandlers, logger, config })` |

### 5.3 示例：新增一个 `config.js` 测试

```js
// 7zi-backend/websocket/__tests__/config.test.js
'use strict'

const { loadConfig, DEFAULT_PORT } = require('../lib/config')

describe('config', () => {
  test('should read PORT from injected env', () => {
    expect(loadConfig({ PORT: '4321' }).PORT).toBe(4321)
  })

  test('should fall back to default port for non-numeric PORT', () => {
    expect(loadConfig({ PORT: 'not-a-number' }).PORT).toBe(DEFAULT_PORT)
  })

  test('should keep PORT=0 (random port) as-is', () => {
    expect(loadConfig({ PORT: '0' }).PORT).toBe(0)
  })

  test('should default ALLOWED_ORIGIN and LOG_LEVEL', () => {
    const cfg = loadConfig({})
    expect(cfg.ALLOWED_ORIGIN).toBe('http://localhost:3000')
    expect(cfg.LOG_LEVEL).toBe('info')
  })
})
```

> `loadConfig(env = process.env)` 始终返回 `{ PORT, ALLOWED_ORIGIN, LOG_LEVEL }`；
> 默认端口为 `3002`（`DEFAULT_PORT`），`PORT=0` 保留（用于随机端口）。

### 5.4 示例：新增一个集成测试（真实 HTTP 端点）

```js
// 7zi-backend/websocket/__tests__/server.integration.test.js
'use strict'

const http = require('http')
const { createServer } = require('../lib/server')
const { createTestRoomManager } = require('./helpers')

describe('server integration', () => {
  let server, baseUrl

  beforeAll(async () => {
    // createServer() 只组装，不监听端口 —— 端口由测试自己用 0（随机空闲）指定
    server = createServer({
      roomManager: createTestRoomManager(),
      logger: console,
      config: { ALLOWED_ORIGIN: 'http://localhost:3000' },
    })
    await new Promise((resolve) => server.httpServer.listen(0, resolve))
    baseUrl = `http://127.0.0.1:${server.httpServer.address().port}`
  })

  afterAll(async () => {
    await new Promise((resolve) => server.httpServer.close(resolve))
  })

  test('should respond to /health', async () => {
    const res = await fetch(`${baseUrl}/health`)
    expect(res.status).toBe(200)
    expect((await res.json()).status).toBe('ok')
  })
})
```

> 集成测试务必在 `afterAll` 里关闭 `httpServer`，否则 Jest 会报 "worker process failed to exit gracefully"。
> `createServer()` 返回 `{ httpServer, io }`，**不返回 `close()` 方法** —— 关闭请用 `httpServer.close()`。

---

## 6. 已知问题与处理方式

| 现象 | 原因 | 处理 |
|------|------|------|
| `npm run test:workflow` 只跑 1 个 suite | 根级 jest `testMatch` 只认 `__tests__/` | 历史测试在 `workflow-engine/backend/test/`（软链接目标），需显式指定：<br>`npx jest --config workflow-engine/jest.config.js --rootDir ../workflow-engine/backend` |
| 该命令有 1 个用例失败 | `test/engine/resumeAndCheckpoint.test.js` 的 `executeNextNodes` 条件分支 | **已知缺陷**，待修复后重新纳入 CI；勿在未修复时声称 workflow-engine 全绿 |
| 覆盖率报告只统计 websocket | `collectCoverageFrom: ["websocket/lib/**/*.js"]` | 需要统计 workflow-engine 时用其独立 config |
| `jest websocket/` 报 "no tests found" | 测试不在 `__tests__/` 下 | 检查文件位置与命名 |

---

## 7. 提交前自检清单

- [ ] `cd 7zi-backend && npm run test` 全绿
- [ ] `npx jest websocket/ --coverage` lines ≥ 60%
- [ ] 新测试放在 `__tests__/` 内且文件名以 `.test.js` 结尾
- [ ] 未使用生产端口、未访问外网、未新增依赖
- [ ] 所有 `afterAll` 已清理 server / 定时器，无 "failed to exit gracefully" 警告
- [ ] 新发现的被测代码缺陷已记录到测试报告中

---

## 8. 相关文档

| 文档 | 说明 |
|------|------|
| [P1-7_WEBSOCKET_TESTS_20261021.md](../P1-7_WEBSOCKET_TESTS_20261021.md) | WebSocket 测试设计详情、用例清单、覆盖率表、已发现缺陷 |
| [ARCH_BACKEND_CONSOLIDATION_20261021.md](../ARCH_BACKEND_CONSOLIDATION_20261021.md) | 后端目录整合方案、迁移映射表、端口分配 |
| [7zi-backend/README.md](../7zi-backend/README.md) | 后端服务使用说明 |
| [docs/TEST_STRATEGY.md](./TEST_STRATEGY.md) | 前端测试策略（Vitest） |

---

*最后更新: 2026-10-21*
