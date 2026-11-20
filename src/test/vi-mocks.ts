/**
 * Vitest Mock Setup for Database Module
 * Uses a proper shared in-memory database that persists across prepare() calls
 */

import { vi } from 'vitest'
import { DatabaseConnection, DatabaseStatement, DatabaseResult } from '../lib/db/index'

// ============================================================================
// JOSE LIBRARY MOCK - Fix Uint8Array realm mismatch in jsdom
// jose library uses instanceof Uint8Array checks that fail in jsdom environment
// We use a simple mock that generates JWT-like tokens for testing
// ============================================================================

vi.mock('jose', () => {
  let mockSignCount = 0
  // Track which secret was used to sign each token
  const tokenSecrets = new Map<string, string>()

  // Extract secret string from various key formats
  function extractSecret(key: any): string {
    // Handle CryptoKey from crypto.createSecretKey()
    if (key && typeof key === 'object') {
      // If it's a CryptoKey with export method
      if ('export' in key && typeof key.export === 'function') {
        try {
          const exported = key.export()
          if (Buffer.isBuffer(exported)) {
            return exported.toString('utf-8')
          }
          if (exported instanceof Uint8Array) {
            return Buffer.from(exported).toString('utf-8')
          }
        } catch (e) {
          // Export failed - try toString
          return `crypto-key-${Buffer.from(String(key)).toString('base64url')}`
        }
      }
      // If it's a KeyObject with export method
      if (key.type === 'secret' && 'export' in key) {
        try {
          const exported = key.export()
          if (Buffer.isBuffer(exported)) {
            return exported.toString('utf-8')
          }
        } catch {}
      }
      // If it's a raw Uint8Array
      if (key instanceof Uint8Array) {
        return Buffer.from(key).toString('utf-8')
      }
    }
    // Handle regular string or anything else
    return String(key)
  }

  // Parse duration strings like '1h', '1d', '3600s', '-1s' to seconds
  function parseDuration(duration: string): number {
    // Handle negative durations (for expired tokens)
    const negMatch = duration.match(/^-(\d+)([hmsd])$/)
    if (negMatch) {
      const value = parseInt(negMatch[1])
      const unit = negMatch[2]
      switch (unit) {
        case 'h':
          return -value * 3600
        case 'm':
          return -value * 60
        case 's':
          return -value
        case 'd':
          return -value * 86400
        default:
          return -3600
      }
    }
    const match = duration.match(/^(\d+)([hmsd])$/)
    if (!match) return 3600 // default 1 hour
    const value = parseInt(match[1])
    const unit = match[2]
    switch (unit) {
      case 'h':
        return value * 3600
      case 'm':
        return value * 60
      case 's':
        return value
      case 'd':
        return value * 86400
      default:
        return 3600
    }
  }

  return {
    SignJWT: class MockSignJWT {
      #payload: any
      #protectedHeader: any
      #expirationTime: any = '1h'
      #issuedAt: any
      #issuer: any = '7zi-api'
      #audience: any = '7zi-users'

      constructor(payload: any) {
        this.#payload = payload
      }

      setProtectedHeader(header: any) {
        this.#protectedHeader = header
        return this
      }

      setIssuedAt() {
        this.#issuedAt = Math.floor(Date.now() / 1000)
        return this
      }

      setExpirationTime(exp: any) {
        this.#expirationTime = exp
        return this
      }

      setIssuer(issuer: string) {
        this.#issuer = issuer
        return this
      }

      setAudience(audience: string) {
        this.#audience = audience
        return this
      }

      async sign(key: any): Promise<string> {
        mockSignCount++
        const iat = this.#issuedAt || Math.floor(Date.now() / 1000)
        const expSeconds = parseDuration(String(this.#expirationTime))
        const exp = iat + expSeconds

        const payloadStr = JSON.stringify({
          ...this.#payload,
          iat,
          exp,
          iss: this.#issuer,
          aud: this.#audience,
        })
        const payloadB64 = Buffer.from(payloadStr).toString('base64url')
        const headerB64 = Buffer.from(
          JSON.stringify(this.#protectedHeader || { alg: 'HS256' })
        ).toString('base64url')

        // Extract and encode the secret
        const secretStr = extractSecret(key)
        const secretB64 = Buffer.from(secretStr).toString('base64url')
        const mockSig = Buffer.from(`mock-sig-${mockSignCount}-secret-${secretB64}`).toString(
          'base64url'
        )

        const token = `${headerB64}.${payloadB64}.${mockSig}`
        tokenSecrets.set(token, secretStr)

        return token
      }
    },

    jwtVerify: async (token: string, key: any, options?: any) => {
      const parts = token.split('.')
      if (parts.length !== 3) throw new Error('Invalid token format')
      let payload
      try {
        payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
      } catch (error) {
        throw new Error('Invalid token payload')
      }
      if (options?.issuer && payload.iss !== options.issuer) throw new Error('Invalid issuer')
      if (options?.audience && payload.aud !== options.audience) throw new Error('Invalid audience')

      // Verify the secret matches what was used to sign
      const signingSecret = tokenSecrets.get(token)
      const verifySecret = extractSecret(key)
      if (signingSecret && verifySecret !== signingSecret) {
        throw new Error('signature verification failed')
      }

      return {
        payload,
        protectedHeader: JSON.parse(Buffer.from(parts[0], 'base64url').toString()),
        key: key,
      }
    },

    decodeJwt: (token: string) => {
      const parts = token.split('.')
      if (parts.length !== 3) throw new Error('Invalid token format')
      return JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    },

    createLocalJWKSet: () => ({}),
    FlattenedSign: class {},
    CompactSign: class {},
  }
})

// ============================================================================
// SHARED DATABASE STORAGE
// This is the key fix - use a module-level object that persists across all prepare() calls
// ============================================================================

interface DbRow {
  [key: string]: unknown
}

// Room validation options
interface RoomOptions {
  type: string
  documentId?: string
  [key: string]: unknown
}

// Collaboration state
interface CollaborationState {
  content: string
  revision: number
  operations: unknown[]
  [key: string]: unknown
}

// Operation types
interface Operation {
  type: 'insert' | 'delete' | 'retain' | string
  position?: number
  content?: string
  length?: number
  [key: string]: unknown
}

const dbTables: Map<string, DbRow[]> = new Map()

// 索引登记表：name -> { tableName, indexName, sql }
// 之前 mock 只认 CREATE TABLE，CREATE INDEX 直接被忽略，
// 于是查 sqlite_master 拿不到任何索引（index-analyzer 整个文件 14 个用例全红）。
const dbIndexes: Map<string, { tableName: string; indexName: string; sql: string }> = new Map()

// Initialize tables
dbTables.set('users', [])
dbTables.set('user_tokens', [])
dbTables.set('password_reset_tokens', [])

// RBAC 默认角色种子（对齐 src/lib/permissions/types.ts 的 Role 枚举与
// src/lib/permissions/rbac.ts 的 DEFAULT_ROLE_DEFINITIONS）。
// 真实环境由 src/lib/permissions/seed.ts 的 seedDefaultRolesAndPermissions() 写入；
// mock db 不跑迁移/种子，所以这里补上，否则 getAllRoles() 恒返回空数组。
// 表结构对齐 src/lib/permissions/repository.ts 的 initializeRbacTables()。
function seedRbacRoles(): void {
  const now = '2026-01-01T00:00:00.000Z'
  dbTables.set('roles', [
    { id: 'admin', name: 'admin', description: '管理员', permissions: '[]', is_system: 1, created_at: now, updated_at: now },
    { id: 'manager', name: 'manager', description: '管理者', permissions: '[]', is_system: 1, created_at: now, updated_at: now },
    { id: 'member', name: 'member', description: '成员', permissions: '[]', is_system: 1, created_at: now, updated_at: now },
    { id: 'guest', name: 'guest', description: '访客', permissions: '[]', is_system: 1, created_at: now, updated_at: now },
    { id: 'viewer', name: 'viewer', description: '查看者', permissions: '[]', is_system: 1, created_at: now, updated_at: now },
  ])
  dbTables.set('user_roles', [])
  dbTables.set('role_permissions', [])
}

seedRbacRoles()

// plans 种子数据（对齐 src/lib/db/migrations/001_multi_tenant.sql 的真实 seed）。
// 少了它，BillingService.getPlan() 恒返回 null → createOrUpdateSubscription
// 直接抛 'Plan not found'，配额检查也无从谈起。
// 注意 limits 的键名是 snake_case —— 与真实 seed 保持一致，
// 由 billing/service.ts 的 normalizeLimits() 负责归一到 camelCase。

dbTables.set('plans', [
  {
    id: 'plan_starter',
    name: 'Starter',
    type: 'subscription',
    price_monthly: 99,
    price_yearly: 990,
    features: JSON.stringify({ agents: 5, workflows: 10, storage: 10, support: 'email' }),
    limits: JSON.stringify({ ai_calls: 1000, workflow_runs: 100, storage_gb: 10 }),
  },
  {
    id: 'plan_professional',
    name: 'Professional',
    type: 'subscription',
    price_monthly: 299,
    price_yearly: 2990,
    features: JSON.stringify({ agents: 50, workflows: 100, storage: 100, support: 'priority' }),
    limits: JSON.stringify({ ai_calls: 10000, workflow_runs: 1000, storage_gb: 100 }),
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise',
    type: 'subscription',
    price_monthly: 999,
    price_yearly: 9990,
    features: JSON.stringify({ agents: 'unlimited', workflows: 'unlimited', storage: 'unlimited', support: '24/7' }),
    limits: JSON.stringify({ ai_calls: 'unlimited', workflow_runs: 'unlimited', storage_gb: 'unlimited' }),
  },
])

// Helper: Get or create table
function getTable(tableName: string): DbRow[] {
  if (!dbTables.has(tableName)) {
    dbTables.set(tableName, [])
  }
  return dbTables.get(tableName)!
}

// Helper: Generate next ID
function generateId(tableName: string): string {
  const table = getTable(tableName)
  if (table.length === 0) return `${tableName}_1`

  const maxId = table.reduce((max, row) => {
    const idStr = String(row.id || '')
    const num = parseInt(idStr.replace(`${tableName}_`, '')) || 0
    return Math.max(max, num)
  }, 0)

  return `${tableName}_${maxId + 1}`
}

// ============================================================================
// SQL PARSING HELPERS
// ============================================================================

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim()
}

function parseTableName(sql: string): string | null {
  const fromMatch = sql.match(/FROM\s+(\w+)/i)
  if (fromMatch) return fromMatch[1]

  const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i)
  if (insertMatch) return insertMatch[1]

  const updateMatch = sql.match(/UPDATE\s+(\w+)/i)
  if (updateMatch) return updateMatch[1]

  const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i)
  if (deleteMatch) return deleteMatch[1]

  return null
}

