/**
 * MCP Resource Management
 *
 * Provides resource access interface, subscription, notification, and caching:
 * - Resource access interface
 * - Resource subscription and notifications
 * - Resource caching strategies
 * - Resource change detection
 * - Resource metadata
 *
 * @module mcp/resources
 */

import { z } from 'zod'

/**
 * Resource type
 */
export type ResourceType = 'file' | 'directory' | 'database' | 'api' | 'memory' | 'cache' | 'stream'

/**
 * Resource content type
 */
export type ResourceContentType = 'text' | 'binary' | 'json' | 'yaml' | 'markdown' | 'html' | 'xml'

/**
 * Resource metadata
 */
export interface ResourceMetadata {
  /** Unique resource identifier */
  uri: string
  /** Resource name */
  name: string
  /** Resource type */
  type: ResourceType
  /** Content type */
  contentType: ResourceContentType
  /** Description */
  description?: string
  /** MIME type */
  mimeType?: string
  /** Size in bytes */
  size?: number
  /** Last modified timestamp */
  lastModified?: Date
  /** ETag for change detection */
  etag?: string
  /** Author */
  author?: string
  /** Tags */
  tags: string[]
  /** Whether resource is mutable */
  mutable: boolean
  /** Whether resource requires authentication */
  requiresAuth: boolean
  /** Rate limit per minute */
  rateLimit?: number
  /** Custom metadata */
  custom: Record<string, unknown>
}

/**
 * Resource content
 */
export interface ResourceContent {
  /** Text content (for text-based resources) */
  text?: string
  /** Binary data (base64 encoded) */
  binary?: string
  /** JSON data */
  json?: unknown
  /** URI to resource (if external) */
  uri?: string
  /** Metadata */
  metadata: ResourceMetadata
}

/**
 * Resource subscription filter
 */
export interface ResourceSubscriptionFilter {
  /** Resource URIs to watch (empty = watch all) */
  uris?: string[]
  /** Resource types to watch */
  types?: ResourceType[]
  /** Tags to filter by */
  tags?: string[]
  /** Pattern matching (glob) */
  pattern?: string
}

/**
 * Resource change event
 */
export interface ResourceChangeEvent {
  /** Event type */
  type: 'created' | 'updated' | 'deleted'
  /** Resource URI */
  uri: string
  /** Resource metadata */
  metadata: ResourceMetadata
  /** Previous value (for updates/deletions) */
  previous?: ResourceContent
  /** Current value (for creations/updates) */
  current?: ResourceContent
  /** Change timestamp */
  timestamp: Date
}

/**
 * Resource subscription
 */
export interface ResourceSubscription {
  /** Subscription ID */
  id: string
  /** Session ID */
  sessionId: string
  /** Filter criteria */
  filter: ResourceSubscriptionFilter
  /** Subscribed timestamp */
  subscribedAt: Date
  /** Last activity timestamp */
  lastActivity: Date
  /** Whether subscription is active */
  active: boolean
}

/**
 * Cache policy
 */
export type CachePolicy =
  | 'no-cache'
  | 'cache-first'
  | 'network-first'
  | 'stale-while-revalidate'
  | 'stale-if-error'

/**
 * Cache entry
 */
export interface CacheEntry {
  /** Resource content */
  content: ResourceContent
  /** Cached timestamp */
  cachedAt: Date
  /** Expires timestamp */
  expiresAt?: Date
  /** ETag */
  etag?: string
  /** Cache hit count */
  hitCount: number
  /** Cache policy */
  policy: CachePolicy
}

/**
 * Resource read options
 */
export interface ResourceReadOptions {
  /** Cache policy */
  cachePolicy?: CachePolicy
  /** Maximum age in milliseconds (for cache validation) */
  maxAge?: number
  /** Include metadata only (no content) */
  metadataOnly?: boolean
  /** Range (for large resources) */
  range?: { start: number; end: number }
  /** Context for request */
  context?: ResourceContext
}

/**
 * Resource context
 */
