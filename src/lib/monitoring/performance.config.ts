/**
 * Performance Monitoring Configuration
 * 性能监控配置文件
 * 
 * 包含：
 * - Core Web Vitals 阈值配置
 * - 自定义性能指标
 * - 告警阈值
 * - 上报配置
 */

// ============================================
// Core Web Vitals 阈值配置
// 基于 Google 推荐标准
// ============================================

export const CORE_WEB_VITALS_THRESHOLDS = {
  // Largest Contentful Paint - 最大内容绘制
  LCP: {
    good: 2500,      // ≤2.5s 优秀
    needsImprovement: 4000, // ≤4s 需改进
    poor: 4000,      // >4s 差
    unit: 'ms',
    description: '最大内容绘制时间，衡量加载性能',
  },

  // First Input Delay - 首次输入延迟 (已弃用，使用 INP)
  FID: {
    good: 100,
    needsImprovement: 300,
    poor: 300,
    unit: 'ms',
    description: '首次输入延迟（已弃用，推荐使用 INP）',
    deprecated: true,
  },

  // Interaction to Next Paint - 交互到下一次绘制
  INP: {
    good: 200,       // ≤200ms 优秀
    needsImprovement: 500, // ≤500ms 需改进
    poor: 500,       // >500ms 差
    unit: 'ms',
    description: '交互到下一次绘制，衡量交互响应性',
  },

  // Cumulative Layout Shift - 累积布局偏移
  CLS: {
    good: 0.1,       // ≤0.1 优秀
    needsImprovement: 0.25, // ≤0.25 需改进
    poor: 0.25,      // >0.25 差
    unit: 'score',
    description: '累积布局偏移，衡量视觉稳定性',
  },

  // Time to First Byte - 首字节时间
  TTFB: {
    good: 800,
    needsImprovement: 1800,
    poor: 1800,
    unit: 'ms',
    description: '首字节时间，衡量服务器响应速度',
  },

  // First Contentful Paint - 首次内容绘制
  FCP: {
    good: 1800,
    needsImprovement: 3000,
    poor: 3000,
    unit: 'ms',
    description: '首次内容绘制时间',
  },
} as const;

// ============================================
// 自定义性能指标配置
// ============================================

export const CUSTOM_METRICS_CONFIG = {
  // 资源加载指标
  resources: {
    // JavaScript 资源
    jsLoadTime: {
      warning: 3000,    // 3s 警告
      critical: 5000,   // 5s 严重
      description: 'JavaScript 资源加载时间',
    },
    // CSS 资源
    cssLoadTime: {
      warning: 2000,
      critical: 3000,
      description: 'CSS 资源加载时间',
    },
    // 图片资源
    imageLoadTime: {
      warning: 3000,
      critical: 5000,
      description: '图片资源加载时间',
    },
    // 字体资源
    fontLoadTime: {
      warning: 2000,
      critical: 3000,
      description: '字体资源加载时间',
    },
  },

  // 长任务指标
  longTasks: {
    // 长任务阈值（默认 50ms）
    threshold: 50,
    // 警告阈值
    warning: {
      duration: 100,    // >100ms 警告
      count: 3,         // 或超过 3 个长任务
    },
    critical: {
      duration: 300,    // >300ms 严重
      count: 10,        // 或超过 10 个长任务
    },
    description: '阻塞主线程的长任务',
  },

  // 内存使用指标
  memory: {
    // JS 堆内存（仅 Chrome 支持）
    heapSize: {
      warning: 50,      // 50MB 警告
      critical: 100,    // 100MB 严重
      unit: 'MB',
      description: 'JavaScript 堆内存使用',
    },
    description: '内存使用监控',
  },

  // API 请求指标
  api: {
    responseTime: {
      good: 500,
      warning: 1000,
      critical: 3000,
      unit: 'ms',
      description: 'API 响应时间',
    },
    errorRate: {
      warning: 0.01,    // 1% 警告
      critical: 0.05,   // 5% 严重
      description: 'API 错误率',
    },
    timeout: {
      default: 10000,   // 10s 默认超时
      critical: 30000,  // 30s 严重超时
    },
  },

  // 路由切换指标
  navigation: {
    routeChangeTime: {
      good: 200,
      warning: 500,
      critical: 1000,
      unit: 'ms',
      description: '路由切换时间',
    },
    description: '客户端导航性能',
  },

  // 组件渲染指标
  rendering: {
    componentRenderTime: {
      warning: 16,      // 16ms (60fps)
      critical: 33,     // 33ms (30fps)
      unit: 'ms',
      description: '组件渲染时间',
    },
    hydrationTime: {
      warning: 1000,
      critical: 2000,
      unit: 'ms',
      description: 'React 水合时间',
    },
    description: 'React 渲染性能',
  },
} as const;

