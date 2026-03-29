/**
 * 更新日志页面
 */

import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: '更新日志 - 7zi Studio',
  description: '设计系统的版本历史和变更记录。',
};

export default function ChangelogPage() {
  const versions = [
    {
      version: '1.3.0',
      date: '2024-03-29',
      changes: [
        { type: 'feat', description: '添加 OptimizedImage 组件，支持 WebP/AVIF 自动转换' },
        { type: 'feat', description: '添加 EnhancedPerformanceDashboard 性能监控面板' },
        { type: 'feat', description: '添加国际化支持（中英文）' },
        { type: 'fix', description: '修复暗色模式下部分组件样式问题' },
        { type: 'perf', description: '优化图片加载性能，减少 LCP 时间' },
      ],
    },
    {
      version: '1.2.0',
      date: '2024-03-15',
      changes: [
        { type: 'feat', description: '添加设计系统文档站点' },
        { type: 'feat', description: '添加 Button、Input、Card 基础组件' },
        { type: 'feat', description: '添加响应式设计断点系统' },
        { type: 'style', description: '统一颜色系统，引入 Tailwind CSS' },
      ],
    },
    {
      version: '1.1.0',
      date: '2024-03-01',
      changes: [
        { type: 'feat', description: '添加深色模式支持' },
        { type: 'feat', description: '添加无障碍（a11y）支持' },
        { type: 'fix', description: '修复移动端布局问题' },
      ],
    },
    {
      version: '1.0.0',
      date: '2024-02-15',
      changes: [
        { type: 'feat', description: '首次发布 7zi-frontend' },
        { type: 'feat', description: '基础 UI 组件库' },
        { type: 'feat', description: '集成 Next.js 16 和 React 18' },
      ],
    },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'feat':
        return 'bg-green-100 text-green-800';
      case 'fix':
        return 'bg-red-100 text-red-800';
      case 'perf':
        return 'bg-blue-100 text-blue-800';
      case 'style':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'feat':
        return '✨ 新功能';
      case 'fix':
        return '🐛 修复';
      case 'perf':
        return '⚡ 性能';
      case 'style':
        return '💄 样式';
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">📜 更新日志</h1>
        
        <div className="space-y-6">
          {versions.map((release) => (
            <section key={release.version} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">版本 {release.version}</h2>
                  <p className="text-gray-500 text-sm">{release.date}</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  稳定版
                </span>
              </div>

              <div className="space-y-2">
                {release.changes.map((change, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(change.type)}`}>
                      {getTypeLabel(change.type)}
                    </span>
                    <span className="text-gray-700">{change.description}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* 导航 */}
        <div className="flex justify-between mt-8">
          <Link href="/design-system/guidelines" className="text-blue-600 hover:underline">
            ← 最佳实践
          </Link>
          <div className="text-gray-400">
            ← 回到顶部
          </div>
        </div>
      </div>
    </div>
  );
}
