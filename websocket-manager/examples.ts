/**
 * WebSocket Connection Manager - Usage Examples and Tests
 * 
 * This file demonstrates how to use the WebSocketConnectionManager
 * with all its features: heartbeat, reconnection, state management,
 * message queuing, and metrics.
 * 
 * @author Executor Subagent
 * @date 2026-04-03
 */

import { WebSocketConnectionManager, ConnectionState, ConnectionMetrics } from './WebSocketConnectionManager'

/**
 * Example 1: Basic Usage
 */
function example1_BasicUsage() {
  console.log('\n=== Example 1: Basic Usage ===\n')
  
  const manager = new WebSocketConnectionManager({
    url: 'ws://localhost:8080',
    autoConnect: true,
    debug: true
  })
  
  // Listen for connection events
  manager.on('connected', () => {
    console.log('✓ Connected to server')
    
    // Send a message
    manager.send(JSON.stringify({ type: 'greeting', message: 'Hello Server!' }))
  })
  
  manager.on('message', (data) => {
    console.log('✓ Received message:', data.toString())
  })
  
  manager.on('disconnected', () => {
    console.log('✓ Disconnected from server')
  })
  
  manager.on('error', (error) => {
    console.error('✗ Error:', error.message)
  })
  
  // Disconnect after 10 seconds
  setTimeout(() => {
    manager.disconnect()
  }, 10000)
}

/**
 * Example 2: Heartbeat Monitoring
 */
function example2_HeartbeatMonitoring() {
  console.log('\n=== Example 2: Heartbeat Monitoring ===\n')
  
  const manager = new WebSocketConnectionManager({
    url: 'ws://localhost:8080',
    autoConnect: true,
    heartbeatInterval: 15000,  // 15 seconds
    heartbeatTimeout: 5000,    // 5 seconds
    debug: true
  })
  
  // Monitor heartbeat events
  manager.on('heartbeat-missed', (count) => {
    console.warn(`⚠ Missed heartbeat ${count}/3`)
  })
  
  // Monitor latency
  manager.on('latency', (latency) => {
    console.log(`📊 Current latency: ${latency}ms`)
  })
  
  // Get metrics periodically
  setInterval(() => {
    const metrics = manager.getMetrics()
    console.log('📈 Metrics:', {
      latency: metrics.currentLatency,
      avgLatency: metrics.averageLatency,
      missedHeartbeats: metrics.missedHeartbeats
    })
  }, 5000)
}

/**
 * Example 3: Exponential Backoff Reconnection
 */
function example3_ExponentialBackoff() {
  console.log('\n=== Example 3: Exponential Backoff Reconnection ===\n')
  
  const manager = new WebSocketConnectionManager({
    url: 'ws://localhost:8080',
    autoConnect: true,
    reconnectionDelay: 1000,      // Start with 1 second
    reconnectionDelayMax: 30000,  // Max 30 seconds
    maxReconnectionAttempts: 10,  // Try up to 10 times
    debug: true
  })
  
  // Monitor reconnection attempts
  manager.on('reconnecting', (attempt, delay) => {
    console.log(`🔄 Reconnection attempt ${attempt} in ${Math.round(delay)}ms`)
  })
  
  manager.on('reconnected', () => {
    console.log('✓ Successfully reconnected')
  })
  
  // Monitor state changes
  manager.on('state-change', (newState, previousState) => {
    console.log(`📌 State: ${previousState} -> ${newState}`)
  })
}

/**
 * Example 4: Message Queue (Offline Buffering)
 */
function example4_MessageQueue() {
  console.log('\n=== Example 4: Message Queue ===\n')
  
  const manager = new WebSocketConnectionManager({
    url: 'ws://localhost:8080',
    autoConnect: false,  // Don't connect yet
    maxQueueSize: 50,    // Max 50 messages
    messageExpiry: 60000, // Messages expire after 1 minute
    debug: true
  })
  
  // Send messages while disconnected (they'll be queued)
  console.log('Sending messages while disconnected...')
  for (let i = 1; i <= 5; i++) {
    manager.send(JSON.stringify({ type: 'test', id: i }))
  }
  
  console.log(`Queue size: ${manager.getQueueSize()}`)
  
  // Listen for queue events
  manager.on('message-queued', (message) => {
    console.log(`📬 Message queued: ${message.id}`)
  })
  
  // Connect after 2 seconds (queued messages will be sent)
  setTimeout(() => {
    console.log('Connecting now...')
    manager.connect()
  }, 2000)
  
  manager.on('connected', () => {
    console.log(`✓ Connected, queue size: ${manager.getQueueSize()}`)
  })
}

/**
 * Example 5: Connection Metrics
 */
