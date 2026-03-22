/**
 * @fileoverview Test data fixtures
 * Provides consistent test data for E2E tests
 */

export interface User {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'user' | 'manager';
}

export interface Task {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  dueDate?: string;
  tags?: string[];
}

/**
 * Test users
 */
export const testUsers = {
  admin: {
    name: 'Admin User',
    email: 'admin@7zi.com',
    password: 'admin123456',
    role: 'admin' as const,
  },
  regular: {
    name: 'Regular User',
    email: 'user@7zi.com',
    password: 'user123456',
    role: 'user' as const,
  },
  manager: {
    name: 'Manager User',
    email: 'manager@7zi.com',
    password: 'manager123456',
    role: 'manager' as const,
  },
  invalid: {
    name: '',
    email: 'invalid-email',
    password: 'short',
  },
  duplicate: {
    name: 'Duplicate User',
    email: 'admin@7zi.com', // Same as admin
    password: 'duplicate123',
  },
};

/**
 * Test tasks
 */
export const testTasks = {
  highPriority: {
    title: 'High Priority Task',
    description: 'This is a high priority task that needs immediate attention',
    priority: 'high' as const,
    assignee: 'Regular User',
    dueDate: '2024-12-31',
    tags: ['urgent', 'important'],
  },
  mediumPriority: {
    title: 'Medium Priority Task',
    description: 'This is a medium priority task',
    priority: 'medium' as const,
    assignee: 'Regular User',
    dueDate: '2025-01-15',
    tags: ['normal'],
  },
  lowPriority: {
    title: 'Low Priority Task',
    description: 'This is a low priority task',
    priority: 'low' as const,
    assignee: 'Regular User',
    dueDate: '2025-02-01',
    tags: ['backlog'],
  },
  withDueDate: {
    title: 'Task with Due Date',
    description: 'Task with a specific due date',
    priority: 'medium' as const,
    dueDate: '2024-12-25',
  },
  overdue: {
    title: 'Overdue Task',
    description: 'This task is already overdue',
    priority: 'high' as const,
    dueDate: '2020-01-01', // Past date
  },
  today: {
    title: 'Today Task',
    description: 'Task due today',
    priority: 'high' as const,
    dueDate: new Date().toISOString().split('T')[0],
  },
  minimal: {
    title: 'Minimal Task',
    description: '',
    priority: 'low' as const,
  },
};

/**
 * Test page content
 */
export const pageContent = {
  home: {
    title: /首页|Home/i,
    features: ['AI Task Management', 'Smart Analytics', 'Team Collaboration'],
  },
  dashboard: {
    title: /仪表盘|Dashboard/i,
    stats: ['Total Tasks', 'Completed', 'In Progress', 'Overdue'],
  },
  tasks: {
    title: /任务|Tasks/i,
    filters: ['All', 'Pending', 'Completed', 'Overdue'],
  },
  team: {
    title: /团队|Team/i,
    members: ['Admin User', 'Regular User', 'Manager User'],
  },
  analytics: {
    title: /分析|Analytics/i,
    charts: ['Task Distribution', 'Completion Rate', 'Team Performance'],
  },
};

/**
 * Test URLs
 */
export const testURLs = {
  home: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  tasks: '/tasks',
  team: '/team',
  analytics: '/analytics',
  settings: '/settings',
  profile: '/profile',
};

/**
 * Error messages
 */
export const errorMessages = {
  invalidEmail: /无效的邮箱|Invalid email/i,
  shortPassword: /密码太短|Password too short/i,
  mismatchPassword: /密码不匹配|Password mismatch/i,
  emailExists: /邮箱已存在|Email already exists/i,
  invalidCredentials: /邮箱或密码错误|Invalid credentials/i,
  required: /必填|Required/i,
  networkError: /网络错误|Network error/i,
  unauthorized: /未授权|Unauthorized/i,
};

/**
 * Success messages
 */
export const successMessages = {
  loginSuccess: /登录成功|Login successful/i,
  registerSuccess: /注册成功|Registration successful/i,
  taskCreated: /任务创建成功|Task created successfully/i,
  taskUpdated: /任务更新成功|Task updated successfully/i,
  taskDeleted: /任务删除成功|Task deleted successfully/i,
  taskCompleted: /任务已完成|Task completed/i,
  profileUpdated: /资料更新成功|Profile updated successfully/i,
};

/**
 * Form validation rules
 */
export const validationRules = {
  emailMinLength: 5,
  emailMaxLength: 100,
  passwordMinLength: 6,
  passwordMaxLength: 50,
  nameMinLength: 2,
  nameMaxLength: 50,
  taskTitleMinLength: 1,
  taskTitleMaxLength: 200,
  taskDescriptionMaxLength: 2000,
};

/**
 * API endpoints (for mocking)
 */
export const apiEndpoints = {
  login: '/api/auth/login',
  register: '/api/auth/register',
  logout: '/api/auth/logout',
  tasks: '/api/tasks',
  createTask: '/api/tasks',
  updateTask: (id: string) => `/api/tasks/${id}`,
  deleteTask: (id: string) => `/api/tasks/${id}`,
  completeTask: (id: string) => `/api/tasks/${id}/complete`,
  dashboard: '/api/dashboard/stats',
  team: '/api/team/members',
  analytics: '/api/analytics/data',
};

/**
 * Mock API responses
 */
export const mockResponses = {
  loginSuccess: {
    success: true,
    data: {
      user: testUsers.regular,
      token: 'mock-jwt-token',
    },
  },
  registerSuccess: {
    success: true,
    data: {
      user: testUsers.regular,
      token: 'mock-jwt-token',
    },
  },
  taskCreated: {
    success: true,
    data: {
      ...testTasks.highPriority,
      id: 'task-1',
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
  },
  dashboardStats: {
    success: true,
    data: {
      totalTasks: 150,
      completedTasks: 100,
      inProgressTasks: 40,
      overdueTasks: 10,
      completionRate: 66.67,
    },
  },
  teamMembers: {
    success: true,
    data: [
      {
        id: '1',
        name: 'Admin User',
        email: 'admin@7zi.com',
        role: 'admin',
        avatar: '/avatars/admin.png',
      },
      {
        id: '2',
        name: 'Regular User',
        email: 'user@7zi.com',
        role: 'user',
        avatar: '/avatars/user.png',
      },
    ],
  },
};

/**
 * Generate unique test data
 */
export function generateUniqueUser(prefix: string = 'test'): User {
  const timestamp = Date.now();
  return {
    name: `${prefix} User ${timestamp}`,
    email: `${prefix}-${timestamp}@example.com`,
    password: `test123456${timestamp}`,
    role: 'user',
  };
}

export function generateUniqueTask(prefix: string = 'task'): Task {
  const timestamp = Date.now();
  return {
    title: `${prefix} Title ${timestamp}`,
    description: `This is a test task created at ${timestamp}`,
    priority: 'medium',
    assignee: 'Test User',
    dueDate: new Date().toISOString().split('T')[0],
    tags: ['test'],
  };
}

/**
 * Test environment variables
 */
export const testEnvironment = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  testUserEmail: process.env.TEST_USER_EMAIL || 'test@7zi.com',
  testUserPassword: process.env.TEST_USER_PASSWORD || 'test123456',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@7zi.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123456',
};
