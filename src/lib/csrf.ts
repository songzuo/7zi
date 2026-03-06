/**
 * CSRF 保护工具
 * 
 * 用于表单提交时的 CSRF 验证
 */

let cachedCsrfToken: string | null = null;

/**
 * 获取 CSRF Token
 * 优先使用缓存，如果没有则从服务器获取
 */
export async function getCsrfToken(): Promise<string | null> {
  // 如果已有缓存，直接返回
  if (cachedCsrfToken) {
    return cachedCsrfToken;
  }

  try {
    const response = await fetch('/api/csrf-token');
    if (!response.ok) {
      console.error('Failed to fetch CSRF token');
      return null;
    }
    
    const data = await response.json();
    cachedCsrfToken = data.csrfToken;
    return cachedCsrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    return null;
  }
}

/**
 * 清除缓存的 CSRF Token
 * 在提交失败或 token 过期时调用
 */
export function clearCsrfToken(): void {
  cachedCsrfToken = null;
}

/**
 * 创建带 CSRF Token 的请求头
 */
export async function createCsrfHeaders(): Promise<HeadersInit> {
  const token = await getCsrfToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['X-CSRF-Token'] = token;
  }
  
  return headers;
}

/**
 * 验证 CSRF Token（服务端使用）
 * 比较请求头中的 token 和 cookie 中的 token
 */
export function validateCsrfToken(
  headerToken: string | null,
  cookieToken: string | null
): boolean {
  if (!headerToken || !cookieToken) {
    return false;
  }
  
  // 使用时间安全比较防止时序攻击
  try {
    const headerBuf = Buffer.from(headerToken, 'hex');
    const cookieBuf = Buffer.from(cookieToken, 'hex');
    
    if (headerBuf.length !== cookieBuf.length) {
      return false;
    }
    
    return headerBuf.equals(cookieBuf);
  } catch {
    return false;
  }
}