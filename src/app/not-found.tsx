/**
 * Root Not Found Page
 * This will redirect to the localized 404 page
 * If you're here, the locale wasn't matched
 */
import Link from 'next/link'

export default function RootNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="p-8 text-center">
        <h1 className="mb-4 text-6xl font-bold text-zinc-300 dark:text-zinc-700">404</h1>
        <p className="mb-6 text-xl text-zinc-600 dark:text-zinc-400">Page Not Found</p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-cyan-500 px-6 py-3 text-white transition-colors hover:bg-cyan-600"
        >
          Go to Home
        </Link>
      </div>
    </div>
  )
}
