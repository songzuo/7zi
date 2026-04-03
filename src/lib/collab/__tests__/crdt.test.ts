/**
 * Unit tests for CRDT implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CRDTTextImpl,
  CRDTListImpl,
  CRDTMapImpl,
  OperationType,
} from '../core/crdt';

describe('CRDTTextImpl', () => {
  let crdt: CRDTTextImpl;
  const clientId = 'client-1';

  beforeEach(() => {
    crdt = new CRDTTextImpl(clientId);
  });

  describe('insert', () => {
    it('should insert text at position 0', () => {
      const ops = crdt.insert(0, 'Hello');
      expect(ops).toHaveLength(5);
      expect(crdt.getText()).toBe('Hello');
    });

    it('should insert text in the middle', () => {
      crdt.insert(0, 'Hello');
      crdt.insert(5, ' World');
      expect(crdt.getText()).toBe('Hello World');
    });

    it('should insert text at the end', () => {
      crdt.insert(0, 'Hello');
      crdt.insert(5, '!');
      expect(crdt.getText()).toBe('Hello!');
    });

    it('should handle empty insert', () => {
      const ops = crdt.insert(0, '');
      expect(ops).toHaveLength(0);
      expect(crdt.getText()).toBe('');
    });

    it('should create nodes with unique IDs', () => {
      const ops = crdt.insert(0, 'AB');
      expect(ops[0].id).not.toBe(ops[1].id);
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      crdt.insert(0, 'Hello World');
    });

    it('should delete text at the beginning', () => {
      const ops = crdt.delete(0, 5);
      expect(ops).toHaveLength(5);
      expect(crdt.getText()).toBe(' World');
    });

    it('should delete text in the middle', () => {
      crdt.delete(5, 1);
      expect(crdt.getText()).toBe('HelloWorld');
    });

    it('should delete text at the end', () => {
      crdt.delete(5, 6);
      expect(crdt.getText()).toBe('Hello');
    });

    it('should handle delete beyond bounds', () => {
      crdt.delete(0, 100);
      expect(crdt.getText()).toBe('');
    });
  });

  describe('applyOperation', () => {
    it('should apply remote insert operation', () => {
      const crdt1 = new CRDTTextImpl('client-1');
      const crdt2 = new CRDTTextImpl('client-2');

      // Client 1 inserts
      const ops1 = crdt1.insert(0, 'A');

      // Apply to client 2
      ops1.forEach(op => crdt2.applyOperation(op));

      expect(crdt2.getText()).toBe('A');
    });

    it('should apply remote delete operation', () => {
      const crdt1 = new CRDTTextImpl('client-1');
      const crdt2 = new CRDTTextImpl('client-2');

      // Client 1 inserts and deletes
      const insertOps = crdt1.insert(0, 'AB');
      const deleteOps = crdt1.delete(0, 1);

      // Apply to client 2
      insertOps.forEach(op => crdt2.applyOperation(op));
      deleteOps.forEach(op => crdt2.applyOperation(op));

      expect(crdt2.getText()).toBe('B');
    });

    it('should handle idempotent operations', () => {
      const crdt1 = new CRDTTextImpl('client-1');
      const crdt2 = new CRDTTextImpl('client-2');

      const ops = crdt1.insert(0, 'A');

      // Apply twice
      ops.forEach(op => crdt2.applyOperation(op));
      ops.forEach(op => crdt2.applyOperation(op));

      expect(crdt2.getText()).toBe('A');
    });
  });

  describe('concurrent edits', () => {
    it('should handle sequential inserts correctly', () => {
      const crdt = new CRDTTextImpl('client-1');

      crdt.insert(0, 'AB');
      crdt.insert(0, 'X');
      crdt.insert(3, 'Y');

      expect(crdt.getText()).toBe('XABY');
    });

    it('should handle operations with same node IDs', () => {
      // This test simulates proper CRDT sync where operations share node IDs
      const crdt1 = new CRDTTextImpl('client-1');
      
      // Client 1 creates initial content
      const ops1 = crdt1.insert(0, 'AB');
      
      // Client 2 receives and applies these operations
      const crdt2 = new CRDTTextImpl('client-2');
      ops1.forEach(op => crdt2.applyOperation(op));
      
      // Both should have same content
      expect(crdt1.getText()).toBe('AB');
      expect(crdt2.getText()).toBe('AB');
    });
  });

  describe('vector clock', () => {
    it('should increment vector clock on operations', () => {
      crdt.insert(0, 'A');
      const clock = crdt.getVectorClock();
      expect(clock.get(clientId)).toBe(1);
    });

    it('should merge vector clocks', () => {
      const crdt2 = new CRDTTextImpl('client-2');

      crdt.insert(0, 'A');
      crdt2.insert(0, 'B');

      const remoteClock = crdt2.getVectorClock();
      crdt.mergeVectorClock(remoteClock);

      const mergedClock = crdt.getVectorClock();
      expect(mergedClock.get('client-2')).toBe(1);
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize correctly', () => {
      crdt.insert(0, 'Hello World');
      crdt.delete(5, 1);

      const json = crdt.toJSON();
      const deserialized = CRDTTextImpl.fromJSON(json, 'new-client');

      expect(deserialized.getText()).toBe('HelloWorld');
    });
  });
});

describe('CRDTListImpl', () => {
  let list: CRDTListImpl;
  const clientId = 'client-1';

  beforeEach(() => {
    list = new CRDTListImpl(clientId);
  });

  it('should insert items', () => {
    const id = list.insert(0, 'item1');
    expect(list.get(0)).toBe('item1');
    expect(id).toBeDefined();
  });

  it('should delete items', () => {
    list.insert(0, 'item1');
    list.insert(1, 'item2');

    const deleted = list.delete(0);
    expect(deleted).toBe('item1');
    expect(list.toArray()).toEqual(['item2']);
  });

  it('should convert to array', () => {
    list.insert(0, 'a');
    list.insert(1, 'b');
    list.insert(2, 'c');

    expect(list.toArray()).toEqual(['a', 'b', 'c']);
  });

  it('should serialize and deserialize', () => {
    list.insert(0, 'a');
    list.insert(1, 'b');

    const json = list.toJSON();
    const deserialized = CRDTListImpl.fromJSON(json, clientId);

    expect(deserialized.toArray()).toEqual(['a', 'b']);
  });
});

describe('CRDTMapImpl', () => {
  let map: CRDTMapImpl;
  const clientId = 'client-1';

  beforeEach(() => {
    map = new CRDTMapImpl(clientId);
  });

  it('should set and get values', () => {
    map.set('key1', 'value1');
    expect(map.get('key1')).toBe('value1');
  });

  it('should delete values', () => {
    map.set('key1', 'value1');
    const result = map.delete('key1');
    expect(result).toBe(true);
    expect(map.has('key1')).toBe(false);
  });

  it('should check if key exists', () => {
    map.set('key1', 'value1');
    expect(map.has('key1')).toBe(true);
    expect(map.has('key2')).toBe(false);
  });

  it('should convert to object', () => {
    map.set('a', 1);
    map.set('b', 2);

    expect(map.toObject()).toEqual({ a: 1, b: 2 });
  });

  it('should serialize and deserialize', () => {
    map.set('a', 1);
    map.set('b', 2);

    const json = map.toJSON();
    const deserialized = CRDTMapImpl.fromJSON(json, clientId);

    expect(deserialized.toObject()).toEqual({ a: 1, b: 2 });
  });
});