// ============================================
// 告警配置
// ============================================

export const ALERT_CONFIG = {
  // 告警级别
  levels: {
    info: {
      priority: 0,
      color: '#36a64f',
      emoji: 'ℹ️',
    },
    warning: {
      priority: 1,
      color: '#ffa500',
      emoji: '⚠️',
    },
    critical: {
      priority: 2,
      color: '#ff0000',
      emoji: '🚨',
    },
  },

  // 告警规则
  rules: {
    // Core Web Vitals 告警
    coreWebVitals: {
      // 单次超阈值
      singleViolation: {
        warning: true,   // needs-improvement 触发警告
        critical: true,  // poor 触发严重告警
      },
      // 持续性问题（5分钟内）
      sustainedIssue: {
        threshold: 3,    // 连续 3 次超阈值
        windowMs: 300000, // 5分钟窗口
      },
      // 聚合告警（1小时内）
      aggregated: {
        sampleRate: 0.1, // 10% 采样率
        windowMs: 3600000, // 1小时窗口
      },
    },

    // 自定义指标告警
    customMetrics: {
      longTasks: {
        enabled: true,
        warningThreshold: 3,   // 3 个长任务
        criticalThreshold: 10, // 10 个长任务
      },
      memory: {
        enabled: true,
        warningThreshold: 50,  // 50MB
        criticalThreshold: 100, // 100MB
      },
      apiErrors: {
        enabled: true,
        warningThreshold: 0.01, // 1%
        criticalThreshold: 0.05, // 5%
      },
    },

    // 静默期配置（避免告警风暴）
    silencePeriod: {
      info: 600000,     // 10分钟
      warning: 300000,  // 5分钟
      critical: 60000,  // 1分钟
    },
  },

  // 告警渠道
  channels: {
    console: {
      enabled: true,
      level: 'info',    // info 及以上
    },
    sentry: {
      enabled: true,
      level: 'warning', // warning 及以上
      tags: {
        component: 'performance',
      },
    },
    slack: {
      enabled: false,   // 需要配置 webhook
      level: 'critical', // 仅严重告警
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
    },
    email: {
      enabled: false,
      level: 'critical',
      recipients: [],
    },
  },
} as const;

// ============================================
// 上报配置
// ============================================

