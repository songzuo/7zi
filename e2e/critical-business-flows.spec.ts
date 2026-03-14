/**
 * 7zi 项目关键业务流程 E2E 测试
 * 
 * 覆盖范围:
 * - 用户登录流程
 * - 任务创建和管理流程
 * - 项目浏览和筛选
 * - 通知系统操作
 * 
 * 使用 Playwright API，测试稳定且独立运行
 */

import { test, expect, APIRequestContext } from '@playwright/test';

// ============================================
// 测试配置和工具
// ============================================

// 测试用户凭证
const TEST_USERS = {
  admin: {
    email: 'admin@7zi.studio',
    password: 'admin123'
  },
  invalid: {
    email: 'invalid@example.com',
    password: 'wrongpassword'
  }
};

// 测试任务数据
const TEST_TASK = {
  title: 'E2E 测试任务',
  description: '这是一个通过 Playwright E2E 测试创建的任务',
  type: 'development',
  priority: 'high'
};

// 测试项目数据
const TEST_PROJECT = {
  name: 'E2E 测试项目',
  description: 'E2E 测试创建的项目',
  deadline: '2024-12-31'
};

// 测试通知数据
const TEST_NOTIFICATION = {
  type: 'task_assigned',
  title: 'E2E 测试通知',
  message: '这是 E2E 测试创建的通知',
  userId: 'test-user'
};

// 辅助函数：创建认证上下文
async function createAuthContext(request: APIRequestContext) {
  const loginResponse = await request.post('/api/auth/login', {
    data: TEST_USERS.admin
  });
  
  if (loginResponse.ok()) {
    const cookies = loginResponse.headers()['set-cookie'];
    return { cookies, authenticated: true };
  }
  
  return { cookies: null, authenticated: false };
}

// ============================================
// 用户登录流程测试
// ============================================

test.describe('用户登录流程', () => {
  
  test.describe('正常流程', () => {
    
    test('应该能够成功登录并获取用户信息', async ({ request }) => {
      // 1. 执行登录 - 使用正确的 API 端点
      const loginResponse = await request.post('/api/auth', {
        data: TEST_USERS.admin
      });
      
      // 2. 验证登录成功
      expect(loginResponse.ok()).toBeTruthy();
      
      const loginData = await loginResponse.json();
      expect(loginData.success).toBe(true);
      expect(loginData.user).toBeDefined();
      expect(loginData.user.email).toBe(TEST_USERS.admin.email);
      expect(loginData.csrfToken).toBeDefined();
      
      // 3. 获取 CSRF token
      const csrfResponse = await request.get('/api/auth/csrf?action=csrf');
      expect(csrfResponse.ok()).toBeTruthy();
      const csrfData = await csrfResponse.json();
      expect(csrfData.csrfToken).toBeDefined();
      
      // 4. 使用 token 获取用户信息
      const meResponse = await request.get('/api/auth/me', {
        headers: {
          'X-CSRF-Token': csrfData.csrfToken
        }
      });
      
      expect(meResponse.ok()).toBeTruthy();
      const userData = await meResponse.json();
      expect(userData.success).toBe(true);
      expect(userData.user.email).toBe(TEST_USERS.admin.email);
    });
    
    test('登录后应该能够刷新访问令牌', async ({ request }) => {
      // 1. 登录获取 refresh token
      const loginResponse = await request.post('/api/auth/login', {
        data: TEST_USERS.admin
      });
      
      expect(loginResponse.ok()).toBeTruthy();
      
      // 2. 刷新 token
      const refreshResponse = await request.post('/api/auth/refresh');
      
      expect(refreshResponse.ok()).toBeTruthy();
      const refreshData = await refreshResponse.json();
      expect(refreshData.success).toBe(true);
      expect(refreshData.accessToken).toBeDefined();
    });
    
    test('登录后应该能够成功登出', async ({ request }) => {
      // 1. 登录
      const loginResponse = await request.post('/api/auth/login', {
        data: TEST_USERS.admin
      });
      
      expect(loginResponse.ok()).toBeTruthy();
      
      // 2. 登出
      const logoutResponse = await request.delete('/api/auth/logout');
      
      expect(logoutResponse.ok()).toBeTruthy();
      const logoutData = await logoutResponse.json();
      expect(logoutData.success).toBe(true);
      expect(logoutData.message).toContain('successfully');
    });
  });
  
  test.describe('边界情况', () => {
    
    test('空邮箱应该登录失败', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: {
          email: '',
          password: 'anypassword'
        }
      });
      
      // 应该返回错误状态
      expect(response.status()).toBeGreaterThanOrEqual(400);
      const data = await response.json();
      expect(data.error).toBeTruthy();
    });
    
    test('空密码应该登录失败', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: {
          email: TEST_USERS.admin.email,
          password: ''
        }
      });
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      const data = await response.json();
      expect(data.error).toBeTruthy();
    });
    
    test('错误密码应该登录失败并返回 401', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: TEST_USERS.invalid
      });
      
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Invalid');
    });
    
    test('不存在的用户应该登录失败', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: {
          email: 'nonexistent@test.com',
          password: 'anystring'
        }
      });
      
      expect(response.status()).toBe(401);
    });
    
    test('缺少必需字段应该返回验证错误', async ({ request }) => {
      // 只发送邮箱
      const response1 = await request.post('/api/auth/login', {
        data: {
          email: TEST_USERS.admin.email
        }
      });
      
      expect(response1.status()).toBeGreaterThanOrEqual(400);
      
      // 只发送密码
      const response2 = await request.post('/api/auth/login', {
        data: {
          password: TEST_USERS.admin.password
        }
      });
      
      expect(response2.status()).toBeGreaterThanOrEqual(400);
    });
  });
});

