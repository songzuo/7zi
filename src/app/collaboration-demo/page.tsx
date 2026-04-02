'use client'

import dynamic from 'next/dynamic'
import { LoadingSpinner } from '@/components/LoadingSpinner'

// Lazy load the entire collaboration demo page to reduce initial bundle by ~1.3MB
const CollaborationDemoContent = dynamic(() => import('./CollaborationDemoContent'), {
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 dark:bg-zinc-900">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">加载协作演示...</p>
      </div>
    </div>
  ),
  ssr: false,
})

export default function CollaborationDemoPage() {
  return <CollaborationDemoContent />
}
