/**
 * Hooks
 *
 * Export all custom hooks
 */

export { useDebounce } from './useDebounce'
export { useNotifications } from './useNotifications'
export { useNotificationsStable } from './useNotificationsStable'
export {
  useWebSocketStatus,
  useWebSocketStatusAuto,
  type UseWebSocketStatusOptions,
  type UseWebSocketStatusReturn,
} from './useWebSocketStatus'

export {
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsLargeDesktop,
  useIsLandscape,
  useIsPortrait,
  useIsTouchDevice,
  usePrefersReducedMotion,
  usePrefersDarkMode,
  useDeviceType,
  useResponsiveValue,
  useWindowSize,
  type MediaQueryOptions,
  type DeviceType,
  type ResponsiveValueConfig,
  type WindowSize,
} from './useMediaQuery'

export {
  useTouchGestures,
  useSwipe,
  usePinchToZoom,
  type TouchGestureOptions,
  type TouchGestureHandlers,
  type TouchGestureState,
  type SwipeHandlers,
  type PinchToZoomOptions,
} from './useTouchGestures'

export {
  usePreloadImage,
  usePreloadImages,
  useLazyImage,
  useResponsiveImageSize,
} from './useImagePreload'

export {
  useRoomWebSocket,
  type UseRoomWebSocketOptions,
  type UseRoomWebSocketReturn,
  type RoomWebSocketEvent,
  type RoomWebSocketEventData,
} from './useRoomWebSocket'

export {
  useWebhooks,
  useWebhookSubscription,
  useWebhookLogs,
  useWebhookEventTypes,
  useWebhookTest,
} from './useWebhooks'

export {
  useKeyboardShortcuts,
  useKeyboardShortcut,
  useRegisteredShortcuts,
} from './useKeyboardShortcuts'

export {
  useKeyboardShortcutsEnhanced,
  useKeyboardShortcutEnhanced,
  useRegisteredShortcutsEnhanced,
  useCustomBindings,
} from './useKeyboardShortcutsEnhanced'
