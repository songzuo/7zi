# 7zi 项目 v1.8.0 测试策略

> **🧪 测试员（测试调试专家）** 生成 | 版本: 1.8.0 | 日期: 2026-04-02

---

## 📋 目录

- [1. 项目概述](#1-项目概述)
- [2. 测试金字塔](#2-测试金字塔)
- [3. 测试工具选型](#3-测试工具选型)
- [4. 单元测试策略](#4-单元测试策略)
- [5. 集成测试策略](#5-集成测试策略)
- [6. E2E 测试策略](#6-e2e-测试策略)
- [7. 测试覆盖率目标](#7-测试覆盖率目标)
- [8. 测试用例示例](#8-测试用例示例)
- [9. 自动化测试脚本框架](#9-自动化测试脚本框架)
- [10. 性能测试方案](#10-性能测试方案)
- [11. 测试执行计划](#11-测试执行计划)
- [12. 持续集成策略](#12-持续集成策略)

---

## 1. 项目概述

### 1.1 项目架构

```
7zi 项目（v1.8.0）
├── 前端（Next.js 16.2.1 + React 19.2.4）
│   ├── App Router（src/app/）
│   ├── API 路由（src/app/api/）
│   ├── 组件库（src/components/）
│   ├── 自定义 Hooks（src/hooks/）
│   ├── 服务层（src/lib/）
│   └── 状态管理（src/stores/）
├── 测试目录
│   ├── 单元测试（src/**/*.test.ts/.test.tsx）
│   ├── 集成测试（tests/integration/）
│   └── E2E 测试（e2e/*.spec.ts）
└── 基础设施
    ├── 数据库（SQLite + Redis）
    ├── WebSocket（Socket.IO）
    └── 监控（Sentry APM）
```

### 1.2 技术栈

| 层级          | 技术                    | 版本    |
| ------------- | ----------------------- | ------- |
| **前端框架**  | Next.js                 | 16.2.1  |
| **UI 框架**   | React                   | 19.2.4  |
| **语言**      | TypeScript              | 5.x     |
| **样式**      | Tailwind CSS            | 4.x     |
| **状态管理**  | Zustand                 | 5.0.12  |
| **数据库**    | SQLite (better-sqlite3) | 12.8.0  |
| **缓存**      | Redis (ioredis)         | 5.10.1  |
| **WebSocket** | Socket.IO               | 4.8.3   |
| **API 验证**  | Zod                     | 4.3.6   |
| **监控**      | Sentry                  | 10.44.0 |
| **E2E 测试**  | Playwright              | 1.58.2  |
| **单元测试**  | Vitest                  | 4.1.2   |

### 1.3 核心功能模块

| 模块              | 说明                           | 优先级 |
| ----------------- | ------------------------------ | ------ |
| **认证授权**      | JWT、RBAC、权限管理            | P0     |
| **用户管理**      | 注册、登录、用户 CRUD          | P0     |
| **任务管理**      | 任务创建、分配、执行、完成     | P0     |
| **AI Agent 系统** | Agent 调度、学习系统、Registry | P0     |
| **实时协作**      | WebSocket 房间、消息传递       | P1     |
| **项目管理**      | 项目 CRUD、团队管理            | P1     |
| **通知系统**      | 实时通知、邮件通知             | P1     |
| **性能监控**      | APM、性能指标收集              | P1     |
| **A2A 协议**      | Agent 间通信 v2.1              | P0     |
| **工作流引擎**    | Workflow Executor              | P0     |

---

## 2. 测试金字塔

```
           /\
          /  \
         / E2E \     关键用户流程
        /------\     20-30 个测试 (10%)
       /        \
      /Integration\  API/组件集成
     /------------\  150-200 个测试 (40%)
    /              \
   /    Unit Tests  \  业务逻辑单元
  /==================\  400-500 个测试 (50%)

   测试数量：600-700 个
   执行时间：< 5 分钟（单元 + 集成）
              < 10 分钟（E2E）
```

### 2.1 测试分布

| 测试类型     | 数量    | 执行时间 | 覆盖率        | 维护成本 |
| ------------ | ------- | -------- | ------------- | -------- |
| **单元测试** | 400-500 | < 3 min  | 70%+          | 低       |
| **集成测试** | 150-200 | < 5 min  | 60%+          | 中       |
| **E2E 测试** | 20-30   | < 10 min | 关键流程 100% | 高       |

### 2.2 测试比例

```
单元测试：50% (400-500)
集成测试：40% (150-200)
E2E 测试：10% (20-30)
```

**比例依据**：

- 单元测试：快速反馈、细粒度、易于调试
- 集成测试：验证模块协作、API 契约
- E2E 测试：验证端到端流程、用户体验

---

## 3. 测试工具选型

### 3.1 单元测试工具

| 工具                            | 版本    | 用途           | 选型理由                                |
| ------------------------------- | ------- | -------------- | --------------------------------------- |
| **Vitest**                      | 4.1.2   | 测试框架       | 与 Vite 无缝集成、速度快、兼容 Jest API |
| **React Testing Library**       | 16.3.2  | React 组件测试 | 鼓励测试用户行为、测试 DOM 交互         |
| **@testing-library/user-event** | 14.6.1  | 用户交互模拟   | 更真实的用户交互行为                    |
| **@vitest/coverage-v8**         | 4.1.2   | 代码覆盖率     | V8 引擎、速度快、报告格式丰富           |
| **jsdom**                       | 29.0.1  | 浏览器环境模拟 | 标准 DOM 实现、轻量级                   |
| **MSW (Mock Service Worker)**   | 2.12.14 | API 模拟       | 网络层拦截、真实请求/响应               |

### 3.2 集成测试工具

| 工具                  | 版本   | 用途           | 选型理由                      |
| --------------------- | ------ | -------------- | ----------------------------- |
| **Vitest**            | 4.1.2  | 测试框架       | 与单元测试统一、支持 API 测试 |
| **Supertest**         | 7.2.2  | HTTP 请求测试  | 测试 API 路由、断言响应       |
| **better-sqlite3**    | 12.8.0 | 数据库测试     | 内存数据库、事务支持          |
| **ioredis-mock**      | 模拟库 | Redis 测试     | 模拟 Redis 行为               |
| **socket.io-testing** | 自定义 | WebSocket 测试 | 测试实时通信                  |

### 3.3 E2E 测试工具

| 工具                  | 版本   | 用途              | 选型理由                     |
| --------------------- | ------ | ----------------- | ---------------------------- |
| **Playwright**        | 1.58.2 | E2E 测试框架      | 跨浏览器、自动等待、内置截图 |
| **@playwright/test**  | 1.58.2 | Playwright 测试库 | TypeScript 支持、并行执行    |
| **Page Object Model** | 自定义 | 测试模式          | 提高代码复用性、便于维护     |

### 3.4 性能测试工具

| 工具              | 版本  | 用途         | 选型理由             |
| ----------------- | ----- | ------------ | -------------------- |
| **Lighthouse CI** | 最新  | 性能基准测试 | Web Vitals、性能评分 |
| **k6**            | 最新  | 负载测试     | 压力测试、并发测试   |
| **Web Vitals**    | 5.1.0 | 实时性能监控 | Core Web Vitals 收集 |

---

## 4. 单元测试策略

### 4.1 测试范围

| 模块               | 测试重点                 | 覆盖率目标 |
| ------------------ | ------------------------ | ---------- |
| **Utils**          | 纯函数、数据转换、格式化 | 90%+       |
| **Hooks**          | 自定义 Hook 逻辑、副作用 | 80%+       |
| **Components**     | 组件渲染、交互、状态     | 70%+       |
| **Services**       | 业务逻辑、错误处理       | 80%+       |
| **Stores**         | 状态管理、选择器         | 80%+       |
| **API Validators** | Zod schema 验证          | 100%       |

### 4.2 测试结构

```
src/
├── lib/
│   ├── utils.ts
│   └── __tests__/
│       └── utils.test.ts
├── components/
│   ├── Button.tsx
│   └── __tests__/
│       └── Button.test.tsx
├── hooks/
│   ├── useAuth.ts
│   └── __tests__/
│       └── useAuth.test.ts
└── stores/
    ├── useAuthStore.ts
    └── __tests__/
        └── useAuthStore.test.ts
```

### 4.3 测试原则

1. **测试行为，不测试实现**
   - 测试组件的输入和输出
   - 不测试内部状态变化细节

2. **使用 AAA 模式**

   ```typescript
   // Arrange - 准备测试数据
   const input = 'value'

   // Act - 执行操作
   const result = doSomething(input)

   // Assert - 验证结果
   expect(result).toBe('expected')
   ```

3. **使用描述性测试名称**

   ```typescript
   test('should return 400 when email is invalid', () => {})
   test('should create user with valid data', () => {})
   ```

4. **隔离和清理**
   ```typescript
   beforeEach(() => {
     vi.clearAllMocks()
   })
   ```

---

## 5. 集成测试策略

### 5.1 测试范围

| 类型               | 测试重点         | 示例                     |
| ------------------ | ---------------- | ------------------------ |
| **API 集成**       | API 路由完整流程 | POST /api/users 创建用户 |
| **数据库集成**     | CRUD 操作、事务  | 创建、读取、更新、删除   |
| **缓存集成**       | Redis 缓存机制   | L1/L2/L3 缓存            |
| **WebSocket 集成** | 实时通信         | 消息发送/接收            |
| **外部服务**       | 第三方 API 集成  | 邮件服务、AI 服务        |

### 5.2 测试结构

```
tests/
├── integration/
│   ├── api/
│   │   ├── auth.test.ts
│   │   └── users.test.ts
│   ├── database/
│   │   ├── users.test.ts
│   │   └── tasks.test.ts
│   ├── cache/
│   │   └── multilevel-cache.test.ts
│   └── websocket/
│       └── rooms.test.ts
```

### 5.3 数据库测试策略

使用内存数据库进行集成测试：

```typescript
import Database from 'better-sqlite3'
import { migrate } from '../../lib/db/migrations'

// 使用内存数据库
const db = new Database(':memory:')

// 运行迁移
migrate(db)

// 测试完成后清理
afterAll(() => {
  db.close()
})
```

---

## 6. E2E 测试策略

### 6.1 测试范围

| 类型         | 测试重点             | 数量 |
| ------------ | -------------------- | ---- |
| **认证流程** | 注册、登录、登出     | 3    |
| **用户管理** | 创建、编辑、删除用户 | 3    |
| **任务流程** | 创建、分配、完成任务 | 5    |
| **项目流程** | 创建项目、管理团队   | 3    |
| **实时协作** | WebSocket 消息、房间 | 3    |
| **通知系统** | 实时通知、邮件通知   | 2    |
| **权限管理** | RBAC 权限验证        | 2    |

**总计：20-30 个 E2E 测试**

### 6.2 测试结构（Page Object Model）

```
e2e/
├── pages/                    # Page Objects
│   ├── index.ts
│   ├── login-page.ts
│   ├── dashboard-page.ts
│   ├── task-creation-page.ts
│   └── user-management-page.ts
├── fixtures/                 # 测试数据
│   └── test-data.ts
├── helpers/                  # 辅助函数
│   └── test-helpers.ts
├── auth-flow.spec.ts        # 认证流程
├── task-flow.spec.ts        # 任务流程
├── project-flow.spec.ts     # 项目流程
└── websocket.spec.ts        # WebSocket 流程
```

---

## 7. 测试覆盖率目标

### 7.1 整体覆盖率目标

| 指标           | 当前 | 目标 v1.8.0 | 说明         |
| -------------- | ---- | ----------- | ------------ |
| **Lines**      | 50%  | 60%         | 代码行覆盖率 |
| **Functions**  | 50%  | 60%         | 函数覆盖率   |
| **Branches**   | 40%  | 50%         | 分支覆盖率   |
| **Statements** | 50%  | 60%         | 语句覆盖率   |

### 7.2 分模块覆盖率目标

| 模块           | Lines | Functions | Branches | Statements |
| -------------- | ----- | --------- | -------- | ---------- |
| **Utils**      | 90%   | 90%       | 85%      | 90%        |
| **Hooks**      | 80%   | 80%       | 75%      | 80%        |
| **Components** | 70%   | 75%       | 65%      | 75%        |
| **Services**   | 80%   | 85%       | 75%      | 85%        |
| **Stores**     | 80%   | 85%       | 75%      | 85%        |
| **API Routes** | 70%   | 75%       | 65%      | 75%        |
| **Validators** | 100%  | 100%      | 100%     | 100%       |

---

## 8. 测试用例示例

### 8.1 单元测试 - Utils 测试

```typescript
// src/lib/__tests__/format.test.ts
import { describe, it, expect } from 'vitest'
import { formatDate, formatCurrency, validateEmail } from '../format'

describe('formatDate', () => {
  it('should format date to YYYY-MM-DD', () => {
    const date = new Date('2026-04-02')
    expect(formatDate(date)).toBe('2026-04-02')
  })

  it('should handle null date', () => {
    expect(formatDate(null)).toBe('N/A')
  })
})
```

### 8.2 单元测试 - React Component 测试

```typescript
// src/components/Button/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../Button';

describe('Button', () => {
  it('should render text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### 8.3 集成测试 - API 路由测试

```typescript
// src/app/api/auth/login/__tests__/route.test.ts
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createServer } from '../../../../lib/server'

const app = createServer()

describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(200)

    expect(response.body).toHaveProperty('token')
  })
})
```

### 8.4 E2E 测试 - 登录流程

```typescript
// e2e/pages/login-page.ts
import { Page } from '@playwright/test'

export class LoginPage {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.goto('/login')
    await this.page.getByLabel('Email').fill(email)
    await this.page.getByLabel('Password').fill(password)
    await this.page.getByRole('button', { name: 'Login' }).click()
  }
}

// e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/login-page'

test('should login with valid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.login('test@example.com', 'password123')
  await expect(page).toHaveURL('/dashboard')
})
```

---

## 9. 自动化测试脚本框架

### 9.1 测试脚本结构

```
scripts/
├── test-unit.sh           # 单元测试脚本
├── test-integration.sh    # 集成测试脚本
├── test-e2e.sh            # E2E 测试脚本
├── test-all.sh            # 全量测试脚本
└── generate-test-report.sh # 测试报告生成
```

### 9.2 单元测试脚本

```bash
#!/bin/bash
# scripts/test-unit.sh
set -e

echo "🧪 Running Unit Tests..."

NODE_OPTIONS='--max-old-space-size=4096' vitest run \
  --config vitest.config.ts \
  --coverage \
  --reporter=verbose

# 检查覆盖率阈值
COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')

if (( $(echo "$COVERAGE < 60" | bc -l) )); then
  echo "❌ Coverage below threshold: ${COVERAGE}%"
  exit 1
fi

echo "✅ Unit tests passed! Coverage: ${COVERAGE}%"
```

### 9.3 E2E 测试脚本

```bash
#!/bin/bash
# scripts/test-e2e.sh
set -e

echo "🎭 Running E2E Tests..."

# 启动开发服务器
npm run dev &
SERVER_PID=$!

# 等待服务器启动
sleep 10

# 运行 E2E 测试
npx playwright test \
  --config=playwright.config.ts \
  --reporter=html

# 关闭服务器
kill $SERVER_PID

echo "✅ E2E tests passed!"
```

### 9.4 全量测试脚本

```bash
#!/bin/bash
# scripts/test-all.sh
set -e

echo "🚀 Running All Tests..."

bash scripts/test-unit.sh
bash scripts/test-integration.sh
bash scripts/test-e2e.sh

echo "🎉 All tests passed!"
```

---

## 10. 性能测试方案

### 10.1 Lighthouse CI 配置

```javascript
// lighthouse.config.js
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000',
        'http://localhost:3000/login',
        'http://localhost:3000/dashboard',
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
      },
    },
  },
}
```

### 10.2 k6 负载测试

```javascript
// load-test.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
  },
}

