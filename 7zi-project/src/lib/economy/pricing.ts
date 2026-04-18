/**
 * 定价服务 - 会员等级和计费
 *
 * 功能：
 * - 会员等级管理
 * - 价格计算
 * - 配额管理
 */

// ============================================================================
// 类型定义
// ============================================================================

export enum MembershipTier {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export interface MembershipPlan {
  tier: MembershipTier
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  currency: string
  features: string[]
  limits: {
    maxAgents: number
    maxWorkflows: number
    maxStorageGB: number
    maxApiCallsPerMonth: number
    maxCollaborators: number
  }
}

export interface UserMembership {
  userId: string
  tier: MembershipTier
  startDate: number
  endDate?: number
  isYearly: boolean
  autoRenew: boolean
}

export interface UsageStats {
  agentsUsed: number
  workflowsUsed: number
  storageUsedGB: number
  apiCallsUsed: number
  collaboratorsUsed: number
}

// ============================================================================
// 会员计划配置
// ============================================================================

const MEMBERSHIP_PLANS: Record<MembershipTier, MembershipPlan> = {
  [MembershipTier.FREE]: {
    tier: MembershipTier.FREE,
    name: '免费版',
    description: '适合个人用户和小型项目',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'USD',
    features: [
      '最多 3 个智能体',
      '最多 5 个工作流',
      '1GB 存储空间',
      '每月 1000 次 API 调用',
      '最多 2 个协作者',
      '基础支持',
    ],
    limits: {
      maxAgents: 3,
      maxWorkflows: 5,
      maxStorageGB: 1,
      maxApiCallsPerMonth: 1000,
      maxCollaborators: 2,
    },
  },
  [MembershipTier.BASIC]: {
    tier: MembershipTier.BASIC,
    name: '基础版',
    description: '适合小型团队',
    monthlyPrice: 19,
    yearlyPrice: 190,
    currency: 'USD',
    features: [
      '最多 10 个智能体',
      '最多 20 个工作流',
      '10GB 存储空间',
      '每月 10000 次 API 调用',
      '最多 10 个协作者',
      '邮件支持',
      '基础分析',
    ],
    limits: {
      maxAgents: 10,
      maxWorkflows: 20,
      maxStorageGB: 10,
      maxApiCallsPerMonth: 10000,
      maxCollaborators: 10,
    },
  },
  [MembershipTier.PRO]: {
    tier: MembershipTier.PRO,
    name: '专业版',
    description: '适合中型团队',
    monthlyPrice: 49,
    yearlyPrice: 490,
    currency: 'USD',
    features: [
      '无限智能体',
      '无限工作流',
      '100GB 存储空间',
      '每月 100000 次 API 调用',
      '最多 50 个协作者',
      '优先支持',
      '高级分析',
      '自定义集成',
    ],
    limits: {
      maxAgents: Infinity,
      maxWorkflows: Infinity,
      maxStorageGB: 100,
      maxApiCallsPerMonth: 100000,
      maxCollaborators: 50,
    },
  },
  [MembershipTier.ENTERPRISE]: {
    tier: MembershipTier.ENTERPRISE,
    name: '企业版',
    description: '适合大型企业',
    monthlyPrice: 199,
    yearlyPrice: 1990,
    currency: 'USD',
    features: [
      '无限智能体',
      '无限工作流',
      '无限存储空间',
      '无限 API 调用',
      '无限协作者',
      '24/7 专属支持',
      '企业级安全',
      'SLA 保证',
      '专属客户经理',
      '自定义部署',
    ],
    limits: {
      maxAgents: Infinity,
      maxWorkflows: Infinity,
      maxStorageGB: Infinity,
      maxApiCallsPerMonth: Infinity,
      maxCollaborators: Infinity,
    },
  },
}

// ============================================================================
// 定价服务
// ============================================================================

export class PricingService {
  /**
   * 获取所有会员计划
   */
  getAllPlans(): MembershipPlan[] {
    return Object.values(MEMBERSHIP_PLANS)
  }

  /**
   * 根据等级获取会员计划
   */
  getPlanByTier(tier: MembershipTier): MembershipPlan | null {
    return MEMBERSHIP_PLANS[tier] || null
  }

  /**
   * 获取用户的会员等级
   */
  getUserMembershipTier(userId: string): MembershipTier {
    // TODO: 从数据库或缓存中获取用户的实际会员等级
    // 这里返回默认的免费版
    return MembershipTier.FREE
  }

  /**
   * 获取用户的会员信息
   */
  getUserMembership(userId: string): UserMembership | null {
    // TODO: 从数据库中获取用户的完整会员信息
    // 这里返回一个默认的免费版会员
    return {
      userId,
      tier: MembershipTier.FREE,
      startDate: Date.now(),
      isYearly: false,
      autoRenew: false,
    }
  }

