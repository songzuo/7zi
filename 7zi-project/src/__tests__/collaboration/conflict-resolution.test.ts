/**
 * 冲突解决测试 - Conflict Resolution Tests
 * 测试协作系统中的冲突检测和解决机制
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// =====================
// 类型定义
// =====================

interface Operation {
  id: string;
  type: 'insert' | 'delete' | 'update' | 'move';
  userId: string;
  nodeId: string;
  payload: unknown;
  timestamp: number;
  version: number;
}

interface ConflictResult {
  hasConflict: boolean;
  conflictType?: 'edit-edit' | 'edit-delete' | 'move-delete';
  operations?: Operation[];
}

interface Resolution {
  strategy: 'last-write-wins' | 'merge' | 'transform' | 'manual';
  winner?: Operation;
  transformed?: Operation;
  merged?: Operation;
}

// =====================
// 冲突检测器
// =====================

class ConflictDetector {
  private version: number = 0;
  private pendingOps: Map<string, Operation[]> = new Map();
  private resolvedOps: Map<string, Operation> = new Map();

  detectConflict(ops: Operation[]): ConflictResult {
    if (ops.length < 2) {
      return { hasConflict: false };
    }

    // 按节点分组操作
    const byNode = new Map<string, Operation[]>();
    ops.forEach(op => {
      const nodeOps = byNode.get(op.nodeId) || [];
      nodeOps.push(op);
      byNode.set(op.nodeId, nodeOps);
    });

    // 检查每个节点的冲突
    for (const [nodeId, nodeOps] of byNode) {
      if (nodeOps.length > 1) {
        // 检测不同类型的冲突
        const types = new Set(nodeOps.map(op => op.type));
        
        // 编辑-删除冲突
        if (types.has('delete') && (types.has('insert') || types.has('update'))) {
          return {
            hasConflict: true,
            conflictType: 'edit-delete',
            operations: nodeOps,
          };
        }

        // 移动-删除冲突
        if (types.has('delete') && types.has('move')) {
          return {
            hasConflict: true,
            conflictType: 'move-delete',
            operations: nodeOps,
          };
        }

        // 编辑-编辑冲突
        if (types.has('update') || types.has('insert')) {
          return {
            hasConflict: true,
            conflictType: 'edit-edit',
            operations: nodeOps,
          };
        }
      }
    }

    return { hasConflict: false };
  }

  resolveConflict(ops: Operation[], strategy: Resolution['strategy'] = 'last-write-wins'): Resolution {
    const conflict = this.detectConflict(ops);
    
    if (!conflict.hasConflict) {
      return { strategy: 'last-write-wins', winner: ops[0] };
    }

    switch (strategy) {
      case 'last-write-wins':
        return this.resolveLastWriteWins(ops);
      
      case 'merge':
        return this.resolveMerge(ops);
      
      case 'transform':
        return this.resolveTransform(ops);
      
      default:
        return { strategy: 'manual', winner: ops[0] };
    }
  }

  private resolveLastWriteWins(ops: Operation[]): Resolution {
    const sorted = [...ops].sort((a, b) => b.timestamp - a.timestamp);
    return { strategy: 'last-write-wins', winner: sorted[0] };
  }

  private resolveMerge(ops: Operation[]): Resolution {
    if (ops.every(op => op.type === 'update')) {
      // 合并所有更新操作
      const merged: Operation = {
        id: `merged-${Date.now()}`,
        type: 'update',
        userId: 'system',
        nodeId: ops[0].nodeId,
        payload: ops.reduce((acc, op) => ({ ...acc, ...(op.payload as object) }), {}),
        timestamp: Date.now(),
        version: this.version++,
      };
      return { strategy: 'merge', merged };
    }
    return this.resolveLastWriteWins(ops);
  }

  private resolveTransform(ops: Operation[]): Resolution {
    // 操作转换 (OT) - 简化实现
    const [op1, op2] = ops;
    
    if (op1.type === 'insert' && op2.type === 'insert') {
      // 调整位置
      const transformed: Operation = {
        ...op2,
        payload: {
          ...(op2.payload as object),
          position: ((op2.payload as { position?: number }).position || 0) + ((op1.payload as { length?: number }).length || 0),
        },
        version: this.version++,
      };
      return { strategy: 'transform', transformed };
    }

    return this.resolveLastWriteWins(ops);
  }

  applyOperation(op: Operation): boolean {
    this.resolvedOps.set(op.id, op);
    this.version = Math.max(this.version, op.version) + 1;
    return true;
  }

  getVersion(): number {
    return this.version;
  }
}

// =====================
// 测试套件
// =====================

describe('ConflictDetector - 冲突检测器', () => {
  let detector: ConflictDetector;

  beforeEach(() => {
    detector = new ConflictDetector();
  });

  describe('冲突检测', () => {
    it('单个操作不应该有冲突', () => {
      const op: Operation = {
        id: 'op-001',
        type: 'update',
        userId: 'user-001',
        nodeId: 'node-001',
        payload: { content: 'Hello' },
        timestamp: Date.now(),
        version: 1,
      };

      const result = detector.detectConflict([op]);
      expect(result.hasConflict).toBe(false);
    });

    it('不同节点的操作不应该有冲突', () => {
      const ops: Operation[] = [
        {
          id: 'op-001',
          type: 'update',
          userId: 'user-001',
          nodeId: 'node-001',
          payload: { content: 'Hello' },
          timestamp: Date.now(),
          version: 1,
        },
        {
          id: 'op-002',
          type: 'update',
          userId: 'user-002',
          nodeId: 'node-002',
          payload: { content: 'World' },
          timestamp: Date.now(),
          version: 1,
        },
      ];

      const result = detector.detectConflict(ops);
      expect(result.hasConflict).toBe(false);
    });

    it('应该检测到编辑-编辑冲突', () => {
      const ops: Operation[] = [
        {
          id: 'op-001',
          type: 'update',
          userId: 'user-001',
          nodeId: 'node-001',
          payload: { content: 'Hello' },
          timestamp: Date.now(),
          version: 1,
        },
        {
          id: 'op-002',
          type: 'update',
          userId: 'user-002',
          nodeId: 'node-001',
          payload: { content: 'World' },
          timestamp: Date.now() + 10,
          version: 1,
        },
      ];

      const result = detector.detectConflict(ops);
      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('edit-edit');
    });

    it('应该检测到编辑-删除冲突', () => {
      const ops: Operation[] = [
        {
          id: 'op-001',
          type: 'update',
          userId: 'user-001',
          nodeId: 'node-001',
          payload: { content: 'Hello' },
          timestamp: Date.now(),
          version: 1,
        },
        {
          id: 'op-002',
          type: 'delete',
          userId: 'user-002',
          nodeId: 'node-001',
          payload: {},
          timestamp: Date.now() + 10,
          version: 1,
        },
      ];

      const result = detector.detectConflict(ops);
      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('edit-delete');
    });

    it('应该检测到移动-删除冲突', () => {
      const ops: Operation[] = [
        {
          id: 'op-001',
          type: 'move',
          userId: 'user-001',
          nodeId: 'node-001',
          payload: { position: 5 },
          timestamp: Date.now(),
          version: 1,
        },
        {
          id: 'op-002',
          type: 'delete',
          userId: 'user-002',
          nodeId: 'node-001',
          payload: {},
          timestamp: Date.now() + 10,
          version: 1,
        },
      ];

      const result = detector.detectConflict(ops);
      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('move-delete');
    });
  });

  describe('冲突解决', () => {
    it('Last-Write-Wins 策略应该选择最新时间戳的操作', () => {
      const ops: Operation[] = [
        {
          id: 'op-001',
          type: 'update',
          userId: 'user-001',
          nodeId: 'node-001',
          payload: { content: 'First' },
          timestamp: 1000,
          version: 1,
        },
        {
          id: 'op-002',
          type: 'update',
          userId: 'user-002',
          nodeId: 'node-001',
          payload: { content: 'Second' },
          timestamp: 2000,
          version: 1,
        },
      ];

      const resolution = detector.resolveConflict(ops, 'last-write-wins');
      expect(resolution.winner?.id).toBe('op-002');
    });

    it('Merge 策略应该合并更新操作', () => {
      const ops: Operation[] = [
        {
          id: 'op-001',
          type: 'update',
          userId: 'user-001',
          nodeId: 'node-001',
          payload: { title: 'Hello' },
          timestamp: Date.now(),
          version: 1,
        },
        {
          id: 'op-002',
          type: 'update',
          userId: 'user-002',
          nodeId: 'node-001',
          payload: { content: 'World' },
          timestamp: Date.now() + 10,
          version: 1,
        },
      ];

      const resolution = detector.resolveConflict(ops, 'merge');
      expect(resolution.strategy).toBe('merge');
      expect(resolution.merged?.payload.title).toBe('Hello');
      expect(resolution.merged?.payload.content).toBe('World');
    });

    it('Transform 策略应该调整插入位置', () => {
      const ops: Operation[] = [
        {
          id: 'op-001',
          type: 'insert',
          userId: 'user-001',
          nodeId: 'node-001',
          payload: { position: 0, text: 'Hello', length: 5 },
          timestamp: Date.now(),
          version: 1,
        },
        {
          id: 'op-002',
          type: 'insert',
          userId: 'user-002',
          nodeId: 'node-001',
          payload: { position: 3, text: 'World' },
          timestamp: Date.now() + 10,
          version: 1,
        },
      ];

      const resolution = detector.resolveConflict(ops, 'transform');
      expect(resolution.strategy).toBe('transform');
      expect(resolution.transformed?.payload.position).toBe(8); // 3 + 5
    });

    it('Manual 策略应该保留冲突供人工解决', () => {
      const ops: Operation[] = [
        {
          id: 'op-001',
          type: 'update',
          userId: 'user-001',
          nodeId: 'node-001',
          payload: { content: 'First' },
          timestamp: Date.now(),
          version: 1,
        },
        {
          id: 'op-002',
          type: 'update',
          userId: 'user-002',
          nodeId: 'node-001',
          payload: { content: 'Second' },
          timestamp: Date.now() + 10,
          version: 1,
        },
      ];

      const resolution = detector.resolveConflict(ops, 'manual');
      expect(resolution.strategy).toBe('manual');
    });
  });

  describe('操作应用', () => {
    it('应该正确应用操作并更新版本号', () => {
      const op: Operation = {
        id: 'op-001',
        type: 'update',
        userId: 'user-001',
        nodeId: 'node-001',
        payload: { content: 'Test' },
        timestamp: Date.now(),
        version: 5,
      };

      detector.applyOperation(op);
      expect(detector.getVersion()).toBe(6);
    });

    it('版本号应该单调递增', () => {
      for (let i = 0; i < 5; i++) {
        const op: Operation = {
          id: `op-${i}`,
          type: 'update',
          userId: 'user-001',
          nodeId: 'node-001',
          payload: { content: `Test ${i}` },
          timestamp: Date.now(),
          version: 1,
        };
        detector.applyOperation(op);
      }

      expect(detector.getVersion()).toBeGreaterThanOrEqual(5);
    });
  });

  describe('边界情况', () => {
    it('空操作数组不应该有冲突', () => {
      const result = detector.detectConflict([]);
      expect(result.hasConflict).toBe(false);
    });

    it('无效策略应该回退到 Last-Write-Wins', () => {
      const ops: Operation[] = [
        {
          id: 'op-001',
          type: 'update',
          userId: 'user-001',
          nodeId: 'node-001',
          payload: { content: 'Test' },
          timestamp: Date.now(),
          version: 1,
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resolution = detector.resolveConflict(ops, 'invalid-strategy' as any);
      expect(resolution.strategy).toBe('last-write-wins');
    });
  });
});
