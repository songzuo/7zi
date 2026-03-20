/**
 * 智能体模块入口 - 优化版本
 * Agent Module Entry - Optimized Version
 *
 * 使用优化版本的 repository 和 auth-service
 * 包含缓存和 N+1 查询优化
 */

// Types
export * from './types';

// Repository - 使用优化版本
export {
  initializeAgentTables,
  createAgent,
  getAgentById,
  getAllAgents,
  getAgentsByIds,
  getAgentWithTokens,
  updateAgent,
  deleteAgent,
  validateAgentApiKey,
  createAgentToken,
  validateAgentToken,
  refreshAgentToken,
  revokeAgentToken,
  logDataAccess,
  getAgentDataAccessLog,
  updateAgentStatus,
  getAgentStats,
} from './repository-optimized';

// Auth Service - 使用优化版本
export {
  generateApiKey,
  hashApiKey,
  validateApiKeyFormat,
  registerAgent,
  authenticateAgent,
  generateAgentToken,
  verifyAgentToken,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from './auth-service-optimized';

// Wallet Repository - 使用优化版本
export {
  initializeWalletTables,
  createWallet,
  getWalletByAgentId,
  getWalletById,
  getOrCreateWallet,
  getWalletBalance,
  deposit,
  withdraw,
  transfer,
  consume,
  reward,
  refund,
  freezeBalance,
  unfreezeBalance,
  getTransactions,
  getWalletStats,
  getWalletWithRecentTransactions,
} from './wallet-repository-optimized';