  /**
   * 检查用户是否可以升级到指定等级
   */
  canUpgrade(userId: string, targetTier: MembershipTier): boolean {
    const currentTier = this.getUserMembershipTier(userId)
    const tierOrder = [
      MembershipTier.FREE,
      MembershipTier.BASIC,
      MembershipTier.PRO,
      MembershipTier.ENTERPRISE,
    ]

    const currentIndex = tierOrder.indexOf(currentTier)
    const targetIndex = tierOrder.indexOf(targetTier)

    return targetIndex > currentIndex
  }

  /**
   * 检查用户是否可以降级到指定等级
   */
  canDowngrade(userId: string, targetTier: MembershipTier): boolean {
    const currentTier = this.getUserMembershipTier(userId)
    const tierOrder = [
      MembershipTier.FREE,
      MembershipTier.BASIC,
      MembershipTier.PRO,
      MembershipTier.ENTERPRISE,
    ]

    const currentIndex = tierOrder.indexOf(currentTier)
    const targetIndex = tierOrder.indexOf(targetTier)

    return targetIndex < currentIndex
  }

  /**
   * 计算价格
   */
  calculatePrice(tier: MembershipTier, isYearly: boolean): number {
    const plan = this.getPlanByTier(tier)
    if (!plan) {
      throw new Error(`Invalid membership tier: ${tier}`)
    }

    return isYearly ? plan.yearlyPrice : plan.monthlyPrice
  }

  /**
   * 检查使用量是否超出限制
   */
  checkUsageLimits(
    userId: string,
    usage: UsageStats
  ): {
    withinLimits: boolean
    exceededLimits: string[]
  } {
    const membership = this.getUserMembership(userId)
    if (!membership) {
      return {
        withinLimits: false,
        exceededLimits: ['No membership found'],
      }
    }

    const plan = this.getPlanByTier(membership.tier)
    if (!plan) {
      return {
        withinLimits: false,
        exceededLimits: ['Invalid membership tier'],
      }
    }

    const exceededLimits: string[] = []

    if (usage.agentsUsed > plan.limits.maxAgents) {
      exceededLimits.push(`Agents: ${usage.agentsUsed}/${plan.limits.maxAgents}`)
    }

    if (usage.workflowsUsed > plan.limits.maxWorkflows) {
      exceededLimits.push(`Workflows: ${usage.workflowsUsed}/${plan.limits.maxWorkflows}`)
    }

    if (usage.storageUsedGB > plan.limits.maxStorageGB) {
      exceededLimits.push(`Storage: ${usage.storageUsedGB}GB/${plan.limits.maxStorageGB}GB`)
    }

    if (usage.apiCallsUsed > plan.limits.maxApiCallsPerMonth) {
      exceededLimits.push(`API calls: ${usage.apiCallsUsed}/${plan.limits.maxApiCallsPerMonth}`)
    }

    if (usage.collaboratorsUsed > plan.limits.maxCollaborators) {
      exceededLimits.push(
        `Collaborators: ${usage.collaboratorsUsed}/${plan.limits.maxCollaborators}`
      )
    }

    return {
      withinLimits: exceededLimits.length === 0,
      exceededLimits,
    }
  }

  /**
   * 获取下一个可升级的等级
   */
  getNextUpgradeTier(userId: string): MembershipTier | null {
    const currentTier = this.getUserMembershipTier(userId)
    const tierOrder = [
      MembershipTier.FREE,
      MembershipTier.BASIC,
      MembershipTier.PRO,
      MembershipTier.ENTERPRISE,
    ]

    const currentIndex = tierOrder.indexOf(currentTier)
    if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
      return null
    }

    return tierOrder[currentIndex + 1]
  }

  /**
   * 获取下一个可降级的等级
   */
  getNextDowngradeTier(userId: string): MembershipTier | null {
    const currentTier = this.getUserMembershipTier(userId)
    const tierOrder = [
      MembershipTier.FREE,
      MembershipTier.BASIC,
      MembershipTier.PRO,
      MembershipTier.ENTERPRISE,
    ]

    const currentIndex = tierOrder.indexOf(currentTier)
    if (currentIndex <= 0) {
      return null
    }

    return tierOrder[currentIndex - 1]
  }

  /**
   * 计算年度折扣
   */
  calculateYearlyDiscount(tier: MembershipTier): number {
    const plan = this.getPlanByTier(tier)
    if (!plan) {
      return 0
    }

    const yearlyMonthlyPrice = plan.yearlyPrice / 12
    const discount = ((plan.monthlyPrice - yearlyMonthlyPrice) / plan.monthlyPrice) * 100

    return Math.round(discount)
  }
}

// ============================================================================
// 单例实例
// ============================================================================

export const pricingService = new PricingService()

// ============================================================================
// 导出
// ============================================================================

export default pricingService
