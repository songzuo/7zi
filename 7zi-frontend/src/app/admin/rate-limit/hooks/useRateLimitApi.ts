/**
 * Rate Limit Admin API Hooks
 * 
 * React hooks for fetching and managing rate limit data
 * 
 * @version 1.12.0
 */

import { useState, useEffect, useCallback } from 'react'

// Types
export interface RateLimitHealth {
  status: 'healthy' | 'unhealthy'
  storage: {
    type: 'redis' | 'memory' | 'redis-cluster'
    connected: boolean
  }
  timestamp: string
  error?: string
}

export interface RateLimitStats {
  totalRequests: number
  allowedRequests: number
  rejectedRequests: number
  rejectionRate: number
  byLayer: {
    global: { allowed: number; rejected: number }
    ip: { allowed: number; rejected: number }
    'api-key': { allowed: number; rejected: number }
    user: { allowed: number; rejected: number }
  }
  byAlgorithm: {
    'token-bucket': { allowed: number; rejected: number }
    'sliding-window': { allowed: number; rejected: number }
    'fixed-window': { allowed: number; rejected: number }
    'leaky-bucket': { allowed: number; rejected: number }
  }
  avgLatencyMs: number
  p99LatencyMs: number
  storage?: {
    type: string
    connected: boolean
  }
}

export interface RateLimitKey {
  key: string
  layer: 'global' | 'ip' | 'api-key' | 'user'
  currentCount: number
  limit: number
  remaining: number
  resetTime: number
  algorithm: 'token-bucket' | 'sliding-window' | 'fixed-window' | 'leaky-bucket'
  storage: 'redis' | 'memory' | 'redis-cluster'
}

export interface ApiKeyTierConfig {
  name: string
  rate: number
  burst: number
  dailyLimit?: number
  monthlyLimit?: number
}

export interface RateLimitLog {
  id: string
  timestamp: string
  ip: string
  userId?: string
  apiKey?: string
  layer: string
  path: string
  method: string
  allowed: boolean
  remaining: number
  limit: number
  retryAfter?: number
}

export interface WhitelistEntry {
  id: string
  type: 'ip' | 'apiKey' | 'userId'
  value: string
  description?: string
  createdAt: string
  createdBy?: string
}

// API Base URL
const API_BASE = '/api/rate-limit'

// Generic fetch helper
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<{ data: T; success: boolean }> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  return response.json()
}

// Health Check Hook
export function useRateLimitHealth() {
  const [health, setHealth] = useState<{ data: RateLimitHealth; success: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchApi<RateLimitHealth>('/health')
      setHealth(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch health'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  return { health, loading, error, refresh: fetchHealth }
}

// Stats Hook
export function useRateLimitStats() {
  const [stats, setStats] = useState<{ data: RateLimitStats; success: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchApi<RateLimitStats>('/stats')
      setStats(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch stats'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading, error, refresh: fetchStats }
}

// Keys List Hook
export function useRateLimitKeys(pattern = '*', count = 100) {
  const [keys, setKeys] = useState<RateLimitKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchApi<{ keys: string[]; count: number; cursor: number }>(
        `/keys?pattern=${encodeURIComponent(pattern)}&count=${count}`
      )
      // Transform keys to RateLimitKey format
      const transformedKeys: RateLimitKey[] = (data.data?.keys || []).map(key => ({
        key,
        layer: getLayerFromKey(key),
        currentCount: 0,
        limit: 100,
        remaining: 100,
        resetTime: Date.now() + 60000,
        algorithm: 'sliding-window' as const,
        storage: 'redis' as const,
      }))
      setKeys(transformedKeys)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch keys'))
    } finally {
      setLoading(false)
    }
  }, [pattern, count])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  return { keys, loading, error, refresh: fetchKeys }
}

// Key Status Hook
export function useRateLimitKeyStatus(layer: string, identifier: string | null) {
  const [status, setStatus] = useState<RateLimitKey | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!identifier) return

    try {
      setLoading(true)
      const data = await fetchApi<RateLimitKey>(`/status/${layer}/${identifier}`)
      setStatus(data.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch key status'))
    } finally {
      setLoading(false)
    }
  }, [layer, identifier])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  return { status, loading, error, refresh: fetchStatus }
}

