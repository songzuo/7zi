/**
 * 7zi Agent 经济系统 - 统一导出
 * @module economy
 */

// 类型定义
export * from './types.js';

// 钱包模块
export {
  WalletService,
  InMemoryWalletRepository,
  InMemoryTransactionRepository,
} from './wallet.js';

// 定价模块
export {
  PricingService,
  InMemoryPricingRepository,
  InMemoryCouponRepository,
} from './pricing.js';

// 信用评分模块
export {
  CreditScoreService,
  InMemoryCreditScoreRepository,
  DEFAULT_WEIGHTS,
} from './credit.js';

// 支付模块
export {
  PaymentService,
  InMemoryPaymentRepository,
  MockPaymentGateway,
} from './payment.js';
export type { IPaymentGateway } from './payment.js';
