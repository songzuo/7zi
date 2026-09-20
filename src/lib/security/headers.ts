/**
 * Security Headers Configuration
 *
 * Next.js 安全头部配置，支持开发/生产环境差异化
 *
 * 功能：
 * - CSP (Content Security Policy) 策略配置
 * - HSTS (HTTP Strict Transport Security) 配置
 * - X-Frame-Options、X-Content-Type-Options、X-XSS-Protection
 * - Referrer-Policy
 * - Permissions-Policy
 */

/**
 * 环境类型
 */
export type Environment = 'development' | 'production'

/**
 * CSP 配置选项
 */
export interface CSPConfig {
  /** 是否启用严格模式（移除 unsafe-inline 和 unsafe-eval） */
  strictMode: boolean
  /** 允许的脚本源 */
  scriptSrc: string[]
  /** 允许的样式源 */
  styleSrc: string[]
  /** 允许的连接源 */
  connectSrc: string[]
  /** 是否允许内联脚本（通过 nonce） */
  allowInlineScripts: boolean
  /** 是否允许内联样式（通过 nonce） */
  allowInlineStyles: boolean
  /** 是否允许 eval() */
  allowEval: boolean
  /** 允许的图片源 */
  imgSrc?: string[]
  /** 允许的字体源 */
  fontSrc?: string[]
  /** 允许的框架源 */
  frameSrc?: string[]
  /** 允许的 worker 源 */
  workerSrc?: string[]
  /** 允许的媒体源 */
  mediaSrc?: string[]
  /** 是否启用报告（用于调试） */
  enableReportOnly?: boolean
  /** 报告 URI（当违反 CSP 时发送报告） */
  reportUri?: string
  /** 是否包含子域名 */
  includeSubDomains?: boolean
  /** 块混合内容 */
  blockMixedContent?: boolean
}

/**
 * HSTS 配置选项
 */
export interface HSTSConfig {
  /** 最大时间（秒） */
  maxAge: number
  /** 是否包含子域名 */
  includeSubDomains: boolean
  /** 是否预加载（需要向浏览器厂商申请） */
  preload: boolean
}

/**
 * Permissions-Policy 配置选项
 */
export interface PermissionsPolicyConfig {
  /** 地理位置 */
  geolocation?: 'self' | '*' | 'none' | string[]
  /** 麦克风 */
  microphone?: 'self' | '*' | 'none' | string[]
  /** 摄像头 */
  camera?: 'self' | '*' | 'none' | string[]
  /** 支付 */
  payment?: 'self' | '*' | 'none' | string[]
  /** USB */
  usb?: 'self' | '*' | 'none' | string[]
  /** 蓝牙 */
  bluetooth?: 'self' | '*' | 'none' | string[]
  /** 通知 */
  notifications?: 'self' | '*' | 'none' | string[]
  /** 自动播放 */
  autoplay?: 'self' | '*' | 'none' | string[]
  /** 加速计 */
  accelerometer?: 'self' | '*' | 'none' | string[]
  /** 陀螺仪 */
  gyroscope?: 'self' | '*' | 'none' | string[]
  /** 磁力计 */
  magnetometer?: 'self' | '*' | 'none' | string[]
  /** VR/AR */
  xr?: 'self' | '*' | 'none' | string[]
  /** 全屏 */
  fullscreen?: 'self' | '*' | 'none' | string[]
  /** 加密货币挖矿 */
  'interest-cohort'?: 'self' | '*' | 'none' | string[]
}

/**
 * 安全头部配置
 */
export interface SecurityHeadersConfig {
  /** 环境类型 */
  environment: Environment
  /** CSP 配置 */
  csp: CSPConfig
  /** HSTS 配置 */
  hsts: HSTSConfig
  /** X-Frame-Options: DENY | SAMEORIGIN */
  frameOptions: 'DENY' | 'SAMEORIGIN'
  /** X-Content-Type-Options: nosniff */
  contentTypeOptions: 'nosniff'
  /** X-XSS-Protection: 0 | 1; mode=block */
  xssProtection: '0' | '1; mode=block'
  /** Referrer-Policy */
  referrerPolicy:
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url'
  /** Permissions-Policy 配置 */
  permissionsPolicy: PermissionsPolicyConfig
}

/**
 * 开发环境默认配置
 */
