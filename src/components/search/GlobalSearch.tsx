'use client'

/**
 * @fileoverview Global search component
 * @description Advanced search UI with autocomplete, filters, and results display
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Clock, TrendingUp, Filter, ChevronDown } from 'lucide-react'
import type { UnifiedEntity } from '@/lib/search/types'

/**
 * Search filter state
 */
interface SearchFilterState {
  status?: string[]
  priority?: string[]
  assignee?: string[]
  labels?: string[]
  [key: string]: string[] | undefined
}

/**
 * Search result item
 */
interface SearchResultItem {
  text?: string
  name?: string
  entity?: UnifiedEntity
  [key: string]: unknown
}

/**
 * History entry item
 */
interface HistoryEntryItem {
  query: string
  timestamp: number
  resultCount?: number
  target?: string
}

/**
 * Autocomplete suggestion item
 */
interface AutocompleteSuggestionItem {
  text: string
  type: 'history' | 'suggestion' | 'entity'
  entity?: {
    type: string
    [key: string]: unknown
  }
  score?: number
}

interface GlobalSearchProps {
  /** Default search target */
  defaultTarget?: 'all' | 'tasks' | 'projects' | 'members' | 'agents'
  /** Placeholder text */
  placeholder?: string
  /** Maximum number of results to show */
  maxResults?: number
  /** Callback when a result is selected */
  onSelectResult?: (result: UnifiedEntity) => void
  /** Show advanced filters */
  showFilters?: boolean
  /** Show history */
  showHistory?: boolean
  /** Custom class name */
  className?: string
}

