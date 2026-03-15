/**
 * @fileoverview 知识晶格持久化存储（优化版）
 * @module lib/store/knowledge-store
 * 
 * @description
 * 知识图谱数据的文件系统持久化存储。
 * 使用 PersistentStore 实现节点和边的持久化。
 * 
 * 优化内容：
 * - 边索引加速出边/入边查询（O(n) -> O(1)）
 * - 防抖保存减少 I/O 频率
 * - 批量操作支持
 * - 懒保存机制
 */

import { PersistentStore } from './persistent-store';
import { LatticeNode, LatticeEdge, KnowledgeType, KnowledgeSource, RelationType } from '@/lib/agents/knowledge-lattice';
import { generateNodeId, generateEdgeId } from '@/lib/id';

/**
 * 知识存储数据结构
 */
export interface KnowledgeStoreData {
  nodes: LatticeNode[];
  edges: LatticeEdge[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
  };
}

/**
 * 知识存储类
 * 提供节点和边的持久化存储
 */
export class KnowledgeStore {
  private store: PersistentStore<KnowledgeStoreData>;
  
  // 内存缓存（用于快速查询）
  private nodesMap: Map<string, LatticeNode> = new Map();
  private edgesMap: Map<string, LatticeEdge> = new Map();
  
  // 邻接表（节点 ID -> 相邻节点 ID 集合）
  private adjacencyList: Map<string, Set<string>> = new Map();
  private reverseAdjacencyList: Map<string, Set<string>> = new Map();
  
  // 边索引（优化：O(1) 查找出边/入边）
  // nodeId -> edgeId[]
  private outgoingEdgesIndex: Map<string, Map<string, LatticeEdge>> = new Map();
  private incomingEdgesIndex: Map<string, Map<string, LatticeEdge>> = new Map();
  
  // 防抖保存
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSave = false;
  private readonly saveDebounceMs = 100; // 100ms 防抖
  private readonly lazySaveThreshold = 10; // 累积 10 次操作后强制保存
  private operationCount = 0;

  constructor() {
    this.store = new PersistentStore<KnowledgeStoreData>({
      name: 'knowledge',
      initialData: {
        nodes: [],
        edges: [],
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0.0'
        }
      },
      enableBackup: true,
      backupCount: 10
    });

