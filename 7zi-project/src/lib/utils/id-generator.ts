/**
 * ID 生成器 - 统一的唯一 ID 生成工具
 * 
 * 用于替代项目中散落的重复 ID 生成逻辑
 */

/**
 * 生成唯一 ID
 * @param prefix ID 前缀，如 'res', 'msg', 'conn' 等
 * @returns 唯一 ID，格式: {prefix}_{timestamp}_{random} 或 {timestamp}_{random}
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * 预定义的 ID 生成器
 * 提供常见类型的 ID 生成，确保命名一致性
 */
export const idGenerators = {
  /** 资源 ID: res_xxx */
  resource: () => generateId('res'),
  
  /** 消息 ID: msg_xxx */
  message: () => generateId('msg'),
  
  /** 连接 ID: conn_xxx */
  connection: () => generateId('conn'),
  
  /** 操作 ID: op_xxx */
  operation: () => generateId('op'),
  
  /** 租户 ID: tenant_xxx */
  tenant: () => generateId('tenant'),
  
  /** 用户 ID: user_xxx */
  user: () => generateId('user'),
  
  /** 会话 ID: session_xxx */
  session: () => generateId('session'),
  
  /** 请求 ID: req_xxx */
  request: () => generateId('req'),
  
  /** 任务 ID: task_xxx */
  task: () => generateId('task'),
  
  /** 事件 ID: event_xxx */
  event: () => generateId('event'),
  
  /** Webhook ID: wh_xxx */
  webhook: () => generateId('wh'),
};

/**
 * 短 ID 生成器
 * 用于不需要全局唯一性保证，但需要简洁的场景
 */
export function generateShortId(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 带命名空间的 ID 生成器
 * @param namespace 命名空间
 * @returns ID 生成函数
 */
export function createNamespacedIdGenerator(namespace: string): () => string {
  return () => generateId(namespace);
}

export default generateId;
