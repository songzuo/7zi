/**
 * Request Logs Component
 * 
 * Display and filter rate limit request logs
 * 
 * @version 1.12.0
 */

import { useState } from 'react'
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  User,
  Key
} from 'lucide-react'
import { useRequestLogs, type RateLimitLog } from '../hooks/useRateLimitApi'
import { formatDate } from '../hooks/useRateLimitApi'

export function RequestLogs() {
  const { logs, loading, error, refresh } = useRequestLogs()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAllowed, setFilterAllowed] = useState<'all' | 'allowed' | 'rejected'>('all')
  const [filterLayer, setFilterLayer] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const filteredLogs = logs.filter(log => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!log.ip.toLowerCase().includes(query) &&
          !log.path.toLowerCase().includes(query) &&
          !log.apiKey?.toLowerCase().includes(query) &&
          !log.userId?.toLowerCase().includes(query)) {
        return false
      }
    }

    // Allowed/Rejected filter
    if (filterAllowed === 'allowed' && !log.allowed) return false
    if (filterAllowed === 'rejected' && log.allowed) return false

    // Layer filter
    if (filterLayer !== 'all' && log.layer !== filterLayer) return false

    return true
  })

  const totalPages = Math.ceil(filteredLogs.length / pageSize)
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const handleRefresh = () => {
    refresh()
    setCurrentPage(1)
  }

  const getLayerIcon = (layer: string) => {
    switch (layer) {
      case 'ip':
        return <Globe className="h-4 w-4" />
      case 'user':
        return <User className="h-4 w-4" />
      case 'api-key':
        return <Key className="h-4 w-4" />
      default:
        return <Globe className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Request Logs
          </h2>
          <span className="px-2.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300">
            {filteredLogs.length} entries
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
          <span className="text-sm text-red-600 dark:text-red-300">{error.message}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Search by IP, path, API key, or user ID..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Allowed Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filterAllowed}
            onChange={(e) => {
              setFilterAllowed(e.target.value as typeof filterAllowed)
              setCurrentPage(1)
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="allowed">Allowed</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={filterLayer}
            onChange={(e) => {
              setFilterLayer(e.target.value)
              setCurrentPage(1)
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Layers</option>
            <option value="global">Global</option>
            <option value="ip">IP</option>
            <option value="api-key">API Key</option>
            <option value="user">User</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : paginatedLogs.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Layer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Request
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Usage
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedLogs.map((log) => (
                    <LogRow key={log.id} log={log} getLayerIcon={getLayerIcon} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length} entries
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No log entries found</p>
            <p className="text-sm">Try adjusting your filters or wait for new requests</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface LogRowProps {
  log: RateLimitLog
  getLayerIcon: (layer: string) => React.ReactNode
}

function LogRow({ log, getLayerIcon }: LogRowProps) {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        {log.allowed ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Allowed
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </span>
        )}
      </td>

      {/* Timestamp */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-2" />
          {formatDate(log.timestamp)}
        </div>
      </td>

      {/* Layer */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
          {getLayerIcon(log.layer)}
          <span className="ml-1 capitalize">{log.layer}</span>
        </span>
      </td>

      {/* Client */}
      <td className="px-6 py-4">
        <div className="text-sm">
          <div className="font-medium text-gray-900 dark:text-white font-mono">
            {log.ip}
          </div>
          {log.apiKey && (
            <div className="text-gray-500 dark:text-gray-400 font-mono text-xs">
              Key: {log.apiKey}
            </div>
          )}
          {log.userId && (
            <div className="text-gray-500 dark:text-gray-400 text-xs">
              User: {log.userId}
            </div>
          )}
        </div>
      </td>

      {/* Request */}
      <td className="px-6 py-4">
        <div className="text-sm">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-2 ${
            log.method === 'GET' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
            log.method === 'POST' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
            log.method === 'PUT' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
            log.method === 'DELETE' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}>
            {log.method}
          </span>
          <span className="text-gray-600 dark:text-gray-300 font-mono text-xs">
            {log.path}
          </span>
        </div>
      </td>

      {/* Usage */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-3">
          <div className="flex-1 max-w-[100px]">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500 dark:text-gray-400">
                {log.remaining}/{log.limit}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${
                  log.remaining / log.limit < 0.2 ? 'bg-red-500' :
                  log.remaining / log.limit < 0.5 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${(log.remaining / log.limit) * 100}%` }}
              />
            </div>
          </div>
          {log.retryAfter && (
            <span className="text-xs text-red-500">
              Retry: {log.retryAfter}s
            </span>
          )}
        </div>
      </td>
    </tr>
  )
}