export const REPORTING_CONFIG = {
  // Sentry 配置
  sentry: {
    enabled: true,
    // 性能数据采样率
    tracesSampleRate: 0.1, // 10%
    // Web Vitals 采样率
    webVitalsSampleRate: 1.0, // 100%
    // 自定义指标采样率
    customMetricsSampleRate: 0.1, // 10%
    // 标签
    defaultTags: {
      monitor: 'performance',
      app: '7zi-frontend',
    },
  },

  // 批量上报配置
  batch: {
    enabled: true,
    maxSize: 10,        // 最大批量大小
    maxWaitMs: 30000,   // 最长等待时间 30s
    retryAttempts: 3,
    retryDelayMs: 1000,
  },

  // 本地存储配置（离线支持）
  localStorage: {
    enabled: true,
    key: '7zi_perf_metrics',
    maxEntries: 100,
    maxAgeMs: 86400000, // 24小时
  },

  // 过滤配置
  filtering: {
    // 排除的路由
    excludeRoutes: [
      '/api/health',
      '/_next/',
      '/static/',
    ],
    // 排除的 User Agent
    excludeUserAgents: [
      /bot/i,
      /spider/i,
      /crawler/i,
      /lighthouse/i,
    ],
    // 只在生产环境上报
    productionOnly: true,
  },

  // 隐私配置
  privacy: {
    // 是否收集用户 IP
    collectIp: false,
    // 是否收集 User Agent
    collectUserAgent: true,
    // 敏感字段脱敏
    sanitizeFields: ['email', 'phone', 'token', 'password'],
  },
} as const;

// ============================================
// 实时监控配置
// ============================================

export const REALTIME_CONFIG = {
  // 开发者工具集成
  devTools: {
    enabled: process.env.NODE_ENV === 'development',
    // 在控制台显示性能指标
    consoleLogging: true,
    // 显示性能面板
    showPanel: false,
    // 性能面板位置
    panelPosition: 'bottom-right',
  },

  // 实时刷新率
  refreshInterval: {
    metrics: 1000,     // 1秒刷新指标
    alerts: 5000,      // 5秒检查告警
    health: 30000,     // 30秒健康检查
  },

  // 可视化配置
  visualization: {
    // 性能评分颜色
    colors: {
      good: '#0cce6b',
      needsImprovement: '#ffa400',
      poor: '#ff4e42',
    },
    // 图表配置
    charts: {
      historyLength: 60,    // 保留 60 个数据点
      updateInterval: 1000, // 1秒更新
    },
  },
} as const;

// ============================================
// 环境特定配置
// ============================================

export const ENVIRONMENT_CONFIG = {
  development: {
    reporting: {
      sentry: false,
      console: true,
    },
    sampleRates: {
      traces: 1.0,
      webVitals: 1.0,
    },
    alerts: {
      slack: false,
      email: false,
    },
  },

  staging: {
    reporting: {
      sentry: true,
      console: true,
    },
    sampleRates: {
      traces: 0.5,
      webVitals: 1.0,
    },
    alerts: {
      slack: true,
      email: false,
    },
  },

  production: {
    reporting: {
      sentry: true,
      console: false,
    },
    sampleRates: {
      traces: 0.1,
      webVitals: 0.5,
    },
    alerts: {
      slack: true,
      email: true,
    },
  },
} as const;

// ============================================
// 辅助函数
// ============================================

/**
 * 获取当前环境的配置
 */
export function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  return ENVIRONMENT_CONFIG[env as keyof typeof ENVIRONMENT_CONFIG] || ENVIRONMENT_CONFIG.development;
}

/**
 * 获取指标的评级
 */
export function getMetricRating(
  metricName: string,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = CORE_WEB_VITALS_THRESHOLDS[metricName as keyof typeof CORE_WEB_VITALS_THRESHOLDS];
  
  if (!thresholds) {
    console.warn(`Unknown metric: ${metricName}`);
    return 'good';
  }

  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * 检查是否应该上报（采样）
 */
export function shouldReport(sampleRate: number): boolean {
  return Math.random() < sampleRate;
}

/**
 * 获取当前配置
 */
export function getConfig() {
  return {
    thresholds: CORE_WEB_VITALS_THRESHOLDS,
    customMetrics: CUSTOM_METRICS_CONFIG,
    alerts: ALERT_CONFIG,
    reporting: REPORTING_CONFIG,
    realtime: REALTIME_CONFIG,
    environment: getEnvironmentConfig(),
  };
}

// 类型导出
export type MetricRating = 'good' | 'needs-improvement' | 'poor';
export type AlertLevel = 'info' | 'warning' | 'critical';
export type Environment = 'development' | 'staging' | 'production';
