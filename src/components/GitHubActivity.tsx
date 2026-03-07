'use client';

import { useGitHubData, getMockCommits, getMockStats } from '@/hooks';
import { formatTimeAgo } from '@/lib/date';
import { StatCard, Card, EmptyState } from '@/components/shared';

/**
 * GitHub 活动组件
 * @description 显示 GitHub 仓库的实时动态和统计
 */
export function GitHubActivity() {
  const { commits, stats, isLoading } = useGitHubData({
    owner: 'songzuo',
    repo: '7zi',
    refreshInterval: 5 * 60 * 1000,
  });

  // 使用真实数据或 Mock 数据
  const displayCommits = commits.length > 0 ? commits : getMockCommits();
  const displayStats = stats || getMockStats();

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
          <StatCard
            value={displayStats.stars}
            label="⭐ Stars"
            color="orange"
          />
          <StatCard
            value={displayStats.forks}
            label="🍴 Forks"
            color="cyan"
          />
          <StatCard
            value={displayStats.openIssues}
            label="📋 Issues"
            color="purple"
          />
        </div>

        {/* Recent Commits */}
        <Card padding="lg" className="bg-zinc-50 dark:bg-zinc-800">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            最近提交
          </h3>

          {isLoading ? (
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
          ) : displayCommits.length === 0 ? (
            <EmptyState
              icon="📭"
              title="暂无提交记录"
              description="GitHub 活动将显示在这里"
            />
          ) : (
            <div className="space-y-4">
              {displayCommits.slice(0, 5).map((commit, index) => (
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
        </Card>

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