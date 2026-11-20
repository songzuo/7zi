/**
 * Room Components
 *
 * Main index file for room management components
 */

export { default as RoomManager } from './RoomManager'
export type { RoomManagerProps } from './RoomManager'

export { default as RoomSettings } from './RoomSettings'
export type { RoomSettingsProps } from './RoomSettings'

export { default as RoomCard } from './RoomCard'
export type { RoomCardProps } from './RoomCard'

export { default as ParticipantList } from './ParticipantList'
export type { ParticipantListProps } from './ParticipantList'

// Re-export from existing dashboard components
export { default as RoomList } from '@/lib/websocket/dashboard/RoomList'
export type { RoomListProps } from '@/lib/websocket/dashboard/RoomList'

export { default as RoomView } from '@/lib/websocket/dashboard/RoomView'
export type { RoomViewProps } from '@/lib/websocket/dashboard/RoomView'
