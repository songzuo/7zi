/**
 * Performance Monitoring for WebSocket/Collaboration
 *
 * Tracks performance metrics for real-time collaboration features
 */

// ============================================================================
// Types
// ============================================================================

export interface PerformanceMetrics {
  // Connection metrics
  connectionTime: number;
  reconnectionCount: number;

  // Message metrics
  messagesReceived: number;
  messagesSent: number;
  messagesPerSecond: number;

  // Operation metrics
  operationsReceived: number;
  operationsProcessed: number;
  averageOperationLatency: number;

  // Room metrics
  roomsJoined: number;
  roomJoinLatency: number;

  // Broadcast metrics
  broadcastsCount: number;
  averageBroadcastLatency: number;

  // Memory metrics (if available)
  memoryUsage?: number;

  // Custom metrics
  customMetrics: Map<string, number>;
}

export interface MetricSnapshot {
  timestamp: number;
  metrics: PerformanceMetrics;
}

// ============================================================================
// Performance Monitor
// ============================================================================

class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private startTime: number;
  private snapshots: MetricSnapshot[];
  private maxSnapshots: number = 100;
  private messageCountInterval: number[] = [];
  private operationLatencies: number[] = [];
  private broadcastLatencies: number[] = [];

  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      connectionTime: 0,
      reconnectionCount: 0,
      messagesReceived: 0,
      messagesSent: 0,
      messagesPerSecond: 0,
      operationsReceived: 0,
      operationsProcessed: 0,
      averageOperationLatency: 0,
      roomsJoined: 0,
      roomJoinLatency: 0,
      broadcastsCount: 0,
      averageBroadcastLatency: 0,
      customMetrics: new Map(),
    };
    this.snapshots = [];

    // Start periodic metrics calculation
    this.startPeriodicCalculation();
  }

  // Record connection time
  recordConnectionTime(time: number): void {
    this.metrics.connectionTime = time;
    this.logDebug('Connection time', { time });
  }

  // Increment reconnection count
  incrementReconnectionCount(): void {
    this.metrics.reconnectionCount++;
    this.logDebug('Reconnection count', { count: this.metrics.reconnectionCount });
  }

  // Record message received
  recordMessageReceived(): void {
    this.metrics.messagesReceived++;
    this.messageCountInterval.push(Date.now());
  }

  // Record message sent
  recordMessageSent(): void {
    this.metrics.messagesSent++;
  }

  // Record operation received
  recordOperationReceived(): void {
    this.metrics.operationsReceived++;
  }

  // Record operation processed with latency
  recordOperationProcessed(latency: number): void {
    this.metrics.operationsProcessed++;
    this.operationLatencies.push(latency);

    // Keep only last 100 latencies
    if (this.operationLatencies.length > 100) {
      this.operationLatencies.shift();
    }

    this.updateAverageOperationLatency();
  }

  // Record room joined
  recordRoomJoined(latency: number): void {
    this.metrics.roomsJoined++;
    this.metrics.roomJoinLatency = latency;
    this.logDebug('Room joined', { latency });
  }

  // Record broadcast
  recordBroadcast(latency: number): void {
    this.metrics.broadcastsCount++;
    this.broadcastLatencies.push(latency);

    // Keep only last 100 latencies
    if (this.broadcastLatencies.length > 100) {
      this.broadcastLatencies.shift();
    }

    this.updateAverageBroadcastLatency();
  }

  // Set custom metric
  setCustomMetric(key: string, value: number): void {
    this.metrics.customMetrics.set(key, value);
  }

  // Update average operation latency
  private updateAverageOperationLatency(): void {
    if (this.operationLatencies.length === 0) {
      this.metrics.averageOperationLatency = 0;
    } else {
      const sum = this.operationLatencies.reduce((a, b) => a + b, 0);
      this.metrics.averageOperationLatency = sum / this.operationLatencies.length;
    }
  }

  // Update average broadcast latency
  private updateAverageBroadcastLatency(): void {
    if (this.broadcastLatencies.length === 0) {
      this.metrics.averageBroadcastLatency = 0;
    } else {
      const sum = this.broadcastLatencies.reduce((a, b) => a + b, 0);
      this.metrics.averageBroadcastLatency = sum / this.broadcastLatencies.length;
    }
  }

  // Calculate messages per second
  private calculateMessagesPerSecond(): void {
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Remove old message timestamps
    this.messageCountInterval = this.messageCountInterval.filter(
      timestamp => timestamp > oneSecondAgo
    );

    this.metrics.messagesPerSecond = this.messageCountInterval.length;
  }

  // Start periodic metrics calculation
  private startPeriodicCalculation(): void {
    setInterval(() => {
      this.calculateMessagesPerSecond();
      this.takeSnapshot();
      this.updateMemoryUsage();
    }, 1000); // Every second
  }

  // Update memory usage (if available)
  private updateMemoryUsage(): void {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }
  }

  // Take a snapshot of current metrics
  private takeSnapshot(): void {
    const snapshot: MetricSnapshot = {
      timestamp: Date.now(),
      metrics: { ...this.metrics, customMetrics: new Map(this.metrics.customMetrics) },
    };

    this.snapshots.push(snapshot);

    // Keep only last N snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  // Get current metrics
  getCurrentMetrics(): PerformanceMetrics {
    return { ...this.metrics, customMetrics: new Map(this.metrics.customMetrics) };
  }

  // Get recent snapshots
  getRecentSnapshots(count: number = 10): MetricSnapshot[] {
    return this.snapshots.slice(-count);
  }

  // Get performance summary
  getPerformanceSummary(): string {
    const uptime = Date.now() - this.startTime;
    const uptimeSeconds = Math.floor(uptime / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);

    return `
=== WebSocket Performance Summary ===
Uptime: ${uptimeMinutes}m ${uptimeSeconds % 60}s
Connections: ${this.metrics.reconnectionCount + 1}
Messages Received: ${this.metrics.messagesReceived}
Messages Sent: ${this.metrics.messagesSent}
Messages/Second: ${this.metrics.messagesPerSecond.toFixed(2)}
Operations Processed: ${this.metrics.operationsProcessed}
Avg Operation Latency: ${this.metrics.averageOperationLatency.toFixed(2)}ms
Rooms Joined: ${this.metrics.roomsJoined}
Broadcasts: ${this.metrics.broadcastsCount}
Avg Broadcast Latency: ${this.metrics.averageBroadcastLatency.toFixed(2)}ms
${this.metrics.memoryUsage ? `Memory Usage: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB` : ''}
=====================================
    `.trim();
  }

  // Reset metrics
  reset(): void {
    this.startTime = Date.now();
    this.metrics = {
      connectionTime: 0,
      reconnectionCount: 0,
      messagesReceived: 0,
      messagesSent: 0,
      messagesPerSecond: 0,
      operationsReceived: 0,
      operationsProcessed: 0,
      averageOperationLatency: 0,
      roomsJoined: 0,
      roomJoinLatency: 0,
      broadcastsCount: 0,
      averageBroadcastLatency: 0,
      customMetrics: new Map(),
    };
    this.snapshots = [];
    this.messageCountInterval = [];
    this.operationLatencies = [];
    this.broadcastLatencies = [];
    this.logDebug('Metrics reset');
  }

  // Debug logging (only in development)
  private logDebug(message: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[WebSocket Performance] ${message}`, data);
    }
  }
}

// ============================================================================
// Global instance
// ============================================================================

export const performanceMonitor = new PerformanceMonitor();

// ============================================================================
// Performance timer utility
// ============================================================================

export class PerformanceTimer {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  end(): number {
    return Date.now() - this.startTime;
  }
}

// ============================================================================
// Export
// ============================================================================

export default performanceMonitor;
