/**
 * Dashboard 组件导出
 *
 * 提供统一的导出接口，便于外部使用
 */

// 组件导出
export { DashboardStats, createDefaultStats } from './DashboardStats'
export { RecentActivity, createMockActivities } from './RecentActivity'
export { QuickActions, defaultActions, minimalActions, analyticsActions } from './QuickActions'
export { AgentStatusPanel, AgentStatusCompact } from './AgentStatusPanel'
export { TaskQueueView, TaskQueueCompact } from './TaskQueueView'
export { ManualOverride } from './ManualOverride'
export { ScheduleHistory } from './ScheduleHistory'

// WebSocket 房间组件导出
export { RoomCreateModal } from './RoomCreateModal'
export { RoomJoinPanel } from './RoomJoinPanel'
export { RoomParticipantList, RoomParticipantListCompact } from './RoomParticipantList'
export { RoomSettingsPanel } from './RoomSettingsPanel'

// 类型导出
export type { StatItem } from './DashboardStats'
export type { ActivityItem, ActivityType } from './RecentActivity'
export type { QuickAction } from './QuickActions'
export type { AgentStatusPanelProps, AgentStatus } from './AgentStatusPanel'
export type {
  TaskQueueViewProps,
  TaskQueueCompactProps,
  SortField,
  SortOrder,
  FilterState,
  TaskAction,
} from './TaskQueueView'
export type { ManualOverrideProps, TaskFormData } from './ManualOverride'
export type { ScheduleHistoryProps, HistoryEntry, TimeRange, StatusFilter } from './ScheduleHistory'

// WebSocket 房间组件类型导出
export type { RoomCreateOptions, RoomCreateModalProps } from './RoomCreateModal'
export type { RoomJoinOptions, RoomJoinPanelProps } from './RoomJoinPanel'
export type {
  RoomParticipantListProps,
  RoomParticipantListCompactProps,
} from './RoomParticipantList'
export type { RoomSettingsPanelProps } from './RoomSettingsPanel'
