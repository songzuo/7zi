/**
 * PWA API Routes
 *
 * API endpoints for PWA functionality
 */

import { NextRequest } from 'next/server'
import webpush from 'web-push'
import { createSuccessResponse, createBadRequestError, createErrorResponse } from '@/lib/api/error-handler'

// VAPID keys (should be in environment variables in production)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:contact@7zi.com'

// Configure web-push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

// In-memory storage for subscriptions (use a database in production)
const subscriptions = new Map<string, any>()

/**
 * GET /api/pwa/vapid-public-key
 * Get VAPID public key for client-side subscription
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'vapid-public-key') {
    return createSuccessResponse({ publicKey: VAPID_PUBLIC_KEY })
  }

  if (action === 'cache-size') {
    // This would need to be implemented with actual cache inspection
    return createSuccessResponse({ size: 0 })
  }

  return createBadRequestError('Invalid action')
}

/**
 * POST /api/pwa/subscribe
 * Subscribe to push notifications
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'subscribe') {
      const subscription = await request.json()

      if (!subscription || !subscription.endpoint) {
        return createBadRequestError('Invalid subscription')
      }

      // Store subscription
      const subscriptionId = subscription.endpoint
      subscriptions.set(subscriptionId, {
        ...subscription,
        createdAt: Date.now(),
      })

      logger.debug('New subscription:', subscriptionId)

      return createSuccessResponse({ subscriptionId })
    }

    if (action === 'unsubscribe') {
      const subscription = await request.json()

      if (!subscription || !subscription.endpoint) {
        return createBadRequestError('Invalid subscription')
      }

      // Remove subscription
      const subscriptionId = subscription.endpoint
      subscriptions.delete(subscriptionId)

      logger.debug('Unsubscribed:', subscriptionId)

      return createSuccessResponse({})
    }

    if (action === 'send-notification') {
      const { title, body, data } = await request.json()

      if (!title) {
        return createBadRequestError('Title is required')
      }

      // Send notification to all subscriptions
      const payload = JSON.stringify({
        notification: {
          title,
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          data: data || {},
        },
      })

      const results = await Promise.allSettled(
        Array.from(subscriptions.values()).map((subscription) =>
          webpush.sendNotification(subscription, payload).catch((error: any) => {
            logger.error('Failed to send notification:', error)
            // Remove invalid subscriptions
            if (error.statusCode === 410) {
              subscriptions.delete(subscription.endpoint)
            }
            throw error
          })
        )
      )

      const successful = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.filter((r) => r.status === 'rejected').length

      return createSuccessResponse({
        sent: successful,
        failed,
        total: subscriptions.size,
      })
    }

    return createBadRequestError('Invalid action')
  } catch (error) {
    logger.error('PWA API error:', error)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}