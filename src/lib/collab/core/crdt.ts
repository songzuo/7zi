/**
 * CRDT (Conflict-free Replicated Data Types) Implementation
 * Based on Yjs-style RGA (Replicated Growable Array) for text
 */

import { generateId } from '../utils/id';

// ============================================================================
// Types
// ============================================================================

export type CRDTType = 'text' | 'list' | 'map';

export interface CRDTNode {
  id: string;
  origin: string | null; // Previous node ID
  right: string | null;  // Next node ID
  value: string;
  deleted: boolean;
  length: number;
}

export interface CRDTText {
  type: 'text';
  nodes: Map<string, CRDTNode>;
  head: string | null;
  tail: string | null;
}

export interface CRDTList {
  type: 'list';
  items: Map<string, unknown>;
  order: string[];
}

export interface CRDTMap {
  type: 'map';
  data: Map<string, unknown>;
}

export type CRDTData = CRDTText | CRDTList | CRDTMap;

// ============================================================================
// Operations
// ============================================================================

export enum OperationType {
  INSERT = 'insert',
  DELETE = 'delete',
  RETAIN = 'retain',
}

export interface InsertOperation {
  type: OperationType.INSERT;
  id: string;
  origin: string | null;
  right: string | null;
  value: string;
  position: number;
}

export interface DeleteOperation {
  type: OperationType.DELETE;
  id: string;
  position: number;
  length: number;
}

export interface RetainOperation {
  type: OperationType.RETAIN;
  position: number;
  length: number;
}

export type Operation = InsertOperation | DeleteOperation | RetainOperation;

export interface CRDTUpdate {
  documentId: string;
  operations: Operation[];
  timestamp: number;
  clientId: string;
  vectorClock: Map<string, number>;
}

// ============================================================================
// CRDT Text Implementation
// ============================================================================

export class CRDTTextImpl {
  private data: CRDTText;
  private vectorClock: Map<string, number>;
  private clientId: string;
  private content: string; // Simple content tracking for efficient access

  constructor(clientId: string, initialText: string = '') {
    this.clientId = clientId;
    this.vectorClock = new Map();
    this.content = '';
    this.data = {
      type: 'text',
      nodes: new Map(),
      head: null,
      tail: null,
    };

    if (initialText) {
      this.insert(0, initialText);
    }
  }

  /**
   * Insert text at position
   */
  insert(position: number, text: string): InsertOperation[] {
    const operations: InsertOperation[] = [];
    const chars = text.split('');

    if (chars.length === 0) return operations;

    // Get the nodes at the insert boundaries
    const nodes = this.getNodesArray();
    const prevNode = position > 0 ? nodes[position - 1] : null;
    const nextNode = position < nodes.length ? nodes[position] : null;

    let currentOrigin = prevNode?.id || null;
    let currentRight = nextNode?.id || null;

    for (let i = 0; i < chars.length; i++) {
      const nodeId = generateId();
      const node: CRDTNode = {
        id: nodeId,
        origin: currentOrigin,
        right: currentRight,
        value: chars[i],
        deleted: false,
        length: 1,
      };

      this.data.nodes.set(nodeId, node);

      // Update linked list
      if (currentOrigin) {
        const originNode = this.data.nodes.get(currentOrigin);
        if (originNode) {
          originNode.right = nodeId;
        }
      } else {
        this.data.head = nodeId;
      }

      if (currentRight) {
        const rightNode = this.data.nodes.get(currentRight);
        if (rightNode) {
          rightNode.origin = nodeId;
        }
      } else {
        this.data.tail = nodeId;
      }

      const operation: InsertOperation = {
        type: OperationType.INSERT,
        id: nodeId,
        origin: currentOrigin,
        right: currentRight,
        value: chars[i],
        position: position + i,
      };

      operations.push(operation);
      currentOrigin = nodeId;
      currentRight = null; // After first char, we're appending to the chain
    }

    // Update content
    this.content = this.content.slice(0, position) + text + this.content.slice(position);

    this.incrementVectorClock();
    return operations;
  }

  /**
   * Delete text at position
   */
  delete(position: number, length: number): DeleteOperation[] {
    const operations: DeleteOperation[] = [];
    
    for (let i = 0; i < length && position + i < this.content.length; i++) {
      const nodes = this.getNodesArray();
      const node = nodes[position + i];
      
      if (node && !node.deleted) {
        node.deleted = true;
        operations.push({
          type: OperationType.DELETE,
          id: node.id,
          position: position + i,
          length: 1,
        });
      }
    }

    // Update content
    this.content = this.content.slice(0, position) + this.content.slice(position + length);

    this.incrementVectorClock();
    return operations;
  }

  /**
   * Apply remote operation
   */
  applyOperation(operation: Operation): void {
    switch (operation.type) {
      case OperationType.INSERT:
        this.applyInsert(operation);
        break;
      case OperationType.DELETE:
        this.applyDelete(operation);
        break;
    }
  }

  private applyInsert(operation: InsertOperation): void {
    // Check if node already exists (idempotent)
    if (this.data.nodes.has(operation.id)) {
      return;
    }

    const node: CRDTNode = {
      id: operation.id,
      origin: operation.origin,
      right: operation.right,
      value: operation.value,
      deleted: false,
      length: 1,
    };

    this.data.nodes.set(operation.id, node);

    // Update linked list
    if (operation.origin) {
      const originNode = this.data.nodes.get(operation.origin);
      if (originNode) {
        node.right = originNode.right;
        originNode.right = operation.id;
      }
    } else {
      node.right = this.data.head;
      this.data.head = operation.id;
    }

    if (operation.right) {
      const rightNode = this.data.nodes.get(operation.right);
      if (rightNode) {
        rightNode.origin = operation.id;
      }
    }

    // Update tail if needed
    if (!node.right) {
      this.data.tail = operation.id;
    }

    // Rebuild content
    this.rebuildContent();

    this.mergeVectorClock(new Map([[operation.id, 1]]));
  }