export interface ResourceContext {
  /** Session ID */
  sessionId: string
  /** User ID if authenticated */
  userId?: string
  /** Request ID */
  requestId: string
  /** Timestamp */
  timestamp: Date
}

/**
 * Resource provider interface
 */
export interface ResourceProvider {
  /** Provider name */
  name: string
  /** Supported resource types */
  supportedTypes: ResourceType[]
  /** Check if provider handles a URI */
  handles(uri: string): boolean
  /** List resources */
  list?(filter?: ResourceSubscriptionFilter): Promise<ResourceMetadata[]>
  /** Read resource */
  read(uri: string, options?: ResourceReadOptions): Promise<ResourceContent>
  /** Write resource (optional) */
  write?(uri: string, content: ResourceContent, options?: ResourceReadOptions): Promise<void>
  /** Delete resource (optional) */
  delete?(uri: string, options?: ResourceReadOptions): Promise<void>
  /** Watch for changes (optional) */
  watch?(uri: string, callback: (event: ResourceChangeEvent) => void): () => void
}

/**
 * MCP Resource Manager
 *
 * Manages resources with providers, caching, and subscriptions.
 */
export class MCPResourceManager {
  private providers: Map<string, ResourceProvider> = new Map()
  private cache: Map<string, CacheEntry> = new Map()
  private subscriptions: Map<string, ResourceSubscription> = new Map()
  private changeListeners: Map<string, Set<(event: ResourceChangeEvent) => void>> = new Map()
  private cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  }

  /**
   * Register a resource provider
   */
  registerProvider(provider: ResourceProvider): void {
    this.providers.set(provider.name, provider)
  }

  /**
   * Unregister a resource provider
   */
  unregisterProvider(name: string): boolean {
    return this.providers.delete(name)
  }

  /**
   * Get provider for URI
   */
  private getProvider(uri: string): ResourceProvider | undefined {
    for (const provider of this.providers.values()) {
      if (provider.handles(uri)) {
        return provider
      }
    }
    return undefined
  }

  /**
   * List all available resources
   */
  async list(filter?: ResourceSubscriptionFilter): Promise<ResourceMetadata[]> {
    const results: ResourceMetadata[] = []

    for (const provider of this.providers.values()) {
      if (provider.list) {
        const resources = await provider.list(filter)
        if (filter && filter.uris) {
          results.push(...resources.filter(r => filter.uris!.includes(r.uri)))
        } else if (filter && filter.types) {
          results.push(...resources.filter(r => filter.types!.includes(r.type)))
        } else if (filter && filter.tags) {
          results.push(...resources.filter(r => filter.tags!.some(t => r.tags.includes(t))))
        } else if (filter && filter.pattern) {
          const glob = await import('glob')
          const matches = await glob.glob(filter.pattern)
          results.push(...resources.filter(r => matches.includes(r.uri)))
        } else {
          results.push(...resources)
        }
      }
    }

    return results
  }

  /**
   * Read a resource
   */
  async read(uri: string, options: ResourceReadOptions = {}): Promise<ResourceContent> {
    const policy = options.cachePolicy || 'cache-first'
    const cacheKey = this.getCacheKey(uri, options)

    // Check cache for cache-first or stale-while-revalidate
    if (policy === 'cache-first' || policy === 'stale-while-revalidate') {
      const cached = this.cache.get(cacheKey)
      if (cached && !this.isCacheExpired(cached, options.maxAge)) {
        this.cacheStats.hits++
        if (policy === 'stale-while-revalidate') {
          // Revalidate in background
          this.revalidateResource(uri, options).catch(err => {
            console.error(`Cache revalidation failed for ${uri}:`, err)
          })
        }
        return cached.content
      }
    }

    // Cache miss or not using cache
    this.cacheStats.misses++

    // Fetch from provider
    const provider = this.getProvider(uri)
    if (!provider) {
      throw new MCPResourceError(`No provider found for URI: ${uri}`, 'NO_PROVIDER')
    }

    const content = await provider.read(uri, options)

    // Update cache (unless no-cache)
    if (policy !== 'no-cache') {
      this.cache.set(cacheKey, {
        content,
        cachedAt: new Date(),
        etag: content.metadata.etag,
        hitCount: 0,
        policy,
      })

      // Enforce cache size limit
      this.enforceCacheLimit()
    }

    return content
  }

  /**
   * Write a resource
   */
  async write(
    uri: string,
    content: ResourceContent,
    options: ResourceReadOptions = {}
  ): Promise<void> {
    const provider = this.getProvider(uri)
    if (!provider || !provider.write) {
      throw new MCPResourceError(`Write not supported for URI: ${uri}`, 'WRITE_NOT_SUPPORTED')
    }

    await provider.write(uri, content, options)

    // Invalidate cache
    const cacheKey = this.getCacheKey(uri, options)
    this.cache.delete(cacheKey)

    // Notify subscribers
    this.emitChange({
      type: 'updated',
      uri,
      metadata: content.metadata,
      current: content,
      timestamp: new Date(),
    })
  }

  /**
   * Delete a resource
   */
  async delete(uri: string, options: ResourceReadOptions = {}): Promise<void> {
    const provider = this.getProvider(uri)
    if (!provider || !provider.delete) {
      throw new MCPResourceError(`Delete not supported for URI: ${uri}`, 'DELETE_NOT_SUPPORTED')
    }

    // Get current content before deletion
    let previous: ResourceContent | undefined
    try {
      previous = await provider.read(uri, { ...options, metadataOnly: true })
    } catch (error) {
      // Resource might not exist
    }

    await provider.delete(uri, options)

    // Invalidate cache
    const cacheKey = this.getCacheKey(uri, options)
    this.cache.delete(cacheKey)

    // Notify subscribers
    if (previous) {
      this.emitChange({
        type: 'deleted',
        uri,
        metadata: previous.metadata,
        previous,
        timestamp: new Date(),
      })
    }
  }

  /**
   * Subscribe to resource changes
   */
  async subscribe(sessionId: string, filter: ResourceSubscriptionFilter): Promise<string> {
    const subscription: ResourceSubscription = {
      id: crypto.randomUUID(),
      sessionId,
      filter,
      subscribedAt: new Date(),
      lastActivity: new Date(),
      active: true,
    }

    this.subscriptions.set(subscription.id, subscription)

    // Setup watchers for specific URIs
    if (filter.uris) {
      for (const uri of filter.uris) {
        const provider = this.getProvider(uri)
        if (provider?.watch) {
          provider.watch(uri, event => {
            this.handleResourceChange(subscription.id, event, filter)
          })
        }
      }
    }

    return subscription.id
  }

  /**
   * Unsubscribe from resource changes
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription) return false

    subscription.active = false
    this.subscriptions.delete(subscriptionId)

    // Remove change listeners for this subscription
    this.changeListeners.delete(subscriptionId)

    return true
  }

  /**
   * Add change listener for a subscription
   */
  addChangeListener(
    subscriptionId: string,
    callback: (event: ResourceChangeEvent) => void
  ): () => void {
    if (!this.changeListeners.has(subscriptionId)) {
      this.changeListeners.set(subscriptionId, new Set())
    }
    this.changeListeners.get(subscriptionId)!.add(callback)

    return () => {
      const listeners = this.changeListeners.get(subscriptionId)
      if (listeners) {
        listeners.delete(callback)
        if (listeners.size === 0) {
          this.changeListeners.delete(subscriptionId)
        }
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern)
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key)
          this.cacheStats.evictions++
        }
      }
    } else {
      this.cacheStats.evictions += this.cache.size
      this.cache.clear()
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      ...this.cacheStats,
      size: this.cache.size,
      hitRate:
        this.cacheStats.hits + this.cacheStats.misses > 0
          ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)) * 100
          : 0,
    }
  }

  /**
   * Get subscription info
   */
  getSubscription(subscriptionId: string): ResourceSubscription | undefined {
    return this.subscriptions.get(subscriptionId)
  }

  /**
   * Get all subscriptions for a session
   */
  getSessionSubscriptions(sessionId: string): ResourceSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.sessionId === sessionId)
  }

  /**
   * Clean up expired subscriptions
   */
  cleanupExpiredSubscriptions(maxAge: number = 3600000): number {
    const now = Date.now()
    let cleaned = 0

    for (const [id, subscription] of this.subscriptions) {
      if (!subscription.active || now - subscription.lastActivity.getTime() > maxAge) {
        this.unsubscribe(id)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * Handle resource change event
   */
  private handleResourceChange(
    subscriptionId: string,
    event: ResourceChangeEvent,
    filter: ResourceSubscriptionFilter
  ): void {
    // Apply filter
    if (filter.uris && !filter.uris.includes(event.uri)) return
    if (filter.types && !filter.types.includes(event.metadata.type)) return
    if (filter.tags && !filter.tags.some(t => event.metadata.tags.includes(t))) return

    // Notify listeners
    const listeners = this.changeListeners.get(subscriptionId)
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(event)
        } catch (error) {
          console.error('Resource change listener error:', error)
        }
      }
    }
  }

  /**
   * Emit change event to all matching subscriptions
   */
  private emitChange(event: ResourceChangeEvent): void {
    for (const [subscriptionId, subscription] of this.subscriptions) {
      if (!subscription.active) continue

      this.handleResourceChange(subscriptionId, event, subscription.filter)
    }
  }

  /**
   * Revalidate resource in background
   */
  private async revalidateResource(uri: string, options: ResourceReadOptions): Promise<void> {
    try {
      const provider = this.getProvider(uri)
      if (!provider) return

      const content = await provider.read(uri, options)
      const cacheKey = this.getCacheKey(uri, options)

      // Update cache if etag changed
      const cached = this.cache.get(cacheKey)
      if (!cached || cached.etag !== content.metadata.etag) {
        this.cache.set(cacheKey, {
          content,
          cachedAt: new Date(),
          etag: content.metadata.etag,
          hitCount: cached?.hitCount || 0,
          policy: cached?.policy || 'cache-first',
        })
      }
    } catch (error) {
      console.error(`Revalidation failed for ${uri}:`, error)
    }
  }

  /**
   * Check if cache entry is expired
   */
  private isCacheExpired(entry: CacheEntry, maxAge?: number): boolean {
    if (maxAge) {
      return Date.now() - entry.cachedAt.getTime() > maxAge
    }
    if (entry.expiresAt) {
      return Date.now() > entry.expiresAt.getTime()
    }
    return false
  }

  /**
   * Get cache key
   */
  private getCacheKey(uri: string, options: ResourceReadOptions): string {
    const rangePart = options.range ? `:${options.range.start}-${options.range.end}` : ''
    return `${uri}${rangePart}`
  }

  /**
   * Enforce cache size limit
   */
  private enforceCacheLimit(maxSize: number = 1000): void {
    if (this.cache.size <= maxSize) return

    // Evict least recently used entries
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].cachedAt.getTime() - b[1].cachedAt.getTime()
    )

    const toEvict = entries.length - maxSize
    for (let i = 0; i < toEvict; i++) {
      this.cache.delete(entries[i][0])
      this.cacheStats.evictions++
    }
  }
}

