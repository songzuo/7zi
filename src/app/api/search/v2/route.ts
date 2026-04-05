/**
 * @fileoverview Enhanced Search API Route
 * @description API endpoint for advanced search with filtering, sorting, and multiple engines
 */

import { NextRequest } from 'next/server'
import { getGlobalUnifiedSearchManager } from '@/lib/search/unified-search'
import type { UnifiedSearchOptions, SearchEngineType } from '@/lib/search/unified-search'
import type { SearchFilters, UnifiedEntity } from '@/lib/search/types'
import { createErrorResponse, createSuccessResponse } from '@/lib/api/error-handler'
import { logger } from '@/lib/logger'

/**
 * GET /api/search/v2 - Perform advanced search
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const query = searchParams.get('q') || ''
    const targets = searchParams.get('targets')?.split(',') as UnifiedEntity['type'][] | undefined
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const engine = (searchParams.get('engine') || 'fuse') as SearchEngineType
    const sort = searchParams.get('sort') || 'relevance'
    const includeHighlights = searchParams.get('highlights') !== 'false'
    const fuzzySearch = searchParams.get('fuzzy') !== 'false'
    const fuzzyThreshold = parseFloat(searchParams.get('fuzzyThreshold') || '0.3')

    // Parse filters
    const filters: SearchFilters = {}
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const labels = searchParams.get('labels')
    const assignees = searchParams.get('assignees')
    const createdAfter = searchParams.get('createdAfter')
    const createdBefore = searchParams.get('createdBefore')
    const updatedAfter = searchParams.get('updatedAfter')
    const updatedBefore = searchParams.get('updatedBefore')

    if (status) filters.status = status.split(',')
    if (priority) filters.priority = priority.split(',')
    if (labels) filters.labels = labels.split(',')
    if (assignees) filters.assignees = assignees.split(',')
    if (createdAfter) filters.createdAfter = createdAfter
    if (createdBefore) filters.createdBefore = createdBefore
    if (updatedAfter) filters.updatedAfter = updatedAfter
    if (updatedBefore) filters.updatedBefore = updatedBefore

    // Parse custom filters
    const customFilters = searchParams.get('custom')
    if (customFilters) {
      try {
        filters.custom = JSON.parse(customFilters)
      } catch (error) {
        logger.warn('Failed to parse custom filters', { error, customFilters })
      }
    }

    // Build search options
    const searchOptions: UnifiedSearchOptions = {
      query,
      targets,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      sort,
      limit,
      offset,
      engine,
      includeHighlights,
      fuzzySearch,
      fuzzyThreshold,
    }

    // Get search manager
    const searchManager = getGlobalUnifiedSearchManager()

    // Perform search
    const { results, pagination, statistics } = await searchManager.search(searchOptions)

    // Build response
    const response = {
      results,
      pagination,
      statistics,
      query,
      filters,
      sort,
      engine,
    }

    return createSuccessResponse(response)
  } catch (error) {
    logger.error('Search API v2 error:', error instanceof Error ? error : new Error(String(error)), {
      category: 'search',
    })
    return createErrorResponse(error instanceof Error ? error : new Error('Search failed'))
  }
}

/**
 * POST /api/search/v2 - Perform advanced search with JSON body
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Parse request body
    const query = body.query || ''
    const targets = body.targets as UnifiedEntity['type'][] | undefined
    const filters = body.filters as SearchFilters | undefined
    const sort = body.sort || 'relevance'
    const limit = body.limit || 50
    const offset = body.offset || 0
    const engine = (body.engine || 'fuse') as SearchEngineType
    const includeHighlights = body.includeHighlights !== false
    const fuzzySearch = body.fuzzySearch !== false
    const fuzzyThreshold = body.fuzzyThreshold || 0.3

    // Build search options
    const searchOptions: UnifiedSearchOptions = {
      query,
      targets,
      filters,
      sort,
      limit,
      offset,
      engine,
      includeHighlights,
      fuzzySearch,
      fuzzyThreshold,
    }

    // Get search manager
    const searchManager = getGlobalUnifiedSearchManager()

    // Perform search
    const { results, pagination, statistics } = await searchManager.search(searchOptions)

    // Build response
    const response = {
      results,
      pagination,
      statistics,
      query,
      filters,
      sort,
      engine,
    }

    return createSuccessResponse(response)
  } catch (error) {
    logger.error('Search API v2 POST error:', error instanceof Error ? error : new Error(String(error)), {
      category: 'search',
    })
    return createErrorResponse(error instanceof Error ? error : new Error('Search failed'))
  }
}