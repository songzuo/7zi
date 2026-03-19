/**
 * 智能体数据仓库
 * Agent Repository - Database operations for agents
 */

import { getDatabaseAsync } from '../db';
import { buildWhereQuery } from '../db/query-builder';
import { generateId as generateIdUtil } from '../utils';
import {
  Agent,
  AgentStatus,
  AgentType,
  AgentProvider,
  AgentToken,
  AgentDataAccess,
  CreateAgentRequest,
  UpdateAgentRequest,
} from './types';
import * as crypto from 'crypto';

/**
 * 加密 API Key
 */
function encryptApiKey(apiKey: string, secret: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(secret, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * 解密 API Key
 */
function decryptApiKey(encryptedKey: string, secret: string): string {
  const [ivHex, encrypted] = encryptedKey.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(secret, 'salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * 获取加密密钥
 */
function getEncryptionSecret(): string {
  const secret = process.env.AGENT_ENCRYPTION_SECRET || process.env.JWT_SECRET || 'default-agent-secret-key';
  if (secret.length < 32) {
    return secret.padEnd(32, '0');
  }
  return secret;
}

/**
 * 生成安全的令牌
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 初始化智能体表 - Optimized with better indexes
 */
export async function initializeAgentTables(): Promise<void> {
  const db = await getDatabaseAsync();

  const schema = `
    -- 智能体表
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL DEFAULT 'worker',
      provider TEXT NOT NULL DEFAULT 'custom',
      model TEXT,
      api_key TEXT,
      webhook_url TEXT,
      status TEXT NOT NULL DEFAULT 'inactive',
      permissions TEXT DEFAULT '[]',
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_active_at TEXT
    );

    -- 智能体令牌表
    CREATE TABLE IF NOT EXISTS agent_tokens (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      refresh_token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      refresh_expires_at TEXT NOT NULL,
      scopes TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      last_used_at TEXT,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    -- 智能体数据访问记录表
    CREATE TABLE IF NOT EXISTS agent_data_access (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      action TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    -- Optimized indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
    CREATE INDEX IF NOT EXISTS idx_agents_provider ON agents(provider);
    CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
    CREATE INDEX IF NOT EXISTS idx_agents_last_active ON agents(last_active_at DESC);
    
    -- Composite index for common queries
    CREATE INDEX IF NOT EXISTS idx_agents_status_provider ON agents(status, provider);
    
    -- Token indexes
    CREATE INDEX IF NOT EXISTS idx_agent_tokens_agent_id ON agent_tokens(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_tokens_token ON agent_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_agent_tokens_expires ON agent_tokens(expires_at);
    
    -- Data access indexes with composite for common query patterns
    CREATE INDEX IF NOT EXISTS idx_agent_data_access_agent_id ON agent_data_access(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_data_access_timestamp ON agent_data_access(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_agent_data_access_agent_timestamp ON agent_data_access(agent_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_agent_data_access_resource ON agent_data_access(resource_type, resource_id);
  `;

  try {
    db.exec(schema);
  } catch (error) {
    if (!(error instanceof Error && error.message.includes('already exists'))) {
      throw error;
    }
  }
}

/**
 * 创建智能体
 */
export async function createAgent(data: CreateAgentRequest & { apiKey?: string }): Promise<Agent> {
  const db = await getDatabaseAsync();
  await initializeAgentTables();

  const id = generateIdUtil('agent');
  const now = new Date().toISOString();

  // 加密 API Key
  const encryptedApiKey = data.apiKey ? encryptApiKey(data.apiKey, getEncryptionSecret()) : null;

  const stmt = db.prepare(`
    INSERT INTO agents (id, name, description, type, provider, model, api_key, webhook_url, status, permissions, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.name,
    data.description || null,
    data.type,
    data.provider,
    data.model || null,
    encryptedApiKey,
    data.webhookUrl || null,
    AgentStatus.INACTIVE,
    JSON.stringify(data.permissions || []),
    JSON.stringify(data.metadata || {}),
    now,
    now
  );

  return {
    id,
    name: data.name,
    description: data.description,
    type: data.type,
    provider: data.provider,
    model: data.model,
    webhookUrl: data.webhookUrl,
    status: AgentStatus.INACTIVE,
    permissions: data.permissions || [],
    metadata: data.metadata || {},
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

/**
 * 根据 ID 获取智能体
 */
export async function getAgentById(id: string): Promise<Agent | null> {
  const db = await getDatabaseAsync();
  await initializeAgentTables();

  const stmt = db.prepare('SELECT * FROM agents WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return mapRowToAgent(row);
}

/**
 * 获取所有智能体 - 优化索引查询
 *
 * 优化点:
 * 1. 使用 buildWhereQuery 统一查询构建逻辑
 * 2. 避免不必要的字符串拼接
 * 3. 利用已有的复合索引
 * 4. 保持向后兼容性
 */
export async function getAllAgents(options?: {
  status?: AgentStatus;
  type?: AgentType;
  provider?: AgentProvider;
  limit?: number;
  offset?: number;
}): Promise<Agent[]> {
  const db = await getDatabaseAsync();
  await initializeAgentTables();

  // 构建过滤器 - 按照索引顺序添加条件（status, provider, type 有复合索引）
  const filters: Record<string, unknown> = {};
  if (options?.status) filters.status = options.status;
  if (options?.provider) filters.provider = options.provider;
  if (options?.type) filters.type = options.type;

  // 使用 query-builder 构建查询
  const { sql, params } = buildWhereQuery('agents', filters, {
    orderBy: 'created_at',
    sortOrder: 'DESC',
    limit: options?.limit,
    offset: options?.offset,
  });

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as Record<string, unknown>[];

  return rows.map(mapRowToAgent);
}

/**
 * 更新智能体
 */
export async function updateAgent(id: string, data: UpdateAgentRequest & { apiKey?: string }): Promise<Agent | null> {
  const db = await getDatabaseAsync();
  await initializeAgentTables();

  const agent = await getAgentById(id);
  if (!agent) return null;

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    values.push(data.description);
  }
  if (data.type !== undefined) {
    updates.push('type = ?');
    values.push(data.type);
  }
  if (data.provider !== undefined) {
    updates.push('provider = ?');
    values.push(data.provider);
  }
  if (data.model !== undefined) {
    updates.push('model = ?');
    values.push(data.model);
  }
  if (data.apiKey !== undefined) {
    updates.push('api_key = ?');
    values.push(data.apiKey ? encryptApiKey(data.apiKey, getEncryptionSecret()) : null);
  }
  if (data.webhookUrl !== undefined) {
    updates.push('webhook_url = ?');
    values.push(data.webhookUrl);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }
  if (data.permissions !== undefined) {
    updates.push('permissions = ?');
    values.push(JSON.stringify(data.permissions));
  }
  if (data.metadata !== undefined) {
    updates.push('metadata = ?');
    values.push(JSON.stringify(data.metadata));
  }

  if (updates.length === 0) return agent;

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  const stmt = db.prepare(`UPDATE agents SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getAgentById(id);
}

/**
 * 删除智能体
 */
export async function deleteAgent(id: string): Promise<boolean> {
  const db = await getDatabaseAsync();
  await initializeAgentTables();

  const stmt = db.prepare('DELETE FROM agents WHERE id = ?');
  const result = stmt.run(id);

  return (result.changes ?? 0) > 0;
}

/**
 * 验证智能体 API Key
 */
export async function validateAgentApiKey(agentId: string, apiKey: string): Promise<Agent | null> {
  const db = await getDatabaseAsync();
  await initializeAgentTables();

  const stmt = db.prepare('SELECT * FROM agents WHERE id = ?');
  const row = stmt.get(agentId) as Record<string, unknown> | undefined;

  if (!row || !row.api_key) return null;

  try {
    const decryptedKey = decryptApiKey(row.api_key as string, getEncryptionSecret());
    if (decryptedKey === apiKey) {
      return mapRowToAgent(row);
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * 创建智能体令牌
 */
export async function createAgentToken(
  agentId: string,
  scopes: string[] = [],
  expiresInDays: number = 30
): Promise<AgentToken> {
  const db = await getDatabaseAsync();
  await initializeAgentTables();

  const id = generateIdUtil('token');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
  const refreshExpiresAt = new Date(now.getTime() + (expiresInDays * 2) * 24 * 60 * 60 * 1000);

  const token = generateSecureToken();
  const refreshToken = generateSecureToken();

  const stmt = db.prepare(`
    INSERT INTO agent_tokens (id, agent_id, token, refresh_token, expires_at, refresh_expires_at, scopes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    agentId,
    token,
    refreshToken,
    expiresAt.toISOString(),
    refreshExpiresAt.toISOString(),
    JSON.stringify(scopes),
    now.toISOString()
  );

  return {
    id,
    agentId,
    token,
    refreshToken,
    expiresAt,
    refreshExpiresAt,
    scopes,
    createdAt: now,
  };
}

/**
 * 验证智能体令牌
 */
export async function validateAgentToken(token: string): Promise<{ agent: Agent; token: AgentToken } | null> {
  const db = await getDatabaseAsync();
  await initializeAgentTables();

  const stmt = db.prepare('SELECT * FROM agent_tokens WHERE token = ?');
  const row = stmt.get(token) as Record<string, unknown> | undefined;

  if (!row) return null;

  const expiresAt = new Date(row.expires_at as string);
  if (expiresAt < new Date()) return null;

  // 更新最后使用时间
  const updateStmt = db.prepare('UPDATE agent_tokens SET last_used_at = ? WHERE id = ?');
  updateStmt.run(new Date().toISOString(), row.id);

  const agent = await getAgentById(row.agent_id as string);
  if (!agent) return null;

  return {
    agent,
    token: {
      id: row.id as string,
      agentId: row.agent_id as string,
      token: row.token as string,
      refreshToken: row.refresh_token as string,
      expiresAt,
      refreshExpiresAt: new Date(row.refresh_expires_at as string),
      scopes: JSON.parse(row.scopes as string || '[]'),
      createdAt: new Date(row.created_at as string),
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at as string) : undefined,
    },
  };
}

/**
 * 刷新令牌
 */
export async function refreshAgentToken(refreshToken: string): Promise<AgentToken | null> {
  const db = await getDatabaseAsync();
  await initializeAgentTables();

  const stmt = db.prepare('SELECT * FROM agent_tokens WHERE refresh_token = ?');
  const row = stmt.get(refreshToken) as Record<string, unknown> | undefined;

  if (!row) return null;

  const refreshExpiresAt = new Date(row.refresh_expires_at as string);
  if (refreshExpiresAt < new Date()) return null;

  // 创建新令牌
  const newToken = await createAgentToken(row.agent_id as string, JSON.parse(row.scopes as string || '[]'));

  // 删除旧令牌
  const deleteStmt = db.prepare('DELETE FROM agent_tokens WHERE id = ?');
  deleteStmt.run(row.id);

  return newToken;
}

/**
 * 撤销令牌
 */
export async function revokeAgentToken(token: string): Promise<boolean> {
  const db = await getDatabaseAsync();
  await initializeAgentTables();

  const stmt = db.prepare('DELETE FROM agent_tokens WHERE token = ?');
  const result = stmt.run(token);

  return (result.changes ?? 0) > 0;
}

/**
 * 记录数据访问
 */
export async function logDataAccess(
  agentId: string,
  resourceType: string,
  resourceId: string,
  action: 'read' | 'write' | 'delete',
  metadata?: Record<string, unknown>
): Promise<AgentDataAccess> {
  const db = await getDatabaseAsync();
  await initializeAgentTables();

  const id = generateIdUtil('access');
  const now = new Date();

  const stmt = db.prepare(`
    INSERT INTO agent_data_access (id, agent_id, resource_type, resource_id, action, timestamp, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, agentId, resourceType, resourceId, action, now.toISOString(), JSON.stringify(metadata || {}));

  // 更新智能体最后活跃时间
  const updateStmt = db.prepare('UPDATE agents SET last_active_at = ? WHERE id = ?');
  updateStmt.run(now.toISOString(), agentId);

  return {
    id,
    agentId,
    resourceType,
    resourceId,
    action,
    timestamp: now,
    metadata,
  };
}

/**
 * 获取智能体数据访问记录
 */
export async function getAgentDataAccessLog(
  agentId: string,
  options?: {
    resourceType?: string;
    action?: 'read' | 'write' | 'delete';
    limit?: number;
    offset?: number;
  }
): Promise<AgentDataAccess[]> {
  const db = await getDatabaseAsync();
  await initializeAgentTables();

  let sql = 'SELECT * FROM agent_data_access WHERE agent_id = ?';
  const params: (string | number)[] = [agentId];

  if (options?.resourceType) {
    sql += ' AND resource_type = ?';
    params.push(options.resourceType);
  }
  if (options?.action) {
    sql += ' AND action = ?';
    params.push(options.action);
  }

  sql += ' ORDER BY timestamp DESC';

  if (options?.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }
  if (options?.offset) {
    sql += ' OFFSET ?';
    params.push(options.offset);
  }

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as string,
    agentId: row.agent_id as string,
    resourceType: row.resource_type as string,
    resourceId: row.resource_id as string,
    action: row.action as 'read' | 'write' | 'delete',
    timestamp: new Date(row.timestamp as string),
    metadata: JSON.parse(row.metadata as string || '{}'),
  }));
}

/**
 * 映射数据库行到 Agent 对象
 */
function mapRowToAgent(row: Record<string, unknown>): Agent {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    type: row.type as AgentType,
    provider: row.provider as AgentProvider,
    model: row.model as string | undefined,
    webhookUrl: row.webhook_url as string | undefined,
    status: row.status as AgentStatus,
    permissions: JSON.parse(row.permissions as string || '[]'),
    metadata: JSON.parse(row.metadata as string || '{}'),
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    lastActiveAt: row.last_active_at ? new Date(row.last_active_at as string) : undefined,
  };
}

/**
 * 更新智能体状态
 */
export async function updateAgentStatus(id: string, status: AgentStatus): Promise<Agent | null> {
  return updateAgent(id, { status });
}

/**
 * 更新智能体最后活跃时间
 */
export async function updateAgentLastActive(id: string): Promise<void> {
  const db = await getDatabaseAsync();
  await initializeAgentTables();

  const stmt = db.prepare('UPDATE agents SET last_active_at = ? WHERE id = ?');
  stmt.run(new Date().toISOString(), id);
}

/**
 * 获取智能体统计信息 - Optimized to avoid N+1 queries
 */
export async function getAgentStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
  busy: number;
  offline: number;
  byProvider: Record<string, number>;
  byType: Record<string, number>;
}> {
  const db = await getDatabaseAsync();
  await initializeAgentTables();

  // Single query for status counts using GROUP BY
  const statusStmt = db.prepare(`
    SELECT status, COUNT(*) as count 
    FROM agents 
    GROUP BY status
  `);
  const statusRows = statusStmt.all() as Array<{ status: string; count: number }>;

  const statusCounts = statusRows.reduce(
    (acc, { status, count }) => ({ ...acc, [status]: count }),
    {} as Record<string, number>
  );

  // Single query for provider distribution
  const providerStmt = db.prepare(`
    SELECT provider, COUNT(*) as count 
    FROM agents 
    GROUP BY provider
  `);
  const providerRows = providerStmt.all() as Array<{ provider: string; count: number }>;

  const byProvider = providerRows.reduce(
    (acc, { provider, count }) => ({ ...acc, [provider]: count }),
    {} as Record<string, number>
  );

  // Single query for type distribution
  const typeStmt = db.prepare(`
    SELECT type, COUNT(*) as count 
    FROM agents 
    GROUP BY type
  `);
  const typeRows = typeStmt.all() as Array<{ type: string; count: number }>;

  const byType = typeRows.reduce(
    (acc, { type, count }) => ({ ...acc, [type]: count }),
    {} as Record<string, number>
  );

  const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

  return {
    total,
    active: statusCounts[AgentStatus.ACTIVE] || 0,
    inactive: statusCounts[AgentStatus.INACTIVE] || 0,
    busy: statusCounts[AgentStatus.BUSY] || 0,
    offline: statusCounts[AgentStatus.OFFLINE] || 0,
    byProvider,
    byType,
  };
}