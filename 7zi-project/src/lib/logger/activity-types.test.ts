/**
// @ts-ignore - Mock type compatibility issues
 * Tests for Activity Types
 */

import { describe, it, expect } from 'vitest';
import {
  ActivityType,
  ActivityCategory,
  type ActivityLogEntry,
  type ActivityFilters,
  type ActivityStatistics,
  type BatchWriteOptions,
  type ActivityTrackingOptions,
} from './activity-types';

describe('ActivityType Enum', () => {
  it('should have AUTH_LOGIN', () => {
    expect(ActivityType.AUTH_LOGIN).toBe('auth_login');
  });

  it('should have AUTH_LOGOUT', () => {
    expect(ActivityType.AUTH_LOGOUT).toBe('auth_logout');
  });

  it('should have AUTH_REGISTER', () => {
    expect(ActivityType.AUTH_REGISTER).toBe('auth_register');
  });

  it('should have TASK_CREATE', () => {
    expect(ActivityType.TASK_CREATE).toBe('task_create');
  });

  it('should have TASK_UPDATE', () => {
    expect(ActivityType.TASK_UPDATE).toBe('task_update');
  });

  it('should have TASK_DELETE', () => {
    expect(ActivityType.TASK_DELETE).toBe('task_delete');
  });

  it('should have PROJECT_CREATE', () => {
    expect(ActivityType.PROJECT_CREATE).toBe('project_create');
  });

  it('should have USER_CREATE', () => {
    expect(ActivityType.USER_CREATE).toBe('user_create');
  });

  it('should have SECURITY_LOGIN_FAILED', () => {
    expect(ActivityType.SECURITY_LOGIN_FAILED).toBe('security_login_failed');
  });

  it('should have API_REQUEST', () => {
    expect(ActivityType.API_REQUEST).toBe('api_request');
  });

  it('should have all expected activity types', () => {
    const expectedTypes = [
      'auth_login',
      'auth_logout',
      'auth_register',
      'auth_password_change',
      'auth_password_reset',
      'auth_token_refresh',
      'task_create',
      'task_update',
      'task_delete',
      'task_complete',
      'task_reopen',
      'task_assign',
      'task_unassign',
      'task_comment',
      'task_attachment',
      'project_create',
      'project_update',
      'project_delete',
      'project_member_add',
      'project_member_remove',
      'project_member_role_change',
      'project_archive',
      'project_restore',
      'user_create',
      'user_update',
      'user_delete',
      'user_role_change',
      'user_permission_change',
      'user_deactivate',
      'user_reactivate',
      'file_upload',
      'file_download',
      'file_delete',
      'file_share',
      'file_unshare',
      'data_export',
      'data_import',
      'data_view',
      'data_bulk_delete',
      'system_settings_change',
      'system_backup',
      'system_restore',
      'system_upgrade',
      'security_login_failed',
      'security_suspicious_activity',
      'security_rate_limit_exceeded',
      'security_unauthorized_access',
      'api_request',
      'api_error',
      'api_rate_limit',
      'other',
    ];

    expectedTypes.forEach((type) => {
      expect(Object.values(ActivityType)).toContain(type);
    });
  });
});

describe('ActivityCategory Enum', () => {
  it('should have AUTHENTICATION', () => {
    expect(ActivityCategory.AUTHENTICATION).toBe('authentication');
  });

  it('should have TASKS', () => {
    expect(ActivityCategory.TASKS).toBe('tasks');
  });

  it('should have PROJECTS', () => {
    expect(ActivityCategory.PROJECTS).toBe('projects');
  });

  it('should have USERS', () => {
    expect(ActivityCategory.USERS).toBe('users');
  });

  it('should have FILES', () => {
    expect(ActivityCategory.FILES).toBe('files');
  });

  it('should have DATA', () => {
    expect(ActivityCategory.DATA).toBe('data');
  });

  it('should have SYSTEM', () => {
    expect(ActivityCategory.SYSTEM).toBe('system');
  });

  it('should have SECURITY', () => {
    expect(ActivityCategory.SECURITY).toBe('security');
  });

  it('should have API', () => {
    expect(ActivityCategory.API).toBe('api');
  });

  it('should have all expected categories', () => {
    const expectedCategories = [
      'authentication',
      'tasks',
      'projects',
      'users',
      'files',
      'data',
      'system',
      'security',
      'api',
    ];

    expectedCategories.forEach((category) => {
      expect(Object.values(ActivityCategory)).toContain(category);
    });
  });
});

