/**
 * Evomap Gateway React Hook
 * 
 * 提供 React 组件中使用的 hook 接口
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { EvomapGateway } from './gateway'
import type {
  AssetBundle,
  Gene,
  Capsule,
  EvolutionEvent,
  NodeStatus,
  Task,
  PublishResult,
  FetchResult,
} from './types'

export interface UseEvomapOptions {
  hubUrl?: string
  autoRegister?: boolean
  heartbeatIntervalMs?: number
}

export interface UseEvomapReturn {
  // 状态
  status: NodeStatus
  isRegistered: boolean
  isLoading: boolean
  error: string | null

  // 操作方法
  hello: (options?: Parameters<EvomapGateway['hello']>[0]) => Promise<{ success: boolean; error?: string }>
  heartbeat: (options?: Parameters<EvomapGateway['heartbeat']>[0]) => Promise<{ success: boolean; error?: string }>
  
  // Gene/Capsule 发布
  publish: (bundle: AssetBundle) => Promise<PublishResult>
  publishFix: (options: {
    signals: string[]
    summary: string
    content: string
    confidence: number
    blastRadius: { files: number; lines: number }
    diff?: string
    intent?: 'repair' | 'optimize' | 'innovate'
  }) => Promise<PublishResult>

  // 资产获取
  fetch: (options?: {
    assetType?: 'Gene' | 'Capsule'
    signals?: string[]
    limit?: number
    minGdi?: number
    includeTasks?: boolean
  }) => Promise<FetchResult>
  getCapsules: (options?: { signals?: string[]; limit?: number; minGdi?: number }) => Promise<FetchResult>
  getGenes: (options?: { signals?: string[]; limit?: number; minGdi?: number }) => Promise<FetchResult>

  // 资产管理
  report: (assetId: string, report: { valid: boolean; score: number; comment?: string }) => Promise<{ success: boolean; error?: string }>
  revoke: (assetId: string, reason: string) => Promise<{ success: boolean; error?: string }>

  // 任务系统
  listTasks: (options?: { limit?: number; minBounty?: number }) => Promise<{ success: boolean; tasks?: Task[]; error?: string }>
  claimTask: (taskId: string) => Promise<{ success: boolean; error?: string }>
  completeTask: (taskId: string, assetId: string) => Promise<{ success: boolean; error?: string }>
  getMyTasks: () => Promise<{ success: boolean; tasks?: Task[]; error?: string }>

  // 工具方法
  refreshStatus: () => NodeStatus
  clearError: () => void
}

/**
 * useEvomap - Evomap Gateway React Hook
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { 
 *     status, 
 *     isRegistered, 
 *     publish, 
 *     getCapsules,
 *     isLoading 
 *   } = useEvomap({ autoRegister: true })
 * 
 *   const handlePublish = async () => {
 *     const result = await publishFix({
 *       signals: ['error', 'crash'],
 *       summary: 'Fix null pointer',
 *       content: 'Add null check',
 *       confidence: 0.9,
 *       blastRadius: { files: 1, lines: 5 }
 *     })
 *     console.log('Published:', result.assetIds)
 *   }
 * 
 *   // ...
 * }
 * ```
 */
