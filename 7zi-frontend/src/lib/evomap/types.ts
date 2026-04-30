/**
 * Evomap Gateway Types
 * 
 * Type definitions for the Evomap GEP-A2A protocol integration
 */

// ==================== Asset Types ====================

export interface Gene {
  type: 'Gene'
  schema_version: string
  category: 'repair' | 'optimize' | 'innovate'
  signals_match: string[]
  summary: string
  asset_id?: string
  created_at?: string
  author?: string
}

export interface Capsule {
  type: 'Capsule'
  schema_version: string
  trigger: string[]
  summary: string
  content: string
  confidence: number
  blast_radius: {
    files: number
    lines: number
  }
  outcome: {
    status: 'success' | 'failure' | 'partial'
    score: number
  }
  env_fingerprint: {
    platform?: string
    arch?: string
    [key: string]: unknown
  }
  gene?: string
  asset_id?: string
  diff?: string
  created_at?: string
  author?: string
}

export interface EvolutionEvent {
  type: 'EvolutionEvent'
  intent: 'repair' | 'optimize' | 'innovate'
  outcome: {
    status: 'success' | 'failure'
    score: number
  }
  mutations_tried: number
  total_cycles: number
  capsule_id?: string
  genes_used?: string[]
  asset_id?: string
  created_at?: string
}

export interface AssetBundle {
  gene: Gene
  capsule: Capsule
  event?: EvolutionEvent
}

// ==================== GEP-A2A Protocol Types ====================

export interface GEPEnvelope {
  protocol: 'gep-a2a'
  protocol_version: '1.0.0'
  message_type: GEPMessageType
  message_id: string
  sender_id: string
  timestamp: string
  payload: unknown
}

export type GEPMessageType =
  | 'hello'
  | 'heartbeat'
  | 'publish'
  | 'fetch'
  | 'report'
  | 'revoke'
  | 'error'

export interface GEPResponse {
  success: boolean
  status?: number
  data?: GEPPayload | null
  error?: string
  raw?: string
}

export interface GEPPayload {
  node_secret?: string
  claim_code?: string
  claim_url?: string
  assets?: AssetBundle[]
  tasks?: Task[]
  [key: string]: unknown
}

// ==================== Node Types ====================

export interface NodeCapabilities {
  languages?: string[]
  domains?: string[]
  [key: string]: unknown
}

export interface NodeRegistration {
  registered: boolean
  lastHeartbeat: string | null
  lastHello: string | null
  publishCount: number
  fetchCount: number
  credits: number
  reputation: number
}

export interface NodeStatus {
  nodeId: string
  registered: boolean
  lastHeartbeat: string | null
  publishCount: number
  fetchCount: number
  claimCode: string | null
  claimUrl: string | null
}

// ==================== Task Types ====================

export interface Task {
  task_id: string
  title: string
  description: string
  bounty: number
  status: 'available' | 'claimed' | 'completed'
  domain?: string[]
  deadline?: string
  claimed_by?: string
  completed_by?: string
  asset_id?: string
}

// ==================== API Response Types ====================

export interface PublishResult {
  success: boolean
  assetIds?: {
    gene: string
    capsule: string
    event?: string
  }
  error?: string
  message?: string
}

export interface FetchResult {
  success: boolean
  assets?: (Gene | Capsule | EvolutionEvent)[]
  error?: string
  message?: string
}

// ==================== Error Types ====================

export class EvomapError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message)
    this.name = 'EvomapError'
  }
}

export interface RetryConfig {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
}

// ==================== Configuration Types ====================

export interface EvomapConfig {
  hubUrl: string
  nodeId?: string
  nodeSecret?: string
  dataDir?: string
  retryConfig?: Partial<RetryConfig>
}

export const DEFAULT_CONFIG: Partial<EvomapConfig> = {
  hubUrl: 'https://evomap.ai',
  dataDir: '.evomap'
}
