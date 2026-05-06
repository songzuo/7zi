/**
 * Evomap Gateway Client
 * 
 * 连接 OpenClaw 智能体世界和 Evomap 协作进化市场
 * 使用 GEP-A2A 协议 v1.0.0
 */

import {
  type Gene,
  type Capsule,
  type EvolutionEvent,
  type AssetBundle,
  type GEPEnvelope,
  type GEPResponse,
  type GEPPayload,
  type NodeStatus,
  type Task,
  type PublishResult,
  type FetchResult,
  type EvomapConfig,
  type RetryConfig,
  type NodeCapabilities,
  EvomapError,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CONFIG,
} from './types'
import { generateSecureId } from '@/lib/utils'

// 简单的 localStorage 封装（用于 SSR/客户端兼容）
const isClient = typeof window !== 'undefined'

function safeParseJSON<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}

/**
 * 生成随机 ID (浏览器兼容)
 */
function generateId(prefix: string): string {
  return generateSecureId(prefix)
}

/**
 * Evomap Gateway Client
 * 
 * 提供与 Evomap Hub 的完整集成，包括：
 * - 节点注册和心跳
 * - Gene/Capsule 发布
 * - 资产获取
 * - 任务系统
 */
export class EvomapGateway {
  private hubUrl: string
  private nodeId: string
  private nodeSecret: string | null
  private claimCode: string | null
  private claimUrl: string | null
  private retryConfig: RetryConfig
  private registration: {
    registered: boolean
    lastHeartbeat: string | null
    lastHello: string | null
    publishCount: number
    fetchCount: number
  }

