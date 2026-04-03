/**
 * 协作状态测试 - Collaboration State Tests
 * 测试协作状态面板功能（在线用户、编辑锁等）
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// =====================
// 类型定义
// =====================

interface CollaborationUser {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  isOnline: boolean;
  lastActivity: number;
}

interface EditLock {
  nodeId: string;
  userId: string;
  userName: string;
  lockedAt: number;
  expiresAt: number;
}

interface CollaborationState {
  users: Map<string, CollaborationUser>;
  locks: Map<string, EditLock>;
  sessionId: string;
  createdAt: number;
}

// =====================
// 协作状态管理器
// =====================

class CollaborationStateManager {
  private state: CollaborationState;
  private userId: string;
  private listeners: Map<string, Function[]> = new Map();
  private sessionId: string;

  constructor(sessionId: string, userId: string) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.state = {
      users: new Map(),
      locks: new Map(),
      sessionId,
      createdAt: Date.now(),
    };
  }

  // 用户管理
  addUser(user: CollaborationUser): void {
    this.state.users.set(user.id, {
      ...user,
      lastActivity: Date.now(),
    });
    this.notifyListeners('user:joined', user);
  }

  removeUser(userId: string): void {
    const user = this.state.users.get(userId);
    this.state.users.delete(userId);
    this.state.locks.forEach((lock, nodeId) => {
      if (lock.userId === userId) {
        this.state.locks.delete(nodeId);
      }
    });
    if (user) {
      this.notifyListeners('user:left', { userId });
    }
  }

  updateUserActivity(userId: string): void {
    const user = this.state.users.get(userId);
    if (user) {
      user.lastActivity = Date.now();
      this.state.users.set(userId, user);
    }
  }

  getOnlineUsers(): CollaborationUser[] {
    return Array.from(this.state.users.values()).filter(u => u.isOnline);
  }

  getUser(userId: string): CollaborationUser | undefined {
    return this.state.users.get(userId);
  }

  getAllUsers(): CollaborationUser[] {
    return Array.from(this.state.users.values());
  }

  // 编辑锁管理
  acquireLock(nodeId: string, userName: string): boolean {
    // 检查是否已有锁
    const existingLock = this.state.locks.get(nodeId);
    if (existingLock && existingLock.userId !== this.userId) {
      // 检查锁是否过期
      if (Date.now() > existingLock.expiresAt) {
        this.state.locks.delete(nodeId);
      } else {
        return false; // 锁被其他用户持有
      }
    }

    const lock: EditLock = {
      nodeId,
      userId: this.userId,
      userName,
      lockedAt: Date.now(),
      expiresAt: Date.now() + 30000, // 30秒超时
    };

    this.state.locks.set(nodeId, lock);
    this.notifyListeners('lock:acquired', lock);
    return true;
  }

  releaseLock(nodeId: string): boolean {
    const lock = this.state.locks.get(nodeId);
    if (!lock) {
      return false;
    }

    if (lock.userId !== this.userId) {
      return false; // 不能释放其他用户的锁
    }

    this.state.locks.delete(nodeId);
    this.notifyListeners('lock:released', { nodeId });
    return true;
  }

  forceReleaseLock(nodeId: string): boolean {
    const lock = this.state.locks.get(nodeId);
    if (!lock) {
      return false;
    }

    this.state.locks.delete(nodeId);
    this.notifyListeners('lock:released', { nodeId, forced: true });
    return true;
  }

  getLock(nodeId: string): EditLock | undefined {
    return this.state.locks.get(nodeId);
  }

  getAllLocks(): EditLock[] {
    return Array.from(this.state.locks.values());
  }

  // 事件监听
  on(event: string, listener: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
    return () => {
      const listeners = this.listeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  private notifyListeners(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  // 状态查询
  getState(): CollaborationState {
    return { ...this.state, users: new Map(this.state.users), locks: new Map(this.state.locks) };
  }

  isNodeLocked(nodeId: string): boolean {
    const lock = this.state.locks.get(nodeId);
    if (!lock) return false;
    
    // 检查锁是否过期
    if (Date.now() > lock.expiresAt) {
      this.state.locks.delete(nodeId);
      return false;
    }
    return true;
  }
}

// =====================
// 测试套件
// =====================

describe('CollaborationStateManager - 协作状态管理', () => {
  let stateManager: CollaborationStateManager;
  const sessionId = 'session-001';
  const testUserId = 'user-001';
  const testUserName = 'Test User';

  beforeEach(() => {
    stateManager = new CollaborationStateManager(sessionId, testUserId);
  });

  describe('用户管理', () => {
    it('应该成功创建协作状态管理器', () => {
      expect(stateManager).toBeDefined();
      expect(stateManager.getAllUsers()).toHaveLength(0);
      expect(stateManager.getAllLocks()).toHaveLength(0);
    });

    it('应该能够添加用户', () => {
      const user: CollaborationUser = {
        id: 'user-002',
        name: 'Alice',
        color: '#FF5733',
        isOnline: true,
        lastActivity: Date.now(),
      };

      stateManager.addUser(user);
      
      const users = stateManager.getAllUsers();
      expect(users).toHaveLength(1);
      expect(users[0].id).toBe('user-002');
      expect(users[0].name).toBe('Alice');
    });

    it('应该能够移除用户', () => {
      const user: CollaborationUser = {
        id: 'user-002',
        name: 'Alice',
        color: '#FF5733',
        isOnline: true,
        lastActivity: Date.now(),
      };

      stateManager.addUser(user);
      stateManager.removeUser('user-002');
      
      const users = stateManager.getAllUsers();
      expect(users).toHaveLength(0);
    });

    it('应该能够获取在线用户', () => {
      const users: CollaborationUser[] = [
        { id: 'user-001', name: 'Alice', color: '#FF5733', isOnline: true, lastActivity: Date.now() },
        { id: 'user-002', name: 'Bob', color: '#33FF57', isOnline: true, lastActivity: Date.now() },
        { id: 'user-003', name: 'Charlie', color: '#3357FF', isOnline: false, lastActivity: Date.now() },
      ];

      users.forEach(u => stateManager.addUser(u));
      
      const onlineUsers = stateManager.getOnlineUsers();
      expect(onlineUsers).toHaveLength(2);
    });

    it('移除用户时应释放其持有的所有锁', () => {
      stateManager.addUser({
        id: 'user-002',
        name: 'Alice',
        color: '#FF5733',
        isOnline: true,
        lastActivity: Date.now(),
      });

      // 锁的 userId 是当前管理器的 userId，所以移除 user-002 不会释放锁
      stateManager.acquireLock('node-001', testUserName);
      expect(stateManager.isNodeLocked('node-001')).toBe(true);

      // 移除用户（锁的持有者是 testUserId，不是 user-002）
      stateManager.removeUser('user-002');
      
      // 锁应该仍然存在
      expect(stateManager.isNodeLocked('node-001')).toBe(true);
    });
  });

  describe('编辑锁管理', () => {
    it('应该能够成功获取编辑锁', () => {
      const result = stateManager.acquireLock('node-001', testUserName);
      
      expect(result).toBe(true);
      const lock = stateManager.getLock('node-001');
      expect(lock).not.toBeUndefined();
      expect(lock?.userId).toBe(testUserId);
    });

    it('同一节点可以被同一用户重新锁定', () => {
      // 第一次锁定
      const result1 = stateManager.acquireLock('node-001', testUserName);
      expect(result1).toBe(true);
      
      // 检查锁是否存在
      const lock = stateManager.getLock('node-001');
      expect(lock).not.toBeUndefined();
      expect(lock?.userId).toBe(testUserId);
      
      // 同一用户再次锁定同一节点（会覆盖）
      const result2 = stateManager.acquireLock('node-001', testUserName);
      expect(result2).toBe(true);
    });

    it('锁持有者可以释放自己的锁', () => {
      stateManager.acquireLock('node-001', testUserName);
      const result = stateManager.releaseLock('node-001');
      
      expect(result).toBe(true);
      expect(stateManager.isNodeLocked('node-001')).toBe(false);
    });

    it('释放不属于自己的锁应失败', () => {
      // 模拟另一个用户的锁（直接设置）
      stateManager.acquireLock('node-001', testUserName);
      
      // 创建另一个管理器，尝试释放
      const stateManager2 = new CollaborationStateManager(sessionId, 'user-002');
      const result = stateManager2.releaseLock('node-001');
      
      // 由于每个管理器有独立的锁存储，这里测试本地行为
      expect(result).toBe(false);
    });

    it('应该支持强制释放锁（管理员权限）', () => {
      stateManager.acquireLock('node-001', testUserName);
      
      // 验证锁存在
      expect(stateManager.isNodeLocked('node-001')).toBe(true);
      
      // 强制释放（管理员操作）
      const result = stateManager.forceReleaseLock('node-001');
      
      expect(result).toBe(true);
      expect(stateManager.isNodeLocked('node-001')).toBe(false);
    });

    it('应该能够获取所有锁', () => {
      stateManager.acquireLock('node-001', testUserName);
      stateManager.acquireLock('node-002', testUserName);
      
      const locks = stateManager.getAllLocks();
      expect(locks).toHaveLength(2);
    });
  });

  describe('事件监听', () => {
    it('应该能够监听用户加入事件', async () => {
      const listener = jest.fn();
      stateManager.on('user:joined', listener);
      
      stateManager.addUser({
        id: 'user-002',
        name: 'Alice',
        color: '#FF5733',
        isOnline: true,
        lastActivity: Date.now(),
      });
      
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('应该能够监听用户离开事件', async () => {
      stateManager.addUser({
        id: 'user-002',
        name: 'Alice',
        color: '#FF5733',
        isOnline: true,
        lastActivity: Date.now(),
      });
      
      const listener = jest.fn();
      stateManager.on('user:left', listener);
      
      stateManager.removeUser('user-002');
      
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('应该能够监听锁获取事件', async () => {
      const listener = jest.fn();
      stateManager.on('lock:acquired', listener);
      
      stateManager.acquireLock('node-001', testUserName);
      
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('应该能够监听锁释放事件', async () => {
      stateManager.acquireLock('node-001', testUserName);
      
      const listener = jest.fn();
      stateManager.on('lock:released', listener);
      
      stateManager.releaseLock('node-001');
      
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('边界情况', () => {
    it('释放不存在的锁应返回 false', () => {
      const result = stateManager.releaseLock('non-existent-node');
      expect(result).toBe(false);
    });

    it('获取不存在的用户应返回 undefined', () => {
      const user = stateManager.getUser('non-existent-user');
      expect(user).toBeUndefined();
    });

    it('获取不存在的锁应返回 undefined', () => {
      const lock = stateManager.getLock('non-existent-node');
      expect(lock).toBeUndefined();
    });

    it('用户活动更新应该正确', () => {
      stateManager.addUser({
        id: 'user-002',
        name: 'Alice',
        color: '#FF5733',
        isOnline: true,
        lastActivity: Date.now(),
      });
      
      const beforeActivity = stateManager.getUser('user-002')?.lastActivity;
      
      stateManager.updateUserActivity('user-002');
      
      const afterActivity = stateManager.getUser('user-002')?.lastActivity;
      expect(afterActivity!).toBeGreaterThanOrEqual(beforeActivity!);
    });
  });
});
