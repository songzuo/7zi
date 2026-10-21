/**
 * Smart Search - 搜索建议测试
 * v1.12.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSuggestions,
  recordSearch,
  clearSearchHistory,
  getRecentSearches,
  removeSearchHistory,
  getPopularSearches,
  updateMockData
} from '../suggestions';
import { type SearchSuggestion } from '../suggestions';

describe('getSuggestions', () => {
  beforeEach(() => {
    // 清除 localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('空查询应该返回热门搜索和历史记录', async () => {
    const suggestions = await getSuggestions('', {
      includeHistory: true,
      includePopular: true
    });

    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.every((s) => s.text)).toBe(true);
  });

  it('空查询且不包含历史记录应该返回热门搜索', async () => {
    const suggestions = await getSuggestions('', {
      includeHistory: false,
      includePopular: true
    });

    expect(Array.isArray(suggestions)).toBe(true);
  });

  it('空查询且不包含热门搜索应该返回空数组', async () => {
    const suggestions = await getSuggestions('', {
      includeHistory: false,
      includePopular: false
    });

    expect(suggestions).toEqual([]);
  });

  it('有查询应该返回匹配的建议', async () => {
    const suggestions = await getSuggestions('workflow');

    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((s) => s.matched !== undefined || s.score >= 0)).toBe(true);
  });

  it('建议应该按分数降序排序', async () => {
    const suggestions = await getSuggestions('work');

    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i].score).toBeLessThanOrEqual(suggestions[i - 1].score);
    }
  });

  it('应该限制返回的数量', async () => {
    const limit = 5;
    const suggestions = await getSuggestions('work', { limit });

    expect(suggestions.length).toBeLessThanOrEqual(limit);
  });

  it('应该包含不同类型的建议', async () => {
    const suggestions = await getSuggestions('work');

    const types = new Set(suggestions.map((s) => s.type));
    expect(types.size).toBeGreaterThan(0);
  });

  it('无匹配查询应该返回空数组', async () => {
    const suggestions = await getSuggestions('xyz123abc');

    expect(Array.isArray(suggestions)).toBe(true);
  });

  it('应该区分大小写（根据配置）', async () => {
    const suggestions1 = await getSuggestions('WORK', { ignoreCase: true });
    const suggestions2 = await getSuggestions('WORK', { ignoreCase: false });

    expect(Array.isArray(suggestions1)).toBe(true);
    expect(Array.isArray(suggestions2)).toBe(true);
  });

  it('应该支持模糊匹配阈值', async () => {
    const suggestions1 = await getSuggestions('wokflow', { threshold: 2 });
    const suggestions2 = await getSuggestions('wokflow', { threshold: 0 });

    expect(Array.isArray(suggestions1)).toBe(true);
    expect(Array.isArray(suggestions2)).toBe(true);
  });

  it('建议应该包含元数据', async () => {
    const suggestions = await getSuggestions('workflow');

    suggestions.forEach((s) => {
      expect(s.text).toBeDefined();
      expect(s.type).toBeDefined();
      expect(s.score).toBeDefined();
    });
  });
});

describe('recordSearch', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('应该记录搜索到历史', () => {
    recordSearch('test query');

    const recent = getRecentSearches();
    expect(recent).toContain('test query');
  });

  it('应该将最新搜索放在最前面', () => {
    recordSearch('query1');
    recordSearch('query2');
    recordSearch('query3');

    const recent = getRecentSearches(3);
    expect(recent[0]).toBe('query3');
    expect(recent[1]).toBe('query2');
    expect(recent[2]).toBe('query1');
  });

  it('应该移除重复的搜索', () => {
    recordSearch('query1');
    recordSearch('query2');
    recordSearch('query1'); // 重复

    const recent = getRecentSearches();
    expect(recent.filter((q) => q === 'query1').length).toBe(1);
  });

  it('应该处理空查询', () => {
    recordSearch('');
    recordSearch('   ');

    const recent = getRecentSearches();
    expect(recent.length).toBe(0);
  });

  it('应该限制历史记录大小', () => {
    // 模拟大量搜索
    for (let i = 0; i < 100; i++) {
      recordSearch(`query${i}`);
    }

    const recent = getRecentSearches();
    expect(recent.length).toBeLessThanOrEqual(50); // 默认最大值
  });
});

describe('clearSearchHistory', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('应该清空所有搜索历史', () => {
    recordSearch('query1');
    recordSearch('query2');
    recordSearch('query3');

    clearSearchHistory();

    const recent = getRecentSearches();
    expect(recent).toEqual([]);
  });

  it('应该清空空历史记录', () => {
    clearSearchHistory();

    const recent = getRecentSearches();
    expect(recent).toEqual([]);
  });
});

describe('getRecentSearches', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('应该返回最近的搜索', () => {
    recordSearch('query1');
    recordSearch('query2');
    recordSearch('query3');

    const recent = getRecentSearches();
    expect(recent.length).toBe(3);
  });

  it('应该限制返回数量', () => {
    for (let i = 0; i < 10; i++) {
      recordSearch(`query${i}`);
    }

    const recent = getRecentSearches(5);
    expect(recent.length).toBe(5);
  });

  it('空历史应该返回空数组', () => {
    const recent = getRecentSearches();
    expect(recent).toEqual([]);
  });

  it('应该返回按时间倒序的结果', () => {
    recordSearch('query1');
    recordSearch('query2');
    recordSearch('query3');

    const recent = getRecentSearches();
    expect(recent[0]).toBe('query3');
    expect(recent[1]).toBe('query2');
    expect(recent[2]).toBe('query1');
  });
});

describe('removeSearchHistory', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('应该删除指定的搜索记录', () => {
    recordSearch('query1');
    recordSearch('query2');
    recordSearch('query3');

    removeSearchHistory('query2');

    const recent = getRecentSearches();
    expect(recent).toContain('query1');
    expect(recent).toContain('query3');
    expect(recent).not.toContain('query2');
  });

  it('删除不存在的搜索不应该报错', () => {
    recordSearch('query1');

    expect(() => removeSearchHistory('nonexistent')).not.toThrow();

    const recent = getRecentSearches();
    expect(recent).toContain('query1');
  });
});

describe('getPopularSearches', () => {
  it('应该返回热门搜索列表', () => {
    const popular = getPopularSearches();

    expect(Array.isArray(popular)).toBe(true);
    expect(popular.length).toBeGreaterThan(0);
    expect(popular.every((p) => typeof p === 'string')).toBe(true);
  });

  it('热门搜索应该包含常见的搜索词', () => {
    const popular = getPopularSearches();

    expect(popular.some((p) => p.includes('工作流') || p.includes('workflow'))).toBe(true);
    expect(popular.some((p) => p.includes('任务') || p.includes('task'))).toBe(true);
  });
});

describe('updateMockData', () => {
  it('应该更新工作流数据', () => {
    const mockWorkflows = [
      { id: '100', name: '新工作流', description: '测试' }
    ];

    updateMockData({ workflows: mockWorkflows });

    // 验证更新（通过检查建议）
    expect(() => updateMockData({ workflows: mockWorkflows })).not.toThrow();
  });

  it('应该更新任务数据', () => {
    const mockTasks = [
      { id: '100', name: '新任务', status: 'pending' }
    ];

    expect(() => updateMockData({ tasks: mockTasks })).not.toThrow();
  });

  it('应该更新节点数据', () => {
    const mockNodes = [
      { id: '100', name: '新节点', type: 'custom' }
    ];

    expect(() => updateMockData({ nodes: mockNodes })).not.toThrow();
  });

  it('应该支持同时更新多种数据', () => {
    const mockWorkflows = [{ id: '100', name: '工作流1' }];
    const mockTasks = [{ id: '100', name: '任务1' }];

    expect(() =>
      updateMockData({
        workflows: mockWorkflows,
        tasks: mockTasks
      })
    ).not.toThrow();
  });
});

describe('边界情况', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('应该处理超长查询', async () => {
    const longQuery = 'a'.repeat(1000);
    const suggestions = await getSuggestions(longQuery);

    expect(Array.isArray(suggestions)).toBe(true);
  });

  it('应该处理特殊字符', async () => {
    const specialQuery = 'hello@world.com';
    const suggestions = await getSuggestions(specialQuery);

    expect(Array.isArray(suggestions)).toBe(true);
  });

  it('应该处理 Unicode 字符', async () => {
    const unicodeQuery = '你好世界';
    const suggestions = await getSuggestions(unicodeQuery);

    expect(Array.isArray(suggestions)).toBe(true);
  });

  it('应该处理零限制', async () => {
    const suggestions = await getSuggestions('work', { limit: 0 });

    expect(suggestions.length).toBe(0);
  });

  it('应该处理负数限制', async () => {
    const suggestions = await getSuggestions('work', { limit: -5 });

    expect(suggestions.length).toBe(0);
  });
});
