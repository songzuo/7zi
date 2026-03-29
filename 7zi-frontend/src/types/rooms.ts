/**
 * Room System Types
 *
 * Types for WebSocket room management
 */

export type RoomMemberRole = 'owner' | 'admin' | 'member';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

export interface RoomMember {
  id: string;
  name: string;
  avatar?: string;
  role: RoomMemberRole;
  isOnline: boolean;
  joinedAt: number;
  lastActiveAt: number;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  password?: string;
  inviteCode: string;
  members: RoomMember[];
  onlineCount: number;
  memberCount: number;
  createdAt: number;
  updatedAt: number;
  lastActivityAt: number;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: number;
  type: 'text' | 'system' | 'notification';
}

export interface RoomSettings {
  name?: string;
  description?: string;
  password?: string;
  maxMembers?: number;
  isPublic?: boolean;
}

export interface CreateRoomRequest {
  name: string;
  description?: string;
  password?: string;
}

export interface JoinRoomRequest {
  inviteCode: string;
  password?: string;
}

export interface UpdateRoomRequest {
  roomId: string;
  settings: RoomSettings;
}

export interface TransferOwnershipRequest {
  roomId: string;
  newOwnerId: string;
}
