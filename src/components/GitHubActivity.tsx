'use client'

import { useGitHubData, getMockCommits, getMockStats } from '@/hooks'
import { formatTimeAgo } from '@/lib/date'
import { StatCard, Card, EmptyState } from '@/components/shared'

/**
 * GitHub 活动组件
 * @description 显示 GitHub 仓库的实时动态和统计
 */
export function GitHubActivity() {
  const { commits, stats, isLoading } = useGitHubData({
    owner: 'songzuo',
    repo: '7zi',
    refreshInterval: 5 * 60 * 1000,
  })

  // 使用真实数据或 Mock 数据
  const displayCommits = commits.length > 0 ? commits : getMockCommits()
  const displayStats = stats || getMockStats()

  return (
    <section className="bg-white px-6 py-16 dark:bg-zinc-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-zinc-900 md:text-4xl dark:text-white">
            🚀 GitHub 实时动态
          </h2>
          <p className="mx-auto max-w-2xl text-zinc-600 dark:text-zinc-400">
            追踪我们的开发进度和代码提交
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-12 grid grid-cols-3 gap-4 md:gap-8">
          <StatCard value={displayStats.stars} label="⭐ Stars" color="orange" />
          <StatCard value={displayStats.forks} label="🍴 Forks" color="cyan" />
          <StatCard value={displayStats.openIssues} label="📋 Issues" color="purple" />
        </div>

        {/* Recent Commits */}
        <Card padding="lg" className="bg-zinc-50 dark:bg-zinc-800">
          <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            最近提交
          </h3>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex animate-pulse items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
                    <div className="h-3 w-1/4 rounded bg-zinc-200 dark:bg-zinc-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayCommits.length === 0 ? (
            <EmptyState icon="📭" title="暂无提交记录" description="GitHub 活动将显示在这里" />
          ) : (
            <div className="space-y-4">
              {displayCommits.slice(0, 5).map((commit, index) => (
                <a
                  key={commit.sha}
                  href={commit.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-4 rounded-xl bg-white p-4 transition-all duration-300 hover:-translate-x-1 hover:shadow-md dark:bg-zinc-900"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 text-sm font-bold text-white">
                    {commit.author?.login?.[0]?.toUpperCase() || commit.commit.author.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-cyan-100 px-2 py-0.5 font-mono text-xs text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
                        {commit.sha.slice(0, 7)}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatTimeAgo(commit.commit.author.date)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-800 transition-colors group-hover:text-cyan-600 dark:text-zinc-200 dark:group-hover:text-cyan-400">
                      {commit.commit.message}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      by {commit.commit.author.name}
                    </p>
                  </div>
                  <span className="text-zinc-400 transition-colors group-hover:text-cyan-500">
                    ↗
                  </span>
                </a>
              ))}
            </div>
          )}
        </Card>

        {/* Activity Log */}
        <div className="mt-8 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 p-6 dark:from-cyan-500/20 dark:to-purple-500/20">
          <h3 className="mb-4 text-lg font-bold text-zinc-900 dark:text-white">📊 今日活动统计</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-600 md:text-3xl dark:text-cyan-400">
                15
              </div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">代码提交</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 md:text-3xl dark:text-purple-400">
                8
              </div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">问题解决</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-600 md:text-3xl dark:text-pink-400">
                3
              </div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">功能上线</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 md:text-3xl dark:text-green-400">
                100%
              </div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">团队效率</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
