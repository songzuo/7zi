/**
 * 优化的智能体数据仓库
 * Optimized Agent Repository with caching and N+1 query fixes
 */

import { getDatabaseAsync } from '../../db';
import {
  Agent,
  AgentStatus,
  AgentType,
  AgentProvider,
  AgentToken,
  CreateAgentRequest,
  UpdateAgentRequest,
} from './types';
import { cachedQuery, CacheKeyGenerator, CacheInvalidator } from '../../db/cache';
import {
  encryptApiKey,
  getEncryptionSecret,
} from '../../crypto';
import { generateId } from '../../utils';

/**
 * 初始化智能体表
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
    CREATE INDEX IF NOT EXISTS idx_agents_status_type ON agents(status, type);
    CREATE INDEX IF NOT EXISTS idx_agents_type_provider ON agents(type, provider);
    
    -- Token indexes
    CREATE INDEX IF NOT EXISTS idx_agent_tokens_agent_id ON agent_tokens(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_tokens_token ON agent_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_agent_tokens_expires ON agent_tokens(expires_at);
    CREATE INDEX IF NOT EXISTS idx_agent_tokens_agent_expires ON agent_tokens(agent_id, expires_at);
    
    -- Data access indexes with composite for common query patterns
    CREATE INDEX IF NOT EXISTS idx_agent_data_access_agent_id ON agent_data_access(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_data_access_timestamp ON agent_data_access(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_agent_data_access_agent_timestamp ON agent_data_access(agent_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_agent_data_access_resource ON agent_data_access(resource_type, resource_id);
    CREATE INDEX IF NOT EXISTS idx_agent_data_access_action ON agent_data_access(action);
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
 * 创建智能体 - with cache invalidation
 */
