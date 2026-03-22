#!/usr/bin/env node

/**
 * WebSocket/Collaboration Performance Test Script
 *
 * Tests and measures performance of optimized WebSocket features:
 * - Connection establishment
 * - Room joining
 * - Message broadcasting
 * - Cursor updates (throttled)
 * - Operation batching
 */

const { io } = require('socket.io-client');
const crypto = require('crypto');

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  SERVER_URL: 'http://localhost:3000',
  TEST_USER_COUNT: 5,
  TEST_DURATION_MS: 30000, // 30 seconds
  CURSOR_UPDATE_INTERVAL_MS: 50, // High-frequency cursor updates
  OPERATION_BATCH_SIZE: 10,
  METRICS_SAMPLE_INTERVAL_MS: 1000,
} as const;

// ============================================================================
// Test Utilities
// ============================================================================

class TestMetrics {
  constructor() {
    this.metrics = {
      connections: { success: 0, failed: 0, totalTime: 0 },
      roomJoins: { success: 0, failed: 0, totalTime: 0 },
      messagesSent: 0,
      messagesReceived: 0,
      cursorUpdates: 0,
      operationsSent: 0,
      operationsReceived: 0,
      broadcastLatencies: [],
      errors: [],
      samples: [],
    };
    this.startTime = Date.now();
  }

  recordConnection(success: boolean, time: number): void {
    if (success) {
      this.metrics.connections.success++;
      this.metrics.connections.totalTime += time;
    } else {
      this.metrics.connections.failed++;
    }
  }

  recordRoomJoin(success: boolean, time: number): void {
    if (success) {
      this.metrics.roomJoins.success++;
      this.metrics.roomJoins.totalTime += time;
    } else {
      this.metrics.roomJoins.failed++;
    }
  }

  recordMessage(type: 'sent' | 'received'): void {
    if (type === 'sent') {
      this.metrics.messagesSent++;
    } else {
      this.metrics.messagesReceived++;
    }
  }

  recordCursorUpdate(): void {
    this.metrics.cursorUpdates++;
  }

  recordOperation(type: 'sent' | 'received'): void {
    if (type === 'sent') {
      this.metrics.operationsSent++;
    } else {
      this.metrics.operationsReceived++;
    }
  }

  recordBroadcastLatency(latency: number): void {
    this.metrics.broadcastLatencies.push(latency);
    if (this.metrics.broadcastLatencies.length > 100) {
      this.metrics.broadcastLatencies.shift();
    }
  }

  recordError(error: string): void {
    this.metrics.errors.push(error);
  }

  takeSample(): void {
    this.metrics.samples.push({
      timestamp: Date.now(),
      elapsed: Date.now() - this.startTime,
      messagesSent: this.metrics.messagesSent,
      messagesReceived: this.metrics.messagesReceived,
    });
  }

  getReport(): string {
    const avgConnectionTime = this.metrics.connections.success > 0
      ? this.metrics.connections.totalTime / this.metrics.connections.success
      : 0;

    const avgRoomJoinTime = this.metrics.roomJoins.success > 0
      ? this.metrics.roomJoins.totalTime / this.metrics.roomJoins.success
      : 0;

    const avgBroadcastLatency = this.metrics.broadcastLatencies.length > 0
      ? this.metrics.broadcastLatencies.reduce((a, b) => a + b, 0) / this.metrics.broadcastLatencies.length
      : 0;

    const elapsedTime = Date.now() - this.startTime;
    const messagesPerSecond = (this.metrics.messagesReceived / elapsedTime) * 1000;

    return `
=== Performance Test Results ===
Test Duration: ${(elapsedTime / 1000).toFixed(2)}s

Connection Performance:
  Successful: ${this.metrics.connections.success}
  Failed: ${this.metrics.connections.failed}
  Avg Time: ${avgConnectionTime.toFixed(2)}ms

Room Join Performance:
  Successful: ${this.metrics.roomJoins.success}
  Failed: ${this.metrics.roomJoins.failed}
  Avg Time: ${avgRoomJoinTime.toFixed(2)}ms

Message Performance:
  Messages Sent: ${this.metrics.messagesSent}
  Messages Received: ${this.metrics.messagesReceived}
  Messages/Second: ${messagesPerSecond.toFixed(2)}

Operation Performance:
  Operations Sent: ${this.metrics.operationsSent}
  Operations Received: ${this.metrics.operationsReceived}

Cursor Updates: ${this.metrics.cursorUpdates}

Broadcast Performance:
  Broadcasts: ${this.metrics.broadcastLatencies.length}
  Avg Latency: ${avgBroadcastLatency.toFixed(2)}ms

Errors: ${this.metrics.errors.length}
${this.metrics.errors.length > 0 ? `Error Details:\n${this.metrics.errors.join('\n')}` : ''}
===================================
    `.trim();
  }
}