/**
 * MCP Resource Error
 */
export class MCPResourceError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message)
    this.name = 'MCPResourceError'
  }
}

/**
 * File system resource provider
 */
export class FileSystemResourceProvider implements ResourceProvider {
  name = 'filesystem'
  supportedTypes: ResourceType[] = ['file', 'directory']

  handles(uri: string): boolean {
    return uri.startsWith('file://') || uri.startsWith('/') || /^[a-zA-Z]:/.test(uri)
  }

  async list(filter?: ResourceSubscriptionFilter): Promise<ResourceMetadata[]> {
    const fs = await import('fs/promises')
    const path = await import('path')
    const glob = await import('glob')

    let uris: string[] = []

    if (filter?.pattern) {
      uris = await glob.glob(filter.pattern)
    } else if (filter?.uris) {
      uris = filter.uris
    }

    const results: ResourceMetadata[] = []

    for (const uri of uris) {
      try {
        const stats = await fs.stat(uri)
        const mimeType = await this.getMimeType(uri)

        results.push({
          uri: uri.startsWith('file://') ? uri : `file://${uri}`,
          name: path.basename(uri),
          type: stats.isDirectory() ? 'directory' : 'file',
          contentType: this.inferContentType(uri),
          mimeType,
          size: stats.size,
          lastModified: stats.mtime,
          tags: [],
          mutable: true,
          requiresAuth: false,
          custom: {},
        })
      } catch (error) {
        // Skip inaccessible files
      }
    }

    return results
  }

