# 7zi 测试指南

> 完整的测试策略、工具和最佳实践

**版本**: 1.0.0  
**更新日期**: 2026-03-08

---

## 📋 目录

- [测试概览](#测试概览)
- [单元测试 (Vitest)](#单元测试-vitest)
- [E2E 测试 (Playwright)](#e2e-测试-playwright)
- [测试覆盖率](#测试覆盖率)
- [CI/CD 集成](#cicd-集成)
- [最佳实践](#最佳实践)

---

## 测试概览

### 测试金字塔

```
        /\
       /  \
      / E2E \      少量：关键用户流程
     /--------\
    /          \
   / Integration \  中量：模块间集成
  /--------------\
 /                \
/    Unit Tests    \  大量：组件、函数、工具
--------------------
```

### 测试工具栈

| 测试类型 | 工具 | 配置 |
|---------|------|------|
| 单元测试 | Vitest | `vitest.config.ts` |
| E2E 测试 | Playwright | `playwright.config.ts` |
| 组件测试 | Testing Library | React Testing Library |
| 覆盖率 | v8 | 内置于 Vitest |

### 测试目录结构

```
7zi/
├── src/
│   └── test/                    # 测试文件
│       ├── app/                 # 页面测试
│       ├── components/          # 组件测试
│       ├── contexts/            # 上下文测试
│       ├── hooks/               # Hooks 测试
│       ├── lib/                 # 工具函数测试
│       ├── stores/              # Zustand stores 测试
│       └── tasks/               # 任务模块测试
├── e2e/                         # E2E 测试
│   ├── dashboard.spec.ts
│   ├── tasks.spec.ts
│   └── portfolio.spec.ts
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

---

## 单元测试 (Vitest)

### 快速开始

```bash
# 运行所有测试 (watch 模式)
npm run test

# 运行所有测试 (单次)
npm run test:run

# 运行特定文件
npm run test -- src/test/lib/utils.test.ts

# 运行匹配模式的测试
npm run test -- -t "utils"

# 生成覆盖率报告
npm run test:coverage
```

### 测试组件

```tsx
// src/test/components/Button.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '@/components/shared/Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>点击我</Button>);
    expect(screen.getByText('点击我')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>点击</Button>);
    
    screen.getByText('点击').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('respects disabled state', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>禁用</Button>);
    
    screen.getByText('禁用').click();
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<Button loading>加载中</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });
});
```

### 测试 Hooks

```tsx
// src/test/hooks/useTasks.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useTasks } from '@/hooks/useTasks';

describe('useTasks', () => {
  it('initializes with empty tasks', () => {
    const { result } = renderHook(() => useTasks());
    
    expect(result.current.tasks).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('fetches tasks on mount', async () => {
    const mockTasks = [
      { id: '1', title: 'Task 1', status: 'pending' },
      { id: '2', title: 'Task 2', status: 'completed' },
    ];
    
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockTasks),
    });

    const { result, waitForNextUpdate } = renderHook(() => useTasks());
    
    await waitForNextUpdate();
    
    expect(result.current.tasks).toHaveLength(2);
    expect(result.current.loading).toBe(false);
  });

  it('creates new task', async () => {
    const { result } = renderHook(() => useTasks());
    
    await act(async () => {
      await result.current.createTask({
        title: 'New Task',
        type: 'development',
      });
    });
    
    expect(result.current.tasks).toHaveLength(1);
  });
});
```

### 测试 Zustand Stores

```tsx
// src/test/stores/taskStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useTaskStore } from '@/stores/taskStore';

describe('taskStore', () => {
  beforeEach(() => {
    useTaskStore.setState({ tasks: [] });
  });

  it('adds a task', () => {
    useTaskStore.getState().addTask({
      id: '1',
      title: 'Test Task',
      status: 'pending',
    });

    const tasks = useTaskStore.getState().tasks;
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Test Task');
  });

  it('updates task status', () => {
    useTaskStore.getState().addTask({
      id: '1',
      title: 'Test Task',
      status: 'pending',
    });

    useTaskStore.getState().updateTaskStatus('1', 'completed');

    const task = useTaskStore.getState().tasks[0];
    expect(task.status).toBe('completed');
  });

  it('deletes a task', () => {
    useTaskStore.getState().addTask({
      id: '1',
      title: 'Test Task',
      status: 'pending',
    });

    useTaskStore.getState().deleteTask('1');

    expect(useTaskStore.getState().tasks).toHaveLength(0);
  });
});
```

### 测试工具函数

```tsx
// src/test/lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate, calculateProgress, filterTasks } from '@/lib/utils';

describe('utils', () => {
  describe('formatDate', () => {
    it('formats ISO date correctly', () => {
      const date = '2026-03-08T12:00:00Z';
      expect(formatDate(date)).toBe('2026-03-08');
    });

    it('handles invalid date', () => {
      expect(formatDate('invalid')).toBe('');
    });
  });

  describe('calculateProgress', () => {
    it('calculates percentage correctly', () => {
      expect(calculateProgress(50, 100)).toBe(50);
      expect(calculateProgress(75, 100)).toBe(75);
    });

    it('handles zero total', () => {
      expect(calculateProgress(0, 0)).toBe(0);
    });
  });

  describe('filterTasks', () => {
    const tasks = [
      { id: '1', status: 'pending', priority: 'high' },
      { id: '2', status: 'completed', priority: 'low' },
      { id: '3', status: 'pending', priority: 'medium' },
    ];

    it('filters by status', () => {
      const filtered = filterTasks(tasks, { status: 'pending' });
      expect(filtered).toHaveLength(2);
    });

    it('filters by priority', () => {
      const filtered = filterTasks(tasks, { priority: 'high' });
      expect(filtered).toHaveLength(1);
    });

    it('combines filters', () => {
      const filtered = filterTasks(tasks, { 
        status: 'pending',
        priority: 'high'
      });
      expect(filtered).toHaveLength(1);
    });
  });
});
```

### 测试 API 调用

```tsx
// src/test/lib/api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tasksApi } from '@/lib/api';

describe('tasksApi', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('fetches tasks', async () => {
    const mockTasks = [{ id: '1', title: 'Task' }];
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve(mockTasks),
    } as any);

    const tasks = await tasksApi.list();
    
    expect(tasks).toEqual(mockTasks);
    expect(fetch).toHaveBeenCalledWith('/api/tasks');
  });

  it('creates task', async () => {
    const newTask = { title: 'New Task' };
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({ ...newTask, id: '1' }),
    } as any);

    const result = await tasksApi.create(newTask);
    
    expect(result.title).toBe('New Task');
    expect(fetch).toHaveBeenCalledWith('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    });
  });

  it('handles errors', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    await expect(tasksApi.list()).rejects.toThrow('Network error');
  });
});
```

---

## E2E 测试 (Playwright)

### 快速开始

```bash
# 运行所有 E2E 测试
npm run test:e2e

