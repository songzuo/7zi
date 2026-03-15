/**
 * Activity Types Tests
 * 活动类型定义单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  getActivityTypeGroup,
  ACTIVITY_TYPES,
  type ActivityType,
  type ActivityTypeGroup,
} from '@/lib/activity/types';

describe('getActivityTypeGroup', () => {
  describe('任务相关类型', () => {
    it('应正确识别 task_created', () => {
      expect(getActivityTypeGroup('task_created')).toBe('task');
    });

    it('应正确识别 task_updated', () => {
      expect(getActivityTypeGroup('task_updated')).toBe('task');
    });

    it('应正确识别 task_deleted', () => {
      expect(getActivityTypeGroup('task_deleted')).toBe('task');
    });

    it('应正确识别 task_assigned', () => {
      expect(getActivityTypeGroup('task_assigned')).toBe('task');
    });

    it('应正确识别 task_completed', () => {
      expect(getActivityTypeGroup('task_completed')).toBe('task');
    });
  });

  describe('项目相关类型', () => {
    it('应正确识别 project_created', () => {
      expect(getActivityTypeGroup('project_created')).toBe('project');
    });

    it('应正确识别 project_updated', () => {
      expect(getActivityTypeGroup('project_updated')).toBe('project');
    });

    it('应正确识别 project_deleted', () => {
      expect(getActivityTypeGroup('project_deleted')).toBe('project');
    });
  });

  describe('通知相关类型', () => {
    it('应正确识别 notification_read', () => {
      expect(getActivityTypeGroup('notification_read')).toBe('notification');
    });

    it('应正确识别 notification_dismissed', () => {
      expect(getActivityTypeGroup('notification_dismissed')).toBe('notification');
    });

    it('应正确识别 notification_created', () => {
      expect(getActivityTypeGroup('notification_created')).toBe('notification');
    });
  });

  describe('知识图谱相关类型', () => {
    it('应正确识别 knowledge_node_created', () => {
      expect(getActivityTypeGroup('knowledge_node_created')).toBe('knowledge');
    });

    it('应正确识别 knowledge_node_updated', () => {
      expect(getActivityTypeGroup('knowledge_node_updated')).toBe('knowledge');
    });

    it('应正确识别 knowledge_node_deleted', () => {
      expect(getActivityTypeGroup('knowledge_node_deleted')).toBe('knowledge');
    });

    it('应正确识别 knowledge_edge_created', () => {
      expect(getActivityTypeGroup('knowledge_edge_created')).toBe('knowledge');
    });

    it('应正确识别 knowledge_edge_deleted', () => {
      expect(getActivityTypeGroup('knowledge_edge_deleted')).toBe('knowledge');
    });
  });

  describe('用户相关类型', () => {
    it('应正确识别 user_login', () => {
      expect(getActivityTypeGroup('user_login')).toBe('user');
    });

    it('应正确识别 user_logout', () => {
      expect(getActivityTypeGroup('user_logout')).toBe('user');
    });

    it('应正确识别 user_registered', () => {
      expect(getActivityTypeGroup('user_registered')).toBe('user');
    });

    it('应正确识别 user_updated', () => {
      expect(getActivityTypeGroup('user_updated')).toBe('user');
    });
  });

  describe('系统相关类型', () => {
    it('应正确识别 system_config_changed', () => {
      expect(getActivityTypeGroup('system_config_changed')).toBe('system');
    });

    it('应正确识别 api_key_created', () => {
      expect(getActivityTypeGroup('api_key_created')).toBe('system');
    });

    it('应正确识别 api_key_revoked', () => {
      expect(getActivityTypeGroup('api_key_revoked')).toBe('system');
    });
  });

  describe('自定义类型', () => {
    it('应将未知前缀归类为 custom', () => {
      expect(getActivityTypeGroup('custom_action')).toBe('custom');
    });

    it('应将任意字符串归类为 custom', () => {
      expect(getActivityTypeGroup('something_else')).toBe('custom');
    });
  });
});

describe('ACTIVITY_TYPES 常量', () => {
  it('应包含所有任务类型常量', () => {
    expect(ACTIVITY_TYPES.TASK_CREATED).toBe('task_created');
    expect(ACTIVITY_TYPES.TASK_UPDATED).toBe('task_updated');
    expect(ACTIVITY_TYPES.TASK_DELETED).toBe('task_deleted');
    expect(ACTIVITY_TYPES.TASK_ASSIGNED).toBe('task_assigned');
    expect(ACTIVITY_TYPES.TASK_COMPLETED).toBe('task_completed');
  });

  it('应包含所有项目类型常量', () => {
    expect(ACTIVITY_TYPES.PROJECT_CREATED).toBe('project_created');
    expect(ACTIVITY_TYPES.PROJECT_UPDATED).toBe('project_updated');
    expect(ACTIVITY_TYPES.PROJECT_DELETED).toBe('project_deleted');
  });

  it('应包含所有通知类型常量', () => {
    expect(ACTIVITY_TYPES.NOTIFICATION_READ).toBe('notification_read');
    expect(ACTIVITY_TYPES.NOTIFICATION_DISMISSED).toBe('notification_dismissed');
    expect(ACTIVITY_TYPES.NOTIFICATION_CREATED).toBe('notification_created');
  });

  it('应包含所有知识图谱类型常量', () => {
    expect(ACTIVITY_TYPES.KNOWLEDGE_NODE_CREATED).toBe('knowledge_node_created');
    expect(ACTIVITY_TYPES.KNOWLEDGE_NODE_UPDATED).toBe('knowledge_node_updated');
    expect(ACTIVITY_TYPES.KNOWLEDGE_NODE_DELETED).toBe('knowledge_node_deleted');
    expect(ACTIVITY_TYPES.KNOWLEDGE_EDGE_CREATED).toBe('knowledge_edge_created');
    expect(ACTIVITY_TYPES.KNOWLEDGE_EDGE_DELETED).toBe('knowledge_edge_deleted');
  });

  it('应包含所有用户类型常量', () => {
    expect(ACTIVITY_TYPES.USER_LOGIN).toBe('user_login');
    expect(ACTIVITY_TYPES.USER_LOGOUT).toBe('user_logout');
    expect(ACTIVITY_TYPES.USER_REGISTERED).toBe('user_registered');
    expect(ACTIVITY_TYPES.USER_UPDATED).toBe('user_updated');
  });

  it('应包含所有系统类型常量', () => {
    expect(ACTIVITY_TYPES.SYSTEM_CONFIG_CHANGED).toBe('system_config_changed');
    expect(ACTIVITY_TYPES.API_KEY_CREATED).toBe('api_key_created');
    expect(ACTIVITY_TYPES.API_KEY_REVOKED).toBe('api_key_revoked');
  });
});

describe('类型兼容性', () => {
  it('ActivityType 应接受预定义类型', () => {
    const taskType: ActivityType = ACTIVITY_TYPES.TASK_CREATED;
    expect(taskType).toBe('task_created');
  });

  it('ActivityType 应接受自定义字符串', () => {
    const customType: ActivityType = 'my_custom_activity';
    expect(customType).toBe('my_custom_activity');
  });

  it('ActivityTypeGroup 应返回正确的分组值', () => {
    const group: ActivityTypeGroup = getActivityTypeGroup('task_created');
    expect(['task', 'project', 'notification', 'knowledge', 'user', 'system', 'custom']).toContain(group);
  });
});
