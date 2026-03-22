/**
 * @fileoverview Advanced search API route
 * @description API endpoint for global search across entities
 */

import { NextRequest } from 'next/server';
import { getGlobalSearchManager } from '@/lib/search/advanced-search';
import { getGlobalHistoryManager } from '@/lib/search/history-manager';
import type {
  AdvancedSearchQuery,
  PaginatedSearchResult,
  UnifiedEntity,
} from '@/lib/search/types';
import { success, internalError } from '@/lib/api/response';
import { logger } from '@/lib/logger';

/**
 * GET /api/search - Perform a global search
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const query = searchParams.get('q') || '';
    const target = (searchParams.get('target') || 'all') as 'all' | 'tasks' | 'projects' | 'members';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const includeHistory = searchParams.get('history') === 'true';

    // Parse filters
    const filters: AdvancedSearchQuery['filters'] = {};
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const labels = searchParams.get('labels');
    const assignees = searchParams.get('assignees');
    const createdAfter = searchParams.get('createdAfter');
    const createdBefore = searchParams.get('createdBefore');
    const updatedAfter = searchParams.get('updatedAfter');
    const updatedBefore = searchParams.get('updatedBefore');

    if (status) filters.status = status.split(',');
    if (priority) filters.priority = priority.split(',');
    if (labels) filters.labels = labels.split(',');
    if (assignees) filters.assignees = assignees.split(',');
    if (createdAfter) filters.createdAfter = createdAfter;
    if (createdBefore) filters.createdBefore = createdBefore;
    if (updatedAfter) filters.updatedAfter = updatedAfter;
    if (updatedBefore) filters.updatedBefore = updatedBefore;

    // Parse search config
    const fuzzyThreshold = parseFloat(searchParams.get('fuzzyThreshold') || '0.3');
    const enableFuzzy = searchParams.get('fuzzy') !== 'false';
    const caseSensitive = searchParams.get('caseSensitive') === 'true';
    const includeHighlights = searchParams.get('highlights') !== 'false';

    const searchConfig = {
      target,
      caseSensitive,
      fuzzyMatch: enableFuzzy,
      fuzzyThreshold,
      includeHighlights,
    };

    // Get managers
    const searchManager = getGlobalSearchManager();
    const historyManager = getGlobalHistoryManager();

    // Determine which indices to search
    const indices = target === 'all' ? undefined : [`${target}s`];

    // Perform search
    const results = searchManager.search(query, {
      indices,
      limit,
      config: searchConfig,
    });

    // Apply additional filters (date ranges, etc.)
    const filteredResults = applyAdditionalFilters(results, filters);

    // Apply pagination
    const paginatedResults = applyPagination(filteredResults, offset, limit);

    // Build response
    const response = {
      results: paginatedResults.results,
      total: paginatedResults.total,
      page: paginatedResults.page,
      pageSize: paginatedResults.pageSize,
      hasMore: paginatedResults.hasMore,
    };

    // Add to history if query is not empty
    if (query.trim() && paginatedResults.total > 0) {
      historyManager.add({
        query,
        resultCount: paginatedResults.total,
        target,
      });
    }

    // Include recent history if requested
    if (includeHistory) {
      const responseWithHistory = {
        ...response,
        history: historyManager.getRecent(5).map(h => ({
          query: h.query,
          timestamp: h.timestamp,
        })),
      };
      return success(responseWithHistory);
    }

    return success(response);
  } catch (error) {
    logger.error('Search API error:', error instanceof Error ? error : new Error(String(error)), { category: 'search' });
    return internalError('Search failed');
  }
}

// ============================================================================
// Utility functions
// ============================================================================

/**
 * Apply additional filters to search results
 */
function applyAdditionalFilters(
  results: Array<{ item: Record<string, unknown>; score: number }>,
  filters: AdvancedSearchQuery['filters']
): Array<{ item: Record<string, unknown>; score: number }> {
  if (Object.keys(filters).length === 0) {
    return results;
  }

  return results.filter(({ item }) => {
    // Filter by status
    if (filters.status && filters.status.length > 0) {
      if (item.type === 'task') {
        const task = item as { status: string };
        if (!filters.status.includes(task.status)) {
          return false;
        }
      }
    }

    // Filter by priority
    if (filters.priority && filters.priority.length > 0) {
      if (item.type === 'task') {
        const task = item as { priority: string };
        if (!filters.priority.includes(task.priority)) {
          return false;
        }
      }
    }

    // Filter by labels
    if (filters.labels && filters.labels.length > 0) {
      if (item.type === 'task') {
        const task = item as { labels?: Array<{ name: string }> };
        const taskLabels = task.labels?.map((l) => l.name) || [];
        if (!filters.labels.some(label => taskLabels.includes(label))) {
          return false;
        }
      }
    }

    // Filter by assignees
    if (filters.assignees && filters.assignees.length > 0) {
      if (item.type === 'task') {
        const task = item as { assignee?: string };
        if (!task.assignee || !filters.assignees.includes(task.assignee)) {
          return false;
        }
      }
    }

    // Filter by date ranges
    if (filters.createdAfter) {
      const createdAtValue = item.createdAt as string | number | undefined;
      const createdAt = new Date(createdAtValue || 0);
      const threshold = new Date(filters.createdAfter);
      if (createdAt < threshold) {
        return false;
      }
    }

    if (filters.createdBefore) {
      const createdAtValue = item.createdAt as string | number | undefined;
      const createdAt = new Date(createdAtValue || 0);
      const threshold = new Date(filters.createdBefore);
      if (createdAt > threshold) {
        return false;
      }
    }

    if (filters.updatedAfter) {
      const updatedAtValue = item.updatedAt as string | number | undefined;
      const updatedAt = new Date(updatedAtValue || 0);
      const threshold = new Date(filters.updatedAfter);
      if (updatedAt < threshold) {
        return false;
      }
    }

    if (filters.updatedBefore) {
      const updatedAtValue = item.updatedAt as string | number | undefined;
      const updatedAt = new Date(updatedAtValue || 0);
      const threshold = new Date(filters.updatedBefore);
      if (updatedAt > threshold) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Apply pagination to results
 */
function applyPagination<T>(
  results: T[],
  offset: number,
  limit: number
): { results: T[]; total: number; page: number; pageSize: number; hasMore: boolean } {
  const total = results.length;
  const paginatedResults = results.slice(offset, offset + limit);
  const page = Math.floor(offset / limit) + 1;

  return {
    results: paginatedResults,
    total,
    page,
    pageSize: limit,
    hasMore: offset + limit < total,
  };
}
