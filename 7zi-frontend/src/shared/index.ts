/**
 * Shared Module
 * 共享代码统一导出
 */

// UI 组件
export * from './components/ui';

// Hooks
export { useDebounce } from './hooks/useDebounce';

// 工具库
export { logger } from './lib/logger';
export { validation, ValidationResult } from './lib/validation';
export { validationSchemas } from './lib/validation-schemas';

// 数据库
export { storage } from './db/storage';

// 类型
export * from './types';
