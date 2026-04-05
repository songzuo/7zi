/**
 * CRDT Synchronization Protocol
 *
 * 基于 Yjs 的 CRDT 同步协议实现
 * 支持文档同步、操作转换、冲突解决
 */

import * as Y from 'yjs'
import { logger } from '@/lib/logger'

// ============================================================================
// Types
// ============================================================================

/**
 * CRDT 操作类型
 */
export type CRDTOperationType = 'insert' | 'delete' | 'update' | 'move'

/**
 * CRDT 操作
 */
export interface CRDTOperation {
  type: CRDTOperationType
  nodeId: string
  userId: string
  timestamp: number
  data?: Record<string, unknown>
  position?: number
  length?: number
}

/**
 * CRDT 文档状态
 */
export interface CRDTDocumentState {
  version: number
  nodes: Map<string, Y.Map<unknown>>
  edges: Y.Array<unknown>
  metadata: Y.Map<unknown>
}

/**
 * 同步消息类型
 */
export type SyncMessageType =
  | 'sync-request'      // 请求同步
  | 'sync-response'     // 同步响应
  | 'sync-update'       // 增量更新
  | 'sync-ack'          // 确认
  | 'sync-error'        // 错误

/**
 * 同步消息
 */
export interface SyncMessage {
  type: SyncMessageType
  sessionId: string
  userId: string
  version?: number
  data?: Uint8Array
  error?: string
}

/**
 * 冲突类型
 */
export type ConflictType =
  | 'edit-edit'         // 编辑-编辑冲突
  | 'edit-delete'       // 编辑-删除冲突
  | 'move-delete'       // 移动-删除冲突
  | 'concurrent-update' // 并发更新冲突

/**
 * 冲突信息
 */
export interface ConflictInfo {
  type: ConflictType
  nodeId: string
  operations: CRDTOperation[]
  timestamp: number
}

/**
 * 冲突解决策略
 */
export type ConflictResolutionStrategy =
  | 'last-write-wins'   // 最后写入优先
  | 'first-write-wins'  // 首次写入优先
  | 'merge'             // 合并
  | 'manual'            // 手动解决

/**
 * 冲突解决结果
 */
export interface ConflictResolution {
  conflictId: string
  strategy: ConflictResolutionStrategy
  resolved: boolean
  result?: Record<string, unknown>
  error?: string
}

// ============================================================================
// CRDT Document Manager
// ============================================================================

/**
 * CRDT 文档管理器
 * 管理 Yjs 文档和同步状态
 */
export class CRDTDocumentManager {
  private doc: Y.Doc
  private nodes: Y.Map<Y.Map<unknown>>
  private edges: Y.Array<unknown>
  private metadata: Y.Map<unknown>
  private version: number = 0
  private sessionId: string
  private userId: string

  constructor(sessionId: string, userId: string) {
    this.sessionId = sessionId
    this.userId = userId

    // 创建 Yjs 文档
    this.doc = new Y.Doc({ guid: sessionId })

    // 获取文档结构
    this.nodes = this.doc.getMap('nodes')
    this.edges = this.doc.getArray('edges')
    this.metadata = this.doc.getMap('metadata')

    // 监听文档变化
    this.setupObservers()

    logger.info('CRDT Document Manager initialized', {
      sessionId,
      userId,
    })
  }

  /**
   * 设置观察者
   */
  private setupObservers(): void {
    // 监听节点变化
    this.nodes.observe(event => {
      event.keysChanged.forEach((key, action) => {
        if (action === 'add' || action === 'update') {
          logger.debug('Node changed', { nodeId: key, action })
          this.version++
        } else if (action === 'delete') {
          logger.debug('Node deleted', { nodeId: key })
          this.version++
        }
      })
    })

    // 监听边变化
    this.edges.observe(event => {
      logger.debug('Edges changed', { delta: event.delta })
      this.version++
    })

    // 监听元数据变化
    this.metadata.observe(event => {
      logger.debug('Metadata changed', { keysChanged: event.keysChanged })
      this.version++
    })
  }

  /**
   * 获取文档
   */
  getDocument(): Y.Doc {
    return this.doc
  }

  /**
   * 获取节点
   */
  getNode(nodeId: string): Y.Map<unknown> | undefined {
    return this.nodes.get(nodeId)
  }

  /**
   * 获取所有节点
   */
  getAllNodes(): Map<string, Y.Map<unknown>> {
    const result = new Map<string, Y.Map<unknown>>()
    this.nodes.forEach((node, nodeId) => {
      result.set(nodeId, node)
    })
    return result
  }

