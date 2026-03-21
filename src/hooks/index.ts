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

// Global Loading Hooks
export { useGlobalLoading, useScopedLoading, GlobalLoadingProvider } from './useGlobalLoading';

// WebSocket Hooks
export { useWebSocket, useTaskStatusUpdates } from './useWebSocket';
export type {
  WebSocketConfig,
  WebSocketMessage,
  TaskStatusUpdate,
  WebSocketState,
  UseWebSocketReturn,
} from './useWebSocket';