export function GlobalSearch({
  defaultTarget = 'all',
  placeholder = 'Search tasks, projects, members, agents...',
  maxResults = 50,
  onSelectResult,
  showFilters = true,
  showHistory = true,
  className = '',
}: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [target, setTarget] = useState(defaultTarget)
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestionItem[]>([])
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [history, setHistory] = useState<HistoryEntryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState<SearchFilterState>({})

  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Fetch autocomplete suggestions
  const fetchSuggestions = useCallback(
    async (searchQuery: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      try {
        const response = await fetch(
          `/api/search/autocomplete?q=${encodeURIComponent(searchQuery)}&target=${target}&limit=8`,
          { signal: abortControllerRef.current.signal }
        )

        if (!response.ok) throw new Error('Failed to fetch suggestions')

        const data = await response.json()
        setSuggestions(data.suggestions || [])
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error fetching suggestions:', error)
        }
      }
    },
    [target]
  )

  // Fetch search results
  const fetchResults = useCallback(
    async (searchQuery: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()
      setIsLoading(true)

      try {
        const params = new URLSearchParams({
          q: searchQuery,
          target,
          limit: maxResults.toString(),
        })

        // Add filters
        Object.entries(selectedFilters).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            params.append(key, value.join(','))
          } else if (value) {
            params.append(key, String(value))
          }
        })

        const response = await fetch(`/api/search?${params}`, {
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) throw new Error('Failed to search')

        const data = await response.json()
        setResults(data.results || [])
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error searching:', error)
          }
        }
      } finally {
        setIsLoading(false)
      }
    },
    [target, maxResults, selectedFilters]
  )

  // Fetch history
  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/search/history?limit=5&type=recent')
      if (!response.ok) throw new Error('Failed to fetch history')

      const data = await response.json()
      setHistory(data.entries || [])
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching history:', error)
      }
    }
  }, [])

  // Handle input change
  const handleInputChange = (value: string) => {
    setQuery(value)

    if (value.trim()) {
      fetchSuggestions(value)
    } else {
      setSuggestions([])
      setResults([])
    }
  }

  // Handle search submit
  const handleSearch = () => {
    if (query.trim()) {
      fetchResults(query)
    }
  }

  // Handle result selection
  const handleSelectResult = (result: SearchResultItem) => {
    setQuery(result.text || result.name || '')
    setResults([result])
    setSuggestions([])
    setIsOpen(false)

    if (onSelectResult && result.entity) {
      onSelectResult(result.entity)
    }
  }

  // Handle history selection
  const handleSelectHistory = (entry: HistoryEntryItem) => {
    setQuery(entry.query)
    fetchResults(entry.query)
    setSuggestions([])
  }

  // Clear search
  const clearSearch = () => {
    setQuery('')
    setResults([])
    setSuggestions([])
    inputRef.current?.focus()
  }

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load history on mount
  useEffect(() => {
    if (showHistory) {
      fetchHistory()
    }
  }, [showHistory, fetchHistory])

  // Entity type icons
  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'task':
        return '📋'
      case 'project':
        return '📁'
      case 'member':
        return '👤'
      case 'agent':
        return '🤖'
      default:
        return '🔍'
    }
  }

  // Entity type colors
  const getEntityColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'text-blue-600 dark:text-blue-400'
      case 'project':
        return 'text-purple-600 dark:text-purple-400'
      case 'member':
        return 'text-green-600 dark:text-green-400'
      case 'agent':
        return 'text-orange-600 dark:text-orange-400'
      default:
        return 'text-zinc-600 dark:text-zinc-400'
    }
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="flex items-center gap-2 overflow-hidden rounded-lg border border-zinc-300 bg-white transition-all focus-within:border-transparent focus-within:ring-2 focus-within:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800">
          <Search className="ml-3 h-5 w-5 flex-shrink-0 text-zinc-400" />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleInputChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent px-3 py-3 text-zinc-900 placeholder-gray-500 outline-none dark:text-zinc-100"
          />

          {query && (
            <button
              onClick={clearSearch}
              className="p-2 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          {showFilters && (
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="border-l border-zinc-300 p-2 text-zinc-400 transition-colors hover:text-zinc-600 dark:border-zinc-600 dark:hover:text-zinc-300"
            >
              <Filter className="h-5 w-5" />
            </button>
          )}

          {/* Target Selector */}
          <select
            value={target}
            onChange={e =>
              setTarget(e.target.value as 'all' | 'tasks' | 'projects' | 'members' | 'agents')
            }
            className="cursor-pointer border-l border-zinc-300 bg-zinc-100 px-3 py-3 text-sm font-medium text-zinc-700 outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
          >
            <option value="all">All</option>
            <option value="tasks">Tasks</option>
            <option value="projects">Projects</option>
            <option value="members">Members</option>
            <option value="agents">Agents</option>
          </select>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="mt-2 rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-600 dark:bg-zinc-800">
            <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Advanced Filters
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
                  Status
                </label>
                <select
                  value={selectedFilters.status?.[0] || ''}
                  onChange={e =>
                    setSelectedFilters(prev => ({
                      ...prev,
                      status: e.target.value ? [e.target.value] : [],
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none dark:border-zinc-600"
                >
                  <option value="">All</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="in_progress">In Progress</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
                  Priority
                </label>
                <select
                  value={selectedFilters.priority?.[0] || ''}
                  onChange={e =>
                    setSelectedFilters(prev => ({
                      ...prev,
                      priority: e.target.value ? [e.target.value] : [],
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none dark:border-zinc-600"
                >
                  <option value="">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
                  Assignee
                </label>
                <input
                  type="text"
                  value={selectedFilters.assignee?.[0] || ''}
                  onChange={e =>
                    setSelectedFilters(prev => ({
                      ...prev,
                      assignee: e.target.value ? [e.target.value] : [],
                    }))
                  }
                  placeholder="Filter by assignee"
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none dark:border-zinc-600"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 left-0 z-50 mt-2 max-h-[500px] overflow-y-auto rounded-lg border border-zinc-300 bg-white shadow-xl dark:border-zinc-600 dark:bg-zinc-800">
          {/* Suggestions */}
          {query.trim() && suggestions.length > 0 && (
            <div className="border-b border-zinc-200 p-2 dark:border-zinc-700">
              <div className="px-3 py-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                Suggestions
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectResult(suggestion as unknown as SearchResultItem)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  {suggestion.type === 'history' && (
                    <Clock className="h-4 w-4 flex-shrink-0 text-zinc-400" />
                  )}
                  {suggestion.type === 'entity' && (
                    <span className="flex-shrink-0 text-lg">
                      {getEntityIcon(suggestion.entity?.type || 'task')}
                    </span>
                  )}
                  <span className="flex-1 truncate">{suggestion.text}</span>
                  {suggestion.entity && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${getEntityColor(suggestion.entity.type)}`}
                    >
                      {suggestion.entity.type}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* History */}
          {!query.trim() && showHistory && history.length > 0 && (
            <div className="border-b border-zinc-200 p-2 dark:border-zinc-700">
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                <Clock className="h-4 w-4" />
                Recent Searches
              </div>
              {history.map((entry, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectHistory(entry)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  <Clock className="h-4 w-4 flex-shrink-0 text-zinc-400" />
                  <span className="flex-1 truncate text-zinc-700 dark:text-zinc-300">
                    {entry.query}
                  </span>
                  <span className="text-xs text-zinc-500">{entry.resultCount} results</span>
                </button>
              ))}
            </div>
          )}

          {/* Results */}
          {query.trim() && results.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                <span>Results</span>
                {isLoading && <span className="text-blue-500">Loading...</span>}
              </div>
              {results.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectResult(result)}
                  className="w-full rounded-lg border-b border-zinc-100 px-3 py-3 text-left transition-colors last:border-0 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-700"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex-shrink-0 text-lg">
                      {getEntityIcon(result.entity?.type || 'task')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                          {result.entity?.name}
                        </span>
                        {result.entity?.type && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${getEntityColor(result.entity.type)}`}
                          >
                            {result.entity.type}
                          </span>
                        )}
                      </div>
                      {result.entity?.description && (
                        <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                          {result.entity.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {query.trim() && !isLoading && results.length === 0 && suggestions.length === 0 && (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
              <Search className="mx-auto mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
              <p>No results found for "{query}"</p>
              <p className="mt-1 text-sm">Try different keywords or filters</p>
            </div>
          )}

          {/* Loading */}
          {isLoading && results.length === 0 && (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-500 dark:border-zinc-600" />
              <p className="mt-3">Searching...</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
