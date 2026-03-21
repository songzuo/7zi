/**
 * WebSocket Message Types
 *
 * Comprehensive type definitions for all WebSocket messages
 * Used for real-time collaboration features
 */

// ============================================================================
// Base Message Types
// ============================================================================

export interface BaseMessage {
  id: string;
  timestamp: string;
  type: string;
  roomId?: string;
  userId?: string;
  payload?: unknown;
}

export interface WebSocketMessage extends BaseMessage {
  type: string;
  payload?: Record<string, unknown>;
}

// ============================================================================
// Authentication Messages
// ============================================================================

export interface AuthMessage extends BaseMessage {
  type: 'auth:authenticated' | 'auth:unauthorized' | 'auth:login' | 'auth:logout';
  payload?: {
    userId: string;
    name: string;
    avatar?: string;
    token?: string;
    reason?: string;
  };
}

// ============================================================================
// Room Messages
// ============================================================================

export interface RoomJoinMessage extends BaseMessage {
  type: 'room:join';
  payload: {
    roomId: string;
    type: 'task' | 'project' | 'chat' | 'document';
    documentId: string;
    name?: string;
  };
}

export interface RoomJoinedMessage extends BaseMessage {
  type: 'room:joined';
  payload: {
    roomId: string;
    users: RoomUser[];
    document: DocumentState;
  };
}

export interface RoomLeaveMessage extends BaseMessage {
  type: 'room:leave';
  payload: {
    roomId: string;
  };
}

export interface RoomLeftMessage extends BaseMessage {
  type: 'room:left';
  payload: {
    roomId: string;
  };
}

export interface RoomUserJoinedMessage extends BaseMessage {
  type: 'room:user_joined';
  payload: {
    user: RoomUser;
    userCount: number;
  };
}

export interface RoomUserLeftMessage extends BaseMessage {
  type: 'room:user_left';
  payload: {
    userId: string;
    userCount: number;
  };
}

export interface RoomUserListMessage extends BaseMessage {
  type: 'room:user_list';
  payload: {
    roomId: string;
    users: RoomUser[];
  };
}

// ============================================================================
// Document Messages
// ============================================================================

export interface DocumentState {
  content: string;
  revision: number;
}

export interface DocumentOpenMessage extends BaseMessage {
  type: 'doc:open';
  payload: {
    roomId: string;
    documentId: string;
  };
}

export interface DocumentOpenedMessage extends BaseMessage {
  type: 'doc:opened';
  payload: {
    roomId: string;
    documentId: string;
    document: DocumentState;
  };
}

export interface DocumentOperation {
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
}

export interface DocumentOperationMessage extends BaseMessage {
  type: 'doc:operation';
  payload: {
    roomId: string;
    operation: DocumentOperation;
  };
}

export interface DocumentOperationAppliedMessage extends BaseMessage {
  type: 'doc:operation_applied';
  payload: {
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    operation: DocumentOperation;
    revision: number;
  };
}

export interface DocumentSyncMessage extends BaseMessage {
  type: 'doc:sync';
  payload: {
    roomId: string;
  };
}

export interface DocumentSyncedMessage extends BaseMessage {
  type: 'doc:sync';
  payload: {
    roomId: string;
    document: DocumentState;
  };
}

// ============================================================================
// Cursor Messages (Collaboration Feature)
// ============================================================================

export interface CursorPosition {
  position: number;
  selection?: CursorSelection;
}

export interface CursorSelection {
  start: number;
  end: number;
}

export interface CursorUpdate {
  userId: string;
  userName: string;
  color: string;
  position: number;
  selection?: CursorSelection;
}

export interface CursorMoveMessage extends BaseMessage {
  type: 'cursor:move';
  payload: {
    roomId: string;
    position: number;
    selection?: CursorSelection;
  };
}

export interface CursorUpdateMessage extends BaseMessage {
  type: 'cursor:update';
  payload: CursorUpdate;
}

// ============================================================================
// Selection Messages (Collaboration Feature)
// ============================================================================

export interface SelectionUpdate {
  userId: string;
  userName: string;
  color: string;
  selection: CursorSelection;
}

export interface SelectionUpdateMessage extends BaseMessage {
  type: 'selection:update';
  payload: SelectionUpdate;
}

// ============================================================================
// Presence Messages
// ============================================================================

export interface PresenceTypingMessage extends BaseMessage {
  type: 'presence:typing';
  payload: {
    roomId: string;
    isTyping: boolean;
  };
}

export interface PresenceTypingUpdatedMessage extends BaseMessage {
  type: 'presence:typing';
  payload: {
    userId: string;
    userName: string;
    isTyping: boolean;
  };
}

export interface PresenceUpdate {
  userId: string;
  userName: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  isTyping: boolean;
  lastSeen: Date;
}

// ============================================================================
// Task Status Messages
// ============================================================================

