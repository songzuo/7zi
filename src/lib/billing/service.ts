/**
 * Billing Service
 * 计费管理核心服务
 */

import { db } from '../db'
import { logger } from '../logger'
import { TenantPlan } from '../tenant/types'

/**
 * 订阅状态
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PAST_DUE = 'past_due',
  PENDING = 'pending',
}

/**
 * 计划类型
 */
export enum PlanType {
  SUBSCRIPTION = 'subscription',
  USAGE_BASED = 'usage_based',
  HYBRID = 'hybrid',
}

/**
 * 发票状态
 */
export enum InvoiceStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

/**
 * 支付状态
 */
export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

/**
 * 支付方式
 */
export enum PaymentMethod {
  ALIPAY = 'alipay',
  WECHAT = 'wechat',
  STRIPE = 'stripe',
  BANK_TRANSFER = 'bank_transfer',
}

/**
 * 计划
 */
export interface Plan {
  id: string
  name: string
  type: PlanType
  priceMonthly: number
  priceYearly: number
  features: Record<string, unknown>
  limits: {
    aiCalls: number | 'unlimited'
    workflowRuns: number | 'unlimited'
    storageGB: number | 'unlimited'
  }
}

/**
 * 订阅
 */
export interface Subscription {
  id: string
  tenantId: string
  planId: string
  status: SubscriptionStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * 用量记录
 */
export interface UsageRecord {
  id: string
  tenantId: string
  resourceType: string
  quantity: number
  unitCost: number
  totalCost: number
  recordedAt: Date
}

/**
 * 发票
 */
export interface Invoice {
  id: string
  tenantId: string
  subscriptionId?: string
  status: InvoiceStatus
  amount: number
  currency: string
  dueDate: Date
  paidAt?: Date
  items: InvoiceItem[]
  createdAt: Date
}

/**
 * 发票项目
 */
export interface InvoiceItem {
  type: 'subscription' | 'usage'
  description: string
  quantity?: number
  unitCost?: number
  amount: number
}

/**
 * 支付
 */
export interface Payment {
  id: string
  tenantId: string
  invoiceId: string
  amount: number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  transactionId?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

/**
 * 生成唯一ID
 */
function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 15)
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`
}

/**
 * 计费服务类
 */
export class BillingService {
  /**
   * 用量单价配置
   */
  private readonly unitCosts = {
    ai_calls: 0.01,
    workflow_runs: 0.1,
    storage: 0.5,
  }

  /**
   * 获取计划
   */
  async getPlan(planId: string): Promise<Plan | null> {
    const row = await db.get<{
      id: string
      name: string
      type: string
      price_monthly: number
      price_yearly: number
      features: string
      limits: string
    }>('SELECT * FROM plans WHERE id = ?', [planId])
    
    if (!row) return null
    
    return {
      id: row.id,
      name: row.name,
      type: row.type as PlanType,
      priceMonthly: row.price_monthly,
      priceYearly: row.price_yearly,
      features: JSON.parse(row.features || '{}'),
      limits: JSON.parse(row.limits || '{}'),
    }
  }

  /**
   * 列出所有计划
   */
  async listPlans(): Promise<Plan[]> {
    const rows = await db.queryRows<{
      id: string
      name: string
      type: string
      price_monthly: number
      price_yearly: number
      features: string
      limits: string
    }>('SELECT * FROM plans')
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type as PlanType,
      priceMonthly: row.price_monthly,
      priceYearly: row.price_yearly,
      features: JSON.parse(row.features || '{}'),
      limits: JSON.parse(row.limits || '{}'),
    }))
  }

  /**
   * 获取订阅
   */
  async getSubscription(tenantId: string): Promise<Subscription | null> {
    const row = await db.get<{
      id: string
      tenant_id: string
      plan_id: string
      status: string
      current_period_start: string
      current_period_end: string
      cancel_at_period_end: boolean
      created_at: string
      updated_at: string
    }>(
      'SELECT * FROM subscriptions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1',
      [tenantId]
    )
    
    if (!row) return null
    
    return {
      id: row.id,
      tenantId: row.tenant_id,
      planId: row.plan_id,
      status: row.status as SubscriptionStatus,
      currentPeriodStart: new Date(row.current_period_start),
      currentPeriodEnd: new Date(row.current_period_end),
      cancelAtPeriodEnd: row.cancel_at_period_end,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  /**
   * 创建或更新订阅
   */
  async createOrUpdateSubscription(
    tenantId: string,
    planId: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly'
  ): Promise<Subscription> {
    const plan = await this.getPlan(planId)
    if (!plan) throw new Error('Plan not found')
    
    const existing = await this.getSubscription(tenantId)
    const now = new Date()
    const periodEnd = new Date(now)
    
    if (billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    }
    
    if (existing) {
      // 更新订阅
      await db.exec(`
        UPDATE subscriptions
        SET plan_id = ?, status = ?, current_period_start = ?,
            current_period_end = ?, updated_at = ?
        WHERE id = ?
      `, [
        planId,
        SubscriptionStatus.ACTIVE,
        now.toISOString(),
        periodEnd.toISOString(),
        now.toISOString(),
        existing.id,
      ])
      
      logger.info('Subscription updated', { tenantId, planId, billingCycle })
      
      return this.getSubscription(tenantId) as Promise<Subscription>
    } else {
      // 创建新订阅
      const id = generateId('sub')
      
      await db.exec(`
        INSERT INTO subscriptions (
          id, tenant_id, plan_id, status,
          current_period_start, current_period_end
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        id,
        tenantId,
        planId,
        SubscriptionStatus.ACTIVE,
        now.toISOString(),
        periodEnd.toISOString(),
      ])
      
      logger.info('Subscription created', { tenantId, planId, billingCycle })
      
      return this.getSubscription(tenantId) as Promise<Subscription>
    }
  }

  /**
   * 取消订阅
   */
  async cancelSubscription(
    tenantId: string,
    immediately: boolean = false
  ): Promise<void> {
    const subscription = await this.getSubscription(tenantId)
    if (!subscription) throw new Error('Subscription not found')
    
    if (immediately) {
      await db.exec(
        'UPDATE subscriptions SET status = ?, updated_at = ? WHERE id = ?',
        [SubscriptionStatus.CANCELLED, new Date().toISOString(), subscription.id]
      )
    } else {
      await db.exec(
        'UPDATE subscriptions SET cancel_at_period_end = ?, updated_at = ? WHERE id = ?',
        [true, new Date().toISOString(), subscription.id]
      )
    }
    
    logger.info('Subscription cancelled', { tenantId, immediately })
  }

  /**
   * 记录用量的使用
   */
  async recordUsage(
    tenantId: string,
    resourceType: 'ai_calls' | 'workflow_runs' | 'storage',
    quantity: number
  ): Promise<void> {
    const unitCost = this.unitCosts[resourceType] || 0
    const totalCost = quantity * unitCost
    const id = generateId('usage')
    
    await db.exec(`
      INSERT INTO usage_records (
        id, tenant_id, resource_type, quantity, unit_cost, total_cost
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [id, tenantId, resourceType, quantity, unitCost, totalCost])
    
    logger.debug('Usage recorded', { tenantId, resourceType, quantity, totalCost })
  }

  /**
   * 获取月度用量
   */
  async getMonthlyUsage(
    tenantId: string,
    month?: Date
  ): Promise<{
    resourceType: string
    totalQuantity: number
    unitCost: number
    totalCost: number
  }[]> {
    const targetMonth = month || new Date()
    const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1)
    const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59)
    
    const rows = await db.queryRows<{
      resource_type: string
      total_quantity: number
      unit_cost: number
      total_cost: number
    }>(
      `SELECT resource_type, SUM(quantity) as total_quantity,
              AVG(unit_cost) as unit_cost, SUM(total_cost) as total_cost
       FROM usage_records
       WHERE tenant_id = ? AND recorded_at >= ? AND recorded_at <= ?
       GROUP BY resource_type`,
      [tenantId, monthStart.toISOString(), monthEnd.toISOString()]
    )
    
    return rows.map(row => ({
      resourceType: row.resource_type,
      totalQuantity: row.total_quantity,
      unitCost: row.unit_cost,
      totalCost: row.total_cost,
    }))
  }

  /**
   * 生成发票
   */
  async generateInvoice(tenantId: string): Promise<Invoice> {
    const subscription = await this.getSubscription(tenantId)
    const usage = await this.getMonthlyUsage(tenantId)
    
    const items: InvoiceItem[] = []
    let totalAmount = 0
    
    // 添加订阅费用
    if (subscription && subscription.status === SubscriptionStatus.ACTIVE) {
      const plan = await this.getPlan(subscription.planId)
      if (plan) {
        items.push({
          type: 'subscription',
          description: `${plan.name} 月度订阅`,
          amount: plan.priceMonthly,
        })
        totalAmount += plan.priceMonthly
      }
    }
    
    // 添加用量费用
    for (const record of usage) {
      items.push({
        type: 'usage',
        description: this.getResourceTypeLabel(record.resourceType),
        quantity: record.totalQuantity,
        unitCost: record.unitCost,
        amount: record.totalCost,
      })
      totalAmount += record.totalCost
    }
    
    const id = generateId('inv')
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7) // 7天后到期
    
    await db.exec(`
      INSERT INTO invoices (
        id, tenant_id, subscription_id, status, amount, currency, due_date, items
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      tenantId,
      subscription?.id,
      InvoiceStatus.PENDING,
      totalAmount,
      'CNY',
      dueDate.toISOString(),
      JSON.stringify(items),
    ])
    
    logger.info('Invoice generated', { tenantId, invoiceId: id, amount: totalAmount })
    
    return this.getInvoice(id) as Promise<Invoice>
  }

  /**
   * 获取发票
   */
  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    const row = await db.get<{
      id: string
      tenant_id: string
      subscription_id: string | null
      status: string
      amount: number
      currency: string
      due_date: string
      paid_at: string | null
      items: string
      created_at: string
    }>('SELECT * FROM invoices WHERE id = ?', [invoiceId])
    
    if (!row) return null
    
    return {
      id: row.id,
      tenantId: row.tenant_id,
      subscriptionId: row.subscription_id || undefined,
      status: row.status as InvoiceStatus,
      amount: row.amount,
      currency: row.currency,
      dueDate: new Date(row.due_date),
      paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
      items: JSON.parse(row.items || '[]'),
      createdAt: new Date(row.created_at),
    }
  }

  /**
   * 列出发票
   */
  async listInvoices(
    tenantId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<Invoice[]> {
    const rows = await db.queryRows<{
      id: string
      tenant_id: string
      subscription_id: string | null
      status: string
      amount: number
      currency: string
      due_date: string
      paid_at: string | null
      items: string
      created_at: string
    }>(
      `SELECT * FROM invoices WHERE tenant_id = ?
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [tenantId, limit, offset]
    )
    
    return rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      subscriptionId: row.subscription_id || undefined,
      status: row.status as InvoiceStatus,
      amount: row.amount,
      currency: row.currency,
      dueDate: new Date(row.due_date),
      paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
      items: JSON.parse(row.items || '[]'),
      createdAt: new Date(row.created_at),
    }))
  }

  /**
   * 处理支付
   */
  async processPayment(
    invoiceId: string,
    method: PaymentMethod
  ): Promise<Payment> {
    const invoice = await this.getInvoice(invoiceId)
    if (!invoice) throw new Error('Invoice not found')
    
    if (invoice.status !== InvoiceStatus.PENDING) {
      throw new Error(`Invoice already ${invoice.status}`)
    }
    
    // 这里应该调用实际的支付网关
    // 目前简化为直接标记为支付成功
    const paymentId = generateId('pay')
    const transactionId = `txn_${Date.now()}`
    
    // 创建支付记录
    await db.exec(`
      INSERT INTO payments (
        id, tenant_id, invoice_id, amount, currency, method, status, transaction_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      paymentId,
      invoice.tenantId,
      invoiceId,
      invoice.amount,
      invoice.currency,
      method,
      PaymentStatus.COMPLETED,
      transactionId,
    ])
    
    // 更新发票状态
    await db.exec(
      'UPDATE invoices SET status = ?, paid_at = ? WHERE id = ?',
      [InvoiceStatus.PAID, new Date().toISOString(), invoiceId]
    )
    
    logger.info('Payment processed', {
      invoiceId,
      paymentId,
      method,
      amount: invoice.amount,
    })
    
    return {
      id: paymentId,
      tenantId: invoice.tenantId,
      invoiceId,
      amount: invoice.amount,
      currency: invoice.currency,
      method,
      status: PaymentStatus.COMPLETED,
      transactionId,
      createdAt: new Date(),
    }
  }

  /**
   * 获取资源类型标签
   */
  private getResourceTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ai_calls: 'AI 对话次数',
      workflow_runs: '工作流执行次数',
      storage: '存储空间 (GB)',
    }
    return labels[type] || type
  }

  /**
   * 检查用量是否超限
   */
  async checkUsageLimit(
    tenantId: string,
    resourceType: string
  ): Promise<{ exceeded: boolean; used: number; limit: number | 'unlimited' }> {
    const subscription = await this.getSubscription(tenantId)
    if (!subscription) {
      return { exceeded: true, used: 0, limit: 0 }
    }
    
    const plan = await this.getPlan(subscription.planId)
    if (!plan) {
      return { exceeded: true, used: 0, limit: 0 }
    }
    
    const usage = await this.getMonthlyUsage(tenantId)
    const used = usage.find(u => u.resourceType === resourceType)?.totalQuantity || 0
    const limit = plan.limits[this.getLimitKey(resourceType)]
    
    if (limit === 'unlimited') {
      return { exceeded: false, used, limit }
    }
    
    return {
      exceeded: used >= limit,
      used,
      limit,
    }
  }

  /**
   * 获取限制键名
   */
  private getLimitKey(resourceType: string): 'aiCalls' | 'workflowRuns' | 'storageGB' {
    const mapping: Record<string, 'aiCalls' | 'workflowRuns' | 'storageGB'> = {
      ai_calls: 'aiCalls',
      workflow_runs: 'workflowRuns',
      storage: 'storageGB',
    }
    return mapping[resourceType] || 'aiCalls'
  }
}

// 导出单例
export const billingService = new BillingService()
