/**
 * Get rate limit status for a path
 *
 * @param path - API path
 * @param identifier - User or IP identifier
 * @param customConfig - Optional custom config
 * @returns Rate limit status or null
 */
export async function getRateLimitStatus(
  path: string,
  identifier?: string,
  customConfig?: Partial<{
    algorithm: 'sliding-window' | 'token-bucket'
    limit: number
    window: number
  }>
): Promise<{
  allowed: boolean
  remaining: number
  resetTime: number
  limit: number
  algorithm: 'sliding-window' | 'token-bucket'
  currentCount?: number
  tokensAvailable?: number
} | null> {
  const { checkSlidingWindow, getSlidingWindowStatus } = await import('./sliding-window')
  const { checkTokenBucket, getTokenBucketStatus } = await import('./token-bucket')

  const algorithm = customConfig?.algorithm || 'sliding-window'
  const limit = customConfig?.limit || 60
  const window = customConfig?.window || 60
  const safeIdentifier = identifier || 'unknown'
  const key = `${path}:${safeIdentifier}`

  if (algorithm === 'sliding-window') {
    const swStatus = await getSlidingWindowStatus(key, window)
    return {
      allowed: swStatus.count < limit,
      remaining: Math.max(0, limit - swStatus.count),
      resetTime: swStatus.resetTime,
      limit,
      algorithm: 'sliding-window',
      currentCount: swStatus.count,
    }
  } else {
    const tbStatus = await getTokenBucketStatus(key)
    return {
      allowed: (tbStatus.tokens || 0) >= 1,
      remaining: Math.floor(tbStatus.tokens || 0),
      resetTime: Date.now() + window * 1000,
      limit,
      algorithm: 'token-bucket',
      tokensAvailable: tbStatus.tokens,
    }
  }
}
