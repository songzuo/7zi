'use client'

import { useState, useEffect } from 'react'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

interface UseDeviceTypeResult {
  deviceType: DeviceType
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isLowEndDevice: boolean
  prefersReducedMotion: boolean
  isLoading: boolean
}

/**
 * Hook to detect device type and capabilities
 * Used for conditional loading of heavy components
 */
export function useDeviceType(): UseDeviceTypeResult {
  const [deviceInfo, setDeviceInfo] = useState<UseDeviceTypeResult>({
    deviceType: 'desktop',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isLowEndDevice: false,
    prefersReducedMotion: false,
    isLoading: true,
  })

  useEffect(() => {
    // Check device type
    const checkDevice = () => {
      const width = window.innerWidth
      const navigator = window.navigator

      // Check for mobile or tablet
      const isMobile = width < 768
      const isTablet = width >= 768 && width < 1024

      // Check for low-end device
      // Based on hardware concurrency and memory
      const isLowEnd =
        (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
        (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
        // Check for mobile devices which are typically lower-end
        isMobile ||
        // Check connection type if available
        (navigator.connection &&
          (navigator.connection.effectiveType === 'slow-2g' ||
            navigator.connection.effectiveType === '2g'))

      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches

      setDeviceInfo({
        deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
        isMobile,
        isTablet,
        isDesktop: !isMobile && !isTablet,
        isLowEndDevice: isLowEnd,
        prefersReducedMotion,
        isLoading: false,
      })
    }

    // Initial check
    checkDevice()

    // Listen for changes
    const handleResize = () => checkDevice()
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    window.addEventListener('resize', handleResize)
    mediaQuery.addEventListener('change', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      mediaQuery.removeEventListener('change', handleResize)
    }
  }, [])

  return deviceInfo
}

/**
 * Hook to check if 3D rendering is recommended
 * Returns false for mobile/tablet or low-end devices
 */
export function use3DEnabled(): boolean {
  const { isMobile, isTablet, isLowEndDevice } = useDeviceType()

  // Disable 3D on mobile/tablet or low-end devices
  return !isMobile && !isTablet && !isLowEndDevice
}

/**
 * Hook to check if heavy animations should be used
 * Respects user's motion preferences
 */
export function useHeavyAnimationsEnabled(): boolean {
  const { prefersReducedMotion, isLowEndDevice } = useDeviceType()

  return !prefersReducedMotion && !isLowEndDevice
}

/**
 * Hook to get recommended image quality
 * Returns lower quality for mobile devices
 */
export function useImageQuality(): number {
  const { isMobile, isLowEndDevice } = useDeviceType()

  if (isMobile || isLowEndDevice) return 60
  return 85
}