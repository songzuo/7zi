# 集成测试

## 概述

本目录包含所有集成测试。集成测试用于测试多个模块或组件之间的交互，可能涉及数据库、缓存、API等外部系统。

## 目录结构

```
integration/
├── api/                           # API集成测试
│   ├── auth.integration.test.ts
│   ├── projects.integration.test.ts
│   └── ...
├── websocket/                     # WebSocket集成测试
│   ├── connection.integration.test.ts
│   └── message-store.integration.test.ts
├── database/                      # 数据库集成测试
│   └── schema.integration.test.ts
├── cache/                         # 缓存集成测试
│   └── redis.integration.test.ts
└── scheduler/                     # 调度器集成测试
    └── load-balancer.integration.test.ts
```

## 运行测试

```bash
# 运行所有集成测试
npm run test:integration

# 运行特定模块的集成测试
npm run test:integration -- integration/api

# 运行特定测试文件
npm run test:integration integration/api/auth.integration.test.ts

# 监视模式
npm run test:integration -- --watch
```

## 命名规范

- 所有文件使用 `.integration.test.ts` 后缀
- 文件命名：`<feature>.integration.test.ts`
- 测试套件命名：`describe('<Feature> Integration', () => { ... })`

## 编写集成测试

### 基本结构

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '@/tests/setup/test-db';
import { MyApi } from '@/lib/api';

describe('Auth API Integration', () => {
  let db: TestDb;
  let api: MyApi;

  beforeAll(async () => {
    // 设置测试环境
    db = await setupTestDb();
    api = new MyApi({ db });
  });

  afterAll(async () => {
    // 清理测试环境
    await teardownTestDb(db);
  });

  it('should authenticate user', async () => {
    const result = await api.authenticate({
      email: 'test@example.com',
      password: 'password123',
    });
    
    expect(result).toHaveProperty('token');
    expect(result.user).toHaveProperty('id');
  });
});
```

### 测试数据库集成

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from '@/tests/setup/test-db';

describe('Database Integration', () => {
  let db: TestDb;

  beforeEach(async () => {
    // 每个测试前创建新的数据库
    db = await createTestDb();
  });

  it('should insert and retrieve user', async () => {
    await db.users.insert({
      email: 'test@example.com',
      name: 'Test User',
    });

    const user = await db.users.findByEmail('test@example.com');
    
    expect(user).not.toBeNull();
    expect(user.email).toBe('test@example.com');
  });
});
```

### 测试 WebSocket 集成

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestWebSocketServer, createTestWebSocketClient } from '@/tests/setup/websocket';

describe('WebSocket Integration', () => {
  let server: WebSocketServer;
  let client: WebSocketClient;

  beforeAll(async () => {
    server = await createTestWebSocketServer();
    client = await createTestWebSocketClient(server.url);
  });

  it('should send and receive message', async () => {
    client.send({ type: 'ping', data: 'hello' });

    const response = await client.waitFor('pong');
    
    expect(response.data).toBe('hello');
  });
});
```

## 测试设置

集成测试需要额外的设置：

### 数据库设置

```typescript
// tests/setup/test-db.ts
import { TestDatabase } from '@/lib/test-db';

export async function setupTestDb() {
  const db = new TestDatabase({
    url: 'sqlite::memory:',
    migrations: './migrations',
  });
  
  await db.migrate();
  return db;
}

export async function teardownTestDb(db: TestDatabase) {
  await db.close();
}
```

### API 服务器设置

```typescript
// tests/setup/api-server.ts
import { createServer } from '@/server';

export async function setupTestServer() {
  const server = await createServer({
    port: 0, // 随机端口
    db: await setupTestDb(),
  });
  
  return server;
}
```

## 注意事项

1. **独立性**：每个测试应该独立，清理测试数据
2. **性能**：集成测试比单元测试慢，合理使用
3. **真实环境**：尽可能使用真实的测试环境
4. **数据清理**：确保每个测试后清理数据
5. **超时设置**：集成测试可能需要更长的超时时间

## 测试覆盖率

```bash
# 生成覆盖率报告
npm run test:integration -- --coverage
```

目标覆盖率：
- 语句覆盖率：≥ 70%
- 分支覆盖率：≥ 65%
- 函数覆盖率：≥ 75%
- 行覆盖率：≥ 70%

## 常见问题

### Q: 如何跳过慢速的集成测试？

```typescript
it.skip('slow integration test', async () => {
  // 这个测试会被跳过
});
```

### Q: 如何测试外部API？

使用 MSW (Mock Service Worker) 来模拟外部API：

```typescript
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('https://api.example.com/users', (req, res, ctx) => {
    return res(ctx.json({ users: [] }));
  })
);

beforeAll(() => server.listen());
afterAll(() => server.close());
```
