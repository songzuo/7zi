/**
 * AI 模块统一导出
 * 多模型智能路由系统 v1.12.0
 */

// ===== 类型定义 =====
export * from './types'

// ===== 新版路由系统 (v1.12.0) =====
export * from './routing/types'
export { ModelRegistry, modelRegistry, initializeDefaultModels } from './routing/model-registry'
export { ModelRouter, modelRouter, routeRequest, initFromEnv } from './routing/model-router'

// ===== 旧版路由系统 (向后兼容) =====
export { MODELS, getEnabledModels, getModelById, getModelsByProvider, getModelsForTaskType, getPreferredModelForTaskType, estimateModelCost } from './models'
export * from './router'

// ===== 核心组件 =====
export * from './classifier'
export * from './complexity'
export * from './cache'
export * from './rate-limiter'
export * from './fallback'

// ===== 成本追踪 (v1.12.0 新增) =====
export * from './cost-tracker'

// ===== Provider 实现 (v1.12.0 新增) =====
export * from './providers/index'

// ===== 智能服务 (v1.12.0 新增) =====
export * from './smart-service'

// ===== 集成层 =====
export * from './integration'

// ===== 报表生成器 =====
export * from './reports'