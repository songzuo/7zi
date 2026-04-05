/**
 * Collaboration 组件模块
 *
 * 提供实时协作功能的核心组件
 */

// RemoteCursor - 实时光标同步
export {
  RemoteCursor,
  RemoteCursorContainer,
  useRemoteCursors,
} from './RemoteCursor'

export type {
  RemoteCursor,
  RemoteCursorProps,
  RemoteCursorContainerProps,
} from './RemoteCursor'

// OnlineUsers - 在线用户指示器（待实现）
// export { OnlineUsersIndicator } from './OnlineUsers'

// CollaborationPanel - 协作状态面板（待实现）
// export { CollaborationPanel } from './CollaborationPanel'

// CollaborationToast - 实时通知（待实现）
// export { ToastContainer } from './CollaborationToast'
