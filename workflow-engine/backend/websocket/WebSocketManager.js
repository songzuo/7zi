const WebSocket = require('ws');
const EventEmitter = require('events');

/**
 * WebSocket Manager for Workflow Engine
 * 
 * Manages WebSocket connections and broadcasts engine events to subscribed clients.
 * 
 * Features:
 * - Real-time execution status updates
 * - Per-execution subscriptions
 * - Automatic cleanup on disconnect
 * - Connection health monitoring
 * 
 * @example
 * const wsManager = new WebSocketManager(httpServer, engine);
 * wsManager.getStats(); // { totalConnections: 10, activeSubscriptions: 5 }
 */

class WebSocketManager extends EventEmitter {
  constructor(server, engine) {
    super();
    
    // WebSocket server
    this.wss = new WebSocket.Server({ server, path: '/ws' });
    
    // Workflow engine reference
    this.engine = engine;
    
    // Client management
    this.clients = new Map(); // executionId -> Set<WebSocket>
    
    // Statistics
    this.stats = {
      totalConnections: 0,
      messagesSent: 0,
      messagesReceived: 0
    };
    
    // Setup
    this.setupWebSocket();
    this.subscribeToEngine();
    
    console.log('[WebSocketManager] Initialized');
  }

  /**
   * Setup WebSocket server event handlers
   */
  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      ws.id = clientId;
      ws.subscriptions = new Set();
      ws.isAlive = true;
      
      console.log(`[WebSocket] Client connected: ${clientId}`);
      this.stats.totalConnections++;
      
