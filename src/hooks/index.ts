export { useLocalStorage, useSessionStorage } from './useLocalStorage';
export { useFetch, useGitHub } from './useFetch';
export { useGitHubData, getMockCommits, getMockStats, getMockIssues } from './useGitHubData';
export {
  useIntersectionObserver,
  useAnimateOnView,
  useCountUp,
} from './useIntersectionObserver';

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
} from './usePerformance';

// Global Loading - 已迁移到 uiStore
// 使用方法: import { useGlobalLoading, setGlobalLoading } from '@/stores/uiStore';
// 注意: useGlobalLoading 现在从 uiStore 导出，不再需要 Provider

// WebSocket Hooks
export { useWebSocket, useTaskStatusUpdates } from './useWebSocket';
export type {
  WebSocketConfig,
  WebSocketMessage,
  TaskStatusUpdate,
  WebSocketState,
  UseWebSocketReturn,
} from './useWebSocket';
