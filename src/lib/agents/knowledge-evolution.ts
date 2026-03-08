/**
 * 知识遗传与进化系统
 * 
 * 让知识像基因一样遗传、变异、进化
 */

import { LatticeNode, KnowledgeLattice, KnowledgeType } from './knowledge-lattice';

// ============== 类型定义 ==============

/**
 * 知识基因
 */
export interface KnowledgeGene {
  id: string;
  dna: {
    coreConcept: string;
    relations: GeneRelation[];
    weights: number[];
    embedding?: number[];
  };
  fitness: number;
  generation: number;
  mutations: MutationRecord[];
  parentIds: string[];
  createdAt: number;
}

/**
 * 基因关系
 */
export interface GeneRelation {
  targetId: string;
  type: string;
  strength: number;
}

/**
 * 变异记录
 */
export interface MutationRecord {
  type: 'weight_adjustment' | 'relation_change' | 'concept_refinement' | 'random_exploration';
  before: unknown;
  after: unknown;
  timestamp: number;
  reason: string;
}

/**
 * 进化配置
 */
export interface EvolutionConfig {
  mutationRate: number;        // 变异率 0-1
  crossoverRate: number;       // 交叉率 0-1
  selectionPressure: number;   // 选择压力 0-1
  elitismCount: number;        // 精英保留数量
  populationSize: number;      // 种群大小
  maxGenerations: number;      // 最大代数
}

/**
 * 适应度因素
 */
export interface FitnessFactors {
  usageFrequency: number;      // 使用频率
  userFeedback: number;        // 用户反馈 -1 to 1
  inferenceSuccess: number;    // 推理成功率
  connectionDensity: number;   // 连接密度
  age: number;                 // 知识年龄（新鲜度）
  uniqueness: number;          // 独特性
}

/**
 * 进化结果
 */
export interface EvolutionResult {
  generation: number;
  bestGene: KnowledgeGene;
  averageFitness: number;
  improvements: string[];
  newKnowledge: LatticeNode[];
}

// ============== 知识进化类 ==============

/**
 * 知识进化引擎
 */
export class KnowledgeEvolution {
  private lattice: KnowledgeLattice;
  private genes: Map<string, KnowledgeGene> = new Map();
  private config: EvolutionConfig;
  private generation: number = 0;
  private fitnessHistory: number[] = [];

  constructor(lattice: KnowledgeLattice, config?: Partial<EvolutionConfig>) {
    this.lattice = lattice;
    this.config = {
      mutationRate: 0.1,
      crossoverRate: 0.7,
      selectionPressure: 0.5,
      elitismCount: 2,
      populationSize: 50,
      maxGenerations: 100,
      ...config,
    };
  }

  // ============== 基因操作 ==============

  /**
   * 将知识节点转换为基因
   */
  nodeToGene(node: LatticeNode): KnowledgeGene {
    const edges = this.lattice.getAdjacentEdges(node.id);
    
    return {
      id: `gene_${node.id}`,
      dna: {
        coreConcept: node.content,
        relations: edges.map(e => ({
          targetId: e.to === node.id ? e.from : e.to,
          type: e.type,
          strength: e.weight,
        })),
        weights: [node.weight, node.confidence],
        embedding: node.embedding,
      },
      fitness: 0,
      generation: this.generation,
      mutations: [],
      parentIds: [],
      createdAt: Date.now(),
    };
  }

  /**
   * 将基因转换回知识节点
   */
  geneToNode(gene: KnowledgeGene): LatticeNode {
    return {
      id: gene.id.replace('gene_', ''),
      content: gene.dna.coreConcept,
      type: KnowledgeType.CONCEPT, // 需要从元数据获取
      weight: gene.dna.weights[0],
      confidence: gene.dna.weights[1],
      timestamp: Date.now(),
      source: 'inference' as KnowledgeSource,
      embedding: gene.dna.embedding,
      metadata: {
        generation: gene.generation,
        fitness: gene.fitness,
        mutations: gene.mutations.length,
      },
    };
  }

  /**
   * 初始化种群
   */
  initializePopulation(): void {
    const nodes = this.lattice.getAllNodes();
    this.genes.clear();
    
    nodes.forEach(node => {
      const gene = this.nodeToGene(node);
      gene.fitness = this.evaluateFitness(node);
      this.genes.set(gene.id, gene);
    });
    
    this.generation = 0;
  }

  // ============== 适应度评估 ==============

  /**
   * 评估知识节点的适应度
   */
  evaluateFitness(node: LatticeNode): number {
    const factors = this.calculateFitnessFactors(node);
    
    // 加权计算适应度
    const fitness = 
      factors.usageFrequency * 0.25 +
      (factors.userFeedback + 1) / 2 * 0.20 +
      factors.inferenceSuccess * 0.20 +
      factors.connectionDensity * 0.15 +
      factors.age * 0.10 +
      factors.uniqueness * 0.10;
    
    return Math.max(0, Math.min(1, fitness));
  }

