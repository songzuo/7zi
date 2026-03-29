/**
 * Socket.IO Server Initialization
 *
 * This file sets up the Socket.IO server for real-time notifications.
 * It should be imported in the Next.js custom server or API route.
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { notificationService } from './services/notification';

/**
 * Initialize Socket.IO with Next.js HTTP server
 */
export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  notificationService.initialize(httpServer);

  const io = notificationService.getIO();

  if (!io) {
    throw new Error('Failed to initialize Socket.IO server');
  }

  // Set up periodic cleanup (every 5 minutes)
  setInterval(() => {
    notificationService.cleanupExpired();
  }, 5 * 60 * 1000);

  console.log('[Socket.IO] Server initialized and ready');

  return io;
}

/**
 * Get the Socket.IO instance (if already initialized)
 */
export function getSocketIO(): SocketIOServer | null {
  return notificationService.getIO();
}
