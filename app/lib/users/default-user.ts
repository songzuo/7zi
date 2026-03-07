/**
 * 初始化默认用户
 */

import { getUserByEmail, createUser } from './repository';

const DEFAULT_USER = {
  id: 'current-user',
  name: '宋琢环球旅行',
  email: 'admin@example.com',
  bio: 'AI 团队管理员',
  role: 'admin',
  provider: 'system',
};

/**
 * 确保默认用户存在
 */
export async function ensureDefaultUser() {
  try {
    let user = await getUserByEmail(DEFAULT_USER.email);
    
    if (!user) {
      user = await createUser(DEFAULT_USER);
      if (process.env.NODE_ENV === 'development') {
        // Created default user
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        // Default user already exists
      }
    }
    
    return user;
  } catch {
    // Failed to ensure default user
    throw new Error('Failed to ensure default user');
  }
}

/**
 * 获取默认用户ID
 */
export function getDefaultUserId(): string {
  return DEFAULT_USER.id;
}