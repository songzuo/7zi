/**
 * 7zi Agent 经济系统 - 支付模块
 * @module economy/payment
 */

import {
  PaymentOrder,
  PaymentStatus,
  PaymentMethod,
  PaymentTransaction,
  PaymentOrderMetadata,
  RefundRequest,
  RefundResult,
} from './types.js';

// ==================== 支付网关接口 ====================

/**
 * 支付网关接口
 */
export interface IPaymentGateway {
  /**
   * 创建支付
   */
  createPayment(
    order: PaymentOrder,
    returnUrl?: string,
    cancelUrl?: string
  ): Promise<{
    paymentId: string;
    paymentUrl?: string;
    clientSecret?: string;
  }>;

  /**
   * 验证支付
   */
  verifyPayment(paymentId: string): Promise<{
    success: boolean;
    transactionId?: string;
  }>;

  /**
   * 处理退款
   */
  processRefund(
    transactionId: string,
    amount: number,
    reason?: string
  ): Promise<{
    success: boolean;
    refundTransactionId?: string;
  }>;

  /**
   * 查询支付状态
   */
  getPaymentStatus(paymentId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
  }>;
}

// ==================== Mock 支付网关 ====================

/**
 * 模拟支付网关（用于测试）
 */
class MockPaymentGateway implements IPaymentGateway {
  private payments: Map<string, { status: string; verified: boolean }> = new Map();

  async createPayment(
    order: PaymentOrder,
    returnUrl?: string,
    cancelUrl?: string
  ): Promise<{ paymentId: string; paymentUrl?: string; clientSecret?: string }> {
    const paymentId = `mock_payment_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    this.payments.set(paymentId, { status: 'pending', verified: false });

    return {
      paymentId,
      paymentUrl: `https://mock-payment.example.com/pay/${paymentId}`,
      clientSecret: `mock_secret_${paymentId}`,
    };
  }

  async verifyPayment(paymentId: string): Promise<{ success: boolean; transactionId?: string }> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      return { success: false };
    }

    // 模拟支付成功
    payment.status = 'completed';
    payment.verified = true;
    return {
      success: true,
      transactionId: `mock_txn_${paymentId}`,
    };
  }

  async processRefund(
    transactionId: string,
    amount: number,
    reason?: string
  ): Promise<{ success: boolean; refundTransactionId?: string }> {
    return {
      success: true,
      refundTransactionId: `mock_refund_${Date.now()}`,
    };
  }

  async getPaymentStatus(paymentId: string): Promise<{ status: 'pending' | 'processing' | 'completed' | 'failed' }> {
    const payment = this.payments.get(paymentId);
    return {
      status: (payment?.status as any) || 'pending',
    };
  }
}

// ==================== 存储实现 ====================

/**
 * 内存支付订单存储
 */
class InMemoryPaymentRepository {
  private orders: Map<string, PaymentOrder> = new Map();
  private customerIndex: Map<string, Set<string>> = new Map(); // customerId -> orderIds
  private agentIndex: Map<string, Set<string>> = new Map(); // agentId -> orderIds

  async findById(id: string): Promise<PaymentOrder | null> {
    return this.orders.get(id) || null;
  }

  async findByCustomerId(customerId: string, limit?: number): Promise<PaymentOrder[]> {
    const ids = this.customerIndex.get(customerId);
    if (!ids) return [];

    const orders = Array.from(ids)
      .map(id => this.orders.get(id)!)
      .filter(o => o !== undefined);

    if (limit) {
      return orders.slice(0, limit);
    }

    return orders;
  }

  async findByAgentId(agentId: string, limit?: number): Promise<PaymentOrder[]> {
    const ids = this.agentIndex.get(agentId);
    if (!ids) return [];

    const orders = Array.from(ids)
      .map(id => this.orders.get(id)!)
      .filter(o => o !== undefined);

    if (limit) {
      return orders.slice(0, limit);
    }

    return orders;
  }