function parseInsertColumns(sql: string): string[] | null {
  const match = sql.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)/i)
  if (!match) return null
  return match[1].split(',').map(col => col.trim())
}

function parseUpdateSets(sql: string): string[] | null {
  // 必须带 s 标志（dotAll）：生产代码的 UPDATE 是多行模板字符串，
  // 例如
  //   UPDATE subscriptions
  //   SET plan_id = ?, status = ?, ...
  //   WHERE id = ?
  // 不带 s 时 `.` 不跨行，SET 段根本匹配不上 → 整条 UPDATE 被静默跳过
  // （changes: 0），表现为「更新没生效」。
  const match = sql.match(/SET\s+(.+?)\s+WHERE/is)
  if (!match) return null
  return match[1].split(',').map(part => part.trim().replace(/\s+/g, ' '))
}

/**
 * Parse WHERE clause and extract column names and operators
 * Handles patterns like: WHERE col1 = ? AND col2 > ? OR col3 <= ?
 */
function parseWhereClause(sql: string): Array<{column: string, operator: string, paramIndex: number; literal?: unknown}> {
  const whereClauses: Array<{column: string, operator: string, paramIndex: number; literal?: unknown}> = []
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+GROUP|\s+LIMIT|\s*$)/i)
  if (!whereMatch) return whereClauses

  const wherePart = whereMatch[1]
  // Match patterns like: column_name = ? or column_name > ? etc.
  const conditionRegex = /(\w+)\s*(=|>=|<=|>|<|LIKE|IN)\s*\?/gi
  let match
  let paramIndex = 0

  while ((match = conditionRegex.exec(wherePart)) !== null) {
    whereClauses.push({
      column: match[1].toLowerCase(),
      operator: match[2].toUpperCase(),
      paramIndex: paramIndex++
    })
  }

  // 字面量条件：WHERE workflow_id = 'wf_x'
  // 之前只认 `?` 占位符，字面量 WHERE 被整个忽略 ——
  // 于是 UPDATE/DELETE 命中的是**所有行**而不是目标行
  // （表现为「更新没生效」「删除条数不对」）。
  // 注意：只处理不与占位符条件重复的列，避免重复计数。
  const literalRegex = /(\w+)\s*(=|>=|<=|>|<)\s*'([^']*)'/gi
  let literalMatch
  while ((literalMatch = literalRegex.exec(wherePart)) !== null) {
    const column = literalMatch[1].toLowerCase()
    const operator = literalMatch[2]
    if (whereClauses.some(c => c.column === column)) continue
    whereClauses.push({
      column,
      operator,
      paramIndex: -1,
      literal: literalMatch[3],
    })
  }

  return whereClauses
}

/**
 * Check if a row matches the WHERE conditions
 */