# 运行特定浏览器
npm run test:e2e:chromium

# 打开 UI 模式
npm run test:e2e:ui

# 调试模式
npm run test:e2e:debug

# 生成报告
npm run test:e2e:report
```

### 测试页面

```ts
// e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('loads dashboard successfully', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page).toHaveTitle(/Dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('displays task statistics', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('[data-testid="total-tasks"]')).toBeVisible();
    await expect(page.locator('[data-testid="completed-tasks"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-agents"]')).toBeVisible();
  });

  test('shows recent tasks', async ({ page }) => {
    await page.goto('/dashboard');
    
    const taskList = page.locator('[data-testid="recent-tasks"]');
    await expect(taskList).toBeVisible();
  });
});
```

### 测试用户交互

```ts
// e2e/tasks.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test('creates a new task', async ({ page }) => {
    await page.goto('/tasks');
    
    // 点击新建按钮
    await page.click('[data-testid="new-task-btn"]');
    
    // 填写表单
    await page.fill('[name="title"]', 'E2E 测试任务');
    await page.fill('[name="description"]', '这是一个 E2E 测试任务');
    await page.selectOption('[name="type"]', 'development');
    await page.selectOption('[name="priority"]', 'high');
    
    // 提交
    await page.click('[type="submit"]');
    
    // 验证
    await expect(page.locator('text=E2E 测试任务')).toBeVisible();
  });

  test('updates task status', async ({ page }) => {
    await page.goto('/tasks');
    
    // 找到任务卡片
    const taskCard = page.locator('[data-testid="task-card"]').first();
    
    // 更改状态
    await taskCard.click('[data-testid="status-select"]');
    await taskCard.click('text=Completed');
    
    // 验证状态更新
    await expect(taskCard).toContainText('completed');
  });

  test('filters tasks', async ({ page }) => {
    await page.goto('/tasks');
    
    // 应用过滤器
    await page.selectOption('[name="status-filter"]', 'pending');
    
    // 验证只有 pending 任务显示
    const taskCards = page.locator('[data-testid="task-card"]');
    await expect(taskCards).toHaveCount(1); // 假设只有 1 个 pending
  });
});
```

### 测试 API 响应

```ts
// e2e/api.spec.ts
import { test, expect } from '@playwright/test';

