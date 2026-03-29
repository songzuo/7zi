/**
 * Agent Scheduler Environment Configuration
 * Configuration for different deployment environments
 */

export type Environment = 'development' | 'testing' | 'production';

export interface SchedulerEnvironmentConfig {
  /** Environment name */
  env: Environment;
  
  /** Enable debug logging */
  debug: boolean;
  
  /** Scheduler interval in milliseconds */
  scheduleInterval: number;
  
  /** Maximum concurrent tasks per agent */
  maxConcurrency: number;
  
  /** Task timeout in milliseconds */
  taskTimeout: number;
  
  /** Database configuration */
  database: {
    url: string;
    poolSize: number;
  };
  
  /** Redis configuration */
  redis: {
    enabled: boolean;
    url?: string;
    prefix: string;
  };
  
  /** API configuration */
  api: {
    port: number;
    corsOrigins: string[];
    rateLimit: number;
  };
  
  /** Monitoring configuration */
  monitoring: {
    enabled: boolean;
    metricsPort?: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

/**
 * Development environment configuration
 */
export const developmentConfig: SchedulerEnvironmentConfig = {
  env: 'development',
  debug: true,
  scheduleInterval: 60000, // 1 minute
  maxConcurrency: 2,
  taskTimeout: 1800000, // 30 minutes
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/agent_scheduler_dev',
    poolSize: 5
  },
  redis: {
    enabled: false,
    prefix: 'scheduler:dev:'
  },
  api: {
    port: 3001,
    corsOrigins: ['http://localhost:3000', 'http://localhost:5173'],
    rateLimit: 1000
  },
  monitoring: {
    enabled: true,
    logLevel: 'debug'
  }
};

/**
 * Testing environment configuration
 */
export const testingConfig: SchedulerEnvironmentConfig = {
  env: 'testing',
  debug: true,
  scheduleInterval: 10000, // 10 seconds
  maxConcurrency: 3,
  taskTimeout: 600000, // 10 minutes
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/agent_scheduler_test',
    poolSize: 3
  },
  redis: {
    enabled: false,
    prefix: 'scheduler:test:'
  },
  api: {
    port: 3002,
    corsOrigins: ['*'],
    rateLimit: 5000
  },
  monitoring: {
    enabled: false,
    logLevel: 'info'
  }
};

/**
 * Production environment configuration
 */
export const productionConfig: SchedulerEnvironmentConfig = {
  env: 'production',
  debug: false,
  scheduleInterval: 30000, // 30 seconds
  maxConcurrency: 5,
  taskTimeout: 3600000, // 1 hour
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/agent_scheduler_prod',
    poolSize: 20
  },
  redis: {
    enabled: true,
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    prefix: 'scheduler:prod:'
  },
  api: {
    port: parseInt(process.env.PORT || '3000'),
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['https://7zi.com'],
    rateLimit: 100
  },
  monitoring: {
    enabled: true,
    metricsPort: 9090,
    logLevel: 'info'
  }
};

/**
 * Get configuration for the current environment
 */
export function getEnvironmentConfig(env?: Environment): SchedulerEnvironmentConfig {
  const environment = env || (process.env.NODE_ENV as Environment) || 'development';
  
  switch (environment) {
    case 'development':
      return developmentConfig;
    case 'testing':
      return testingConfig;
    case 'production':
      return productionConfig;
    default:
      console.warn(`Unknown environment: ${environment}, falling back to development`);
      return developmentConfig;
  }
}

/**
 * Validate environment variables
 */
export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const required = ['DATABASE_URL'];
  const missing: string[] = [];
  
  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  // Production-specific requirements
  if (process.env.NODE_ENV === 'production') {
    const prodRequired = ['REDIS_URL', 'CORS_ORIGINS'];
    for (const varName of prodRequired) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Default export
 */
export default getEnvironmentConfig;
