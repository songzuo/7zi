/**
 * @fileoverview Search history manager
 * @description Manages search history with localStorage persistence
 */

import type { SearchHistoryEntry, SearchHistoryStorage } from './types'

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = '7zi-search-history'
const MAX_HISTORY_SIZE = 50
const MAX_STORAGE_AGE = 30 * 24 * 60 * 60 * 1000 // 30 days

// ============================================================================
// Search History Manager
// ============================================================================

export class SearchHistoryManager {
  private history: SearchHistoryEntry[] = []
  private maxSize: number
  private maxAge: number

  constructor(maxSize: number = MAX_HISTORY_SIZE, maxAge: number = MAX_STORAGE_AGE) {
    this.maxSize = maxSize
    this.maxAge = maxAge
    this.loadFromStorage()
  }

  /**
   * Add a search to history
   */
  add(entry: Omit<SearchHistoryEntry, 'timestamp'>): void {
    const newEntry: SearchHistoryEntry = {
      ...entry,
      timestamp: Date.now(),
    }

    // Remove duplicate queries (case-insensitive)
    this.history = this.history.filter(h => h.query.toLowerCase() !== entry.query.toLowerCase())

    // Add to beginning
    this.history.unshift(newEntry)

    // Trim to max size
    if (this.history.length > this.maxSize) {
      this.history = this.history.slice(0, this.maxSize)
    }

    // Clean old entries
    this.cleanOldEntries()

    // Save to storage
    this.saveToStorage()
  }

  /**
   * Get all history entries
   */
  getAll(): SearchHistoryEntry[] {
    return [...this.history]
  }

  /**
   * Get recent history entries
   */
  getRecent(limit: number = 10): SearchHistoryEntry[] {
    return this.history.slice(0, limit)
  }

  /**
   * Search within history
   */
  search(query: string, limit: number = 10): SearchHistoryEntry[] {
    const lowerQuery = query.toLowerCase()

    return this.history
      .filter(entry => entry.query.toLowerCase().includes(lowerQuery))
      .slice(0, limit)
  }

  /**
   * Get history by target type
   */
  getByTarget(target: 'all' | 'tasks' | 'projects' | 'members' | 'agents'): SearchHistoryEntry[] {
    return this.history.filter(entry => entry.target === target)
  }

  /**
   * Get popular searches (most frequent)
   */
  getPopular(limit: number = 10): Array<{ query: string; count: number }> {
    const counts = new Map<string, number>()

    for (const entry of this.history) {
      const query = entry.query.toLowerCase()
      counts.set(query, (counts.get(query) || 0) + 1)
    }

    return Array.from(counts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  /**
   * Get trending searches (recent and frequent)
   */
  getTrending(limit: number = 10): Array<{ query: string; score: number }> {
    const now = Date.now()
    const recentThreshold = 7 * 24 * 60 * 60 * 1000 // 7 days

    const scores = new Map<string, number>()

    for (const entry of this.history) {
      const age = now - entry.timestamp

      // Only consider recent entries
      if (age > recentThreshold) continue

      const query = entry.query.toLowerCase()
      const recencyScore = 1 - age / recentThreshold // 0-1, higher for newer
      const currentScore = scores.get(query) || 0

      scores.set(query, currentScore + recencyScore)
    }

    return Array.from(scores.entries())
      .map(([query, score]) => ({ query, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  /**
   * Remove a specific entry
   */
  remove(query: string): void {
    this.history = this.history.filter(entry => entry.query.toLowerCase() !== query.toLowerCase())
    this.saveToStorage()
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = []
    this.saveToStorage()
  }

  /**
   * Clear history older than threshold
   */
  clearOld(): void {
    this.cleanOldEntries()
    this.saveToStorage()
  }

  /**
   * Get history statistics
   */
  getStatistics(): {
    totalEntries: number
    uniqueQueries: number
    averageResults: number
    searchesByTarget: Record<string, number>
    oldestEntry: number | null
    newestEntry: number | null
  } {
    if (this.history.length === 0) {
      return {
        totalEntries: 0,
        uniqueQueries: 0,
        averageResults: 0,
        searchesByTarget: {},
        oldestEntry: null,
        newestEntry: null,
      }
    }

    const uniqueQueries = new Set(this.history.map(h => h.query.toLowerCase()))
    const totalResults = this.history.reduce((sum, h) => sum + h.resultCount, 0)
    const searchesByTarget: Record<string, number> = {}

    for (const entry of this.history) {
      searchesByTarget[entry.target] = (searchesByTarget[entry.target] || 0) + 1
    }

    return {
      totalEntries: this.history.length,
      uniqueQueries: uniqueQueries.size,
      averageResults: totalResults / this.history.length,
      searchesByTarget,
      oldestEntry: this.history[this.history.length - 1]?.timestamp || null,
      newestEntry: this.history[0]?.timestamp || null,
    }
  }

  /**
   * Export history as JSON
   */
  export(): string {
    return JSON.stringify({
      entries: this.history,
      exportedAt: Date.now(),
    })
  }

  /**
   * Import history from JSON
   */
  import(json: string): { success: boolean; imported: number; error?: string } {
    try {
      const data = JSON.parse(json)

      if (!Array.isArray(data.entries)) {
        return { success: false, imported: 0, error: 'Invalid format' }
      }

      // Validate entries
      const validEntries = data.entries.filter(
        (entry: unknown): entry is SearchHistoryEntry =>
          typeof entry === 'object' &&
          entry !== null &&
          typeof (entry as SearchHistoryEntry).query === 'string' &&
          typeof (entry as SearchHistoryEntry).timestamp === 'number' &&
          typeof (entry as SearchHistoryEntry).resultCount === 'number' &&
          typeof (entry as SearchHistoryEntry).target === 'string'
      )

      // Merge with existing history (avoiding duplicates)
      const existingQueries = new Set(this.history.map(h => h.query.toLowerCase()))

      let importedCount = 0

      for (const entry of validEntries) {
        if (!existingQueries.has(entry.query.toLowerCase())) {
          this.history.push(entry)
          importedCount++
        }
      }

      // Sort by timestamp (newest first)
      this.history.sort((a, b) => b.timestamp - a.timestamp)

      // Trim to max size
      if (this.history.length > this.maxSize) {
        this.history = this.history.slice(0, this.maxSize)
      }

      this.saveToStorage()

      return { success: true, imported: importedCount }
    } catch (error) {
      return {
        success: false,
        imported: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Load history from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const data = localStorage.getItem(STORAGE_KEY)

      if (data) {
        const storage: SearchHistoryStorage = JSON.parse(data)
        this.history = storage.entries || []
      }
    } catch (error) {
      console.error('Failed to load search history:', error)
      this.history = []
    }
  }

  /**
   * Save history to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const storage: SearchHistoryStorage = {
        entries: this.history,
        maxSize: this.maxSize,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
    } catch (error) {
      console.error('Failed to save search history:', error)
    }
  }

  /**
   * Remove entries older than max age
   */
  private cleanOldEntries(): void {
    const now = Date.now()
    this.history = this.history.filter(entry => now - entry.timestamp < this.maxAge)
  }
}

// ============================================================================
// Global history manager instance
// ============================================================================

let globalHistoryManager: SearchHistoryManager | null = null

/**
 * Get or create the global history manager instance
 */
export function getGlobalHistoryManager(recreate = false): SearchHistoryManager {
  if (!globalHistoryManager || recreate) {
    globalHistoryManager = new SearchHistoryManager()
  }
  return globalHistoryManager
}

/**
 * Reset the global history manager instance
 */
export function resetGlobalHistoryManager(): void {
  globalHistoryManager = null
}