// Adjust Rate Limit Hook
export function useRateLimitAdjust() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const adjust = useCallback(async (adjustment: {
    key: string
    layer: string
    newLimit?: number
    resetCount?: boolean
    addTokens?: number
  }) => {
    try {
      setLoading(true)
      await fetchApi('/adjust', {
        method: 'POST',
        body: JSON.stringify(adjustment),
      })
      setError(null)
      return true
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to adjust rate limit'))
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { adjust, loading, error }
}

// Reset Rate Limit Hook
export function useRateLimitReset() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const reset = useCallback(async (layer: string, identifier: string) => {
    try {
      setLoading(true)
      await fetchApi(`/reset/${layer}/${identifier}`, {
        method: 'POST',
      })
      setError(null)
      return true
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to reset rate limit'))
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { reset, loading, error }
}

// Whitelist Management Hook
export function useWhitelist() {
  const [entries, setEntries] = useState<WhitelistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchWhitelist = useCallback(async () => {
    try {
      setLoading(true)
      // This would call the whitelist API endpoint
      // For now, return mock data
      setEntries([
        { id: '1', type: 'ip', value: '127.0.0.1', description: 'Localhost', createdAt: new Date().toISOString() },
        { id: '2', type: 'ip', value: '::1', description: 'IPv6 Localhost', createdAt: new Date().toISOString() },
      ])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch whitelist'))
    } finally {
      setLoading(false)
    }
  }, [])

  const addEntry = useCallback(async (entry: Omit<WhitelistEntry, 'id' | 'createdAt'>) => {
    try {
      // API call to add entry
      const newEntry: WhitelistEntry = {
        ...entry,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      }
      setEntries(prev => [...prev, newEntry])
      return true
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add entry'))
      return false
    }
  }, [])

  const removeEntry = useCallback(async (id: string) => {
    try {
      // API call to remove entry
      setEntries(prev => prev.filter(e => e.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to remove entry'))
      return false
    }
  }, [])

  useEffect(() => {
    fetchWhitelist()
  }, [fetchWhitelist])

  return { entries, loading, error, refresh: fetchWhitelist, addEntry, removeEntry }
}

// Request Logs Hook
export function useRequestLogs(limit = 100) {
  const [logs, setLogs] = useState<RateLimitLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      // This would call the logs API endpoint
      // For now, return mock data
      setLogs([
        {
          id: '1',
          timestamp: new Date().toISOString(),
          ip: '192.168.1.100',
          userId: 'user123',
          layer: 'ip',
          path: '/api/agents',
          method: 'GET',
          allowed: true,
          remaining: 95,
          limit: 100,
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 60000).toISOString(),
          ip: '10.0.0.50',
          apiKey: 'key_abc123',
          layer: 'api-key',
          path: '/api/chat',
          method: 'POST',
          allowed: false,
          remaining: 0,
          limit: 10,
          retryAfter: 30,
        },
      ])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch logs'))
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return { logs, loading, error, refresh: fetchLogs }
}

// API Key Tier Config Hook
export function useApiKeyTiers() {
  const [tiers, setTiers] = useState<Record<string, ApiKeyTierConfig>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTiers = useCallback(async () => {
    try {
      setLoading(true)
      // This would call the tier config API endpoint
      // For now, return default tier configuration
      setTiers({
        free: { name: 'Free', rate: 2, burst: 10, dailyLimit: 1000 },
        basic: { name: 'Basic', rate: 10, burst: 30, dailyLimit: 10000 },
        pro: { name: 'Professional', rate: 50, burst: 150, dailyLimit: 100000 },
        enterprise: { name: 'Enterprise', rate: 200, burst: 500, dailyLimit: 1000000 },
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch tiers'))
    } finally {
      setLoading(false)
    }
  }, [])

  const updateTier = useCallback(async (tierId: string, config: Partial<ApiKeyTierConfig>) => {
    try {
      setTiers(prev => ({
        ...prev,
        [tierId]: { ...prev[tierId], ...config } as ApiKeyTierConfig,
      }))
      return true
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update tier'))
      return false
    }
  }, [])

  useEffect(() => {
    fetchTiers()
  }, [fetchTiers])

  return { tiers, loading, error, refresh: fetchTiers, updateTier }
}

// Helper function to extract layer from key
function getLayerFromKey(key: string): 'global' | 'ip' | 'api-key' | 'user' {
  const prefix = key.split(':')[0]
  if (['global', 'ip', 'api-key', 'user'].includes(prefix)) {
    return prefix as 'global' | 'ip' | 'api-key' | 'user'
  }
  return 'ip' // default
}

// Format number with locale
export function formatNumber(num: number): string {
  return num.toLocaleString()
}

// Format percentage
export function formatPercent(num: number): string {
  return `${(num * 100).toFixed(1)}%`
}

// Format duration
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}min`
}

// Format date
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString()
}
