/**
 * 智能体知识晶格系统
 *
 * 为智能体量身定制的知识管理系统，采用晶格结构组织和表达知识。
 */

import { EventEmitter } from 'events';

// ============== 类型定义 ==============

/**
 * 知识节点类型
 */
export enum KnowledgeType {
  CONCEPT = 'concept',        // 概念
  RULE = 'rule',             // 规则
  EXPERIENCE = 'experience', // 经验
  SKILL = 'skill',           // 技能
  FACT = 'fact',            // 事实
  PREFERENCE = 'preference', // 偏好
  MEMORY = 'memory',        // 记忆
}

/**
 * 知识来源
 */
export enum KnowledgeSource {
  USER = 'user',           // 用户输入
  OBSERVATION = 'observation', // 观察
  INFERENCE = 'inference',     // 推理
  EXTERNAL = 'external',       // 外部数据
  EXPERIENCE = 'experience',   // 经验
  EVOMAP = 'evomap',         // Evomap同步
}

/**
 * 关系类型
 */
export enum RelationType {
  PARTIAL_ORDER = 'partial-order',   // 偏序关系（更具体/更抽象）
  EQUIVALENCE = 'equivalence',      // 等价关系
  COMPLEMENT = 'complement',        // 互补关系
  ASSOCIATION = 'association',      // 语义关联
  CAUSAL = 'causal',               // 因果关系
}

/**
 * 知识节点
 */
export interface LatticeNode {
  id: string;
  content: string;
  type: KnowledgeType;
  weight: number;        // 重要性 0-1
  confidence: number;    // 可信度 0-1
  timestamp: number;
  source: KnowledgeSource;
  embedding?: number[];  // 向量嵌入（用于语义相似度）
  metadata: Record<string, unknown>;
  tags?: string[];
}

/**
 * 关系边
 */
export interface LatticeEdge {
  id: string;
  from: string;
  to: string;
  type: RelationType;
  weight: number;        // 关系强度 0-1
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * 查询结果
 */
export interface QueryResult {
  nodes: LatticeNode[];
  edges: LatticeEdge[];
  relevanceScores: number[];
}

/**
 * 推理结果
 */
export interface InferenceResult {
  conclusion: string;
  confidence: number;
  path: string[];        // 推理路径（节点ID）
  supportingNodes: LatticeNode[];
}

/**
 * 晶格统计信息
 */
export interface LatticeStats {
  totalNodes: number;
  totalEdges: number;
  nodesByType: Record<KnowledgeType, number>;
  edgesByType: Record<RelationType, number>;
  averageWeight: number;
  averageConfidence: number;
}

// ============== 知识晶格类 ==============

/**
 * 知识晶格系统核心类
 */
export class KnowledgeLattice extends EventEmitter {
  private nodes: Map<string, LatticeNode> = new Map();
  private edges: Map<string, LatticeEdge> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();
  private reverseAdjacencyList: Map<string, Set<string>> = new Map();

  constructor() {
    super();
    this.setMaxListeners(100);
    this.initializeIndexes();
  }

  /**
   * 初始化索引
   */
  private initializeIndexes(): void {
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
  }

  // ============== 节点操作 ==============

  /**
   * 添加知识节点
   */
  addNode(node: LatticeNode): string {
    if (!node.id) {
      node.id = this.generateId();
    }
    if (!node.timestamp) {
      node.timestamp = Date.now();
    }
    if (!node.metadata) {
      node.metadata = {};
    }

    this.nodes.set(node.id, node);
    this.adjacencyList.set(node.id, new Set());
    this.reverseAdjacencyList.set(node.id, new Set());

    this.emit('nodeAdded', node);
    return node.id;
  }

  /**
   * 获取节点
   */
  getNode(id: string): LatticeNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * 更新节点
   */
  updateNode(id: string, updates: Partial<LatticeNode>): LatticeNode | null {
    const node = this.nodes.get(id);
    if (!node) return null;

    const updated = {
      ...node,
      ...updates,
      id, // 保持ID不变
      timestamp: Date.now(),
    };

    this.nodes.set(id, updated);
    this.emit('nodeUpdated', updated);
    return updated;
  }

