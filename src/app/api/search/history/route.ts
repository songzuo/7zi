/**
 * @fileoverview Search history API route
 * @description API endpoint for search history management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGlobalHistoryManager } from '@/lib/search/history-manager';
import type { SearchHistoryEntry } from '@/lib/search/types';

/**
 * GET /api/search/history - Get search history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const type = searchParams.get('type') || 'recent'; // 'recent', 'popular', 'trending'
    const target = searchParams.get('target') as 'all' | 'tasks' | 'projects' | 'members' | 'agents' | null;

    const historyManager = getGlobalHistoryManager();

    let entries: SearchHistoryEntry[] = [];

    switch (type) {
      case 'popular': {
        const popular = historyManager.getPopular(limit);
        // Map popular queries back to history entries
        const allHistory = historyManager.getAll();
        entries = popular
          .map(p => allHistory.find(h => h.query.toLowerCase() === p.query))
          .filter((h): h is NonNullable<typeof h> => h !== undefined);
        break;
      }

      case 'trending': {
        const trending = historyManager.getTrending(limit);
        // Map trending queries back to history entries
        const allHistory = historyManager.getAll();
        entries = trending
          .map(t => allHistory.find(h => h.query.toLowerCase() === t.query))
          .filter((h): h is NonNullable<typeof h> => h !== undefined);
        break;
      }

      case 'recent':
      default: {
        if (target) {
          entries = historyManager.getByTarget(target).slice(0, limit);
        } else {
          entries = historyManager.getRecent(limit);
        }
        break;
      }
    }

    return NextResponse.json({
      entries,
      type,
      limit,
      total: entries.length,
    });
  } catch (error) {
    console.error('History API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get history',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/search/history - Add entry to history
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, resultCount, target } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'query is required and must be a string',
        },
        { status: 400 }
      );
    }

    const historyManager = getGlobalHistoryManager();

    historyManager.add({
      query,
      resultCount: resultCount || 0,
      target: target || 'all',
    });

    return NextResponse.json({
      success: true,
      message: 'Search added to history',
      entry: {
        query,
        resultCount,
        target,
      },
    });
  } catch (error) {
    console.error('Add history API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to add to history',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/search/history - Clear search history
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    const historyManager = getGlobalHistoryManager();

    if (query) {
      // Remove specific entry
      historyManager.remove(query);

      return NextResponse.json({
        success: true,
        message: `Search "${query}" removed from history`,
      });
    } else {
      // Clear all history
      historyManager.clear();

      return NextResponse.json({
        success: true,
        message: 'Search history cleared',
      });
    }
  } catch (error) {
    console.error('Clear history API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to clear history',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
