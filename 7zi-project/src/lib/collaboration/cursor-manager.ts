/**
 * CursorManager - 光标和在线状态管理器
 * 
 * 负责管理多用户协作中的光标同步和在线状态
 * 基于 Yjs Awareness 机制实现
 * 
 * @module collaboration/cursor-manager
 * @version 1.0.0
 */

import {
  CursorPosition,
  CursorState,
  CursorUpdateEvent,
  CollaborationUser,
  UserPresence,
  UserStatus,
  CollaborationConfig,
  DEFAULT_COLLABORATION_CONFIG,
  generateUserColor,
  calculateDistance,
  generateId,
} from './types';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 光标监听器
 */
export type CursorListener = (cursors: Map<string, CursorState>) => void;

/**
 * 用户状态监听器
 */
export type UserPresenceListener = (users: Map<string, UserPresence>) => void;

/**
 * 光标管理器配置
 */
export interface CursorManagerConfig extends Partial<CollaborationConfig> {
  /** 当前用户 ID */
  userId: string;
  /** 当前用户名 */
  userName: string;
  /** 用户头像（可选） */
  userAvatar?: string;
  /** 用户颜色（可选，自动生成） */
  userColor?: string;
}

// ============================================================================
// CursorManager 类
// ============================================================================

/**
 * 光标管理器
 * 
 * 管理本地和远程光标状态，提供节流、过滤和自动隐藏功能
 * 
 * @example
 * const manager = new CursorManager({
 *   userId: 'user-123',
 *   userName: 'Alice',
 * });
 * 
 * // 监听光标变化
 * manager.onCursorsChange((cursors) => {
 *   console.log('Remote cursors:', cursors);
 * });
 * 
 * // 更新本地光标
 * manager.updateLocalCursor({ x: 100, y: 200, nodeId: 'node-1' });
 * 
 * // 更新远程光标
 * manager.updateRemoteCursor('user-456', {
 *   cursor: { x: 300, y: 400 },
 *   user: { id: 'user-456', name: 'Bob', color: '#FF5733' },
 *   timestamp: Date.now(),
 * });
 * 
 * // 清理
 * manager.dispose();
 */
export class CursorManager {
  private config: CollaborationConfig;
  private currentUser: CollaborationUser;
  
  // 本地状态
  private localCursor: CursorPosition | null = null;
  private lastCursorUpdate: number = 0;
  private cursorUpdateTimer?: ReturnType<typeof setTimeout>;
  
  // 远程光标状态
  private remoteCursors: Map<string, CursorState> = new Map();
  
  // 用户存在状态
  private userPresences: Map<string, UserPresence> = new Map();
  
  // 监听器
  private cursorListeners: Set<CursorListener> = new Set();
  private presenceListeners: Set<UserPresenceListener> = new Set();
  
  // 清理定时器
  private cleanupTimer?: ReturnType<typeof setInterval>;
  
  constructor(config: CursorManagerConfig) {
    this.config = {
      ...DEFAULT_COLLABORATION_CONFIG,
      ...config,
    };
    
    // 初始化当前用户
    this.currentUser = {
      id: config.userId,
      name: config.userName,
      avatar: config.userAvatar,
      color: config.userColor || generateUserColor(config.userId),
      isOnline: true,
      lastActivity: Date.now(),
    };
    
    // 启动清理定时器
    this.startCleanup();
  }

  // ========================================================================
  // 本地光标管理
  // ========================================================================

  /**
   * 更新本地光标位置（带节流）
   * 
   * @param position - 新的光标位置
   * @param immediate - 是否立即更新（跳过节流）
   */
  updateLocalCursor(position: CursorPosition, immediate: boolean = false): void {
    const now = Date.now();
    
    // 检查是否需要更新（距离过滤）
    if (!immediate && this.localCursor) {
      const distance = calculateDistance(this.localCursor, position);
      if (distance < this.config.cursorMinDistance) {
        return; // 移动距离太小，忽略
      }
    }
    
    // 更新本地光标
    this.localCursor = position;
    this.currentUser.lastActivity = now;
    
    // 节流处理
    if (immediate || now - this.lastCursorUpdate >= this.config.cursorThrottle) {
      this.lastCursorUpdate = now;
      this.emitCursorChange();
    } else {
      // 取消之前的定时器
      if (this.cursorUpdateTimer) {
        clearTimeout(this.cursorUpdateTimer);
      }
      
      // 设置新的定时器
      this.cursorUpdateTimer = setTimeout(() => {
        this.lastCursorUpdate = Date.now();
        this.emitCursorChange();
      }, this.config.cursorThrottle);
    }
  }

