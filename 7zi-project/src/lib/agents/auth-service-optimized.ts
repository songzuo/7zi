/**
 * 智能体认证服务 - 优化版本
 * Agent Authentication Service - Optimized Version
 *
 * 优化点:
 * 1. 修复 N+1 查询问题：使用 SQL 直接查询，避免遍历所有智能体
 * 2. 添加 api_key 索引支持
 * 3. 优化认证流程，减少数据库往返
 */

import * as crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import {
  Agent,
  AgentToken,
  AgentAuthRequest,
  AgentRegisterRequest,
  AgentStatus,
  AgentRole,
  AgentProvider,
  AgentType,
} from './types';
import {
  createAgent,
  getAgentById,
  initializeAgentTables,
  mapRowToAgent,
} from './repository-optimized';
import { createWallet } from './wallet-repository';
import { getDatabaseAsync } from '../db';

/**
 * 获取 JWT 密钥
 * @throws {Error} If JWT_SECRET or AGENT_ENCRYPTION_SECRET is not set
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.AGENT_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET or AGENT_ENCRYPTION_SECRET environment variable is required');
  }
  return secret;
}

/**
 * 生成 API Key
 */
export function generateApiKey(): string {
  const prefix = 'sk_agent_';
  const randomBytes = crypto.randomBytes(32).toString('base64url');
  return `${prefix}${randomBytes}`;
}

/**
 * 哈希 API Key
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * 验证 API Key 格式
 */
export function validateApiKeyFormat(apiKey: string): boolean {
  return /^sk_agent_[A-Za-z0-9_-]{43}$/.test(apiKey);
}

/**
 * 注册新智能体
 */
export async function registerAgent(request: AgentRegisterRequest): Promise<{ agent: Agent; plainApiKey: string }> {
  await initializeAgentTables();

  // 生成 API Key
  const plainApiKey = generateApiKey();
  const hashedApiKey = hashApiKey(plainApiKey);

  // 创建智能体
  const agent = await createAgent({
    name: request.name,
    type: request.type || AgentType.WORKER,
    role: request.role || AgentRole.EXECUTOR,
    provider: request.provider || AgentProvider.MINIMAX,
    apiKey: hashedApiKey,
    permissions: request.permissions || getDefaultPermissions(request.role || AgentRole.EXECUTOR),
    metadata: request.metadata,
  });

  // 创建钱包
  await createWallet(agent.id);

  return {
    agent,
    plainApiKey, // 仅在创建时返回明文
  };
}

/**
 * 智能体认证 - 优化版本（修复 N+1 查询）
 *
 * 优化前: 1 + N 次查询（1次获取所有智能体 + N次验证 API Key）
 * 优化后: 1 次查询（直接查询匹配的智能体）
 * 性能提升: 90%+（取决于智能体数量）
 */
export async function authenticateAgent(request: AgentAuthRequest): Promise<{ agent: Agent; token: AgentToken } | null> {
  await initializeAgentTables();

  const hashedApiKey = hashApiKey(request.apiKey);

  // 优化: 使用 SQL 直接查询，避免遍历所有智能体
  const db = await getDatabaseAsync();
  const stmt = db.prepare(`
    SELECT * FROM agents
    WHERE api_key = ?
    AND status NOT IN ('inactive', 'offline')
    LIMIT 1
  `);

  const row = stmt.get(hashedApiKey) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  // 映射到 Agent 对象
  const agent = mapRowToAgent(row);

  // 生成 JWT Token
  const token = await generateAgentToken(agent);

  // 更新状态为活跃
  if (agent.status !== AgentStatus.ACTIVE) {
    const updateStmt = db.prepare('UPDATE agents SET status = ?, updated_at = ? WHERE id = ?');
    updateStmt.run(AgentStatus.ACTIVE, new Date().toISOString(), agent.id);
    agent.status = AgentStatus.ACTIVE;
  }

  return { agent, token };
}

/**
 * 生成智能体 JWT Token
 */
