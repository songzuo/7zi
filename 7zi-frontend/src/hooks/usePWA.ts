/**
 * usePWA Hook
 *
 * React hook for PWA functionality
 *
 * @version 1.12.0
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { webPushService, type PushNotificationPayload } from '@/lib/pwa/web-push-service'
import { serviceWorkerManager } from '@/lib/pwa/service-worker-manager'
import {
  isPWAInstalled,
  isMobile,
  isIOS,
  isAndroid,
  isOnline,
  listenNetworkStatus,
  type SWMessage,
} from '@/lib/pwa/utils'

export interface PWAState {
  isSupported: boolean
  isInstalled: boolean
  isOnline: boolean
  isMobile: boolean
  isIOS: boolean
  isAndroid: boolean
  pushPermission: NotificationPermission
  isPushSubscribed: boolean
  updateAvailable: boolean
  serviceWorkerReady: boolean
}

export interface UsePWAReturn {
  state: PWAState
  requestPushPermission: () => Promise<NotificationPermission>
  subscribeToPush: (vapidKey: string) => Promise<boolean>
  unsubscribeFromPush: () => Promise<boolean>
  showNotification: (payload: PushNotificationPayload) => Promise<void>
  checkForUpdates: () => Promise<boolean>
  activateUpdate: () => Promise<void>
  clearCaches: () => Promise<void>
  installPrompt: BeforeInstallPromptEvent | null
  promptInstall: () => Promise<boolean>
}

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * usePWA Hook
 */
export function usePWA(): UsePWAReturn {
  const [state, setState] = useState<PWAState>({
    isSupported: false,
    isInstalled: false,
    isOnline: true,
    isMobile: false,
    isIOS: false,
    isAndroid: false,
    pushPermission: 'default',
    isPushSubscribed: false,
    updateAvailable: false,
    serviceWorkerReady: false,
  })

  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const initializedRef = useRef(false)

  // Initialize PWA
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const initializePWA = async () => {
      // Check basic support
      const supported = serviceWorkerManager.isSupported()
      const installed = isPWAInstalled()
      const mobile = isMobile()
      const ios = isIOS()
      const android = isAndroid()
      const online = isOnline()

      setState((prev) => ({
        ...prev,
        isSupported: supported,
        isInstalled: installed,
        isMobile: mobile,
        isIOS: ios,
        isAndroid: android,
        isOnline: online,
      }))

      if (!supported) return

      // Initialize Service Worker
      const swReady = await serviceWorkerManager.initialize()
      setState((prev) => ({ ...prev, serviceWorkerReady: swReady }))

      // Initialize Web Push
      await webPushService.initialize()

      // Get push permission state
      const permission = await webPushService.getPermissionState()
      const subscribed = webPushService.isSubscribed()

      setState((prev) => ({
        ...prev,
        pushPermission: permission,
        isPushSubscribed: subscribed,
      }))

      // Listen for update available
      const unsubscribeUpdate = serviceWorkerManager.onUpdateAvailable(() => {
        setState((prev) => ({ ...prev, updateAvailable: true }))
      })

      // Listen for network status
      const unsubscribeNetwork = listenNetworkStatus(
        () => setState((prev) => ({ ...prev, isOnline: true })),
        () => setState((prev) => ({ ...prev, isOnline: false }))
      )

      return () => {
        unsubscribeUpdate()
        unsubscribeNetwork()
      }
    }

    initializePWA()
  }, [])

  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // Request push permission
  const requestPushPermission = useCallback(async (): Promise<NotificationPermission> => {
    const permission = await webPushService.requestPermission()
    setState((prev) => ({ ...prev, pushPermission: permission }))
    return permission
  }, [])

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async (vapidKey: string): Promise<boolean> => {
    const subscription = await webPushService.subscribe(vapidKey)

    if (subscription) {
      setState((prev) => ({ ...prev, isPushSubscribed: true }))
      await webPushService.sendSubscriptionToServer(subscription)
      return true
    }

    return false
  }, [])

  // Unsubscribe from push notifications
  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    const subscription = webPushService.getSubscription()

    if (subscription) {
      const success = await webPushService.unsubscribe()

      if (success) {
        await webPushService.removeSubscriptionFromServer(subscription)
        setState((prev) => ({ ...prev, isPushSubscribed: false }))
      }

      return success
    }

    return false
  }, [])

  // Show local notification
  const showNotification = useCallback(async (payload: PushNotificationPayload): Promise<void> => {
    await webPushService.showLocalNotification(payload)
  }, [])

  // Check for updates
  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    return await serviceWorkerManager.checkForUpdates()
  }, [])

  // Activate update
  const activateUpdate = useCallback(async (): Promise<void> => {
    await serviceWorkerManager.skipWaiting()
  }, [])

  // Clear caches
  const clearCaches = useCallback(async (): Promise<void> => {
    await serviceWorkerManager.clearCaches()
  }, [])

  // Prompt install
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) return false

    try {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice

      if (outcome === 'accepted') {
        setInstallPrompt(null)
        return true
      }

      return false
    } catch (error) {
      console.error('Failed to prompt install:', error)
      return false
    }
  }, [installPrompt])

  return {
    state,
    requestPushPermission,
    subscribeToPush,
    unsubscribeFromPush,
    showNotification,
    checkForUpdates,
    activateUpdate,
    clearCaches,
    installPrompt,
    promptInstall,
  }
}