describe('ActivityLogEntry Interface', () => {
  it('should create valid activity log entry', () => {
    const entry: ActivityLogEntry = {
      id: 'log-1',
      type: ActivityType.TASK_CREATE,
      category: ActivityCategory.TASKS,
      userId: 'user-123',
      userEmail: 'user@example.com',
      userName: 'John Doe',
      action: 'Created a new task',
      description: 'User created task "Fix bug"',
      metadata: { taskId: 'task-456', priority: 'high' },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      requestId: 'req-789',
      timestamp: new Date().toISOString(),
      severity: 'medium',
      status: 'success',
    };

    expect(entry.id).toBe('log-1');
    expect(entry.type).toBe(ActivityType.TASK_CREATE);
    expect(entry.category).toBe(ActivityCategory.TASKS);
    expect(entry.userId).toBe('user-123');
    expect(entry.severity).toBe('medium');
    expect(entry.status).toBe('success');
  });

  it('should support optional fields', () => {
    const entry: ActivityLogEntry = {
      id: 'log-1',
      type: ActivityType.AUTH_LOGIN,
      category: ActivityCategory.AUTHENTICATION,
      userId: 'user-123',
      action: 'User logged in',
      description: 'Login successful',
      timestamp: new Date().toISOString(),
      severity: 'low',
      status: 'success',
    };

    expect(entry.userEmail).toBeUndefined();
    expect(entry.userName).toBeUndefined();
    expect(entry.metadata).toBeUndefined();
    expect(entry.ipAddress).toBeUndefined();
  });

  it('should support all severity levels', () => {
    const severities: Array<ActivityLogEntry['severity']> = ['low', 'medium', 'high', 'critical'];
    
    severities.forEach((severity) => {
      const entry: ActivityLogEntry = {
        id: 'log-1',
        type: ActivityType.TASK_CREATE,
        category: ActivityCategory.TASKS,
        userId: 'user-123',
        action: 'action',
        description: 'description',
        timestamp: new Date().toISOString(),
        severity,
        status: 'success',
      };
      expect(entry.severity).toBe(severity);
    });
  });

  it('should support all status values', () => {
    const statuses: Array<ActivityLogEntry['status']> = ['success', 'failure', 'partial'];
    
    statuses.forEach((status) => {
      const entry: ActivityLogEntry = {
        id: 'log-1',
        type: ActivityType.TASK_CREATE,
        category: ActivityCategory.TASKS,
        userId: 'user-123',
        action: 'action',
        description: 'description',
        timestamp: new Date().toISOString(),
        severity: 'low',
        status,
      };
      expect(entry.status).toBe(status);
    });
  });
});

describe('ActivityFilters Interface', () => {
  it('should create filters with userId', () => {
    const filters: ActivityFilters = {
      userId: 'user-123',
    };
    expect(filters.userId).toBe('user-123');
  });

  it('should create filters with type and category', () => {
    const filters: ActivityFilters = {
      type: ActivityType.TASK_CREATE,
      category: ActivityCategory.TASKS,
    };
    expect(filters.type).toBe(ActivityType.TASK_CREATE);
    expect(filters.category).toBe(ActivityCategory.TASKS);
  });

  it('should create filters with date range', () => {
    const filters: ActivityFilters = {
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-12-31T23:59:59Z',
    };
    expect(filters.startDate).toBe('2024-01-01T00:00:00Z');
    expect(filters.endDate).toBe('2024-12-31T23:59:59Z');
  });

  it('should create filters with severity and status', () => {
    const filters: ActivityFilters = {
      severity: 'high',
      status: 'failure',
    };
    expect(filters.severity).toBe('high');
    expect(filters.status).toBe('failure');
  });

  it('should create filters with pagination', () => {
    const filters: ActivityFilters = {
      limit: 50,
      offset: 100,
    };
    expect(filters.limit).toBe(50);
    expect(filters.offset).toBe(100);
  });

  it('should create filters with all options', () => {
    const filters: ActivityFilters = {
      userId: 'user-123',
      type: ActivityType.AUTH_LOGIN,
      category: ActivityCategory.AUTHENTICATION,
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-12-31T23:59:59Z',
      severity: 'critical',
      status: 'success',
      limit: 50,
      offset: 0,
    };
    expect(Object.keys(filters).length).toBe(9);
  });
});

