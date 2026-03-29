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

// 中间件
export {
  withAgentAuth,
  withPermissions,
  withAnyPermission,
  type AgentContext,
} from './middleware';

// 通信模块
export * from './communication';
