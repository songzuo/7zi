/**
 * Root Not Found Page
 * This will redirect to the localized 404 page
 * If you're here, the locale wasn't matched
 */
export default function RootNotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="text-center p-8">
        <h1 className="text-6xl font-bold text-zinc-300 dark:text-zinc-700 mb-4">
          404
        </h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-6">
          Page Not Found
        </p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
        >
          Go to Home
        </a>
      </div>
    </div>
  );
}