describe('ActivityStatistics Interface', () => {
  it('should create statistics with required fields', () => {
    const stats: ActivityStatistics = {
      period: 'day',
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-01-01T23:59:59Z',
      totalActivities: 150,
      activitiesByType: {},
      activitiesByCategory: {},
      activitiesByUser: [],
      activitiesByDay: [],
      successRate: 0.95,
      failureCount: 7,
      criticalActivities: 3,
    };

    expect(stats.period).toBe('day');
    expect(stats.totalActivities).toBe(150);
    expect(stats.successRate).toBe(0.95);
  });

  it('should support all period values', () => {
    const periods: Array<ActivityStatistics['period']> = ['day', 'week', 'month', 'year'];
    
    periods.forEach((period) => {
      const stats: ActivityStatistics = {
        period,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        totalActivities: 0,
        activitiesByType: {},
        activitiesByCategory: {},
        activitiesByUser: [],
        activitiesByDay: [],
        successRate: 0,
        failureCount: 0,
        criticalActivities: 0,
      };
      expect(stats.period).toBe(period);
    });
  });

  it('should track activities by type', () => {
    const stats: ActivityStatistics = {
      period: 'day',
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-01-01T23:59:59Z',
      totalActivities: 100,
      activitiesByType: {
        [ActivityType.TASK_CREATE]: 30,
        [ActivityType.TASK_UPDATE]: 25,
        [ActivityType.AUTH_LOGIN]: 45,
      },
      activitiesByCategory: {},
      activitiesByUser: [],
      activitiesByDay: [],
      successRate: 0.95,
      failureCount: 5,
      criticalActivities: 2,
    };

    expect(stats.activitiesByType[ActivityType.TASK_CREATE]).toBe(30);
    expect(stats.activitiesByType[ActivityType.AUTH_LOGIN]).toBe(45);
  });

  it('should track activities by user', () => {
    const stats: ActivityStatistics = {
      period: 'day',
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-01-01T23:59:59Z',
      totalActivities: 50,
      activitiesByType: {},
      activitiesByCategory: {},
      activitiesByUser: [
        { userId: 'user-1', userName: 'John', count: 30 },
        { userId: 'user-2', userName: 'Jane', count: 20 },
      ],
      activitiesByDay: [],
      successRate: 1,
      failureCount: 0,
      criticalActivities: 0,
    };

    expect(stats.activitiesByUser.length).toBe(2);
    expect(stats.activitiesByUser[0].count).toBe(30);
  });
});

describe('BatchWriteOptions Interface', () => {
  it('should create with default values', () => {
    const options: BatchWriteOptions = {};
    expect(options.batchSize).toBeUndefined();
    expect(options.flushInterval).toBeUndefined();
  });

  it('should create with custom batch size', () => {
    const options: BatchWriteOptions = {
      batchSize: 100,
    };
    expect(options.batchSize).toBe(100);
  });

  it('should create with custom flush interval', () => {
    const options: BatchWriteOptions = {
      flushInterval: 5000,
    };
    expect(options.flushInterval).toBe(5000);
  });

  it('should create with max retries', () => {
    const options: BatchWriteOptions = {
      maxRetries: 3,
    };
    expect(options.maxRetries).toBe(3);
  });

  it('should create with all options', () => {
    const options: BatchWriteOptions = {
      batchSize: 50,
      flushInterval: 3000,
      maxRetries: 5,
    };
    expect(options.batchSize).toBe(50);
    expect(options.flushInterval).toBe(3000);
    expect(options.maxRetries).toBe(5);
  });
});

describe('ActivityTrackingOptions Interface', () => {
  it('should create with default values', () => {
    const options: ActivityTrackingOptions = {};
    expect(options.trackApiRequests).toBeUndefined();
    expect(options.trackAuthentication).toBeUndefined();
  });

  it('should enable specific tracking options', () => {
    const options: ActivityTrackingOptions = {
      trackApiRequests: true,
      trackAuthentication: true,
      trackTaskOperations: true,
    };
    expect(options.trackApiRequests).toBe(true);
    expect(options.trackAuthentication).toBe(true);
    expect(options.trackTaskOperations).toBe(true);
  });

  it('should disable specific tracking options', () => {
    const options: ActivityTrackingOptions = {
      trackApiRequests: false,
      trackAuthentication: false,
    };
    expect(options.trackApiRequests).toBe(false);
    expect(options.trackAuthentication).toBe(false);
  });

  it('should support batch write options', () => {
    const options: ActivityTrackingOptions = {
      batchWrite: true,
      batchWriteOptions: {
        batchSize: 100,
        flushInterval: 5000,
        maxRetries: 3,
      },
    };
    expect(options.batchWrite).toBe(true);
    expect(options.batchWriteOptions?.batchSize).toBe(100);
  });

  it('should support exclusion lists', () => {
    const options: ActivityTrackingOptions = {
      excludePaths: ['/health', '/metrics'],
      excludeUsers: ['system-user', 'admin'],
    };
    expect(options.excludePaths).toEqual(['/health', '/metrics']);
    expect(options.excludeUsers).toEqual(['system-user', 'admin']);
  });

  it('should create with all tracking options', () => {
    const options: ActivityTrackingOptions = {
      trackApiRequests: true,
      trackAuthentication: true,
      trackTaskOperations: true,
      trackProjectOperations: true,
      trackUserManagement: true,
      trackFileOperations: true,
      trackDataAccess: true,
      trackSecurityEvents: true,
      batchWrite: true,
      batchWriteOptions: {
        batchSize: 50,
        flushInterval: 3000,
        maxRetries: 5,
      },
      excludePaths: ['/health'],
      excludeUsers: ['system'],
    };
    expect(Object.keys(options).length).toBe(12);
  });
});
