/**
 * 7zi Agent 经济系统 - 信用评分模块
 * @module economy/credit
 */

import {
  CreditScore,
  CreditLevel,
  CreditFactors,
  CreditHistoryEntry,
  CreditWeights,
  ICreditScoreRepository,
} from './types.js';

// ==================== 信用评分配置 ====================

/**
 * 默认信用评分权重
 */
const DEFAULT_WEIGHTS: CreditWeights = {
  taskCompletionRate: 0.25,
  responseSpeed: 0.15,
  userRating: 0.20,
  violationCount: -50, // 每次违规扣50分
  disputeRate: -0.10,
  onTimeDeliveryRate: 0.15,
  repeatCustomerRate: 0.15,
};

/**
 * 信用等级划分
 */
const CREDIT_LEVELS: { level: CreditLevel; minScore: number; maxScore: number }[] = [
  { level: 'excellent', minScore: 800, maxScore: 1000 },
  { level: 'good', minScore: 600, maxScore: 799 },
  { level: 'fair', minScore: 400, maxScore: 599 },
  { level: 'poor', minScore: 0, maxScore: 399 },
];

// ==================== 存储实现 ====================

/**
 * 内存信用评分存储
 */
class InMemoryCreditScoreRepository implements ICreditScoreRepository {
  private scores: Map<string, CreditScore> = new Map();
  private agentIndex: Map<string, string> = new Map(); // agentId -> scoreId

  async findByAgentId(agentId: string): Promise<CreditScore | null> {
    const scoreId = this.agentIndex.get(agentId);
    if (!scoreId) return null;
    return this.scores.get(scoreId) || null;
  }