function example5_ConnectionMetrics() {
  console.log('\n=== Example 5: Connection Metrics ===\n')
  
  const manager = new WebSocketConnectionManager({
    url: 'ws://localhost:8080',
    autoConnect: true,
    debug: true
  })
  
  // Monitor all metrics
  setInterval(() => {
    const metrics: ConnectionMetrics = manager.getMetrics()
    
    console.log('\n📊 Connection Metrics:')
    console.log(`  State: ${metrics.state}`)
    console.log(`  Messages Sent: ${metrics.messagesSent}`)
    console.log(`  Messages Received: ${metrics.messagesReceived}`)
    console.log(`  Total Reconnections: ${metrics.totalReconnections}`)
    console.log(`  Failed Reconnections: ${metrics.failedReconnections}`)
    console.log(`  Current Latency: ${metrics.currentLatency}ms`)
    console.log(`  Average Latency: ${metrics.averageLatency.toFixed(2)}ms`)
    console.log(`  Missed Heartbeats: ${metrics.missedHeartbeats}`)
    console.log(`  Queue Size: ${metrics.queueSize}`)
    console.log(`  Last Connected: ${metrics.lastConnectedTime ? new Date(metrics.lastConnectedTime).toISOString() : 'Never'}`)
    console.log(`  Last Disconnected: ${metrics.lastDisconnectedTime ? new Date(metrics.lastDisconnectedTime).toISOString() : 'Never'}`)
    console.log(`  Total Connection Time: ${(metrics.totalConnectionTime / 1000).toFixed(2)}s`)
  }, 5000)
}

/**
 * Example 6: Advanced Configuration
 */
function example6_AdvancedConfiguration() {
  console.log('\n=== Example 6: Advanced Configuration ===\n')
  
  const manager = new WebSocketConnectionManager({
    url: 'wss://secure.example.com/ws',
    autoConnect: true,
    
    // Heartbeat settings
    heartbeatInterval: 30000,    // 30 seconds
    heartbeatTimeout: 10000,     // 10 seconds
    
    // Reconnection settings
    reconnectionDelay: 2000,     // Start with 2 seconds
    reconnectionDelayMax: 60000, // Max 60 seconds
    maxReconnectionAttempts: 20, // Try up to 20 times
    
    // Queue settings
    maxQueueSize: 200,           // Max 200 messages
    messageExpiry: 600000,       // Messages expire after 10 minutes
    
    // Connection settings
    connectionTimeout: 15000,    // 15 seconds timeout
    
    // WebSocket options
    protocols: ['chat-v1', 'chat-v2'],
    headers: {
      'X-Client-Version': '1.0.0',
      'X-Client-ID': 'my-app'
    },
    
    debug: true
  })
  
  // Comprehensive event monitoring
  manager.on('connected', () => {
    console.log('✓ Connected')
  })
  
  manager.on('disconnected', (code, reason) => {
    console.log(`✓ Disconnected: ${code} - ${reason}`)
  })
  
  manager.on('reconnecting', (attempt, delay) => {
    console.log(`🔄 Reconnecting: attempt ${attempt}, delay ${Math.round(delay)}ms`)
  })
  
  manager.on('reconnected', () => {
    console.log('✓ Reconnected')
  })
  
  manager.on('message', (data) => {
    console.log('📨 Message:', data.toString())
  })
  
  manager.on('message-sent', (data) => {
    console.log('📤 Sent:', data.toString())
  })
  
  manager.on('message-queued', (message) => {
    console.log(`📬 Queued: ${message.id}`)
  })
  
  manager.on('latency', (latency) => {
    console.log(`⏱️ Latency: ${latency}ms`)
  })
  
  manager.on('heartbeat-missed', (count) => {
    console.warn(`⚠ Missed heartbeat ${count}/3`)
  })
  
  manager.on('state-change', (newState, previousState) => {
    console.log(`📌 State: ${previousState} -> ${newState}`)
  })
  
  manager.on('error', (error) => {
    console.error('✗ Error:', error.message)
  })
}

/**
 * Example 7: Force Reconnection
 */
function example7_ForceReconnection() {
  console.log('\n=== Example 7: Force Reconnection ===\n')
  
  const manager = new WebSocketConnectionManager({
    url: 'ws://localhost:8080',
    autoConnect: true,
    debug: true
  })
  
  manager.on('connected', () => {
    console.log('✓ Connected')
    
    // Force reconnection after 5 seconds
    setTimeout(() => {
      console.log('Forcing reconnection...')
      manager.reconnect()
    }, 5000)
  })
  
  manager.on('reconnected', () => {
    console.log('✓ Reconnected')
  })
}

/**
 * Example 8: Dynamic Configuration Update
 */
