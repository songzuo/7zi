'use client'

import { useEffect, useRef } from 'react'

type GtagFunction = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: GtagFunction
  }
}

export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID
  const umamiId = process.env.NEXT_PUBLIC_UMAMI_ID
  const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL || 'https://analytics.umami.is'
  const plausibleId = process.env.NEXT_PUBLIC_PLAUSIBLE_ID
  const baiduId = process.env.NEXT_PUBLIC_BAIDU_ID

  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    try {
      if (gaId) {
        const script = document.createElement('script')
        script.src = "https://www.googletagmanager.com/gtag/js?id=" + gaId
        script.async = true
        document.head.appendChild(script)
        window.dataLayer = window.dataLayer || []
        function gtag(...args: unknown[]) { window.dataLayer?.push(args) }
        gtag('js', new Date())
        gtag('config', gaId, { page_path: window.location.pathname })
      }

      if (umamiId && umamiUrl) {
        const script = document.createElement('script')
        script.src = umamiUrl
        script.setAttribute('data-website-id', umamiId)
        script.async = true
        document.head.appendChild(script)
      }

      if (plausibleId) {
        const script = document.createElement('script')
        script.defer = true
        script.dataset.domain = plausibleId
        script.src = 'https://plausible.io/js/script.js'
        document.head.appendChild(script)
      }
    } catch (e) {
      // Silently fail - analytics should never break the app
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

export default Analytics