function rowMatchesConditions(row: DbRow, conditions: Array<{column: string, operator: string, paramIndex: number; literal?: unknown}>, params: unknown[]): boolean {
  for (const cond of conditions) {
    const rowValue: unknown = row[cond.column]
    // literal 条件（paramIndex = -1）用内联值，不看 params
    const paramValue: unknown = cond.literal !== undefined ? cond.literal : params[cond.paramIndex]

    // 行里根本没有该列时（例如 INSERT 没写 recorded_at，而查询按它过滤），
    // 直接判不匹配。原先会把 undefined 丢进比较运算，既可能抛错，
    // 也可能因 NaN 语义产生"看起来通过"的假象。
    if (rowValue === undefined || rowValue === null) return false

    // 大小比较：SQLite 里列的值可能是 ISO 日期字符串（如
    // `WHERE timestamp < ?`，参数是 cutoffDate.toISOString()）。
    // 直接 `(rowValue as number) > (paramValue as number)` 会把字符串转成 NaN，
    // 恒为 false —— 表现为「清理旧历史一条都删不掉」。
    // 所以：先按数值比，数值不可用时回退到日期字符串比较。
    const compare = (op: '>' | '>=' | '<' | '<='): boolean => {
      const numRow = Number(rowValue)
      const numParam = Number(paramValue)
      if (!Number.isNaN(numRow) && !Number.isNaN(numParam)) {
        switch (op) {
          case '>': return numRow > numParam
          case '>=': return numRow >= numParam
          case '<': return numRow < numParam
          case '<=': return numRow <= numParam
        }
      }
      // 回退：按日期字符串比较（ISO 8601 字典序 == 时间序）
      const strRow = String(rowValue)
      const strParam = String(paramValue)
      switch (op) {
        case '>': return strRow > strParam
        case '>=': return strRow >= strParam
        case '<': return strRow < strParam
        case '<=': return strRow <= strParam
      }
      return false
    }

    switch (cond.operator) {
      case '=':
        if (rowValue != paramValue) return false
        break
      case '>':
        if (!compare('>')) return false
        break
      case '>=':
        if (!compare('>=')) return false
        break
      case '<':
        if (!compare('<')) return false
        break
      case '<=':
        if (!compare('<=')) return false
        break
      case 'LIKE':
        // Simple LIKE support
        const pattern = String(paramValue).replace(/%/g, '.*')
        if (!new RegExp(`^${pattern}$`, 'i').test(String(rowValue))) return false
        break
      case 'IN':
        const inArray = Array.isArray(paramValue) ? paramValue : [paramValue]
        if (!inArray.includes(rowValue)) return false
        break
    }
  }
  return true
}

// ============================================================================
// STATEMENT EXECUTION
// ============================================================================

function executeAll(sql: string, params?: unknown[]): DbRow[] {
  // sqlite_master 是 SQLite 的系统表：表和索引都登记在上面。
  // 之前 mock 直接返回 []，凡是查 sqlite_master 的代码（索引分析器等）
  // 一律拿不到数据。
  if (/FROM\s+sqlite_master/i.test(sql)) {
    const wantsIndex = /type\s*=\s*'index'/i.test(sql)
    const wantsTable = /type\s*=\s*'table'/i.test(sql)
    const rows: DbRow[] = []

    if (wantsTable) {
      for (const t of dbTables.keys()) {
        rows.push({ type: 'table', name: t, tbl_name: t, sql: `CREATE TABLE ${t}` })
      }
    }
    if (wantsIndex || (!wantsIndex && !wantsTable)) {
      for (const idx of dbIndexes.values()) {
        // SQLite 里 sqlite_autoindex_* 是 UNIQUE/PRIMARY KEY 隐式索引，
        // 真实查询会用 name NOT LIKE 'sqlite_%' 过滤掉，这里也标成 sqlite_ 前缀。
        rows.push({
          type: 'index',
          name: idx.indexName,
          tbl_name: idx.tableName,
          sql: idx.sql,
        })
      }
    }

    // 真实 sqlite_master 查询常带 SELECT 别名（`tbl_name as tableName`）和
    // WHERE 过滤（`name NOT LIKE 'sqlite_%'`）。mock 必须照做，
    // 否则调用方拿到的字段名对不上（index-analyzer 读 row.indexName 得到 undefined）。
    const aliasMap: Record<string, string> = {}
    const selectPart = sql.match(/SELECT\s+([\s\S]*?)\s+FROM/i)
    if (selectPart) {
      for (const raw of selectPart[1].split(',')) {
        const part = raw.trim()
        const asMatch = part.match(/(\w+)\s+AS\s+(\w+)/i)
        if (asMatch) aliasMap[asMatch[1]] = asMatch[2]
        else if (/^\w+$/.test(part)) aliasMap[part] = part
      }
    }
    const filtered = rows.filter((r) => {
      const notLike = sql.match(/(\w+)\s+NOT\s+LIKE\s+'([^']*)'/i)
      if (notLike) {
        const col = notLike[1]
        const pattern = notLike[2]
        const value = String(r[col] ?? '')
        const re = new RegExp('^' + pattern.replace(/%/g, '.*') + '$', 'i')
        if (re.test(value)) return false
      }
      const eqMatch = sql.match(/(\w+)\s*=\s*'([^']*)'/i)
      if (eqMatch) {
        const col = eqMatch[1]
        if (String(r[col] ?? '') !== eqMatch[2]) return false
      }
      return true
    })

    if (Object.keys(aliasMap).length === 0) return filtered

    return filtered.map((r) => {
      const out: DbRow = {}
      for (const [src, dst] of Object.entries(aliasMap)) {
        out[dst] = r[src]
      }
      return out
    })
  }

  const tableName = parseTableName(sql)
  if (!tableName) return []

  const normalizedSql = normalizeSql(sql).toUpperCase()
  let results = [...getTable(tableName)]
  
  // Extract parameters based on query structure
  let paramIndex = 0
  
  // 通用 WHERE 处理。
  // 之前只特判了 workflow_id，其余 `WHERE col = ?` 条件被完全忽略 ——
  // 例如 `SELECT * FROM plans WHERE id = ?` 会返回表里第一行，
  // 表现为「按 id 查不到 / 查到别人」。
  //
  // 注意：workflow_id 原来有个「特判分支」先过滤一遍并消费掉第 0 个参数，
  // 通用分支又把 paramIndex 整体 +1 —— **参数被重复计数**，
  // 于是 `WHERE workflow_id = ?` 拿 workflowId 去比 row[params[1]]（其实是 LIMIT 值），
  // 结果恒为 false，所有行被过滤掉。
  // （表现为 WorkflowHistoryService.queryHistory 返回 entries 空但 total 正确。）
  //
  // 现在：workflow_id 由通用分支统一处理，特判分支彻底移除。
  const whereConditions = parseWhereClause(sql)
  if (whereConditions.length > 0 && params && params.length > 0) {
    results = results.filter(row => rowMatchesConditions(row, whereConditions, params))
  }

  // Handle ORDER BY
  if (normalizedSql.includes('ORDER BY')) {
    if (normalizedSql.includes('VERSION_NUMBER DESC')) {
      results.sort((a, b) => {
        const aVer = (a.version_number as number) || 0
        const bVer = (b.version_number as number) || 0
        return bVer - aVer
      })
    } else if (normalizedSql.includes('VERSION_NUMBER ASC')) {
      results.sort((a, b) => {
        const aVer = (a.version_number as number) || 0
        const bVer = (b.version_number as number) || 0
        return aVer - bVer
      })
    } else if (normalizedSql.includes('CREATED_AT DESC')) {
      results.sort((a, b) => {
        const aDate = new Date((a.created_at as string) || '').getTime()
        const bDate = new Date((b.created_at as string) || '').getTime()
        return bDate - aDate
      })
    }
  }
  
  // Handle LIMIT and OFFSET - params start after WHERE conditions
  const literalLimitMatch = sql.match(/LIMIT\s+(\d+)/i)
  const limitMatch = sql.match(/LIMIT\s+\?/i)
  const offsetMatch = sql.match(/OFFSET\s+\?/i)

  if (literalLimitMatch) {
    // Literal LIMIT like LIMIT 2
    const limit = parseInt(literalLimitMatch[1])
    let offset = 0
    if (offsetMatch) {
      const localWhereConditions = parseWhereClause(sql)
      offset = (params?.[localWhereConditions.length] as number) || 0
    }
    results = results.slice(offset, offset + limit)
  } else if (limitMatch) {
    // Parameterized LIMIT like LIMIT ?
    const localWhereConditions = parseWhereClause(sql)
    const limit = params?.[localWhereConditions.length] as number
    let offset = 0
    if (offsetMatch) {
      offset = (params?.[localWhereConditions.length + 1] as number) || 0
    }
    results = results.slice(offset, offset + limit)
  }

  // Handle aggregate projections: SUM(x) / AVG(x) / COUNT(x)
  // 之前只支持 COUNT(*)，导致 `SELECT resource_type, SUM(quantity) ...`
  // 这类用量统计查询返回原始行，聚合字段全是 undefined。
  if (/\b(SUM|AVG)\s*\(/i.test(sql) && /\bAS\s+/i.test(sql)) {
    // 必须带 s 标志（dotAll）：生产代码的聚合查询是多行模板字符串，
    // 例如 SELECT a, SUM(x) as y, AVG(z) as w FROM t 会被拆成多行，
    // 不带 s 时 "." 不跨行，
    // SELECT 段匹配失败 → 直接返回原始行，聚合字段全是 undefined。
    const aggregateMatch = sql.match(
      /SELECT\s+(.+?)\s+FROM\s+(\w+)/is
    )
    if (aggregateMatch) {
      const selectPart = aggregateMatch[1]

      // 支持一条 SELECT 里同时出现多个聚合函数：
      //   SELECT resource_type, SUM(quantity) as total_quantity,
      //          AVG(unit_cost) as unit_cost, SUM(total_cost) as total_cost
      const aggregateSpecs: Array<{ func: string; column: string; alias: string }> = []
      const aggRegex = /\b(SUM|AVG|COUNT)\s*\(\s*(\w+)\s*\)(?:\s+AS\s+(\w+))?/gi
      let aggMatch
      while ((aggMatch = aggRegex.exec(selectPart)) !== null) {
        const func = aggMatch[1].toUpperCase()
        const column = aggMatch[2]
        const alias = aggMatch[3] ?? `${func.toLowerCase()}_${column}`
        aggregateSpecs.push({ func, column, alias })
      }

      if (aggregateSpecs.length > 0) {
        // 第一个非聚合列作为分组列
        const groupMatch = selectPart.match(/^\s*(\w+)/)
        const groupColumn = groupMatch ? groupMatch[1] : ''

        const groups = new Map<string, DbRow & { __sums: Map<string, number>; __counts: Map<string, number> }>()

        for (const row of results) {
          const key = groupColumn ? String(row[groupColumn] ?? '') : ''
          let entry = groups.get(key)
          if (!entry) {
            entry = { __sums: new Map(), __counts: new Map() } as never
            if (groupColumn) (entry as DbRow)[groupColumn] = key
            groups.set(key, entry)
          }
          for (const spec of aggregateSpecs) {
            const value = Number(row[spec.column] ?? 0) || 0
            entry.__sums.set(spec.column, (entry.__sums.get(spec.column) ?? 0) + value)
            entry.__counts.set(spec.column, (entry.__counts.get(spec.column) ?? 0) + 1)
          }
        }

        return [...groups.entries()].map(([key, entry]) => {
          const projected: DbRow = {}
          if (groupColumn) projected[groupColumn] = key
          for (const spec of aggregateSpecs) {
            const sum = entry.__sums.get(spec.column) ?? 0
            const count = entry.__counts.get(spec.column) ?? 0
            if (spec.func === 'SUM') {
              projected[spec.alias] = sum
            } else if (spec.func === 'AVG') {
              projected[spec.alias] = count > 0 ? sum / count : 0
            } else {
              projected[spec.alias] = count
            }
          }
          return projected
        })
      }
    }
  }

  return results
}

