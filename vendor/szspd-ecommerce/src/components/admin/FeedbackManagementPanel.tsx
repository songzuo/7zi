/**
 * Feedback management admin panel
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Feedback,
  FeedbackFilters,
  FeedbackListResponse,
  FeedbackStatus,
  FeedbackType,
  FeedbackPriority,
  UpdateFeedbackDto,
} from '@/types/feedback'

export const FeedbackManagementPanel: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [stats, setStats] = useState<FeedbackListResponse['stats'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [filters, setFilters] = useState<FeedbackFilters>({
    page: 1,
    per_page: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  })
  const [adminNotes, setAdminNotes] = useState('')

  // Fetch feedbacks
  const fetchFeedbacks = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })

      const response = await fetch(`/api/feedback?${params}`)
      const data = await response.json()

      if (data.success) {
        setFeedbacks(data.data.feedbacks)
        setStats(data.data.stats)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch feedbacks:', error)
      }
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchFeedbacks()
  }, [fetchFeedbacks])

  // Update feedback status
  const handleUpdateFeedback = async (
    feedbackId: string,
    updates: {
      status?: FeedbackStatus
      priority?: FeedbackPriority
      admin_notes?: string
    }
  ) => {
    try {
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      if (data.success) {
        // Refresh feedbacks
        await fetchFeedbacks()
        // Update selected feedback
        if (selectedFeedback?.id === feedbackId) {
          setSelectedFeedback(data.data)
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to update feedback:', error)
      }
      alert('更新失败')
    }
  }

  // Delete feedback
  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!confirm('确定要删除这条反馈吗？')) {
      return
    }

    try {
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        setFeedbacks(feedbacks.filter(f => f.id !== feedbackId))
        if (selectedFeedback?.id === feedbackId) {
          setSelectedFeedback(null)
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to delete feedback:', error)
      }
      alert('删除失败')
    }
  }

  // Handle filter change
  const handleFilterChange = (
    key: keyof FeedbackFilters,
    value: FeedbackFilters[keyof FeedbackFilters]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page on filter change
    }))
  }

  // Status colors
  const getStatusColor = (status: FeedbackStatus): string => {
    const colors: Record<FeedbackStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      reviewed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      resolved: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    }
    return colors[status]
  }

  // Priority colors
  const getPriorityColor = (priority: FeedbackPriority): string => {
    const colors: Record<FeedbackPriority, string> = {
      low: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300',
      medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    }
    return colors[priority]
  }

  if (isLoading && feedbacks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="总反馈数"
            value={stats.total}
            icon="📊"
            color="bg-blue-50 dark:bg-blue-900/20"
          />
          <StatCard
            title="平均评分"
            value={stats.average_rating.toFixed(1)}
            icon="⭐"
            color="bg-yellow-50 dark:bg-yellow-900/20"
          />
          <StatCard
            title="待处理"
            value={stats.by_status.pending || 0}
            icon="⏳"
            color="bg-orange-50 dark:bg-orange-900/20"
          />
          <StatCard
            title="已解决"
            value={stats.by_status.resolved || 0}
            icon="✅"
            color="bg-green-50 dark:bg-green-900/20"
          />
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              搜索
            </label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={e => handleFilterChange('search', e.target.value)}
              placeholder="标题或描述..."
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
            />
          </div>

          {/* Type Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              类型
            </label>
            <select
              value={filters.type || ''}
              onChange={e => handleFilterChange('type', e.target.value || undefined)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
            >
              <option value="">全部类型</option>
              {Object.values(FeedbackType).map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              状态
            </label>
            <select
              value={filters.status || ''}
              onChange={e => handleFilterChange('status', e.target.value || undefined)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
            >
              <option value="">全部状态</option>
              {Object.values(FeedbackStatus).map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              优先级
            </label>
            <select
              value={filters.priority || ''}
              onChange={e => handleFilterChange('priority', e.target.value || undefined)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
            >
              <option value="">全部优先级</option>
              {Object.values(FeedbackPriority).map(priority => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  反馈
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  评分
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  优先级
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {feedbacks.map(feedback => (
                <tr
                  key={feedback.id}
                  className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                  onClick={() => setSelectedFeedback(feedback)}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">
                        {feedback.title}
                      </p>
                      <p className="max-w-xs truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {feedback.description}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-zinc-700 dark:text-zinc-300">
                      {feedback.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className="text-yellow-400">⭐</span>
                      <span className="ml-1 text-sm font-medium text-zinc-900 dark:text-white">
                        {feedback.rating}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs leading-5 font-semibold ${getStatusColor(feedback.status)}`}
                    >
                      {feedback.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs leading-5 font-semibold ${getPriorityColor(feedback.priority)}`}
                    >
                      {feedback.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(feedback.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 text-right text-xs font-medium">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        handleDeleteFeedback(feedback.id)
                      }}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Feedback Detail Modal */}
      {selectedFeedback && (
        <FeedbackDetailModal
          feedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
          onUpdate={handleUpdateFeedback}
          onDelete={handleDeleteFeedback}
        />
      )}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  icon: string
  color: string
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <div className={`${color} rounded-lg border border-zinc-200 p-4 dark:border-zinc-700`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{title}</p>
        <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
      </div>
      <span className="text-3xl">{icon}</span>
    </div>
  </div>
)

interface FeedbackDetailModalProps {
  feedback: Feedback
  onClose: () => void
  onUpdate: (id: string, updates: UpdateFeedbackDto) => void
  onDelete: (id: string) => void
}

const FeedbackDetailModal: React.FC<FeedbackDetailModalProps> = ({
  feedback,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [adminNotes, setAdminNotes] = useState(feedback.admin_notes || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveAdminNotes = async () => {
    setIsSaving(true)
    try {
      await onUpdate(feedback.id, { admin_notes: adminNotes })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-3xl transform rounded-xl bg-white shadow-2xl dark:bg-zinc-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">反馈详情</h3>
            <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-500">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-4">
            {/* User Info */}
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 font-bold text-white">
                {feedback.user_id.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">
                  用户ID: {feedback.user_id}
                </p>
                {feedback.email && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{feedback.email}</p>
                )}
              </div>
            </div>

            {/* Feedback Content */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">标题</label>
                <p className="mt-1 text-zinc-900 dark:text-white">{feedback.title}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">描述</label>
                <p className="mt-1 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                  {feedback.description}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">评分</label>
                <div className="mt-1 flex items-center gap-1">{'⭐'.repeat(feedback.rating)}</div>
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">类型</label>
                <p className="mt-1 text-zinc-900 dark:text-white">{feedback.type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">状态</label>
                <select
                  value={feedback.status}
                  onChange={e =>
                    onUpdate(feedback.id, { status: e.target.value as FeedbackStatus })
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                >
                  {Object.values(FeedbackStatus).map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  优先级
                </label>
                <select
                  value={feedback.priority}
                  onChange={e =>
                    onUpdate(feedback.id, { priority: e.target.value as FeedbackPriority })
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                >
                  {Object.values(FeedbackPriority).map(priority => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  提交时间
                </label>
                <p className="mt-1 text-zinc-900 dark:text-white">
                  {new Date(feedback.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>

            {/* Admin Notes */}
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                管理员备注
              </label>
              <textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                placeholder="添加管理员备注..."
              />
              <button
                onClick={handleSaveAdminNotes}
                disabled={isSaving}
                className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '保存备注'}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-700">
            <button
              onClick={() => onDelete(feedback.id)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              删除
            </button>
            <button
              onClick={onClose}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FeedbackManagementPanel
