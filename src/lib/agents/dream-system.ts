/**
 * 智能体梦境系统
 * 
 * 让智能体在"休息"时进行知识整合和创意生成
 */

import { LatticeNode, KnowledgeLattice, KnowledgeType } from './knowledge-lattice';

// ============== 类型定义 ==============

/**
 * 梦境类型
 */
export enum DreamType {
  INTEGRATION = 'integration',     // 整合梦: 将碎片知识连接成网络
  EXPLORATION = 'exploration',     // 探索梦: 模拟不同场景测试知识
  CREATIVE = 'creative',           // 创意梦: 随机组合产生新想法
  REHEARSAL = 'rehearsal',         // 预演梦: 模拟未来任务做准备
  HEALING = 'healing',             // 修复梦: 修正矛盾和错误知识
  FORESIGHT = 'foresight',         // 预知梦: 预测未来知识需求
}

/**
 * 梦境阶段
 */
export enum DreamPhase {
  FALLING_ASLEEP = 'falling_asleep',   // 入睡: 准备和放松
  LIGHT_SLEEP = 'light_sleep',         // 浅睡: 初步整理
  DEEP_SLEEP = 'deep_sleep',           // 深睡: 核心整合
  REM = 'rem',                         // 快速眼动: 创意和预演
  WAKING = 'waking',                   // 唤醒: 总结和记录
}

/**
 * 梦境会话
 */
export interface DreamSession {
  id: string;
  type: DreamType;
  phase: DreamPhase;
  startTime: number;
  duration: number;
  status: 'active' | 'completed' | 'interrupted';
  
  // 梦境内容
  inputs: DreamInput[];
  outputs: DreamOutput[];
  
  // 梦境统计
  stats: DreamStats;
}

/**
 * 梦境输入
 */
export interface DreamInput {
  nodeId: string;
  relevance: number;
  reason: string;
}

/**
 * 梦境输出
 */
export interface DreamOutput {
  type: 'insight' | 'connection' | 'idea' | 'prediction' | 'correction';
  content: string;
  confidence: number;
  relatedNodes: string[];
  metadata: Record<string, unknown>;
}

/**
 * 梦境统计
 */
export interface DreamStats {
  nodesProcessed: number;
  connectionsFound: number;
  ideasGenerated: number;
  insightsGained: number;
  predictionsMade: number;
  correctionsApplied: number;
}

/**
 * 梦境配置
 */
export interface DreamConfig {
  minDuration: number;          // 最小持续时间 (ms)
  maxDuration: number;          // 最大持续时间 (ms)
  integrationDepth: number;     // 整合深度
  creativityLevel: number;      // 创意水平 0-1
  predictionHorizon: number;    // 预测范围 (天)
  enableHealing: boolean;       // 启用修复
  enableForesight: boolean;     // 启用预知
}

/**
 * 创意想法
 */
export interface CreativeIdea {
  id: string;
  title: string;
  description: string;
  novelty: number;              // 新颖度 0-1
  feasibility: number;          // 可行性 0-1
  impact: number;               // 影响力 0-1
  sourceNodes: string[];
  generatedAt: number;
}

/**
 * 预测结果
 */
export interface Prediction {
  id: string;
  type: 'knowledge_need' | 'trend' | 'risk' | 'opportunity';
  description: string;
  probability: number;
  timeframe: string;
  relatedKnowledge: string[];
  recommendedActions: string[];
}

// ============== 梦境系统类 ==============

/**
 * 智能体梦境系统
 */
export class AgentDreamSystem {
  private lattice: KnowledgeLattice;
  private config: DreamConfig;
  private currentDream: DreamSession | null = null;
  private dreamHistory: DreamSession[] = [];
  private creativeIdeas: CreativeIdea[] = [];
  private predictions: Prediction[] = [];

  constructor(lattice: KnowledgeLattice, config?: Partial<DreamConfig>) {
    this.lattice = lattice;
    this.config = {
      minDuration: 5000,        // 5秒
      maxDuration: 60000,       // 60秒
      integrationDepth: 3,
      creativityLevel: 0.5,
      predictionHorizon: 7,
      enableHealing: true,
      enableForesight: true,
      ...config,
    };
  }