  /**
   * 创建节点
   */
  createNode(nodeId: string, data: Record<string, unknown>): void {
    const node = new Y.Map<unknown>()
    Object.entries(data).forEach(([key, value]) => {
      node.set(key, value)
    })
    node.set('createdAt', Date.now())
    node.set('createdBy', this.userId)
    this.nodes.set(nodeId, node)
  }

  /**
   * 更新节点
   */
  updateNode(nodeId: string, changes: Record<string, unknown>): boolean {
    const node = this.nodes.get(nodeId)
    if (!node) {
      logger.warn('Node not found for update', { nodeId })
      return false
    }

    this.doc.transact(() => {
      Object.entries(changes).forEach(([key, value]) => {
        node.set(key, value)
      })
      node.set('updatedAt', Date.now())
      node.set('updatedBy', this.userId)
    })

    return true
  }

  /**
   * 删除节点
   */
  deleteNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId)
    if (!node) {
      logger.warn('Node not found for deletion', { nodeId })
      return false
    }

    this.nodes.delete(nodeId)
    return true
  }

  /**
   * 移动节点
   */
  moveNode(nodeId: string, position: { x: number; y: number }): boolean {
    const node = this.nodes.get(nodeId)
    if (!node) {
      logger.warn('Node not found for move', { nodeId })
      return false
    }

    this.doc.transact(() => {
      node.set('position', position)
      node.set('updatedAt', Date.now())
      node.set('updatedBy', this.userId)
    })

    return true
  }

  /**
   * 添加边
   */
  addEdge(edge: Record<string, unknown>): void {
    this.edges.push([edge])
  }

  /**
   * 删除边
   */
  removeEdge(edgeId: string): boolean {
    for (let i = 0; i < this.edges.length; i++) {
      const edge = this.edges.get(i) as Record<string, unknown>
      if (edge.id === edgeId) {
        this.edges.delete(i, 1)
        return true
      }
    }
    return false
  }

  /**
   * 获取所有边
   */
  getAllEdges(): unknown[] {
    return this.edges.toArray()
  }

  /**
   * 获取元数据
   */
  getMetadata(key: string): unknown {
    return this.metadata.get(key)
  }

  /**
   * 设置元数据
   */
  setMetadata(key: string, value: unknown): void {
    this.metadata.set(key, value)
  }

  /**
   * 获取文档版本
   */
  getVersion(): number {
    return this.version
  }

  /**
   * 获取文档状态
   */
  getState(): CRDTDocumentState {
    return {
      version: this.version,
      nodes: this.getAllNodes(),
      edges: this.edges,
      metadata: this.metadata,
    }
  }

  /**
   * 应用更新
   */
  applyUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.doc, update)
    logger.debug('Update applied', {
      sessionId: this.sessionId,
      version: this.version,
    })
  }

  /**
   * 编码文档状态
   */
  encodeState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc)
  }

  /**
   * 编码文档差异
   */
  encodeStateVector(): Uint8Array {
    return Y.encodeStateVector(this.doc)
  }

  /**
   * 销毁文档
   */
  destroy(): void {
    this.doc.destroy()
    logger.info('CRDT Document Manager destroyed', {
      sessionId: this.sessionId,
    })
  }
}

// ============================================================================
// Conflict Resolver
// ============================================================================

/**
 * 冲突解决器
 * 检测和解决 CRDT 操作冲突
 */
export class ConflictResolver {
  private conflicts: Map<string, ConflictInfo> = new Map()

  /**
   * 检测冲突
   */
  detectConflict(operations: CRDTOperation[]): ConflictInfo | null {
    if (operations.length < 2) {
      return null
    }

    // 按节点分组
    const byNode = new Map<string, CRDTOperation[]>()
    operations.forEach(op => {
      if (!byNode.has(op.nodeId)) {
        byNode.set(op.nodeId, [])
      }
      byNode.get(op.nodeId)!.push(op)
    })

    // 检查每个节点的冲突
    for (const [nodeId, nodeOps] of byNode.entries()) {
      if (nodeOps.length < 2) continue

      const conflict = this.analyzeNodeConflict(nodeId, nodeOps)
      if (conflict) {
        return conflict
      }
    }

    return null
  }

