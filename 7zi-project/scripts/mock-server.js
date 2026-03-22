/**
 * Mock WebSocket Server for Testing
 * 
 * Simple mock server that simulates collaboration behavior
 * Run with: npx ts-node --esm scripts/mock-server.ts
 * Or: node scripts/mock-server.js (if compiled)
 */

const http = require('http');

// Mock room data
const rooms = new Map();

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function generateColor(userId) {
  const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6'];
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

// Simple Socket.IO mock (just for demonstration)
// In real testing, use socket.io-client with a mock server
const mockServer = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost:3001');
  
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // Health check endpoint
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.size }));
    return;
  }

  // Room stats
  if (url.pathname === '/stats') {
    let totalUsers = 0;
    rooms.forEach(room => totalUsers += room.users.size);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connected: totalUsers,
      rooms: rooms.size,
      totalUsers,
    }));
    return;
  }

  // Default response
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Mock WebSocket Server for Testing\n\nEndpoints:\n- GET /health - Health check\n- GET /stats - Server statistics');
});

const PORT = process.env.MOCK_WS_PORT || 3001;

mockServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          Mock WebSocket Server for Testing                   ║
╠═══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                  ║
║  URL:  http://localhost:${PORT}                                 ║
║                                                               ║
║  Endpoints:                                                   ║
║  - GET /health - Health check                                 ║
║  - GET /stats  - Server statistics                            ║
║                                                               ║
║  For actual WebSocket testing, use the collaboration-demo      ║
║  page at: http://localhost:3000/collaboration-demo            ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

mockServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try a different port:`);
    console.error(`MOCK_WS_PORT=3002 node scripts/mock-server.js`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