  /**
   * 隐藏本地光标
   */
  hideLocalCursor(): void {
    this.localCursor = null;
    this.emitCursorChange();
  }

  /**
   * 获取本地光标状态
   */
  getLocalCursorState(): CursorState | null {
    if (!this.localCursor) {
      return null;
    }
    
    return {
      cursor: this.localCursor,
      user: {
        id: this.currentUser.id,
        name: this.currentUser.name,
        color: this.currentUser.color,
        avatar: this.currentUser.avatar,
        isOnline: true,
        lastActivity: Date.now(),
      },
      timestamp: Date.now(),
    };
  }

  /**
   * 获取当前用户信息
   */
  getCurrentUser(): CollaborationUser {
    return { ...this.currentUser };
  }

  // ========================================================================
  // 远程光标管理
  // ========================================================================

  /**
   * 更新远程光标
   * 
   * @param userId - 用户 ID
   * @param state - 光标状态
   */
  updateRemoteCursor(userId: string, state: CursorState): void {
    // 忽略自己的光标
    if (userId === this.currentUser.id) {
      return;
    }
    
    // 更新光标状态
    this.remoteCursors.set(userId, state);
    
    // 构建完整的用户信息
    const fullUser: CollaborationUser = {
      id: state.user.id,
      name: state.user.name,
      color: state.user.color,
      avatar: state.user.avatar,
      isOnline: state.user.isOnline ?? true,
      lastActivity: state.user.lastActivity ?? state.timestamp,
    };
    
    // 更新用户存在状态
    this.updateUserPresence(userId, {
      user: fullUser,
      status: 'active',
      sessionId: '', // 由外部设置
      joinedAt: Date.now(),
      lastHeartbeat: state.timestamp,
    });
    
    // 通知监听器
    this.emitCursorChange();
  }

  /**
   * 移除远程光标
   * 
   * @param userId - 用户 ID
   */
  removeRemoteCursor(userId: string): void {
    this.remoteCursors.delete(userId);
    this.emitCursorChange();
  }

  /**
   * 获取所有远程光标
   */
  getRemoteCursors(): Map<string, CursorState> {
    return new Map(this.remoteCursors);
  }

  /**
   * 获取指定用户的远程光标
   */
  getRemoteCursor(userId: string): CursorState | undefined {
    return this.remoteCursors.get(userId);
  }

  /**
   * 清除所有远程光标
   */
  clearRemoteCursors(): void {
    this.remoteCursors.clear();
    this.emitCursorChange();
  }

  // ========================================================================
  // 用户存在管理
  // ========================================================================

  /**
   * 更新用户存在状态
   * 
   * @param userId - 用户 ID
   * @param presence - 存在状态
   */
  updateUserPresence(userId: string, presence: UserPresence): void {
    const existing = this.userPresences.get(userId);
    
    if (existing) {
      // 更新现有状态
      this.userPresences.set(userId, {
        ...existing,
        ...presence,
        lastHeartbeat: Date.now(),
      });
    } else {
      // 新用户
      this.userPresences.set(userId, presence);
    }
    
    this.emitPresenceChange();
  }

  /**
   * 移除用户存在状态
   * 
   * @param userId - 用户 ID
   */
  removeUserPresence(userId: string): void {
    this.userPresences.delete(userId);
    this.removeRemoteCursor(userId);
    this.emitPresenceChange();
  }

  /**
   * 获取所有用户存在状态
   */
  getUserPresences(): Map<string, UserPresence> {
    return new Map(this.userPresences);
  }

