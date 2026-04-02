/**
 * Monitoring Configuration
 * 监控配置
 */

import { MonitoringConfig } from './types'

export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enabled: true,
  sampleRate: 1.0, // 100% 采样率，生产环境可降低到 0.1-0.5
  retentionPeriodMs: 24 * 60 * 60 * 1000, // 保留 24 小时数据
  alarms: {
    errorRate: {
      metric: 'errorRate',
      threshold: 0.05, // 5% 错误率阈值
      windowMs: 5 * 60 * 1000, // 5 分钟窗口
      enabled: true,
    },
    responseTime: {
      metric: 'responseTime',
      threshold: 2000, // 2 秒响应时间阈值
      windowMs: 5 * 60 * 1000, // 5 分钟窗口
      enabled: true,
    },
    operationDuration: {
      metric: 'operationDuration',
      threshold: 3000, // 3 秒操作时间阈值
      windowMs: 5 * 60 * 1000, // 5 分钟窗口
      enabled: true,
    },
  },
  storageType: 'memory',
}

export const ENV_SPECIFIC_CONFIG: Record<string, Partial<MonitoringConfig>> = {
  // 开发环境
  development: {
    enabled: true,
    sampleRate: 1.0,
    retentionPeriodMs: 60 * 60 * 1000, // 1 小时
    alarms: {
      errorRate: { ...DEFAULT_MONITORING_CONFIG.alarms.errorRate, threshold: 0.1 }, // 10%
      responseTime: { ...DEFAULT_MONITORING_CONFIG.alarms.responseTime, threshold: 5000 }, // 5 秒
      operationDuration: {
        ...DEFAULT_MONITORING_CONFIG.alarms.operationDuration,
        threshold: 10000,
      }, // 10 秒
    },
  },

  // 生产环境
  production: {
    enabled: true,
    sampleRate: 0.1, // 10% 采样以降低开销
    retentionPeriodMs: 7 * 24 * 60 * 60 * 1000, // 7 天
    alarms: {
      errorRate: { ...DEFAULT_MONITORING_CONFIG.alarms.errorRate, threshold: 0.02 }, // 2%
      responseTime: { ...DEFAULT_MONITORING_CONFIG.alarms.responseTime, threshold: 1000 }, // 1 秒
      operationDuration: { ...DEFAULT_MONITORING_CONFIG.alarms.operationDuration, threshold: 2000 }, // 2 秒
    },
  },

  // 测试环境
  test: {
    enabled: false, // 测试时禁用监控
    sampleRate: 1.0,
  },
}

export function getMonitoringConfig(): MonitoringConfig {
  const env = process.env.NODE_ENV || 'development'
  const envConfig = ENV_SPECIFIC_CONFIG[env] || {}

  return {
    ...DEFAULT_MONITORING_CONFIG,
    ...envConfig,
    alarms: {
      ...DEFAULT_MONITORING_CONFIG.alarms,
      ...((envConfig as any).alarms || {}),
    },
  }
}