  /**
   * 删除节点
   */
  deleteNode(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    // 删除相关边
    const adjacentEdges = this.getAdjacentEdges(id);
    adjacentEdges.forEach(edge => this.deleteEdge(edge.id));

    this.nodes.delete(id);
    this.adjacencyList.delete(id);
    this.reverseAdjacencyList.delete(id);

    this.emit('nodeDeleted', id);
    return true;
  }

  /**
   * 获取所有节点
   */
  getAllNodes(): LatticeNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 按类型过滤节点
   */
  getNodesByType(type: KnowledgeType): LatticeNode[] {
    return this.getAllNodes().filter(node => node.type === type);
  }

  /**
   * 按标签过滤节点
   */
  getNodesByTag(tag: string): LatticeNode[] {
    return this.getAllNodes().filter(node =>
      node.tags?.includes(tag)
    );
  }

  /**
   * 按来源过滤节点
   */
  getNodesBySource(source: KnowledgeSource): LatticeNode[] {
    return this.getAllNodes().filter(node => node.source === source);
  }

  // ============== 边操作 ==============

  /**
   * 添加关系边
   */
  addEdge(edge: LatticeEdge): string {
    if (!edge.id) {
      edge.id = this.generateId();
    }
    if (!edge.timestamp) {
      edge.timestamp = Date.now();
    }

    // 验证节点存在
    if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) {
      throw new Error('Both nodes must exist before adding an edge');
    }

    this.edges.set(edge.id, edge);
    this.adjacencyList.get(edge.from)?.add(edge.to);
    this.reverseAdjacencyList.get(edge.to)?.add(edge.from);

    this.emit('edgeAdded', edge);
    return edge.id;
  }

  /**
   * 获取边
   */
  getEdge(id: string): LatticeEdge | undefined {
    return this.edges.get(id);
  }

  /**
   * 删除边
   */
  deleteEdge(id: string): boolean {
    const edge = this.edges.get(id);
    if (!edge) return false;

    this.adjacencyList.get(edge.from)?.delete(edge.to);
    this.reverseAdjacencyList.get(edge.to)?.delete(edge.from);
    this.edges.delete(id);

    this.emit('edgeDeleted', id);
    return true;
  }

  /**
   * 获取所有边
   */
  getAllEdges(): LatticeEdge[] {
    return Array.from(this.edges.values());
  }

  /**
   * 获取节点相关的边
   */
  getAdjacentEdges(nodeId: string): LatticeEdge[] {
    return this.getAllEdges().filter(edge =>
      edge.from === nodeId || edge.to === nodeId
    );
  }

  /**
   * 获取两个节点之间的边
   */
  getEdgesBetween(from: string, to: string): LatticeEdge[] {
    return this.getAllEdges().filter(edge =>
      (edge.from === from && edge.to === to) ||
      (edge.from === to && edge.to === from)
    );
  }

  // ============== 晶格操作 ==============

  /**
   * 查找最近邻节点
   */
  findNearestNeighbors(
    nodeId: string,
    count: number = 5,
    _edgeType?: RelationType
  ): { node: LatticeNode; distance: number }[] {
    const node = this.getNode(nodeId);
    if (!node) return [];

    // 如果有嵌入向量，使用向量相似度
    if (node.embedding) {
      const neighbors = this.getAllNodes()
        .filter(n => n.id !== nodeId)
        .map(n => ({
          node: n,
          distance: this.cosineDistance(node.embedding!, n.embedding || []),
        }))
        .filter(n => n.distance > 0)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, count);

      return neighbors;
    }

    // 否则使用图距离
    const distances = this.bfsDistances(nodeId);
    return this.getAllNodes()
      .filter(n => n.id !== nodeId && distances.has(n.id))
      .map(n => ({
        node: n,
        distance: distances.get(n.id)!,
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, count);
  }

  /**
   * 广度优先搜索距离
   */
  private bfsDistances(startId: string): Map<string, number> {
    const distances = new Map<string, number>();
    const queue: { id: string; dist: number }[] = [{ id: startId, dist: 0 }];
    const visited = new Set<string>([startId]);

    while (queue.length > 0) {
      const { id, dist } = queue.shift()!;
      distances.set(id, dist);

      const neighbors = this.adjacencyList.get(id) || new Set();
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push({ id: neighborId, dist: dist + 1 });
        }
      }
    }

