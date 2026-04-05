/**
 * Feedback Page - User feedback submission
 *
 * Provides a feedback submission form with enhanced features
 */

'use client'

import { useState, lazy, Suspense } from 'react'
import { Button } from '@/components/ui/Button'
import { MessageSquare, Lightbulb } from 'lucide-react'
import type { FeedbackData } from '@/components/feedback/FeedbackModal'

// 动态导入 Feedback 组件以减少初始 bundle 大小 (~100KB 节省)
const FeedbackModal = lazy(() => import('@/components/feedback/FeedbackModal'))
const EnhancedFeedbackModal = lazy(() => import('@/components/feedback/EnhancedFeedbackModal'))

// Note: metadata cannot be exported from 'use client' components
// Use layout.tsx or a separate metadata file for SEO metadata

export default function FeedbackPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [useEnhanced, setUseEnhanced] = useState(true)
  const [submittedFeedback, setSubmittedFeedback] = useState<FeedbackData | null>(null)

  // Simulate similar feedback check
  const checkSimilarFeedbacks = async (title: string) => {
    // This would call an API in production
    return []
  }

  const handleSubmit = async (feedback: FeedbackData) => {
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedback),
      })

      const data = await response.json()

      if (data.success) {
        setSubmittedFeedback(feedback)
        setIsModalOpen(false)
        alert('感谢您的反馈！我们会尽快处理。')
      } else {
        alert('提交失败：' + (data.message || '请稍后重试'))
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      alert('提交失败，请稍后重试')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-500">
            <MessageSquare className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-4 text-4xl font-bold text-gray-900">欢迎反馈</h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            您的意见对我们非常重要。无论是问题报告、功能建议还是其他反馈，
            我们都欢迎您的声音，并会认真对待每一条反馈。
          </p>
        </div>

        {/* Success Message */}
        {submittedFeedback && (
          <div className="mb-8 rounded-lg border border-green-200 bg-green-50 p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-lg font-medium text-green-900">反馈已提交成功！</h3>
                <p className="mb-3 text-sm text-green-700">
                  感谢您的反馈！我们会尽快处理并给您回复。
                </p>
                <Button variant="outline" size="sm" onClick={() => setSubmittedFeedback(null)}>
                  提交新反馈
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Type Cards */}
        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => {
              setUseEnhanced(true)
              setIsModalOpen(true)
            }}
            className="group rounded-xl border-2 border-transparent bg-white p-6 text-left shadow-sm transition-all hover:border-blue-500 hover:shadow-md"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-4xl">🐛</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 transition-colors group-hover:bg-blue-500">
                <MessageSquare className="h-5 w-5 text-blue-600 transition-colors group-hover:text-white" />
              </div>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">问题报告</h3>
            <p className="text-sm text-gray-600">
              报告您遇到的问题、错误或异常行为，帮助我们改进产品质量。
            </p>
          </button>

          <button
            onClick={() => {
              setUseEnhanced(true)
              setIsModalOpen(true)
            }}
            className="group rounded-xl border-2 border-transparent bg-white p-6 text-left shadow-sm transition-all hover:border-blue-500 hover:shadow-md"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-4xl">💡</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 transition-colors group-hover:bg-blue-500">
                <Lightbulb className="h-5 w-5 text-blue-600 transition-colors group-hover:text-white" />
              </div>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">功能建议</h3>
            <p className="text-sm text-gray-600">
              提出新的功能想法或改进建议，帮助我们打造更好的产品。
            </p>
          </button>

          <button
            onClick={() => {
              setUseEnhanced(true)
              setIsModalOpen(true)
            }}
            className="group rounded-xl border-2 border-transparent bg-white p-6 text-left shadow-sm transition-all hover:border-blue-500 hover:shadow-md"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-4xl">✨</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 transition-colors group-hover:bg-blue-500">
                <svg
                  className="h-5 w-5 text-blue-600 transition-colors group-hover:text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">改进建议</h3>
            <p className="text-sm text-gray-600">提供改进意见，帮助我们优化现有功能和用户体验。</p>
          </button>

          <button
            onClick={() => {
              setUseEnhanced(true)
              setIsModalOpen(true)
            }}
            className="group rounded-xl border-2 border-transparent bg-white p-6 text-left shadow-sm transition-all hover:border-blue-500 hover:shadow-md"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-4xl">👍</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 transition-colors group-hover:bg-green-500">
                <svg
                  className="h-5 w-5 text-green-600 transition-colors group-hover:text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                  />
                </svg>
              </div>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">表扬与感谢</h3>
            <p className="text-sm text-gray-600">分享您的正面体验和感谢，激励我们持续做得更好。</p>
          </button>

          <button
            onClick={() => {
              setUseEnhanced(true)
              setIsModalOpen(true)
            }}
            className="group rounded-xl border-2 border-transparent bg-white p-6 text-left shadow-sm transition-all hover:border-blue-500 hover:shadow-md"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-4xl">⚠️</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 transition-colors group-hover:bg-orange-500">
                <svg
                  className="h-5 w-5 text-orange-600 transition-colors group-hover:text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">投诉</h3>
            <p className="text-sm text-gray-600">
              如果您有任何不满或投诉，请告诉我们，我们会认真处理。
            </p>
          </button>

          <button
            onClick={() => {
              setUseEnhanced(false)
              setIsModalOpen(true)
            }}
            className="group rounded-xl border-2 border-transparent bg-white p-6 text-left shadow-sm transition-all hover:border-blue-500 hover:shadow-md"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-4xl">📝</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-colors group-hover:bg-gray-500">
                <svg
                  className="h-5 w-5 text-gray-600 transition-colors group-hover:text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">其他反馈</h3>
            <p className="text-sm text-gray-600">任何其他类型的反馈或建议，我们欢迎您的声音。</p>
          </button>
        </div>

        {/* Tips */}
        <div className="rounded-xl bg-white p-8 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">反馈小贴士</h2>
          <ul className="space-y-3">
            <li className="flex items-start space-x-3">
              <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                <span className="text-sm font-semibold text-blue-600">1</span>
              </div>
              <p className="text-gray-700">
                尽量详细地描述问题或建议，包括复现步骤（如果适用）、期望结果和实际结果。
              </p>
            </li>
            <li className="flex items-start space-x-3">
              <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                <span className="text-sm font-semibold text-blue-600">2</span>
              </div>
              <p className="text-gray-700">
                如果遇到问题，请提供相关的截图或录屏，帮助我们更好地理解问题。
              </p>
            </li>
            <li className="flex items-start space-x-3">
              <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                <span className="text-sm font-semibold text-blue-600">3</span>
              </div>
              <p className="text-gray-700">
                选择合适的反馈类型和优先级，帮助我们更好地分类和处理您的反馈。
              </p>
            </li>
            <li className="flex items-start space-x-3">
              <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                <span className="text-sm font-semibold text-blue-600">4</span>
              </div>
              <p className="text-gray-700">
                提供相关页面的 URL（如果适用），帮助我们快速定位问题。
              </p>
            </li>
          </ul>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>}>
          {useEnhanced ? (
            <EnhancedFeedbackModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onSubmit={handleSubmit}
              onCheckSimilar={checkSimilarFeedbacks}
            />
          ) : (
            <FeedbackModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onSubmit={handleSubmit}
            />
          )}
        </Suspense>
      )}
    </div>
  )
}
