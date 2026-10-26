/**
 * @fileoverview Search index manager
 * @description Manages search indices for different entity types (tasks, projects, members, agents)
 */

import Fuse, { type IFuseOptions } from 'fuse.js'
import type {
  SearchIndexConfig,
  SearchIndexMetadata,
  TaskEntity,
  ProjectEntity,
  MemberEntity,
  AgentEntity,
  UnifiedEntity,
} from './types'

// ============================================================================
// Search Index Manager
// ============================================================================

export class SearchIndexManager {
  private indices: Map<string, Fuse<UnifiedEntity>> = new Map()
  private indexMetadata: Map<string, SearchIndexMetadata> = new Map()
  private indexConfigs: Map<string, SearchIndexConfig> = new Map()

  /**
   * Initialize all search indices
   */
  async initialize(): Promise<void> {
    // Create default indices for each entity type
    this.createIndex({
      id: 'tasks',
      name: 'Tasks',
      fields: ['title', 'body', 'description', 'labels.name', 'assignee'],
      enabled: true,
    })

    this.createIndex({
      id: 'projects',
      name: 'Projects',
      fields: ['title', 'description', 'members', 'owner'],
      enabled: true,
    })

    this.createIndex({
      id: 'members',
      name: 'Team Members',
      fields: ['login', 'displayName', 'email', 'role'],
      enabled: true,
    })

    this.createIndex({
      id: 'agents',
      name: 'AI Agents',
      fields: ['title', 'description', 'agentType', 'capabilities'],
      enabled: true,
    })
  }

  /**
   * Create a new search index
   */
  createIndex(config: SearchIndexConfig): void {
    const { id, name, fields, enabled = true, fuseOptions } = config

    const defaultOptions: IFuseOptions<UnifiedEntity> = {
      keys: fields,
      threshold: fuseOptions?.threshold ?? 0.3,
      distance: fuseOptions?.distance ?? 100,
      minMatchCharLength: fuseOptions?.minMatchCharLength ?? 2,
      includeScore: true,
      includeMatches: true,
      ignoreLocation: true,
      useExtendedSearch: true,
    }

    const fuse = new Fuse<UnifiedEntity>([], defaultOptions)

    this.indices.set(id, fuse)
    this.indexConfigs.set(id, config)
    this.indexMetadata.set(id, {
      id,
      name,
      itemCount: 0,
      lastUpdated: Date.now(),
      fields,
      enabled,
    })
  }

  /**
   * Update index with new items
   */
  updateIndex(id: string, items: UnifiedEntity[]): void {
    const index = this.indices.get(id)
    const metadata = this.indexMetadata.get(id)

    if (!index || !metadata) {
      throw new Error(`Index '${id}' not found`)
    }

    index.setCollection(items)
    metadata.itemCount = items.length
    metadata.lastUpdated = Date.now()
  }

  /**
   * Add or update a single item in an index
   */
  upsertItem(id: string, item: UnifiedEntity): void {
    const index = this.indices.get(id)
    const metadata = this.indexMetadata.get(id)

    if (!index || !metadata) {
      throw new Error(`Index '${id}' not found`)
    }

    // This is a limitation - we should track items in a separate map
    const currentItems: UnifiedEntity[] = []

    // Check if item exists
    const existingIndex = currentItems.findIndex(doc => doc.id === item.id)

    if (existingIndex >= 0) {
      // Update existing item
      currentItems[existingIndex] = item
    } else {
      // Add new item
      currentItems.push(item)
    }

    // Update index
    index.setCollection(currentItems)
    metadata.itemCount = currentItems.length
    metadata.lastUpdated = Date.now()
  }

  /**
   * Remove an item from an index
   */
  removeItem(id: string, itemId: string): void {
    const index = this.indices.get(id)
    const metadata = this.indexMetadata.get(id)

    if (!index || !metadata) {
      throw new Error(`Index '${id}' not found`)
    }

    const currentItems: UnifiedEntity[] = []
    const filteredItems = currentItems.filter(doc => doc.id !== itemId)

    index.setCollection(filteredItems)
    metadata.itemCount = filteredItems.length
    metadata.lastUpdated = Date.now()
  }

