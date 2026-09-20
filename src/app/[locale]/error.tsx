'use client'

import { useEffect, useCallback, useState } from 'react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function LocaleError({ error, reset }: ErrorPageProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleReset = useCallback(async () => {
    setIsRetrying(true)
    try {
      await reset()
    } catch (e) {
      console.error('Retry failed:', e)
    } finally {
      setIsRetrying(false)
    }
  }, [reset])

  useEffect(() => {
    console.error('[Locale Error] Caught error:', error.message, error.stack?.substring(0, 500))
    if (error.digest) console.error('[Locale Error] Digest:', error.digest)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 px-4 dark:from-zinc-950 dark:to-zinc-900">
      <div className="w-full max-w-lg text-center">
        <div className="relative mb-8">
          <h1 className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 bg-clip-text text-[120px] leading-none font-bold text-transparent sm:text-[160px]">
            500
          </h1>
        </div>
        <h2 className="mb-3 text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-white">
          Server Error
        </h2>
        <p className="mb-4 text-zinc-600 dark:text-zinc-400">
          {error.message || 'An unexpected error occurred'}
        </p>
        {error.digest && (
          <p className="mb-4 font-mono text-sm text-zinc-400">Code: {error.digest.slice(0, 8)}</p>
        )}
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button onClick={handleReset} disabled={isRetrying}
            className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 font-semibold text-white">
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
          <button onClick={() => window.location.href = '/'}
            className="flex items-center justify-center gap-2 rounded-full border-2 border-zinc-300 px-6 py-3 font-semibold text-zinc-700">
            Home
          </button>
        </div>
      </div>
    </div>
  )
}