  private applyDelete(operation: DeleteOperation): void {
    const node = this.data.nodes.get(operation.id);
    if (node) {
      node.deleted = true;
    }

    // Rebuild content
    this.rebuildContent();

    this.mergeVectorClock(new Map([[operation.id, 1]]));
  }

  /**
   * Get array of non-deleted nodes in order
   */
  private getNodesArray(): CRDTNode[] {
    const result: CRDTNode[] = [];
    let currentId = this.data.head;

    while (currentId) {
      const node = this.data.nodes.get(currentId);
      if (!node) break;

      if (!node.deleted) {
        result.push(node);
      }

      currentId = node.right;
    }

    return result;
  }

  /**
   * Rebuild content from nodes
   */
  private rebuildContent(): void {
    this.content = '';
    let currentId = this.data.head;

    while (currentId) {
      const node = this.data.nodes.get(currentId);
      if (!node) break;

      if (!node.deleted) {
        this.content += node.value;
      }

      currentId = node.right;
    }
  }

  /**
   * Get current text content
   */
  getText(): string {
    return this.content;
  }

  /**
   * Get vector clock
   */
  getVectorClock(): Map<string, number> {
    return new Map(this.vectorClock);
  }

  /**
   * Merge vector clock
   */
  mergeVectorClock(remoteClock: Map<string, number>): void {
    for (const [clientId, count] of Array.from(remoteClock.entries())) {
      const localCount = this.vectorClock.get(clientId) || 0;
      this.vectorClock.set(clientId, Math.max(localCount, count));
    }
  }

  /**
   * Increment vector clock
   */
  private incrementVectorClock(): void {
    const current = this.vectorClock.get(this.clientId) || 0;
    this.vectorClock.set(this.clientId, current + 1);
  }

  /**
   * Serialize to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      type: this.data.type,
      nodes: Array.from(this.data.nodes.entries()),
      head: this.data.head,
      tail: this.data.tail,
      vectorClock: Array.from(this.vectorClock.entries()),
      content: this.content,
    };
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(json: Record<string, unknown>, clientId: string): CRDTTextImpl {
    const crdt = new CRDTTextImpl(clientId);
    crdt.data = {
      type: json.type as 'text',
      nodes: new Map(json.nodes as [string, CRDTNode][]),
      head: json.head as string | null,
      tail: json.tail as string | null,
    };
    crdt.vectorClock = new Map(json.vectorClock as [string, number][]);
    crdt.content = (json.content as string) || '';
    return crdt;
  }
}

// ============================================================================
// CRDT List Implementation
// ============================================================================

export class CRDTListImpl {
  private data: CRDTList;
  private clientId: string;

  constructor(clientId: string) {
    this.clientId = clientId;
    this.data = {
      type: 'list',
      items: new Map(),
      order: [],
    };
  }

  insert(index: number, item: unknown): string {
    const id = generateId();
    this.data.items.set(id, item);
    this.data.order.splice(index, 0, id);
    return id;
  }

  delete(index: number): unknown {
    const id = this.data.order[index];
    if (!id) return null;

    const item = this.data.items.get(id);
    this.data.items.delete(id);
    this.data.order.splice(index, 1);
    return item;
  }

  get(index: number): unknown {
    const id = this.data.order[index];
    return id ? this.data.items.get(id) : null;
  }

  toArray(): unknown[] {
    return this.data.order.map(id => this.data.items.get(id));
  }

  toJSON(): Record<string, unknown> {
    return {
      type: this.data.type,
      items: Array.from(this.data.items.entries()),
      order: this.data.order,
    };
  }

  static fromJSON(json: Record<string, unknown>, clientId: string): CRDTListImpl {
    const list = new CRDTListImpl(clientId);
    list.data = {
      type: json.type as 'list',
      items: new Map(json.items as [string, unknown][]),
      order: json.order as string[],
    };
    return list;
  }
}

// ============================================================================
// CRDT Map Implementation
// ============================================================================

export class CRDTMapImpl {
  private data: CRDTMap;
  private clientId: string;

  constructor(clientId: string) {
    this.clientId = clientId;
    this.data = {
      type: 'map',
      data: new Map(),
    };
  }

  set(key: string, value: unknown): void {
    this.data.data.set(key, value);
  }

  get(key: string): unknown {
    return this.data.data.get(key);
  }

  delete(key: string): boolean {
    return this.data.data.delete(key);
  }

  has(key: string): boolean {
    return this.data.data.has(key);
  }

  toObject(): Record<string, unknown> {
    return Object.fromEntries(this.data.data.entries());
  }

  toJSON(): Record<string, unknown> {
    return {
      type: this.data.type,
      data: Array.from(this.data.data.entries()),
    };
  }

  static fromJSON(json: Record<string, unknown>, clientId: string): CRDTMapImpl {
    const map = new CRDTMapImpl(clientId);
    map.data = {
      type: json.type as 'map',
      data: new Map(json.data as [string, unknown][]),
    };
    return map;
  }
}