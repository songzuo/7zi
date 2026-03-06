'use client';

import { useState, useEffect } from 'react';

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
  author: {
    avatar_url?: string;
    login?: string;
  } | null;
}

interface GitHubStats {
  stars: number;
  forks: number;
  openIssues: number;
}

export function GitHubActivity() {
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [stats, setStats] = useState<GitHubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGitHubData = async () => {
      try {
        // Fetch recent commits
        const commitsRes = await fetch(
          'https://api.github.com/repos/7zi-studio/7zi-frontend/commits?per_page=5'
        );
        
        if (commitsRes.ok) {
          const commitsData = await commitsRes.json();
          setCommits(commitsData);
        } else {
          // Fallback mock data
          setCommits(getMockCommits());
        }

        // Fetch repo stats
        const statsRes = await fetch('https://api.github.com/repos/7zi-studio/7zi-frontend');
        
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats({
            stars: statsData.stargazers_count,
            forks: statsData.forks_count,
            openIssues: statsData.open_issues_count,
          });
        } else {
          setStats(getMockStats());
        }

        setLoading(false);
      } catch (err) {
        setError('加载 GitHub 数据失败');
        setCommits(getMockCommits());
        setStats(getMockStats());
        setLoading(false);
      }
    };

    fetchGitHubData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchGitHubData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getMockCommits = (): GitHubCommit[] => [
    {
      sha: 'abc123',
      commit: {
        message: 'feat: 添加 AI 聊天组件和团队状态展示',
        author: { name: 'Executor', date: new Date().toISOString() },
      },
      html_url: '#',
      author: { avatar_url: undefined, login: 'executor' },
    },
    {
      sha: 'def456',
      commit: {
        message: 'feat: 实现暗色/亮色模式切换',
        author: { name: '设计师', date: new Date(Date.now() - 3600000).toISOString() },
      },
      html_url: '#',
      author: { avatar_url: undefined, login: 'designer' },
    },
    {
      sha: 'ghi789',
      commit: {
        message: 'fix: 优化响应式布局和动画效果',
        author: { name: '架构师', date: new Date(Date.now() - 7200000).toISOString() },
      },
      html_url: '#',
      author: { avatar_url: undefined, login: 'architect' },
    },
    {
      sha: 'jkl012',
      commit: {
        message: 'docs: 更新 README 和文档',
        author: { name: '媒体', date: new Date(Date.now() - 86400000).toISOString() },
      },
      html_url: '#',
      author: { avatar_url: undefined, login: 'media' },
    },
    {
      sha: 'mno345',
      commit: {
        message: 'perf: 图片懒加载和缓存优化',
        author: { name: '系统管理员', date: new Date(Date.now() - 172800000).toISOString() },
      },
      html_url: '#',
      author: { avatar_url: undefined, login: 'sysadmin' },
    },
  ];

  const getMockStats = (): GitHubStats => ({
    stars: 128,
    forks: 24,
    openIssues: 5,
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    return `${diffDays}天前`;
  };

  return (
    <section className="py-16 px-6 bg-white dark:bg-zinc-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            🚀 GitHub 实时动态
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            追踪我们的开发进度和代码提交
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 md:gap-8 mb-12">
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="text-3xl md:text-4xl font-bold">{stats?.stars || 0}</div>
            <div className="text-sm md:text-base opacity-90">⭐ Stars</div>
          </div>
          <div className="bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="text-3xl md:text-4xl font-bold">{stats?.forks || 0}</div>
            <div className="text-sm md:text-base opacity-90">🍴 Forks</div>
          </div>
          <div className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="text-3xl md:text-4xl font-bold">{stats?.openIssues || 0}</div>
            <div className="text-sm md:text-base opacity-90">📋 Issues</div>
          </div>
        </div>

        {/* Recent Commits */}
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            最近提交
          </h3>
          
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4" />
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {commits.slice(0, 5).map((commit, index) => (
                <a
                  key={commit.sha}
                  href={commit.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-zinc-900 hover:shadow-md transition-all duration-300 hover:-translate-x-1"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {commit.author?.login?.[0]?.toUpperCase() || commit.commit.author.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded text-xs font-mono">
                        {commit.sha.slice(0, 7)}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatTimeAgo(commit.commit.author.date)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-800 dark:text-zinc-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-2">
                      {commit.commit.message}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      by {commit.commit.author.name}
                    </p>
                  </div>
                  <span className="text-zinc-400 group-hover:text-cyan-500 transition-colors">
                    ↗
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Activity Log */}
        <div className="mt-8 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 dark:from-cyan-500/20 dark:to-purple-500/20 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
            📊 今日活动统计
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-cyan-600 dark:text-cyan-400">15</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">代码提交</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400">8</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">问题解决</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-pink-600 dark:text-pink-400">3</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">功能上线</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">100%</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">团队效率</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
