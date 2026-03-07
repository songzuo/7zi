/**
 * 环境变量验证模块
 * Environment Variable Validation Module
 */

/**
 * 必需的环境变量列表（生产环境）
 */
const requiredEnvVars = ['JWT_SECRET', 'ADMIN_PASSWORD'] as const;

type RequiredEnvVar = (typeof requiredEnvVars)[number];

/**
 * 环境变量验证错误
 */
export class EnvValidationError extends Error {
  constructor(
    public readonly varName: string,
    message: string
  ) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

/**
 * 环境变量配置接口
 */
export interface EnvConfig {
  nodeEnv: 'development' | 'production' | 'test';
  jwtSecret: string;
  adminPassword: string;
  databasePath?: string;
  githubToken?: string;
  sentryDsn?: string;
}

/**
 * 验证单个环境变量
 */
function validateEnvVar(name: string, value: string | undefined, required: boolean): string {
  if (!value) {
    if (required && process.env.NODE_ENV === 'production') {
      throw new EnvValidationError(
        name,
        `Missing required environment variable: ${name}`
      );
    }
    return '';
  }
  return value;
}

/**
 * 验证 JWT 密钥长度
 */
function validateJwtSecret(secret: string): void {
  if (secret && secret.length < 32) {
    throw new EnvValidationError(
      'JWT_SECRET',
      `JWT_SECRET must be at least 32 characters, got ${secret.length} characters`
    );
  }
}

/**
 * 验证所有必需的环境变量
 * 在生产环境缺失关键变量时抛出错误
 */
export function validateEnv(): void {
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (nodeEnv === 'production') {
    const missingVars: string[] = [];

    for (const varName of requiredEnvVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables in production: ${missingVars.join(', ')}\n` +
        `Please set these variables before starting the application.`
      );
    }

    // 验证 JWT 密钥长度
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
      validateJwtSecret(jwtSecret);
    }
  }
}

/**
 * 获取已验证的环境变量配置
 * 返回类型安全的环境变量对象
 */
export function getEnvConfig(): EnvConfig {
  validateEnv();

  return {
    nodeEnv: (process.env.NODE_ENV as EnvConfig['nodeEnv']) || 'development',
    jwtSecret: process.env.JWT_SECRET || '',
    adminPassword: process.env.ADMIN_PASSWORD || '',
    databasePath: process.env.DATABASE_PATH,
    githubToken: process.env.NEXT_PUBLIC_GITHUB_TOKEN,
    sentryDsn: process.env.SENTRY_DSN,
  };
}

/**
 * 检查是否为开发环境
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/**
 * 检查是否为生产环境
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * 检查是否为测试环境
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

// 在模块加载时自动验证（仅在非测试环境）
if (process.env.NODE_ENV !== 'test') {
  validateEnv();
}