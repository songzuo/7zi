/**
 * BatchRequestManager
 * Batches multiple requests into a single request to reduce network overhead
 * Particularly useful for mobile networks with high latency
 */

interface BatchRequest {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timestamp: number;
}

interface BatchResponse {
  id: string;
  status: number;
  statusText: string;
  data?: any;
  error?: string;
}

interface BatchOptions {
  maxWaitTime: number; // Maximum time to wait before batching (ms)
  maxBatchSize: number; // Maximum number of requests in a batch
  retryAttempts: number; // Number of retry attempts on failure
  retryDelay: number; // Delay between retries (ms)
}

export class BatchRequestManager {
  private pendingRequests: Map<string, BatchRequest> = new Map();
  private pendingPromises: Map<string, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private options: BatchOptions;
  private batchEndpoint: string;

  constructor(
    batchEndpoint: string,
    options: Partial<BatchOptions> = {}
  ) {
    this.batchEndpoint = batchEndpoint;
    this.options = {
      maxWaitTime: options.maxWaitTime ?? 100, // 100ms default
      maxBatchSize: options.maxBatchSize ?? 10,
      retryAttempts: options.retryAttempts ?? 3,
      retryDelay: options.retryDelay ?? 1000,
    };
  }

  /**
   * Add request to batch
   */
  async addRequest<T = unknown>(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = this.generateRequestId();

      const request: BatchRequest = {
        id,
        url,
        method,
        headers,
        body,
        timestamp: Date.now(),
      };

      this.pendingRequests.set(id, request);
      this.pendingPromises.set(id, { resolve, reject });

      // Trigger batch if max size reached
      if (this.pendingRequests.size >= this.options.maxBatchSize) {
        this.executeBatch();
      } else {
        // Set timer to execute batch after maxWaitTime
        this.resetBatchTimer();
      }
    });
  }

  /**
   * Reset batch timer
   */
  private resetBatchTimer(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.executeBatch();
    }, this.options.maxWaitTime);
  }

  /**
   * Execute batch request
   */
  private async executeBatch(): Promise<void> {
    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Get all pending requests
    const requests = Array.from(this.pendingRequests.values());
    const promises = Array.from(this.pendingPromises.values());

    // Clear pending maps
    this.pendingRequests.clear();
    this.pendingPromises.clear();

    if (requests.length === 0) {
      return;
    }

    try {
      // Execute batch with retry logic
      const responses = await this.executeBatchWithRetry(requests);

      // Resolve all promises with their responses
      responses.forEach((response, index) => {
        const promise = promises[index];
        const request = requests[index];

        if (response.error) {
          promise.reject(new Error(response.error));
        } else {
          promise.resolve(response.data);
        }
      });
    } catch (error) {
      // Reject all promises on batch failure
      promises.forEach(promise => {
        promise.reject(error);
      });
    }
  }

  /**
   * Execute batch request with retry logic
   */
  private async executeBatchWithRetry(
    requests: BatchRequest[]
  ): Promise<BatchResponse[]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.options.retryAttempts; attempt++) {
      try {
        const responses = await this.sendBatchRequest(requests);
        return responses;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on the last attempt
        if (attempt < this.options.retryAttempts) {
          // Wait before retrying
          await this.delay(this.options.retryDelay * (attempt + 1));
        }
      }
    }

    throw lastError;
  }

  /**
   * Send batch request to server
   */
  private async sendBatchRequest(
    requests: BatchRequest[]
  ): Promise<BatchResponse[]> {
    const response = await fetch(this.batchEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Batch-Request': 'true',
      },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      throw new Error(`Batch request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.responses || [];
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cancel all pending requests
   */
  cancelAll(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Reject all pending promises
    this.pendingPromises.forEach(({ reject }) => {
      reject(new Error('Request cancelled'));
    });

    this.pendingRequests.clear();
    this.pendingPromises.clear();
  }

  /**
   * Get pending request count
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Update options
   */
  updateOptions(options: Partial<BatchOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

/**
 * DeduplicatedRequestCache
 * Caches in-flight requests to avoid duplicate network calls
 */
export class DeduplicatedRequestCache {
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL: number;

  constructor(cacheTTL: number = 5000) {
    this.cacheTTL = cacheTTL;
  }

  /**
   * Execute request with deduplication and caching
   */
  async request<T = unknown>(
    key: string,
    requestFn: () => Promise<T>,
    bypassCache = false
  ): Promise<T> {
    // Check cache first
    if (!bypassCache) {
      const cached = this.cache.get(key);
      if (cached) {
        const age = Date.now() - cached.timestamp;
        if (age < this.cacheTTL) {
          return cached.data as T;
        }
      }
    }

    // Check if request is in-flight
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending;
    }

    // Execute request
    const promise = requestFn()
      .then(data => {
        // Cache successful response
        this.cache.set(key, { data, timestamp: Date.now() });
        return data;
      })
      .finally(() => {
        // Remove from pending
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Clear cache entry
   */
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Clear old cache entries
   */
  clearOldEntries(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      const age = now - value.timestamp;
      if (age > this.cacheTTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Update cache TTL
   */
  updateTTL(ttl: number): void {
    this.cacheTTL = ttl;
  }
}

// Preconfigured instances
export const batchManager = new BatchRequestManager('/api/batch');
export const requestCache = new DeduplicatedRequestCache();

export default BatchRequestManager;
er;
