'use client'

import { useEffect } from 'react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function RootError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[Root Error] Caught error:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack?.substring(0, 500),
      digest: error?.digest,
      keys: error ? Object.getOwnPropertyNames(error) : null,
      toString: String(error),
    })
  }, [error])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      padding: '2rem',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1>Something Went Wrong</h1>
        <p>Error: {error?.message || 'Unknown error'}</p>
        <p style={{ fontSize: '0.875rem', color: '#999' }}>
          {error?.digest && `Code: ${error.digest.slice(0, 8)}`}
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 2rem',
            background: '#0891b2',
            color: 'white',
            border: 'none',
            borderRadius: '9999px',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