  async read(uri: string, options?: ResourceReadOptions): Promise<ResourceContent> {
    const fs = await import('fs/promises')
    const filePath = uri.startsWith('file://') ? uri.slice(7) : uri

    if (options?.metadataOnly) {
      const stats = await fs.stat(filePath)
      const mimeType = await this.getMimeType(filePath)

      return {
        metadata: {
          uri,
          name: filePath.split('/').pop() || '',
          type: stats.isDirectory() ? 'directory' : 'file',
          contentType: this.inferContentType(filePath),
          mimeType,
          size: stats.size,
          lastModified: stats.mtime,
          etag: `${stats.mtime.getTime()}-${stats.size}`,
          tags: [],
          mutable: true,
          requiresAuth: false,
          custom: {},
        },
      }
    }

    const content = await fs.readFile(filePath)

    return {
      text: content.toString('utf-8'),
      binary: content.toString('base64'),
      metadata: {
        uri,
        name: filePath.split('/').pop() || '',
        type: 'file',
        contentType: this.inferContentType(filePath),
        mimeType: await this.getMimeType(filePath),
        size: content.length,
        lastModified: (await fs.stat(filePath)).mtime,
        etag: `${(await fs.stat(filePath)).mtime.getTime()}-${content.length}`,
        tags: [],
        mutable: true,
        requiresAuth: false,
        custom: {},
      },
    }
  }

