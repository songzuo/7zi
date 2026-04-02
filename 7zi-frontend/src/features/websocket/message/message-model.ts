/**
 * Message Model - WebSocket 消息数据模型
 */

export type MessageType = 'text' | 'file' | 'system' | 'notification' | 'image' | 'audio' | 'video'

export interface MessageContent {
  text?: string
  fileName?: string
  fileSize?: number
  fileUrl?: string
  mimeType?: string
  width?: number
  height?: number
  duration?: number
  thumbnailUrl?: string
}

export interface Message {
  id: string
  roomId: string
  senderId: string
  senderName: string
  type: MessageType
  content: MessageContent
  replyTo?: string
  replyToContent?: MessageContent
  editedAt?: number
  editedCount?: number
  deletedAt?: number
  deletedBy?: string
  readBy: string[]
  reactions?: MessageReaction[]
  createdAt: number
}

export interface MessageReaction {
  emoji: string
  userIds: string[]
  createdAt: number
}

export interface MessageSearchOptions {
  roomId?: string
  senderId?: string
  type?: MessageType
  startDate?: number
  endDate?: number
  query?: string
  limit?: number
  before?: number
  after?: number
}

export interface MessageEdit {
  content: MessageContent
  editedAt: number
}

export interface MessageDelete {
  deletedAt: number
  deletedBy: string
}
