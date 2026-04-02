/**
 * Admin Feedback Page - Feedback management dashboard
 *
 * Provides an interface for admins to view and manage user feedbacks
 */

'use client'

import { useEffect, useState } from 'react'
import FeedbackAdminPanel from '@/components/feedback/FeedbackAdminPanel'
import { createMockUser, UserRole } from '@/lib/auth'

export default function AdminFeedbackPage() {
  const user = createMockUser({ role: UserRole.ADMIN })
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    if (user) {
      setCurrentUser({
        id: user.id || 'unknown',
        name: user.username || 'Admin',
        email: user.email || 'admin@example.com',
        role: user.role,
      })
    }
  }, [user])

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="mx-auto max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">需要管理员权限</h1>
          <p className="mb-6 text-gray-600">
            您需要管理员权限才能访问此页面。如果您是管理员，请先登录。
          </p>
          <button
            onClick={() => (window.location.href = '/')}
            className="rounded-lg bg-blue-500 px-6 py-2 text-white transition-colors hover:bg-blue-600"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return <FeedbackAdminPanel currentUser={currentUser} />
}