  /**
   * 计算适应度因素
   */
  private calculateFitnessFactors(node: LatticeNode): FitnessFactors {
    // 获取使用统计
    const usageCount = node.metadata?.usageCount || 0;
    const lastUsed = node.metadata?.lastUsed || node.timestamp;
    const feedbackScore = node.metadata?.feedbackScore || 0;
    
    // 计算年龄因素（越新越好，但有衰减）
    const ageMs = Date.now() - node.timestamp;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const age = Math.exp(-ageDays / 30); // 30天衰减
    
    // 计算连接密度
    const edges = this.lattice.getAdjacentEdges(node.id);
    const connectionDensity = Math.min(1, edges.length / 10);
    
    // 计算独特性（基于嵌入向量）
    const uniqueness = this.calculateUniqueness(node);
    
    // 计算推理成功率
    const inferenceSuccess = node.metadata?.inferenceSuccessRate || 0.5;
    
    return {
      usageFrequency: Math.min(1, usageCount / 100),
      userFeedback: feedbackScore,
      inferenceSuccess,
      connectionDensity,
      age,
      uniqueness,
    };
  }

  /**
   * 计算知识独特性
   */
  private calculateUniqueness(node: LatticeNode): number {
    if (!node.embedding) return 0.5;
    
    const allNodes = this.lattice.getAllNodes().filter(n => n.embedding && n.id !== node.id);
    if (allNodes.length === 0) return 1;
    
    // 计算与最近邻的平均距离
    const distances = allNodes.map(n => 
      this.cosineDistance(node.embedding!, n.embedding!)
    );
    
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    return avgDistance; // 距离越大越独特
  }

  // ============== 变异操作 ==============

  /**
   * 变异操作
   */
  mutate(gene: KnowledgeGene): KnowledgeGene {
    if (Math.random() > this.config.mutationRate) {
      return gene;
    }
    
    const mutated = { ...gene };
    mutated.dna = { ...gene.dna };
    mutated.mutations = [...gene.mutations];
    
    // 选择变异类型
    const mutationType = this.selectMutationType();
    
    switch (mutationType) {
      case 'weight_adjustment':
        this.applyWeightMutation(mutated);
        break;
      case 'relation_change':
        this.applyRelationMutation(mutated);
        break;
      case 'concept_refinement':
        this.applyConceptMutation(mutated);
        break;
      case 'random_exploration':
        this.applyRandomMutation(mutated);
        break;
    }
    
    mutated.generation = this.generation;
    return mutated;
  }