test.describe('API Endpoints', () => {
  test('GET /api/tasks returns tasks', async ({ request }) => {
    const response = await request.get('/api/tasks');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const tasks = await response.json();
    expect(Array.isArray(tasks)).toBeTruthy();
  });

  test('POST /api/tasks creates task', async ({ request }) => {
    const response = await request.post('/api/tasks', {
      data: {
        title: 'API Test Task',
        type: 'development',
        priority: 'medium',
      },
    });
    
    expect(response.ok()).toBeTruthy();
    
    const task = await response.json();
    expect(task.title).toBe('API Test Task');
    expect(task.id).toBeDefined();
  });

  test('GET /api/health returns status', async ({ request }) => {
    const response = await request.get('/api/health');
    
    expect(response.ok()).toBeTruthy();
    
    const health = await response.json();
    expect(health.status).toBe('ok');
  });
});
```

### 测试移动端响应式

```ts
// e2e/responsive.spec.ts
import { test, expect, devices } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('works on mobile', async ({ page }) => {
    await page.setViewportSize(devices['iPhone 13'].viewport!);
    await page.goto('/');
    
    // 验证移动端导航
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // 验证内容适配
    await expect(page.locator('main')).toBeInViewport();
  });

  test('works on tablet', async ({ page }) => {
    await page.setViewportSize(devices['iPad Pro'].viewport!);
    await page.goto('/dashboard');
    
    // 验证平板布局
    const grid = page.locator('[data-testid="stats-grid"]');
    await expect(grid).toHaveAttribute('class', /grid-cols-2/);
  });

  test('works on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/tasks');
    
    // 验证桌面布局
    const board = page.locator('[data-testid="task-board"]');
    await expect(board).toHaveAttribute('class', /grid-cols-4/);
  });
});
```

---

## 测试覆盖率

### 覆盖率目标

| 类别 | 目标 | 当前 |
|------|------|------|
| 语句覆盖率 | 80% | - |
| 分支覆盖率 | 70% | - |
| 函数覆盖率 | 85% | - |
| 行覆盖率 | 80% | - |

### 生成覆盖率报告

```bash
# 生成 HTML 报告
npm run test:coverage

# 查看报告
open coverage/index.html
```

### 覆盖率配置

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      threshold: {
        statements: 80,
        branches: 70,
        functions: 85,
        lines: 80,
      },
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.d.ts',
        'src/test/**',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
      ],
    },
  },
});
```

---

## CI/CD 集成

### GitHub Actions 配置

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run lint
        run: npm run lint
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run unit tests
        run: npm run test:run -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 最佳实践

### 1. 测试命名规范

```tsx
// ✅ 好的命名
describe('TaskCard', () => {
  it('renders task title correctly', () => {});
  it('handles status change', () => {});
  it('displays assignee avatar', () => {});
});

// ❌ 避免模糊命名
describe('TaskCard', () => {
  it('works', () => {});
  it('test 1', () => {});
});
```

### 2. Arrange-Act-Assert 模式

```tsx
it('updates task status', () => {
  // Arrange
  const task = { id: '1', status: 'pending' };
  render(<TaskCard task={task} />);
  
  // Act
  fireEvent.click(screen.getByTestId('status-select'));
  fireEvent.click(screen.getByText('Completed'));
  
  // Assert
  expect(onStatusChange).toHaveBeenCalledWith('completed');
});
```

### 3. 测试隔离

```tsx
// ✅ 每个测试独立
beforeEach(() => {
  vi.clearAllMocks();
  useTaskStore.setState({ tasks: [] });
});

// ❌ 测试间依赖
it('test 1', () => {
  // 修改了共享状态
});

it('test 2', () => {
  // 依赖 test 1 的状态
});
```

### 4. Mock 外部依赖

```tsx
// Mock fetch
global.fetch = vi.fn().mockResolvedValue({
  json: () => Promise.resolve({ data: [] }),
});

// Mock modules
vi.mock('@/lib/api', () => ({
  tasksApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));
```

### 5. 测试可访问性

```tsx
it('is accessible', () => {
  const { container } = render(<TaskCard task={task} />);
  
  // 验证 ARIA 属性
  expect(container.querySelector('[role="button"]')).toBeInTheDocument();
  expect(container.querySelector('[aria-label]')).toBeInTheDocument();
});
```

---

## 常见问题

### Q: 测试运行缓慢？

```bash
# 使用并发
npm run test -- --pool=threads

# 只运行变更的测试
npm run test -- --changed

# 跳过 E2E 测试
npm run test:run
```

### Q: 如何处理异步测试？

```tsx
it('fetches data', async () => {
  const { result, waitForNextUpdate } = renderHook(() => useData());
  
  await waitForNextUpdate();
  
  expect(result.current.data).toBeDefined();
});
```

### Q: 如何测试自定义 Hooks？

```tsx
import { renderHook, act } from '@testing-library/react';

const { result } = renderHook(() => useCounter());

act(() => {
  result.current.increment();
});

expect(result.current.count).toBe(1);
```

---

*测试指南由测试员子代理维护*
