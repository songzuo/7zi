/**
 * @fileoverview User-Friendly Error Messages with Localization
 * @description Provides user-friendly error messages in multiple languages
 *
 * Features:
 * - Error message localization (Chinese, English)
 * - User-friendly descriptions for all error types
 * - Suggested actions for error resolution
 * - Support for custom error messages
 *
 * @example
 * import { getUserFriendlyError } from '@/lib/api/user-messages';
 *
 * const userError = await getUserFriendlyError(ErrorType.UNAUTHORIZED, 'zh');
 * console.log(userError.message); // "请先登录"
 * console.log(userError.action);  // "去登录"
 */

import { ErrorType } from './error-types'

/**
 * User-friendly error response
 */
export interface UserError {
  /** User-friendly error message */
  message: string
  /** Suggested action to resolve the error */
  action: string
  /** Additional help text (optional) */
  help?: string
}

/**
 * Error message mapping function type
 */
type MessageGetter = (locale: string) => string | Promise<string>

/**
 * Error mapping for each error type
 */
interface ErrorMapping {
  /** User-friendly message getter */
  message: MessageGetter
  /** Suggested action getter */
  action: MessageGetter
  /** Additional help text (optional) */
  help?: MessageGetter
}

/**
 * Synchronous message getter (for compatibility)
 */
type SyncMessageGetter = string | ((locale: string) => string)

/**
 * Convert sync message getter to async if needed
 */
function toAsyncMessage(getter: SyncMessageGetter | Record<string, string>): MessageGetter {
  if (typeof getter === 'function') {
    return (locale: string) => Promise.resolve((getter as (locale: string) => string)(locale))
  }
  if (typeof getter === 'string') {
    return () => Promise.resolve(getter)
  }
  // Handle object literal with language keys
  return (locale: string) =>
    Promise.resolve(
      (getter as Record<string, string>)[locale] || (getter as Record<string, string>)['en'] || ''
    )
}

/**
 * Error message mappings for all error types
 */
