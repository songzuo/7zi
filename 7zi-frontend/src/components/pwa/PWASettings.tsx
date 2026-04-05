/**
 * PWA Settings Component
 *
 * Provides UI for PWA settings and management
 *
 * @version 1.12.0
 */

'use client'

import { useState, useEffect } from 'react'
import { usePWA } from '@/hooks/usePWA'

export function PWASettings() {
  const { state, requestPushPermission, subscribeToPush, unsubscribeFromPush, clearCaches } = usePWA()
  const [vapidKey, setVapidKey] = useState('')

  useEffect(() => {
    // Load VAPID key from environment or API
    const loadVapidKey = async () => {
      try {
        const response = await fetch('/api/pwa?action=vapid-public-key')
        const data = await response.json()
        setVapidKey(data.publicKey || '')
      } catch (error) {
        console.error('Failed to load VAPID key:', error)
      }
    }

    loadVapidKey()
  }, [])

  const handleSubscribe = async () => {
    if (!vapidKey) {
      alert('VAPID key not available')
      return
    }

    if (state.pushPermission === 'default') {
      const permission = await requestPushPermission()
      if (permission !== 'granted') {
        alert('Push notification permission denied')
        return
      }
    }

    const success = await subscribeToPush(vapidKey)
    if (success) {
      alert('Successfully subscribed to push notifications')
    } else {
      alert('Failed to subscribe to push notifications')
    }
  }

  const handleUnsubscribe = async () => {
    const success = await unsubscribeFromPush()
    if (success) {
      alert('Successfully unsubscribed from push notifications')
    } else {
      alert('Failed to unsubscribe from push notifications')
    }
  }

  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear all caches?')) {
      await clearCaches()
      alert('Caches cleared successfully')
    }
  }

  if (!state.isSupported) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">PWA Not Supported</h3>
        <p className="text-gray-600">
          Your browser does not support Progressive Web App features.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* PWA Status */}
      <div className="p-4 bg-white border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">PWA Status</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">PWA Supported:</span>
            <span className={`font-medium ${state.isSupported ? 'text-green-600' : 'text-red-600'}`}>
              {state.isSupported ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Installed:</span>
            <span className={`font-medium ${state.isInstalled ? 'text-green-600' : 'text-gray-600'}`}>
              {state.isInstalled ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Service Worker:</span>
            <span className={`font-medium ${state.serviceWorkerReady ? 'text-green-600' : 'text-red-600'}`}>
              {state.serviceWorkerReady ? 'Ready' : 'Not Ready'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Online:</span>
            <span className={`font-medium ${state.isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {state.isOnline ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Device:</span>
            <span className="font-medium">
              {state.isMobile ? 'Mobile' : 'Desktop'}
              {state.isIOS && ' (iOS)'}
              {state.isAndroid && ' (Android)'}
            </span>
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="p-4 bg-white border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Push Notifications</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Permission:</span>
            <span
              className={`font-medium px-3 py-1 rounded-full text-sm ${
                state.pushPermission === 'granted'
                  ? 'bg-green-100 text-green-800'
                  : state.pushPermission === 'denied'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {state.pushPermission}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Subscribed:</span>
            <span className={`font-medium ${state.isPushSubscribed ? 'text-green-600' : 'text-gray-600'}`}>
              {state.isPushSubscribed ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex gap-2">
            {!state.isPushSubscribed ? (
              <button
                onClick={handleSubscribe}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Subscribe
              </button>
            ) : (
              <button
                onClick={handleUnsubscribe}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Unsubscribe
              </button>
            )}
            {state.pushPermission === 'default' && (
              <button
                onClick={requestPushPermission}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
              >
                Request Permission
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cache Management */}
      <div className="p-4 bg-white border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Cache Management</h3>
        <button
          onClick={handleClearCache}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition"
        >
          Clear All Caches
        </button>
      </div>

      {/* Install Instructions (for iOS) */}
      {state.isIOS && !state.isInstalled && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-blue-800">Install on iOS</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-900">
            <li>Tap the Share button</li>
            <li>Scroll down and tap "Add to Home Screen"</li>
            <li>Tap "Add" to install the app</li>
          </ol>
        </div>
      )}
    </div>
  )
}