  constructor(config: Partial<EvomapConfig> = {}) {
    const finalConfig = { ...DEFAULT_CONFIG, ...config }
    this.hubUrl = finalConfig.hubUrl || 'https://evomap.ai'
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...finalConfig.retryConfig }
    this.nodeId = finalConfig.nodeId || this.loadOrCreateNodeId()
    this.nodeSecret = finalConfig.nodeSecret || this.loadNodeSecret()
    this.claimCode = null
    this.claimUrl = null
    this.registration = {
      registered: false,
      lastHeartbeat: null,
      lastHello: null,
      publishCount: 0,
      fetchCount: 0,
    }
    this.loadState()
  }

  // ==================== 持久化方法 ====================

  private getStorageKey(key: string): string {
    return `evomap_${key}`
  }

  private loadFromStorage<T>(key: string, defaultValue: T): T {
    if (!isClient) return defaultValue
    try {
      const stored = localStorage.getItem(this.getStorageKey(key))
      if (stored) return safeParseJSON(stored, defaultValue)
    } catch {}
    return defaultValue
  }

  private saveToStorage(key: string, value: unknown): void {
    if (!isClient) return
    try {
      localStorage.setItem(this.getStorageKey(key), JSON.stringify(value))
    } catch {}
  }

  private loadOrCreateNodeId(): string {
    const stored = this.loadFromStorage<string | null>('node_id', null)
    if (stored) return stored

    const newId = generateId('node')
    this.saveToStorage('node_id', newId)
    return newId
  }

  private loadNodeSecret(): string | null {
    return this.loadFromStorage<string | null>('node_secret', null)
  }

  private saveNodeSecret(secret: string): void {
    this.nodeSecret = secret
    this.saveToStorage('node_secret', secret)
  }

  private loadState(): void {
    const state = this.loadFromStorage<typeof this.registration>('state', this.registration)
    this.registration = state
  }

  private saveState(): void {
    this.saveToStorage('state', this.registration)
  }

  // ==================== 协议信封 ====================

  private buildEnvelope<T>(messageType: string, payload: T): GEPEnvelope {
    return {
      protocol: 'gep-a2a',
      protocol_version: '1.0.0',
      message_type: messageType as GEPEnvelope['message_type'],
      message_id: generateId('msg'),
      sender_id: this.nodeId,
      timestamp: new Date().toISOString(),
      payload,
    }
  }

  // ==================== HTTP 请求核心 ====================

  private async request<T = Record<string, unknown>>(
    endpoint: string,
    data?: unknown,
    method: 'GET' | 'POST' = 'POST'
  ): Promise<GEPResponse> {
    const url = `${this.hubUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // 除了 hello 端点外都需要认证
    if (this.nodeSecret && endpoint !== '/a2a/hello') {
      headers['Authorization'] = `Bearer ${this.nodeSecret}`
    }

    const options: RequestInit = {
      method,
      headers,
    }

    if (data) {
      options.body = JSON.stringify(data)
    }

    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000),
      })

      const text = await response.text()

      try {
        const json = safeParseJSON<Record<string, unknown>>(text, {})
        return {
          success: response.ok,
          status: response.status,
          data: json as unknown as GEPPayload,
        }
      } catch {
        return {
          success: false,
          status: response.status,
          error: 'parse_error',
          raw: text.substring(0, 500),
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  // ==================== 重试机制 ====================

  private async withRetry(
    operation: () => Promise<GEPResponse>,
    _operationName: string
  ): Promise<GEPResponse> {
    let lastError: Error | null = null
    let delay = this.retryConfig.initialDelayMs

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await operation()

        if (result.success) {
          return result
        }

        // 检查是否是可重试的错误
        const isRetryable =
          result.status === 429 ||
          result.status === 503 ||
          result.status === 504 ||
          (result.error && ['network', 'timeout', 'ECONNRESET'].some(e => result.error?.includes(e)))

        if (!isRetryable || attempt === this.retryConfig.maxRetries) {
          throw new EvomapError(
            result.error || `Request failed: ${result.status}`,
            'REQUEST_FAILED',
            result.status,
            false
          )
        }

        lastError = new EvomapError(
          result.error || `Request failed: ${result.status}`,
          'RETRYABLE_ERROR',
          result.status,
          true
        )
      } catch (e) {
        if (e instanceof EvomapError && !e.retryable) {
          throw e
        }
        lastError = e instanceof Error ? e : new Error(String(e))
      }

      // 指数退避
      if (attempt < this.retryConfig.maxRetries) {
        await this.sleep(delay)
        delay = Math.min(delay * this.retryConfig.backoffMultiplier, this.retryConfig.maxDelayMs)
      }
    }

    throw lastError || new EvomapError('Max retries exceeded', 'MAX_RETRIES_EXCEEDED')
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // ==================== 工具方法 ====================

  private computeAssetId(obj: Record<string, unknown>): string {
    const canonicalize = (o: unknown): unknown => {
      if (o === null || typeof o !== 'object') return o
      if (Array.isArray(o)) return (o as unknown[]).map(canonicalize)
      const sorted: Record<string, unknown> = {}
      for (const k of Object.keys(o as Record<string, unknown>).sort()) {
        if (k === 'asset_id') continue
        sorted[k] = canonicalize((o as Record<string, unknown>)[k])
      }
      return sorted
    }

    const canonical = JSON.stringify(canonicalize(obj))
    // 使用简单的 hash 替代 crypto（在浏览器中也可用）
    let hash = 0
    for (let i = 0; i < canonical.length; i++) {
      const char = canonical.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return `sha256:${Math.abs(hash).toString(16).padStart(16, '0')}`
  }

  private countSkills(): number {
    // 客户端无法直接访问 skills 目录，返回 0
    return 0
  }

  // ==================== A2A 协议端点 ====================

  /**
   * 注册节点 (hello)
   * @param options - 注册选项
   */
  async hello(options: {
    capabilities?: NodeCapabilities
    model?: string
    webhookUrl?: string
    referrer?: string
  } = {}): Promise<{ success: boolean; claimCode?: string; claimUrl?: string; error?: string }> {
    const payload: Record<string, unknown> = {
      capabilities: options.capabilities || {
        languages: ['javascript', 'typescript', 'python', 'bash'],
        domains: ['error_repair', 'optimization', 'devops', 'frontend'],
      },
      gene_count: this.registration.publishCount || 0,
      capsule_count: this.registration.publishCount || 0,
      env_fingerprint: {
        platform: isClient ? 'browser' : 'node',
        arch: 'unknown',
        node_version: typeof process !== 'undefined' ? process.version : undefined,
        openclaw: true,
      },
    }

    if (options.model) payload.model = options.model
    if (options.webhookUrl) payload.webhook_url = options.webhookUrl
    if (options.referrer) payload.referrer = options.referrer

    const result = await this.withRetry(
      () => this.request('/a2a/hello', this.buildEnvelope('hello', payload)),
      'hello'
    )

    if (result.success && result.data) {
      const data = result.data as Record<string, unknown>
      // 保存节点密钥
      const secret = (data.node_secret || (data.payload as Record<string, unknown>)?.node_secret) as string | undefined
      if (secret) {
        this.saveNodeSecret(secret)
      }

      // 保存 claim 信息
      this.claimCode = (data.claim_code as string | undefined) || null
      this.claimUrl = (data.claim_url as string | undefined) || null

      // 更新状态
      this.registration.registered = true
      this.registration.lastHello = new Date().toISOString()
      this.saveState()

      return {
        success: true,
        claimCode: this.claimCode || undefined,
        claimUrl: this.claimUrl || undefined,
      }
    }

    return { success: false, error: result.error || 'Registration failed' }
  }

  /**
   * 发送心跳
   */
  async heartbeat(options: {
    workerEnabled?: boolean
    maxLoad?: number
    domains?: string[]
  } = {}): Promise<{ success: boolean; error?: string }> {
    const payload: Record<string, unknown> = {
      status: 'alive',
      skills_count: this.countSkills(),
      capabilities: ['error_repair', 'optimization', 'devops', 'frontend'],
    }

    if (options.workerEnabled !== undefined) {
      payload.meta = {
        worker_enabled: options.workerEnabled,
        max_load: options.maxLoad || 3,
        domains: options.domains || ['javascript', 'typescript', 'devops'],
      }
    }

    const result = await this.withRetry(
      () => this.request('/a2a/heartbeat', this.buildEnvelope('heartbeat', payload)),
      'heartbeat'
    )

    if (result.success) {
      this.registration.lastHeartbeat = new Date().toISOString()
      this.saveState()
      return { success: true }
    }

    return { success: false, error: result.error }
  }

  // ==================== Gene/Capsule 发布 ====================

  /**
   * 发布资产包 (Gene + Capsule + EvolutionEvent)
   */
  async publish(bundle: AssetBundle): Promise<PublishResult> {
    const { gene, capsule, event } = bundle

    // 计算资产 ID
    const geneData: Record<string, unknown> = { ...gene }
    const capsuleData: Record<string, unknown> = { ...capsule }

    delete geneData.asset_id
    delete capsuleData.asset_id

    geneData.asset_id = this.computeAssetId(geneData)
    capsuleData.asset_id = this.computeAssetId(capsuleData)
    capsuleData.gene = geneData.asset_id

    const assets: Record<string, unknown>[] = [geneData, capsuleData]

    // 添加 EvolutionEvent
    let eventAssetId: string | undefined
    if (event) {
      const eventData: Record<string, unknown> = { ...event }
      delete eventData.asset_id
      eventData.capsule_id = capsuleData.asset_id
      eventData.genes_used = [geneData.asset_id]
      eventData.asset_id = this.computeAssetId(eventData)
      assets.push(eventData)
      eventAssetId = eventData.asset_id as string
    }

    const result = await this.withRetry(
      () => this.request('/a2a/publish', this.buildEnvelope('publish', { assets })),
      'publish'
    )

    if (result.success) {
      this.registration.publishCount++
      this.saveState()

      return {
        success: true,
        assetIds: {
          gene: geneData.asset_id as string,
          capsule: capsuleData.asset_id as string,
          event: eventAssetId,
        },
      }
    }

    return { success: false, error: result.error || 'Publish failed' }
  }

  /**
   * 发布修复方案 (便捷方法)
   */
  async publishFix(options: {
    signals: string[]
    summary: string
    content: string
    confidence: number
    blastRadius: { files: number; lines: number }
    diff?: string
    intent?: 'repair' | 'optimize' | 'innovate'
  }): Promise<PublishResult> {
    const intent = options.intent || 'repair'

    // 构建 Gene
    const gene: Gene = {
      type: 'Gene',
      schema_version: '1.5.0',
      category: intent,
      signals_match: options.signals,
      summary: options.summary,
    }

    // 构建 Capsule
    const capsule: Capsule = {
      type: 'Capsule',
      schema_version: '1.5.0',
      trigger: options.signals,
      summary: options.summary,
      content: options.content,
      confidence: options.confidence,
      blast_radius: options.blastRadius,
      outcome: { status: 'success', score: options.confidence },
      env_fingerprint: {
        platform: isClient ? 'browser' : 'node',
      },
    }

    if (options.diff) {
      capsule.diff = options.diff
    }

    // 构建 EvolutionEvent
    const event: EvolutionEvent = {
      type: 'EvolutionEvent',
      intent,
      outcome: { status: 'success', score: options.confidence },
      mutations_tried: 1,
      total_cycles: 1,
    }

    return this.publish({ gene, capsule, event })
  }

  // ==================== 资产获取 ====================

  /**
   * 获取资产
   */
  async fetch(options: {
    assetType?: 'Gene' | 'Capsule'
    signals?: string[]
    limit?: number
    minGdi?: number
    includeTasks?: boolean
  } = {}): Promise<FetchResult> {
    const payload: Record<string, unknown> = {}

    if (options.assetType) payload.asset_type = options.assetType
    if (options.signals) payload.signals = options.signals
    if (options.limit) payload.limit = options.limit
    if (options.minGdi) payload.min_gdi = options.minGdi
    if (options.includeTasks) payload.include_tasks = true

    const result = await this.withRetry(
      () => this.request('/a2a/fetch', this.buildEnvelope('fetch', payload)),
      'fetch'
    )

    if (result.success && result.data) {
      this.registration.fetchCount++
      this.saveState()

      const data = result.data as Record<string, unknown>
      return {
        success: true,
        assets: (data.assets || []) as (Gene | Capsule | EvolutionEvent)[],
      }
    }

    return { success: false, error: result.error || 'Fetch failed' }
  }

  /**
   * 获取 Capsules (便捷方法)
   */
  async getCapsules(options: {
    signals?: string[]
    limit?: number
    minGdi?: number
  } = {}): Promise<FetchResult> {
    return this.fetch({ ...options, assetType: 'Capsule' })
  }

  /**
   * 获取 Genes (便捷方法)
   */
  async getGenes(options: {
    signals?: string[]
    limit?: number
    minGdi?: number
  } = {}): Promise<FetchResult> {
    return this.fetch({ ...options, assetType: 'Gene' })
  }

  // ==================== 资产管理 ====================

  /**
   * 提交验证报告
   */
  async report(
    assetId: string,
    report: {
      valid: boolean
      score: number
      comment?: string
    }
  ): Promise<{ success: boolean; error?: string }> {
    const payload = {
      target_asset_id: assetId,
      validation_report: report,
    }

    const result = await this.withRetry(
      () => this.request('/a2a/report', this.buildEnvelope('report', payload)),
      'report'
    )

    return { success: result.success, error: result.error }
  }

  /**
   * 撤回资产
   */
  async revoke(
    assetId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    const payload = {
      target_asset_id: assetId,
      reason,
    }

    const result = await this.withRetry(
      () => this.request('/a2a/revoke', this.buildEnvelope('revoke', payload)),
      'revoke'
    )

    return { success: result.success, error: result.error }
  }

  // ==================== REST 端点 ====================

  /**
   * 获取节点信息
   */
  async getNode(nodeId?: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const result = await this.request(`/a2a/nodes/${nodeId || this.nodeId}`, undefined, 'GET')
    return { success: result.success, data: result.data, error: result.error }
  }

  /**
   * 获取资产列表
   */
  async listAssets(options: {
    status?: string
    type?: string
    limit?: number
    sort?: string
  } = {}): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const params = new URLSearchParams()
    if (options.status) params.append('status', options.status)
    if (options.type) params.append('type', options.type)
    if (options.limit) params.append('limit', options.limit.toString())
    if (options.sort) params.append('sort', options.sort)

    const result = await this.request(`/a2a/assets?${params.toString()}`, undefined, 'GET')
    return { success: result.success, data: result.data, error: result.error }
  }

  /**
   * 获取单个资产详情
   */
  async getAsset(assetId: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const result = await this.request(`/a2a/assets/${assetId}`, undefined, 'GET')
    return { success: result.success, data: result.data, error: result.error }
  }

  /**
   * 搜索资产
   */
  async searchAssets(
    query: string,
    options: { type?: string; limit?: number } = {}
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const params = new URLSearchParams()
    params.append('q', query)
    if (options.type) params.append('type', options.type)
    if (options.limit) params.append('limit', options.limit.toString())

    const result = await this.request(`/a2a/assets/semantic-search?${params.toString()}`, undefined, 'GET')
    return { success: result.success, data: result.data, error: result.error }
  }

  /**
   * 获取趋势资产
   */
  async getTrending(): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const result = await this.request('/a2a/trending', undefined, 'GET')
    return { success: result.success, data: result.data, error: result.error }
  }

  /**
   * 获取 Hub 统计
   */
  async getStats(): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const result = await this.request('/a2a/stats', undefined, 'GET')
    return { success: result.success, data: result.data, error: result.error }
  }

  // ==================== 任务系统 ====================

  /**
   * 获取任务列表
   */
  async listTasks(options: {
    limit?: number
    minBounty?: number
  } = {}): Promise<{ success: boolean; tasks?: Task[]; error?: string }> {
    const params = new URLSearchParams()
    if (options.limit) params.append('limit', options.limit.toString())
    if (options.minBounty) params.append('min_bounty', options.minBounty.toString())

    const result = await this.request(`/task/list?${params.toString()}`, undefined, 'GET')

    if (result.success && result.data) {
      const data = result.data as Record<string, unknown>
      return {
        success: true,
        tasks: (data.tasks || []) as Task[],
      }
    }

    return { success: false, error: result.error }
  }

  /**
   * 领取任务
   */
  async claimTask(taskId: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.request('/task/claim', {
      task_id: taskId,
      node_id: this.nodeId,
    })

    return { success: result.success, error: result.error }
  }

  /**
   * 完成任务
   */
  async completeTask(
    taskId: string,
    assetId: string
  ): Promise<{ success: boolean; error?: string }> {
    const result = await this.request('/task/complete', {
      task_id: taskId,
      asset_id: assetId,
      node_id: this.nodeId,
    })

    return { success: result.success, error: result.error }
  }

  /**
   * 获取我的任务
   */
  async getMyTasks(): Promise<{ success: boolean; tasks?: Task[]; error?: string }> {
    const params = new URLSearchParams()
    params.append('node_id', this.nodeId)

    const result = await this.request(`/task/my?${params.toString()}`, undefined, 'GET')

    if (result.success && result.data) {
      const data = result.data as Record<string, unknown>
      return {
        success: true,
        tasks: (data.tasks || []) as Task[],
      }
    }

    return { success: false, error: result.error }
  }

  // ==================== 状态查询 ====================

  /**
   * 获取节点状态摘要
   */
  getStatus(): NodeStatus {
    return {
      nodeId: this.nodeId,
      registered: this.registration.registered,
      lastHeartbeat: this.registration.lastHeartbeat,
      publishCount: this.registration.publishCount,
      fetchCount: this.registration.fetchCount,
      claimCode: this.claimCode,
      claimUrl: this.claimUrl,
    }
  }

  /**
   * 检查是否已注册
   */
  isRegistered(): boolean {
    return this.registration.registered
  }
}

// ==================== 单例导出 ====================

let gatewayInstance: EvomapGateway | null = null

export function getEvomapGateway(config?: Partial<EvomapConfig>): EvomapGateway {
  if (!gatewayInstance) {
    gatewayInstance = new EvomapGateway(config)
  }
  return gatewayInstance
}

export function resetEvomapGateway(): void {
  gatewayInstance = null
}

export { EvomapGateway as default }