  /**
   * Remove an entire index
   */
  removeIndex(id: string): void {
    this.indices.delete(id)
    this.indexMetadata.delete(id)
    this.indexConfigs.delete(id)
  }

  /**
   * Get an index by ID
   */
  getIndex(id: string): Fuse<UnifiedEntity> | undefined {
    return this.indices.get(id)
  }

  /**
   * Get all indices
   */
  getAllIndices(): Map<string, Fuse<UnifiedEntity>> {
    return new Map(this.indices)
  }

  /**
   * Get index metadata
   */
  getIndexMetadata(id: string): SearchIndexMetadata | undefined {
    return this.indexMetadata.get(id)
  }

  /**
   * Get all index metadata
   */
  getAllIndexMetadata(): SearchIndexMetadata[] {
    return Array.from(this.indexMetadata.values())
  }

  /**
   * Get index configuration
   */
  getIndexConfig(id: string): SearchIndexConfig | undefined {
    return this.indexConfigs.get(id)
  }

  /**
   * Enable or disable an index
   */
  setIndexEnabled(id: string, enabled: boolean): void {
    const metadata = this.indexMetadata.get(id)
    if (metadata) {
      metadata.enabled = enabled
    }
  }

  /**
   * Check if an index is enabled
   */
  isIndexEnabled(id: string): boolean {
    const metadata = this.indexMetadata.get(id)
    return metadata?.enabled ?? false
  }

  /**
   * Get total item count across all indices
   */
  getTotalItemCount(): number {
    return Array.from(this.indexMetadata.values()).reduce(
      (total, meta) => total + (meta.enabled ? meta.itemCount : 0),
      0
    )
  }

  /**
   * Clear all indices
   */
  clearAll(): void {
    for (const [id, index] of this.indices) {
      index.setCollection([])
      const metadata = this.indexMetadata.get(id)
      if (metadata) {
        metadata.itemCount = 0
        metadata.lastUpdated = Date.now()
      }
    }
  }

  /**
   * Rebuild an index from scratch
   */
  async rebuildIndex(id: string, items: UnifiedEntity[]): Promise<void> {
    const config = this.indexConfigs.get(id)
    if (!config) {
      throw new Error(`Index '${id}' configuration not found`)
    }

    // Recreate the index
    this.createIndex(config)

    // Add items
    this.updateIndex(id, items)
  }

  /**
   * Get index statistics
   */
  getStatistics(): {
    totalIndices: number
    enabledIndices: number
    totalItems: number
    indices: Array<{
      id: string
      name: string
      itemCount: number
      enabled: boolean
      lastUpdated: number
    }>
  } {
    const enabledIndices = Array.from(this.indexMetadata.values()).filter(meta => meta.enabled)

    return {
      totalIndices: this.indices.size,
      enabledIndices: enabledIndices.length,
      totalItems: this.getTotalItemCount(),
      indices: Array.from(this.indexMetadata.values()).map(meta => ({
        id: meta.id,
        name: meta.name,
        itemCount: meta.itemCount,
        enabled: meta.enabled,
        lastUpdated: meta.lastUpdated,
      })),
    }
  }
}

// ============================================================================
// Global index manager instance
// ============================================================================

let globalIndexManager: SearchIndexManager | null = null

/**
 * Get or create the global index manager instance
 */
export function getGlobalIndexManager(recreate = false): SearchIndexManager {
  if (!globalIndexManager || recreate) {
    globalIndexManager = new SearchIndexManager()
  }
  return globalIndexManager
}

/**
 * Reset the global index manager instance
 */
export function resetGlobalIndexManager(): void {
  globalIndexManager = null
}

// ============================================================================
// Utility functions for entity conversion
// ============================================================================

/**
 * GitHub issue interface
 */
