/**
 * 搜索 API 端点
 *
 * GET /api/search - 搜索功能（需要认证）
 */

import { NextRequest } from 'next/server'
import { authMiddleware } from '@/middleware/auth.middleware'
import { searchSchema, sanitizeHtml } from '@/shared/lib/validation-schemas'
import { createSuccessResponse, createBadRequestError, createErrorResponse } from '@/lib/api/error-handler'
import { createHotDataCache, CachePresets } from '@/lib/cache'

// Cache for search results (short TTL due to dynamic content)
const searchCache = createHotDataCache<unknown>(CachePresets.SHORT)

/**
 * GET /api/search - 搜索功能（需要认证）
 */
export async function GET(request: NextRequest) {
  // 验证认证
  const authResponse = authMiddleware(request)
  if (authResponse.status !== 200) {
    return authResponse
  }

  const userId = request.headers.get('x-user-id')
  const { searchParams } = new URL(request.url)

  const query = searchParams.get('q')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const type = searchParams.get('type') as 'all' | 'projects' | 'users' | 'notifications' | null
  const sortBy = searchParams.get('sort') as 'relevance' | 'date' | 'name' | null

  // 验证搜索参数
  const validationResult = searchSchema.safeParse({
    query,
    page,
    limit,
  })

  if (!validationResult.success) {
    return createBadRequestError('Validation Error', {
      errors: validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    })
  }

  // 防止搜索注入攻击
  const sanitizedQuery = validationResult.data.query.replace(/[^\w\s\u4e00-\u9fa5-]/g, '').trim()

  if (sanitizedQuery.length === 0) {
    return createBadRequestError('Invalid Query', { message: '搜索关键词无效' })
  }

  // 验证类型参数
  const validTypes = ['all', 'projects', 'users', 'notifications']
  if (type && !validTypes.includes(type)) {
    return createBadRequestError('Invalid Type', { message: '无效的搜索类型' })
  }

  // 验证排序参数
  const validSorts = ['relevance', 'date', 'name']
  if (sortBy && !validSorts.includes(sortBy)) {
    return createBadRequestError('Invalid Sort', { message: '无效的排序方式' })
  }

  try {
    // Generate cache key
    const cacheKey = {
      endpoint: 'search',
      params: { q: sanitizedQuery, page, limit, type, sortBy },
      version: '1',
    }

    // Check cache first
    const cachedResult = searchCache.get(cacheKey)
    if (cachedResult) {
      return createSuccessResponse(cachedResult)
    }

    // TODO: 执行搜索
    // 1. 根据类型搜索不同资源
    // 2. 使用全文搜索引擎 (如 Elasticsearch)
    // 3. 返回结果
    // 4. 记录搜索日志
    // 5. 更新搜索热度

    // 模拟搜索结果
    const mockResults = [
      {
        id: '1',
        type: 'project',
        title: '示例项目 1',
        description: '这是一个示例项目的描述',
        url: '/projects/1',
        score: 0.95,
        highlights: {
          title: '<em>示例</em>项目 1',
          description: '这是一个<em>示例</em>项目的描述',
        },
      },
      {
        id: '2',
        type: 'user',
        title: '用户张三',
        description: '前端开发工程师',
        url: '/users/2',
        score: 0.85,
        highlights: {
          title: '用户张三',
          description: '前端开发工程师',
        },
      },
    ]

    const response = {
      query: sanitizedQuery,
      results: mockResults,
      total: mockResults.length,
      page,
      limit,
      filters: {
        type: type || 'all',
        sortBy: sortBy || 'relevance',
      },
      searchTime: 0.05, // 搜索耗时（秒）
    }

    // Cache the response
    searchCache.set(cacheKey, response)

    return createSuccessResponse(response)
  } catch (error) {
    console.error('[Search API] Error:', error)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * GET /api/search/suggestions - 搜索建议（需要认证）
 */
export async function SUGGESTIONS(request: NextRequest) {
  // 验证认证
  const authResponse = authMiddleware(request)
  if (authResponse.status !== 200) {
    return authResponse
  }

  const userId = request.headers.get('x-user-id')
  const { searchParams } = new URL(request.url)

  const query = searchParams.get('q')

  if (!query || query.trim().length === 0) {
    return createSuccessResponse({ suggestions: [] })
  }

  // 清理查询
  const sanitizedQuery = query
    .replace(/[^\w\s\u4e00-\u9fa5]/g, '')
    .trim()
    .substring(0, 50)

  // TODO: 获取搜索建议
  // 1. 基于历史搜索记录
  // 2. 基于热门搜索
  // 3. 基于内容索引

  const mockSuggestions = [
    {
      text: sanitizedQuery + ' 项目',
      type: 'auto',
    },
    {
      text: sanitizedQuery + ' 用户',
      type: 'history',
    },
  ]

  return createSuccessResponse({
    query: sanitizedQuery,
    suggestions: mockSuggestions,
  })
}