const DEVELOPMENT_CONFIG: SecurityHeadersConfig = {
  environment: 'development',
  csp: {
    strictMode: false, // 开发环境使用宽松模式
    scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    connectSrc: ["'self'", 'https://'],
    allowInlineScripts: true,
    allowInlineStyles: true,
    allowEval: true,
    imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
    fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
    enableReportOnly: false,
  },
  hsts: {
    maxAge: 31536000, // 1 年
    includeSubDomains: false,
    preload: false,
  },
  frameOptions: 'SAMEORIGIN',
  contentTypeOptions: 'nosniff',
  xssProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    geolocation: 'none',
    microphone: 'none',
    camera: 'none',
    payment: 'none',
    notifications: 'none',
    usb: 'none',
    bluetooth: 'none',
    autoplay: 'self',
  },
}

/**
 * 生产环境默认配置
 */
const PRODUCTION_CONFIG: SecurityHeadersConfig = {
  environment: 'production',
  csp: {
    strictMode: true, // 生产环境使用严格模式
    scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
    styleSrc: ["'self'", 'https://fonts.googleapis.com'],
    connectSrc: ["'self'", 'https://'],
    allowInlineScripts: false,
    allowInlineStyles: false,
    allowEval: false,
    imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
    fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
    enableReportOnly: false,
    reportUri: '/api/security/csp-report',
    includeSubDomains: true,
    blockMixedContent: true,
  },
  hsts: {
    maxAge: 63072000, // 2 年（推荐）
    includeSubDomains: true,
    preload: false, // 需要向 https://hstspreload.org 申请
  },
  frameOptions: 'DENY',
  contentTypeOptions: 'nosniff',
  xssProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    geolocation: 'none',
    microphone: 'none',
    camera: 'none',
    payment: 'none',
    notifications: 'none',
    usb: 'none',
    bluetooth: 'none',
    autoplay: 'self',
    accelerometer: 'none',
    gyroscope: 'none',
    magnetometer: 'none',
    xr: 'none',
    fullscreen: 'self',
    'interest-cohort': 'none', // 禁用 FLoC
  },
}

/**
 * 获取环境配置
 */
export function getSecurityConfig(environment: Environment = 'production'): SecurityHeadersConfig {
  return environment === 'development' ? DEVELOPMENT_CONFIG : PRODUCTION_CONFIG
}

/**
 * 生成 CSP 字符串
 */
export function generateCSP(config: CSPConfig): string {
  const directives: string[] = []

  // default-src
  directives.push(`default-src 'self'`)

  // script-src
  const scriptSrc = [...config.scriptSrc]
  if (!config.strictMode && config.allowInlineScripts) {
    scriptSrc.push("'unsafe-inline'")
  }
  if (!config.strictMode && config.allowEval) {
    scriptSrc.push("'unsafe-eval'")
  }
  directives.push(`script-src ${scriptSrc.join(' ')}`)

  // style-src
  const styleSrc = config.styleSrc.length > 0 ? [...config.styleSrc] : ["'self'"]
  if (!config.strictMode && config.allowInlineStyles) {
    styleSrc.push("'unsafe-inline'")
  }
  directives.push(`style-src ${styleSrc.join(' ')}`)

  // connect-src
  directives.push(`connect-src ${config.connectSrc.join(' ')}`)

  // img-src
  if (config.imgSrc) {
    directives.push(`img-src ${config.imgSrc.join(' ')}`)
  }

  // font-src
  if (config.fontSrc) {
    directives.push(`font-src ${config.fontSrc.join(' ')}`)
  }

  // frame-src
  if (config.frameSrc) {
    directives.push(`frame-src ${config.frameSrc.join(' ')}`)
  } else {
    directives.push("frame-src 'none'")
  }

  // worker-src
  if (config.workerSrc) {
    directives.push(`worker-src ${config.workerSrc.join(' ')}`)
  }

  // media-src
  if (config.mediaSrc) {
    directives.push(`media-src ${config.mediaSrc.join(' ')}`)
  }

  // frame-ancestors
  directives.push("frame-ancestors 'none'")

  // base-uri
  directives.push("base-uri 'self'")

  // form-action
  directives.push("form-action 'self'")

  // manifest-src
  directives.push("manifest-src 'self'")

  // report-uri
  if (config.enableReportOnly && config.reportUri) {
    directives.push(`report-uri ${config.reportUri}`)
  }

  // block-all-mixed-content
  if (config.blockMixedContent) {
    directives.push('block-all-mixed-content')
  }

  // upgrade-insecure-requests
  if (config.strictMode) {
    directives.push('upgrade-insecure-requests')
  }

  return directives.join('; ')
}

/**
 * 生成 HSTS 字符串
 */
export function generateHSTS(config: HSTSConfig): string {
  const parts = [`max-age=${config.maxAge}`]

  if (config.includeSubDomains) {
    parts.push('includeSubDomains')
  }

  if (config.preload) {
    parts.push('preload')
  }

  return parts.join('; ')
}