export async function generateAgentToken(agent: Agent): Promise<AgentToken> {
  const secret = new TextEncoder().encode(getJwtSecret());
  const expiresIn = 3600; // 1 小时

  const token = await new SignJWT({
    sub: agent.id,
    role: agent.role,
    permissions: agent.permissions,
    type: 'agent',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .setIssuer('7zi-agent-api')
    .setAudience('7zi-agents')
    .sign(secret);

  const refreshToken = await new SignJWT({
    sub: agent.id,
    type: 'agent_refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + 86400 * 7) // 7 天
    .setIssuer('7zi-agent-api')
    .setAudience('7zi-agents')
    .sign(secret);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresIn * 1000);
  const refreshExpiresAt = new Date(now.getTime() + 86400 * 7 * 1000);

  return {
    id: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    agentId: agent.id,
    token,
    refreshToken,
    expiresAt,
    refreshExpiresAt,
    scopes: agent.permissions,
    createdAt: now,
  };
}

/**
 * 验证智能体 Token
 */
export async function verifyAgentToken(token: string): Promise<{ agentId: string; role: string; permissions: string[] } | null> {
  try {
    const secret = new TextEncoder().encode(getJwtSecret());
    const { payload } = await jwtVerify(token, secret, {
      issuer: '7zi-agent-api',
      audience: '7zi-agents',
    });

    if (payload.type !== 'agent') {
      return null;
    }

    return {
      agentId: payload.sub as string,
      role: payload.role as string,
      permissions: payload.permissions as string[] || [],
    };
  } catch {
    return null;
  }
}

/**
 * 刷新 Token
 */
export async function refreshAgentToken(refreshToken: string): Promise<AgentToken | null> {
  try {
    const secret = new TextEncoder().encode(getJwtSecret());
    const { payload } = await jwtVerify(refreshToken, secret, {
      issuer: '7zi-agent-api',
      audience: '7zi-agents',
    });

    if (payload.type !== 'agent_refresh') {
      return null;
    }

    const agent = await getAgentById(payload.sub as string);
    if (!agent || agent.status === AgentStatus.INACTIVE) {
      return null;
    }

    return generateAgentToken(agent);
  } catch {
    return null;
  }
}

/**
 * 获取默认权限
 */
function getDefaultPermissions(role: AgentRole): string[] {
  const basePermissions = ['read:tasks', 'read:users', 'read:activities'];

  switch (role) {
    case AgentRole.DIRECTOR:
      return [
        ...basePermissions,
        'write:tasks',
        'write:users',
        'delete:tasks',
        'manage:team',
        'manage:wallet',
        'approve:tasks',
        'access:reports',
      ];

    case AgentRole.EXECUTOR:
      return [
        ...basePermissions,
        'write:tasks',
        'update:tasks',
        'complete:tasks',
      ];

    case AgentRole.ADMIN:
      return [
        ...basePermissions,
        'write:tasks',
        'write:users',
        'delete:tasks',
        'delete:users',
        'manage:system',
        'manage:deploy',
        'access:logs',
      ];

    case AgentRole.ARCHITECT:
    case AgentRole.DESIGNER:
      return [
        ...basePermissions,
        'write:tasks',
        'update:tasks',
        'access:design',
      ];

    case AgentRole.TESTER:
      return [
        ...basePermissions,
        'write:tests',
        'access:reports',
        'access:logs',
      ];

    case AgentRole.FINANCE:
      return [
        ...basePermissions,
        'manage:wallet',
        'access:reports',
        'access:transactions',
      ];

    default:
      return basePermissions;
  }
}

/**
 * 验证权限
 */
export function hasPermission(permissions: string[], requiredPermission: string): boolean {
  // 检查精确匹配
  if (permissions.includes(requiredPermission)) {
    return true;
  }

  // 检查通配符权限 (如 manage:* 表示所有管理权限)
  const [action, resource] = requiredPermission.split(':');
  if (permissions.includes(`${action}:*`) || permissions.includes(`*:${resource}`) || permissions.includes('*:*')) {
    return true;
  }

  return false;
}

/**
 * 检查多个权限
 */
export function hasAnyPermission(permissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.some((p) => hasPermission(permissions, p));
}

export function hasAllPermissions(permissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.every((p) => hasPermission(permissions, p));
}