export async function createAgent(data: CreateAgentRequest & { apiKey?: string }): Promise<Agent> {
  const db = await getDatabaseAsync();
  await initializeAgentTables();

  const id = generateId('agent');
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

  // 失效相关缓存
  CacheInvalidator.invalidateAgent(id);
  CacheInvalidator.invalidateAgent('');

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
    apiKey: data.apiKey || '',
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

/**
 * 根据 ID 获取智能体 - with caching
 */
export async function getAgentById(id: string): Promise<Agent | null> {
  return cachedQuery(
    CacheKeyGenerator.agentKey(id),
    async () => {
      const db = await getDatabaseAsync();
      await initializeAgentTables();

      const stmt = db.prepare('SELECT * FROM agents WHERE id = ?');
      const row = stmt.get(id) as Record<string, unknown> | undefined;

      if (!row) return null;

      return mapRowToAgent(row);
    },
    5 * 60 * 1000 // 5分钟缓存
  );
}

/**
 * 获取所有智能体 - with caching
 */
export async function getAllAgents(options?: {
  status?: AgentStatus;
  type?: AgentType;
  provider?: AgentProvider;
}): Promise<Agent[]> {
  const cacheKey = CacheKeyGenerator.agentsListKey(options);

  return cachedQuery(
    cacheKey,
    async () => {
      const db = await getDatabaseAsync();
      await initializeAgentTables();

      let sql = 'SELECT * FROM agents';
      const conditions: string[] = [];
      const params: string[] = [];

      if (options?.status) {
        conditions.push('status = ?');
        params.push(options.status);
      }
      if (options?.type) {
        conditions.push('type = ?');
        params.push(options.type);
      }
      if (options?.provider) {
        conditions.push('provider = ?');
        params.push(options.provider);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY created_at DESC';

      const stmt = db.prepare(sql);
      const rows = stmt.all(...params) as unknown as Record<string, unknown>[];

      return rows.map(mapRowToAgent);
    },
    3 * 60 * 1000 // 3分钟缓存
  );
}

/**
 * 批量获取智能体 - OPTIMIZED: Batch query first, then apply cache
 */
export async function getAgentsByIds(ids: string[]): Promise<Agent[]> {
  if (ids.length === 0) return [];

  // Single batch query with IN clause - avoids N individual queries
  const db = await getDatabaseAsync();
  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`SELECT * FROM agents WHERE id IN (${placeholders})`);
  const rows = stmt.all(...ids) as unknown as Record<string, unknown>[];

  return rows.map(mapRowToAgent);
}

/**
 * 获取智能体及其令牌 - 优化N+1查询（单次查询）
 */
export async function getAgentWithTokens(agentId: string): Promise<{
  agent: Agent | null;
  tokens: AgentToken[];
}> {
  const db = await getDatabaseAsync();
  await initializeAgentTables();

  // 使用LEFT JOIN单次查询获取智能体和令牌
  const stmt = db.prepare(`
    SELECT
      a.*,
      t.id as token_id,
      t.token as token_token,
      t.refresh_token as token_refresh_token,
      t.expires_at as token_expires_at,
      t.refresh_expires_at as token_refresh_expires_at,
      t.scopes as token_scopes,
      t.created_at as token_created_at,
      t.last_used_at as token_last_used_at
    FROM agents a
    LEFT JOIN agent_tokens t ON a.id = t.agent_id
    WHERE a.id = ?
    ORDER BY t.created_at DESC
  `);

  const rows = stmt.all(agentId) as Array<Record<string, unknown>>;

  if (rows.length === 0) {
    return { agent: null, tokens: [] };
  }

  // 解析智能体数据（只从第一行）
  const agent = mapRowToAgent(rows[0]);

  // 解析令牌数据
  const tokens: AgentToken[] = rows
    .filter(row => row.token_id)
    .map(row => ({
      id: row.token_id as string,
      agentId: agent.id,
      token: row.token_token as string,
      refreshToken: row.token_refresh_token as string,
      expiresAt: new Date(row.token_expires_at as string),
      refreshExpiresAt: new Date(row.token_refresh_expires_at as string),
      scopes: JSON.parse(row.token_scopes as string || '[]'),
      createdAt: new Date(row.token_created_at as string),
      lastUsedAt: row.token_last_used_at ? new Date(row.token_last_used_at as string) : undefined,
    }));

  return { agent, tokens };
}

/**
 * 更新智能体 - with cache invalidation
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

  // 失效相关缓存
  CacheInvalidator.invalidateAgent(id);
  CacheInvalidator.invalidateAgent('');

  return getAgentById(id);
}

/**
 * 删除智能体 - with cache invalidation
 */
export async function deleteAgent(id: string): Promise<boolean> {
  const db = await getDatabaseAsync();
  await initializeAgentTables();

  const stmt = db.prepare('DELETE FROM agents WHERE id = ?');
  const result = stmt.run(id);

  const deleted = (result.changes ?? 0) > 0;

  if (deleted) {
    // 失效相关缓存
    CacheInvalidator.invalidateAgent(id);
    CacheInvalidator.invalidateAgent('');
  }

  return deleted;
}

/**
 * 获取智能体统计信息 - with caching
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
  return cachedQuery(
    CacheKeyGenerator.agentStatsKey(),
    async () => {
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
    },
    5 * 60 * 1000 // 5分钟缓存
  );
}

/**
 * 获取智能体列表及其钱包 - 优化N+1查询
 */
export async function getAgentsWithWallets(options?: {
  status?: AgentStatus;
  type?: AgentType;
  limit?: number;
}): Promise<Array<{ agent: Agent; walletBalance: number }>> {
  const db = await getDatabaseAsync();
  await initializeAgentTables();

  let sql = `
    SELECT
      a.*,
      w.balance as wallet_balance,
      w.currency as wallet_currency
    FROM agents a
    LEFT JOIN agent_wallets w ON a.id = w.agent_id
  `;
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options?.status) {
    conditions.push('a.status = ?');
    params.push(options.status);
  }
  if (options?.type) {
    conditions.push('a.type = ?');
    params.push(options.type);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY a.created_at DESC';

  if (options?.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as unknown as Record<string, unknown>[];

  return rows.map(row => ({
    agent: mapRowToAgent(row),
    walletBalance: (row.wallet_balance as number) || 0,
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
    apiKey: row.api_key as string || '',
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    lastActiveAt: row.last_active_at ? new Date(row.last_active_at as string) : undefined,
  };
}

// Export other functions from the original repository
// Note: mapRowToAgent is defined locally in this file
export {
  validateAgentApiKey,
  createAgentToken,
  validateAgentToken,
  refreshAgentToken,
  revokeAgentToken,
  logDataAccess,
  getAgentDataAccessLog,
  updateAgentStatus,
  updateAgentLastActive,
} from './repository';

// Export mapRowToAgent directly (defined in this file)
export { mapRowToAgent };

// Re-export types
export * from './types';