  /**
   * 分析节点冲突
   */
  private analyzeNodeConflict(
    nodeId: string,
    operations: CRDTOperation[]
  ): ConflictInfo | null {
    const types = new Set(operations.map(op => op.type))

    // 编辑-编辑冲突
    if (types.has('update') && types.size === 1) {
      return {
        type: 'edit-edit',
        nodeId,
        operations,
        timestamp: Date.now(),
      }
    }

    // 编辑-删除冲突
    if (types.has('update') && types.has('delete')) {
      return {
        type: 'edit-delete',
        nodeId,
        operations,
        timestamp: Date.now(),
      }
    }

    // 移动-删除冲突
    if (types.has('move') && types.has('delete')) {
      return {
        type: 'move-delete',
        nodeId,
        operations,
        timestamp: Date.now(),
      }
    }

    // 并发更新冲突
    if (operations.length > 2) {
      return {
        type: 'concurrent-update',
        nodeId,
        operations,
        timestamp: Date.now(),
      }
    }

    return null
  }

  /**
   * 解决冲突
   */
  resolveConflict(
    conflict: ConflictInfo,
    strategy: ConflictResolutionStrategy,
    docManager: CRDTDocumentManager
  ): ConflictResolution {
    const conflictId = `${conflict.nodeId}-${conflict.timestamp}`

    try {
      let result: Record<string, unknown> | undefined

      switch (strategy) {
        case 'last-write-wins':
          result = this.resolveLastWriteWins(conflict, docManager)
          break

        case 'first-write-wins':
          result = this.resolveFirstWriteWins(conflict, docManager)
          break

        case 'merge':
          result = this.resolveMerge(conflict, docManager)
          break

        case 'manual':
          // 手动解决，返回冲突信息
          result = {
            conflict,
            requiresManualResolution: true,
          }
          break

        default:
          throw new Error(`Unknown strategy: ${strategy}`)
      }

      this.conflicts.delete(conflictId)

      return {
        conflictId,
        strategy,
        resolved: true,
        result,
      }
    } catch (error) {
      logger.error('Failed to resolve conflict', {
        conflictId,
        error,
      })

      return {
        conflictId,
        strategy,
        resolved: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 最后写入优先
   */
  private resolveLastWriteWins(
    conflict: ConflictInfo,
    docManager: CRDTDocumentManager
  ): Record<string, unknown> {
    // 按时间戳排序，取最新的
    const sortedOps = [...conflict.operations].sort((a, b) => b.timestamp - a.timestamp)
    const latestOp = sortedOps[0]

    logger.info('Resolving conflict with last-write-wins', {
      nodeId: conflict.nodeId,
      winningUserId: latestOp.userId,
    })

    // 应用最新操作
    if (latestOp.type === 'update' && latestOp.data) {
      docManager.updateNode(conflict.nodeId, latestOp.data)
    } else if (latestOp.type === 'delete') {
      docManager.deleteNode(conflict.nodeId)
    } else if (latestOp.type === 'move' && latestOp.data) {
      docManager.moveNode(conflict.nodeId, latestOp.data as { x: number; y: number })
    }

    return {
      strategy: 'last-write-wins',
      winningOperation: latestOp,
    }
  }

  /**
   * 首次写入优先
   */
  private resolveFirstWriteWins(
    conflict: ConflictInfo,
    docManager: CRDTDocumentManager
  ): Record<string, unknown> {
    // 按时间戳排序，取最早的
    const sortedOps = [...conflict.operations].sort((a, b) => a.timestamp - b.timestamp)
    const firstOp = sortedOps[0]

    logger.info('Resolving conflict with first-write-wins', {
      nodeId: conflict.nodeId,
      winningUserId: firstOp.userId,
    })

    // 应用首次操作
    if (firstOp.type === 'update' && firstOp.data) {
      docManager.updateNode(conflict.nodeId, firstOp.data)
    } else if (firstOp.type === 'delete') {
      docManager.deleteNode(conflict.nodeId)
    } else if (firstOp.type === 'move' && firstOp.data) {
      docManager.moveNode(conflict.nodeId, firstOp.data as { x: number; y: number })
    }

    return {
      strategy: 'first-write-wins',
      winningOperation: firstOp,
    }
  }

  /**
   * 合并
   */
  private resolveMerge(
    conflict: ConflictInfo,
    docManager: CRDTDocumentManager
  ): Record<string, unknown> {
    logger.info('Resolving conflict with merge', {
      nodeId: conflict.nodeId,
    })

    // 对于编辑-编辑冲突，尝试合并字段
    if (conflict.type === 'edit-edit') {
      const mergedData: Record<string, unknown> = {}

      // 收集所有字段
      conflict.operations.forEach(op => {
        if (op.data) {
          Object.entries(op.data).forEach(([key, value]) => {
            // 如果字段已存在，使用最新的
            if (!mergedData[key] || op.timestamp > (mergedData._timestamp as number || 0)) {
              mergedData[key] = value
              mergedData._timestamp = op.timestamp
            }
          })
        }
      })

      // 删除内部字段
      delete mergedData._timestamp

      // 应用合并结果
      docManager.updateNode(conflict.nodeId, mergedData)

      return {
        strategy: 'merge',
        mergedData,
      }
    }

    // 对于其他冲突类型，使用最后写入优先
    return this.resolveLastWriteWins(conflict, docManager)
  }

  /**
   * 获取待解决的冲突
   */
  getPendingConflicts(): ConflictInfo[] {
    return Array.from(this.conflicts.values())
  }

  /**
   * 清除冲突
   */
  clearConflicts(): void {
    this.conflicts.clear()
  }
}

// ============================================================================
// Sync Protocol
// ============================================================================

/**
 * 同步协议
 * 处理客户端和服务器之间的同步消息
 */
export class SyncProtocol {
  private docManager: CRDTDocumentManager
  private conflictResolver: ConflictResolver
  private pendingOperations: CRDTOperation[] = []
  private syncCallbacks: Map<string, (message: SyncMessage) => void> = new Map()

  constructor(sessionId: string, userId: string) {
    this.docManager = new CRDTDocumentManager(sessionId, userId)
    this.conflictResolver = new ConflictResolver()

    logger.info('Sync Protocol initialized', {
      sessionId,
      userId,
    })
  }

  /**
   * 处理同步请求
   */
  handleSyncRequest(userId: string): SyncMessage {
    logger.debug('Handling sync request', { userId })

    return {
      type: 'sync-response',
      sessionId: this.docManager['sessionId'],
      userId: this.docManager['userId'],
      version: this.docManager.getVersion(),
      data: this.docManager.encodeState(),
    }
  }

  /**
   * 处理同步响应
   */
  handleSyncResponse(message: SyncMessage): void {
    if (!message.data) {
      logger.warn('Sync response has no data', { message })
      return
    }

    logger.debug('Handling sync response', {
      version: message.version,
    })

    // 应用服务器状态
    this.docManager.applyUpdate(message.data)

    // 触发回调
    this.triggerCallback('sync-response', message)
  }

  /**
   * 处理增量更新
   */
  handleSyncUpdate(message: SyncMessage): void {
    if (!message.data) {
      logger.warn('Sync update has no data', { message })
      return
    }

    logger.debug('Handling sync update', {
      userId: message.userId,
    })

    // 应用更新
    this.docManager.applyUpdate(message.data)

    // 触发回调
    this.triggerCallback('sync-update', message)
  }

  /**
   * 创建同步更新
   */
  createSyncUpdate(): Uint8Array {
    return this.docManager.encodeState()
  }

  /**
   * 添加操作
   */
  addOperation(operation: CRDTOperation): void {
    this.pendingOperations.push(operation)

    // 检测冲突
    const conflict = this.conflictResolver.detectConflict(this.pendingOperations)
    if (conflict) {
      logger.warn('Conflict detected', {
        type: conflict.type,
        nodeId: conflict.nodeId,
      })

      // 自动解决（使用最后写入优先）
      this.conflictResolver.resolveConflict(
        conflict,
        'last-write-wins',
        this.docManager
      )

      // 清空待处理操作
      this.pendingOperations = []
    }
  }

  /**
   * 注册回调
   */
  on(event: string, callback: (message: SyncMessage) => void): void {
    this.syncCallbacks.set(event, callback)
  }

  /**
   * 触发回调
   */
  private triggerCallback(event: string, message: SyncMessage): void {
    const callback = this.syncCallbacks.get(event)
    if (callback) {
      callback(message)
    }
  }

  /**
   * 获取文档管理器
   */
  getDocumentManager(): CRDTDocumentManager {
    return this.docManager
  }

  /**
   * 获取冲突解决器
   */
  getConflictResolver(): ConflictResolver {
    return this.conflictResolver
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.docManager.destroy()
    this.syncCallbacks.clear()
    this.pendingOperations = []

    logger.info('Sync Protocol destroyed')
  }
}