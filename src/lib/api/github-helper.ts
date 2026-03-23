/**
 * GitHub API 代理辅助工具
 * 统一的 GitHub API 请求处理，减少重复代码
 */

import { logger } from '../logger';

const GITHUB_API_BASE = 'https://api.github.com';

export interface GitHubAPIOptions {
  owner?: string;
  repo?: string;
  perPage?: number;
  state?: string;
  token?: string;
  since?: string; // ISO 8601 日期
  until?: string; // ISO 8601 日期
}

/**
 * 构建 GitHub API 请求头
 */
function buildHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': '7zi-frontend/1.0',
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  return headers;
}

/**
 * 统一的 GitHub API 错误处理
 */
export function handleGitHubError(
  response: Response,
  owner: string,
  repo: string,
  endpoint?: string
): NextResponse {
  const endpointMsg = endpoint ? ` (${endpoint})` : '';
  
  if (response.status === 404) {
    return NextResponse.json(
      { error: `仓库 ${owner}/${repo}${endpointMsg} 不存在` },
      { status: 404 }
    );
  } else if (response.status === 401) {
    return NextResponse.json(
      { error: 'GitHub Token 无效或已过期' },
      { status: 401 }
    );
  } else if (response.status === 403) {
    return NextResponse.json(
      { error: 'GitHub API 速率限制，请稍后重试' },
      { status: 403 }
    );
  } else if (response.status === 422) {
    return NextResponse.json(
      { error: '请求参数无效' },
      { status: 422 }
    );
  }
  
  return NextResponse.json(
    { error: `GitHub API 请求失败${endpointMsg}: ${response.statusText}` },
    { status: response.status }
  );
}

/**
 * 通用 GitHub API 请求函数
 */
export async function fetchFromGitHub(
  endpoint: string,
  options: GitHubAPIOptions = {}
): Promise<NextResponse> {
  try {
    const {
      owner = process.env.NEXT_PUBLIC_GITHUB_OWNER || 'songzhuo',
      repo = process.env.NEXT_PUBLIC_GITHUB_REPO || 'openclaw-workspace',
      perPage = 30,
      state,
      token = process.env.GITHUB_TOKEN,
      since,
      until,
    } = options;

    const url = new URL(`${GITHUB_API_BASE}${endpoint}`);
    url.searchParams.set('owner', owner);
    url.searchParams.set('repo', repo);
    url.searchParams.set('per_page', String(perPage));
    if (state) url.searchParams.set('state', state);
    if (since) url.searchParams.set('since', since);
    if (until) url.searchParams.set('until', until);

    const response = await fetch(url.toString(), {
      headers: buildHeaders(token),
      next: { revalidate: 60 }, // 缓存 60 秒
    });

    if (!response.ok) {
      return handleGitHubError(response, owner, repo, endpoint);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error('GitHub API error (fetchFromGitHub)', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 获取仓库 Commits
 */
export async function fetchGitHubCommits(options: GitHubAPIOptions = {}): Promise<NextResponse> {
  return fetchFromGitHub(`/repos/${options.owner || process.env.NEXT_PUBLIC_GITHUB_OWNER}/${options.repo || process.env.NEXT_PUBLIC_GITHUB_REPO}/commits`, options);
}

/**
 * 获取仓库 Issues
 */
export async function fetchGitHubIssues(options: GitHubAPIOptions = {}): Promise<NextResponse> {
  const response = await fetchFromGitHub(
    `/repos/${options.owner || process.env.NEXT_PUBLIC_GITHUB_OWNER}/${options.repo || process.env.NEXT_PUBLIC_GITHUB_REPO}/issues`, 
    options
  );
  
  if (response.ok) {
    // 过滤掉 PR（GitHub API 中 PR 也作为 issue 返回）
    const data = await response.json();
    const issuesOnly = data.filter((item: { pull_request?: unknown }) => !item.pull_request);
    return NextResponse.json(issuesOnly);
  }
  
  return response;
}

/**
 * 获取单个 Issue 详情
 */
export async function fetchGitHubIssue(issueNumber: number, options: GitHubAPIOptions = {}): Promise<NextResponse> {
  const {
    owner = process.env.NEXT_PUBLIC_GITHUB_OWNER || 'songzhuo',
    repo = process.env.NEXT_PUBLIC_GITHUB_REPO || 'openclaw-workspace',
    token = process.env.GITHUB_TOKEN,
  } = options;

  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}`;
  
  try {
    const response = await fetch(url, {
      headers: buildHeaders(token),
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return handleGitHubError(response, owner, repo, `/issues/${issueNumber}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error('GitHub API error (fetchGitHubIssueDetail)', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
