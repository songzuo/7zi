'use client'

import { useState } from 'react'

interface Project {
  id: string
  name: string
  progress: number
  status: 'active' | 'completed' | 'paused'
  tasks: {
    total: number
    completed: number
  }
  team: string[]
  deadline: string
}

interface ActivityLog {
  id: string
  type: 'commit' | 'deploy' | 'issue' | 'meeting'
  message: string
  user: string
  time: string
  emoji: string
}

const mockProjects: Project[] = [
  {
    id: '1',
    name: '7zi.com 官网重构',
    progress: 75,
    status: 'active',
    tasks: { total: 20, completed: 15 },
    team: ['Executor', '设计师', '架构师'],
    deadline: '2024-03-15',
  },
  {
    id: '2',
    name: 'AI 聊天系统集成',
    progress: 90,
    status: 'active',
    tasks: { total: 10, completed: 9 },
    team: ['Executor', '智能体专家'],
    deadline: '2024-03-10',
  },
  {
    id: '3',
    name: '品牌视觉升级',
    progress: 100,
    status: 'completed',
    tasks: { total: 15, completed: 15 },
    team: ['设计师', '媒体'],
    deadline: '2024-03-01',
  },
  {
    id: '4',
    name: 'SEO 优化项目',
    progress: 45,
    status: 'active',
    tasks: { total: 25, completed: 11 },
    team: ['推广专员', '咨询师'],
    deadline: '2024-03-20',
  },
]

const mockActivities: ActivityLog[] = [
  {
    id: '1',
    type: 'commit',
    message: '添加 AI 聊天组件',
    user: 'Executor',
    time: '5 分钟前',
    emoji: '💻',
  },
  {
    id: '2',
    type: 'deploy',
    message: '部署到生产环境',
    user: '系统管理员',
    time: '15 分钟前',
    emoji: '🚀',
  },
  {
    id: '3',
    type: 'issue',
    message: '修复响应式布局问题',
    user: '设计师',
    time: '1 小时前',
    emoji: '🐛',
  },
  {
    id: '4',
    type: 'meeting',
    message: '完成项目评审会议',
    user: '智能体专家',
    time: '2 小时前',
    emoji: '📋',
  },
  {
    id: '5',
    type: 'commit',
    message: '优化图片加载性能',
    user: '系统管理员',
    time: '3 小时前',
    emoji: '⚡',
  },
  {
    id: '6',
    type: 'deploy',
    message: '更新依赖包版本',
    user: '架构师',
    time: '5 小时前',
    emoji: '📦',
  },
  {
    id: '7',
    type: 'issue',
    message: '解决 dark mode 兼容性问题',
    user: '测试员',
    time: '昨天',
    emoji: '✅',
  },
]

export function ProjectDashboard() {
  const [projects] = useState<Project[]>(mockProjects)
  const [activities] = useState<ActivityLog[]>(mockActivities)
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'activity'>('overview')

  const totalTasks = projects.reduce((acc, p) => acc + p.tasks.total, 0)
  const completedTasks = projects.reduce((acc, p) => acc + p.tasks.completed, 0)
  const overallProgress = Math.round((completedTasks / totalTasks) * 100)

  const getActivityColor = (type: ActivityLog['type']) => {
    switch (type) {
      case 'commit':
        return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400'
      case 'deploy':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
      case 'issue':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
      case 'meeting':
        return 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400'
    }
  }

  return (
    <section className="bg-zinc-50 px-6 py-16 dark:bg-zinc-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-zinc-900 md:text-4xl dark:text-white">
            📊 项目进度看板
          </h2>
          <p className="mx-auto max-w-2xl text-zinc-600 dark:text-zinc-400">
            实时追踪所有项目的进展和团队活动
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex justify-center gap-2">
          {[
            { id: 'overview', label: '总览', emoji: '📈' },
            { id: 'projects', label: '项目', emoji: '📁' },
            { id: 'activity', label: '动态', emoji: '🔔' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`rounded-full px-6 py-3 font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg'
                  : 'bg-white text-zinc-600 hover:shadow-md dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              <span className="mr-2">{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="animate-in fade-in space-y-8 duration-300">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-800">
                <div className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                  {projects.length}
                </div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">进行中项目</div>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-800">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {overallProgress}%
                </div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">总体进度</div>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-800">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {completedTasks}
                </div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">完成任务</div>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-800">
                <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">
                  {activities.length}
                </div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">今日活动</div>
              </div>
            </div>

            {/* Progress Overview */}
            <div className="rounded-2xl bg-white p-8 shadow-lg dark:bg-zinc-800">
              <h3 className="mb-6 text-xl font-bold text-zinc-900 dark:text-white">项目进度概览</h3>
              <div className="space-y-6">
                {projects.map(project => (
                  <div key={project.id}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {project.name}
                      </span>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {project.progress}%
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          project.status === 'completed'
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                            : 'bg-gradient-to-r from-cyan-500 to-purple-500'
                        }`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {project.team.slice(0, 3).map((member, i) => (
                          <div
                            key={i}
                            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-cyan-400 to-purple-500 text-[10px] text-white dark:border-zinc-800"
                            title={member}
                          >
                            {member[0]}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        截止：{project.deadline}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="animate-in fade-in grid grid-cols-1 gap-6 duration-300 md:grid-cols-2">
            {projects.map(project => (
              <div
                key={project.id}
                className="rounded-2xl bg-white p-6 shadow-lg transition-shadow hover:shadow-xl dark:bg-zinc-800"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                      {project.name}
                    </h3>
                    <span
                      className={`mt-2 inline-block rounded-full px-2 py-1 text-xs ${
                        project.status === 'active'
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                          : project.status === 'completed'
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}
                    >
                      {project.status === 'active'
                        ? '🟢 进行中'
                        : project.status === 'completed'
                          ? '🔵 已完成'
                          : '🟡 已暂停'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                      {project.progress}%
                    </div>
                  </div>
                </div>

                <div className="mb-4 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      project.status === 'completed'
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                        : 'bg-gradient-to-r from-cyan-500 to-purple-500'
                    }`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
                  <div>
                    <span>
                      任务：{project.tasks.completed}/{project.tasks.total}
                    </span>
                  </div>
                  <div className="flex -space-x-2">
                    {project.team.map((member, i) => (
                      <div
                        key={i}
                        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-cyan-400 to-purple-500 text-xs text-white dark:border-zinc-800"
                        title={member}
                      >
                        {member[0]}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="animate-in fade-in rounded-2xl bg-white p-6 shadow-lg duration-300 dark:bg-zinc-800">
            <h3 className="mb-6 text-xl font-bold text-zinc-900 dark:text-white">团队活动日志</h3>
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 rounded-xl p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${getActivityColor(activity.type)}`}
                  >
                    {activity.emoji}
                  </div>
                  <div className="flex-1">
                    <p className="text-zinc-800 dark:text-zinc-200">{activity.message}</p>
                    <div className="mt-1 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                      <span>{activity.user}</span>
                      <span>•</span>
                      <span>{activity.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