  async create(order: Omit<PaymentOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentOrder> {
    const id = this.generateId();
    const now = new Date();
    const newOrder: PaymentOrder = {
      id,
      ...order,
      createdAt: now,
      updatedAt: now,
    };

    this.orders.set(id, newOrder);

    // Index
    if (!this.customerIndex.has(order.customerId)) {
      this.customerIndex.set(order.customerId, new Set());
    }
    this.customerIndex.get(order.customerId)!.add(id);

    if (!this.agentIndex.has(order.agentId)) {
      this.agentIndex.set(order.agentId, new Set());
    }
    this.agentIndex.get(order.agentId)!.add(id);

    return newOrder;
  }

  async update(id: string, updates: Partial<PaymentOrder>): Promise<PaymentOrder> {
    const order = this.orders.get(id);
    if (!order) throw new Error(`Payment order not found: ${id}`);

    const updated = {
      ...order,
      ...updates,
      id,
      updatedAt: new Date(),
    };

    this.orders.set(id, updated);
    return updated;
  }

  private generateId(): string {
    return `order_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// ==================== 支付服务 ====================

/**
 * 支付服务
 */
export class PaymentService {
  private paymentRepo: InMemoryPaymentRepository;
  private gateways: Map<PaymentMethod, IPaymentGateway>;

  constructor(
    paymentRepo?: InMemoryPaymentRepository,
    gateways?: Map<PaymentMethod, IPaymentGateway>
  ) {
    this.paymentRepo = paymentRepo || new InMemoryPaymentRepository();

    // 默认使用 Mock 网关
    this.gateways = gateways || new Map([
      ['stripe', new MockPaymentGateway()],
      ['alipay', new MockPaymentGateway()],
      ['wechat_pay', new MockPaymentGateway()],
      ['crypto_usdt', new MockPaymentGateway()],
      ['crypto_eth', new MockPaymentGateway()],
    ]);
  }

  /**
   * 创建支付订单
   */
  async createOrder(
    customerId: string,
    agentId: string,
    serviceId: string,
    amount: number,
    currency: 'CNY' | 'USD',
    metadata: PaymentOrderMetadata = {},
    expiresInMinutes: number = 30
  ): Promise<{ order: PaymentOrder; paymentUrl?: string; clientSecret?: string }> {
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const order = await this.paymentRepo.create({
      customerId,
      agentId,
      serviceId,
      amount,
      currency,
      status: 'pending',
      metadata,
      expiresAt,
      transactions: [],
    });

    return { order };
  }

  /**
   * 发起支付
   */
  async initiatePayment(
    orderId: string,
    paymentMethod: PaymentMethod,
    returnUrl?: string,
    cancelUrl?: string
  ): Promise<{ paymentId: string; paymentUrl?: string; clientSecret?: string }> {
    const order = await this.getPendingOrder(orderId);

    // 检查是否已过期
    if (new Date() > order.expiresAt) {
      await this.updateOrderStatus(orderId, 'cancelled');
      throw new Error('订单已过期');
    }

    if (paymentMethod === 'balance') {
      // 余额支付直接处理
      return await this.processBalancePayment(order);
    }

    // 获取支付网关
    const gateway = this.gateways.get(paymentMethod);
    if (!gateway) {
      throw new Error(`不支持的支付方式: ${paymentMethod}`);
    }

    // 创建支付
    const payment = await gateway.createPayment(order, returnUrl, cancelUrl);

    // 记录支付交易
    const transaction: PaymentTransaction = {
      id: this.generateTransactionId(),
      orderId: order.id,
      type: 'payment',
      amount: order.amount,
      status: 'pending',
      paymentMethod,
      externalTransactionId: payment.paymentId,
      createdAt: new Date(),
    };

    await this.addTransactionToOrder(order.id, transaction);

    return payment;
  }

  /**
   * 验证并完成支付
   */
  async verifyAndCompletePayment(orderId: string, paymentMethod: PaymentMethod): Promise<PaymentOrder> {
    const order = await this.getPendingOrder(orderId);

    if (paymentMethod === 'balance') {
      // 余额支付已在 initiatePayment 中处理
      return order;
    }

    const gateway = this.gateways.get(paymentMethod);
    if (!gateway) {
      throw new Error(`不支持的支付方式: ${paymentMethod}`);
    }

    // 获取支付交易
    const transaction = order.transactions.find(
      t => t.type === 'payment' && t.paymentMethod === paymentMethod && t.status === 'pending'
    );

    if (!transaction) {
      throw new Error('未找到待处理的支付交易');
    }

    // 验证支付
    const result = await gateway.verifyPayment(transaction.externalTransactionId!);

    if (result.success) {
      // 更新交易状态
      await this.updateTransaction(transaction.id, {
        status: 'completed',
        externalTransactionId: result.transactionId,
        completedAt: new Date(),
      });

      // 更新订单状态
      return await this.completeOrder(orderId);
    } else {
      // 支付失败
      await this.updateTransaction(transaction.id, { status: 'failed' });
      await this.updateOrderStatus(orderId, 'failed');
      throw new Error('支付验证失败');
    }
  }

  /**
   * 处理余额支付
   */
  private async processBalancePayment(order: PaymentOrder): Promise<{ paymentId: string }> {
    // 余额支付需要依赖钱包服务
    // 这里仅记录，实际扣款需要在钱包服务中完成
    const transaction: PaymentTransaction = {
      id: this.generateTransactionId(),
      orderId: order.id,
      type: 'payment',
      amount: order.amount,
      status: 'completed',
      paymentMethod: 'balance',
      createdAt: new Date(),
      completedAt: new Date(),
    };

    await this.addTransactionToOrder(order.id, transaction);
    await this.completeOrder(order.id);

    return { paymentId: transaction.id };
  }

  /**
   * 完成订单
   */
  private async completeOrder(orderId: string): Promise<PaymentOrder> {
    return await this.paymentRepo.update(orderId, {
      status: 'completed',
      paidAt: new Date(),
    });
  }

  /**
   * 申请退款
   */
  async requestRefund(request: RefundRequest): Promise<RefundResult> {
    const order = await this.paymentRepo.findById(request.orderId);
    if (!order) {
      return { success: false, refundAmount: 0, remainingAmount: 0, error: '订单不存在' };
    }

    if (order.status !== 'completed') {
      return { success: false, refundAmount: 0, remainingAmount: 0, error: '订单状态不允许退款' };
    }

    const refundAmount = request.amount === 0 ? order.amount : request.amount;

    if (refundAmount > order.amount) {
      return { success: false, refundAmount: 0, remainingAmount: 0, error: '退款金额超过订单金额' };
    }

    // 执行退款
    const success = await this.executeRefund(order, refundAmount, request.reason);

    if (success) {
      // 更新订单状态
      const newStatus = refundAmount === order.amount ? 'refunded' : 'partial_refunded';
      await this.paymentRepo.update(order.id, {
        status: newStatus,
        refundedAt: new Date(),
      });

      return {
        success: true,
        refundAmount,
        remainingAmount: order.amount - refundAmount,
      };
    }

    return {
      success: false,
      refundAmount: 0,
      remainingAmount: order.amount,
      error: '退款处理失败',
    };
  }

  /**
   * 执行退款
   */
  private async executeRefund(
    order: PaymentOrder,
    amount: number,
    reason?: string
  ): Promise<boolean> {
    // 获取支付交易
    const paymentTransaction = order.transactions.find(t => t.type === 'payment' && t.status === 'completed');

    if (!paymentTransaction) {
      return false;
    }

    // 余额支付直接退款（由钱包服务处理）
    if (paymentTransaction.paymentMethod === 'balance') {
      const refundTransaction: PaymentTransaction = {
        id: this.generateTransactionId(),
        orderId: order.id,
        type: 'refund',
        amount,
        status: 'completed',
        paymentMethod: 'balance',
        createdAt: new Date(),
        completedAt: new Date(),
      };

      await this.addTransactionToOrder(order.id, refundTransaction);
      return true;
    }

    // 其他支付方式通过网关退款
    const gateway = this.gateways.get(paymentTransaction.paymentMethod);
    if (!gateway) {
      return false;
    }

    const result = await gateway.processRefund(
      paymentTransaction.externalTransactionId!,
      amount,
      reason
    );

    if (result.success) {
      const refundTransaction: PaymentTransaction = {
        id: this.generateTransactionId(),
        orderId: order.id,
        type: 'refund',
        amount,
        status: 'completed',
        paymentMethod: paymentTransaction.paymentMethod,
        externalTransactionId: result.refundTransactionId,
        createdAt: new Date(),
        completedAt: new Date(),
      };

      await this.addTransactionToOrder(order.id, refundTransaction);
      return true;
    }

    return false;
  }

  /**
   * 取消订单
   */
  async cancelOrder(orderId: string): Promise<PaymentOrder> {
    const order = await this.paymentRepo.findById(orderId);
    if (!order) {
      throw new Error('订单不存在');
    }

    if (order.status !== 'pending') {
      throw new Error('只能取消待支付订单');
    }

    return await this.paymentRepo.update(orderId, {
      status: 'cancelled',
      cancelledAt: new Date(),
    });
  }

  /**
   * 获取订单
   */
  async getOrder(orderId: string): Promise<PaymentOrder> {
    const order = await this.paymentRepo.findById(orderId);
    if (!order) {
      throw new Error('订单不存在');
    }
    return order;
  }

  /**
   * 获取用户订单列表
   */
  async getCustomerOrders(customerId: string, limit: number = 20): Promise<PaymentOrder[]> {
    return await this.paymentRepo.findByCustomerId(customerId, limit);
  }

  /**
   * 获取 Agent 收入订单
   */
  async getAgentOrders(agentId: string, limit: number = 20): Promise<PaymentOrder[]> {
    return await this.paymentRepo.findByAgentId(agentId, limit);
  }

  /**
   * 获取待处理订单
   */
  private async getPendingOrder(orderId: string): Promise<PaymentOrder> {
    const order = await this.getOrder(orderId);
    if (order.status !== 'pending' && order.status !== 'processing') {
      throw new Error('订单状态错误');
    }
    return order;
  }

  /**
   * 更新订单状态
   */
  private async updateOrderStatus(orderId: string, status: PaymentStatus): Promise<PaymentOrder> {
    return await this.paymentRepo.update(orderId, { status });
  }

  /**
   * 添加交易到订单
   */
  private async addTransactionToOrder(orderId: string, transaction: PaymentTransaction): Promise<void> {
    const order = await this.paymentRepo.findById(orderId);
    if (!order) throw new Error('订单不存在');

    await this.paymentRepo.update(orderId, {
      transactions: [...order.transactions, transaction],
    });
  }

  /**
   * 更新交易
   */
  private async updateTransaction(transactionId: string, updates: Partial<PaymentTransaction>): Promise<void> {
    // 由于交易是订单的一部分，需要遍历所有订单
    // 在实际实现中，应该有独立的交易存储
    for (const order of Array.from((this.paymentRepo as any).orders.values())) {
      const tx = order.transactions.find(t => t.id === transactionId);
      if (tx) {
        Object.assign(tx, updates);
        await this.paymentRepo.update(order.id, { transactions: order.transactions });
        break;
      }
    }
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 注册支付网关
   */
  registerGateway(paymentMethod: PaymentMethod, gateway: IPaymentGateway): void {
    this.gateways.set(paymentMethod, gateway);
  }

  /**
   * 获取存储库（用于测试）
   */
  getPaymentRepo(): InMemoryPaymentRepository {
    return this.paymentRepo;
  }
}

// ==================== 导出 ====================

export { InMemoryPaymentRepository, MockPaymentGateway };
export type { IPaymentGateway };
