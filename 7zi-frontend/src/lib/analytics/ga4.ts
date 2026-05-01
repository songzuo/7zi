/**
 * Google Analytics 4 Integration
 * 
 * Provides event tracking for:
 * - page_view (automatic via GoogleAnalytics component)
 * - sign_up (registration success)
 * - login (user login)
 * - room_create (room creation)
 */

import { logger } from '@/lib/logger'

// GA4 Measurement Protocol event names
export const GA4Events = {
  SIGN_UP: 'sign_up',
  LOGIN: 'login',
  ROOM_CREATE: 'room_create',
  PAGE_VIEW: 'page_view',
} as const

export type GA4EventName = (typeof GA4Events)[keyof typeof GA4Events]

interface GA4EventParams {
  [key: string]: string | number | boolean | undefined
}

interface GA4UserProperties {
  [key: string]: string | number | boolean | undefined
}

/**
 * Check if GA4 is configured and available
 */
export function isGA4Configured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GA_ID)
}

/**
 * Get the GA Measurement Protocol API URL
 * Uses gtag.js for events via the dataLayer
 */
function getGA4Endpoint(): string {
  return 'https://www.googletagmanager.com/gtag/js'
}

/**
 * Track a custom GA4 event
 * 
 * @param eventName - The GA4 event name
 * @param params - Event parameters
 */
export function trackEvent(eventName: string, params?: GA4EventParams): void {
  if (typeof window === 'undefined') {
    logger.debug('[GA4] Skipping event tracking during SSR', { eventName, params })
    return
  }

  if (!isGA4Configured()) {
    logger.debug('[GA4] GA4 not configured, skipping event', { eventName, params })
    return
  }

  try {
    // Push to dataLayer for gtag to pick up
    const gtag = (window as Window & { gtag?: Function }).gtag
    if (gtag && typeof gtag === 'function') {
      gtag('event', eventName, params)
      logger.debug('[GA4] Event tracked', { eventName, params })
    } else {
      logger.warn('[GA4] gtag not found on window', { eventName })
    }
  } catch (error) {
    logger.error('[GA4] Failed to track event', error instanceof Error ? error : new Error(String(error)), { eventName, params })
  }
}

/**
 * Track sign_up event (registration success)
 */
export function trackSignUp(method?: string): void {
  trackEvent(GA4Events.SIGN_UP, {
    method: method || 'unknown',
  })
}

/**
 * Track login event
 */
export function trackLogin(method?: string): void {
  trackEvent(GA4Events.LOGIN, {
    method: method || 'unknown',
  })
}

/**
 * Track room_create event
 */
export function trackRoomCreate(roomId?: string, roomType?: string): void {
  trackEvent(GA4Events.ROOM_CREATE, {
    room_id: roomId,
    room_type: roomType || 'standard',
  })
}

/**
 * Set GA4 user properties
 */
export function setUserProperties(properties: GA4UserProperties): void {
  if (typeof window === 'undefined') return
  if (!isGA4Configured()) return

  try {
    const gtag = (window as Window & { gtag?: Function }).gtag
    if (gtag && typeof gtag === 'function') {
      gtag('set', 'user_properties', properties)
    }
  } catch (error) {
    logger.error('[GA4] Failed to set user properties', error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Track user login (identify user)
 */
export function identifyUser(userId: string, properties?: GA4UserProperties): void {
  if (typeof window === 'undefined') return
  if (!isGA4Configured()) return

  try {
    const gtag = (window as Window & { gtag?: Function }).gtag
    if (gtag && typeof gtag === 'function') {
      gtag('set', { user_id: userId })
      if (properties) {
        gtag('set', 'user_properties', properties)
      }
      logger.debug('[GA4] User identified', { userId })
    }
  } catch (error) {
    logger.error('[GA4] Failed to identify user', error instanceof Error ? error : new Error(String(error)), { userId })
  }
}

/**
 * Clear user identification (logout)
 */
export function clearUser(): void {
  if (typeof window === 'undefined') return
  if (!isGA4Configured()) return

  try {
    const gtag = (window as Window & { gtag?: Function }).gtag
    if (gtag && typeof gtag === 'function') {
      // Clear user ID by setting to undefined
      gtag('set', { user_id: undefined })
      logger.debug('[GA4] User cleared')
    }
  } catch (error) {
    logger.error('[GA4] Failed to clear user', error instanceof Error ? error : new Error(String(error)))
  }
}
