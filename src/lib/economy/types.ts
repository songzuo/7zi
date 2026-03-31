/**
 * 7zi Agent 经济系统 - 类型定义
 * @module economy/types
 */

// ==================== 钱包相关类型 ====================

/**
 * Agent 钱包
 */
export interface AgentWallet {
  id: string;
  agentId: string;
  address: string; // 唯一钱包地址
  balance: number; // 最小单位：分
  currency: 'CNY' | 'USD';
  frozen: boolean; // 是否冻结
  frozenAmount: number; // 冻结金额
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 交易记录
 */
export interface Transaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number; // 正数为收入，负数为支出
  status: TransactionStatus;
  description: string;
  metadata: TransactionMetadata;
  createdAt: Date;
  completedAt?: Date;
}

export type TransactionType = 'charge' | 'payment' | 'refund' | 'withdraw' | 'freeze' | 'unfreeze';
export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * 交易元数据
 */
export interface TransactionMetadata {
  orderId?: string;
  serviceId?: string;
  customerId?: string;
  paymentMethod?: string;
  externalTransactionId?: string;
  reason?: string;
  [key: string]: unknown;
}

// ==================== 定价相关类型 ====================

/**
 * 服务定价策略
 */
export interface ServicePricing {
  id: string;
  agentId: string;
  serviceId: string;
  serviceName: string;
  pricingModel: PricingModel;
  basePrice: number; // 基础价格（分）
  currency: 'CNY' | 'USD';
  isActive: boolean;
  validFrom?: Date;
  validUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 定价模式
 */
export type PricingModel = 
  | 'per_call'      // 按调用次数
  | 'per_result'    // 按结果计费
  | 'per_minute'    // 按时间计费
  | 'per_hour'      // 按小时计费
  | 'subscription'  // 订阅制
  | 'freemium';     // 免费+增值

/**
 * 定价计算参数
 */
export interface PricingCalculation {
  pricing: ServicePricing;
  quantity: number; // 调用次数/分钟数/小时数
  resultSuccess?: boolean; // 是否成功（按结果计费时使用）
  discountCode?: string;
  customerId?: string;
}

/**
 * 定价结果
 */
export interface PricingResult {
  originalPrice: number;
  discount: number;
  finalPrice: number;
  currency: 'CNY' | 'USD';
  breakdown: PriceBreakdown;
}

export interface PriceBreakdown {
  baseAmount: number;
  quantityDiscount: number;
  couponDiscount: number;
  membershipDiscount: number;
}

// ==================== 优惠券相关类型 ====================

/**
 * 优惠券/折扣券
 */
export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number; // 折扣值（百分比或固定金额）
  minPurchase: number; // 最低消费门槛
  maxDiscount: number; // 最大折扣金额
  usageLimit: number; // 使用次数限制
  usedCount: number; // 已使用次数
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  applicableServices?: string[]; // 适用服务ID列表，空表示全部适用
  createdAt: Date;
}

export type CouponType = 'percentage' | 'fixed' | 'free_trial';

/**
 * 优惠券使用记录
 */
export interface CouponUsage {
  id: string;
  couponId: string;
  couponCode: string;
  customerId: string;
  orderId: string;
  discountAmount: number;
  usedAt: Date;
}

// ==================== 信用评分相关类型 ====================

/**
 * Agent 信用评分
 */
