/**
 * @fileoverview Stores 导出入口
 * @description 统一导出所有 Zustand stores
 */

// ============================================================================
// Dashboard Store
// ============================================================================
export {
  useDashboardStore,
  useMembers,
  useIssues,
  useActivities,
  useDashboardLoading,
  useDashboardError,
  useLastUpdated,
  useDashboardStats,
  useMembersByStatus,
  useMember,
  getDashboardSnapshot,
  setDashboardConfig,
  refreshDashboardData,
} from './dashboardStore'

export type { ActivityItem, DashboardStats } from './dashboardStore'

// ============================================================================
// Wallet Store
// ============================================================================
export { useWalletStore, useWalletBalance, useWallets, useTransactionHistory } from './walletStore'

export type {
  AgentWallet,
  Transaction,
  TransferRequest,
  TransferResult,
  WalletConfig,
} from './walletStore'

// ============================================================================
// Preferences Store
// ============================================================================
export {
  usePreferencesStore,
  useSettings,
  useTheme,
  useLanguage,
  useNotificationPreferences,
  usePreferencesLoaded,
  useDarkMode,
  getSettings,
  setTheme as setPreferencesTheme,
  toggleTheme,
  setLanguage as setPreferencesLanguage,
} from './preferencesStore'

export type { Theme, NotificationPreferences, UserSettings } from './preferencesStore'

// ============================================================================
// Filter Store
// ============================================================================
export {
  useFilterStore,
  useFilters,
  useSort,
  usePagination,
  useFilterConfig,
  useFilterActions,
  useSearchActions,
  useSortActions,
  usePaginationActions,
  useHasActiveFilters,
  useTotalPages,
  getFilterConfig as getFilterConfigExport,
  setFilterConfig as setFilterConfigExport,
} from './filterStore'

export type {
  FilterOperator,
  FilterCondition,
  SortDirection,
  SortCondition,
  PaginationState,
  FiltersState,
  FilterConfig,
} from './filterStore'

// ============================================================================
// UI Store
// ============================================================================
export {
  useUIStore,
  useSidebar,
  useActiveModal,
  useToasts,
  useToastCount,
  useGlobalLoading,
  useFormDraft,
  useHasFormDraft,
  useModalActions,
  useToastActions,
  useLoadingActions,
  useFormDraftActions,
  useHasOpenModal,
  useHasToasts,
  useToastsByType,
  toast,
  openModal,
  closeModal,
  setGlobalLoading,
} from './uiStore'

export type { Toast, ToastType, ToastPriority, Modal, SidebarState, FormDraft } from './uiStore'

// ============================================================================
// Permission Store
// ============================================================================
export {
  usePermissionStore,
  usePermissions,
  useRoles,
  useUserId,
  usePermissionLoading,
  usePermissionError,
  usePermissionInitialized,
  useIsAdmin,
  useIsManagerOrAdmin,
  useIsMemberOrHigher,
  useIsGuest,
  usePermissionActions,
  usePermissionHelpers,
} from './permissionStore'

export type { PermissionState } from './permissionStore'
