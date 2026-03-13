/**
 * Logger Types
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'audit';
export type LogCategory = 'api' | 'auth' | 'database' | 'system' | 'user' | 'security' | 'performance' | 'error' | 'client_error';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  userId?: string;
  requestId?: string;
  route?: string;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LogQuery {
  startTime?: string;
  endTime?: string;
  levels?: LogLevel[];
  categories?: LogCategory[];
  search?: string;
  userId?: string;
  requestId?: string;
  route?: string;
  page?: number;
  limit?: number;
  orderBy?: 'timestamp' | 'level';
  order?: 'asc' | 'desc';
}

export interface LogQueryResult {
  logs: LogEntry[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface DbTransport {
  log: (entry: LogEntry) => void;
  query: (query: LogQuery) => LogQueryResult;
  cleanup: (days: number) => number;
}