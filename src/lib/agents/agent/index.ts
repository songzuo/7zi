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
