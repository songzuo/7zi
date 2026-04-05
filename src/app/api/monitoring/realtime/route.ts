/**
 * Real-Time Monitoring WebSocket API
 * 实时监控 WebSocket API
 *
 * 功能：
 * - WebSocket 连接管理
 * - 实时性能指标推送
 * - 告警推送
 * - 客户端订阅管理
 */

import { NextRequest } from 'next/server'
import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { realTimeDashboard } from '@/lib/monitoring/realtime-dashboard'
import { enhancedMetricsCollector } from '@/lib/monitoring/enhanced-metrics-collector'
import { alertManager } from '@/lib/monitoring/alert-manager-enhanced'

// ============================================
// Socket.IO 服务器实例
// ============================================

let io: SocketIOServer | null = null

/**
 * 获取或创建 Socket.IO 服务器
 */
function getSocketIOServer(server: HTTPServer): SocketIOServer {
  if (!io) {
    io = new SocketIOServer(server, {
      path: '/api/monitoring/ws',
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    })

    // 初始化实时仪表板服务
    realTimeDashboard.initialize(io)

    // 初始化增强指标收集器
    enhancedMetricsCollector.initialize()

    // 初始化告警管理器
    alertManager.initialize()

    console.log('[RealTimeMonitoring] Socket.IO server initialized')
  }

  return io
}

/**
 * GET /api/monitoring/realtime - WebSocket 升级处理
 */
export async function GET(req: NextRequest) {
  // Next.js App Router 不直接支持 WebSocket 升级
  // 需要在自定义服务器中处理
  // 这里返回说明信息

  return new Response(
    JSON.stringify({
      message: 'WebSocket endpoint available at /api/monitoring/ws',
      status: 'ok',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}

/**
 * 导出 Socket.IO 服务器初始化函数
 * 用于自定义服务器
 */
export { getSocketIOServer }