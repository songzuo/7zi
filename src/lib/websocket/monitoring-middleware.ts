/**
 * WebSocket Monitoring Middleware
 * WebSocket 监控中间件 - 集成到 Socket.IO 服务器
 *
 * @version 1.8.0
 */

import { Server as SocketIOServer } from "socket.io";
import { wsMonitor } from "@/lib/monitoring/websocket-monitor";
import { logger } from "@/lib/logger";

/**
 * 设置服务端 WebSocket 监控
 */
export function setupWebSocketMonitoring(io: SocketIOServer): void {
  // 初始化监控器
  wsMonitor.initialize({
    pingInterval: 5000,
    latencyWarningThreshold: 200,
    latencyCriticalThreshold: 500,
    autoReport: true,
    verbose: process.env.NODE_ENV === "development",
  });

  // 监控服务端
  wsMonitor.trackSocketServer(io, "server");

  // 监控每个客户端连接
  io.on("connection", (socket: any) => {
    const namespace = `client_${socket.id}`;
    
    // 设置 ping/pong 处理
    socket.on("ping", (data: { timestamp: number }) => {
      const latency = Date.now() - data.timestamp;
      
      socket.emit("pong", { 
        timestamp: data.timestamp,
        serverTime: Date.now(),
      });

      // 记录服务端延迟
      logger.debug(`[WS Monitor] Client ${socket.id} latency: ${latency}ms`);
    });
  });

  logger.info("[WS Monitor] WebSocket monitoring initialized");
}

/**
 * 客户端 WebSocket 监控 Hook
 * 用于客户端 Socket.IO 连接监控
 */
export function useWebSocketMonitoring(
  socket: any,
  namespace: string = "default"
): () => void {
  return wsMonitor.trackSocketClient(socket, namespace);
}

/**
 * 获取 WebSocket 监控统计
 */
export function getWebSocketStats() {
  return wsMonitor.getStats();
}

/**
 * 获取 WebSocket 延迟历史
 */
export function getWebSocketLatencyHistory(namespace?: string) {
  return wsMonitor.getLatencyHistory(namespace);
}

/**
 * 获取 WebSocket 事件历史
 */
export function getWebSocketEventHistory() {
  return wsMonitor.getEventHistory();
}

export { wsMonitor };
