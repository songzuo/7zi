/**
 * @fileoverview 知识晶格持久化存储
 * @module lib/store/knowledge-store
 * 
 * @description
 * 知识图谱数据的文件系统持久化存储。
 * 使用 PersistentStore 实现节点和边的持久化。
 */

import { PersistentStore } from './persistent-store';
import { LatticeNode, LatticeEdge, KnowledgeType, KnowledgeSource, RelationType } from '@/lib/agents/knowledge-lattice';

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
  private adjacencyList: Map<string, Set<string>> = new Map();
  private reverseAdjacencyList: Map<string, Set<string>> = new Map();

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

    // 加载节点
    for (const node of data.nodes) {
      this.nodesMap.set(node.id, node);
      this.adjacencyList.set(node.id, new Set());
      this.reverseAdjacencyList.set(node.id, new Set());
    }

    // 加载边并构建邻接表
    for (const edge of data.edges) {
      this.edgesMap.set(edge.id, edge);
      this.adjacencyList.get(edge.from)?.add(edge.to);
      this.reverseAdjacencyList.get(edge.to)?.add(edge.from);
    }
  }

  /**
   * 保存内存数据到文件
   */
  private saveToFile(): void {
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

  // ============== 节点操作 ==============

  /**
   * 添加节点
   */
  addNode(node: LatticeNode): string {
    if (!node.id) {
      node.id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

    this.saveToFile();
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

    // 删除相关边
    const adjacentEdges = this.getAdjacentEdges(id);
    adjacentEdges.forEach(edge => this.deleteEdge(edge.id));

    this.nodesMap.delete(id);
    this.adjacencyList.delete(id);
    this.reverseAdjacencyList.delete(id);

    this.saveToFile();
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
      edge.id = `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

    this.saveToFile();
    return edge.id;
  }

  /**
   * 获取边
   */
  getEdge(id: string): LatticeEdge | undefined {
    return this.edgesMap.get(id);
  }

  /**
   * 删除边
   */
  deleteEdge(id: string): boolean {
    const edge = this.edgesMap.get(id);
    if (!edge) return false;

    this.adjacencyList.get(edge.from)?.delete(edge.to);
    this.reverseAdjacencyList.get(edge.to)?.delete(edge.from);
    this.edgesMap.delete(id);

    this.saveToFile();
    return true;
  }

  /**
   * 获取所有边
   */
  getAllEdges(): LatticeEdge[] {
    return Array.from(this.edgesMap.values());
  }

  /**
   * 获取节点相关的边
   */
  getAdjacentEdges(nodeId: string): LatticeEdge[] {
    return Array.from(this.edgesMap.values()).filter(edge =>
      edge.from === nodeId || edge.to === nodeId
    );
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
   * 高效获取相邻边（使用邻接表）
   * 解决 N+1 查询问题
   */
  getOutgoingEdges(nodeId: string): LatticeEdge[] {
    const result: LatticeEdge[] = [];
    const neighbors = this.adjacencyList.get(nodeId);
    if (!neighbors) return result;

    for (const edge of this.edgesMap.values()) {
      if (edge.from === nodeId) {
        result.push(edge);
      }
    }
    return result;
  }

  /**
   * 高效获取入边（使用反向邻接表）
   */
  getIncomingEdges(nodeId: string): LatticeEdge[] {
    const result: LatticeEdge[] = [];
    const neighbors = this.reverseAdjacencyList.get(nodeId);
    if (!neighbors) return result;

    for (const edge of this.edgesMap.values()) {
      if (edge.to === nodeId) {
        result.push(edge);
      }
    }
    return result;
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
    this.saveToFile();
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
   * 导入数据
   */
  import(data: { nodes: LatticeNode[]; edges: LatticeEdge[] }): void {
    this.clear();
    data.nodes.forEach(node => this.addNode(node));
    data.edges.forEach(edge => this.addEdge(edge));
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