function example8_DynamicConfiguration() {
  console.log('\n=== Example 8: Dynamic Configuration Update ===\n')
  
  const manager = new WebSocketConnectionManager({
    url: 'ws://localhost:8080',
    autoConnect: true,
    heartbeatInterval: 30000,
    debug: true
  })
  
  // Update configuration after 10 seconds
  setTimeout(() => {
    console.log('Updating configuration...')
    manager.updateConfig({
      heartbeatInterval: 15000,  // Faster heartbeat
      reconnectionDelay: 500,    // Faster reconnection
      maxQueueSize: 200          // Larger queue
    })
    console.log('✓ Configuration updated')
  }, 10000)
}

/**
 * Example 9: Queue Management
 */
function example9_QueueManagement() {
  console.log('\n=== Example 9: Queue Management ===\n')
  
  const manager = new WebSocketConnectionManager({
    url: 'ws://localhost:8080',
    autoConnect: false,
    maxQueueSize: 10,
    debug: true
  })
  
  // Fill the queue
  console.log('Filling queue...')
  for (let i = 1; i <= 15; i++) {
    manager.send(JSON.stringify({ type: 'test', id: i }))
  }
  
  console.log(`Queue size: ${manager.getQueueSize()} (max: 10)`)
  
  // Clear queue
  setTimeout(() => {
    console.log('Clearing queue...')
    manager.clearQueue()
    console.log(`Queue size: ${manager.getQueueSize()}`)
  }, 2000)
}

/**
 * Example 10: Production-Ready Setup
 */
function example10_ProductionReady() {
  console.log('\n=== Example 10: Production-Ready Setup ===\n')
  
  const manager = new WebSocketConnectionManager({
    url: process.env.WS_URL || 'wss://api.example.com/ws',
    autoConnect: true,
    
    // Conservative heartbeat settings
    heartbeatInterval: 30000,
    heartbeatTimeout: 10000,
    
    // Aggressive reconnection
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    maxReconnectionAttempts: Infinity,
    
    // Large queue for offline periods
    maxQueueSize: 500,
    messageExpiry: 600000, // 10 minutes
    
    // Connection timeout
    connectionTimeout: 10000,
    
    // Authentication headers
    headers: {
      'Authorization': `Bearer ${process.env.API_TOKEN}`,
      'X-Client-Version': '1.0.0'
    },
    
    debug: process.env.NODE_ENV === 'development'
  })
  
  // Production monitoring
  manager.on('connected', () => {
    console.log('[PROD] Connected')
  })
  
  manager.on('disconnected', (code, reason) => {
    console.warn(`[PROD] Disconnected: ${code} - ${reason}`)
  })
  
  manager.on('reconnecting', (attempt, delay) => {
    console.warn(`[PROD] Reconnecting: attempt ${attempt}, delay ${Math.round(delay)}ms`)
  })
  
  manager.on('error', (error) => {
    console.error('[PROD] Error:', error.message)
    // Send to error tracking service
    // trackError(error)
  })
  
  manager.on('heartbeat-missed', (count) => {
    if (count >= 2) {
      console.warn(`[PROD] Multiple heartbeats missed: ${count}`)
      // Send alert to monitoring service
      // sendAlert('WebSocket heartbeat issues')
    }
  })
  
  // Periodic metrics reporting
  setInterval(() => {
    const metrics = manager.getMetrics()
    
    // Send metrics to monitoring service
    console.log('[PROD] Metrics:', {
      state: metrics.state,
      latency: metrics.averageLatency,
      reconnections: metrics.totalReconnections,
      queueSize: metrics.queueSize
    })
    
    // reportMetrics(metrics)
  }, 60000) // Every minute
}

/**
 * Run all examples (commented out by default)
 */
// example1_BasicUsage()
// example2_HeartbeatMonitoring()
// example3_ExponentialBackoff()
// example4_MessageQueue()
// example5_ConnectionMetrics()
// example6_AdvancedConfiguration()
// example7_ForceReconnection()
// example8_DynamicConfiguration()
// example9_QueueManagement()
// example10_ProductionReady()

/**
 * Simple test server for testing the manager
 */
export function createTestServer(port: number = 8080) {
  const WebSocket = require('ws')
  const wss = new WebSocket.Server({ port })
  
  console.log(`Test WebSocket server running on ws://localhost:${port}`)
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected')
    
    // Echo messages back
    ws.on('message', (message: string) => {
      console.log('Received:', message.toString())
      ws.send(message)
    })
    
    // Respond to pings
    ws.on('ping', (data: Buffer) => {
      ws.pong(data)
    })
    
    ws.on('close', () => {
      console.log('Client disconnected')
    })
    
    ws.on('error', (error: Error) => {
      console.error('Client error:', error)
    })
  })
  
  return wss
}

// Export examples
export {
  example1_BasicUsage,
  example2_HeartbeatMonitoring,
  example3_ExponentialBackoff,
  example4_MessageQueue,
  example5_ConnectionMetrics,
  example6_AdvancedConfiguration,
  example7_ForceReconnection,
  example8_DynamicConfiguration,
  example9_QueueManagement,
  example10_ProductionReady
}