/**
 * Message Sync Types
 * Cross-platform message synchronization types
 */

// ============================================================================
// Message Types
// ============================================================================

export enum MessagePlatform {
  WEB = 'web',
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
  API = 'api',
  SYSTEM = 'system',
}

export enum MessageType {
  TEXT = 'text',
  SYSTEM = 'system',
  NOTIFICATION = 'notification',
  COMMAND = 'command',
  EVENT = 'event',
  FILE = 'file',
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
}

export enum SyncDirection {
  BIDIRECTIONAL = 'bidirectional',
  TO_CLIENTS = 'to_clients',
  TO_SERVER = 'to_server',
}

export enum SyncPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

// ============================================================================
// Core Message Interface
// ============================================================================

export interface Message {
  id: string;
  roomId: string;
  platform: MessagePlatform;
  type: MessageType;
  status: MessageStatus;
  content: string;
  metadata?: Record<string, unknown>;
  senderId: string;
  senderName: string;
  recipientId?: string;
  replyToId?: string;
  timestamp: Date;
  syncedAt?: Date;
  syncPriority?: SyncPriority;
  retryCount?: number;
  expiresAt?: Date;
}

// ============================================================================
// Message Sync Protocol
// ============================================================================

export interface SyncMessage {
  type: 'sync' | 'ack' | 'nack' | 'query' | 'batch';
  messageId: string;
  roomId: string;
  platform: MessagePlatform;
  timestamp: Date;
  payload?: unknown;
  syncId?: string;
  sequence?: number;
}

export interface SyncAck {
  syncId: string;
  messageId: string;
  status: 'success' | 'failed';
  timestamp: Date;
  error?: string;
}

export interface SyncBatch {
  syncId: string;
  messages: Message[];
  sequence: number;
  totalBatches?: number;
  timestamp: Date;
}

export interface SyncQuery {
  roomId: string;
  since?: Date;
  platform?: MessagePlatform;
  limit?: number;
  sequence?: number;
}

// ============================================================================
// Platform Sync State
// ============================================================================

export interface PlatformSyncState {
  platform: MessagePlatform;
  lastSyncAt?: Date;
  lastSyncSequence?: number;
  pendingMessages: number;
  failedMessages: number;
  isConnected: boolean;
  clientInfo?: {
    userId: string;
    deviceType?: string;
    appVersion?: string;
    osVersion?: string;
  };
}

// ============================================================================
// Message Sync Configuration
// ============================================================================

export interface SyncConfig {
  enabled: boolean;
  platforms: MessagePlatform[];
  syncDirection: SyncDirection;
  retryAttempts: number;
  retryDelay: number;
  batchTimeout: number;
  maxBatchSize: number;
  enableCompression: boolean;
  enableEncryption: boolean;
  offlineMode: boolean;
}

// ============================================================================
// Room Sync Context
// ============================================================================

export interface RoomSyncContext {
  roomId: string;
  participants: string[];
  platforms: Map<string, MessagePlatform[]>;
  lastMessageId: string;
  lastSyncAt: Date;
  messageCount: number;
}

// ============================================================================
// Sync Statistics
// ============================================================================

export interface SyncStatistics {
  totalMessages: number;
  syncedMessages: number;
  pendingMessages: number;
  failedMessages: number;
  averageLatency: number;
  messagesPerPlatform: Record<MessagePlatform, number>;
  lastSyncAt?: Date;
  uptime: number;
}

// ============================================================================
// Event Types
// ============================================================================

export interface MessageEvent {
  type: 'message:sent' | 'message:received' | 'message:synced' | 'message:failed';
  message: Message;
  platform: MessagePlatform;
  timestamp: Date;
}

export interface SyncEvent {
  type: 'sync:started' | 'sync:completed' | 'sync:failed' | 'sync:retry';
  syncId: string;
  roomId: string;
  timestamp: Date;
  details?: {
    messageCount?: number;
    successCount?: number;
    failureCount?: number;
    error?: string;
  };
}

export interface PlatformEvent {
  type: 'platform:connected' | 'platform:disconnected' | 'platform:reconnected';
  platform: MessagePlatform;
  timestamp: Date;
  userId?: string;
}


