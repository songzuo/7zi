'use client'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global Error:', error)
  }, [error])

  return (
    <html>
      <body style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', background: '#f4f4f5' }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 12, color: '#18181b' }}>Something went wrong</h1>
          <p style={{ color: '#71717a', marginBottom: 24 }}>An unexpected error occurred. Please try again.</p>
          {error.digest && <p style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 16 }}>Error: {error.digest.slice(0, 8)}</p>}
          <button onClick={reset} style={{ padding: '8px 24px', borderRadius: 9999, background: '#6366f1', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Retry</button>
        </div>
      </body>
    </html>
  )
}
