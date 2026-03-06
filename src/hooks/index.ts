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
