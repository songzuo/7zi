/**
 * PWA Install Prompt Component
 *
 * Shows install prompt when available
 *
 * @version 1.12.0
 */

'use client'

import { useState, useEffect } from 'react'
import { usePWA } from '@/hooks/usePWA'
import { X, Download, Smartphone } from 'lucide-react'

export function PWAInstallPrompt() {
  const { installPrompt, promptInstall, state } = usePWA()
  const [dismissed, setDismissed] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Show prompt if:
    // 1. Install prompt is available
    // 2. Not installed
    // 3. Not dismissed
    // 4. On mobile or after some delay on desktop
    if (installPrompt && !state.isInstalled && !dismissed) {
      if (state.isMobile) {
        // Show immediately on mobile
        setShowPrompt(true)
      } else {
        // Show after 30 seconds on desktop
        const timer = setTimeout(() => {
          setShowPrompt(true)
        }, 30000)

        return () => clearTimeout(timer)
      }
    }
  }, [installPrompt, state.isInstalled, dismissed, state.isMobile])

  const handleInstall = async () => {
    const success = await promptInstall()
    if (success) {
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    setShowPrompt(false)
    // Store dismissal in localStorage
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Check if previously dismissed
  useEffect(() => {
    const previouslyDismissed = localStorage.getItem('pwa-install-dismissed')
    if (previouslyDismissed === 'true') {
      setDismissed(true)
    }
  }, [])

  if (!showPrompt || state.isInstalled || !installPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="bg-white rounded-lg shadow-2xl border-2 border-blue-500 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 text-white">
            <Smartphone className="w-5 h-5" />
            <span className="font-semibold">Install App</span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white hover:bg-white/20 rounded p-1 transition"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              7zi
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Install 7zi App</h3>
              <p className="text-sm text-gray-600">
                Get the full experience with offline support, push notifications, and quick access.
              </p>
            </div>
          </div>

          {/* Features */}
          <ul className="mt-4 space-y-2 text-sm text-gray-700">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              Works offline
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              Faster loading
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              Push notifications
            </li>
          </ul>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition"
            >
              <Download className="w-4 h-4" />
              Install Now
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}