export default function () {
  const res = http.post(
    'http://localhost:3000/api/auth/login',
    JSON.stringify({
      email: 'test@example.com',
      password: 'password123',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  )

  check(res, { 'login successful': r => r.status === 200 })
  sleep(1)
}
```

### 10.3 性能指标目标

| 指标    | 目标    | 说明                     |
| ------- | ------- | ------------------------ |
| **LCP** | < 2.5s  | Largest Contentful Paint |
| **FID** | < 100ms | First Input Delay        |
| **CLS** | < 0.1   | Cumulative Layout Shift  |
| **TTI** | < 3.8s  | Time to Interactive      |
| **TBT** | < 200ms | Total Blocking Time      |

---

## 11. 测试执行计划

### 11.1 开发阶段测试

| 阶段       | 测试类型    | 执行时机                 | 执行者  |
| ---------- | ----------- | ------------------------ | ------- |
| **编码**   | 单元测试    | 保存文件时（watch 模式） | 开发者  |
| **提交前** | 单元 + 集成 | git pre-commit hook      | 开发者  |
| **PR**     | 全量测试    | CI Pipeline              | CI 系统 |
| **合并**   | E2E 测试    | CI Pipeline              | CI 系统 |
| **部署前** | 性能测试    | CI Pipeline              | CI 系统 |

### 11.2 测试执行频率

| 测试类型     | 频率            | 执行时间 |
| ------------ | --------------- | -------- |
| **单元测试** | 每次保存        | < 3 min  |
| **集成测试** | 每次 PR         | < 5 min  |
| **E2E 测试** | 每次合并到 main | < 10 min |
| **性能测试** | 每次部署        | < 15 min |
| **负载测试** | 每周            | < 30 min |

---

## 12. 持续集成策略

### 12.1 GitHub Actions 配置

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v4

  e2e-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm run lhci autorun
```

### 12.2 测试质量门禁

| 门禁             | 条件            | 失败处理 |
| ---------------- | --------------- | -------- |
| **单元测试通过** | 所有测试通过    | 阻止合并 |
| **覆盖率达标**   | Lines ≥ 60%     | 阻止合并 |
| **E2E 测试通过** | 关键流程通过    | 阻止部署 |
| **性能达标**     | Lighthouse ≥ 90 | 警告     |

---

## 附录

### A. 测试命令速查表

```bash
# 单元测试
npm run test              # 监视模式
npm run test:run          # 一次性运行
npm run test:coverage     # 生成覆盖率

# 集成测试
npm run test:api          # API 测试
npm run test:integration  # 集成测试

# E2E 测试
npm run test:e2e          # 运行所有 E2E
npm run test:e2e:ui       # UI 模式
npm run test:e2e:debug    # 调试模式
npm run test:e2e:report   # 查看报告

# 全量测试
npm run test:all          # 运行所有测试
```

### B. 参考文档

- [Vitest 官方文档](https://vitest.dev/)
- [Playwright 官方文档](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [k6 文档](https://k6.io/docs/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

---

_文档版本: 1.0.0 | 最后更新: 2026-04-02_
