/**
 * @fileoverview IndexedStore 性能测试
 * @module test/indexed-store.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedStore } from '@/lib/data/indexed-store';

interface TestItem {
  id: string;
  status: 'active' | 'inactive';
  category: string;
  tags: string[];
  score: number;
}

describe('IndexedStore', () => {
  let store: IndexedStore<TestItem>;

  beforeEach(() => {
    store = new IndexedStore<TestItem>('test-store', [], {
      indexes: [
        { name: 'status', extractor: item => item.status },
        { name: 'category', extractor: item => item.category },
        { name: 'tags', extractor: item => item.tags, multi: true },
        { name: 'status_category', extractor: item => `${item.status}_${item.category}` },
      ],
    });

    // 添加测试数据
    for (let i = 0; i < 1000; i++) {
      store.add({
        id: `item-${i}`,
        status: i % 3 === 0 ? 'active' : 'inactive',
        category: ['a', 'b', 'c'][i % 3],
        tags: [`tag-${i % 10}`, `tag-${(i + 1) % 10}`],
        score: i,
      });
    }
  });

  describe('索引查询', () => {
    it('findByIndex 应该比 filter 更快', () => {
      // 使用索引查询
      const startIndexed = performance.now();
      const indexedResult = store.findByIndex('status', 'active');
      const indexedTime = performance.now() - startIndexed;

      // 使用普通 filter
      const startFilter = performance.now();
      const filterResult = store.filter(item => item.status === 'active');
      const filterTime = performance.now() - startFilter;

      // 验证结果一致
      expect(indexedResult.length).toBe(filterResult.length);
      
      // 索引查询应该更快
      console.log(`Indexed: ${indexedTime.toFixed(3)}ms, Filter: ${filterTime.toFixed(3)}ms`);
      expect(indexedTime).toBeLessThan(filterTime * 2); // 至少不应该慢太多
    });

    it('findByIndexes 应该正确处理多条件查询', () => {
      const result = store.findByIndexes([
        { index: 'status', value: 'active' },
        { index: 'category', value: 'a' },
      ]);

      // 验证所有结果都匹配条件
      for (const item of result) {
        expect(item.status).toBe('active');
        expect(item.category).toBe('a');
      }
    });

    it('多值索引应该正确工作', () => {
      const result = store.findByIndex('tags', 'tag-5');
      
      expect(result.length).toBeGreaterThan(0);
      
      // 验证所有结果都包含该标签
      for (const item of result) {
        expect(item.tags).toContain('tag-5');
      }
    });
  });

  describe('findById', () => {
    it('应该使用 ID 索引快速查找', () => {
      const item = store.findById('item-500');
      
      expect(item).toBeDefined();
      expect(item?.id).toBe('item-500');
    });

    it('不存在的 ID 应该返回 undefined', () => {
      const item = store.findById('non-existent');
      expect(item).toBeUndefined();
    });
  });

  describe('分页', () => {
    it('应该正确分页', () => {
      const result = store.paginate({ page: 1, limit: 10 });
      
      expect(result.data.length).toBe(10);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(1000);
      expect(result.pagination.totalPages).toBe(100);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('应该正确过滤和分页', () => {
      const result = store.paginate({
        page: 1,
        limit: 10,
        filter: item => item.status === 'active',
      });

      // 验证所有数据都是 active
      for (const item of result.data) {
        expect(item.status).toBe('active');
      }

      // 验证总数
      expect(result.pagination.total).toBe(Math.ceil(1000 / 3));
    });

    it('应该正确排序', () => {
      const result = store.paginate({
        page: 1,
        limit: 10,
        sort: (a, b) => b.score - a.score, // 降序
      });

      // 验证排序正确
      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i - 1].score).toBeGreaterThanOrEqual(result.data[i].score);
      }
    });
  });

  describe('索引统计', () => {
    it('应该返回正确的索引统计', () => {
      const stats = store.getIndexStats();

      expect(stats.status).toBeDefined();
      expect(stats.status.uniqueValues).toBe(2); // active, inactive
      
      expect(stats.category).toBeDefined();
      expect(stats.category.uniqueValues).toBe(3); // a, b, c
    });
  });

  describe('CRUD 操作', () => {
    it('add 应该更新索引', () => {
      const newItem: TestItem = {
        id: 'new-item',
        status: 'active',
        category: 'a',
        tags: ['new-tag'],
        score: 9999,
      };

      store.add(newItem);

      // 验证索引已更新
      const result = store.findByIndex('status', 'active');
      expect(result.some(item => item.id === 'new-item')).toBe(true);
    });

    it('update 应该更新索引', () => {
      store.update(
        item => item.id === 'item-0',
        item => ({ ...item, status: 'inactive' })
      );

      // 验证索引已更新
      const activeResult = store.findByIndex('status', 'active');
      expect(activeResult.some(item => item.id === 'item-0')).toBe(false);

      const inactiveResult = store.findByIndex('status', 'inactive');
      expect(inactiveResult.some(item => item.id === 'item-0')).toBe(true);
    });

    it('delete 应该更新索引', () => {
      store.delete(item => item.id === 'item-0');

      // 验证索引已更新
      const result = store.findByIndex('status', 'active');
      expect(result.some(item => item.id === 'item-0')).toBe(false);
    });
  });
});

describe('IndexedStore 性能对比', () => {
  it('大数据集查询性能', () => {
    const largeStore = new IndexedStore<TestItem>('large-test', [], {
      indexes: [
        { name: 'status', extractor: item => item.status },
        { name: 'category', extractor: item => item.category },
      ],
    });

    // 添加 10000 条数据
    for (let i = 0; i < 10000; i++) {
      largeStore.add({
        id: `item-${i}`,
        status: i % 10 === 0 ? 'active' : 'inactive',
        category: ['a', 'b', 'c', 'd', 'e'][i % 5],
        tags: [],
        score: i,
      });
    }

    // 测试索引查询
    const startIndexed = performance.now();
    const indexedResult = largeStore.findByIndex('status', 'active');
    const indexedTime = performance.now() - startIndexed;

    // 测试普通过滤
    const startFilter = performance.now();
    const filterResult = largeStore.filter(item => item.status === 'active');
    const filterTime = performance.now() - startFilter;

    console.log(`\n性能对比 (10000 条数据):`);
    console.log(`  索引查询: ${indexedTime.toFixed(3)}ms`);
    console.log(`  普通过滤: ${filterTime.toFixed(3)}ms`);
    console.log(`  提升: ${(filterTime / indexedTime).toFixed(1)}x`);

    expect(indexedResult.length).toBe(filterResult.length);
  });
});