const ERROR_MAPPINGS: Record<ErrorType, ErrorMapping> = {
  [ErrorType.VALIDATION]: {
    message: toAsyncMessage({
      zh: '输入信息有误，请检查后重试',
      en: 'Invalid input, please check and try again',
    }),
    action: toAsyncMessage({
      zh: '请检查表单字段',
      en: 'Please check the form fields',
    }),
    help: toAsyncMessage({
      zh: '请确保所有必填字段都已正确填写，且格式符合要求。',
      en: 'Please ensure all required fields are filled correctly and in the proper format.',
    }),
  },

  [ErrorType.NOT_FOUND]: {
    message: toAsyncMessage({
      zh: '请求的资源不存在',
      en: 'The requested resource was not found',
    }),
    action: toAsyncMessage({
      zh: '返回上一页',
      en: 'Go back',
    }),
    help: toAsyncMessage({
      zh: '该资源可能已被删除或移动，请检查链接是否正确。',
      en: 'This resource may have been deleted or moved. Please check if the link is correct.',
    }),
  },

  [ErrorType.UNAUTHORIZED]: {
    message: toAsyncMessage({
      zh: '请先登录',
      en: 'Please log in',
    }),
    action: toAsyncMessage({
      zh: '去登录',
      en: 'Log in',
    }),
    help: toAsyncMessage({
      zh: '您需要登录后才能访问此功能。',
      en: 'You need to log in to access this feature.',
    }),
  },

  [ErrorType.FORBIDDEN]: {
    message: toAsyncMessage({
      zh: '您没有权限访问此资源',
      en: 'You do not have permission to access this resource',
    }),
    action: toAsyncMessage({
      zh: '联系管理员',
      en: 'Contact administrator',
    }),
    help: toAsyncMessage({
      zh: '此功能需要特定权限，如需帮助请联系系统管理员。',
      en: 'This feature requires specific permissions. Contact the system administrator for assistance.',
    }),
  },

  [ErrorType.RATE_LIMIT]: {
    message: toAsyncMessage({
      zh: '请求过于频繁，请稍后再试',
      en: 'Too many requests, please try again later',
    }),
    action: toAsyncMessage({
      zh: '等待 1 分钟',
      en: 'Wait 1 minute',
    }),
    help: toAsyncMessage({
      zh: '您的请求频率超过了限制，请稍作等待后继续。',
      en: 'Your request rate has exceeded the limit. Please wait a moment before continuing.',
    }),
  },

  [ErrorType.INTERNAL]: {
    message: toAsyncMessage({
      zh: '服务器出错了，我们正在修复',
      en: "Something went wrong, we're fixing it",
    }),
    action: toAsyncMessage({
      zh: '稍后重试',
      en: 'Try again later',
    }),
    help: toAsyncMessage({
      zh: '服务器遇到了意外错误，我们的团队正在处理。请稍后再试。',
      en: 'The server encountered an unexpected error. Our team is working on it. Please try again later.',
    }),
  },

  [ErrorType.BAD_REQUEST]: {
    message: toAsyncMessage({
      zh: '请求格式错误',
      en: 'Invalid request format',
    }),
    action: toAsyncMessage({
      zh: '刷新页面',
      en: 'Refresh page',
    }),
    help: toAsyncMessage({
      zh: '请求的格式不正确，请刷新页面重试。',
      en: 'The request format is incorrect. Please refresh the page and try again.',
    }),
  },

  [ErrorType.SERVICE_UNAVAILABLE]: {
    message: toAsyncMessage({
      zh: '服务暂时不可用，请稍后重试',
      en: 'Service temporarily unavailable, please try again later',
    }),
    action: toAsyncMessage({
      zh: '等待后重试',
      en: 'Wait and retry',
    }),
    help: toAsyncMessage({
      zh: '服务正在进行维护或暂时不可用，请稍后再试。',
      en: 'The service is under maintenance or temporarily unavailable. Please try again later.',
    }),
  },

  [ErrorType.REGISTRATION_FAILED]: {
    message: toAsyncMessage({
      zh: '注册失败，请重试',
      en: 'Registration failed, please try again',
    }),
    action: toAsyncMessage({
      zh: '检查邮箱格式',
      en: 'Check email format',
    }),
    help: toAsyncMessage({
      zh: '注册过程中出现问题，请检查输入信息是否正确。',
      en: 'An issue occurred during registration. Please check if the information entered is correct.',
    }),
  },

  [ErrorType.WEAK_PASSWORD]: {
    message: toAsyncMessage({
      zh: '密码强度不够，请使用更复杂的密码',
      en: 'Password is too weak, please use a stronger one',
    }),
    action: toAsyncMessage({
      zh: '设置新密码',
      en: 'Set new password',
    }),
    help: toAsyncMessage({
      zh: '密码应包含大小写字母、数字和特殊字符，且长度至少 8 位。',
      en: 'Password should contain uppercase, lowercase, numbers, and special characters, and be at least 8 characters long.',
    }),
  },

  [ErrorType.MISSING_TOKEN]: {
    message: toAsyncMessage({
      zh: '认证令牌缺失，请重新登录',
      en: 'Authentication token missing, please log in again',
    }),
    action: toAsyncMessage({
      zh: '重新登录',
      en: 'Log in again',
    }),
    help: toAsyncMessage({
      zh: '您的登录已过期，请重新登录以继续。',
      en: 'Your login session has expired. Please log in again to continue.',
    }),
  },

  [ErrorType.CONFLICT]: {
    message: toAsyncMessage({
      zh: '资源冲突',
      en: 'Resource conflict',
    }),
    action: toAsyncMessage({
      zh: '刷新后重试',
      en: 'Refresh and try again',
    }),
    help: toAsyncMessage({
      zh: '该资源已被其他用户修改，请刷新页面后重试。',
      en: 'This resource has been modified by another user. Please refresh the page and try again.',
    }),
  },
}

