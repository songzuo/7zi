/**
 * Editor Components - Lazy Loading Exports
 *
 * Use these exports instead of direct imports to enable code splitting:
 *
 * Instead of:
 *   import { RichTextEditor } from '@/components/editor'
 *
 * Use:
 *   import { LazyRichTextEditor } from '@/components/editor/lazy'
 *
 * Or with dynamic():
 *   const RichTextEditor = dynamic(() => import('@/components/editor').then(m => m.RichTextEditor))
 */

import dynamic from 'next/dynamic'
import { ComponentProps, Suspense } from 'react'
import { cn } from '@/lib/utils'

// ============================================
// Loading Skeletons
// ============================================

function EditorSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800', className)}>
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border-b border-gray-200 bg-gray-100 p-2 dark:border-gray-700 dark:bg-gray-700">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-6 w-6 rounded bg-gray-300 dark:bg-gray-600" />
        ))}
      </div>
      <div className="min-h-[150px] p-4">
        <div className="mb-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="mb-2 h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  )
}

function SimpleEditorSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800', className)}>
      <div className="min-h-[100px]">
        <div className="mb-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  )
}

// ============================================
// Lazy RichTextEditor
// ============================================

export const LazyRichTextEditor = dynamic(
  () => import('./RichTextEditor').then(mod => mod.RichTextEditor),
  {
    ssr: false,
    loading: ({ error }) => {
      if (error) return <div className="text-red-500 p-4">Editor failed to load</div>
      return <EditorSkeleton className="w-full" />
    }
  }
)

export const LazyRichTextEditorSimple = dynamic(
  () => import('./RichTextEditor').then(mod => mod.RichTextEditorSimple),
  {
    ssr: false,
    loading: ({ error }) => {
      if (error) return <div className="text-red-500 p-4">Editor failed to load</div>
      return <SimpleEditorSkeleton className="w-full" />
    }
  }
)

export const LazyRichTextEditorReadOnly = dynamic(
  () => import('./RichTextEditor').then(mod => mod.RichTextEditorReadOnly),
  {
    ssr: false,
    loading: () => <SimpleEditorSkeleton className="w-full" />
  }
)

// ============================================
// Lazy Hook for direct TipTap access (advanced usage)
// ============================================

export const LazyRichTextEditorWithHook = dynamic(
  () => import('./RichTextEditor').then(mod => ({
    default: mod.RichTextEditor,
    EditorToolbar: mod.EditorToolbar,
  })),
  {
    ssr: false,
    loading: () => <EditorSkeleton className="w-full" />
  }
)

// Re-export types
export type { RichTextEditorProps } from './RichTextEditor'
export type { EditorToolbarProps } from './EditorToolbar'