  /**
   * 选择变异类型
   */
  private selectMutationType(): MutationRecord['type'] {
    const types: MutationRecord['type'][] = [
      'weight_adjustment',
      'relation_change',
      'concept_refinement',
      'random_exploration',
    ];
    const weights = [0.4, 0.3, 0.2, 0.1];
    
    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (rand < cumulative) return types[i];
    }
    return types[0];
  }

  /**
   * 权重变异
   */
  private applyWeightMutation(gene: KnowledgeGene): void {
    const oldWeights = [...gene.dna.weights];
    gene.dna.weights = gene.dna.weights.map(w => {
      const mutation = (Math.random() - 0.5) * 0.2;
      return Math.max(0, Math.min(1, w + mutation));
    });
    
    gene.mutations.push({
      type: 'weight_adjustment',
      before: oldWeights,
      after: gene.dna.weights,
      timestamp: Date.now(),
      reason: 'Random weight adjustment for exploration',
    });
  }

  /**
   * 关系变异
   */
  private applyRelationMutation(gene: KnowledgeGene): void {
    if (gene.dna.relations.length === 0) return;
    
    const idx = Math.floor(Math.random() * gene.dna.relations.length);
    const oldRelation = { ...gene.dna.relations[idx] };
    
    // 调整关系强度
    const mutation = (Math.random() - 0.5) * 0.3;
    gene.dna.relations[idx].strength = Math.max(0, Math.min(1, 
      gene.dna.relations[idx].strength + mutation
    ));
    
    gene.mutations.push({
      type: 'relation_change',
      before: oldRelation,
      after: gene.dna.relations[idx],
      timestamp: Date.now(),
      reason: 'Relation strength adjustment',
    });
  }

  /**
   * 概念细化变异
   */
  private applyConceptMutation(gene: KnowledgeGene): void {
    // 这里可以集成LLM来细化概念
    // 目前使用简单的标记
    gene.mutations.push({
      type: 'concept_refinement',
      before: gene.dna.coreConcept,
      after: gene.dna.coreConcept, // 保持不变，等待LLM集成
      timestamp: Date.now(),
      reason: 'Concept refinement pending LLM integration',
    });
  }

  /**
   * 随机探索变异
   */
  private applyRandomMutation(gene: KnowledgeGene): void {
    // 添加随机噪声到嵌入向量
    if (gene.dna.embedding) {
      const oldEmbedding = [...gene.dna.embedding];
      gene.dna.embedding = gene.dna.embedding.map(v => {
        const noise = (Math.random() - 0.5) * 0.1;
        return v + noise;
      });
      
      gene.mutations.push({
        type: 'random_exploration',
        before: oldEmbedding.slice(0, 5), // 只记录前5维
        after: gene.dna.embedding.slice(0, 5),
        timestamp: Date.now(),
        reason: 'Random embedding exploration',
      });
    }
  }

  // ============== 交叉操作 ==============

  /**
   * 交叉操作
   */
  crossover(parent1: KnowledgeGene, parent2: KnowledgeGene): KnowledgeGene[] {
    if (Math.random() > this.config.crossoverRate) {
      return [parent1, parent2];
    }
    
    const child1 = this.createChild(parent1, parent2);
    const child2 = this.createChild(parent2, parent1);
    
    return [child1, child2];
  }

  /**
   * 创建子代
   */
  private createChild(parent1: KnowledgeGene, parent2: KnowledgeGene): KnowledgeGene {
    const child: KnowledgeGene = {
      id: `gene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dna: {
        coreConcept: this.combineConcepts(parent1.dna.coreConcept, parent2.dna.coreConcept),
        relations: this.combineRelations(parent1.dna.relations, parent2.dna.relations),
        weights: [
          (parent1.dna.weights[0] + parent2.dna.weights[0]) / 2,
          (parent1.dna.weights[1] + parent2.dna.weights[1]) / 2,
        ],
        embedding: this.combineEmbeddings(parent1.dna.embedding, parent2.dna.embedding),
      },
      fitness: 0,
      generation: this.generation,
      mutations: [],
      parentIds: [parent1.id, parent2.id],
      createdAt: Date.now(),
    };
    
    return child;
  }

  /**
   * 组合概念
   */
  private combineConcepts(concept1: string, concept2: string): string {
    // 简单组合，可以集成LLM生成更好的组合
    if (Math.random() < 0.5) {
      return concept1;
    }
    return concept2;
  }

  /**
   * 组合关系
   */
  private combineRelations(relations1: GeneRelation[], relations2: GeneRelation[]): GeneRelation[] {
    const combined = new Map<string, GeneRelation>();
    
    // 添加第一个父母的关系
    relations1.forEach(r => combined.set(r.targetId, r));
    
    // 合并第二个父母的关系
    relations2.forEach(r => {
      if (combined.has(r.targetId)) {
        // 平均强度
        const existing = combined.get(r.targetId)!;
        existing.strength = (existing.strength + r.strength) / 2;
      } else if (Math.random() < 0.5) {
        combined.set(r.targetId, r);
      }
    });
    
    return Array.from(combined.values());
  }

  /**
   * 组合嵌入向量
   */
  private combineEmbeddings(embedding1?: number[], embedding2?: number[]): number[] | undefined {
    if (!embedding1 && !embedding2) return undefined;
    if (!embedding1) return embedding2;
    if (!embedding2) return embedding1;
    
    // 平均组合
    return embedding1.map((v, i) => (v + (embedding2[i] || 0)) / 2);
  }

  // ============== 选择操作 ==============

  /**
   * 选择操作（锦标赛选择）
   */
  select(population: KnowledgeGene[]): KnowledgeGene[] {
    const selected: KnowledgeGene[] = [];
    const tournamentSize = 3;
    
    // 精英保留
    const sorted = [...population].sort((a, b) => b.fitness - a.fitness);
    for (let i = 0; i < this.config.elitismCount && i < sorted.length; i++) {
      selected.push(sorted[i]);
    }
    
    // 锦标赛选择
    while (selected.length < population.length) {
      const tournament: KnowledgeGene[] = [];
      for (let i = 0; i < tournamentSize; i++) {
        const idx = Math.floor(Math.random() * population.length);
        tournament.push(population[idx]);
      }
      
      const winner = tournament.sort((a, b) => b.fitness - a.fitness)[0];
      selected.push({ ...winner });
    }
    
    return selected;
  }

  // ============== 进化主循环 ==============

  /**
   * 运行一代进化
   */
  runGeneration(): EvolutionResult {
    const population = Array.from(this.genes.values());
    
    // 1. 评估适应度
    population.forEach(gene => {
      const node = this.geneToNode(gene);
      gene.fitness = this.evaluateFitness(node);
    });
    
    // 2. 选择
    const selected = this.select(population);
    
    // 3. 交叉
    const newPopulation: KnowledgeGene[] = [];
    for (let i = 0; i < selected.length - 1; i += 2) {
      const [child1, child2] = this.crossover(selected[i], selected[i + 1]);
      newPopulation.push(child1, child2);
    }
    
    // 4. 变异
    const mutatedPopulation = newPopulation.map(gene => this.mutate(gene));
    
    // 5. 更新种群
    this.genes.clear();
    mutatedPopulation.forEach(gene => {
      this.genes.set(gene.id, gene);
    });
    
    // 6. 记录统计
    const fitnesses = mutatedPopulation.map(g => g.fitness);
    const avgFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;
    this.fitnessHistory.push(avgFitness);
    
    // 7. 找出最佳基因
    const bestGene = mutatedPopulation.sort((a, b) => b.fitness - a.fitness)[0];
    
    this.generation++;
    
    return {
      generation: this.generation,
      bestGene,
      averageFitness: avgFitness,
      improvements: this.identifyImprovements(bestGene),
      newKnowledge: mutatedPopulation
        .filter(g => g.generation === this.generation)
        .map(g => this.geneToNode(g)),
    };
  }

  /**
   * 运行多代进化
   */
  async evolve(generations?: number): Promise<EvolutionResult[]> {
    const maxGen = generations || this.config.maxGenerations;
    const results: EvolutionResult[] = [];
    
    for (let i = 0; i < maxGen; i++) {
      const result = this.runGeneration();
      results.push(result);
      
      // 检查收敛
      if (this.checkConvergence()) {
        break;
      }
      
      // 可选：延迟以避免阻塞
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return results;
  }

  /**
   * 检查收敛
   */
  private checkConvergence(): boolean {
    if (this.fitnessHistory.length < 10) return false;
    
    const recent = this.fitnessHistory.slice(-10);
    const variance = this.calculateVariance(recent);
    
    return variance < 0.001; // 方差很小表示收敛
  }

  /**
   * 计算方差
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  /**
   * 识别改进点
   */
  private identifyImprovements(gene: KnowledgeGene): string[] {
    const improvements: string[] = [];
    
    if (gene.fitness > 0.8) {
      improvements.push(`高适应度知识: ${gene.dna.coreConcept}`);
    }
    
    if (gene.mutations.length > 0) {
      const recentMutation = gene.mutations[gene.mutations.length - 1];
      improvements.push(`最近变异: ${recentMutation.type}`);
    }
    
    if (gene.dna.relations.length > 5) {
      improvements.push(`丰富连接: ${gene.dna.relations.length} 条关系`);
    }
    
    return improvements;
  }

  // ============== 工具方法 ==============

  /**
   * 余弦距离
   */
  private cosineDistance(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    
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
   * 获取进化统计
   */
  getStats(): {
    generation: number;
    populationSize: number;
    averageFitness: number;
    bestFitness: number;
    fitnessTrend: number;
  } {
    const fitnesses = Array.from(this.genes.values()).map(g => g.fitness);
    const avgFitness = fitnesses.length > 0 
      ? fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length 
      : 0;
    const bestFitness = fitnesses.length > 0 ? Math.max(...fitnesses) : 0;
    
    // 计算趋势（最近5代的平均改进）
    let trend = 0;
    if (this.fitnessHistory.length >= 5) {
      const recent = this.fitnessHistory.slice(-5);
      const older = this.fitnessHistory.slice(-10, -5);
      if (older.length > 0) {
        trend = (recent.reduce((a, b) => a + b, 0) / recent.length) -
                (older.reduce((a, b) => a + b, 0) / older.length);
      }
    }
    
    return {
      generation: this.generation,
      populationSize: this.genes.size,
      averageFitness: avgFitness,
      bestFitness,
      fitnessTrend: trend,
    };
  }

  /**
   * 导出进化数据
   */
  export(): {
    genes: KnowledgeGene[];
    generation: number;
    fitnessHistory: number[];
    config: EvolutionConfig;
  } {
    return {
      genes: Array.from(this.genes.values()),
      generation: this.generation,
      fitnessHistory: this.fitnessHistory,
      config: this.config,
    };
  }

  /**
   * 导入进化数据
   */
  import(data: {
    genes: KnowledgeGene[];
    generation: number;
    fitnessHistory: number[];
    config: EvolutionConfig;
  }): void {
    this.genes.clear();
    data.genes.forEach(gene => this.genes.set(gene.id, gene));
    this.generation = data.generation;
    this.fitnessHistory = data.fitnessHistory;
    this.config = data.config;
  }
}

// ============== 导出 ==============

export default KnowledgeEvolution;