  async write(uri: string, content: ResourceContent): Promise<void> {
    const fs = await import('fs/promises')
    const filePath = uri.startsWith('file://') ? uri.slice(7) : uri
    const data = content.binary
      ? Buffer.from(content.binary, 'base64')
      : Buffer.from(content.text || '', 'utf-8')
    await fs.writeFile(filePath, data)
  }

  async delete(uri: string): Promise<void> {
    const fs = await import('fs/promises')
    const filePath = uri.startsWith('file://') ? uri.slice(7) : uri
    await fs.unlink(filePath)
  }

  private inferContentType(path: string): ResourceContentType {
    const ext = path.split('.').pop()?.toLowerCase() || ''
    const types: Record<string, ResourceContentType> = {
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      html: 'html',
      xml: 'xml',
      txt: 'text',
    }
    return types[ext] || 'text'
  }

  private async getMimeType(path: string): Promise<string> {
    const ext = path.split('.').pop()?.toLowerCase() || ''
    const mimeTypes: Record<string, string> = {
      json: 'application/json',
      yaml: 'application/x-yaml',
      yml: 'application/x-yaml',
      md: 'text/markdown',
      html: 'text/html',
      xml: 'application/xml',
      txt: 'text/plain',
      js: 'text/javascript',
      ts: 'text/typescript',
      css: 'text/css',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      zip: 'application/zip',
      tar: 'application/x-tar',
    }
    return mimeTypes[ext] || 'application/octet-stream'
  }
}

/**
 * Global resource manager instance
 */
export const mcpResourceManager = new MCPResourceManager()

// Register default providers
mcpResourceManager.registerProvider(new FileSystemResourceProvider())

export default MCPResourceManager
