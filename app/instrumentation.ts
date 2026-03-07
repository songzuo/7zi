/**
 * Sentry Instrumentation
 * 
 * This file is used by Next.js to initialize Sentry before the app starts
 * Required for proper error tracking in App Router
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