/**
 * Supported locales
 */
export type SupportedLocale = 'zh' | 'en'

/**
 * Default locale
 */
const DEFAULT_LOCALE: SupportedLocale = 'zh'

/**
 * Get a user-friendly error message for a given error type and locale
 *
 * @param errorType - The error type
 * @param locale - Language locale (default: 'zh')
 * @returns User-friendly error with message, action, and optional help text
 *
 * @example
 * const error = await getUserFriendlyError(ErrorType.UNAUTHORIZED, 'zh');
 * // { message: '请先登录', action: '去登录', help: '...' }
 */
export async function getUserFriendlyError(
  errorType: ErrorType,
  locale: SupportedLocale = DEFAULT_LOCALE
): Promise<UserError> {
  const mapping = ERROR_MAPPINGS[errorType]

  if (!mapping) {
    // Fallback for unknown error types
    const fallbackMessage: Record<SupportedLocale, string> = {
      zh: '发生未知错误',
      en: 'An unknown error occurred',
    }

    const fallbackAction: Record<SupportedLocale, string> = {
      zh: '刷新页面',
      en: 'Refresh page',
    }

    return {
      message: fallbackMessage[locale] || fallbackMessage.zh,
      action: fallbackAction[locale] || fallbackAction.zh,
      help:
        locale === 'zh'
          ? '请稍后重试，如果问题持续请联系客服。'
          : 'Please try again later, or contact support if the issue persists.',
    }
  }

  const message = await mapping.message(locale)
  const action = await mapping.action(locale)
  const help = mapping.help ? await mapping.help(locale) : undefined

  return {
    message,
    action,
    help,
  }
}

/**
 * Synchronous version of getUserFriendlyError
 * Only works with string messages, not async getters
 *
 * @param errorType - The error type
 * @param locale - Language locale (default: 'zh')
 * @returns User-friendly error
 */
export function getUserFriendlyErrorSync(
  errorType: ErrorType,
  locale: SupportedLocale = DEFAULT_LOCALE
): UserError {
  const mapping = ERROR_MAPPINGS[errorType]

  if (!mapping) {
    const fallbackMessage: Record<SupportedLocale, string> = {
      zh: '发生未知错误',
      en: 'An unknown error occurred',
    }

    const fallbackAction: Record<SupportedLocale, string> = {
      zh: '刷新页面',
      en: 'Refresh page',
    }

    return {
      message: fallbackMessage[locale] || fallbackMessage.zh,
      action: fallbackAction[locale] || fallbackAction.zh,
    }
  }

  // This is a simplified synchronous version
  const messages: Record<
    ErrorType,
    Record<SupportedLocale, { message: string; action: string }>
  > = {
    [ErrorType.VALIDATION]: {
      zh: { message: '输入信息有误，请检查后重试', action: '请检查表单字段' },
      en: {
        message: 'Invalid input, please check and try again',
        action: 'Please check the form fields',
      },
    },
    [ErrorType.NOT_FOUND]: {
      zh: { message: '请求的资源不存在', action: '返回上一页' },
      en: { message: 'The requested resource was not found', action: 'Go back' },
    },
    [ErrorType.UNAUTHORIZED]: {
      zh: { message: '请先登录', action: '去登录' },
      en: { message: 'Please log in', action: 'Log in' },
    },
    [ErrorType.FORBIDDEN]: {
      zh: { message: '您没有权限访问此资源', action: '联系管理员' },
      en: {
        message: 'You do not have permission to access this resource',
        action: 'Contact administrator',
      },
    },
    [ErrorType.RATE_LIMIT]: {
      zh: { message: '请求过于频繁，请稍后再试', action: '等待 1 分钟' },
      en: { message: 'Too many requests, please try again later', action: 'Wait 1 minute' },
    },
    [ErrorType.INTERNAL]: {
      zh: { message: '服务器出错了，我们正在修复', action: '稍后重试' },
      en: { message: "Something went wrong, we're fixing it", action: 'Try again later' },
    },
    [ErrorType.BAD_REQUEST]: {
      zh: { message: '请求格式错误', action: '刷新页面' },
      en: { message: 'Invalid request format', action: 'Refresh page' },
    },
    [ErrorType.SERVICE_UNAVAILABLE]: {
      zh: { message: '服务暂时不可用，请稍后重试', action: '等待后重试' },
      en: {
        message: 'Service temporarily unavailable, please try again later',
        action: 'Wait and retry',
      },
    },
    [ErrorType.REGISTRATION_FAILED]: {
      zh: { message: '注册失败，请重试', action: '检查邮箱格式' },
      en: { message: 'Registration failed, please try again', action: 'Check email format' },
    },
    [ErrorType.WEAK_PASSWORD]: {
      zh: { message: '密码强度不够，请使用更复杂的密码', action: '设置新密码' },
      en: {
        message: 'Password is too weak, please use a stronger one',
        action: 'Set new password',
      },
    },
    [ErrorType.MISSING_TOKEN]: {
      zh: { message: '认证令牌缺失，请重新登录', action: '重新登录' },
      en: { message: 'Authentication token missing, please log in again', action: 'Log in again' },
    },

    [ErrorType.CONFLICT]: {
      zh: { message: '资源冲突', action: '刷新后重试' },
      en: { message: 'Resource conflict', action: 'Refresh and try again' },
    },
  }

  const errorMessages = messages[errorType]?.[locale] || messages[errorType]?.zh
  return {
    message: errorMessages?.message || '发生未知错误',
    action: errorMessages?.action || '刷新页面',
  }
}

