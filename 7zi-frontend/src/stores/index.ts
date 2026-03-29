/**
 * Zustand Stores - 统一状态管理架构
 *
 * 架构师: 🏗️ 架构师
 * 创建日期: 2026-03-29
 * 版本: 1.0.0
 *
 * 说明: 此文件为统一导出入口，所有 Store 从这里导出
 * 使用方式: import { useAuthStore, useNotificationStore } from '@/stores'
 */

// 认证状态管理
export { useAuthStore } from './auth-store';
export type { AuthState, User } from './auth-store';

// 通知状态管理
export { useNotificationStore } from './notification-store';
export type { NotificationState, Notification, NotificationType } from './notification-store';

// WebSocket 状态管理
export { useWebSocketStore } from './websocket-store';
export type { WebSocketState, ConnectionStatus, WebSocketMessage } from './websocket-store';

// 应用全局设置
export { useAppStore } from './app-store';
export type { AppState, AppSettings } from './app-store';

/**
 * 开发工具集成 (仅在开发环境启用)
 */
if (process.env.NODE_ENV === 'development') {
  // 在开发环境中可以使用 Redux DevTools 查看 Zustand 状态
  // 需要安装: npm install @redux-devtools/extension
  console.log('[Stores] Zustand stores initialized');
}
