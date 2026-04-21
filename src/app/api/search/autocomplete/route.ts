/**
 * @fileoverview Search autocomplete API route
 * @description API endpoint for search autocomplete suggestions
 */
import { NextRequest, NextResponse } from "next/server";

import { getGlobalSearchManager } from '@/lib/search/advanced-search';
import type { AutocompleteSuggestion } from '@/lib/search/types';

/**
 * GET /api/search/autocomplete - Get autocomplete suggestions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get('q') || '';
    const target = searchParams.get('target') || 'all';
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const includeHistory = searchParams.get('history') !== 'false';

    const searchManager = getGlobalSearchManager();

    const indices = target === 'all' ? undefined : [`${target}s`];

    const suggestions = (await searchManager.getAutocompleteSuggestions(query, {
      indices,
      includeHistory,
    })).slice(0, limit);

    return NextResponse.json({
      suggestions,
      query,
      count: suggestions.length,
      hasMore: suggestions.length >= limit,
    });
  } catch (error) {
    console.error('Autocomplete API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get suggestions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
