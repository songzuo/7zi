/**
 * 智能体模块统一导出
 * Agent Module Unified Exports
 */

// 类型定义
export * from './types';

// 认证服务
export {
  generateApiKey,
  hashApiKey,
  validateApiKeyFormat,
  registerAgent,
  authenticateAgent,
  generateAgentToken,
  verifyAgentToken,
  refreshAgentToken,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from './auth-service';

export {
  generateApiKey as generateApiKeyOptimized,
  hashApiKey as hashApiKeyOptimized,
  validateApiKeyFormat as validateApiKeyFormatOptimized,
  registerAgent as registerAgentOptimized,
  authenticateAgent as authenticateAgentOptimized,
  generateAgentToken as generateAgentTokenOptimized,
  verifyAgentToken as verifyAgentTokenOptimized,
  refreshAgentToken as refreshAgentTokenOptimized,
} from './auth-service-optimized';

// 数据仓库
export {
  initializeAgentTables,
  createAgent,
  getAgentById,
  getAllAgents,
  updateAgent,
  updateAgentStatus,
  deleteAgent,
  updateAgentLastActive,
  validateAgentApiKey,
  mapRowToAgent,
  getAgentDataAccessLog,
  logDataAccess,
} from './repository';

export {
  initializeAgentTables as initializeAgentTablesOptimized,
  createAgent as createAgentOptimized,
  getAgentById as getAgentByIdOptimized,
  getAllAgents as getAllAgentsOptimized,
  updateAgent as updateAgentOptimized,
  updateAgentStatus as updateAgentStatusOptimized,
  deleteAgent as deleteAgentOptimized,
  updateAgentLastActive as updateAgentLastActiveOptimized,
  validateAgentApiKey as validateAgentApiKeyOptimized,
} from './repository-optimized';

export {
  initializeAgentTables as initializeAgentTablesV2,
  createAgent as createAgentV2,
  getAgentById as getAgentByIdV2,
  getAllAgents as getAllAgentsV2,
  updateAgent as updateAgentV2,
  updateAgentStatus as updateAgentStatusV2,
  deleteAgent as deleteAgentV2,
  updateAgentLastActive as updateAgentLastActiveV2,
  validateAgentApiKey as validateAgentApiKeyV2,
} from './repository-optimized-v2';

// 钱包仓库
export {
  initializeWalletTables,
  createWallet,
  getWalletByAgentId,
  getWalletBalance,
  deposit,
  withdraw,
  transfer,
  getTransactions,
  getWalletStats,
} from './wallet-repository';

export {
  initializeWalletTables as initializeWalletTablesOptimized,
  createWallet as createWalletOptimized,
  getWalletByAgentId as getWalletByAgentIdOptimized,
  getWalletBalance as getWalletBalanceOptimized,
  deposit as depositOptimized,
  withdraw as withdrawOptimized,
  transfer as transferOptimized,
  getTransactions as getTransactionsOptimized,
  getWalletStats as getWalletStatsOptimized,
} from './wallet-repository-optimized';

export {
  initializeWalletTables as initializeWalletTablesV2,
  createWallet as createWalletV2,
  getWalletByAgentId as getWalletByAgentIdV2,
  getWalletBalance as getWalletBalanceV2,
  deposit as depositV2,
  withdraw as withdrawV2,
  transfer as transferV2,
  getTransactions as getTransactionsV2,
  getWalletStats as getWalletStatsV2,
} from './wallet-repository-optimized-v2';

// 中间件
export {
  withAgentAuth,
  withPermissions,
  withAnyPermission,
  type AgentContext,
} from './middleware';

// 通信模块
export * from './communication';