  /**
   * 获取在线用户列表
   */
  getOnlineUsers(): CollaborationUser[] {
    const users: CollaborationUser[] = [];
    
    // 添加当前用户
    users.push(this.currentUser);
    
    // 添加在线的远程用户
    Array.from(this.userPresences.values()).forEach(presence => {
      if (presence.status !== 'offline') {
        users.push(presence.user);
      }
    });
    
    return users;
  }

  /**
   * 获取在线用户数量
   */
  getOnlineUserCount(): number {
    return this.userPresences.size + 1; // +1 for current user
  }

  /**
   * 检查用户是否在线
   */
  isUserOnline(userId: string): boolean {
    if (userId === this.currentUser.id) {
      return true;
    }
    
    const presence = this.userPresences.get(userId);
    return presence !== undefined && presence.status !== 'offline';
  }

  // ========================================================================
  // 事件监听
  // ========================================================================

  /**
   * 监听光标变化
   * 
   * @param listener - 监听器函数
   * @returns 取消监听的函数
   */
  onCursorsChange(listener: CursorListener): () => void {
    this.cursorListeners.add(listener);
    
    // 立即调用一次，提供当前状态
    listener(this.getRemoteCursors());
    
    // 返回取消监听的函数
    return () => {
      this.cursorListeners.delete(listener);
    };
  }

  /**
   * 监听用户存在变化
   * 
   * @param listener - 监听器函数
   * @returns 取消监听的函数
   */
  onPresenceChange(listener: UserPresenceListener): () => void {
    this.presenceListeners.add(listener);
    
    // 立即调用一次，提供当前状态
    listener(this.getUserPresences());
    
    // 返回取消监听的函数
    return () => {
      this.presenceListeners.delete(listener);
    };
  }

  // ========================================================================
  // 清理和资源释放
  // ========================================================================

  /**
   * 释放资源
   */
  dispose(): void {
    // 清理定时器
    this.stopCleanup();
    
    if (this.cursorUpdateTimer) {
      clearTimeout(this.cursorUpdateTimer);
      this.cursorUpdateTimer = undefined;
    }
    
    // 清理状态
    this.remoteCursors.clear();
    this.userPresences.clear();
    this.cursorListeners.clear();
    this.presenceListeners.clear();
    this.localCursor = null;
  }

  // ========================================================================
  // 私有方法
  // ========================================================================

  /**
   * 启动清理定时器
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredCursors();
      this.cleanupOfflineUsers();
    }, this.config.offlineTimeout / 2);
  }

  /**
   * 停止清理定时器
   */
  private stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * 清理过期的光标
   */
  private cleanupExpiredCursors(): void {
    const now = Date.now();
    const expired: string[] = [];
    
    Array.from(this.remoteCursors.entries()).forEach(([userId, state]) => {
      if (now - state.timestamp > this.config.cursorHideTimeout) {
        expired.push(userId);
      }
    });
    
    for (const userId of expired) {
      this.removeRemoteCursor(userId);
    }
  }

  /**
   * 清理离线用户
   */
  private cleanupOfflineUsers(): void {
    const now = Date.now();
    const offline: string[] = [];
    
    Array.from(this.userPresences.entries()).forEach(([userId, presence]) => {
      if (now - presence.lastHeartbeat > this.config.offlineTimeout) {
        offline.push(userId);
      }
    });
    
    for (const userId of offline) {
      this.removeUserPresence(userId);
    }
  }

  /**
   * 触发光标变化事件
   */
  private emitCursorChange(): void {
    const cursors = this.getRemoteCursors();
    
    Array.from(this.cursorListeners).forEach(listener => {
      try {
        listener(cursors);
      } catch (error) {
        console.error('[CursorManager] 光标监听器错误:', error);
      }
    });
  }

  /**
   * 触发用户存在变化事件
   */
  private emitPresenceChange(): void {
    const presences = this.getUserPresences();
    
    Array.from(this.presenceListeners).forEach(listener => {
      try {
        listener(presences);
      } catch (error) {
        console.error('[CursorManager] 存在监听器错误:', error);
      }
    });
  }
}

// ============================================================================
// 导出
// ============================================================================

export default CursorManager;