/**
 * @fileoverview SQLite Full-Text Search (FTS) Index Manager
 * @description Provides persistent full-text search using SQLite FTS5 for large datasets
 */

import Database from 'better-sqlite3'
import { LRUCache } from '@/lib/cache/lru-cache'
import type {
  UnifiedEntity,
  SearchIndexConfig,
  SearchIndexMetadata,
} from './types'
import type { SearchResult } from '@/types/search-filter'

// ============================================================================
// Types
// ============================================================================

/**
 * FTS index item
 */
interface FTSIndexItem {
  id: string
  entityId: string
  entityType: UnifiedEntity['type']
  title: string
  description?: string
  content?: string
  tags?: string
  metadata?: string
  score?: number
}

/**
 * FTS search options
 */
export interface FTSIndexOptions {
  /** Database file path */
  dbPath?: string
  /** Enable in-memory database for testing */
  inMemory?: boolean
  /** Cache size for query results */
  cacheSize?: number
}

// ============================================================================
// SQLite FTS Manager
// ============================================================================

export class SQLiteFTSManager {
  private db: Database.Database
  private cache: LRUCache<SearchResult<UnifiedEntity>[]>
  private indices: Map<string, SearchIndexMetadata> = new Map()
  private initialized = false

  constructor(options: FTSIndexOptions = {}) {
    const dbPath = options.dbPath || ':memory:'
    const db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')
    db.pragma('cache_size = -64000') // 64MB cache

    this.db = db
    this.cache = new LRUCache(options.cacheSize || 100)
  }

