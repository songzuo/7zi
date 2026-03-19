/**
 * GitHub API 代理 - Issues
 *
 * 安全目的：隐藏 GITHUB_TOKEN，避免在客户端暴露
 * 服务端代理 GitHub API 请求
 *
 * @refactored - Added parameter validation and improved error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  githubIssuesQuerySchema,
  validateQuery,
  formatValidationErrors,
} from '@/lib/api/validation';
import {
  createValidationError,
  createUnauthorizedError,
  createNotFoundError,
  createRateLimitError,
  createErrorResponse,
} from '@/lib/api/error-handler';
import { logger } from '@/lib/logger';

const GITHUB_API_BASE = 'https://api.github.com';

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  created_at: string;
  updated_at: string;
  html_url: string;
  pull_request?: {
    html_url: string;
  };
}

interface SuccessResponse {
  success: true;
  data: GitHubIssue[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
  };
  timestamp: string;
}

/**
 * GET /api/github/issues
 * Get issues for a GitHub repository
 */
export async function GET(request: NextRequest) {
  try {
    // Get and validate query parameters
    const url = new URL(request.url);
    const validation = validateQuery(url.searchParams, githubIssuesQuerySchema);

    if (!validation.success) {
      const errors = formatValidationErrors(validation.errors);
      return createValidationError('Invalid query parameters', { fields: errors });
    }

    const {
      owner,
      repo,
      per_page,
      page,
      state,
      labels,
      sort,
      direction,
      since,
    } = validation.data;

    // Get GitHub token from server environment
    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      logger.warn('GITHUB_TOKEN not configured - using unauthenticated requests (rate limited)');
    }

    // Build request headers
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': '7zi-frontend/1.0',
    };

    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    // Build GitHub API URL with query parameters
    const apiParams = new URLSearchParams({
      per_page: per_page.toString(),
      page: page.toString(),
      state,
      sort,
      direction,
    });

    if (labels) {
      apiParams.append('labels', labels);
    }

    if (since) {
      apiParams.append('since', since);
    }

    const apiUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?${apiParams.toString()}`;

    // Fetch from GitHub API
    const response = await fetch(apiUrl, { headers });

    // Handle specific GitHub error responses
    if (!response.ok) {
      switch (response.status) {
        case 404:
          return createNotFoundError(
            `Repository ${owner}/${repo} not found or does not exist`,
            { owner, repo }
          );

        case 401:
          return createUnauthorizedError('GitHub authentication token is invalid or expired');

        case 403:
          const rateLimitReset = response.headers.get('x-ratelimit-reset');
          return createRateLimitError(
            rateLimitReset
              ? `GitHub API rate limit exceeded. Reset at ${new Date(parseInt(rateLimitReset) * 1000).toISOString()}`
              : 'GitHub API rate limit exceeded. Please try again later.'
          );

        default:
          const errorText = await response.text().catch(() => response.statusText);
          return createErrorResponse(
            new Error(`GitHub API error: ${errorText}`),
            response.status
          );
      }
    }

    // Parse response data
    const data = await response.json();

    // Validate response is an array
    if (!Array.isArray(data)) {
      logger.error('GitHub API returned unexpected data format', { data });
      return createErrorResponse(
        new Error('Invalid response format from GitHub API'),
        502
      );
    }

    // Filter out pull requests (GitHub API returns both issues and PRs)
    const issuesOnly = data.filter(
      (item: GitHubIssue) => !item.pull_request
    );

    // Get pagination info from headers
    const linkHeader = response.headers.get('link');
    const total = parseTotalFromLinkHeader(linkHeader);

    // Return success response
    const successResponse: SuccessResponse = {
      success: true,
      data: issuesOnly,
      pagination: {
        page,
        per_page: per_page,
        total,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(successResponse);

  } catch (error) {
    logger.error('GitHub issues API proxy error', error);
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Parse total count from GitHub's Link header
 */
function parseTotalFromLinkHeader(linkHeader: string | null): number {
  if (!linkHeader) return 0;

  // GitHub doesn't provide total count in Link header
  // We'll return 0 to indicate unknown total
  return 0;
}