interface GitHubIssue {
  id?: number | string
  number?: number
  title: string
  body?: string
  description?: string
  state: 'open' | 'closed'
  assignee?: {
    login: string
  }
  labels?: Array<{
    name: string
    color?: string
  }>
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

/**
 * Project input interface
 */
interface ProjectInput {
  id?: string | number
  _id?: string
  name?: string
  title?: string
  description?: string
  status?: string
  owner?: {
    login: string
  }
  ownerId?: string
  members?: Array<{
    login: string
    id?: string | number
  }>
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
  [key: string]: unknown
}

/**
 * User input interface
 */
interface UserInput {
  id?: string | number
  _id?: string
  login?: string
  username?: string
  name?: string
  displayName?: string
  avatar_url?: string
  avatarUrl?: string
  role?: string
  email?: string
  [key: string]: unknown
}

/**
 * Agent input interface
 */
interface AgentInput {
  id?: string | number
  _id?: string
  name?: string
  title?: string
  description?: string
  status?: string
  type?: string
  agentType?: string
  capabilities?: string[]
  lastActive?: string
  last_active?: string
  [key: string]: unknown
}

/**
 * Convert GitHub issue to task entity
 */
export function convertIssueToTaskEntity(issue: GitHubIssue): TaskEntity {
  return {
    id: String(issue.id || issue.number),
    type: 'task',
    name: issue.title,
    title: issue.title,
    description: issue.body || issue.description || '',
    status: issue.state === 'open' ? 'open' : 'closed',
    priority: determinePriority(issue),
    assignee: issue.assignee?.login,

    labels:
      issue.labels?.map(label => ({
        name: label.name,
        color: label.color || '#000000',
      })) || [],
    createdAt: issue.created_at || new Date().toISOString(),
    updatedAt: issue.updated_at || new Date().toISOString(),
  }
}

/**
 * Convert project data to project entity
 */
export function convertToProjectEntity(project: ProjectInput): ProjectEntity {
  return {
    id: String(project.id || project._id || ''),
    type: 'project',
    name: project.name || project.title || '',
    title: project.name || project.title || '',
    description: project.description || '',

    status: (project.status as 'active' | 'archived' | 'completed') || 'active',
    owner: project.owner?.login || String(project.ownerId || ''),

    members: project.members?.map(m => String(m.login || m.id)) || [],
    createdAt: project.createdAt || project.created_at || '',
    updatedAt: project.updatedAt || project.updated_at || '',
  }
}

/**
 * Convert user data to member entity
 */
export function convertToMemberEntity(user: UserInput): MemberEntity {
  return {
    id: String(user.id || user._id || ''),
    type: 'member',
    name: user.login || user.username || '',
    login: user.login || user.username || '',
    displayName: user.name || user.displayName || '',
    avatarUrl: user.avatar_url || user.avatarUrl || '',
    role: user.role || 'member',
    email: user.email || '',
  }
}

/**
 * Convert agent data to agent entity
 */
export function convertToAgentEntity(agent: AgentInput): AgentEntity {
  return {
    id: String(agent.id || agent._id || ''),
    type: 'agent',
    name: agent.name || agent.title || '',
    title: agent.name || agent.title || '',
    description: agent.description || '',

    status: (agent.status as 'active' | 'inactive' | 'maintenance') || 'active',
    agentType: agent.type || agent.agentType || '',
    capabilities: (agent.capabilities as string[]) || [],
    lastActive: agent.lastActive || agent.last_active || '',
  }
}

/**
 * Determine task priority from labels
 */
function determinePriority(issue: GitHubIssue): 'high' | 'medium' | 'low' {
  if (!issue.labels || issue.labels.length === 0) {
    return 'medium'
  }

  const priorityLabels = issue.labels.map(l => l.name.toLowerCase())

  if (priorityLabels.some((l: string) => l.includes('critical') || l.includes('high'))) {
    return 'high'
  }
  if (priorityLabels.some((l: string) => l.includes('low'))) {
    return 'low'
  }
  return 'medium'
}
