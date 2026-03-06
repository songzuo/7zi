import { NextRequest, NextResponse } from 'next/server';

/**
 * GitHub API 代理 - Issues
 * 
 * 安全目的：隐藏 GITHUB_TOKEN，避免在客户端暴露
 * 服务端代理 GitHub API 请求
 */

const GITHUB_API_BASE = 'https://api.github.com';

export async function GET(request: NextRequest) {
  try {
    // 从服务端环境变量获取 Token（非 NEXT_PUBLIC_ 前缀）
    const githubToken = process.env.GITHUB_TOKEN;
    
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner') || process.env.NEXT_PUBLIC_GITHUB_OWNER || 'songzhuo';
    const repo = searchParams.get('repo') || process.env.NEXT_PUBLIC_GITHUB_REPO || 'openclaw-workspace';
    const state = searchParams.get('state') || 'all';
    const perPage = searchParams.get('per_page') || '50';

    // 构建请求头
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': '7zi-frontend/1.0',
    };

    // 如果有 Token，添加认证头
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    // 发起 GitHub API 请求
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?state=${state}&per_page=${perPage}`,
      { headers }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: `仓库 ${owner}/${repo} 不存在` },
          { status: 404 }
        );
      } else if (response.status === 401) {
        return NextResponse.json(
          { error: 'GitHub Token 无效' },
          { status: 401 }
        );
      } else if (response.status === 403) {
        return NextResponse.json(
          { error: 'GitHub API 速率限制，请稍后重试' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: `获取 Issues 失败：${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // 过滤掉 PR（GitHub API 中 PR 也作为 issue 返回）
    const issuesOnly = data.filter((item: { pull_request?: unknown }) => !item.pull_request);

    return NextResponse.json(issuesOnly);
  } catch (error) {
    console.error('GitHub API proxy error:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}