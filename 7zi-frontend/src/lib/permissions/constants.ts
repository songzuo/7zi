/**
 * Permission Constants - 权限常量定义
 */

import { ResourceType, ActionType, Permission } from './types'

/**
 * ==================== 系统权限定义 ====================
 */

export const SYSTEM_PERMISSIONS = [
  { id: 'user:read', name: '查看用户', description: '查看用户信息', resourceType: ResourceType.USER, actionType: ActionType.READ, isSystem: true },
  { id: 'user:create', name: '创建用户', description: '创建新用户', resourceType: ResourceType.USER, actionType: ActionType.CREATE, isSystem: true },
  { id: 'user:update', name: '更新用户', description: '更新用户信息', resourceType: ResourceType.USER, actionType: ActionType.UPDATE, isSystem: true },
  { id: 'user:delete', name: '删除用户', description: '删除用户', resourceType: ResourceType.USER, actionType: ActionType.DELETE, isSystem: true },
  { id: 'user:list', name: '列出用户', description: '列出所有用户', resourceType: ResourceType.USER, actionType: ActionType.LIST, isSystem: true },
  { id: 'team:create', name: '创建团队', description: '创建新团队', resourceType: ResourceType.TEAM, actionType: ActionType.CREATE, isSystem: true },
  { id: 'team:update', name: '更新团队', description: '更新团队信息', resourceType: ResourceType.TEAM, actionType: ActionType.UPDATE, isSystem: true },
  { id: 'team:delete', name: '删除团队', description: '删除团队', resourceType: ResourceType.TEAM, actionType: ActionType.DELETE, isSystem: true },
  { id: 'team:manage', name: '管理团队', description: '完全管理团队', resourceType: ResourceType.TEAM, actionType: ActionType.MANAGE, isSystem: true },
  { id: 'team:read', name: '读取团队', description: '读取团队信息', resourceType: ResourceType.TEAM, actionType: ActionType.READ, isSystem: true },
  { id: 'project:create', name: '创建项目', description: '创建新项目', resourceType: ResourceType.PROJECT, actionType: ActionType.CREATE, isSystem: true },
  { id: 'project:read', name: '读取项目', description: '读取项目信息', resourceType: ResourceType.PROJECT, actionType: ActionType.READ, isSystem: true },
  { id: 'project:update', name: '更新项目', description: '更新项目信息', resourceType: ResourceType.PROJECT, actionType: ActionType.UPDATE, isSystem: true },
  { id: 'project:delete', name: '删除项目', description: '删除项目', resourceType: ResourceType.PROJECT, actionType: ActionType.DELETE, isSystem: true },
  { id: 'data:export', name: '导出数据', description: '导出数据', resourceType: ResourceType.DATA, actionType: ActionType.EXPORT, isSystem: true },
  { id: 'data:import', name: '导入数据', description: '导入数据', resourceType: ResourceType.DATA, actionType: ActionType.IMPORT, isSystem: true },
  { id: 'system:config', name: '系统配置', description: '修改系统配置', resourceType: ResourceType.SYSTEM_CONFIG, actionType: ActionType.MANAGE, isSystem: true },
  { id: 'system:log', name: '系统日志', description: '查看系统日志', resourceType: ResourceType.SYSTEM_LOG, actionType: ActionType.READ, isSystem: true },
  { id: 'mcp:execute', name: '执行 MCP 工具', description: '执行 MCP 服务器工具', resourceType: ResourceType.MCP_TOOL, actionType: ActionType.EXECUTE, isSystem: true },
] as const

/**
 * ==================== 系统角色定义 ====================
 */

/**
 * 超级管理员角色 - 拥有所有权限
 */
export const SUPER_ADMIN_ROLE = {
  id: 'super_admin',
  name: '超级管理员',
  description: '拥有系统的所有权限',
  permissions: [
    'user:read', 'user:create', 'user:update', 'user:delete', 'user:list',
    'team:read', 'team:create', 'team:update', 'team:delete', 'team:manage',
    'project:create', 'project:read', 'project:update', 'project:delete',
    'data:export', 'data:import',
    'system:config', 'system:log',
    'mcp:execute',
  ] as Permission[],
  isSystem: true,
  level: 100,
}

/**
 * 管理员角色 - 拥有大部分管理权限
 */
export const ADMIN_ROLE = {
  id: 'admin',
  name: '管理员',
  description: '拥有大部分管理权限，但无法修改系统配置',
  permissions: [
    'user:read',
    'user:list',
    'user:update',
    'team:create',
    'team:update',
    'team:manage',
    'project:create',
    'project:update',
    'project:delete',
    'data:export',
    'system:log',
    'mcp:execute',
  ],
  isSystem: true,
  level: 80,
}

/**
 * 团队负责人角色 - 管理团队和项目
 */
export const TEAM_LEADER_ROLE = {
  id: 'team_leader',
  name: '团队负责人',
  description: '可以管理团队和项目',
  permissions: [
    'team:update',
    'team:manage',
    'project:create',
    'project:update',
    'project:delete',
    'data:export',
    'mcp:execute',
  ],
  isSystem: true,
  level: 60,
}

/**
 * 开发者角色 - 可以创建和编辑项目
 */
export const DEVELOPER_ROLE = {
  id: 'developer',
  name: '开发者',
  description: '可以查看项目',
  permissions: ['project:read', 'data:export', 'mcp:execute'],
  isSystem: true,
  level: 40,
}

/**
 * 普通用户角色 - 基本查看权限
 */
export const USER_ROLE = {
  id: 'user',
  name: '普通用户',
  description: '基本查看权限',
  permissions: ['user:read', 'project:read', 'team:read'],
  isSystem: true,
  level: 20,
}

/**
 * 访客角色 - 只读权限
 */
export const GUEST_ROLE = {
  id: 'guest',
  name: '访客',
  description: '只读权限',
  permissions: ['project:read'],
  isSystem: true,
  level: 10,
}

/**
 * 所有系统角色
 */
export const SYSTEM_ROLES = [
  SUPER_ADMIN_ROLE,
  ADMIN_ROLE,
  TEAM_LEADER_ROLE,
  DEVELOPER_ROLE,
  USER_ROLE,
  GUEST_ROLE,
]

/**
 * ==================== 权限快捷常量 ====================
 */

export const Permissions = {
  // 用户
  USER_READ: 'user:read' as Permission,
  USER_CREATE: 'user:create' as Permission,
  USER_UPDATE: 'user:update' as Permission,
  USER_DELETE: 'user:delete' as Permission,
  USER_LIST: 'user:list' as Permission,

  // 团队
  TEAM_CREATE: 'team:create' as Permission,
  TEAM_READ: 'team:read' as Permission,
  TEAM_UPDATE: 'team:update' as Permission,
  TEAM_DELETE: 'team:delete' as Permission,
  TEAM_MANAGE: 'team:manage' as Permission,

  // 项目
  PROJECT_CREATE: 'project:create' as Permission,
  PROJECT_READ: 'project:read' as Permission,
  PROJECT_UPDATE: 'project:update' as Permission,
  PROJECT_DELETE: 'project:delete' as Permission,

  // 数据
  DATA_EXPORT: 'data:export' as Permission,
  DATA_IMPORT: 'data:import' as Permission,

  // 系统
  SYSTEM_CONFIG: 'system:config' as Permission,
  SYSTEM_LOG: 'system:log' as Permission,

  // MCP
  MCP_EXECUTE: 'mcp:execute' as Permission,
}