export interface CreditScore {
  id: string;
  agentId: string;
  score: number; // 0-1000
  level: CreditLevel;
  factors: CreditFactors;
  history: CreditHistoryEntry[];
  lastCalculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 信用等级
 */
export type CreditLevel = 'excellent' | 'good' | 'fair' | 'poor';

/**
 * 信用评分因子
 */
export interface CreditFactors {
  taskCompletionRate: number;    // 任务完成率 0-100
  responseSpeed: number;          // 响应速度评分 0-100
  userRating: number;             // 用户平均评分 0-100
  violationCount: number;         // 违规记录次数
  disputeRate: number;            // 争议率 0-100
  onTimeDeliveryRate: number;     // 按时交付率 0-100
  repeatCustomerRate: number;     // 回头客率 0-100
}

/**
 * 信用历史记录
 */
export interface CreditHistoryEntry {
  timestamp: Date;
  previousScore: number;
  newScore: number;
  change: number;
  reason: string;
  factorChanges?: Partial<CreditFactors>;
}

/**
 * 信用评分权重配置
 */
export interface CreditWeights {
  taskCompletionRate: number;     // 默认 0.25
  responseSpeed: number;           // 默认 0.15
  userRating: number;              // 默认 0.20
  violationCount: number;          // 默认 -50 per violation
  disputeRate: number;             // 默认 -0.10
  onTimeDeliveryRate: number;      // 默认 0.15
  repeatCustomerRate: number;      // 默认 0.15
}

// ==================== 支付相关类型 ====================

/**
 * 支付订单
 */
export interface PaymentOrder {
  id: string;
  customerId: string;
  agentId: string;
  serviceId: string;
  amount: number; // 订单金额（分）
  currency: 'CNY' | 'USD';
  status: PaymentStatus;
  paymentMethod?: PaymentMethod;
  transactions: PaymentTransaction[];
  metadata: PaymentOrderMetadata;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  refundedAt?: Date;
  cancelledAt?: Date;
}

/**
 * 支付状态
 */
export type PaymentStatus = 
  | 'pending'      // 待支付
  | 'processing'   // 处理中
  | 'completed'    // 已完成
  | 'failed'       // 失败
  | 'refunded'     // 已退款
  | 'partial_refunded' // 部分退款
  | 'cancelled';   // 已取消

/**
 * 支付方式
 */
export type PaymentMethod = 
  | 'stripe'
  | 'alipay'
  | 'wechat_pay'
  | 'crypto_usdt'
  | 'crypto_eth'
  | 'balance'; // 余额支付

/**
 * 支付交易记录
 */
export interface PaymentTransaction {
  id: string;
  orderId: string;
  type: 'payment' | 'refund';
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentMethod: PaymentMethod;
  externalTransactionId?: string;
  gatewayResponse?: Record<string, unknown>;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * 支付订单元数据
 */
export interface PaymentOrderMetadata {
  servicePricingId?: string;
  couponId?: string;
  couponCode?: string;
  discountAmount?: number;
  quantity?: number;
  description?: string;
  [key: string]: unknown;
}

/**
 * 退款请求
 */
export interface RefundRequest {
  orderId: string;
  amount: number; // 退款金额，0 表示全额退款
  reason: string;
  requestedBy: string;
}

/**
 * 退款结果
 */
export interface RefundResult {
  success: boolean;
  refundTransactionId?: string;
  refundAmount: number;
  remainingAmount: number;
  error?: string;
}

// ==================== 持久化接口 ====================

/**
 * 钱包存储接口
 */
export interface IWalletRepository {
  findById(id: string): Promise<AgentWallet | null>;
  findByAgentId(agentId: string): Promise<AgentWallet | null>;
  findByAddress(address: string): Promise<AgentWallet | null>;
  create(wallet: Omit<AgentWallet, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgentWallet>;
  update(id: string, updates: Partial<AgentWallet>): Promise<AgentWallet>;
  delete(id: string): Promise<boolean>;
  findAll(): Promise<AgentWallet[]>;
}

/**
 * 交易存储接口
 */
export interface ITransactionRepository {
  findById(id: string): Promise<Transaction | null>;
  findByWalletId(walletId: string, options?: QueryOptions): Promise<Transaction[]>;
  create(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction>;
  update(id: string, updates: Partial<Transaction>): Promise<Transaction>;
  findByOrderId(orderId: string): Promise<Transaction[]>;
}

/**
 * 信用评分存储接口
 */
export interface ICreditScoreRepository {
  findByAgentId(agentId: string): Promise<CreditScore | null>;
  create(score: Omit<CreditScore, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditScore>;
  update(id: string, updates: Partial<CreditScore>): Promise<CreditScore>;
  findTopAgents(limit: number): Promise<CreditScore[]>;
}

/**
 * 查询选项
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  startDate?: Date;
  endDate?: Date;
  types?: TransactionType[];
  statuses?: TransactionStatus[];
}
