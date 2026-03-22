/**
 * GitHub Commits API Route
 * Fetch GitHub commit data for a repository
 *
 * @module github-commits-api
 * @version 1.0.8
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

/**
 * GitHub commit information
 */
interface GitHubCommit {
  /** Commit SHA */
  sha: string;
  /** Commit message */
  message: string;
  /** Author name */
  author: string;
  /** Commit date */
  date: string;
}

/**
 * Commits response metadata
 */
interface CommitsMeta {
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
  /** Branch name */
  branch: string;
  /** Number of commits */
  count: number;
}

/**
 * Commits API response
 */
interface CommitsResponse {
  success: boolean;
  data: GitHubCommit[];
  meta: CommitsMeta;
}

// ============================================================================
// GET /api/github/commits - Fetch GitHub commits
// ============================================================================

/**
 * GET /api/github/commits
 *
 * Fetch GitHub commit data for a repository
 *
 * @auth Optional (depends on configuration)
 *
 * @query {string} owner - Repository owner (default: owner)
 * @query {string} repo - Repository name (default: repo)
 * @query {string} branch - Branch name (default: main)
 *
 * @returns {Promise<NextResponse>} JSON response with commits
 *
 * @example
 * ```http
 * GET /api/github/commits?owner=owner&repo=repo&branch=main
 * ```
 *
 * @example
 * ```javascript
 * const response = await fetch('/api/github/commits?owner=owner&repo=repo&branch=main');
 * const data = await response.json();
 * // {
 * //   "success": true,
 * //   "data": [
 * //     {
 * //       "sha": "abc123",
 * //       "message": "Initial commit",
 * //       "author": "John Doe",
 * //       "date": "2024-01-01T00:00:00Z"
 * //     }
 * //   ],
 * //   "meta": {
 * //     "owner": "owner",
 * //     "repo": "repo",
 * //     "branch": "main",
 * //     "count": 1
 * //   }
 * // }
 * ```
 *
 * @note In production, this would fetch from GitHub API
 * @note Currently returns mock data
 */
export async function GET(request: NextRequest): Promise<NextResponse<CommitsResponse>> {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get('owner') || 'owner';
  const repo = searchParams.get('repo') || 'repo';
  const branch = searchParams.get('branch') || 'main';

  try {
    // In production, this would fetch from GitHub API
    // For now, return mock data
    const commits: GitHubCommit[] = [
      {
        sha: 'abc123',
        message: 'Initial commit',
        author: 'John Doe',
        date: new Date().toISOString(),
      },
    ];

    return NextResponse.json({
      success: true,
      data: commits,
      meta: {
        owner,
        repo,
        branch,
        count: commits.length,
      },
    });
  } catch (error) {
    logger.error('GitHub commits fetch failed', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch commits',
        data: [],
        meta: { owner, repo, branch, count: 0 },
      } as CommitsResponse,
      { status: 500 }
    );
  }
}
