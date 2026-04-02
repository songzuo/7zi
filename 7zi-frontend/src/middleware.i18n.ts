/**
 * i18n 中间件
 *
 * 用于服务端语言检测和 Cookie 设置
 */

import { NextRequest, NextResponse } from 'next/server'
import { isSupportedLanguage, normalizeLanguage, defaultLanguage } from './lib/i18n/config'

/**
 * 检测语言优先级：
 * 1. Cookie (i18next)
 * 2. Accept-Language header
 * 3. 默认语言
 */
function detectLanguage(request: NextRequest): string {
  // 1. 检查 Cookie
  const cookieLang = request.cookies.get('i18next')?.value
  if (cookieLang && isSupportedLanguage(cookieLang)) {
    return cookieLang
  }

  // 2. 检查 Accept-Language header
  const acceptLang = request.headers.get('accept-language')
  if (acceptLang) {
    // 解析 Accept-Language header
    const languages = acceptLang.split(',').map(lang => lang.split(';')[0].trim().toLowerCase())

    // 查找第一个支持的语言
    for (const lang of languages) {
      const normalized = normalizeLanguage(lang)
      if (isSupportedLanguage(normalized)) {
        return normalized
      }
    }
  }

  // 3. 返回默认语言
  return defaultLanguage
}

/**
 * 添加语言相关的响应
 */
function addLanguageHeaders(response: NextResponse, lng: string): NextResponse {
  // 设置 Content-Language header
  response.headers.set('Content-Language', lng)

  return response
}

/**
 * i18n 中间件
 */
export function i18nMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 跳过静态资源和 API 路由
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images')
  ) {
    return NextResponse.next()
  }

  // 检测语言
  const detectedLang = detectLanguage(request)

  // 创建响应
  const response = NextResponse.next()

  // 设置语言 Cookie（如果不存在）
  const existingCookie = request.cookies.get('i18next')
  if (!existingCookie || existingCookie.value !== detectedLang) {
    response.cookies.set('i18next', detectedLang, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: '/',
    })
  }

  // 添加语言响应头
  addLanguageHeaders(response, detectedLang)

  return response
}
