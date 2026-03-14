/**
 * Database Transport for Logger
 * In-memory implementation for client-side logging
 */

import type { LogEntry, LogQuery, LogQueryResult, DbTransport } from './types';

// In-memory log storage
const logs: LogEntry[] = [];
const MAX_LOGS = 10000;

function generateId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getDbTransport(): DbTransport {
  return {
    log: (entry: LogEntry) => {
      // Add ID if not present
      if (!entry.id) {
        entry.id = generateId();
      }
      
      // Add timestamp if not present
      if (!entry.timestamp) {
        entry.timestamp = new Date().toISOString();
      }

      // Add to logs array
      logs.push(entry);

      // Trim if exceeds max
      if (logs.length > MAX_LOGS) {
        logs.splice(0, logs.length - MAX_LOGS);
      }
    },

    query: (query: LogQuery): LogQueryResult => {
      let filtered = [...logs];

      // Filter by time range
      if (query.startTime) {
        const start = new Date(query.startTime).getTime();
        filtered = filtered.filter(log => new Date(log.timestamp).getTime() >= start);
      }
      if (query.endTime) {
        const end = new Date(query.endTime).getTime();
        filtered = filtered.filter(log => new Date(log.timestamp).getTime() <= end);
      }

      // Filter by levels
      if (query.levels?.length) {
        filtered = filtered.filter(log => query.levels!.includes(log.level));
      }

      // Filter by categories
      if (query.categories?.length) {
        filtered = filtered.filter(log => query.categories!.includes(log.category));
      }

      // Filter by search term
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        filtered = filtered.filter(log => 
          log.message.toLowerCase().includes(searchLower) ||
          log.error?.message?.toLowerCase().includes(searchLower)
        );
      }

      // Filter by userId
      if (query.userId) {
        filtered = filtered.filter(log => log.userId === query.userId);
      }

      // Filter by requestId
      if (query.requestId) {
        filtered = filtered.filter(log => log.requestId === query.requestId);
      }

      // Filter by route
      if (query.route) {
        filtered = filtered.filter(log => log.route === query.route);
      }

      // Sort
      const orderBy = query.orderBy || 'timestamp';
      const order = query.order || 'desc';
      filtered.sort((a, b) => {
        if (orderBy === 'timestamp') {
          const aTime = new Date(a.timestamp).getTime();
          const bTime = new Date(b.timestamp).getTime();
          return order === 'desc' ? bTime - aTime : aTime - bTime;
        }
        // For level, use severity order
        const levelOrder = ['debug', 'info', 'warn', 'error', 'fatal'];
        const aLevel = levelOrder.indexOf(a.level);
        const bLevel = levelOrder.indexOf(b.level);
        return order === 'desc' ? bLevel - aLevel : aLevel - bLevel;
      });

      // Paginate
      const page = query.page || 1;
      const limit = Math.min(query.limit || 100, 1000);
      const startIndex = (page - 1) * limit;
      const paginatedLogs = filtered.slice(startIndex, startIndex + limit);

      return {
        logs: paginatedLogs,
        total: filtered.length,
        page,
        limit,
        hasMore: startIndex + limit < filtered.length,
      };
    },

    cleanup: (days: number): number => {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const initialLength = logs.length;
      
      for (let i = logs.length - 1; i >= 0; i--) {
        if (new Date(logs[i].timestamp).getTime() < cutoff) {
          logs.splice(i, 1);
        }
      }
      
      return initialLength - logs.length;
    },

    count: (query: LogQuery): number => {
      let filtered = [...logs];

      // Filter by time range
      if (query.startTime) {
        const start = new Date(query.startTime).getTime();
        filtered = filtered.filter(log => new Date(log.timestamp).getTime() >= start);
      }
      if (query.endTime) {
        const end = new Date(query.endTime).getTime();
        filtered = filtered.filter(log => new Date(log.timestamp).getTime() <= end);
      }

      // Filter by levels
      if (query.levels?.length) {
        filtered = filtered.filter(log => query.levels!.includes(log.level));
      }

      // Filter by categories
      if (query.categories?.length) {
        filtered = filtered.filter(log => query.categories!.includes(log.category));
      }

      // Filter by userId
      if (query.userId) {
        filtered = filtered.filter(log => log.userId === query.userId);
      }

      return filtered.length;
    },
  };
}

// Export singleton instance
let dbTransportInstance: DbTransport | null = null;

export function getDbTransportSingleton(): DbTransport {
  if (!dbTransportInstance) {
    dbTransportInstance = getDbTransport();
  }
  return dbTransportInstance;
}