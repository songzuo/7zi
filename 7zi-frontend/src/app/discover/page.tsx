'use client'

import { MobileLayout } from '@/components/navigation'

export default function DiscoverPage() {
  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-8 dark:from-gray-900 dark:to-gray-800">
        <div className="mx-auto max-w-md">
          <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
            发现
          </h1>

          <div className="space-y-4">
            {/* 示例卡片 */}
            <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                推荐内容
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                这里是发现页面的示例内容
              </p>
            </div>

            <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                热门功能
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                探索更多精彩功能
              </p>
            </div>

            <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                最新动态
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                了解最新更新和改进
              </p>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  )
}