/**
 * GDPR Cookie Consent Types
 * Defines types for cookie consent management per GDPR requirements
 */

export type CookieCategory = 'necessary' | 'analytics' | 'marketing'

export interface CookieConsent {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

export interface CookieCategoryInfo {
  id: CookieCategory
  label: string
  description: string
  required: boolean
  cookies: string[]
}

export const COOKIE_CONSENT_KEY = 'cookie-consent-preference'

export const DEFAULT_CONSENT: CookieConsent = {
  necessary: true, // Always true - cannot be disabled
  analytics: false,
  marketing: false,
}

export const COOKIE_CATEGORIES: CookieCategoryInfo[] = [
  {
    id: 'necessary',
    label: '必要 Cookie',
    description: '这些 Cookie 是网站正常运行所必需的，无法关闭。',
    required: true,
    cookies: ['session_id', 'auth_token', 'csrf_token', 'theme_preference'],
  },
  {
    id: 'analytics',
    label: '分析 Cookie',
    description: '帮助我们了解访客如何与网站互动，以改善用户体验。',
    required: false,
    cookies: ['_ga', '_gid', '_gat', 'analytics_session_id'],
  },
  {
    id: 'marketing',
    label: '营销 Cookie',
    description: '用于跟踪跨网站的访客，以展示相关广告。',
    required: false,
    cookies: ['_fbp', 'fr', 'ads_id', 'campaign_tracking'],
  },
]
