/**
 * Collaboration Server Types
 *
 * Type definitions for server-side collaboration features
 */

export interface RoomUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  color?: string;
  isTyping?: boolean;
  cursor?: {
    position: number;
    color: string;
  };
  lastActive: number;
}

export interface Room {
  id: string;
  name: string;
  type: 'task' | 'project' | 'chat' | 'document';
  document: {
    content: string;
    revision: number;
  };
  users: Map<string, RoomUser>;
  createdAt: number;
  updatedAt: number;
}

export interface RoomConfig {
  maxUsers?: number;
  autoSaveInterval?: number;
  versionHistorySize?: number;
}
