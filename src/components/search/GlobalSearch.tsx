'use client';

/**
 * @fileoverview Global search component
 * @description Advanced search UI with autocomplete, filters, and results display
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Clock, TrendingUp, Filter, ChevronDown } from 'lucide-react';
import type { UnifiedEntity } from '@/lib/search/types';

/**
 * Search filter state
 */
interface SearchFilterState {
  status?: string[];
  priority?: string[];
  assignee?: string[];
  labels?: string[];
  [key: string]: string[] | undefined;
}

/**
 * Search result item
 */
interface SearchResultItem {
  text?: string;
  name?: string;
  entity?: UnifiedEntity;
  [key: string]: unknown;
}

/**
 * History entry item
 */
interface HistoryEntryItem {
  query: string;
  timestamp: number;
  resultCount?: number;
  target?: string;
}

/**
 * Autocomplete suggestion item
 */
interface AutocompleteSuggestionItem {
  text: string;
  type: 'history' | 'suggestion' | 'entity';
  entity?: {
    type: string;
    [key: string]: unknown;
  };
  score?: number;
}

interface GlobalSearchProps {
  /** Default search target */
  defaultTarget?: 'all' | 'tasks' | 'projects' | 'members' | 'agents';
  /** Placeholder text */
  placeholder?: string;
  /** Maximum number of results to show */
  maxResults?: number;
  /** Callback when a result is selected */
  onSelectResult?: (result: UnifiedEntity) => void;
  /** Show advanced filters */
  showFilters?: boolean;
  /** Show history */
  showHistory?: boolean;
  /** Custom class name */
  className?: string;
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
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [target, setTarget] = useState(defaultTarget);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestionItem[]>([]);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [history, setHistory] = useState<HistoryEntryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<SearchFilterState>({});

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch autocomplete suggestions
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(
        `/api/search/autocomplete?q=${encodeURIComponent(searchQuery)}&target=${target}&limit=8`,
        { signal: abortControllerRef.current.signal }
      );

      if (!response.ok) throw new Error('Failed to fetch suggestions');

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error fetching suggestions:', error);
      }
    }
  }, [target]);

  // Fetch search results
  const fetchResults = useCallback(async (searchQuery: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        target,
        limit: maxResults.toString(),
      });

      // Add filters
      Object.entries(selectedFilters).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
          params.append(key, value.join(','));
        } else if (value) {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`/api/search?${params}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Failed to search');

      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error searching:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [target, maxResults, selectedFilters]);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/search/history?limit=5&type=recent');
      if (!response.ok) throw new Error('Failed to fetch history');

      const data = await response.json();
      setHistory(data.entries || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  }, []);

  // Handle input change
  const handleInputChange = (value: string) => {
    setQuery(value);

    if (value.trim()) {
      fetchSuggestions(value);
    } else {
      setSuggestions([]);
      setResults([]);
    }
  };

  // Handle search submit
  const handleSearch = () => {
    if (query.trim()) {
      fetchResults(query);
    }
  };

  // Handle result selection
  const handleSelectResult = (result: SearchResultItem) => {
    setQuery(result.text || result.name || '');
    setResults([result]);
    setSuggestions([]);
    setIsOpen(false);

    if (onSelectResult && result.entity) {
      onSelectResult(result.entity);
    }
  };

  // Handle history selection
  const handleSelectHistory = (entry: HistoryEntryItem) => {
    setQuery(entry.query);
    fetchResults(entry.query);
    setSuggestions([]);
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load history on mount
  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory, fetchHistory]);

  // Entity type icons
  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'task':
        return '📋';
      case 'project':
        return '📁';
      case 'member':
        return '👤';
      case 'agent':
        return '🤖';
      default:
        return '🔍';
    }
  };

  // Entity type colors
  const getEntityColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'text-blue-600 dark:text-blue-400';
      case 'project':
        return 'text-purple-600 dark:text-purple-400';
      case 'member':
        return 'text-green-600 dark:text-green-400';
      case 'agent':
        return 'text-orange-600 dark:text-orange-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
          <Search className="w-5 h-5 text-gray-400 ml-3 flex-shrink-0" />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 px-3 py-3 bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500"
          />

          {query && (
            <button
              onClick={clearSearch}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {showFilters && (
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors border-l border-gray-300 dark:border-gray-600"
            >
              <Filter className="w-5 h-5" />
            </button>
          )}

          {/* Target Selector */}
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as 'all' | 'tasks' | 'projects' | 'members' | 'agents')}
            className="px-3 py-3 bg-gray-100 dark:bg-gray-700 border-l border-gray-300 dark:border-gray-600 outline-none text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
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
          <div className="mt-2 p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Advanced Filters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Status
                </label>
                <select
                  value={selectedFilters.status?.[0] || ''}
                  onChange={(e) =>
                    setSelectedFilters((prev) => ({
                      ...prev,
                      status: e.target.value ? [e.target.value] : [],
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent outline-none"
                >
                  <option value="">All</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="in_progress">In Progress</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Priority
                </label>
                <select
                  value={selectedFilters.priority?.[0] || ''}
                  onChange={(e) =>
                    setSelectedFilters((prev) => ({
                      ...prev,
                      priority: e.target.value ? [e.target.value] : [],
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent outline-none"
                >
                  <option value="">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Assignee
                </label>
                <input
                  type="text"
                  value={selectedFilters.assignee?.[0] || ''}
                  onChange={(e) =>
                    setSelectedFilters((prev) => ({
                      ...prev,
                      assignee: e.target.value ? [e.target.value] : [],
                    }))
                  }
                  placeholder="Filter by assignee"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-50 max-h-[500px] overflow-y-auto">
          {/* Suggestions */}
          {query.trim() && suggestions.length > 0 && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Suggestions
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectResult(suggestion)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-3 transition-colors"
                >
                  {suggestion.type === 'history' && (
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  {suggestion.type === 'entity' && (
                    <span className="text-lg flex-shrink-0">
                      {getEntityIcon(suggestion.entity?.type || 'task')}
                    </span>
                  )}
                  <span className="flex-1 truncate">
                    {suggestion.text}
                  </span>
                  {suggestion.entity && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getEntityColor(suggestion.entity.type)}`}>
                      {suggestion.entity.type}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* History */}
          {!query.trim() && showHistory && history.length > 0 && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recent Searches
              </div>
              {history.map((entry, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectHistory(entry)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-3 transition-colors"
                >
                  <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
                    {entry.query}
                  </span>
                  <span className="text-xs text-gray-500">
                    {entry.resultCount} results
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Results */}
          {query.trim() && results.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center justify-between">
                <span>Results</span>
                {isLoading && <span className="text-blue-500">Loading...</span>}
              </div>
              {results.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectResult(result)}
                  className="w-full px-3 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">
                      {getEntityIcon(result.item?.type || 'task')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {result.item?.name || result.item?.title}
                        </span>
                        {result.item?.type && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getEntityColor(result.item.type)}`}>
                            {result.item.type}
                          </span>
                        )}
                      </div>
                      {result.item?.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {result.item.description}
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
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-1">Try different keywords or filters</p>
            </div>
          )}

          {/* Loading */}
          {isLoading && results.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <div className="inline-block w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
              <p className="mt-3">Searching...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
