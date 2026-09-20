'use client'

/**
 * @fileoverview Search history component
 * @description Displays and manages search history with trending and popular searches
 */

import React, { useState, useEffect } from 'react'
import { Clock, TrendingUp, X, Trash2, Search } from 'lucide-react'
import type { SearchHistoryEntry } from '@/lib/search/types'

interface SearchHistoryProps {
  /** Maximum number of entries to show */
  maxEntries?: number
  /** Default tab to show */
  defaultTab?: 'recent' | 'popular' | 'trending'
  /** Callback when a history item is clicked */
  onSelectHistory?: (entry: SearchHistoryEntry) => void
  /** Show delete buttons */
  showDelete?: boolean
  /** Custom class name */
  className?: string
}

type HistoryTab = 'recent' | 'popular' | 'trending'

export function SearchHistory({
  maxEntries = 10,
  defaultTab = 'recent',
  onSelectHistory,
  showDelete = true,
  className = '',
}: SearchHistoryProps) {
  const [activeTab, setActiveTab] = useState<HistoryTab>(defaultTab)
  const [history, setHistory] = useState<SearchHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch history data
  const fetchHistory = async (tab: HistoryTab) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/search/history?limit=${maxEntries}&type=${tab}`)
      if (!response.ok) throw new Error('Failed to fetch history')

      const data = await response.json()
      setHistory(data.entries || [])
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching history:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  // Delete history entry
  const deleteEntry = async (query: string, event: React.MouseEvent) => {
    event.stopPropagation()

    try {
      await fetch(`/api/search/history?query=${encodeURIComponent(query)}`, {
        method: 'DELETE',
      })

      // Update local state
      setHistory(prev => prev.filter(entry => entry.query !== query))
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error deleting history:', error)
      }
    }
  }

  // Clear all history
  const clearAllHistory = async () => {
    if (!confirm('Are you sure you want to clear all search history?')) {
      return
    }

    try {
      await fetch('/api/search/history', { method: 'DELETE' })

      setHistory([])
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error clearing history:', error)
      }
    }
  }

  // Handle tab change
  const handleTabChange = (tab: HistoryTab) => {
    setActiveTab(tab)
    fetchHistory(tab)
  }

  // Load initial history
  useEffect(() => {
    fetchHistory(defaultTab)
  }, [defaultTab, maxEntries])

  // Tab configurations
  const tabs: Array<{ id: HistoryTab; label: string; icon: React.ReactNode }> = [
    { id: 'recent', label: 'Recent', icon: <Clock className="h-4 w-4" /> },
    { id: 'popular', label: 'Popular', icon: <Search className="h-4 w-4" /> },
    { id: 'trending', label: 'Trending', icon: <TrendingUp className="h-4 w-4" /> },
  ]

  // Format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Get target icon
  const getTargetIcon = (target: string) => {
    switch (target) {
      case 'tasks':
        return '📋'
      case 'projects':
        return '📁'
      case 'members':
        return '👤'
      case 'agents':
        return '🤖'
      default:
        return '🔍'
    }
  }

  // Get target label
  const getTargetLabel = (target: string) => {
    switch (target) {
      case 'tasks':
        return 'Tasks'
      case 'projects':
        return 'Projects'
      case 'members':
        return 'Members'
      case 'agents':
        return 'Agents'
      default:
        return 'All'
    }
  }

  return (
    <div
      className={`rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Search History</h2>

        {showDelete && history.length > 0 && (
          <button
            onClick={clearAllHistory}
            className="flex items-center gap-1 text-sm text-red-600 transition-colors hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-500 dark:border-zinc-600" />
          </div>
        ) : history.length > 0 ? (
          <div className="space-y-2">
            {history.map((entry, index) => (
              <button
                key={index}
                onClick={() => onSelectHistory?.(entry)}
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                <span className="text-lg">{getTargetIcon(entry.target)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {entry.query}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{getTargetLabel(entry.target)}</span>
                    <span>•</span>
                    <span>{entry.resultCount} results</span>
                    <span>•</span>
                    <span>{formatTimestamp(entry.timestamp)}</span>
                  </div>
                </div>

                {showDelete && (
                  <button
                    onClick={e => deleteEntry(entry.query, e)}
                    className="p-1.5 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-zinc-500 dark:text-zinc-400">
            <Clock className="mx-auto mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
            <p>No search history yet</p>
            <p className="mt-1 text-sm">Start searching to see your history here</p>
          </div>
        )}
      </div>
    </div>
  )
}
