/**
 * Global type declarations for browser APIs
 */

declare global {
  interface Performance {
    getEntriesByType(type: string): PerformanceEntry[]
    memory?: {
      usedJSHeapSize: number
      totalJSHeapSize: number
      jsHeapSizeLimit: number
    }
  }

  interface Window {
    next?: {
      router?: unknown
    }
  }
}

export {}
