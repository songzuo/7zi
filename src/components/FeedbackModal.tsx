/**
 * @fileoverview Feedback form component
 * @description Modal form for collecting user feedback with star rating
 */

'use client'

import React, { useState } from 'react'
import { StarRating } from './StarRating'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (feedback: FeedbackData) => Promise<void> | void
  isLoading?: boolean
  feedbackType?: 'general' | 'bug' | 'feature' | 'other'
}

export interface FeedbackData {
  type: 'general' | 'bug' | 'feature' | 'other'
  rating: number
  title: string
  description: string
  email?: string
  attachments?: File[]
}

interface FeedbackTypeOption {
  value: 'general' | 'bug' | 'feature' | 'other'
  label: string
  icon: string
}

const FEEDBACK_TYPES: FeedbackTypeOption[] = [
  { value: 'general', label: '一般反馈', icon: '💬' },
  { value: 'bug', label: '问题报告', icon: '🐛' },
  { value: 'feature', label: '功能建议', icon: '💡' },
  { value: 'other', label: '其他', icon: '📝' },
]

export function FeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  feedbackType = 'general',
}: FeedbackModalProps) {
  const [type, setType] = useState(feedbackType)
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setType(feedbackType)
      setRating(5)
      setTitle('')
      setDescription('')
      setEmail('')
    }
  }, [isOpen, feedbackType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !description.trim()) {
      return
    }

    const feedback: FeedbackData = {
      type,
      rating,
      title: title.trim(),
      description: description.trim(),
      email: email.trim() || undefined,
    }

    await onSubmit(feedback)
    onClose()
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="bg-opacity-50 fixed inset-0 bg-black transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg transform rounded-lg bg-white shadow-xl transition-all dark:bg-zinc-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
            <h3 id="modal-title" className="text-lg font-semibold text-zinc-900 dark:text-white">
              提交反馈
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-zinc-400 hover:text-zinc-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              aria-label="关闭"
            >
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
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
            {/* Feedback Type */}
            <div>
              <label
                htmlFor="feedback-type"
                className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                反馈类型
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FEEDBACK_TYPES.map(ft => (
                  <button
                    key={ft.value}
                    type="button"
                    onClick={() => setType(ft.value)}
                    className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all ${
                      type === ft.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                    } `}
                  >
                    <span className="text-2xl">{ft.icon}</span>
                    <span className="text-xs text-zinc-700 dark:text-zinc-300">{ft.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                您的评分
              </label>
              <StarRating rating={rating} onRatingChange={setRating} size="lg" showLabels />
            </div>

            {/* Title */}
            <div>
              <label
                htmlFor="feedback-title"
                className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="feedback-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="简要描述您的反馈..."
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                required
                maxLength={100}
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{title.length}/100</p>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="feedback-description"
                className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                详细描述 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="feedback-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="请详细描述您的问题或建议..."
                rows={5}
                className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                required
                maxLength={1000}
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {description.length}/1000
              </p>
            </div>

            {/* Email (Optional) */}
            <div>
              <label
                htmlFor="feedback-email"
                className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                邮箱（可选）
              </label>
              <input
                type="email"
                id="feedback-email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="如果您希望收到回复，请留下邮箱"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />
            </div>
          </form>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              取消
            </button>
            <button
              type="submit"
              form="feedback-form"
              onClick={handleSubmit}
              disabled={isLoading || !title.trim() || !description.trim()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  提交中...
                </>
              ) : (
                '提交反馈'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FeedbackModal
