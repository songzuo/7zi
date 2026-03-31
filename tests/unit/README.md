# 单元测试

## 概述

本目录包含所有单元测试。单元测试用于测试独立的、隔离的功能模块，不依赖外部系统（如数据库、API等）。

## 目录结构

```
unit/
├── auth/                    # 认证相关测试
├── agent-scheduler/         # 智能体调度器测试
├── economy/                 # 经济系统测试
├── permissions/             # 权限系统测试
├── database/                # 数据库操作测试
├── cache/                   # 缓存管理测试
├── retry/                   # 重试逻辑测试
├── timeout/                 # 超时处理测试
├── performance/             # 性能优化工具测试
├── mcp/                     # MCP工具测试
├── react-compiler/          # React编译器测试
├── monitoring/              # 监控工具测试
└── utils/                   # 通用工具测试
```

## 运行测试

```bash
# 运行所有单元测试
npm run test:unit

# 运行特定模块的单元测试
npm run test:unit -- unit/agent-scheduler

# 运行特定测试文件
npm run test:unit unit/agent-scheduler/scheduler.test.ts

# 监视模式
npm run test:unit -- --watch
```

## 命名规范

- 所有文件使用 `.test.ts` 后缀
- 文件命名：`<feature>.test.ts`
- 测试套件命名：`describe('<Feature>', () => { ... })`
- 测试用例命名：`it('should do something', () => { ... })`

## 编写单元测试

### 基本结构

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { myFunction } from '@/path/to/module';

describe('myFunction', () => {
  beforeEach(() => {
    // 每个测试前的设置
    vi.clearAllMocks();
  });

  it('should return expected result', () => {
    // 准备
    const input = 'test';
    
    // 执行
    const result = myFunction(input);
    
    // 验证
    expect(result).toBe('expected');
  });
});
```

### 使用 Mock

```typescript
import { vi } from 'vitest';

// Mock 外部模块
vi.mock('@/lib/db', () => ({
  db: {
    query: vi.fn(),
  },
}));

// 在测试中使用
import { db } from '@/lib/db';

it('should query database', async () => {
  db.query.mockResolvedValue([{ id: 1, name: 'test' }]);
  
  const result = await myFunction();
  
  expect(db.query).toHaveBeenCalledWith('SELECT * FROM users');
});
```

## 测试覆盖率

```bash
# 生成覆盖率报告
npm run test:unit -- --coverage

# 查看覆盖率详情
open coverage/index.html
```

目标覆盖率：
- 语句覆盖率：≥ 80%
- 分支覆盖率：≥ 75%
- 函数覆盖率：≥ 85%
- 行覆盖率：≥ 80%

## 注意事项

1. **隔离性**：每个测试应该独立，不依赖其他测试
2. **可读性**：测试名称应该清晰描述测试的内容
3. **快速**：单元测试应该快速执行（通常 < 100ms）
4. **Mock 使用**：适当使用 Mock 来隔离外部依赖
5. **边界测试**：测试正常情况和边界情况
