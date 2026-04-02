# ADR-0005: 使用 Vitest 作为测试框架

## 状态

Accepted

## 上下文

项目需要现代化、快速的测试框架。原有的测试配置存在以下问题：

- Jest 启动慢（~5-10s）
- 配置复杂（需要多个配置文件）
- 与 Vite 生态集成不完美
- Watch 模式响应慢

测试需求：

- 单元测试（快速执行）
- 集成测试（模拟真实环境）
- E2E 测试（Playwright）
- 代码覆盖率报告

## 决策

采用 [Vitest](https://vitest.dev/) 作为主要的单元测试和集成测试框架。

### 实现方案

1. **框架配置**:

   ```typescript
   // vitest.config.ts
   import { defineConfig } from 'vitest/config'

   export default defineConfig({
     test: {
       globals: true,
       environment: 'jsdom',
       coverage: {
         provider: 'v8',
         reporter: ['text', 'json', 'html'],
       },
     },
   })
   ```

2. **测试工具**:
   - Vitest (单元测试)
   - Playwright (E2E 测试)
   - @testing-library/react (组件测试)

### Vitest 优势

- **快速启动**: 基于 Vite，启动速度提升 10-20 倍
- **配置简单**: 与 Vite 共享配置
- **Watch 模式**: 即时响应文件变化
- **TypeScript 支持**: 原生支持，无需额外配置
- **兼容 Jest**: API 兼容，迁移成本低
- **覆盖率**: 内置 v8 覆盖率工具

## 权衡

### 替代方案 1: Jest

**优点**:

- 成熟稳定
- 生态丰富
- 文档完善

**缺点**:

- 启动慢（~5-10s）
- 配置复杂
- 与 Vite 生态集成不佳

**选择 Vitest 的原因**: 项目使用 Vite，Vitest 集成更好，性能更优。

### 替代方案 2: Mocha + Chai

**优点**:

- 灵活可定制
- 轻量级

**缺点**:

- 需要手动配置（断言库、mock 等）
- Watch 模式需额外工具
- TypeScript 支持需配置

**选择 Vitest 的原因**: Vitest 提供开箱即用的完整测试解决方案。

### 替代方案 3: Ava

**优点**:

- 并发执行
- 简洁 API

**缺点**:

- 生态较小
- 文档较少
- 对 React 测试支持不够好

**选择 Vitest 的原因**: Vitest 对 React 和 TypeScript 支持更好。

## 后果

### 正面影响

- ✅ **开发体验**: 快速反馈循环（Watch 模式 <1s）
- ✅ **执行速度**: 测试执行速度提升 5-10 倍
- ✅ **配置简单**: 与 Vite 共享配置
- ✅ **类型安全**: 完整的 TypeScript 支持
- ✅ **现代化**: 与 Vite 生态完美集成

### 负面影响

- ⚠️ **迁移成本**: 需要将 Jest 测试迁移到 Vitest
- ⚠️ **社区**: Vitest 社区相对较小（但增长快）

### 迁移策略

1. **Phase 1**: 新测试使用 Vitest
2. **Phase 2**: 逐步迁移现有 Jest 测试
3. **Phase 3**: 移除 Jest 依赖

### 测试示例

```typescript
// unit test
import { describe, it, expect } from 'vitest';
import { sum } from './math';

describe('sum', () => {
  it('should add two numbers', () => {
    expect(sum(1, 2)).toBe(3);
  });
});

// component test
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should render text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});

// async test
import { describe, it, expect, vi } from 'vitest';

describe('fetchData', () => {
  it('should fetch data', async () => {
    const data = await fetchData();
    expect(data).toBeDefined();
  });
});
```

### 测试覆盖率目标

| 模块          | 目标覆盖率 | 当前覆盖率 |
| ------------- | ---------- | ---------- |
| Core          | 90%+       | 94.2%      |
| API           | 85%+       | 93%        |
| UI Components | 80%+       | 92%        |
| Overall       | 85%+       | 94%        |

## 相关决策

- [ADR-0004: 启用 TypeScript Strict Mode](0004-use-typescript-strict-mode.md) - TypeScript 测试支持
- [ADR-0006: Agent Scheduler 架构](0006-agent-scheduler-architecture.md) - 122 个单元测试全部通过