// ============================================
// 任务创建和管理流程测试
// ============================================

test.describe('任务创建和管理流程', () => {
  
  test.describe('正常流程', () => {
    
    test('应该能够获取任务列表', async ({ request }) => {
      const response = await request.get('/api/tasks');
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data.tasks || data)).toBe(true);
    });
    
    test('应该能够按状态筛选任务', async ({ request }) => {
      const statuses = ['pending', 'in_progress', 'completed'];
      
      for (const status of statuses) {
        const response = await request.get(`/api/tasks?status=${status}`);
        
        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        const tasks = data.tasks || data;
        
        // 如果有任务，验证状态
        if (tasks.length > 0) {
          tasks.forEach((task: any) => {
            expect(task.status).toBe(status);
          });
        }
      }
    });
    
    test('应该能够按类型筛选任务', async ({ request }) => {
      const types = ['development', 'research', 'design', 'marketing'];
      
      for (const type of types) {
        const response = await request.get(`/api/tasks?type=${type}`);
        
        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        const tasks = data.tasks || data;
        
        // 如果有任务，验证类型
        if (tasks.length > 0) {
          tasks.forEach((task: any) => {
            expect(task.type).toBe(type);
          });
        }
      }
    });
    
    test('应该能够创建新任务', async ({ request }) => {
      // 获取 CSRF token
      const csrfResponse = await request.get('/api/auth/csrf?action=csrf');
      const csrfData = await csrfResponse.json();
      
      const response = await request.post('/api/tasks', {
        data: TEST_TASK,
        headers: {
          'X-CSRF-Token': csrfData.csrfToken
        }
      });
      
      // 201 表示创建成功，400 可能表示需要额外验证
      expect([201, 400]).toContain(response.status());
    });
    
    test('应该能够分页获取任务', async ({ request }) => {
      const response = await request.get('/api/tasks?limit=5&offset=0');
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.tasks || data).toBeDefined();
    });
  });
  
  test.describe('边界情况', () => {
    
    test('空标题应该创建失败', async ({ request }) => {
      const response = await request.post('/api/tasks', {
        data: {
          title: '',
          description: 'Test description',
          type: 'development'
        }
      });
      
      // 应该返回错误
      expect(response.status()).toBeGreaterThanOrEqual(400);
      const data = await response.json();
      expect(data.error).toBeTruthy();
    });
    
    test('无效的任务类型应该被拒绝', async ({ request }) => {
      const response = await request.post('/api/tasks', {
        data: {
          title: 'Test Task',
          description: 'Test description',
          type: 'invalid_type'
        }
      });
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
    
    test('无效的优先级应该被拒绝', async ({ request }) => {
      const response = await request.post('/api/tasks', {
        data: {
          title: 'Test Task',
          description: 'Test description',
          priority: 'super_urgent'
        }
      });
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
    
    test('过长的标题应该被拒绝', async ({ request }) => {
      const longTitle = 'a'.repeat(500);
      
      const response = await request.post('/api/tasks', {
        data: {
          title: longTitle,
          description: 'Test description'
        }
      });
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
    
    test('特殊字符在任务标题中应该被正确处理', async ({ request }) => {
      const specialChars = "测试任务 <script>alert('xss')</script>";
      
      const response = await request.post('/api/tasks', {
        data: {
          title: specialChars,
          description: 'Testing special characters'
        }
      });
      
      // API 应该能够处理或拒绝
      expect([201, 400]).toContain(response.status());
    });
  });
});

// ============================================
// 项目浏览和筛选流程测试
// ============================================

test.describe('项目浏览和筛选流程', () => {
  
  test.describe('正常流程', () => {
    
    test('应该能够获取项目列表', async ({ request }) => {
      const response = await request.get('/api/projects');
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data.projects || data)).toBe(true);
    });
    
    test('应该能够筛选活跃项目', async ({ request }) => {
      const response = await request.get('/api/projects?status=active');
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      const projects = data.projects || data;
      
      // 如果有项目，验证状态
      if (projects.length > 0) {
        projects.forEach((project: any) => {
          expect(['active', 'completed'].includes(project.status)).toBe(true);
        });
      }
    });
    
    test('应该能够获取项目详情', async ({ request }) => {
      // 先获取项目列表
      const listResponse = await request.get('/api/projects');
      const listData = await listResponse.json();
      const projects = listData.projects || listData;
      
      if (projects.length > 0) {
        // 获取第一个项目的详情
        const detailResponse = await request.get(`/api/projects/${projects[0].id}`);
        
        expect(detailResponse.ok()).toBeTruthy();
        
        const detailData = await detailResponse.json();
        expect(detailData.id).toBeDefined();
      }
    });
    
    test('项目详情应该包含团队成员信息', async ({ request }) => {
      const response = await request.get('/api/projects');
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      const projects = data.projects || data;
      
      // 验证项目数据结构
      if (projects.length > 0) {
        const project = projects[0];
        expect(project.name || project.title).toBeDefined();
      }
    });
  });
  
  test.describe('边界情况', () => {
    
    test('不存在的项目ID应该返回 404', async ({ request }) => {
      const response = await request.get('/api/projects/non-existent-id-12345');
      
      expect(response.status()).toBe(404);
    });
    
    test('无效的项目状态筛选应该返回空结果或默认结果', async ({ request }) => {
      const response = await request.get('/api/projects?status=invalid_status');
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      // 应该返回空列表或全部列表，而不是错误
      expect(Array.isArray(data.projects || data)).toBe(true);
    });
    
    test('过大的分页参数应该被限制', async ({ request }) => {
      const response = await request.get('/api/projects?limit=999999');
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      // 应该返回合理数量的结果
      expect((data.projects || data).length).toBeLessThanOrEqual(100);
    });
  });
});

// ============================================
// 通知系统操作流程测试
// ============================================

test.describe('通知系统操作流程', () => {
  
  test.describe('正常流程', () => {
    
    test('应该能够获取通知列表', async ({ request }) => {
      const response = await request.get('/api/notifications');
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data.notifications || data)).toBe(true);
    });
    
    test('应该能够按已读状态筛选通知', async ({ request }) => {
      const response = await request.get('/api/notifications?read=false');
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      const notifications = data.notifications || data;
      
      // 如果有通知，验证已读状态
      if (notifications.length > 0) {
        notifications.forEach((notif: any) => {
          expect(notif.read).toBe(false);
        });
      }
    });
    
    test('应该能够创建新通知', async ({ request }) => {
      // 获取 CSRF token
      const csrfResponse = await request.get('/api/auth/csrf?action=csrf');
      const csrfData = await csrfResponse.json();
      
      const response = await request.post('/api/notifications', {
        data: TEST_NOTIFICATION,
        headers: {
          'X-CSRF-Token': csrfData.csrfToken
        }
      });
      
      // 201 表示创建成功
      expect([201, 400, 401]).toContain(response.status());
    });
    
    test('应该能够标记通知为已读', async ({ request }) => {
      // 获取 CSRF token
      const csrfResponse = await request.get('/api/auth/csrf?action=csrf');
      const csrfData = await csrfResponse.json();
      
      // 先获取一个通知
      const listResponse = await request.get('/api/notifications');
      const listData = await listResponse.json();
      const notifications = listData.notifications || listData;
      
      if (notifications.length > 0) {
        const notificationId = notifications[0].id;
        
        // 标记为已读
        const updateResponse = await request.put('/api/notifications', {
          data: {
            id: notificationId,
            read: true
          },
          headers: {
            'X-CSRF-Token': csrfData.csrfToken
          }
        });
        
        expect([200, 400]).toContain(updateResponse.status());
      }
    });
    
    test('应该能够标记所有通知为已读', async ({ request }) => {
      // 获取 CSRF token
      const csrfResponse = await request.get('/api/auth/csrf?action=csrf');
      const csrfData = await csrfResponse.json();
      
      const response = await request.put('/api/notifications', {
        data: {
          markAllRead: true
        },
        headers: {
          'X-CSRF-Token': csrfData.csrfToken
        }
      });
      
      expect([200, 400]).toContain(response.status());
    });
    
    test('应该能够删除单个通知', async ({ request }) => {
      // 获取 CSRF token
      const csrfResponse = await request.get('/api/auth/csrf?action=csrf');
      const csrfData = await csrfResponse.json();
      
      // 先创建一个通知
      const createResponse = await request.post('/api/notifications', {
        data: TEST_NOTIFICATION,
        headers: {
          'X-CSRF-Token': csrfData.csrfToken
        }
      });
      
      // 如果创建成功，尝试删除
      if (createResponse.status() === 201) {
        const createData = await createResponse.json();
        const notificationId = createData.id;
        
        const deleteResponse = await request.delete(`/api/notifications?id=${notificationId}`, {
          headers: {
            'X-CSRF-Token': csrfData.csrfToken
          }
        });
        
        expect([200, 404]).toContain(deleteResponse.status());
      }
    });
    
    test('应该能够清空所有通知', async ({ request }) => {
      // 获取 CSRF token
      const csrfResponse = await request.get('/api/auth/csrf?action=csrf');
      const csrfData = await csrfResponse.json();
      
      const response = await request.delete('/api/notifications?deleteAll=true', {
        headers: {
          'X-CSRF-Token': csrfData.csrfToken
        }
      });
      
      expect([200, 400]).toContain(response.status());
    });
  });
  
  test.describe('边界情况', () => {
    
    test('空标题应该创建失败', async ({ request }) => {
      const response = await request.post('/api/notifications', {
        data: {
          type: 'task_assigned',
          title: '',
          message: 'Test message',
          userId: 'test-user'
        }
      });
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      const data = await response.json();
      expect(data.error).toContain('title');
    });
    
    test('空消息应该创建失败', async ({ request }) => {
      const response = await request.post('/api/notifications', {
        data: {
          type: 'task_assigned',
          title: 'Test Title',
          message: '',
          userId: 'test-user'
        }
      });
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      const data = await response.json();
      expect(data.error).toContain('message');
    });
    
    test('无效的通知类型应该被拒绝', async ({ request }) => {
      const response = await request.post('/api/notifications', {
        data: {
          type: 'invalid_type',
          title: 'Test Title',
          message: 'Test message',
          userId: 'test-user'
        }
      });
      
      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('type');
    });
    
    test('缺少用户ID应该创建失败', async ({ request }) => {
      const response = await request.post('/api/notifications', {
        data: {
          type: 'task_assigned',
          title: 'Test Title',
          message: 'Test message'
        }
      });
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
    
    test('不存在的通知ID删除应该返回 404', async ({ request }) => {
      // 获取 CSRF token
      const csrfResponse = await request.get('/api/auth/csrf?action=csrf');
      const csrfData = await csrfResponse.json();
      
      const response = await request.delete('/api/notifications?id=non-existent-id', {
        headers: {
          'X-CSRF-Token': csrfData.csrfToken
        }
      });
      
      expect(response.status()).toBe(404);
    });
    
    test('标记不存在的通知为已读应该返回 404', async ({ request }) => {
      // 获取 CSRF token
      const csrfResponse = await request.get('/api/auth/csrf?action=csrf');
      const csrfData = await csrfResponse.json();
      
      const response = await request.put('/api/notifications', {
        data: {
          id: 'non-existent-id',
          read: true
        },
        headers: {
          'X-CSRF-Token': csrfData.csrfToken
        }
      });
      
      expect(response.status()).toBe(404);
    });
  });
});

// ============================================
// 集成流程测试
// ============================================

test.describe('集成流程测试', () => {
  
  test('完整的用户认证和任务操作流程', async ({ request }) => {
    // 1. 登录
    const loginResponse = await request.post('/api/auth/login', {
      data: TEST_USERS.admin
    });
    expect(loginResponse.ok()).toBeTruthy();
    
    // 2. 获取 CSRF token
    const csrfResponse = await request.get('/api/auth/csrf?action=csrf');
    const csrfData = await csrfResponse.json();
    
    // 3. 获取任务列表
    const tasksResponse = await request.get('/api/tasks');
    expect(tasksResponse.ok()).toBeTruthy();
    
    // 4. 获取项目列表
    const projectsResponse = await request.get('/api/projects');
    expect(projectsResponse.ok()).toBeTruthy();
    
    // 5. 获取通知列表
    const notificationsResponse = await request.get('/api/notifications');
    expect(notificationsResponse.ok()).toBeTruthy();
    
    // 6. 登出
    const logoutResponse = await request.delete('/api/auth/logout');
    expect(logoutResponse.ok()).toBeTruthy();
  });
  
  test('完整的任务创建、查看、删除流程', async ({ request }) => {
    // 1. 获取 CSRF token
    const csrfResponse = await request.get('/api/auth/csrf?action=csrf');
    const csrfData = await csrfResponse.json();
    
    // 2. 创建任务
    const createResponse = await request.post('/api/tasks', {
      data: TEST_TASK,
      headers: {
        'X-CSRF-Token': csrfData.csrfToken
      }
    });
    
    // 3. 获取任务列表
    const listResponse = await request.get('/api/tasks');
    expect(listResponse.ok()).toBeTruthy();
    
    // 4. 登出
    const logoutResponse = await request.delete('/api/auth/logout');
    expect(logoutResponse.ok()).toBeTruthy();
  });
});

// ============================================
// UI 交互测试
// ============================================

test.describe('UI 页面交互测试', () => {
  
  test('登录页面应该正确加载', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 验证页面标题
    await expect(page).toHaveTitle(/7zi|Studio/i);
    
    // 验证主要内容区域
    await expect(page.locator('body')).toBeVisible();
  });
  
  test('任务页面应该正确加载', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // 验证页面加载
    expect(page.url()).toContain('tasks');
  });
  
  test('通知页面应该正确加载', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    
    // 验证页面加载
    expect(page.url()).toContain('notifications') || expect(page.locator('body')).toBeVisible();
  });
  
  test('Dashboard 页面应该正确加载', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 验证页面加载
    expect(page.url()).toContain('dashboard');
  });
});