  async create(data: Omit<CreditScore, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditScore> {
    const id = this.generateId();
    const now = new Date();
    const score: CreditScore = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    this.scores.set(id, score);
    this.agentIndex.set(data.agentId, id);

    return score;
  }

  async update(id: string, updates: Partial<CreditScore>): Promise<CreditScore> {
    const score = this.scores.get(id);
    if (!score) throw new Error(`Credit score not found: ${id}`);

    const updated = {
      ...score,
      ...updates,
      id,
      updatedAt: new Date(),
    };

    this.scores.set(id, updated);
    return updated;
  }

  async findTopAgents(limit: number = 10): Promise<CreditScore[]> {
    return Array.from(this.scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private generateId(): string {
    return `credit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// ==================== 信用评分服务 ====================

/**
 * 信用评分服务
 */
export class CreditScoreService {
  private creditRepo: ICreditScoreRepository;
  private weights: CreditWeights;

  constructor(
    creditRepo?: ICreditScoreRepository,
    weights?: CreditWeights
  ) {
    this.creditRepo = creditRepo || new InMemoryCreditScoreRepository();
    this.weights = weights || DEFAULT_WEIGHTS;
  }

  /**
   * 创建或获取 Agent 信用评分
   */
  async getOrCreateCreditScore(agentId: string): Promise<CreditScore> {
    let score = await this.creditRepo.findByAgentId(agentId);

    if (!score) {
      // 创建初始信用评分
      const initialFactors: CreditFactors = {
        taskCompletionRate: 50, // 初始为中等值
        responseSpeed: 50,
        userRating: 50,
        violationCount: 0,
        disputeRate: 0,
        onTimeDeliveryRate: 50,
        repeatCustomerRate: 50,
      };

      const initialScore = 500; // 默认中等信用分

      score = await this.creditRepo.create({
        agentId,
        score: initialScore,
        level: this.calculateLevel(initialScore),
        factors: initialFactors,
        history: [],
        lastCalculatedAt: new Date(),
      });
    }

    return score;
  }

  /**
   * 计算信用分数
   */
  async calculateCreditScore(
    agentId: string,
    factors: Partial<CreditFactors>
  ): Promise<CreditScore> {
    const currentScore = await this.getOrCreateCreditScore(agentId);

    // 合并因子
    const updatedFactors: CreditFactors = {
      ...currentScore.factors,
      ...factors,
    };

    // 计算新分数
    let newScore = 500; // 基础分

    // 任务完成率影响
    newScore += (updatedFactors.taskCompletionRate - 50) * 5 * this.weights.taskCompletionRate;

    // 响应速度影响
    newScore += (updatedFactors.responseSpeed - 50) * 4 * this.weights.responseSpeed;

    // 用户评分影响
    newScore += (updatedFactors.userRating - 50) * 6 * this.weights.userRating;

    // 按时交付率影响
    newScore += (updatedFactors.onTimeDeliveryRate - 50) * 4 * this.weights.onTimeDeliveryRate;

    // 回头客率影响
    newScore += (updatedFactors.repeatCustomerRate - 50) * 3 * this.weights.repeatCustomerRate;

    // 争议率影响（负向）
    newScore += updatedFactors.disputeRate * this.weights.disputeRate;

    // 违规次数影响（负向）
    const violationPenalty = updatedFactors.violationCount * this.weights.violationCount;
    newScore += violationPenalty;

    // 限制分数范围
    newScore = Math.max(0, Math.min(1000, Math.round(newScore)));

    // 计算等级
    const newLevel = this.calculateLevel(newScore);

    // 创建历史记录
    const historyEntry: CreditHistoryEntry = {
      timestamp: new Date(),
      previousScore: currentScore.score,
      newScore,
      change: newScore - currentScore.score,
      reason: '定期信用评分更新',
      factorChanges: factors,
    };

    const updatedHistory = [historyEntry, ...currentScore.history].slice(0, 100); // 只保留最近100条

    // 更新信用评分
    return await this.creditRepo.update(currentScore.id, {
      score: newScore,
      level: newLevel,
      factors: updatedFactors,
      history: updatedHistory,
      lastCalculatedAt: new Date(),
    });
  }

  /**
   * 记录任务完成
   */
  async recordTaskCompletion(
    agentId: string,
    completed: boolean,
    onTime: boolean,
    responseTime: number // 响应时间（秒）
  ): Promise<CreditScore> {
    const currentScore = await this.getOrCreateCreditScore(agentId);

    // 计算新的任务完成率 - 使用固定基数模拟
    const totalTasks = 100; // 假设历史有100次任务
    const currentCompletedTasks = Math.round(totalTasks * (currentScore.factors.taskCompletionRate / 100));
    const newCompletedTasks = currentCompletedTasks + (completed ? 1 : 0);
    const newCompletionRate = Math.round((newCompletedTasks / (totalTasks + 1)) * 100);

    // 计算新的按时交付率 - 使用固定基数模拟
    const totalDeliveries = 100; // 假设历史有100次交付
    const currentOnTimeDeliveries = Math.round(totalDeliveries * (currentScore.factors.onTimeDeliveryRate / 100));
    const newOnTimeDeliveries = currentOnTimeDeliveries + (onTime ? 1 : 0);
    const newOnTimeRate = Math.round((newOnTimeDeliveries / (totalDeliveries + 1)) * 100);

    // 计算响应速度评分（0-100）
    // 30秒内 = 100分，60秒 = 80分，120秒 = 60分，300秒 = 40分，超过 = 20分
    let responseSpeedScore = 0;
    if (responseTime <= 30) {
      responseSpeedScore = 100;
    } else if (responseTime <= 60) {
      responseSpeedScore = 80;
    } else if (responseTime <= 120) {
      responseSpeedScore = 60;
    } else if (responseTime <= 300) {
      responseSpeedScore = 40;
    } else {
      responseSpeedScore = 20;
    }

    // 更新响应速度（加权平均）
    const currentResponseSpeed = currentScore.factors.responseSpeed || 50;
    const newResponseSpeed = Math.round(
      (currentResponseSpeed * 0.7) + (responseSpeedScore * 0.3)
    );

    return await this.calculateCreditScore(agentId, {
      taskCompletionRate: newCompletionRate,
      onTimeDeliveryRate: newOnTimeRate,
      responseSpeed: newResponseSpeed,
    });
  }

  /**
   * 记录用户评分
   */
  async recordUserRating(
    agentId: string,
    rating: number // 1-5 星评分
  ): Promise<CreditScore> {
    const currentScore = await this.getOrCreateCreditScore(agentId);

    // 转换为0-100评分
    const ratingScore = rating * 20;

    // 更新平均评分
    const currentRating = currentScore.factors.userRating || 50;
    // 使用0.3的权重平滑更新
    const newRatingScore = Math.round(
      (currentRating * 0.7) + (ratingScore * 0.3)
    );

    return await this.calculateCreditScore(agentId, {
      userRating: newRatingScore,
    });
  }

  /**
   * 记录重复购买
   */
  async recordRepeatCustomer(agentId: string): Promise<CreditScore> {
    const currentScore = await this.getOrCreateCreditScore(agentId);

    // 假设总客户数为100
    const totalCustomers = 100;
    const repeatCustomers = (currentScore.factors.repeatCustomerRate / 100 * totalCustomers) + 1;
    const newRepeatRate = Math.round((repeatCustomers / totalCustomers) * 100);

    return await this.calculateCreditScore(agentId, {
      repeatCustomerRate: newRepeatRate,
    });
  }

  /**
   * 记录违规
   */
  async recordViolation(
    agentId: string,
    reason: string,
    severity: 'minor' | 'major' | 'critical'
  ): Promise<CreditScore> {
    const currentScore = await this.getOrCreateCreditScore(agentId);

    // 根据严重程度扣除额外分数
    const severityPenalty = severity === 'critical' ? -100 : severity === 'major' ? -50 : -20;

    // 更新违规次数
    const newViolationCount = currentScore.factors.violationCount + 1;

    // 直接更新分数（绕过常规计算，因为违规是严重事件）
    const newScore = Math.max(0, Math.min(1000, currentScore.score + severityPenalty));
    const newLevel = this.calculateLevel(newScore);

    const historyEntry: CreditHistoryEntry = {
      timestamp: new Date(),
      previousScore: currentScore.score,
      newScore,
      change: newScore - currentScore.score,
      reason: `违规记录: ${reason} (${severity})`,
      factorChanges: { violationCount: newViolationCount },
    };

    const updatedHistory = [historyEntry, ...currentScore.history].slice(0, 100);

    return await this.creditRepo.update(currentScore.id, {
      score: newScore,
      level: newLevel,
      factors: {
        ...currentScore.factors,
        violationCount: newViolationCount,
      },
      history: updatedHistory,
      lastCalculatedAt: new Date(),
    });
  }

  /**
   * 记录争议
   */
  async recordDispute(agentId: string, resolved: boolean): Promise<CreditScore> {
    const currentScore = await this.getOrCreateCreditScore(agentId);

    // 更新争议率
    const totalOrders = 100; // 近似值
    const newDisputeRate = currentScore.factors.disputeRate + 1;

    return await this.calculateCreditScore(agentId, {
      disputeRate: newDisputeRate,
    });
  }

  /**
   * 获取 Agent 信用等级
   */
  async getCreditLevel(agentId: string): Promise<CreditLevel> {
    const score = await this.getOrCreateCreditScore(agentId);
    return score.level;
  }

  /**
   * 获取顶级 Agent 列表
   */
  async getTopAgents(limit: number = 10): Promise<CreditScore[]> {
    return await this.creditRepo.findTopAgents(limit);
  }

  /**
   * 获取信用评分历史
   */
  async getCreditHistory(agentId: string): Promise<CreditHistoryEntry[]> {
    const score = await this.getOrCreateCreditScore(agentId);
    return score.history;
  }

  /**
   * 检查 Agent 是否符合服务条件
   */
  async checkServiceEligibility(
    agentId: string,
    minimumLevel?: CreditLevel,
    minimumScore?: number
  ): Promise<{ eligible: boolean; reason?: string }> {
    const score = await this.getOrCreateCreditScore(agentId);

    if (minimumScore && score.score < minimumScore) {
      return {
        eligible: false,
        reason: `信用分数不足。当前: ${score.score}, 最低要求: ${minimumScore}`,
      };
    }

    if (minimumLevel) {
      const levelOrder = ['poor', 'fair', 'good', 'excellent'];
      const currentLevelIndex = levelOrder.indexOf(score.level);
      const requiredLevelIndex = levelOrder.indexOf(minimumLevel);

      if (currentLevelIndex < requiredLevelIndex) {
        return {
          eligible: false,
          reason: `信用等级不足。当前: ${score.level}, 最低要求: ${minimumLevel}`,
        };
      }
    }

    return { eligible: true };
  }

  /**
   * 获取信用等级对应的折扣率
   */
  async getCreditDiscountRate(agentId: string): Promise<number> {
    const score = await this.getOrCreateCreditScore(agentId);

    // 根据信用等级提供折扣
    const discountRates = {
      excellent: 0.15, // 15% 折扣
      good: 0.10,      // 10% 折扣
      fair: 0.05,      // 5% 折扣
      poor: 0.0,       // 无折扣
    };

    return discountRates[score.level];
  }

  /**
   * 计算信用等级
   */
  private calculateLevel(score: number): CreditLevel {
    for (const level of CREDIT_LEVELS) {
      if (score >= level.minScore && score <= level.maxScore) {
        return level.level;
      }
    }
    return 'poor';
  }

  /**
   * 获取存储库（用于测试）
   */
  getCreditRepo(): ICreditScoreRepository {
    return this.creditRepo;
  }
}

// ==================== 导出 ====================

export { InMemoryCreditScoreRepository, DEFAULT_WEIGHTS };