  // ============== 梦境控制 ==============

  /**
   * 进入梦境
   */
  async enterDream(type?: DreamType, duration?: number): Promise<DreamSession> {
    // 确定梦境类型
    const dreamType = type || this.selectDreamType();
    
    // 创建梦境会话
    this.currentDream = {
      id: `dream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: dreamType,
      phase: DreamPhase.FALLING_ASLEEP,
      startTime: Date.now(),
      duration: duration || this.config.minDuration,
      status: 'active',
      inputs: [],
      outputs: [],
      stats: {
        nodesProcessed: 0,
        connectionsFound: 0,
        ideasGenerated: 0,
        insightsGained: 0,
        predictionsMade: 0,
        correctionsApplied: 0,
      },
    };
    
    // 执行梦境阶段
    await this.executeDream();
    
    return this.currentDream;
  }

  /**
   * 选择梦境类型
   */
  private selectDreamType(): DreamType {
    const stats = this.lattice.getStats();
    const types: DreamType[] = [];
    const weights: number[] = [];
    
    // 基于知识晶格状态选择梦境类型
    // 如果知识碎片多，优先整合
    if (stats.totalNodes > 10 && stats.totalEdges < stats.totalNodes * 2) {
      types.push(DreamType.INTEGRATION);
      weights.push(0.4);
    }
    
    // 如果需要新知识，进行探索
    if (stats.averageConfidence < 0.7) {
      types.push(DreamType.EXPLORATION);
      weights.push(0.3);
    }
    
    // 默认分布
    if (types.length === 0) {
      types.push(
        DreamType.INTEGRATION,
        DreamType.CREATIVE,
        DreamType.REHEARSAL,
        DreamType.HEALING,
      );
      weights.push(0.3, 0.25, 0.25, 0.2);
    }
    
    // 加权随机选择
    const total = weights.reduce((a, b) => a + b, 0);
    const rand = Math.random() * total;
    let cumulative = 0;
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (rand < cumulative) return types[i];
    }
    
    return DreamType.INTEGRATION;
  }

  /**
   * 执行梦境
   */
  private async executeDream(): Promise<void> {
    if (!this.currentDream) return;
    
    const dream = this.currentDream;
    
    // 阶段1: 入睡
    await this.transitionPhase(DreamPhase.FALLING_ASLEEP);
    await this.fallingAsleepPhase();
    
    // 阶段2: 浅睡
    await this.transitionPhase(DreamPhase.LIGHT_SLEEP);
    await this.lightSleepPhase();
    
    // 阶段3: 深睡
    await this.transitionPhase(DreamPhase.DEEP_SLEEP);
    await this.deepSleepPhase();
    
    // 阶段4: REM (快速眼动)
    await this.transitionPhase(DreamPhase.REM);
    await this.remPhase();
    
    // 阶段5: 唤醒
    await this.transitionPhase(DreamPhase.WAKING);
    await this.wakingPhase();
    
    // 完成梦境
    dream.status = 'completed';
    dream.duration = Date.now() - dream.startTime;
    this.dreamHistory.push(dream);
    this.currentDream = null;
  }

  /**
   * 转换阶段
   */
  private async transitionPhase(phase: DreamPhase): Promise<void> {
    if (this.currentDream) {
      this.currentDream.phase = phase;
    }
    await this.delay(100); // 短暂延迟模拟阶段转换
  }

  // ============== 梦境阶段实现 ==============

  /**
   * 入睡阶段: 准备和放松
   */
  private async fallingAsleepPhase(): Promise<void> {
    if (!this.currentDream) return;
    
    // 选择输入知识
    const nodes = this.lattice.getAllNodes();
    const selectedNodes = this.selectInputNodes(nodes, 10);
    
    selectedNodes.forEach(node => {
      this.currentDream!.inputs.push({
        nodeId: node.id,
        relevance: node.weight,
        reason: 'Selected for dream processing',
      });
    });
    
    this.currentDream.stats.nodesProcessed = selectedNodes.length;
  }

  /**
   * 浅睡阶段: 初步整理
   */
  private async lightSleepPhase(): Promise<void> {
    if (!this.currentDream) return;
    
    // 简单的知识分类和初步关联
    const nodes = this.lattice.getAllNodes();
    const byType = this.groupByType(nodes);
    
    // 为每种类型生成初步洞察
    for (const [type, typeNodes] of Object.entries(byType)) {
      if (typeNodes.length >= 2) {
        this.currentDream.outputs.push({
          type: 'insight',
          content: `发现 ${typeNodes.length} 个 ${type} 类型的知识节点`,
          confidence: 0.8,
          relatedNodes: typeNodes.slice(0, 5).map(n => n.id),
          metadata: { type, count: typeNodes.length },
        });
        this.currentDream.stats.insightsGained++;
      }
    }
  }

  /**
   * 深睡阶段: 核心整合
   */
  private async deepSleepPhase(): Promise<void> {
    if (!this.currentDream) return;
    
    // 根据梦境类型执行不同的整合
    switch (this.currentDream.type) {
      case DreamType.INTEGRATION:
        await this.performIntegration();
        break;
      case DreamType.EXPLORATION:
        await this.performExploration();
        break;
      case DreamType.HEALING:
        await this.performHealing();
        break;
      default:
        await this.performIntegration();
    }
  }

  /**
   * REM阶段: 创意和预演
   */
  private async remPhase(): Promise<void> {
    if (!this.currentDream) return;
    
    // 创意生成
    if (this.currentDream.type === DreamType.CREATIVE || Math.random() < this.config.creativityLevel) {
      await this.generateCreativeIdeas();
    }
    
    // 预演
    if (this.currentDream.type === DreamType.REHEARSAL) {
      await this.performRehearsal();
    }
    
    // 预知
    if (this.config.enableForesight && Math.random() < 0.3) {
      await this.performForesight();
    }
  }

  /**
   * 唤醒阶段: 总结和记录
   */
  private async wakingPhase(): Promise<void> {
    if (!this.currentDream) return;
    
    // 总结梦境
    const summary = this.summarizeDream();
    
    this.currentDream.outputs.push({
      type: 'insight',
      content: summary,
      confidence: 0.9,
      relatedNodes: this.currentDream.inputs.slice(0, 5).map(i => i.nodeId),
      metadata: { isSummary: true },
    });
  }

  // ============== 梦境功能实现 ==============

  /**
   * 知识整合
   */
  private async performIntegration(): Promise<void> {
    if (!this.currentDream) return;
    
    const nodes = this.lattice.getAllNodes();
    const edges = this.lattice.getAllEdges();
    
    // 查找孤立节点（没有连接的节点）
    const connectedNodeIds = new Set(edges.flatMap(e => [e.from, e.to]));
    const isolatedNodes = nodes.filter(n => !connectedNodeIds.has(n.id));
    
    // 尝试为孤立节点找到潜在连接
    for (const node of isolatedNodes) {
      const potentialConnections = this.findPotentialConnections(node, nodes);
      
      for (const conn of potentialConnections) {
        // 添加潜在连接洞察
        this.currentDream.outputs.push({
          type: 'connection',
          content: `"${node.content}" 可能与 "${conn.target.content}" 相关`,
          confidence: conn.confidence,
          relatedNodes: [node.id, conn.target.id],
          metadata: {
            relationType: conn.relationType,
          },
        });
        this.currentDream.stats.connectionsFound++;
      }
    }
  }

  /**
   * 查找潜在连接
   */
  private findPotentialConnections(
    node: LatticeNode,
    allNodes: LatticeNode[]
  ): { target: LatticeNode; confidence: number; relationType: string }[] {
    const connections: { target: LatticeNode; confidence: number; relationType: string }[] = [];
    
    // 基于类型匹配
    for (const other of allNodes) {
      if (other.id === node.id) continue;
      
      // 标签重叠
      const tagOverlap = this.calculateTagOverlap(node.tags || [], other.tags || []);
      
      // 类型相关
      const typeRelated = this.areTypesRelated(node.type, other.type);
      
      if (tagOverlap > 0.5 || typeRelated) {
        connections.push({
          target: other,
          confidence: Math.max(tagOverlap, typeRelated ? 0.6 : 0),
          relationType: typeRelated ? 'partial-order' : 'association',
        });
      }
    }
    
    return connections.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }

  /**
   * 知识探索
   */
  private async performExploration(): Promise<void> {
    if (!this.currentDream) return;
    
    // 识别知识缺口
    const nodes = this.lattice.getAllNodes();
    const gaps = this.identifyKnowledgeGaps(nodes);
    
    for (const gap of gaps) {
      this.currentDream.outputs.push({
        type: 'prediction',
        content: `知识缺口: ${gap.description}`,
        confidence: gap.confidence,
        relatedNodes: gap.relatedNodes,
        metadata: { gapType: gap.type },
      });
    }
  }

  /**
   * 知识修复
   */
  private async performHealing(): Promise<void> {
    if (!this.currentDream) return;
    
    // 查找矛盾知识
    const contradictions = this.findContradictions();
    
    for (const c of contradictions) {
      this.currentDream.outputs.push({
        type: 'correction',
        content: `发现矛盾: "${c.node1.content}" 与 "${c.node2.content}"`,
        confidence: c.confidence,
        relatedNodes: [c.node1.id, c.node2.id],
        metadata: { contradictionType: c.type },
      });
      this.currentDream.stats.correctionsApplied++;
    }
  }

  /**
   * 创意生成
   */
  private async generateCreativeIdeas(): Promise<void> {
    if (!this.currentDream) return;
    
    const nodes = this.lattice.getAllNodes();
    if (nodes.length < 3) return;
    
    // 随机组合知识产生创意
    const numIdeas = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numIdeas; i++) {
      const randomNodes = this.shuffleArray(nodes).slice(0, 3);
      
      const idea: CreativeIdea = {
        id: `idea_${Date.now()}_${i}`,
        title: this.generateIdeaTitle(randomNodes),
        description: this.generateIdeaDescription(randomNodes),
        novelty: Math.random() * 0.5 + 0.5, // 0.5-1.0
        feasibility: Math.random() * 0.5 + 0.3, // 0.3-0.8
        impact: Math.random() * 0.5 + 0.4, // 0.4-0.9
        sourceNodes: randomNodes.map(n => n.id),
        generatedAt: Date.now(),
      };
      
      this.creativeIdeas.push(idea);
      
      this.currentDream.outputs.push({
        type: 'idea',
        content: `${idea.title}: ${idea.description}`,
        confidence: (idea.novelty + idea.feasibility + idea.impact) / 3,
        relatedNodes: idea.sourceNodes,
        metadata: { ideaId: idea.id },
      });
      this.currentDream.stats.ideasGenerated++;
    }
  }

  /**
   * 任务预演
   */
  private async performRehearsal(): Promise<void> {
    if (!this.currentDream) return;
    
    // 模拟未来可能的任务场景
    const scenarios = [
      '用户询问关于现有知识的深入问题',
      '需要快速整合多个领域的知识',
      '发现知识之间存在冲突',
      '需要向其他智能体分享知识',
    ];
    
    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    
    this.currentDream.outputs.push({
      type: 'prediction',
      content: `预演场景: ${randomScenario}`,
      confidence: 0.7,
      relatedNodes: this.currentDream.inputs.slice(0, 3).map(i => i.nodeId),
      metadata: { scenario: randomScenario },
    });
  }

  /**
   * 未来预知
   */
  private async performForesight(): Promise<void> {
    if (!this.currentDream) return;
    
    // 预测未来知识需求
    const prediction: Prediction = {
      id: `pred_${Date.now()}`,
      type: 'knowledge_need',
      description: '可能需要补充关于新兴技术的知识',
      probability: 0.6,
      timeframe: `${this.config.predictionHorizon}天内`,
      relatedKnowledge: this.currentDream.inputs.slice(0, 3).map(i => i.nodeId),
      recommendedActions: [
        '关注相关领域的发展动态',
        '准备扩展知识库',
        '建立相关知识的初步框架',
      ],
    };
    
    this.predictions.push(prediction);
    this.currentDream.stats.predictionsMade++;
    
    this.currentDream.outputs.push({
      type: 'prediction',
      content: prediction.description,
      confidence: prediction.probability,
      relatedNodes: prediction.relatedKnowledge,
      metadata: { timeframe: prediction.timeframe },
    });
  }

  // ============== 辅助方法 ==============

  /**
   * 选择输入节点
   */
  private selectInputNodes(nodes: LatticeNode[], count: number): LatticeNode[] {
    // 基于权重和随机性选择
    return this.shuffleArray(nodes)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, count);
  }

  /**
   * 按类型分组
   */
  private groupByType(nodes: LatticeNode[]): Record<string, LatticeNode[]> {
    return nodes.reduce((acc, node) => {
      const type = node.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(node);
      return acc;
    }, {} as Record<string, LatticeNode[]>);
  }

  /**
   * 计算标签重叠
   */
  private calculateTagOverlap(tags1: string[], tags2: string[]): number {
    if (!tags1.length || !tags2.length) return 0;
    
    const set1 = new Set(tags1);
    const set2 = new Set(tags2);
    const intersection = new Set([...set1].filter(t => set2.has(t)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * 判断类型是否相关
   */
  private areTypesRelated(type1: KnowledgeType, type2: KnowledgeType): boolean {
    const relatedGroups: KnowledgeType[][] = [
      [KnowledgeType.CONCEPT, KnowledgeType.RULE, KnowledgeType.FACT],
      [KnowledgeType.EXPERIENCE, KnowledgeType.MEMORY],
      [KnowledgeType.SKILL, KnowledgeType.EXPERIENCE],
      [KnowledgeType.PREFERENCE, KnowledgeType.MEMORY],
    ];
    
    return relatedGroups.some(group => 
      group.includes(type1) && group.includes(type2)
    );
  }

  /**
   * 识别知识缺口
   */
  private identifyKnowledgeGaps(nodes: LatticeNode[]): {
    type: string;
    description: string;
    confidence: number;
    relatedNodes: string[];
  }[] {
    const gaps: {
      type: string;
      description: string;
      confidence: number;
      relatedNodes: string[];
    }[] = [];
    
    // 检查类型覆盖
    const types = new Set(nodes.map(n => n.type));
    const missingTypes = Object.values(KnowledgeType).filter(t => !types.has(t));
    
    if (missingTypes.length > 0) {
      gaps.push({
        type: 'missing_type',
        description: `缺少 ${missingTypes.join(', ')} 类型的知识`,
        confidence: 0.8,
        relatedNodes: nodes.slice(0, 3).map(n => n.id),
      });
    }
    
    // 检查低置信度知识
    const lowConfidenceNodes = nodes.filter(n => n.confidence < 0.5);
    if (lowConfidenceNodes.length > 0) {
      gaps.push({
        type: 'low_confidence',
        description: `${lowConfidenceNodes.length} 个知识节点的置信度较低`,
        confidence: 0.7,
        relatedNodes: lowConfidenceNodes.slice(0, 3).map(n => n.id),
      });
    }
    
    return gaps;
  }

  /**
   * 查找矛盾知识
   */
  private findContradictions(): {
    node1: LatticeNode;
    node2: LatticeNode;
    type: string;
    confidence: number;
  }[] {
    // 简化实现：检查是否有相反的规则
    const rules = this.lattice.getNodesByType(KnowledgeType.RULE);
    const contradictions: {
      node1: LatticeNode;
      node2: LatticeNode;
      type: string;
      confidence: number;
    }[] = [];
    
    // 检查否定词
    const negationWords = ['不', '非', '无', '没有', 'never', 'not', 'no'];
    
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const r1 = rules[i].content;
        const r2 = rules[j].content;
        
        // 简单检查：如果一个包含否定词，另一个不包含
        const r1HasNegation = negationWords.some(w => r1.includes(w));
        const r2HasNegation = negationWords.some(w => r2.includes(w));
        
        if (r1HasNegation !== r2HasNegation) {
          // 检查核心内容是否相似
          if (this.calculateSimilarity(r1, r2) > 0.5) {
            contradictions.push({
              node1: rules[i],
              node2: rules[j],
              type: 'negation',
              confidence: 0.7,
            });
          }
        }
      }
    }
    
    return contradictions;
  }

  /**
   * 简单文本相似度
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
  }

  /**
   * 生成创意标题
   */
  private generateIdeaTitle(nodes: LatticeNode[]): string {
    const keywords = nodes.map(n => n.content.split(' ').slice(0, 2).join(' '));
    return keywords.slice(0, 2).join(' + ') + ' 融合';
  }

  /**
   * 生成创意描述
   */
  private generateIdeaDescription(nodes: LatticeNode[]): string {
    return `结合 ${nodes.map(n => `"${n.content}"`).join(' 和 ')}，产生新的洞察`;
  }

  /**
   * 总结梦境
   */
  private summarizeDream(): string {
    if (!this.currentDream) return '';
    
    const { stats, type } = this.currentDream;
    return `${type}梦境完成: 处理 ${stats.nodesProcessed} 个知识节点，` +
           `发现 ${stats.connectionsFound} 个潜在连接，` +
           `生成 ${stats.ideasGenerated} 个创意想法，` +
           `获得 ${stats.insightsGained} 个洞察。`;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 打乱数组
   */
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // ============== 公共接口 ==============

  /**
   * 知识整合（公共接口）
   */
  async integrateKnowledge(): Promise<DreamOutput[]> {
    const dream = await this.enterDream(DreamType.INTEGRATION);
    return dream.outputs.filter(o => o.type === 'connection' || o.type === 'insight');
  }

  /**
   * 生成创意（公共接口）
   */
  async generateIdeas(): Promise<CreativeIdea[]> {
    await this.enterDream(DreamType.CREATIVE);
    return this.creativeIdeas.slice(-5); // 返回最近的5个想法
  }

  /**
   * 获取梦境记录
   */
  getDreamHistory(): DreamSession[] {
    return this.dreamHistory;
  }

  /**
   * 获取创意想法
   */
  getCreativeIdeas(): CreativeIdea[] {
    return this.creativeIdeas;
  }

  /**
   * 获取预测
   */
  getPredictions(): Prediction[] {
    return this.predictions;
  }

  /**
   * 分析梦境模式
   */
  analyzeDreams(): {
    totalDreams: number;
    dreamsByType: Record<DreamType, number>;
    averageInsights: number;
    averageIdeas: number;
    mostProductiveType: DreamType;
  } {
    const history = this.dreamHistory;
    
    const dreamsByType = history.reduce((acc, dream) => {
      acc[dream.type] = (acc[dream.type] || 0) + 1;
      return acc;
    }, {} as Record<DreamType, number>);
    
    const avgInsights = history.length > 0
      ? history.reduce((sum, d) => sum + d.stats.insightsGained, 0) / history.length
      : 0;
    
    const avgIdeas = history.length > 0
      ? history.reduce((sum, d) => sum + d.stats.ideasGenerated, 0) / history.length
      : 0;
    
    // 找出最高效的梦境类型
    const typeProductivity = Object.entries(dreamsByType).map(([type, count]) => {
      const dreams = history.filter(d => d.type === type);
      const avgOutput = dreams.reduce((sum, d) => 
        sum + d.stats.insightsGained + d.stats.ideasGenerated + d.stats.connectionsFound, 0
      ) / dreams.length;
      return { type: type as DreamType, avgOutput };
    });
    
    const mostProductiveType = typeProductivity.sort((a, b) => b.avgOutput - a.avgOutput)[0]?.type || DreamType.INTEGRATION;
    
    return {
      totalDreams: history.length,
      dreamsByType,
      averageInsights: avgInsights,
      averageIdeas: avgIdeas,
      mostProductiveType,
    };
  }
}

// ============== 导出 ==============

export default AgentDreamSystem;