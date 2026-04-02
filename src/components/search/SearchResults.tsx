'use client'

/**
 * @fileoverview Search results component
 * @description Displays search results with highlighting and pagination
 */

import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Search, Filter, ExternalLink } from 'lucide-react'
import type { SearchResult, UnifiedEntity } from '@/lib/search/types'

interface SearchResultsProps {
  /** Search results */
  results: SearchResult<UnifiedEntity>[]
  /** Total number of results */
  total?: number
  /** Current page */
  page?: number
  /** Page size */
  pageSize?: number
  /** Callback when page changes */
  onPageChange?: (page: number) => void
  /** Callback when a result is clicked */
  onResultClick?: (result: SearchResult<UnifiedEntity>) => void
  /** Show/hide entity type filters */
  showTypeFilter?: boolean
  /** Custom class name */
  className?: string
}

export function SearchResults({
  results,
  total,
  page = 1,
  pageSize = 20,
  onPageChange,
  onResultClick,
  showTypeFilter = true,
  className = '',
}: SearchResultsProps) {
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({
    task: true,
    project: true,
    member: true,
    agent: true,
  })
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    new Set(['task', 'project', 'member', 'agent'])
  )

  // Group results by type
  const groupedResults = results.reduce<Record<string, SearchResult<UnifiedEntity>[]>>(
    (acc, result) => {
      const type = result.item.type
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(result)
      return acc
    },
    {}
  )

  // Entity type metadata
  const entityTypes = {
    task: { label: 'Tasks', icon: '📋', color: 'blue' },
    project: { label: 'Projects', icon: '📁', color: 'purple' },
    member: { label: 'Team Members', icon: '👤', color: 'green' },
    agent: { label: 'AI Agents', icon: '🤖', color: 'orange' },
  }

  // Filter results by selected types
  const filteredGroupedResults = Object.entries(groupedResults).reduce(
    (acc, [type, items]) => {
      if (selectedTypes.has(type)) {
        acc[type] = items
      }
      return acc
    },
    {} as Record<string, SearchResult<UnifiedEntity>[]>
  )

  // Calculate total filtered results
  const filteredTotal = Object.values(filteredGroupedResults).reduce(
    (sum, items) => sum + items.length,
    0
  )

  // Toggle type filter
  const toggleType = (type: string) => {
    setSelectedTypes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(type)) {
        newSet.delete(type)
      } else {
        newSet.add(type)
      }
      return newSet
    })
  }

  // Toggle expanded state
  const toggleExpanded = (type: string) => {
    setExpandedTypes(prev => ({ ...prev, [type]: !prev[type] }))
  }

  // Calculate pagination
  const totalPages = total ? Math.ceil(total / pageSize) : Math.ceil(filteredTotal / pageSize)

  // Render search highlights
  const renderHighlights = (result: SearchResult<UnifiedEntity>) => {
    if (!result.highlights || result.highlights.length === 0) {
      return null
    }

    return (
      <div className="mt-2">
        {result.highlights
          .slice(0, 2)
          .map((highlight: { field: string; text: string }, index: number) => (
            <p key={index} className="text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-500 dark:text-zinc-500">
                {highlight.field}:
              </span>{' '}
              <span
                dangerouslySetInnerHTML={{
                  __html: highlight.text.replace(
                    /<mark[^>]*>([^<]*)<\/mark>/gi,
                    '<mark class="bg-yellow-200 dark:bg-yellow-700 px-0.5 rounded">$1</mark>'
                  ),
                }}
              />
            </p>
          ))}
      </div>
    )
  }

  // Render result item
  const renderResultItem = (result: SearchResult<UnifiedEntity>) => {
    const item = result.item
    const typeInfo = entityTypes[item.type]

    return (
      <div
        key={item.id}
        className="cursor-pointer border-b border-zinc-200 p-4 transition-colors last:border-0 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-700/50"
        onClick={() => onResultClick?.(result)}
      >
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 text-2xl">{typeInfo.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                {item.name}
              </h3>
              <span
                className={`rounded-full px-2 py-0.5 text-xs bg-${typeInfo.color}-100 dark:bg-${typeInfo.color}-900 text-${typeInfo.color}-700 dark:text-${typeInfo.color}-300`}
              >
                {typeInfo.label}
              </span>
              {item.type === 'task' && item.status && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    item.status === 'open'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {item.status}
                </span>
              )}
              {item.type === 'task' && item.priority && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    item.priority === 'high'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      : item.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  }`}
                >
                  {item.priority}
                </span>
              )}
            </div>

            {item.description && (
              <p className="mb-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                {item.description}
              </p>
            )}

            {renderHighlights(result)}

            <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-500">
              {result.score !== undefined && (
                <span>Relevance: {(result.score * 100).toFixed(0)}%</span>
              )}
              {item.type === 'task' && item.assignee && <span>Assignee: {item.assignee}</span>}
              {item.type === 'member' && item.login && <span>@{item.login}</span>}
              {(item.type === 'task' || item.type === 'project') && item.updatedAt && (
                <span>Updated: {new Date(item.updatedAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render type section
  const renderTypeSection = (type: string) => {
    const items = filteredGroupedResults[type]
    if (!items || items.length === 0) return null

    const typeInfo = entityTypes[type as keyof typeof entityTypes]
    const isExpanded = expandedTypes[type]

    return (
      <div key={type} className="border-b border-zinc-200 last:border-0 dark:border-zinc-700">
        <button
          onClick={() => toggleExpanded(type)}
          className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{typeInfo.icon}</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{typeInfo.label}</span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">({items.length})</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-zinc-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-zinc-400" />
          )}
        </button>

        {isExpanded && <div>{items.map(renderResultItem)}</div>}
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-zinc-500" />
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Search Results</h2>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {total !== undefined ? total : filteredTotal} found
          </span>
        </div>

        {showTypeFilter && (
          <div className="flex items-center gap-1">
            {Object.entries(entityTypes).map(([type, info]) => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  selectedTypes.has(type)
                    ? `bg-${info.color}-100 dark:bg-${info.color}-900 text-${info.color}-700 dark:text-${info.color}-300`
                    : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'
                }`}
              >
                {info.icon} {info.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {Object.keys(filteredGroupedResults).length > 0 ? (
          Object.keys(filteredGroupedResults).map(renderTypeSection)
        ) : (
          <div className="p-12 text-center">
            <Search className="mx-auto mb-4 h-16 w-16 text-zinc-300 dark:text-zinc-600" />
            <p className="text-zinc-500 dark:text-zinc-400">No results found</p>
            <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
          <button
            onClick={() => onPageChange?.(page - 1)}
            disabled={page === 1}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-700"
          >
            Previous
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Page {page} of {totalPages}
            </span>
          </div>

          <button
            onClick={() => onPageChange?.(page + 1)}
            disabled={page === totalPages}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-700"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