function executeGet(sql: string, params?: unknown[]): DbRow | null {
  const normalizedSql = normalizeSql(sql).toUpperCase()

  // Handle COUNT queries
  if (normalizedSql.includes('COUNT(*)')) {
    const tableName = parseTableName(sql)
    if (!tableName) return { count: 0 }

    let filtered = [...getTable(tableName)]
    
    
    // Handle WHERE conditions for COUNT using generalized parser
    const whereConditions = parseWhereClause(sql)
    if (whereConditions.length > 0 && params && params.length > 0) {
      filtered = filtered.filter(row => rowMatchesConditions(row, whereConditions, params))
    }

    return { count: filtered.length }
  }

  const results = executeAll(sql, params)
  return results.length > 0 ? results[0] : null
}

function executeRun(sql: string, params: unknown[]): DatabaseResult {
  const normalizedSql = normalizeSql(sql).toUpperCase()
  const tableName = parseTableName(sql)

  if (!tableName) return { changes: 0, lastInsertRowid: undefined }

  const table = getTable(tableName)

  // INSERT
  if (normalizedSql.startsWith('INSERT')) {
    const columns = parseInsertColumns(sql)
    if (!columns) return { changes: 0, lastInsertRowid: undefined }

    const newRow: DbRow = {}
    columns.forEach((col, index) => {
      newRow[col] = params[index]
    })

    // Auto-generate ID if not provided
    if (!newRow.id) {
      newRow.id = generateId(tableName)
    }

    // 真实数据库会为 created_at / updated_at / recorded_at 补默认值
    // （见 src/lib/db/migrations/001_multi_tenant.sql 的
    //  `recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP`）。
    // 替身之前不补，导致：
    //  - `ORDER BY created_at DESC LIMIT 1` 排序完全随机
    //    （billing 的 getSubscription() 更新后仍返回旧行）
    //  - `WHERE recorded_at >= ?` 把行全部过滤掉
    //    （billing 的 getMonthlyUsage() 恒返回空数组）
    const nowIso = new Date().toISOString()
    if (!newRow.created_at) newRow.created_at = nowIso
    if (!newRow.updated_at) newRow.updated_at = nowIso
    if (!newRow.recorded_at) newRow.recorded_at = nowIso

    table.push(newRow)

    return {
      changes: 1,
      lastInsertRowid: parseInt(String(newRow.id).replace(`${tableName}_`, '')) || 1,
    }
  }

  // UPDATE
  if (normalizedSql.startsWith('UPDATE')) {
    const setColumns = parseUpdateSets(sql)
    if (!setColumns) return { changes: 0, lastInsertRowid: undefined }

    const updates: DbRow = {}
    let paramIndex = 0

    for (const setCol of setColumns) {
      const eqIdx = setCol.indexOf('=')
      if (eqIdx < 0) continue
      const colName = setCol.slice(0, eqIdx).trim()
      const rawValue = setCol.slice(eqIdx + 1).trim()

      if (rawValue === '?') {
        updates[colName] = params[paramIndex]
        paramIndex++
      } else if (
        (rawValue.startsWith("'") && rawValue.endsWith("'")) ||
        (rawValue.startsWith('"') && rawValue.endsWith('"'))
      ) {
        // 字面量字符串 —— 之前被整个忽略，导致
        // `UPDATE ... SET timestamp = '2025-01-01...' WHERE ...` 不生效，
        // （表现为「清理旧历史一条都删不掉」：行没被改成旧时间）。
        updates[colName] = rawValue.slice(1, -1)
      } else if (rawValue !== 'NULL') {
        const num = Number(rawValue)
        updates[colName] = Number.isNaN(num) ? rawValue : num
      }
    }

    // WHERE params start after SET params
    const whereParams = params.slice(paramIndex)
    const whereConditions = parseWhereClause(sql)

    let changes = 0
    for (const row of table) {
      if (rowMatchesConditions(row, whereConditions, whereParams)) {
        Object.assign(row, updates)
        changes++
      }
    }

    return { changes, lastInsertRowid: undefined }
  }

  // DELETE
  if (normalizedSql.startsWith('DELETE')) {
    const whereConditions = parseWhereClause(sql)

    const initialLength = table.length

    for (let i = table.length - 1; i >= 0; i--) {
      const row = table[i]
      if (rowMatchesConditions(row, whereConditions, params)) {
        table.splice(i, 1)
      }
    }

    return { changes: initialLength - table.length, lastInsertRowid: undefined }
  }

  return { changes: 0, lastInsertRowid: undefined }
}