// ============================================================================
// Test User Simulation
// ============================================================================

async function createTestUser(userId: number, metrics: TestMetrics, roomId: string): Promise<void> {
  const startTime = Date.now();
  const token = 'test-token'; // In production, use real JWT

  const socket = io(CONFIG.SERVER_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: false,
  });

  // Connection handler
  socket.on('connect', () => {
    const connectionTime = Date.now() - startTime;
    metrics.recordConnection(true, connectionTime);
    console.log(`[User ${userId}] Connected in ${connectionTime}ms`);

    // Join room
    const joinStart = Date.now();
    socket.emit('room:join', {
      roomId,
      type: 'document',
      documentId: `test-doc-${roomId}`,
      name: `Test Room ${roomId}`,
    });

    socket.on('room:joined', () => {
      const joinTime = Date.now() - joinStart;
      metrics.recordRoomJoin(true, joinTime);
      console.log(`[User ${userId}] Joined room in ${joinTime}ms`);

      // Start cursor updates
      startCursorUpdates(socket, metrics, roomId, userId);
    });
  });

  socket.on('connect_error', (err) => {
    const connectionTime = Date.now() - startTime;
    metrics.recordConnection(false, connectionTime);
    metrics.recordError(`User ${userId} connection error: ${err.message}`);
    console.error(`[User ${userId}] Connection error:`, err);
  });

  socket.on('system:error', (data) => {
    metrics.recordError(`User ${userId} system error: ${data.message}`);
  });

  // Listen for document operations
  socket.on('doc:operation_applied', () => {
    metrics.recordMessage('received');
    metrics.recordOperation('received');
  });

  // Listen for cursor updates
  socket.on('cursor:update', () => {
    metrics.recordMessage('received');
  });

  // Keep connection alive
  socket.on('heartbeat', () => {
    socket.emit('heartbeat');
  });
}

function startCursorUpdates(socket: any, metrics: TestMetrics, roomId: string, userId: number): void {
  let position = 0;

  const interval = setInterval(() => {
    position += Math.floor(Math.random() * 10);
    socket.emit('cursor:move', {
      roomId,
      position,
      selection: { start: position, end: position + 5 },
    });
    metrics.recordCursorUpdate();
    metrics.recordMessage('sent');
  }, CONFIG.CURSOR_UPDATE_INTERVAL_MS);

  // Stop after test duration
  setTimeout(() => {
    clearInterval(interval);
    socket.disconnect();
  }, CONFIG.TEST_DURATION_MS);
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runPerformanceTest(): Promise<void> {
  console.log('=== Starting WebSocket Performance Test ===');
  console.log(`Server: ${CONFIG.SERVER_URL}`);
  console.log(`Test Users: ${CONFIG.TEST_USER_COUNT}`);
  console.log(`Test Duration: ${(CONFIG.TEST_DURATION_MS / 1000)}s`);
  console.log('');

  const metrics = new TestMetrics();
  const roomId = `test-room-${crypto.randomUUID()}`;

  // Start metrics sampling
  const sampleInterval = setInterval(() => {
    metrics.takeSample();
  }, CONFIG.METRICS_SAMPLE_INTERVAL_MS);

  // Create test users
  const userPromises = [];
  for (let i = 0; i < CONFIG.TEST_USER_COUNT; i++) {
    userPromises.push(createTestUser(i + 1, metrics, roomId));
    // Stagger connections
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Wait for test duration
  await new Promise(resolve => setTimeout(resolve, CONFIG.TEST_DURATION_MS));

  // Stop sampling
  clearInterval(sampleInterval);

  // Generate report
  console.log('\n' + metrics.getReport());
  console.log('\n=== Test Complete ===');
}

// ============================================================================
// Run Test
// ============================================================================

runPerformanceTest().catch(console.error);