/**
 * 生成 Permissions-Policy 字符串
 */
export function generatePermissionsPolicy(config: PermissionsPolicyConfig): string {
  const policies: string[] = []

  const formatValue = (value: string | string[] | 'self' | '*' | 'none'): string => {
    if (Array.isArray(value)) {
      return `(${value.map(v => (v === 'self' ? "'self'" : v)).join(' ')})`
    }
    if (value === 'self') return "'self'"
    return value
  }

  if (config.geolocation) policies.push(`geolocation=${formatValue(config.geolocation)}`)
  if (config.microphone) policies.push(`microphone=${formatValue(config.microphone)}`)
  if (config.camera) policies.push(`camera=${formatValue(config.camera)}`)
  if (config.payment) policies.push(`payment=${formatValue(config.payment)}`)
  if (config.usb) policies.push(`usb=${formatValue(config.usb)}`)
  if (config.bluetooth) policies.push(`bluetooth=${formatValue(config.bluetooth)}`)
  if (config.notifications) policies.push(`notifications=${formatValue(config.notifications)}`)
  if (config.autoplay) policies.push(`autoplay=${formatValue(config.autoplay)}`)
  if (config.accelerometer) policies.push(`accelerometer=${formatValue(config.accelerometer)}`)
  if (config.gyroscope) policies.push(`gyroscope=${formatValue(config.gyroscope)}`)
  if (config.magnetometer) policies.push(`magnetometer=${formatValue(config.magnetometer)}`)
  if (config.xr) policies.push(`xr=${formatValue(config.xr)}`)
  if (config.fullscreen) policies.push(`fullscreen=${formatValue(config.fullscreen)}`)
  if (config['interest-cohort'])
    policies.push(`interest-cohort=${formatValue(config['interest-cohort'])}`)

  return policies.join(', ')
}

/**
 * 获取所有安全头部
 */
export function getSecurityHeaders(
  environment: Environment = 'production'
): Record<string, string> {
  const config = getSecurityConfig(environment)
  const headers: Record<string, string> = {}

  // Content Security Policy
  headers['Content-Security-Policy'] = generateCSP(config.csp)

  // Strict-Transport-Security (仅在 HTTPS 环境中启用)
  if (environment === 'production') {
    headers['Strict-Transport-Security'] = generateHSTS(config.hsts)
  }

  // X-Frame-Options
  headers['X-Frame-Options'] = config.frameOptions

  // X-Content-Type-Options
  headers['X-Content-Type-Options'] = config.contentTypeOptions

  // X-XSS-Protection
  headers['X-XSS-Protection'] = config.xssProtection

  // Referrer-Policy
  headers['Referrer-Policy'] = config.referrerPolicy

  // Permissions-Policy
  headers['Permissions-Policy'] = generatePermissionsPolicy(config.permissionsPolicy)

  // Cross-Origin-Opener-Policy
  headers['Cross-Origin-Opener-Policy'] = 'same-origin'

  // Cross-Origin-Embedder-Policy
  headers['Cross-Origin-Embedder-Policy'] = 'require-corp'

  // Cross-Origin-Resource-Policy
  headers['Cross-Origin-Resource-Policy'] = 'same-origin'

  return headers
}

/**
 * 应用安全头部到 Response 对象
 */
export function applySecurityHeaders(
  response: Response,
  environment: Environment = 'production'
): Response {
  const headers = getSecurityHeaders(environment)

  Object.entries(headers).forEach(([name, value]) => {
    response.headers.set(name, value)
  })

  return response
}

/**
 * 获取 CSP Report-Only 模式的配置（用于测试）
 */
export function getCSPReportOnlyConfig(
  environment: Environment = 'production'
): Record<string, string> {
  const config = getSecurityConfig(environment)
  const reportOnlyConfig: CSPConfig = {
    ...config.csp,
    enableReportOnly: true,
  }

  return {
    'Content-Security-Policy-Report-Only': generateCSP(reportOnlyConfig),
  }
}

/**
 * 验证 CSP 配置是否包含 unsafe 指令
 */
export function validateCSPIsStrict(config: CSPConfig): boolean {
  // 严格模式不允许 unsafe-inline 和 unsafe-eval
  if (config.strictMode) {
    const hasUnsafeInline = config.allowInlineScripts || config.allowInlineStyles
    const hasUnsafeEval = config.allowEval

    if (hasUnsafeInline || hasUnsafeEval) {
      return false
    }
  }

  return true
}

/**
 * 导出默认配置
 */
export { DEVELOPMENT_CONFIG, PRODUCTION_CONFIG }
