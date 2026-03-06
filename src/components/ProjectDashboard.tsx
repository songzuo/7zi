'use client';

import { useState, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
  progress: number;
  status: 'active' | 'completed' | 'paused';
  tasks: {
    total: number;
    completed: number;
  };
  team: string[];
  deadline: string;
}

interface ActivityLog {
  id: string;
  type: 'commit' | 'deploy' | 'issue' | 'meeting';
  message: string;
  user: string;
  time: string;
  emoji: string;
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
];

const mockActivities: ActivityLog[] = [
  { id: '1', type: 'commit', message: '添加 AI 聊天组件', user: 'Executor', time: '5 分钟前', emoji: '💻' },
  { id: '2', type: 'deploy', message: '部署到生产环境', user: '系统管理员', time: '15 分钟前', emoji: '🚀' },
  { id: '3', type: 'issue', message: '修复响应式布局问题', user: '设计师', time: '1 小时前', emoji: '🐛' },
  { id: '4', type: 'meeting', message: '完成项目评审会议', user: '智能体专家', time: '2 小时前', emoji: '📋' },
  { id: '5', type: 'commit', message: '优化图片加载性能', user: '系统管理员', time: '3 小时前', emoji: '⚡' },
  { id: '6', type: 'deploy', message: '更新依赖包版本', user: '架构师', time: '5 小时前', emoji: '📦' },
  { id: '7', type: 'issue', message: '解决 dark mode 兼容性问题', user: '测试员', time: '昨天', emoji: '✅' },
];

export function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [activities, setActivities] = useState<ActivityLog[]>(mockActivities);
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'activity'>('overview');

  const totalTasks = projects.reduce((acc, p) => acc + p.tasks.total, 0);
  const completedTasks = projects.reduce((acc, p) => acc + p.tasks.completed, 0);
  const overallProgress = Math.round((completedTasks / totalTasks) * 100);

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'completed':
        return 'bg-blue-500';
      case 'paused':
        return 'bg-yellow-500';
    }
  };

  const getActivityColor = (type: ActivityLog['type']) => {
    switch (type) {
      case 'commit':
        return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400';
      case 'deploy':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
      case 'issue':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
      case 'meeting':
        return 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400';
    }
  };

  return (
    <section className="py-16 px-6 bg-zinc-50 dark:bg-zinc-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            📊 项目进度看板
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            实时追踪所有项目的进展和团队活动
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 justify-center">
          {[
            { id: 'overview', label: '总览', emoji: '📈' },
            { id: 'projects', label: '项目', emoji: '📁' },
            { id: 'activity', label: '动态', emoji: '🔔' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-6 py-3 rounded-full font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg'
                  : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:shadow-md'
              }`}
            >
              <span className="mr-2">{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-lg">
                <div className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">{projects.length}</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">进行中项目</div>
              </div>
              <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-lg">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{overallProgress}%</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">总体进度</div>
              </div>
              <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-lg">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{completedTasks}</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">完成任务</div>
              </div>
              <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-lg">
                <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">{activities.length}</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">今日活动</div>
              </div>
            </div>

            {/* Progress Overview */}
            <div className="bg-white dark:bg-zinc-800 rounded-2xl p-8 shadow-lg">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">项目进度概览</h3>
              <div className="space-y-6">
                {projects.map((project) => (
                  <div key={project.id}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{project.name}</span>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">{project.progress}%</span>
                    </div>
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          project.status === 'completed'
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                            : 'bg-gradient-to-r from-cyan-500 to-purple-500'
                        }`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex -space-x-2">
                        {project.team.slice(0, 3).map((member, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-[10px] text-white border-2 border-white dark:border-zinc-800"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-white">{project.name}</h3>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs mt-2 ${
                        project.status === 'active'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : project.status === 'completed'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                      }`}
                    >
                      {project.status === 'active' ? '🟢 进行中' : project.status === 'completed' ? '🔵 已完成' : '🟡 已暂停'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{project.progress}%</div>
                  </div>
                </div>
                
                <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden mb-4">
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
                    <span>任务：{project.tasks.completed}/{project.tasks.total}</span>
                  </div>
                  <div className="flex -space-x-2">
                    {project.team.map((member, i) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-xs text-white border-2 border-white dark:border-zinc-800"
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
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-lg animate-in fade-in duration-300">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">团队活动日志</h3>
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${getActivityColor(activity.type)}`}>
                    {activity.emoji}
                  </div>
                  <div className="flex-1">
                    <p className="text-zinc-800 dark:text-zinc-200">{activity.message}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
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
  );
}
