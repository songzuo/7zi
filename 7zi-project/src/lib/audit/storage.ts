/**
 * Audit Log Storage
 * In-memory storage with indexing for fast search
 */
import { AuditLogEntry, AuditSearchFilters, AuditSearchOptions, AuditSearchResult } from './types'

export class AuditLogStorage {
  private entries: Map<string, AuditLogEntry> = new Map()
  private indexes: {
    userId: Map<string, Set<string>>
    action: Map<string, Set<string>>
    resourceType: Map<string, Set<string>>
    tenantId: Map<string, Set<string>>
    status: Map<string, Set<string>>
    timestamp: AuditLogEntry[]
  }

  constructor() {
    this.indexes = {
      userId: new Map(),
      action: new Map(),
      resourceType: new Map(),
      tenantId: new Map(),
      status: new Map(),
      timestamp: [],
    }
  }

  /**
   * Add an audit log entry
   */
  add(entry: AuditLogEntry): void {
    this.entries.set(entry.id, entry)

    // Update indexes
    this.updateIndex('userId', entry.userId, entry.id)
    this.updateIndex('action', entry.action, entry.id)
    this.updateIndex('resourceType', entry.resourceType, entry.id)
    this.updateIndex('tenantId', entry.tenantId, entry.id)
    this.updateIndex('status', entry.status, entry.id)

    // Maintain sorted timestamp index
    this.insertSortedTimestamp(entry)
  }

  /**
   * Get an entry by ID
   */
  get(id: string): AuditLogEntry | undefined {
    return this.entries.get(id)
  }

  /**
   * Search audit logs with filters
   */
  search(filters: AuditSearchFilters, options: AuditSearchOptions = {}): AuditSearchResult {
    const { page = 1, pageSize = 50, sortBy = 'timestamp', sortOrder = 'desc' } = options

    // Start with all entries
    let candidateIds = new Set(this.entries.keys())

    // Apply filters using indexes
    if (filters.userId) {
      const userIdSet = this.indexes.userId.get(filters.userId)
      if (!userIdSet) return this.emptyResult(page, pageSize)
      candidateIds = this.intersect(candidateIds, userIdSet)
    }
    if (filters.action) {
      const actionSet = this.indexes.action.get(filters.action)
      if (!actionSet) return this.emptyResult(page, pageSize)
      candidateIds = this.intersect(candidateIds, actionSet)
    }
    if (filters.resourceType) {
      const resourceTypeSet = this.indexes.resourceType.get(filters.resourceType)
      if (!resourceTypeSet) return this.emptyResult(page, pageSize)
      candidateIds = this.intersect(candidateIds, resourceTypeSet)
    }
    if (filters.tenantId) {
      const tenantIdSet = this.indexes.tenantId.get(filters.tenantId)
      if (!tenantIdSet) return this.emptyResult(page, pageSize)
      candidateIds = this.intersect(candidateIds, tenantIdSet)
    }
    if (filters.status) {
      const statusSet = this.indexes.status.get(filters.status)
      if (!statusSet) return this.emptyResult(page, pageSize)
      candidateIds = this.intersect(candidateIds, statusSet)
    }

    // Get entries and apply remaining filters
    const entries = Array.from(candidateIds)
      .map(id => this.entries.get(id)!)
      .filter(entry => {
        // Time range filter
        if (filters.startDate && entry.timestamp < filters.startDate) return false
        if (filters.endDate && entry.timestamp > filters.endDate) return false

        // Username filter
        if (filters.username && entry.username !== filters.username) return false

        // Resource ID filter
        if (filters.resourceId && entry.resourceId !== filters.resourceId) return false

        // IP address filter
        if (filters.ipAddress && entry.ipAddress !== filters.ipAddress) return false

        // Full-text search
        if (filters.searchText) {
          const searchLower = filters.searchText.toLowerCase()
          const searchableText = [
            entry.action,
            entry.resourceType,
            entry.resourceId || '',
            entry.details ? JSON.stringify(entry.details) : '',
            entry.errorMessage || '',
          ]
            .join(' ')
            .toLowerCase()

          if (!searchableText.includes(searchLower)) return false
        }

        return true
      })

    // Sort
    entries.sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]

      if (aVal instanceof Date && bVal instanceof Date) {
        return sortOrder === 'asc'
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime()
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      return 0
    })

    // Pagination
    const total = entries.length
    const totalPages = Math.ceil(total / pageSize)
    const startIndex = (page - 1) * pageSize
    const paginatedEntries = entries.slice(startIndex, startIndex + pageSize)

    return {
      entries: paginatedEntries,
      total,
      page,
      pageSize,
      totalPages,
    }
  }

  /**
   * Get all entries (for export)
   */
  getAll(filters?: AuditSearchFilters): AuditLogEntry[] {
    if (!filters) {
      return Array.from(this.entries.values())
    }
    const result = this.search(filters, { page: 1, pageSize: Number.MAX_SAFE_INTEGER })
    return result.entries
  }

  /**
   * Get count of entries
   */
  count(filters?: AuditSearchFilters): number {
    if (!filters) {
      return this.entries.size
    }
    return this.search(filters, { page: 1, pageSize: 1 }).total
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear()
    this.indexes.userId.clear()
    this.indexes.action.clear()
    this.indexes.resourceType.clear()
    this.indexes.tenantId.clear()
    this.indexes.status.clear()
    this.indexes.timestamp = []
  }

  /**
   * Return empty search result
   */
  private emptyResult(page: number, pageSize: number): AuditSearchResult {
    return {
      entries: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    }
  }

  /**
   * Update an index
   */
  private updateIndex(
    indexName: keyof typeof this.indexes,
    value: string | undefined,
    entryId: string
  ): void {
    if (!value) return

    const index = this.indexes[indexName] as Map<string, Set<string>>
    if (!index.has(value)) {
      index.set(value, new Set())
    }
    index.get(value)!.add(entryId)
  }

  /**
   * Intersect two sets
   */
  private intersect(set1: Set<string>, set2?: Set<string>): Set<string> {
    if (!set2) return set1
    const result = new Set<string>()
    for (const item of set1) {
      if (set2.has(item)) {
        result.add(item)
      }
    }
    return result
  }

  /**
   * Insert entry into sorted timestamp index
   */
  private insertSortedTimestamp(entry: AuditLogEntry): void {
    // Binary search insertion
    let low = 0
    let high = this.indexes.timestamp.length

    while (low < high) {
      const mid = Math.floor((low + high) / 2)
      if (this.indexes.timestamp[mid].timestamp < entry.timestamp) {
        low = mid + 1
      } else {
        high = mid
      }
    }

    this.indexes.timestamp.splice(low, 0, entry)
  }
}
