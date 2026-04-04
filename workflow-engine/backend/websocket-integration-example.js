/**
 * WebSocket Integration Example
 * 
 * This file demonstrates how to integrate WebSocketManager into the existing server.js
 */

const WebSocketManager = require('./websocket/WebSocketManager');

// After creating HTTP server in server.js:

// ============ WebSocket Integration ============

// Initialize WebSocket Manager
// Note: Pass the HTTP server, not the Express app
const wsManager = new WebSocketManager(server, engine);

// ============ WebSocket Management Endpoints ============

/**
 * Get WebSocket connection statistics
 */
app.get('/api/ws/stats', (req, res) => {
  try {
    const stats = wsManager.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get active subscriptions for an execution
 */
app.get('/api/ws/subscriptions/:executionId', (req, res) => {
  try {
    const stats = wsManager.getStats();
    const subscriptions = stats.subscriptions.find(
      s => s.executionId === req.params.executionId
    );
    
    if (!subscriptions) {
      return res.status(404).json({
        success: false,
        error: 'No subscriptions found for this execution'
      });
    }
    
    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Broadcast event to all subscribers of an execution
 * (Useful for external triggers)
 */
app.post('/api/ws/broadcast/:executionId', (req, res) => {
  try {
    const { event, data } = req.body;
    
    if (!event) {
      return res.status(400).json({
        success: false,
        error: 'event is required'
      });
    }
    
    // Get execution
    const execution = engine.getExecution(req.params.executionId);
    if (!execution) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found'
      });
    }
    
    // Emit event (will be broadcast by wsManager)
    engine.emit(event, {
      execution,
      ...data
    });
    
    res.json({
      success: true,
      message: 'Event broadcasted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============ Graceful Shutdown ============

// Handle graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Shutdown WebSocket server
  wsManager.shutdown();
  
  // Close HTTP server
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============ Console Output ============

server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('Workflow Engine Server');
  console.log('='.repeat(50));
  console.log(`🚀 HTTP API:  http://localhost:${PORT}`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`💚 Health:    http://localhost:${PORT}/health`);
  console.log(`📊 WS Stats:  http://localhost:${PORT}/api/ws/stats`);
  console.log('='.repeat(50));
  console.log('Server ready to accept connections');
  console.log('='.repeat(50));
});

module.exports = { app, server, wsManager };
