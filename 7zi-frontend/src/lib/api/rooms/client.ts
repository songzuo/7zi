/**
 * Room API Client
 *
 * 房间 API 客户端函数
 */

import type { Room, RoomMember } from '@/types/rooms';

// API 基础路径
const API_BASE = '/api/rooms';

/**
 * API 响应类型
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 创建房间请求
 */
export interface CreateRoomRequest {
  name: string;
  description?: string;
  password?: string;
  isPrivate?: boolean;
}

/**
 * 创建房间响应
 */
export interface CreateRoomResponse {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: number;
}

/**
 * 房间列表项（公开信息）
 */
export interface RoomListItem {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  inviteCode: string;
  memberCount: number;
  onlineCount: number;
  createdAt: number;
  hasPassword: boolean;
  isOwner: boolean;
}

/**
 * 房间详情响应
 */
export interface RoomDetailResponse {
  room: {
    id: string;
    name: string;
    description?: string;
    ownerId: string;
    ownerName: string;
    inviteCode: string;
    memberCount: number;
    onlineCount: number;
    createdAt: number;
    updatedAt: number;
    hasPassword: boolean;
    isOwner: boolean;
  };
  participants: Array<{
    id: string;
    name: string;
    avatar?: string;
    role: 'owner' | 'admin' | 'member';
    isOnline: boolean;
    joinedAt: number;
  }>;
}

/**
 * 加入房间请求
 */
export interface JoinRoomRequest {
  inviteCode?: string;
  password?: string;
}

/**
 * 获取请求头（包含认证信息）
 */
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // 在实际应用中，这里应该从 cookie/session 获取用户信息
  // 这里使用开发模式的默认值
  if (typeof window !== 'undefined') {
    const userId = localStorage.getItem('userId') || 'dev-user';
    const userName = localStorage.getItem('userName') || 'Developer';
    headers['x-user-id'] = userId;
    headers['x-user-name'] = userName;
  }

  return headers;
}

/**
 * 创建房间
 */
export async function createRoom(data: CreateRoomRequest): Promise<CreateRoomResponse> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  const result: ApiResponse<CreateRoomResponse> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to create room');
  }

  return result.data;
}

/**
 * 获取房间列表
 */
export async function getRooms(): Promise<RoomListItem[]> {
  const response = await fetch(API_BASE, {
    method: 'GET',
    headers: getHeaders(),
  });

  const result: ApiResponse<{ rooms: RoomListItem[] }> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to get rooms');
  }

  return result.data.rooms;
}

/**
 * 获取房间详情
 */
export async function getRoomById(roomId: string): Promise<RoomDetailResponse> {
  const response = await fetch(`${API_BASE}/${roomId}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  const result: ApiResponse<RoomDetailResponse> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to get room');
  }

  return result.data;
}

/**
 * 加入房间
 */
export async function joinRoom(roomId: string, data?: JoinRoomRequest): Promise<{ room: { id: string; name: string; inviteCode: string } }> {
  const response = await fetch(`${API_BASE}/${roomId}/join`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data || {}),
  });

  const result: ApiResponse<{ room: { id: string; name: string; inviteCode: string } }> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to join room');
  }

  return result.data;
}

/**
 * 离开房间
 */
export async function leaveRoom(roomId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${roomId}/leave`, {
    method: 'POST',
    headers: getHeaders(),
  });

  const result: ApiResponse<unknown> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to leave room');
  }
}

/**
 * 删除房间
 */
export async function deleteRoom(roomId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${roomId}/delete`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  const result: ApiResponse<unknown> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete room');
  }
}

/**
 * 房间 API 客户端对象（方便批量导入）
 */
export const roomApi = {
  create: createRoom,
  list: getRooms,
  get: getRoomById,
  join: joinRoom,
  leave: leaveRoom,
  delete: deleteRoom,
};

export default roomApi;