      // Handle incoming messages
      ws.on('message', (message) => {
        this.stats.messagesReceived++;
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error(`[WebSocket] Invalid message format: ${message}`);
          this.sendError(ws, 'Invalid message format');
        }
      });
      
      // Handle connection close
      ws.on('close', () => {
        console.log(`[WebSocket] Client disconnected: ${clientId}`);
        this.cleanup(ws);
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error(`[WebSocket] Error for client ${clientId}:`, error.message);
        this.cleanup(ws);
      });
      
      // Setup ping/pong for health monitoring
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      
      // Send welcome message
      this.sendMessage(ws, {
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString(),
        serverTime: Date.now()
      });
    });
    
    // Setup health check interval
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // 30 seconds
  }

  /**
   * Handle incoming messages from clients
   */
  handleMessage(ws, message) {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(ws, message);
        break;
        
      case 'unsubscribe':
        this.handleUnsubscribe(ws, message);
        break;
        
      case 'ping':
        this.sendMessage(ws, {
          type: 'pong',
          timestamp: new Date().toISOString(),
          serverTime: Date.now()
        });
        break;
        
      case 'listSubscriptions':
        this.sendMessage(ws, {
          type: 'subscriptions',
          subscriptions: Array.from(ws.subscriptions),
          timestamp: new Date().toISOString()
        });
        break;
        
      default:
        console.warn(`[WebSocket] Unknown message type: ${message.type}`);
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle subscription request
   */
  handleSubscribe(ws, message) {
    const { executionId, events = ['*'] } = message;
    
    if (!executionId) {
      return this.sendError(ws, 'executionId is required');
    }
    
    // Add to client's subscriptions
    ws.subscriptions.add(executionId);
    
    // Update clients map
    if (!this.clients.has(executionId)) {
      this.clients.set(executionId, new Set());
    }
    this.clients.get(executionId).add(ws);
    
    console.log(`[WebSocket] Client ${ws.id} subscribed to execution: ${executionId}`);
    
    // Send confirmation
    this.sendMessage(ws, {
      type: 'subscribed',
      executionId,
      events,
      timestamp: new Date().toISOString()
    });
    
    // Send current execution state immediately
    const execution = this.engine.getExecution(executionId);
    if (execution) {
      this.sendMessage(ws, {
        type: 'state',
        data: this.sanitizeExecution(execution),
        timestamp: new Date().toISOString()
      });
    } else {
      this.sendMessage(ws, {
        type: 'error',
        message: `Execution not found: ${executionId}`,
        code: 'EXECUTION_NOT_FOUND'
      });
    }
  }

  /**
   * Handle unsubscribe request
   */
  handleUnsubscribe(ws, message) {
    const { executionId } = message;
    
    if (!executionId) {
      return this.sendError(ws, 'executionId is required');
    }
    
    ws.subscriptions.delete(executionId);
    
    const clients = this.clients.get(executionId);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) {
        this.clients.delete(executionId);
        console.log(`[WebSocket] No more subscribers for execution: ${executionId}`);
      }
    }
    
    console.log(`[WebSocket] Client ${ws.id} unsubscribed from execution: ${executionId}`);
    
    this.sendMessage(ws, {
      type: 'unsubscribed',
      executionId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Subscribe to engine events
   */
  subscribeToEngine() {
    const events = [
      'execution:started',
      'execution:completed',
      'execution:failed',
      'execution:paused',
      'execution:resumed',
      'execution:cancelled',
      'node:started',
      'node:completed',
      'node:failed',
      'node:retry',
      'checkpoint:created',
      'condition:error'
    ];
    
    events.forEach(event => {
      this.engine.on(event, (data) => {
        this.broadcastEvent(event, data);
      });
    });
    
    console.log(`[WebSocketManager] Subscribed to ${events.length} engine events`);
  }

  /**
   * Broadcast engine event to subscribed clients
   */
  broadcastEvent(event, data) {
    const executionId = data.execution?.id || data.executionId;
    
    if (!executionId) {
      console.warn(`[WebSocket] Event ${event} missing executionId`);
      return;
    }
    
    const clients = this.clients.get(executionId);
    if (!clients || clients.size === 0) {
      return;
    }
    
    const message = JSON.stringify({
      type: 'event',
      event,
      data: this.sanitizeEventData(event, data),
      timestamp: new Date().toISOString()
    });
    
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        this.stats.messagesSent++;
      }
    });
    
    console.log(`[WebSocket] Broadcast event '${event}' to ${clients.size} clients for execution ${executionId}`);
  }

  /**
   * Cleanup disconnected client
   */
  cleanup(ws) {
    ws.subscriptions.forEach(executionId => {
      const clients = this.clients.get(executionId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          this.clients.delete(executionId);
        }
      }
    });
    
    ws.subscriptions.clear();
  }

  /**
   * Perform health check on all connections
   */
  performHealthCheck() {
    this.wss.clients.forEach(ws => {
      if (!ws.isAlive) {
        console.log(`[WebSocket] Terminating unhealthy connection: ${ws.id}`);
        ws.terminate();
        return;
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }

  /**
   * Send message to client
   */
  sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      this.stats.messagesSent++;
    }
  }

  /**
   * Send error message to client
   */
  sendError(ws, message, code = 'ERROR') {
    this.sendMessage(ws, {
      type: 'error',
      error: {
        message,
        code,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Sanitize execution data before sending to client
   * Removes sensitive or unnecessary data
   */
  sanitizeExecution(execution) {
    // Return full data - could filter in production
    return execution;
  }

  /**
   * Sanitize event data
   */
  sanitizeEventData(event, data) {
    // Add metadata to events
    return {
      ...data,
      _event: event,
      _timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate unique client ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    const subscriptions = Array.from(this.clients.entries()).map(([id, clients]) => ({
      executionId: id,
      subscribers: clients.size
    }));
    
    return {
      totalConnections: this.wss.clients.size,
      activeSubscriptions: this.clients.size,
      messagesSent: this.stats.messagesSent,
      messagesReceived: this.stats.messagesReceived,
      subscriptions,
      uptime: process.uptime()
    };
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown() {
    console.log('[WebSocketManager] Shutting down...');
    
    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Close all connections
    this.wss.clients.forEach(ws => {
      ws.close(1001, 'Server shutdown');
    });
    
    // Close server
    this.wss.close(() => {
      console.log('[WebSocketManager] Server closed');
    });
  }
}

module.exports = WebSocketManager;
