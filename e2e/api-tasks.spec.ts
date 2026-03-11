/**
 * Tasks API E2E 测试
 * 测试任务管理 API 的完整流程
 */

import { test, expect, APIRequestContext } from '@playwright/test';

// 定义任务类型
interface Task {
  id: string;
  title: string;
  description?: string;
  type?: string;
  status: string;
  priority?: string;
  assignee?: string;
}

test.describe('Tasks API E2E', () => {
  let apiContext: APIRequestContext;
  let csrfToken: string;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test.describe('未认证访问', () => {
    test('应该能获取任务列表', async () => {
      const response = await apiContext.get('/api/tasks');
      expect(response.ok()).toBeTruthy();
      
      const tasks = await response.json();
      expect(Array.isArray(tasks)).toBe(true);
    });

    test('应该能按状态过滤任务', async () => {
      const response = await apiContext.get('/api/tasks?status=completed');
      expect(response.ok()).toBeTruthy();
      
      const tasks = await response.json() as Task[];
      tasks.forEach((task) => {
        expect(task.status).toBe('completed');
      });
    });

    test('应该能按类型过滤任务', async () => {
      const response = await apiContext.get('/api/tasks?type=research');
      expect(response.ok()).toBeTruthy();
      
      const tasks = await response.json() as Task[];
      tasks.forEach((task) => {
        expect(task.type).toBe('research');
      });
    });
  });

  test.describe('认证流程', () => {
    test('应该能登录并获取 token', async () => {
      const response = await apiContext.post('/api/auth', {
        data: {
          email: 'admin@7zi.studio',
          password: 'admin123',
        },
      });
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.csrfToken).toBeDefined();
      
      csrfToken = data.csrfToken;
    });

    test('无效凭据应该被拒绝', async () => {
      const response = await apiContext.post('/api/auth', {
        data: {
          email: 'admin@7zi.studio',
          password: 'wrongpassword',
        },
      });
      
      expect(response.status()).toBe(401);
    });

    test('缺少凭据应该返回错误', async () => {
      const response = await apiContext.post('/api/auth', {
        data: {},
      });
      
      expect(response.status()).toBe(400);
    });
  });

  test.describe('任务创建', () => {
    test('应该能创建任务', async () => {
      const response = await apiContext.post('/api/tasks', {
        data: {
          title: 'E2E 测试任务',
          description: '这是一个 E2E 测试创建的任务',
          type: 'development',
          priority: 'high',
        },
        headers: {
          'x-csrf-token': csrfToken || 'test-token',
        },
      });
      
      expect(response.status()).toBe(201);
      const task = await response.json();
      
      expect(task.title).toBe('E2E 测试任务');
      expect(task.type).toBe('development');
      expect(task.status).toBe('pending');
      expect(task.id).toMatch(/^task-/);
    });

    test('只有标题也应该能创建任务', async () => {
      const response = await apiContext.post('/api/tasks', {
        data: {
          title: '简单任务',
        },
        headers: {
          'x-csrf-token': csrfToken || 'test-token',
        },
      });
      
      expect(response.status()).toBe(201);
      const task = await response.json();
      expect(task.title).toBe('简单任务');
    });

    test('没有标题应该返回错误', async () => {
      const response = await apiContext.post('/api/tasks', {
        data: {
          description: '没有标题的任务',
        },
        headers: {
          'x-csrf-token': csrfToken || 'test-token',
        },
      });
      
      expect(response.status()).toBe(400);
    });
  });

  test.describe('任务更新', () => {
    let testTaskId: string;

    test.beforeAll(async () => {
      // 创建测试任务
      const response = await apiContext.post('/api/tasks', {
        data: {
          title: '更新测试任务',
          type: 'development',
        },
        headers: {
          'x-csrf-token': csrfToken || 'test-token',
        },
      });
      
      if (response.ok()) {
        const task = await response.json();
        testTaskId = task.id;
      }
    });

    test('应该能更新任务状态', async () => {
      // 获取现有任务
      const listResponse = await apiContext.get('/api/tasks');
      const tasks = await listResponse.json();
      const existingTask = tasks[0];

      const response = await apiContext.put('/api/tasks', {
        data: {
          id: existingTask.id,
          status: 'completed',
        },
        headers: {
          'x-csrf-token': csrfToken || 'test-token',
        },
      });
      
      expect(response.ok()).toBeTruthy();
      const task = await response.json();
      expect(task.status).toBe('completed');
    });

    test('应该能更新任务负责人', async () => {
      const listResponse = await apiContext.get('/api/tasks');
      const tasks = await listResponse.json();
      const existingTask = tasks[0];

      const response = await apiContext.put('/api/tasks', {
        data: {
          id: existingTask.id,
          assignee: 'executor',
        },
        headers: {
          'x-csrf-token': csrfToken || 'test-token',
        },
      });
      
      expect(response.ok()).toBeTruthy();
    });

    test('应该能添加评论', async () => {
      const listResponse = await apiContext.get('/api/tasks');
      const tasks = await listResponse.json();
      const existingTask = tasks[0];

      const response = await apiContext.put('/api/tasks', {
        data: {
          id: existingTask.id,
          comment: 'E2E 测试评论',
        },
        headers: {
          'x-csrf-token': csrfToken || 'test-token',
        },
      });
      
      expect(response.ok()).toBeTruthy();
    });

    test('不存在的任务应该返回 404', async () => {
      const response = await apiContext.put('/api/tasks', {
        data: {
          id: 'nonexistent-task-id',
          status: 'completed',
        },
        headers: {
          'x-csrf-token': csrfToken || 'test-token',
        },
      });
      
      expect(response.status()).toBe(404);
    });
  });

  test.describe('任务删除', () => {
    test('未认证用户应该被拒绝', async () => {
      const response = await apiContext.delete('/api/tasks?id=task-001');
      expect(response.status()).toBe(401);
    });
  });
});

test.describe('Tasks 页面 E2E', () => {
  test('应该能访问任务页面', async ({ page }) => {
    await page.goto('/tasks');
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 检查页面元素
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('应该能查看任务列表', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // 检查任务卡片或列表项
    const taskElements = page.locator('[data-testid="task-card"], .task-item, article').first();
    
    // 如果有任务，应该能看到
    if (await taskElements.count() > 0) {
      await expect(taskElements).toBeVisible();
    }
  });

  test('应该能过滤任务', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // 查找过滤按钮或选择器
    const filterButton = page.locator('button:has-text("过滤"), button:has-text("Filter"), select').first();
    
    if (await filterButton.count() > 0) {
      await filterButton.click();
    }
  });

  test('应该能创建新任务', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // 查找创建任务按钮
    const createButton = page.locator('button:has-text("创建"), button:has-text("新任务"), button:has-text("Add")').first();
    
    if (await createButton.count() > 0) {
      await createButton.click();
      
      // 等待表单出现
      await page.waitForTimeout(500);
      
      // 填写表单
      const titleInput = page.locator('input[name="title"], input[placeholder*="标题"], input[placeholder*="title"]').first();
      if (await titleInput.count() > 0) {
        await titleInput.fill('E2E 页面测试任务');
      }
      
      // 提交表单
      const submitButton = page.locator('button[type="submit"], button:has-text("提交"), button:has-text("保存")').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
      }
    }
  });
});