// ============================================================================
// MOCK DATABASE
// ============================================================================

/**
 * 替身数据库（mock）的类型。
 *
 * `DatabaseConnection`（src/lib/db/connection.ts:36）把 `batch` 声明成
 * `Promise<DatabaseResult[]>`，但真实实现（connection.ts:259 的 batch）与
 * better-sqlite3 本身都是**同步**返回 `DatabaseResult[]` 数组。
 * 替身按运行时真相建模：只把 `batch` 的签名覆盖成同步版本，其余字段沿用
 * `DatabaseConnection`。否则给替身安一个假 Promise 会让
 * `const results = db.batch(stmts); Array.isArray(results)` 这类同步用法失效
 * （与 src/test/mocks/db.ts、src/test/setup-db-mock.ts 的既有约定一致）。
 */
type MockDatabaseConnection = Omit<DatabaseConnection, 'batch'> & {
  batch: (statements: Array<{ sql: string; params?: unknown[] }>) => DatabaseResult[]
}

const mockDb: MockDatabaseConnection = {
  query: vi.fn(),
  get: vi.fn((sql: string, params?: unknown[]) => {
    return executeGet(sql, params) as Record<string, unknown> | null
  }) as any,

  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  isInTransaction: vi.fn().mockReturnValue(false),

  exec: vi.fn((sql: string, params?: unknown[]) => {
    // 不带参数时支持**多条语句**（迁移脚本、批量 DDL 都靠这个）。
    // 真 better-sqlite3 的 db.exec() 一次能跑多条，
    // 而 prepare() 只接受单条 —— 假库的行为得跟真库一致，
    // 否则用真库的用例一换到假库就挂。
    if (!params || params.length === 0) {
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      if (statements.length > 1) {
        let changes = 0
        let lastInsertRowid = 0
        for (const stmt of statements) {
          const r = mockDb.exec(stmt)
          changes += r?.changes ?? 0
          lastInsertRowid = r?.lastInsertRowid ?? lastInsertRowid
        }
        return { changes, lastInsertRowid }
      }
    }

    // Handle CREATE INDEX —— 记进 dbIndexes，让查 sqlite_master 的用例能用。
    const idxMatch = sql.match(
      /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[\"\'`]?(\w+)[\"\'`]?\s+ON\s+([\"\'`]?\w+[\"\'`]?)/i
    )
    if (idxMatch) {
      const indexName = idxMatch[1]
      const tableName = idxMatch[2].replace(/[\"\'`]/g, '')
      dbIndexes.set(indexName, { tableName, indexName, sql })
      return { changes: 0, lastInsertRowid: 0 }
    }

    // Handle CREATE TABLE
    if (sql.toUpperCase().includes('CREATE TABLE')) {
      // 必须兼容 `CREATE TABLE IF NOT EXISTS xxx`：旧正则 `CREATE TABLE\s+(\w+)`
      // 会把 `IF` 当成表名，于是表根本没建出来，后续 SELECT 一律 0 行。
      const match = sql.match(
        /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?([\w]+)["'`]?/i
      )
      if (match) {
        const tableName = match[1]
        if (!dbTables.has(tableName)) {
          dbTables.set(tableName, [])
        }
      }
      return { changes: 0, lastInsertRowid: 1 }
    }

    // 其余语句（INSERT / UPDATE / DELETE）必须真正落到 dbTables 上。
    // 之前这里无条件返回 { changes: 1 } 且不写表，导致业务代码
    // `await db.exec('INSERT INTO ...')` 之后 SELECT 不到任何行，
    // 表现为"创建成功但读回来是 null"这类假象。
    return executeRun(sql, params || [])
  }),

  prepare: vi.fn((sql: string) => {
    // This is the key: each prepare() call returns a statement,
    // but all statements share the same dbTables data
    const statement: DatabaseStatement = {
      all: vi.fn((...params: unknown[]) => {
        return executeAll(sql, params)
      }),

      get: vi.fn((...params: unknown[]) => {
        return executeGet(sql, params) as Record<string, unknown> | null
      }),

      run: vi.fn((...params: unknown[]) => {
        return executeRun(sql, params)
      }),
    }

    return statement
  }),

  pragma: vi.fn().mockReturnValue(undefined),

  // better-sqlite3 的 db.batch() 是**同步**的，直接返回结果数组。
  // 之前这里 return Promise.resolve(results) —— 返回的是 Promise，
  // 于是 `Array.isArray(results)` 为 false，batch 相关用例全挂。
  batch: vi.fn((statements: Array<{ sql: string; params?: unknown[] }>) => {
    const results: DatabaseResult[] = []
    for (const { sql, params } of statements) {
      results.push(executeRun(sql, params || []))
    }
    return results
  }),

  queryRows: function(sql: string, params?: unknown[]): Record<string, unknown>[] {
    if (params && params.length > 0) {
      return executeAll(sql, params)
    }
    return executeAll(sql, [])
  } as <T = Record<string, unknown>>(sql: string, params?: unknown[]) => T[],
}

// ============================================================================
// EVENTSOURCE MOCK
// ============================================================================

class MockEventSource extends EventTarget {
  public readonly url: string
  public readonly withCredentials: boolean
  public readonly CONNECTING = 0
  public readonly OPEN = 1
  public readonly CLOSED = 2
  public readyState: number = this.CONNECTING
  public onopen: ((this: EventSource, ev: Event) => unknown) | null = null
  public onmessage: ((this: EventSource, ev: MessageEvent) => unknown) | null = null
  public onerror: ((this: EventSource, ev: Event) => unknown) | null = null

  constructor(url: string, eventSourceInitDict?: EventSourceInit) {
    super()
    this.url = url
    this.withCredentials = eventSourceInitDict?.withCredentials ?? false
  }

  public close(): void {
    this.readyState = this.CLOSED
    this.dispatchEvent(new Event('close'))
  }

  // Helper methods for testing
  public mockOpen(): void {
    this.readyState = this.OPEN
    ;(this.onopen as Function)?.call(this, new Event('open'))
    this.dispatchEvent(new Event('open'))
  }

  public mockMessage(data: string, lastEventId?: string): void {
    const event = new MessageEvent('message', { data, lastEventId })
    ;(this.onmessage as Function)?.call(this, event)
    this.dispatchEvent(event)
  }

  public mockError(error: Event): void {
    ;(this.onerror as Function)?.call(this, error)
    this.dispatchEvent(error)
  }
}

// Set global EventSource
declare global {
  var EventSource: typeof EventSource
}
;(globalThis as unknown as { EventSource: typeof EventSource }).EventSource =
  MockEventSource as unknown as typeof EventSource

// ============================================================================
// MOCK THE DATABASE MODULE
// ============================================================================

// Mock logger
//
// 注意：必须同时导出 `log`（便捷函数集合）。src/lib/logger/index.ts 里
// `log` 和 `logger` 是两个具名导出，只 mock `logger` 会让
// `import { log } from '@/lib/logger'` 在运行期抛
// "No 'log' export is defined on the mock"。
vi.mock('../lib/logger', () => {
  const logger = {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    api: vi.fn(),
    auth: vi.fn(),
    perf: vi.fn(),
    user: vi.fn(),
    security: vi.fn(),
    business: vi.fn(),
    setContext: vi.fn(),
    clearContext: vi.fn(),
    child: vi.fn(),
    updateConfig: vi.fn(),
  }

  // 便捷函数保持与真实实现一致的委托关系：
  // log.x(...) 最终落到 logger.x(...)，测试才能断言「log 确实调用了 logger」。
  const log = {
    debug: (message: string, data?: Record<string, unknown>) => logger.debug(message, data),
    info: (message: string, data?: Record<string, unknown>) => logger.info(message, data),
    warn: (message: string, data?: Record<string, unknown>) => logger.warn(message, data),
    error: (message: string, error?: Error | unknown, data?: Record<string, unknown>) =>
      logger.error(message, error, data),
    fatal: (message: string, error?: Error | unknown, data?: Record<string, unknown>) =>
      logger.fatal(message, error, data),
    api: (message: string, data?: Record<string, unknown>, level?: string) =>
      logger.api(message, data, level),
    auth: (message: string, data?: Record<string, unknown>, level?: string) =>
      logger.auth(message, data, level),
    perf: (message: string, data?: Record<string, unknown>) => logger.perf(message, data),
    user: (message: string, data?: Record<string, unknown>) => logger.user(message, data),
    security: (message: string, data?: Record<string, unknown>, level?: string) =>
      logger.security(message, data, level),
    business: (message: string, data?: Record<string, unknown>) => logger.business(message, data),
  }

  return {
    logger,
    log,
    default: function () {
      return {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        fatal: vi.fn(),
        api: vi.fn(),
        auth: vi.fn(),
        perf: vi.fn(),
        user: vi.fn(),
        security: vi.fn(),
        business: vi.fn(),
        setContext: vi.fn(),
        clearContext: vi.fn(),
        child: vi.fn(),
        updateConfig: vi.fn(),
      }
    },
  }
})

vi.mock('../lib/db/index', () => ({
  // `db` 是 src/lib/db/index.ts 的具名导出（`export const db = getDatabase()`）。
  // 业务代码普遍 `import { db } from '../db'`，少了这一项会让整个模块在
  // import 期就抛 "No 'db' export is defined on the mock"，测试全部 0 用例。
  db: mockDb,
  getDatabaseAsync: vi.fn().mockResolvedValue(mockDb),
  getDatabase: vi.fn().mockReturnValue(mockDb),
  initializeDatabase: vi.fn().mockReturnValue(mockDb),
  closeDatabase: vi.fn(),
  migrate: vi.fn(),
  optimizeDatabase: vi.fn(),
  getDatabaseHealth: vi.fn().mockResolvedValue({
    ok: true,
    message: 'Database is healthy',
  }),
  // 下面这几个 src/lib/db/index.ts 也有导出。mock 里缺一项，
  // 业务代码 import 它时就会抛
  //   [vitest] No "getDatabaseStats" export is defined on the
  //            "../lib/db/index" mock
  // 整个测试文件全挂（不是只有用到它的那个用例）。
  getDatabaseStats: vi.fn().mockReturnValue({
    connectionCount: 1,
    isOpen: true,
    isMemoryDatabase: false,
  }),
  vacuumDatabase: vi.fn(),
  analyzeDatabase: vi.fn(),
  // 字段要和 src/lib/db/connection.ts:419 的 getDatabaseSize() 返回结构一致：
  // { pageSize, pageCount, freePages, sizeInBytes, sizeInMB }
  getDatabaseSize: vi.fn().mockReturnValue({
    pageSize: 4096,
    pageCount: 1,
    freePages: 0,
    sizeInBytes: 4096,
    sizeInMB: 0.004,
  }),
}))

// Mock the direct connection module (used by version-service.test.ts)
//
// 必须用 '@/lib/db/connection' 而不是 '../lib/db/connection'：
// 两者在 vitest 里是**不同的模块 ID**（别名解析 vs 相对路径解析），
// 用相对路径会导致业务代码里的 `await import('@/lib/db/connection')`
// 拿到的是**真实模块** —— 动态 import 不会命中相对路径的 mock，
// 于是测试连到真实 SQLite，报 "no such table: xxx"。
vi.mock('@/lib/db/connection', () => ({
  getDatabaseAsync: vi.fn().mockResolvedValue(mockDb),
  getDatabase: vi.fn().mockReturnValue(mockDb),
  initializeDatabase: vi.fn().mockReturnValue(mockDb),
  closeDatabase: vi.fn(),
  getDatabaseStats: vi.fn().mockReturnValue({
    connectionCount: 1,
    isOpen: true,
    isMemoryDatabase: false,
  }),
  vacuumDatabase: vi.fn(),
  analyzeDatabase: vi.fn(),
  getDatabaseSize: vi.fn().mockReturnValue({
    pageSize: 4096,
    pageCount: 100,
    freePages: 10,
    sizeInBytes: 409600,
    sizeInMB: 0.39,
  }),
}))

// ============================================================================
// MOCK AUTH MODULES
// ============================================================================
// Note: For auth module tests, we use real implementation
// Only mock for non-auth tests that need auth bypass

// Don't mock auth service - use real implementation for auth tests
// This mock is only for non-auth tests that need to bypass auth
vi.mock('../lib/auth/service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/auth/service')>()

  return {
    ...actual,
    // Override specific functions for non-auth tests
    // Auth tests will use the real implementation
  }
})

// Mock middleware-rbac to bypass auth
vi.mock('../lib/auth/middleware-rbac', () => ({
  withUserAuth: vi.fn().mockImplementation(async (request, handler) => {
    return handler(request, {
      userId: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      roles: ['admin'],
      permissions: ['admin:all'],
      requestId: 'test-request-id',
      permissionContext: {
        userId: 'test-user-id',
        roles: [{ id: 'role_admin', name: 'Admin', permissions: ['admin:all'] }],
        permissions: ['admin:all'],
        customPermissions: [],
      },
    })
  }),
  withAdmin: vi.fn().mockImplementation(async (request, handler) => {
    return handler(request, {
      userId: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      roles: ['admin'],
      permissions: ['admin:all'],
      requestId: 'test-request-id',
      permissionContext: {
        userId: 'test-user-id',
        roles: [{ id: 'role_admin', name: 'Admin', permissions: ['admin:all'] }],
        permissions: ['admin:all'],
        customPermissions: [],
      },
    })
  }),
  withRole: vi.fn().mockImplementation(() =>
    vi.fn().mockImplementation(async (request, handler) => {
      return handler(request, {
        userId: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        roles: ['admin'],
        permissions: ['admin:all'],
        requestId: 'test-request-id',
        permissionContext: {
          userId: 'test-user-id',
          roles: [{ id: 'role_admin', name: 'Admin', permissions: ['admin:all'] }],
          permissions: ['admin:all'],
          customPermissions: [],
        },
      })
    })
  ),
  withPermissions: vi.fn().mockImplementation(() =>
    vi.fn().mockImplementation(async (request, handler) => {
      return handler(request, {
        userId: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        roles: ['admin'],
        permissions: ['admin:all'],
        requestId: 'test-request-id',
        permissionContext: {
          userId: 'test-user-id',
          roles: [{ id: 'role_admin', name: 'Admin', permissions: ['admin:all'] }],
          permissions: ['admin:all'],
          customPermissions: [],
        },
      })
    })
  ),
  withAnyRole: vi.fn().mockImplementation(() => vi.fn()),
  withManagerOrAdmin: vi.fn().mockImplementation(() => vi.fn()),
  withOptionalAuth: vi.fn().mockImplementation(async (request, handler) => {
    return handler(request, {
      userId: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      roles: ['admin'],
      permissions: ['admin:all'],
      requestId: 'test-request-id',
      permissionContext: {
        userId: 'test-user-id',
        roles: [{ id: 'role_admin', name: 'Admin', permissions: ['admin:all'] }],
        permissions: ['admin:all'],
        customPermissions: [],
      },
    })
  }),
}))

// Mock permissions repository
// RBAC repository：整体保留真实实现（走已 mock 的 db 层）。
//
// 早期写法是逐个列举导出（只有 4 个函数），结果其余导出
// （initializeRbacTables / getAllRoles / addRolesToUser / assignPermissionsToRole …）
// 一被调用就报
// 'No "xxx" export is defined on the "../lib/permissions/repository" mock'。
// 曾试过用 vi.importActual + 覆写 getUserRoles/getUserPermissionContext/hasPermission/
// hasRole 来"给固定值"，但这 4 个里 hasPermission/hasRole 是纯函数（入参是
// 权限上下文，不是 DB），覆写成恒 true 会让权限判定逻辑的测试全部失真；
// getUserRoles 覆写后又会与真实 seeded 数据冲突。
// 最终只保留真实实现 —— db 层已被全局 mock，隔离性不受影响。
vi.mock('../lib/permissions/repository', async () => {
  const actual = await vi.importActual<typeof import('../lib/permissions/repository')>(
    '../lib/permissions/repository'
  )
  return { ...actual }
})

// Mock feedback anti-spam module
vi.mock('../lib/feedback/anti-spam', () => ({
  detectSpam: vi.fn().mockResolvedValue({
    is_spam: false,
    reason: '',
    score: 0,
    metadata: { type: 'feedback', checks: ['rate_limit', 'duplicate', 'content'] },
  }),
  getAntiSpamConfig: vi.fn().mockResolvedValue({
    max_feedback_per_hour: 5,
    max_feedback_per_day: 20,
    min_time_between_feedback: 60,
    duplicate_threshold: 0.85,
    require_email: false,
    enable_content_filter: true,
    blocked_words: ['test', '测试', 'abc', '123', 'xxx', 'spam'],
  }),
  getSpamStatistics: vi.fn().mockResolvedValue({
    total_checks: 0,
    spam_detected: 0,
    spam_rate: 0,
    blocked_users: 0,
    recent_spam: [],
  }),
}))

// ============================================================================
// MOCK THE COLLABORATION MODULES
// ============================================================================

// Mock collaboration/rooms
vi.mock('../lib/collaboration/rooms', () => ({
  generateTaskRoomId: vi.fn((taskId: string) => `task:${taskId}`),
  generateProjectRoomId: vi.fn((projectId: string) => `project:${projectId}`),
  generateDocumentRoomId: vi.fn((docId: string) => `document:${docId}`),
  generateChatRoomId: vi.fn((chatId: string) => `chat:${chatId}`),
  parseRoomId: vi.fn((roomId: string) => {
    const parts = roomId.split(':')
    if (parts.length !== 2) return null
    const validTypes = ['task', 'project', 'document', 'chat']
    if (!validTypes.includes(parts[0])) return null
    return { type: parts[0], id: parts[1] }
  }),
  isTaskRoom: vi.fn((roomId: string) => roomId.startsWith('task:')),
  isProjectRoom: vi.fn((roomId: string) => roomId.startsWith('project:')),
  isDocumentRoom: vi.fn((roomId: string) => roomId.startsWith('document:')),
  isChatRoom: vi.fn((roomId: string) => roomId.startsWith('chat:')),
  isValidRoomType: vi.fn((type: string) => ['task', 'project', 'document', 'chat'].includes(type)),
  validateRoomOptions: vi.fn((options: RoomOptions) => {
    if (!options || !options.type) {
      return { valid: false, error: 'Room type is required' }
    }
    if (!options.documentId || options.documentId === '') {
      return { valid: false, error: 'Document ID is required' }
    }
    if (!['task', 'project', 'document', 'chat'].includes(options.type)) {
      return { valid: false, error: `Invalid room type: ${options.type}` }
    }
    if (options.documentId.length > 100) {
      return { valid: false, error: 'Document ID too long' }
    }
    return { valid: true, error: undefined }
  }),
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  getRoomInfo: vi.fn(),
  getRoomUsers: vi.fn(),
  updateRoomActivity: vi.fn(),
}))

// Singleton instance for collaboration manager mock
let mockCollaborationManagerSingleton: ReturnType<typeof vi.fn> | ((...args: unknown[]) => unknown) | null = null

// Mock collaboration/manager
vi.mock('../lib/collaboration/manager', () => ({
  applyOperation: vi.fn(
    (state: CollaborationState, operation: Operation, userId?: string, userName?: string) => {
      let newContent = state.content
      const pos = operation.position ?? 0
      if (operation.type === 'insert') {
        newContent = state.content.slice(0, pos) + operation.content + state.content.slice(pos)
      } else if (operation.type === 'delete') {
        newContent =
          state.content.slice(0, pos) + state.content.slice(pos + (operation.length || 0))
      }
      const newOperation = {
        id: `op-${Date.now()}`,
        userId: userId || 'unknown',
        userName: userName || 'Unknown',
        timestamp: new Date(),
        operation,
        revision: state.revision + 1,
      }
      return {
        ...state,
        content: newContent,
        revision: state.revision + 1,
        operations: [...state.operations, newOperation],
      }
    }
  ),
  transform: vi.fn((op1: Operation, op2: Operation) => {
    // Simple transformation logic based on test expectations
    if (op2.type === 'retain' && op1.type === 'insert') {
      // Insert at position 5, retain at position 10 should shift retain to 11
      if ((op1.position ?? 0) <= (op2.position ?? 0)) {
        return {
          op1,
          op2: { ...op2, position: (op2.position ?? 0) + (op1.content?.length || 0) },
        }
      }
    }
    // If op2 is insert and position >= op1.position, shift it
    if (op2.type === 'insert' && (op2.position ?? 0) >= (op1.position ?? 0)) {
      return {
        op1,
        op2: { ...op2, position: (op2.position ?? 0) + (op1.content?.length || 0) },
      }
    }
    return { op1, op2 }
  }),
  composeOperations: vi.fn((...ops: Operation[]) => {
    // Handle operation composition based on test expectations
    if (ops.length === 2) {
      const [op1, op2] = ops
      // If first is retain and second is insert, combine them
      if (op1.type === 'retain' && op2.type === 'insert') {
        return {
          type: 'insert',
          position: (op1.position || 0) + (op2.position || 0),
          content: op2.content || '',
        }
      }
      // If both are insert, return the second with combined position
      if (op1.type === 'insert' && op2.type === 'insert') {
        return {
          type: 'insert',
          position: (op1.content?.length || 0) + (op2.position || 0),
          content: op2.content || '',
        }
      }
    }
    // Fallback: return the first operation
    return ops[0]
  }),
  getCollaborationManager: vi.fn(() => {
    if (!mockCollaborationManagerSingleton) {
      mockCollaborationManagerSingleton = vi.fn(() => ({
        createDocument: vi.fn(),
        getDocument: vi.fn(),
        updateDocument: vi.fn(),
        deleteDocument: vi.fn(),
        getUserPresence: vi.fn(),
        updateUserPresence: vi.fn(),
        broadcastPresence: vi.fn(),
        getCursor: vi.fn(),
        updateCursor: vi.fn(),
        broadcastCursor: vi.fn(),
      }))
    }
    return (mockCollaborationManagerSingleton as any)()
  }),
  resetCollaborationManager: vi.fn(() => {
    mockCollaborationManagerSingleton = null
  }),
}))

// Mock collaboration/server
vi.mock('../lib/collaboration/server', () => ({
  getCollaborationServer: vi.fn(),
  startCollaborationServer: vi.fn(),
  stopCollaborationServer: vi.fn(),
}))

// ============================================================================
// EXPORTED HELPERS FOR TESTS
// ============================================================================

/**
 * Get the current state of all tables
 */
export function getDbTables(): Map<string, DbRow[]> {
  return dbTables
}

/**
 * Get data from a specific table
 */
export function getTableData(tableName: string): DbRow[] {
  return getTable(tableName)
}

/**
 * Insert data directly into a table (for test setup)
 */
export function insertTestRow(tableName: string, data: DbRow): DbRow {
  const table = getTable(tableName)
  if (!data.id) {
    data.id = generateId(tableName)
  }
  table.push({ ...data })
  return data
}

/**
 * Clear all tables (for test cleanup)
 */
export function clearAllTables(): void {
  for (const tableName of dbTables.keys()) {
    dbTables.set(tableName, [])
  }
}

/**
 * Clear a specific table
 */
export function clearTable(tableName: string): void {
  if (dbTables.has(tableName)) {
    dbTables.set(tableName, [])
  }
}

/**
 * Get the mock database instance
 */
export function getMockDb(): MockDatabaseConnection {
  return mockDb
}

// ============================================================================
// RESET BETWEEN TESTS
// ============================================================================

beforeEach(() => {
  // Clear all mock call history but keep the data
  vi.clearAllMocks()

  // Reset database to clean state for each test
  clearAllTables()

  // Re-initialize tables
  dbTables.set('users', [])
  dbTables.set('user_tokens', [])
  dbTables.set('password_reset_tokens', [])
  dbTables.set('feedbacks', [])
  dbTables.set('spam_detection_logs', [])
  // Auth test tables
  dbTables.set('token_blacklist', [])
  dbTables.set('audit_logs', [])
  // RBAC 默认角色（clearAllTables 会清空，必须补回）
  seedRbacRoles()

  // clearAllTables() 会清空所有表，因此 plans 的种子数据必须在这里补回，
  // 否则每个用例开始时 plans 表都是空的 →
  // BillingService.getPlan() 恒返回 null → 'Plan not found'。
  // 种子内容与 src/lib/db/migrations/001_multi_tenant.sql 保持一致。
  dbTables.set('plans', [
    {
      id: 'plan_starter',
      name: 'Starter',
      type: 'subscription',
      price_monthly: 99,
      price_yearly: 990,
      features: JSON.stringify({ agents: 5, workflows: 10, storage: 10, support: 'email' }),
      limits: JSON.stringify({ ai_calls: 1000, workflow_runs: 100, storage_gb: 10 }),
    },
    {
      id: 'plan_professional',
      name: 'Professional',
      type: 'subscription',
      price_monthly: 299,
      price_yearly: 2990,
      features: JSON.stringify({ agents: 50, workflows: 100, storage: 100, support: 'priority' }),
      limits: JSON.stringify({ ai_calls: 10000, workflow_runs: 1000, storage_gb: 100 }),
    },
    {
      id: 'plan_enterprise',
      name: 'Enterprise',
      type: 'subscription',
      price_monthly: 999,
      price_yearly: 9990,
      features: JSON.stringify({ agents: 'unlimited', workflows: 'unlimited', storage: 'unlimited', support: '24/7' }),
      limits: JSON.stringify({ ai_calls: 'unlimited', workflow_runs: 'unlimited', storage_gb: 'unlimited' }),
    },
  ])
})