/**
 * Get locale from request headers
 * Checks Accept-Language header and extracts the supported locale
 *
 * @param request - Next.js request object
 * @returns Supported locale (default: 'zh')
 */
export function getLocaleFromRequest(request: Request): SupportedLocale {
  const acceptLanguage = request.headers.get('accept-language') || ''

  // Check if English is preferred
  if (acceptLanguage.toLowerCase().startsWith('en')) {
    return 'en'
  }

  // Default to Chinese
  return 'zh'
}

/**
 * Create an extended error response with user-friendly messages
 * This can be used to enhance the existing error response format
 *
 * @param errorType - Error type
 * @param locale - Language locale
 * @returns Extended error response data
 */
export async function createUserErrorExtension(
  errorType: ErrorType,
  locale: SupportedLocale = DEFAULT_LOCALE
): Promise<{ userMessage: string; userAction?: string; userHelp?: string }> {
  const userError = await getUserFriendlyError(errorType, locale)

  return {
    userMessage: userError.message,
    userAction: userError.action,
    userHelp: userError.help,
  }
}

/**
 * Custom error messages for specific scenarios
 * These can override the default messages
 */
export const CUSTOM_ERROR_MESSAGES: Record<string, Record<SupportedLocale, UserError>> = {
  // Example: Custom messages for GitHub API errors
  GITHUB_RATE_LIMIT: {
    zh: {
      message: 'GitHub API 速率限制已达到，请稍后重试',
      action: '等待 1 小时',
      help: 'GitHub API 每小时有请求限制，请稍后再试或添加认证令牌。',
    },
    en: {
      message: 'GitHub API rate limit reached, please try again later',
      action: 'Wait 1 hour',
      help: 'GitHub API has an hourly request limit. Please try again later or add an authentication token.',
    },
  },
}

/**
 * Get custom error message for a specific error code
 *
 * @param errorCode - Custom error code
 * @param locale - Language locale
 * @returns User-friendly error or null if not found
 */
export function getCustomErrorMessage(
  errorCode: string,
  locale: SupportedLocale = DEFAULT_LOCALE
): UserError | null {
  const customErrors = CUSTOM_ERROR_MESSAGES[errorCode]
  if (!customErrors) {
    return null
  }

  return customErrors[locale] || customErrors.zh
}