export interface TaskStatusUpdate {
  taskId: string;
  status: string;
  state: 'submitted' | 'running' | 'completed' | 'failed' | 'cancelled';
  timestamp: string;
  userId?: string;
  projectId?: string;
  taskTitle?: string;
  oldStatus?: string;
  newStatus?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, unknown>;
}

export interface TaskStatusUpdateMessage extends BaseMessage {
  type: 'task:status_update';
  payload: TaskStatusUpdate;
}

export interface TaskStatusChangedMessage extends BaseMessage {
  type: 'task:status_changed';
  payload: {
    taskId: string;
    taskTitle: string;
    oldStatus: string;
    newStatus: string;
    userId?: string;
    timestamp: string;
  };
}

// ============================================================================
// Task Assignment Messages
// ============================================================================

export interface TaskAssignedMessage extends BaseMessage {
  type: 'task:assigned';
  payload: {
    taskId: string;
    taskTitle: string;
    assignedTo: string;
    assignedBy: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    timestamp: string;
  };
}

// ============================================================================
// Task Comment Messages
// ============================================================================

export interface TaskCommentMessage extends BaseMessage {
  type: 'task:comment';
  payload: {
    taskId: string;
    commentId: string;
    author: {
      id: string;
      name: string;
      avatar?: string;
    };
    content: string;
    timestamp: string;
  };
}

// ============================================================================
// Member Status Messages
// ============================================================================

export interface MemberStatusChangedMessage extends BaseMessage {
  type: 'member:status_changed';
  payload: {
    userId: string;
    userName: string;
    oldStatus: string;
    newStatus: string;
    timestamp: string;
  };
}

// ============================================================================
// System Messages
// ============================================================================

export interface SystemErrorMessage extends BaseMessage {
  type: 'system:error';
  payload: {
    message: string;
    code?: string;
  };
}

export interface SystemAnnouncementMessage extends BaseMessage {
  type: 'system:announcement';
  payload: {
    id: string;
    content: string;
    timestamp: string;
    actionUrl?: string;
  };
}

// ============================================================================
// Project Messages
// ============================================================================

export interface ProjectUpdatedMessage extends BaseMessage {
  type: 'project:updated';
  payload: {
    projectId: string;
    projectName: string;
    changeType: 'created' | 'updated' | 'deleted' | 'archived';
    userId?: string;
    timestamp: string;
  };
}

// ============================================================================
// Notification Messages
// ============================================================================

export interface NotificationMessage extends BaseMessage {
  type: 'notification';
  payload: {
    id: string;
    type: string;
    title: string;
    message: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    category: 'info' | 'warning' | 'error' | 'success';
    data?: Record<string, unknown>;
    actionUrl?: string;
    actionText?: string;
  };
}

// ============================================================================
// Room User Types
// ============================================================================

export interface RoomUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
  joinedAt: Date;
  cursor?: CursorPosition;
  isTyping: boolean;
  lastActivity: Date;
}

// ============================================================================
// Collaboration Message Types
// ============================================================================

/**
 * Union type for all collaboration-related messages
 */
export type CollaborationMessage =
  | DocumentOperationMessage
  | DocumentOperationAppliedMessage
  | CursorMoveMessage
  | CursorUpdateMessage
  | SelectionUpdateMessage
  | PresenceTypingMessage
  | PresenceTypingUpdatedMessage;

/**
 * Union type for all WebSocket messages
 */
export type WebSocketMessageType =
  | AuthMessage
  | RoomJoinMessage
  | RoomJoinedMessage
  | RoomLeaveMessage
  | RoomLeftMessage
  | RoomUserJoinedMessage
  | RoomUserLeftMessage
  | RoomUserListMessage
  | DocumentOpenMessage
  | DocumentOpenedMessage
  | DocumentOperationMessage
  | DocumentOperationAppliedMessage
  | DocumentSyncMessage
  | DocumentSyncedMessage
  | CursorMoveMessage
  | CursorUpdateMessage
  | SelectionUpdateMessage
  | PresenceTypingMessage
  | PresenceTypingUpdatedMessage
  | TaskStatusUpdateMessage
  | TaskStatusChangedMessage
  | TaskAssignedMessage
  | TaskCommentMessage
  | MemberStatusChangedMessage
  | SystemErrorMessage
  | SystemAnnouncementMessage
  | ProjectUpdatedMessage
  | NotificationMessage;

// ============================================================================
// Message Type Guards
// ============================================================================

export function isAuthMessage(message: BaseMessage): message is AuthMessage {
  return message.type.startsWith('auth:');
}

export function isRoomMessage(message: BaseMessage): message is
  | RoomJoinMessage
  | RoomJoinedMessage
  | RoomLeaveMessage
  | RoomLeftMessage
  | RoomUserJoinedMessage
  | RoomUserLeftMessage
  | RoomUserListMessage {
  return message.type.startsWith('room:');
}

export function isDocumentMessage(message: BaseMessage): message is
  | DocumentOpenMessage
  | DocumentOpenedMessage
  | DocumentOperationMessage
  | DocumentOperationAppliedMessage
  | DocumentSyncMessage
  | DocumentSyncedMessage {
  return message.type.startsWith('doc:');
}

