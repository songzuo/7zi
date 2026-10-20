// LocalStorage Hooks
export { useLocalStorage, useSessionStorage } from './useLocalStorage'

// Fetch Hooks
export { useFetch, useGitHub } from './useFetch'
export type { UseFetchOptions } from './useFetch'

// GitHub Data Hooks
export { useGitHubData, getMockCommits, getMockStats, getMockIssues } from './useGitHubData'

// Intersection Observer Hooks
export { useIntersectionObserver, useAnimateOnView, useCountUp } from './useIntersectionObserver'
export type { UseIntersectionObserverOptions } from './useIntersectionObserver'

// 性能优化 Hooks
export {
  useInView,
  usePreload,
  useDebounce,
  useThrottle,
  useDevicePerformance,
  useUserPreferences,
  useMounted,
  useWindowSize,
  useScrollPosition,
} from './usePerformance'

// 响应式设计 Hooks
export {
  useScreenSize,
  useIsTouchDevice,
  useMediaQuery,
  useSwipeGesture,
  useTouchTarget,
  usePrefersReducedMotion,
  useBreakpoint,
  useResponsiveValue,
  default as useResponsive,
} from './useResponsive'

export type { Breakpoint, ScreenSize, SwipeGestureState, TouchTargetConfig } from './useResponsive'

// Batch Selection Hook
export { useBatchSelection } from './useBatchSelection'
export type { UseBatchSelectionOptions, UseBatchSelectionReturn } from './useBatchSelection'

// Dashboard Data Hook
export { useDashboardData } from './useDashboardData'
export type { GitHubIssue, GitHubCommit, ActivityItem } from './useDashboardData'

// Long Press Hooks
export { useLongPress } from './useLongPress'
export type { UseLongPressOptions } from './useLongPress'

// Notifications Hook
export { useNotifications } from './useNotifications'
export type { NotificationInput, UseNotificationsOptions } from './useNotifications'

// Swipe Gestures Hook
export { useSwipeGestures } from './useSwipeGestures'
export type { SwipeState } from './useSwipeGestures'

// Theme Enhanced Hook
export { useThemeEnhanced, useThemeSimple } from './useThemeEnhanced'

// WebRTC Meeting Hook
export { useWebRTCMeeting } from './useWebRTCMeeting'
export type {
  PeerConnection,
  MeetingParticipant,
  UseWebRTCMeetingOptions,
  UseWebRTCMeetingReturn,
} from './useWebRTCMeeting'

// WebSocket Hooks
export { useWebSocket, useTaskStatusUpdates } from './useWebSocket'
export type {
  WebSocketConfig,
  WebSocketMessage,
  TaskStatusUpdate,
  WebSocketState,
  UseWebSocketReturn,
} from './useWebSocket'

// Workflow Draft Hook
export { useWorkflowDraft } from './useWorkflowDraft'
export type { UseWorkflowDraftOptions, UseWorkflowDraftReturn } from './useWorkflowDraft'