    // 加载数据到内存缓存
    this.loadToMemory();
  }

  /**
   * 从文件加载数据到内存缓存
   */
  private loadToMemory(): void {
    const data = this.store.read();
    
    this.nodesMap.clear();
    this.edgesMap.clear();
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
    this.outgoingEdgesIndex.clear();
    this.incomingEdgesIndex.clear();

    // 加载节点
    for (const node of data.nodes) {
      this.nodesMap.set(node.id, node);
      this.adjacencyList.set(node.id, new Set());
      this.reverseAdjacencyList.set(node.id, new Set());
      this.outgoingEdgesIndex.set(node.id, new Map());
      this.incomingEdgesIndex.set(node.id, new Map());
    }

    // 加载边并构建邻接表和边索引
    for (const edge of data.edges) {
      this.edgesMap.set(edge.id, edge);
      this.adjacencyList.get(edge.from)?.add(edge.to);
      this.reverseAdjacencyList.get(edge.to)?.add(edge.from);
      
      // 构建边索引
      this.outgoingEdgesIndex.get(edge.from)?.set(edge.id, edge);
      this.incomingEdgesIndex.get(edge.to)?.set(edge.id, edge);
    }
  }

  /**
   * 防抖保存到文件
   */
  private scheduleSave(): void {
    this.operationCount++;
    this.pendingSave = true;
    
    // 达到阈值立即保存
    if (this.operationCount >= this.lazySaveThreshold) {
      this.flushSave();
      return;
    }
    
    // 防抖保存
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.flushSave();
    }, this.saveDebounceMs);
  }

  /**
   * 立即保存到文件
   */
  private flushSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    
    if (!this.pendingSave) return;
    
    this.saveToFileImmediate();
    this.pendingSave = false;
    this.operationCount = 0;
  }

  /**
   * 立即保存内存数据到文件（内部方法）
   */
  private saveToFileImmediate(): void {
    const data: KnowledgeStoreData = {
      nodes: Array.from(this.nodesMap.values()),
      edges: Array.from(this.edgesMap.values()),
      metadata: {
        createdAt: this.store.read().metadata.createdAt,
        updatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    };
    this.store.write(data);
  }

  /**
   * 保存内存数据到文件（已废弃，使用 scheduleSave）
   * @deprecated 使用 scheduleSave() 替代
   */
  private saveToFile(): void {
    this.scheduleSave();
  }

  // ============== 节点操作 ==============

  /**
   * 添加节点
   */
  addNode(node: LatticeNode): string {
    if (!node.id) {
      node.id = generateNodeId();
    }
    if (!node.timestamp) {
      node.timestamp = Date.now();
    }
    if (!node.metadata) {
      node.metadata = {};
    }
    if (!node.weight) {
      node.weight = 0.5;
    }
    if (!node.confidence) {
      node.confidence = 0.5;
    }

    this.nodesMap.set(node.id, node);
    this.adjacencyList.set(node.id, new Set());
    this.reverseAdjacencyList.set(node.id, new Set());
    this.outgoingEdgesIndex.set(node.id, new Map());
    this.incomingEdgesIndex.set(node.id, new Map());

    this.scheduleSave();
    return node.id;
  }

  /**
   * 获取节点
   */
  getNode(id: string): LatticeNode | undefined {
    return this.nodesMap.get(id);
  }

  /**
   * 更新节点
   */
  updateNode(id: string, updates: Partial<LatticeNode>): LatticeNode | null {
    const node = this.nodesMap.get(id);
    if (!node) return null;

    const updated = {
      ...node,
      ...updates,
      id, // 保持ID不变
      timestamp: Date.now(),
    };

    this.nodesMap.set(id, updated);
    this.saveToFile();
    return updated;
  }

  /**
   * 删除节点
   */
  deleteNode(id: string): boolean {
    const node = this.nodesMap.get(id);
    if (!node) return false;

    // 使用边索引高效删除相关边（O(边数) 而非 O(总边数)）
    const outgoingEdges = this.outgoingEdgesIndex.get(id);
    const incomingEdges = this.incomingEdgesIndex.get(id);
    
    // 删除出边
    if (outgoingEdges) {
      for (const edgeId of outgoingEdges.keys()) {
        this.deleteEdgeInternal(edgeId, false); // 不触发保存
      }
    }
    
    // 删除入边
    if (incomingEdges) {
      for (const edgeId of incomingEdges.keys()) {
        this.deleteEdgeInternal(edgeId, false); // 不触发保存
      }
    }

    this.nodesMap.delete(id);
    this.adjacencyList.delete(id);
    this.reverseAdjacencyList.delete(id);
    this.outgoingEdgesIndex.delete(id);
    this.incomingEdgesIndex.delete(id);

    this.scheduleSave();
    return true;
  }

  /**
   * 获取所有节点
   */
  getAllNodes(): LatticeNode[] {
    return Array.from(this.nodesMap.values());
  }

  // ============== 边操作 ==============

  /**
   * 添加边
   */
  addEdge(edge: LatticeEdge): string {
    if (!edge.id) {
      edge.id = generateEdgeId();
    }
    if (!edge.timestamp) {
      edge.timestamp = Date.now();
    }
    if (!edge.weight) {
      edge.weight = 0.5;
    }

    // 验证节点存在
    if (!this.nodesMap.has(edge.from) || !this.nodesMap.has(edge.to)) {
      throw new Error('Both nodes must exist before adding an edge');
    }

    this.edgesMap.set(edge.id, edge);
    
    // 确保邻接表存在
    if (!this.adjacencyList.has(edge.from)) {
      this.adjacencyList.set(edge.from, new Set());
    }
    if (!this.reverseAdjacencyList.has(edge.to)) {
      this.reverseAdjacencyList.set(edge.to, new Set());
    }
    
    this.adjacencyList.get(edge.from)?.add(edge.to);
    this.reverseAdjacencyList.get(edge.to)?.add(edge.from);
    
    // 更新边索引
    if (!this.outgoingEdgesIndex.has(edge.from)) {
      this.outgoingEdgesIndex.set(edge.from, new Map());
    }
    if (!this.incomingEdgesIndex.has(edge.to)) {
      this.incomingEdgesIndex.set(edge.to, new Map());
    }
    this.outgoingEdgesIndex.get(edge.from)?.set(edge.id, edge);
    this.incomingEdgesIndex.get(edge.to)?.set(edge.id, edge);

    this.scheduleSave();
    return edge.id;
  }

  /**
   * 获取边
   */
  getEdge(id: string): LatticeEdge | undefined {
    return this.edgesMap.get(id);
  }

  /**
   * 删除边（内部方法）
   * @param id 边 ID
   * @param scheduleSave 是否触发保存
   */
  private deleteEdgeInternal(id: string, scheduleSave: boolean = true): boolean {
    const edge = this.edgesMap.get(id);
    if (!edge) return false;

    this.adjacencyList.get(edge.from)?.delete(edge.to);
    this.reverseAdjacencyList.get(edge.to)?.delete(edge.from);
    
    // 更新边索引
    this.outgoingEdgesIndex.get(edge.from)?.delete(id);
    this.incomingEdgesIndex.get(edge.to)?.delete(id);
    
    this.edgesMap.delete(id);

    if (scheduleSave) {
      this.scheduleSave();
    }
    return true;
  }

  /**
   * 删除边
   */
  deleteEdge(id: string): boolean {
    return this.deleteEdgeInternal(id, true);
  }

  /**
   * 获取所有边
   */
  getAllEdges(): LatticeEdge[] {
    return Array.from(this.edgesMap.values());
  }

  /**
   * 获取节点相关的边（使用索引，O(边数) 而非 O(总边数)）
   */
  getAdjacentEdges(nodeId: string): LatticeEdge[] {
    const result: LatticeEdge[] = [];
    
    // 使用边索引直接获取
    const outgoing = this.outgoingEdgesIndex.get(nodeId);
    const incoming = this.incomingEdgesIndex.get(nodeId);
    
    if (outgoing) {
      result.push(...outgoing.values());
    }
    if (incoming) {
      // 避免重复添加（自环边）
      for (const edge of incoming.values()) {
        if (edge.from !== nodeId) {
          result.push(edge);
        }
      }
    }
    
    return result;
  }

  // ============== 高性能查询 ==============

  /**
   * 批量查询节点（避免多次调用）
   */
  getNodesByIds(ids: string[]): Map<string, LatticeNode> {
    const result = new Map<string, LatticeNode>();
    for (const id of ids) {
      const node = this.nodesMap.get(id);
      if (node) {
        result.set(id, node);
      }
    }
    return result;
  }

  /**
   * 高效获取出边（使用边索引，O(1) 查找）
   * 已优化：避免遍历所有边
   */
  getOutgoingEdges(nodeId: string): LatticeEdge[] {
    const edgeMap = this.outgoingEdgesIndex.get(nodeId);
    if (!edgeMap) return [];
    return Array.from(edgeMap.values());
  }

  /**
   * 高效获取入边（使用边索引，O(1) 查找）
   * 已优化：避免遍历所有边
   */
  getIncomingEdges(nodeId: string): LatticeEdge[] {
    const edgeMap = this.incomingEdgesIndex.get(nodeId);
    if (!edgeMap) return [];
    return Array.from(edgeMap.values());
  }

  /**
   * 高性能过滤查询
   * 单次遍历应用所有过滤条件
   */
  queryNodes(filters: {
    type?: KnowledgeType;
    source?: KnowledgeSource;
    tags?: string[];
    minWeight?: number;
    minConfidence?: number;
    searchText?: string;
    limit?: number;
    offset?: number;
  }): { nodes: LatticeNode[]; total: number } {
    const nodes: LatticeNode[] = [];
    const {
      type,
      source,
      tags,
      minWeight,
      minConfidence,
      searchText,
      limit,
      offset = 0,
    } = filters;

    const searchLower = searchText?.toLowerCase();
    const tagsSet = tags?.length ? new Set(tags) : null;

    let total = 0;

    for (const node of this.nodesMap.values()) {
      // 应用所有过滤条件
      if (type && node.type !== type) continue;
      if (source && node.source !== source) continue;
      if (minWeight !== undefined && node.weight < minWeight) continue;
      if (minConfidence !== undefined && node.confidence < minConfidence) continue;

      // 标签过滤
      if (tagsSet && node.tags) {
        const hasMatchingTag = node.tags.some(t => tagsSet.has(t));
        if (!hasMatchingTag) continue;
      }

      // 文本搜索
      if (searchLower && !node.content.toLowerCase().includes(searchLower)) {
        continue;
      }

      total++;

      // 只收集需要返回的节点（跳过 offset 之前的）
      if (total > offset && (limit === undefined || nodes.length < limit)) {
        nodes.push(node);
      }
    }

    return { nodes, total };
  }

  /**
   * 高性能边查询
   */
  queryEdges(filters: {
    type?: RelationType;
    from?: string;
    to?: string;
    minWeight?: number;
    nodeIds?: Set<string>; // 限制到特定节点集
    limit?: number;
    offset?: number;
  }): { edges: LatticeEdge[]; total: number } {
    const edges: LatticeEdge[] = [];
    const { type, from, to, minWeight, nodeIds, limit, offset = 0 } = filters;

    let total = 0;

    for (const edge of this.edgesMap.values()) {
      // 节点集过滤
      if (nodeIds) {
        if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue;
      }

      if (type && edge.type !== type) continue;
      if (from && edge.from !== from) continue;
      if (to && edge.to !== to) continue;
      if (minWeight !== undefined && edge.weight < minWeight) continue;

      total++;

      if (total > offset && (limit === undefined || edges.length < limit)) {
        edges.push(edge);
      }
    }

    return { edges, total };
  }

  /**
   * 获取邻居节点 ID
   */
  getNeighborIds(nodeId: string): string[] {
    const outgoing = this.adjacencyList.get(nodeId);
    const incoming = this.reverseAdjacencyList.get(nodeId);

    const result = new Set<string>();
    outgoing?.forEach(id => result.add(id));
    incoming?.forEach(id => result.add(id));

    return Array.from(result);
  }

  // ============== 统计 ==============

  /**
   * 获取统计信息
   */
  getStats() {
    const nodes = this.getAllNodes();
    const edges = this.getAllEdges();

    const nodesByType = Object.values(KnowledgeType).reduce((acc, type) => {
      acc[type as KnowledgeType] = nodes.filter(n => n.type === type).length;
      return acc;
    }, {} as Record<KnowledgeType, number>);

    const edgesByType = Object.values(RelationType).reduce((acc, type) => {
      acc[type as RelationType] = edges.filter(e => e.type === type).length;
      return acc;
    }, {} as Record<RelationType, number>);

    const avgWeight = nodes.length > 0
      ? nodes.reduce((sum, n) => sum + n.weight, 0) / nodes.length
      : 0;

    const avgConfidence = nodes.length > 0
      ? nodes.reduce((sum, n) => sum + n.confidence, 0) / nodes.length
      : 0;

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodesByType,
      edgesByType,
      averageWeight: avgWeight,
      averageConfidence: avgConfidence,
    };
  }

  /**
   * 清空所有数据
   */
  clear(): void {
    this.nodesMap.clear();
    this.edgesMap.clear();
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
    this.outgoingEdgesIndex.clear();
    this.incomingEdgesIndex.clear();
    this.saveToFileImmediate();
  }
  
  /**
   * 确保所有挂起的保存操作完成
   * 在程序退出前调用
   */
  flush(): void {
    this.flushSave();
  }

  /**
   * 导出所有数据
   */
  export(): { nodes: LatticeNode[]; edges: LatticeEdge[] } {
    return {
      nodes: this.getAllNodes(),
      edges: this.getAllEdges(),
    };
  }

  /**
   * 导入数据（批量操作，优化版）
   */
  import(data: { nodes: LatticeNode[]; edges: LatticeEdge[] }): void {
    // 清空现有数据
    this.nodesMap.clear();
    this.edgesMap.clear();
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
    this.outgoingEdgesIndex.clear();
    this.incomingEdgesIndex.clear();
    
    // 批量添加节点
    for (const node of data.nodes) {
      if (!node.id) node.id = generateNodeId();
      if (!node.timestamp) node.timestamp = Date.now();
      if (!node.metadata) node.metadata = {};
      if (!node.weight) node.weight = 0.5;
      if (!node.confidence) node.confidence = 0.5;
      
      this.nodesMap.set(node.id, node);
      this.adjacencyList.set(node.id, new Set());
      this.reverseAdjacencyList.set(node.id, new Set());
      this.outgoingEdgesIndex.set(node.id, new Map());
      this.incomingEdgesIndex.set(node.id, new Map());
    }
    
    // 批量添加边
    for (const edge of data.edges) {
      if (!edge.id) edge.id = generateEdgeId();
      if (!edge.timestamp) edge.timestamp = Date.now();
      if (!edge.weight) edge.weight = 0.5;
      
      // 跳过无效边
      if (!this.nodesMap.has(edge.from) || !this.nodesMap.has(edge.to)) {
        continue;
      }
      
      this.edgesMap.set(edge.id, edge);
      this.adjacencyList.get(edge.from)?.add(edge.to);
      this.reverseAdjacencyList.get(edge.to)?.add(edge.from);
      this.outgoingEdgesIndex.get(edge.from)?.set(edge.id, edge);
      this.incomingEdgesIndex.get(edge.to)?.set(edge.id, edge);
    }
    
    // 单次保存
    this.saveToFileImmediate();
  }
}

// 全局单例实例
let knowledgeStoreInstance: KnowledgeStore | null = null;

/**
 * 获取知识存储单例
 */
export function getKnowledgeStore(): KnowledgeStore {
  if (!knowledgeStoreInstance) {
    knowledgeStoreInstance = new KnowledgeStore();
  }
  return knowledgeStoreInstance;
}

export default KnowledgeStore;
