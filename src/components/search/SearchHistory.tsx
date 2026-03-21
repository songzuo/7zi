'use client';

/**
 * @fileoverview Search history component
 * @description Displays and manages search history with trending and popular searches
 */

import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, X, Trash2, Search } from 'lucide-react';
import type { SearchHistoryEntry } from '@/lib/search/types';

interface SearchHistoryProps {
  /** Maximum number of entries to show */
  maxEntries?: number;
  /** Default tab to show */
  defaultTab?: 'recent' | 'popular' | 'trending';
  /** Callback when a history item is clicked */
  onSelectHistory?: (entry: SearchHistoryEntry) => void;
  /** Show delete buttons */
  showDelete?: boolean;
  /** Custom class name */
  className?: string;
}

type HistoryTab = 'recent' | 'popular' | 'trending';

export function SearchHistory({
  maxEntries = 10,
  defaultTab = 'recent',
  onSelectHistory,
  showDelete = true,
  className = '',
}: SearchHistoryProps) {
  const [activeTab, setActiveTab] = useState<HistoryTab>(defaultTab);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch history data
  const fetchHistory = async (tab: HistoryTab) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/search/history?limit=${maxEntries}&type=${tab}`);
      if (!response.ok) throw new Error('Failed to fetch history');

      const data = await response.json();
      setHistory(data.entries || []);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching history:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Delete history entry
  const deleteEntry = async (query: string, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      await fetch(`/api/search/history?query=${encodeURIComponent(query)}`, {
        method: 'DELETE',
      });

      // Update local state
      setHistory(prev => prev.filter(entry => entry.query !== query));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error deleting history:', error);
      }
    }
  };

  // Clear all history
  const clearAllHistory = async () => {
    if (!confirm('Are you sure you want to clear all search history?')) {
      return;
    }

    try {
      await fetch('/api/search/history', { method: 'DELETE' });

      setHistory([]);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error clearing history:', error);
      }
    }
  };

  // Handle tab change
  const handleTabChange = (tab: HistoryTab) => {
    setActiveTab(tab);
    fetchHistory(tab);
  };

  // Load initial history
  useEffect(() => {
    fetchHistory(defaultTab);
  }, [defaultTab, maxEntries]);

  // Tab configurations
  const tabs: Array<{ id: HistoryTab; label: string; icon: React.ReactNode }> = [
    { id: 'recent', label: 'Recent', icon: <Clock className="w-4 h-4" /> },
    { id: 'popular', label: 'Popular', icon: <Search className="w-4 h-4" /> },
    { id: 'trending', label: 'Trending', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  // Format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get target icon
  const getTargetIcon = (target: string) => {
    switch (target) {
      case 'tasks':
        return '📋';
      case 'projects':
        return '📁';
      case 'members':
        return '👤';
      case 'agents':
        return '🤖';
      default:
        return '🔍';
    }
  };

  // Get target label
  const getTargetLabel = (target: string) => {
    switch (target) {
      case 'tasks':
        return 'Tasks';
      case 'projects':
        return 'Projects';
      case 'members':
        return 'Members';
      case 'agents':
        return 'Agents';
      default:
        return 'All';
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Search History</h2>

        {showDelete && history.length > 0 && (
          <button
            onClick={clearAllHistory}
            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
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
            <div className="inline-block w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : history.length > 0 ? (
          <div className="space-y-2">
            {history.map((entry, index) => (
              <button
                key={index}
                onClick={() => onSelectHistory?.(entry)}
                className="w-full px-3 py-2 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 group"
              >
                <span className="text-lg">{getTargetIcon(entry.target)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {entry.query}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{getTargetLabel(entry.target)}</span>
                    <span>•</span>
                    <span>{entry.resultCount} results</span>
                    <span>•</span>
                    <span>{formatTimestamp(entry.timestamp)}</span>
                  </div>
                </div>

                {showDelete && (
                  <button
                    onClick={(e) => deleteEntry(entry.query, e)}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p>No search history yet</p>
            <p className="text-sm mt-1">Start searching to see your history here</p>
          </div>
        )}
      </div>
    </div>
  );
}