export function isCursorMessage(message: BaseMessage): message is
  | CursorMoveMessage
  | CursorUpdateMessage {
  return message.type.startsWith('cursor:');
}

export function isPresenceMessage(message: BaseMessage): message is
  | PresenceTypingMessage
  | PresenceTypingUpdatedMessage {
  return message.type.startsWith('presence:');
}

export function isTaskMessage(message: BaseMessage): message is
  | TaskStatusUpdateMessage
  | TaskStatusChangedMessage
  | TaskAssignedMessage
  | TaskCommentMessage {
  return message.type.startsWith('task:');
}

export function isSystemMessage(message: BaseMessage): message is
  | SystemErrorMessage
  | SystemAnnouncementMessage {
  return message.type.startsWith('system:');
}

// ============================================================================
// Message Builders
// ============================================================================

export function createMessage<T extends BaseMessage>(
  type: T['type'],
  payload?: T['payload']
): Omit<T, 'id' | 'timestamp'> {
  return {
    type,
    payload,
  } as Omit<T, 'id' | 'timestamp'>;
}

export function createRoomJoinedMessage(
  roomId: string,
  users: RoomUser[],
  document: DocumentState
): RoomJoinedMessage['payload'] {
  return {
    roomId,
    users,
    document,
  };
}

export function createCursorUpdate(
  userId: string,
  userName: string,
  color: string,
  position: number,
  selection?: CursorSelection
): CursorUpdate {
  return {
    userId,
    userName,
    color,
    position,
    selection,
  };
}

export function createTaskStatusUpdate(
  taskId: string,
  status: string,
  state: TaskStatusUpdate['state'],
  metadata?: Record<string, unknown>
): TaskStatusUpdate {
  return {
    id: crypto.randomUUID(),
    type: 'task_status',
    taskId,
    status,
    state,
    timestamp: new Date().toISOString(),
    metadata,
  };
}

// ============================================================================
// Export All Types
// ============================================================================

export type {
  BaseMessage,
  WebSocketMessage,
  AuthMessage,
  RoomJoinMessage,
  RoomJoinedMessage,
  RoomLeaveMessage,
  RoomLeftMessage,
  RoomUserJoinedMessage,
  RoomUserLeftMessage,
  RoomUserListMessage,
  DocumentState,
  DocumentOpenMessage,
  DocumentOpenedMessage,
  DocumentOperation,
  DocumentOperationMessage,
  DocumentOperationAppliedMessage,
  DocumentSyncMessage,
  DocumentSyncedMessage,
  CursorPosition,
  CursorSelection,
  CursorUpdate,
  CursorMoveMessage,
  CursorUpdateMessage,
  SelectionUpdate,
  SelectionUpdateMessage,
  PresenceTypingMessage,
  PresenceTypingUpdatedMessage,
  PresenceUpdate,
  TaskStatusUpdate,
  TaskStatusUpdateMessage,
  TaskStatusChangedMessage,
  TaskAssignedMessage,
  TaskCommentMessage,
  MemberStatusChangedMessage,
  SystemErrorMessage,
  SystemAnnouncementMessage,
  ProjectUpdatedMessage,
  NotificationMessage,
  RoomUser,
  CollaborationMessage,
  WebSocketMessageType,
};

export default {
  BaseMessage,
  WebSocketMessage,
  AuthMessage,
  RoomJoinMessage,
  RoomJoinedMessage,
  RoomLeaveMessage,
  RoomLeftMessage,
  RoomUserJoinedMessage,
  RoomUserLeftMessage,
  RoomUserListMessage,
  DocumentState,
  DocumentOpenMessage,
  DocumentOpenedMessage,
  DocumentOperation,
  DocumentOperationMessage,
  DocumentOperationAppliedMessage,
  DocumentSyncMessage,
  DocumentSyncedMessage,
  CursorPosition,
  CursorSelection,
  CursorUpdate,
  CursorMoveMessage,
  CursorUpdateMessage,
  SelectionUpdate,
  SelectionUpdateMessage,
  PresenceTypingMessage,
  PresenceTypingUpdatedMessage,
  PresenceUpdate,
  TaskStatusUpdate,
  TaskStatusUpdateMessage,
  TaskStatusChangedMessage,
  TaskAssignedMessage,
  TaskCommentMessage,
  MemberStatusChangedMessage,
  SystemErrorMessage,
  SystemAnnouncementMessage,
  ProjectUpdatedMessage,
  NotificationMessage,
  RoomUser,
  CollaborationMessage,
  WebSocketMessageType,
  isAuthMessage,
  isRoomMessage,
  isDocumentMessage,
  isCursorMessage,
  isPresenceMessage,
  isTaskMessage,
  isSystemMessage,
  createMessage,
  createRoomJoinedMessage,
  createCursorUpdate,
  createTaskStatusUpdate,
};