export function useEvomap(options: UseEvomapOptions = {}): UseEvomapReturn {
  const {
    hubUrl = 'https://evomap.ai',
    autoRegister = false,
    heartbeatIntervalMs = 60000, // 1 minute default
  } = options

  // Gateway 实例
  const gatewayRef = useRef<EvomapGateway | null>(null)
  if (!gatewayRef.current) {
    gatewayRef.current = new EvomapGateway({ hubUrl })
  }
  const gateway = gatewayRef.current

  // 状态
  const [status, setStatus] = useState<NodeStatus>(gateway.getStatus())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 心跳定时器
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 更新状态
  const refreshStatus = useCallback(() => {
    const newStatus = gateway.getStatus()
    setStatus(newStatus)
    return newStatus
  }, [gateway])

  // 清除错误
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // 自动注册
  useEffect(() => {
    if (autoRegister && !gateway.isRegistered()) {
      gateway.hello().then(result => {
        if (!result.success && result.error) {
          setError(result.error)
        }
        refreshStatus()
      })
    }
  }, [autoRegister, gateway, refreshStatus])

  // 心跳机制
  useEffect(() => {
    if (autoRegister && gateway.isRegistered()) {
      // 立即发送一次心跳
      gateway.heartbeat().catch(() => {})

      // 设置定时器
      heartbeatTimerRef.current = setInterval(() => {
        gateway.heartbeat().catch(() => {})
      }, heartbeatIntervalMs)

      return () => {
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current)
        }
      }
    }
  }, [autoRegister, gateway, heartbeatIntervalMs])

  // 注册方法
  const hello = useCallback(async (opts?: Parameters<EvomapGateway['hello']>[0]) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await gateway.hello(opts)
      refreshStatus()
      if (!result.success && result.error) {
        setError(result.error)
      }
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Registration failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [gateway, refreshStatus])

  // 心跳方法
  const heartbeat = useCallback(async (opts?: Parameters<EvomapGateway['heartbeat']>[0]) => {
    try {
      const result = await gateway.heartbeat(opts)
      refreshStatus()
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Heartbeat failed'
      return { success: false, error: message }
    }
  }, [gateway, refreshStatus])

  // 发布资产包
  const publish = useCallback(async (bundle: AssetBundle): Promise<PublishResult> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await gateway.publish(bundle)
      refreshStatus()
      if (!result.success && result.error) {
        setError(result.error)
      }
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Publish failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [gateway, refreshStatus])

  // 发布修复方案
  const publishFix = useCallback(async (opts: Parameters<EvomapGateway['publishFix']>[0]): Promise<PublishResult> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await gateway.publishFix(opts)
      refreshStatus()
      if (!result.success && result.error) {
        setError(result.error)
      }
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Publish fix failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [gateway, refreshStatus])

  // 获取资产
  const fetch = useCallback(async (opts?: Parameters<EvomapGateway['fetch']>[0]): Promise<FetchResult> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await gateway.fetch(opts)
      if (!result.success && result.error) {
        setError(result.error)
      }
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Fetch failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [gateway])

  // 获取 Capsules
  const getCapsules = useCallback(async (opts?: Parameters<EvomapGateway['getCapsules']>[0]): Promise<FetchResult> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await gateway.getCapsules(opts)
      if (!result.success && result.error) {
        setError(result.error)
      }
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Get capsules failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [gateway])

  // 获取 Genes
  const getGenes = useCallback(async (opts?: Parameters<EvomapGateway['getGenes']>[0]): Promise<FetchResult> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await gateway.getGenes(opts)
      if (!result.success && result.error) {
        setError(result.error)
      }
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Get genes failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [gateway])

  // 报告
  const report = useCallback(async (
    assetId: string,
    reportData: { valid: boolean; score: number; comment?: string }
  ) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await gateway.report(assetId, reportData)
      if (!result.success && result.error) {
        setError(result.error)
      }
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Report failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [gateway])

  // 撤回
  const revoke = useCallback(async (assetId: string, reason: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await gateway.revoke(assetId, reason)
      if (!result.success && result.error) {
        setError(result.error)
      }
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Revoke failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [gateway])

  // 任务系统
  const listTasks = useCallback(async (opts?: Parameters<EvomapGateway['listTasks']>[0]) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await gateway.listTasks(opts)
      if (!result.success && result.error) {
        setError(result.error)
      }
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : 'List tasks failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [gateway])

  const claimTask = useCallback(async (taskId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await gateway.claimTask(taskId)
      if (!result.success && result.error) {
        setError(result.error)
      }
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Claim task failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [gateway])

  const completeTask = useCallback(async (taskId: string, assetId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await gateway.completeTask(taskId, assetId)
      if (!result.success && result.error) {
        setError(result.error)
      }
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Complete task failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [gateway])

  const getMyTasks = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await gateway.getMyTasks()
      if (!result.success && result.error) {
        setError(result.error)
      }
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Get my tasks failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [gateway])

  return {
    status,
    isRegistered: gateway.isRegistered(),
    isLoading,
    error,
    hello,
    heartbeat,
    publish,
    publishFix,
    fetch,
    getCapsules,
    getGenes,
    report,
    revoke,
    listTasks,
    claimTask,
    completeTask,
    getMyTasks,
    refreshStatus,
    clearError,
  }
}

export default useEvomap