    return distances;
  }

  /**
   * 查找路径
   */
  findPath(fromId: string, toId: string): string[] | null {
    if (fromId === toId) return [fromId];

    const queue: { id: string; path: string[] }[] = [{ id: fromId, path: [fromId] }];
    const visited = new Set<string>([fromId]);

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;

      const neighbors = this.adjacencyList.get(id) || new Set();
      for (const neighborId of neighbors) {
        if (neighborId === toId) {
          return [...path, toId];
        }
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push({ id: neighborId, path: [...path, neighborId] });
        }
      }
    }

    return null;
  }

  /**
   * 晶格查询
   */
  query(
    filters: {
      type?: KnowledgeType;
      source?: KnowledgeSource;
      tags?: string[];
      minWeight?: number;
      minConfidence?: number;
    } = {}
  ): QueryResult {
    let nodes = this.getAllNodes();

    if (filters.type) {
      nodes = nodes.filter(n => n.type === filters.type);
    }
    if (filters.source) {
      nodes = nodes.filter(n => n.source === filters.source);
    }
    if (filters.tags?.length) {
      nodes = nodes.filter(n =>
        filters.tags!.some(tag => n.tags?.includes(tag))
      );
    }
    if (filters.minWeight !== undefined) {
      nodes = nodes.filter(n => n.weight >= filters.minWeight!);
    }
    if (filters.minConfidence !== undefined) {
      nodes = nodes.filter(n => n.confidence >= filters.minConfidence!);
    }

    // 获取相关边
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = this.getAllEdges().filter(e =>
      nodeIds.has(e.from) && nodeIds.has(e.to)
    );

    // 计算相关性分数
    const relevanceScores = nodes.map(n =>
      (n.weight * 0.5) + (n.confidence * 0.5)
    );

    return { nodes, edges, relevanceScores };
  }

  /**
   * 简单推理（基于图遍历）
   */
  infer(
    startNodeId: string,
    maxDepth: number = 3
  ): InferenceResult | null {
    const startNode = this.getNode(startNodeId);
    if (!startNode) return null;

    // 收集相关节点
    const relevantNodes = new Set<LatticeNode>();
    const visited = new Set<string>([startNodeId]);
    const queue: { id: string; depth: number }[] = [{ id: startNodeId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      const neighbors = this.adjacencyList.get(id) || new Set();
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          const neighbor = this.getNode(neighborId);
          if (neighbor) {
            relevantNodes.add(neighbor);
            queue.push({ id: neighborId, depth: depth + 1 });
          }
        }
      }
    }

    if (relevantNodes.size === 0) {
      return null;
    }

    // 简单推理：基于相关节点的权重和可信度
    const supportingNodes = Array.from(relevantNodes)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    const avgConfidence = supportingNodes.reduce(
      (sum, n) => sum + n.confidence,
      0
    ) / supportingNodes.length;

    return {
      conclusion: `Based on ${supportingNodes.length} related knowledge items`,
      confidence: avgConfidence,
      path: Array.from(visited),
      supportingNodes,
    };
  }

  // ============== 统计 ==============

  /**
   * 获取统计信息
   */
  getStats(): LatticeStats {
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

  // ============== 工具方法 ==============

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 余弦距离
   */
  private cosineDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return 1 - similarity;
  }

  /**
   * 清空晶格
   */
  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.initializeIndexes();
    this.emit('cleared');
  }

  /**
   * 导出晶格数据
   */
  export(): { nodes: LatticeNode[]; edges: LatticeEdge[] } {
    return {
      nodes: this.getAllNodes(),
      edges: this.getAllEdges(),
    };
  }

  /**
   * 导入晶格数据
   */
  import(data: { nodes: LatticeNode[]; edges: LatticeEdge[] }): void {
    this.clear();
    data.nodes.forEach(node => this.addNode(node));
    data.edges.forEach(edge => this.addEdge(edge));
    this.emit('imported');
  }
}

// ============== 导出 ==============

export default KnowledgeLattice;