  /**
   * Initialize FTS tables
   */
  initialize(): void {
    if (this.initialized) return

    // Create main FTS5 virtual table
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
        id,
        entityId,
        entityType,
        title,
        description,
        content,
        tags,
        metadata,
        tokenize = 'porter unicode61'
      )
    `)

    // Create external content table for metadata
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS index_metadata (
        id TEXT PRIMARY KEY,
        entityId TEXT NOT NULL,
        entityType TEXT NOT NULL,
        lastUpdated INTEGER NOT NULL,
        data TEXT NOT NULL
      )
    `)

    // Create indexes for faster filtering
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_entity_type ON index_metadata(entityType);
      CREATE INDEX IF NOT EXISTS idx_last_updated ON index_metadata(lastUpdated);
    `)

    this.initialized = true
  }

  /**
   * Create or rebuild an FTS index
   */
  createIndex(config: SearchIndexConfig, items: UnifiedEntity[]): void {
    this.initialize()

    // Remove existing items for this index
    const deleteStmt = this.db.prepare('DELETE FROM search_index WHERE id = ?')
    const deleteMetaStmt = this.db.prepare('DELETE FROM index_metadata WHERE id = ?')

    this.db.transaction(() => {
      // Clear old data
      const existingIds = this.db
        .prepare('SELECT entityId FROM index_metadata WHERE id = ?')
        .bind(config.id)
        .all() as Array<{ entityId: string }>

      for (const row of existingIds) {
        deleteStmt.run(row.entityId)
        deleteMetaStmt.run(row.entityId)
      }

      // Insert new items
      const insertStmt = this.db.prepare(`
        INSERT INTO search_index (id, entityId, entityType, title, description, content, tags, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const insertMetaStmt = this.db.prepare(`
        INSERT INTO index_metadata (id, entityId, entityType, lastUpdated, data)
        VALUES (?, ?, ?, ?, ?)
      `)

      for (const item of items) {
        const ftsItem = this.entityToFTSItem(config.id, item)

        insertStmt.run(
          ftsItem.id,
          ftsItem.entityId,
          ftsItem.entityType,
          ftsItem.title,
          ftsItem.description || null,
          ftsItem.content || null,
          ftsItem.tags || null,
          ftsItem.metadata || null
        )

        insertMetaStmt.run(
          ftsItem.id,
          ftsItem.entityId,
          ftsItem.entityType,
          Date.now(),
          JSON.stringify(item)
        )
      }
    })()

    // Store index metadata
    this.indices.set(config.id, {
      id: config.id,
      name: config.name,
      itemCount: items.length,
      lastUpdated: Date.now(),
      fields: config.fields,
      enabled: config.enabled ?? true,
    })
  }

  /**
   * Update index with new or modified items
   */
  upsertItems(indexId: string, items: UnifiedEntity[]): void {
    if (!this.initialized) this.initialize()

    // FTS5 virtual tables do not support ON CONFLICT DO UPDATE (UPSERT).
    // Use DELETE + INSERT to stay idempotent.
    const deleteFtsStmt = this.db.prepare('DELETE FROM search_index WHERE id = ?')

    const insertStmt = this.db.prepare(`
      INSERT INTO search_index (id, entityId, entityType, title, description, content, tags, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertMetaStmt = this.db.prepare(`
      INSERT INTO index_metadata (id, entityId, entityType, lastUpdated, data)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        lastUpdated = excluded.lastUpdated,
        data = excluded.data
    `)

    this.db.transaction(() => {
      for (const item of items) {
        const ftsItem = this.entityToFTSItem(indexId, item)

        // Idempotent replace: FTS5 has no UPSERT support.
        deleteFtsStmt.run(ftsItem.id)

        insertStmt.run(
          ftsItem.id,
          ftsItem.entityId,
          ftsItem.entityType,
          ftsItem.title,
          ftsItem.description || null,
          ftsItem.content || null,
          ftsItem.tags || null,
          ftsItem.metadata || null
        )

        insertMetaStmt.run(
          ftsItem.id,
          ftsItem.entityId,
          ftsItem.entityType,
          Date.now(),
          JSON.stringify(item)
        )
      }
    })()

    // Update metadata
    const metadata = this.indices.get(indexId)
    if (metadata) {
      metadata.itemCount = this.countItems(indexId)
      metadata.lastUpdated = Date.now()
    }
  }

  /**
   * Remove items from index
   */
  removeItems(indexId: string, entityIds: string[]): void {
    if (!this.initialized || entityIds.length === 0) return

    const deleteStmt = this.db.prepare('DELETE FROM search_index WHERE id = ?')
    const deleteMetaStmt = this.db.prepare('DELETE FROM index_metadata WHERE id = ?')

    this.db.transaction(() => {
      for (const entityId of entityIds) {
        const id = `${indexId}:${entityId}`
        deleteStmt.run(id)
        deleteMetaStmt.run(id)
      }
    })()

    // Update metadata
    const metadata = this.indices.get(indexId)
    if (metadata) {
      metadata.itemCount = this.countItems(indexId)
      metadata.lastUpdated = Date.now()
    }
  }

  /**
   * Perform FTS search
   */
  search(
    query: string,
    options: {
      indices?: string[]
      limit?: number
      offset?: number
      sortBy?: 'relevance' | 'date' | 'hybrid'
    } = {}
  ): SearchResult<UnifiedEntity>[] {
    if (!this.initialized) this.initialize()

    const { indices: targetIndices, limit = 50, offset = 0, sortBy = 'relevance' } = options

    // 空查询语义：
    // - 未指定索引范围 => 返回空数组（纯 FTS 引擎无“浏览”语义）
    // - 指定了索引范围 => 进入 browse 模式，列出该范围内的全部条目
    if (!query.trim()) {
      if (!targetIndices || targetIndices.length === 0) return []
      return this.browse(targetIndices, limit, offset, sortBy)
    }

    // Check cache
    const cacheKey = `fts:${query}:${targetIndices?.join(',') || 'all'}:${sortBy}:${limit}:${offset}`
    const cached = this.cache.get(cacheKey)
    if (cached) {
      return cached
    }

    // Build FTS query
    const ftsQuery = this.buildFTSQuery(query)

    // Get entity types to search
    let entityTypes: UnifiedEntity['type'][] = ['task', 'project', 'member', 'agent']
    if (targetIndices) {
      entityTypes = targetIndices.map(id => this.mapIndexToEntityType(id))
    }

    // Build SQL query
    let sql = `
      SELECT si.*, im.data, si.rank as fts_score
      FROM search_index si
      INNER JOIN index_metadata im ON si.id = im.id
      WHERE search_index MATCH ?
    `

    const params: unknown[] = [ftsQuery]

    if (targetIndices && targetIndices.length > 0) {
      const placeholders = targetIndices.map(() => '?').join(',')
      sql += ` AND si.entityType IN (${placeholders})`
      params.push(...entityTypes)
    }

    // Apply sorting
    if (sortBy === 'date') {
      sql += ' ORDER BY im.lastUpdated DESC'
    } else if (sortBy === 'hybrid') {
      // Hybrid: FTS score + recency boost
      sql += ' ORDER BY (fts_score * 10 + (im.lastUpdated / 10000000)) DESC'
    } else {
      // relevance (default FTS ranking)
      sql += ' ORDER BY fts_score DESC'
    }

    sql += ' LIMIT ? OFFSET ?'
    params.push(limit, offset)

    // Execute query
    const rows = this.db.prepare(sql).bind(...params).all() as Array<
      FTSIndexItem & { data: string; fts_score: number }
    >

    // Convert to search results
    const results: SearchResult<UnifiedEntity>[] = rows.map(row => {
      const entity = JSON.parse(row.data) as UnifiedEntity

      return {
        item: entity,
        matchedFields: this.extractMatchedFields(row, query),
        highlights: this.generateHighlights(row, query),
        score: row.fts_score,
      }
    })

    // Cache results
    this.cache.set(cacheKey, results)

    return results
  }

  /**
   * 列出指定索引范围内的全部条目（browse 模式）
   * 用于空查询 + 显式索引范围的场景
   */
  private browse(
    targetIndices: string[],
    limit: number,
    offset: number,
    sortBy: 'relevance' | 'date' | 'hybrid'
  ): SearchResult<UnifiedEntity>[] {
    const entityTypes = targetIndices.map(id => this.mapIndexToEntityType(id))
    const placeholders = entityTypes.map(() => '?').join(',')

    let sql = `
      SELECT si.entityId, si.entityType, si.title, si.description, si.content, si.tags, im.data
      FROM search_index si
      INNER JOIN index_metadata im ON si.id = im.id
      WHERE si.entityType IN (${placeholders})
    `

    const params: unknown[] = [...entityTypes]

    if (sortBy === 'date' || sortBy === 'hybrid') {
      sql += ' ORDER BY im.lastUpdated DESC, si.id ASC'
    } else {
      sql += ' ORDER BY si.id ASC'
    }

    sql += ' LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const rows = this.db.prepare(sql).bind(...params).all() as Array<FTSIndexItem & { data: string }>

    return rows.map(row => {
      const entity = JSON.parse(row.data) as UnifiedEntity
      return {
        item: entity,
        matchedFields: [],
        highlights: [],
        score: 1,
      }
    })
  }

  /**
   * 索引 ID -> 实体类型映射
   */
  private mapIndexToEntityType(indexId: string): UnifiedEntity['type'] {
    switch (indexId) {
      case 'tasks':
        return 'task'
      case 'projects':
        return 'project'
      case 'members':
        return 'member'
      case 'agents':
        return 'agent'
      default: {
        // 去掉结尾的 's' 作为兜底（'all' 之类无法推断时返回 task 以保持向后兼容）
        const guess = indexId.replace(/s$/, '') as UnifiedEntity['type']
        return ['task', 'project', 'member', 'agent'].includes(guess) ? guess : 'task'
      }
    }
  }

  /**
   * Get autocomplete suggestions from FTS
   */
  getAutocompleteSuggestions(
    prefix: string,
    options: {
      limit?: number
      entityTypes?: UnifiedEntity['type'][]
    } = {}
  ): Array<{ text: string; type: UnifiedEntity['type']; entity: UnifiedEntity }> {
    if (!this.initialized) this.initialize()
    if (!prefix.trim()) return []

    const { limit = 10, entityTypes } = options

    let sql = `
      SELECT si.title AS title, si.entityType AS entityType, si.entityId AS entityId, im.data AS data
      FROM search_index si
      INNER JOIN index_metadata im ON si.id = im.id
      WHERE search_index MATCH ?
    `

    const params: unknown[] = [`${prefix.replace(/["*()]/g, ' ').trim()}*`]

    if (entityTypes && entityTypes.length > 0) {
      const placeholders = entityTypes.map(() => '?').join(',')
      sql += ` AND si.entityType IN (${placeholders})`
      params.push(...entityTypes)
    }

    sql += ' LIMIT ?'
    params.push(limit)

    const rows = this.db.prepare(sql).bind(...params).all() as Array<{
      title: string
      entityType: UnifiedEntity['type']
      entityId: string
      data: string
    }>

    return rows.map(row => ({
      text: row.title,
      type: row.entityType,
      entity: JSON.parse(row.data) as UnifiedEntity,
    }))
  }

  /**
   * Count items in an index
   */
  private countItems(indexId: string): number {
    const count = this.db
      .prepare("SELECT COUNT(*) as count FROM index_metadata WHERE id LIKE ? ESCAPE '\\'")
      .get(`${indexId.replace(/[\\%_]/g, '\\$&')}:%`) as { count: number }

    return count?.count || 0
  }

  /**
   * Convert entity to FTS item
   */
  private entityToFTSItem(indexId: string, entity: UnifiedEntity): FTSIndexItem {
    const id = `${indexId}:${entity.id}`

    let title = ''
    let description: string | undefined
    let content: string | undefined
    let tags: string | undefined

    switch (entity.type) {
      case 'task':
        title = entity.title || entity.name
        description = entity.description
        content = entity.keywords?.join(' ')
        tags = entity.labels?.map(l => l.name).join(' ')
        break

      case 'project':
        title = entity.title || entity.name
        description = entity.description
        content = entity.members?.join(' ')
        break

      case 'member':
        title = entity.login || entity.displayName || entity.name
        description = entity.role
        content = entity.email
        break

      case 'agent':
        title = entity.title || entity.name
        description = entity.description
        content = entity.capabilities?.join(' ')
        tags = entity.agentType
        break
    }

    return {
      id,
      entityId: entity.id,
      entityType: entity.type,
      title,
      description,
      content,
      tags,
      metadata: JSON.stringify({ updatedAt: entity.updatedAt || entity.createdAt }),
    }
  }

  /**
   * Build FTS query with operators
   */
  private buildFTSQuery(query: string): string {
    // Escape special characters
    const escaped = query.replace(/[()"*]/g, ' ')

    // Simple query - just search for words
    return escaped.trim()
  }

  /**
   * Extract matched fields from FTS result
   */
  private extractMatchedFields(row: FTSIndexItem, query: string): string[] {
    const matched: string[] = []
    const queryLower = query.toLowerCase()

    if (row.title.toLowerCase().includes(queryLower)) {
      matched.push('title')
    }
    if (row.description?.toLowerCase().includes(queryLower)) {
      matched.push('description')
    }
    if (row.content?.toLowerCase().includes(queryLower)) {
      matched.push('content')
    }
    if (row.tags?.toLowerCase().includes(queryLower)) {
      matched.push('tags')
    }

    return matched
  }

  /**
   * Generate text highlights
   */
  private generateHighlights(row: FTSIndexItem, query: string): SearchResult['highlights'] {
    const highlights: SearchResult['highlights'] = []
    const queryLower = query.toLowerCase()

    const addHighlight = (field: string, text: string | undefined) => {
      if (!text) return

      const index = text.toLowerCase().indexOf(queryLower)
      if (index !== -1) {
        const start = Math.max(0, index - 20)
        const end = Math.min(text.length, index + query.length + 20)
        highlights.push({
          field,
          text: text.slice(start, end),
          start,
          end,
        })
      }
    }

    addHighlight('title', row.title)
    addHighlight('description', row.description)
    addHighlight('content', row.content)

    return highlights
  }

  /**
   * Get index statistics
   */
  getStatistics(): {
    totalItems: number
    indices: number
    cacheSize: number
  } {
    if (!this.initialized) {
      return { totalItems: 0, indices: 0, cacheSize: 0 }
    }

    const totalItems =
      this.db.prepare('SELECT COUNT(*) as count FROM search_index').get() as { count: number }

    return {
      totalItems: totalItems.count || 0,
      indices: this.indices.size,
      cacheSize: this.cache.size,
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close()
    this.initialized = false
  }

  /**
   * Optimize FTS index
   */
  optimize(): void {
    if (!this.initialized) return

    // FTS5 的 optimize 是特殊命令，必须使用单引号字符串字面量
    this.db.exec("INSERT INTO search_index(search_index) VALUES('optimize')")
  }
}

// ============================================================================
// Global FTS manager instance
// ============================================================================

let globalFTSManager: SQLiteFTSManager | null = null

/**
 * Get or create global FTS manager instance
 */
export function getGlobalFTSManager(options?: FTSIndexOptions): SQLiteFTSManager {
  if (!globalFTSManager) {
    globalFTSManager = new SQLiteFTSManager(options)
    globalFTSManager.initialize()
  }
  return globalFTSManager
}

/**
 * Reset global FTS manager instance
 */
export function resetGlobalFTSManager(): void {
  if (globalFTSManager) {
    globalFTSManager.close()
  }
  globalFTSManager = null
}
