/**
 * React Compiler Performance - Tracker
 *
 * Tracks and measures React Compiler performance improvements.
 */

'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// Chrome-specific memory info type
interface MemoryInfo {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

declare global {
  interface Performance {
    memory?: MemoryInfo
  }
}

// ============================================================================
// Types
// ============================================================================

export interface PerformanceSnapshot {
  timestamp: number
  renderCount: number
  totalRenderTime: number
  avgRenderTime: number
  memoryUsage: number
  component: string
}

export interface PerformanceComparison {
  component: string
  before: PerformanceSnapshot
  after: PerformanceSnapshot
  improvement: {
    renderCount: number // percentage improvement
    avgRenderTime: number // percentage improvement
    memoryUsage: number // percentage improvement
  }
}

export interface PerformanceStats {
  totalRenders: number
  avgRenderTime: number
  totalMemory: number
  components: Map<string, PerformanceSnapshot>
}

export type PerformanceEventHandler = (event: PerformanceEvent) => void

export interface PerformanceEvent {
  type: 'render' | 'memory' | 'error'
  component: string
  data: {
    renderTime?: number
    memory?: number
    error?: Error
  }
  timestamp: number
}

// ============================================================================
// Performance Tracker
// ============================================================================

export class PerformanceTracker {
  private snapshots: Map<string, PerformanceSnapshot[]> = new Map()
  private listeners: Set<PerformanceEventHandler> = new Set()
  private isTracking = false
  private startTime = 0

  /**
   * Start tracking performance
   */
  startTracking(): void {
    this.isTracking = true
    this.startTime = performance.now()
    this.snapshots.clear()
  }

  /**
   * Stop tracking performance
   */
  stopTracking(): void {
    this.isTracking = false
  }

  /**
   * Record a render for a component
   */
  recordRender(component: string, renderTime: number): void {
    if (!this.isTracking) return

    const existing = this.snapshots.get(component) || []
    const last = existing[existing.length - 1]

    const snapshot: PerformanceSnapshot = {
      timestamp: performance.now(),
      renderCount: (last?.renderCount || 0) + 1,
      totalRenderTime: (last?.totalRenderTime || 0) + renderTime,
      avgRenderTime: ((last?.totalRenderTime || 0) + renderTime) / ((last?.renderCount || 0) + 1),
      memoryUsage: this.getCurrentMemoryUsage(),
      component,
    }

    existing.push(snapshot)
    this.snapshots.set(component, existing)

    // Emit event
    this.emit({
      type: 'render',
      component,
      data: { renderTime },
      timestamp: snapshot.timestamp,
    })
  }

  /**
   * Get performance stats for a component
   */
  getComponentStats(component: string): PerformanceSnapshot | null {
    const snapshots = this.snapshots.get(component)
    if (!snapshots || snapshots.length === 0) return null
    return snapshots[snapshots.length - 1]
  }

  /**
   * Get all performance stats
   */
  getAllStats(): PerformanceStats {
    let totalRenders = 0
    let totalRenderTime = 0
    let totalMemory = 0
    const components = new Map<string, PerformanceSnapshot>()

    for (const [component, snapshots] of this.snapshots) {
      const latest = snapshots[snapshots.length - 1]
      components.set(component, latest)
      totalRenders += latest.renderCount
      totalRenderTime += latest.totalRenderTime
      totalMemory += latest.memoryUsage
    }

    return {
      totalRenders,
      avgRenderTime: totalRenders > 0 ? totalRenderTime / totalRenders : 0,
      totalMemory,
      components,
    }
  }

  /**
   * Compare performance before and after compiler
   */
  comparePerformance(
    before: PerformanceSnapshot,
    after: PerformanceSnapshot
  ): PerformanceComparison {
    const calculateImprovement = (beforeVal: number, afterVal: number): number => {
      if (beforeVal === 0) return 0
      return ((beforeVal - afterVal) / beforeVal) * 100
    }

    return {
      component: before.component,
      before,
      after,
      improvement: {
        renderCount: calculateImprovement(before.renderCount, after.renderCount),
        avgRenderTime: calculateImprovement(before.avgRenderTime, after.avgRenderTime),
        memoryUsage: calculateImprovement(before.memoryUsage, after.memoryUsage),
      },
    }
  }

  /**
   * Add event listener
   */
  addListener(handler: PerformanceEventHandler): () => void {
    this.listeners.add(handler)
    return () => this.listeners.delete(handler)
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: PerformanceEvent): void {
    for (const listener of this.listeners) {
      listener(event)
    }
  }

  /**
   * Get current memory usage (if available)
   */
  private getCurrentMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      return performance.memory?.usedJSHeapSize ?? 0
    }
    return 0
  }

  /**
   * Export performance data
   */
  exportData(): {
    startTime: number
    duration: number
    components: Record<string, PerformanceSnapshot[]>
  } {
    const data: Record<string, PerformanceSnapshot[]> = {}
    for (const [component, snapshots] of this.snapshots) {
      data[component] = snapshots
    }

    return {
      startTime: this.startTime,
      duration: performance.now() - this.startTime,
      components: data,
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.snapshots.clear()
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let trackerInstance: PerformanceTracker | null = null

export function getPerformanceTracker(): PerformanceTracker {
  if (!trackerInstance) {
    trackerInstance = new PerformanceTracker()
  }
  return trackerInstance
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook to track component render performance
 */
export function usePerformanceTracking(componentName: string) {
  const tracker = getPerformanceTracker()
  const renderStartRef = useRef<number>(0)

  // Use useLayoutEffect to mark render start (runs before paint)
  useLayoutEffect(() => {
    renderStartRef.current = performance.now()

    return () => {
      // Record render time after render is complete
      const renderTime = performance.now() - renderStartRef.current
      tracker.recordRender(componentName, renderTime)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/**
 * Hook to measure component render count
 * Note: This hook uses state to trigger re-renders, which is intentional
 * for render count tracking purposes
 */
export function useRenderCount(): number {
  const [count, setCount] = useState(0)

  // Update count on every render
  useLayoutEffect(() => {
    setCount(prev => prev + 1)
  })

  return count
}

/**
 * Hook to get performance stats for a component
 */
export function usePerformanceStats(componentName: string): PerformanceSnapshot | null {
  const tracker = getPerformanceTracker()
  const [stats, setStats] = useState<PerformanceSnapshot | null>(null)

  useEffect(() => {
    const updateStats = () => {
      setStats(tracker.getComponentStats(componentName))
    }

    // Initial stats
    updateStats()

    // Listen for updates
    const unsubscribe = tracker.addListener(updateStats)
    return unsubscribe
  }, [componentName, tracker])

  return stats
}
