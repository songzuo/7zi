/**
 * Room Model - WebSocket 房间数据模型
 */

export type RoomType = 'public' | 'private' | 'password-protected';

export type MemberRole = 'owner' | 'admin' | 'member' | 'guest';

export type PermissionAction = 'read' | 'write' | 'manage' | 'moderate' | 'invite' | 'kick';

export interface RoomPermission {
  action: PermissionAction;
  allowed: boolean;
}

export interface RoomMember {
  userId: string;
  userName: string;
  role: MemberRole;
  permissions: RoomPermission[];
  joinedAt: number;
  lastActiveAt: number;
}

export interface RoomConfig {
  name: string;
  type: RoomType;
  password?: string;
  ownerId: string;
  metadata?: Record<string, unknown>;
  maxMembers?: number;
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  passwordHash?: string;
  ownerId: string;
  members: RoomMember[];
  metadata: Record<string, unknown>;
  createdAt: number;
  lastActivityAt: number;
  maxMembers?: number;
}
