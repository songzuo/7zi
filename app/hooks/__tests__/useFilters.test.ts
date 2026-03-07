import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFilters, useFilterConfig } from '../useFilters';
import { TASK_FILTER_FIELDS, MEMBER_FILTER_FIELDS, FilterTemplate, FilterConfig } from '@/lib/types/filters';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// 测试数据
const mockTasks = [
  { id: '1', title: 'Task 1', state: 'open', priority: 'high', assignee: 'Alice', labels: ['bug', 'urgent'], created_at: '2024-01-01', updated_at: '2024-01-15', comments: 5 },
  { id: '2', title: 'Task 2', state: 'closed', priority: 'medium', assignee: 'Bob', labels: ['feature'], created_at: '2024-01-02', updated_at: '2024-01-10', comments: 2 },
  { id: '3', title: 'Bug Fix', state: 'open', priority: 'urgent', assignee: null, labels: ['bug'], created_at: '2024-01-03', updated_at: '2024-01-20', comments: 10 },
  { id: '4', title: 'Documentation', state: 'open', priority: 'low', assignee: 'Alice', labels: ['docs'], created_at: '2024-01-04', updated_at: '2024-01-18', comments: 0 },
];

const mockMembers = [
  { id: '1', name: 'Alice', status: 'working', role: 'Developer', provider: 'minimax', completedTasks: 15, currentTask: 'Feature X' },
  { id: '2', name: 'Bob', status: 'busy', role: 'Designer', provider: 'self-claude', completedTasks: 8, currentTask: null },
  { id: '3', name: 'Charlie', status: 'offline', role: 'Tester', provider: 'volcengine', completedTasks: 20, currentTask: 'Test Y' },
];

describe('useFilters Hook', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('基础功能', () => {
    it('应该正确初始化', () => {
      const { result } = renderHook(() => useFilters(mockTasks, TASK_FILTER_FIELDS));
      
      expect(result.current.activeFilters).toEqual([]);
      expect(result.current.savedFilters).toEqual([]);
      expect(result.current.filteredData).toEqual(mockTasks);
      expect(result.current.filterCount).toBe(0);
      expect(result.current.dataCount).toBe(4);
      expect(result.current.filteredCount).toBe(4);
    });

    it('应该正确过滤数据 - 单条件', () => {
      const { result } = renderHook(() => useFilters(mockTasks, TASK_FILTER_FIELDS));
      
      const filter: FilterConfig = {
        id: 'test-1',
        name: 'Open Tasks',
        conditions: [{ id: 'c1', field: 'state', operator: 'equals', value: 'open' }],
        logic: 'AND',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      act(() => {
        result.current.addFilter(filter);
      });

      expect(result.current.activeFilters.length).toBe(1);
      expect(result.current.filteredData.length).toBe(3);
      expect(result.current.filteredData.every(t => t.state === 'open')).toBe(true);
    });

    it('应该正确过滤数据 - 多条件 AND', () => {
      const { result } = renderHook(() => useFilters(mockTasks, TASK_FILTER_FIELDS));
      
      const filter: FilterConfig = {
        id: 'test-2',
        name: 'High Priority Open',
        conditions: [
          { id: 'c1', field: 'state', operator: 'equals', value: 'open' },
          { id: 'c2', field: 'priority', operator: 'in', value: ['high', 'urgent'] },
        ],
        logic: 'AND',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      act(() => {
        result.current.addFilter(filter);
      });

      expect(result.current.filteredData.length).toBe(2);
      expect(result.current.filteredData.every(t => 
        t.state === 'open' && ['high', 'urgent'].includes(t.priority)
      )).toBe(true);
    });

    it('应该正确过滤数据 - 多条件 OR', () => {
      const { result } = renderHook(() => useFilters(mockTasks, TASK_FILTER_FIELDS));
      
      const filter: FilterConfig = {
        id: 'test-3',
        name: 'Closed or Low Priority',
        conditions: [
          { id: 'c1', field: 'state', operator: 'equals', value: 'closed' },
          { id: 'c2', field: 'priority', operator: 'equals', value: 'low' },
        ],
        logic: 'OR',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      act(() => {
        result.current.addFilter(filter);
      });

      expect(result.current.filteredData.length).toBe(2);
    });

    it('应该正确移除过滤器', () => {
      const { result } = renderHook(() => useFilters(mockTasks, TASK_FILTER_FIELDS));
      
      const filter: FilterConfig = {
        id: 'test-4',
        name: 'Test Filter',
        conditions: [{ id: 'c1', field: 'state', operator: 'equals', value: 'open' }],
        logic: 'AND',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      act(() => {
        result.current.addFilter(filter);
      });

      expect(result.current.filterCount).toBe(1);

      act(() => {
        result.current.removeFilter('test-4');
      });

      expect(result.current.filterCount).toBe(0);
      expect(result.current.filteredData.length).toBe(4);
    });

    it('应该正确清除所有过滤器', () => {
      const { result } = renderHook(() => useFilters(mockTasks, TASK_FILTER_FIELDS));
      
      const filter1: FilterConfig = {
        id: 'f1',
        name: 'Filter 1',
        conditions: [{ id: 'c1', field: 'state', operator: 'equals', value: 'open' }],
        logic: 'AND',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const filter2: FilterConfig = {
        id: 'f2',
        name: 'Filter 2',
        conditions: [{ id: 'c2', field: 'priority', operator: 'equals', value: 'high' }],
        logic: 'AND',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      act(() => {
        result.current.addFilter(filter1);
        result.current.addFilter(filter2);
      });

      expect(result.current.filterCount).toBe(2);

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filterCount).toBe(0);
    });
  });

  describe('操作符测试', () => {
    it('equals 操作符应该正确工作', () => {
      const { result } = renderHook(() => useFilters(mockTasks, TASK_FILTER_FIELDS));
      
      act(() => {
        result.current.addFilter({
          id: 'test',
          name: 'Test',
          conditions: [{ id: 'c1', field: 'state', operator: 'equals', value: 'closed' }],
          logic: 'AND',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      expect(result.current.filteredData.length).toBe(1);
      expect(result.current.filteredData[0].id).toBe('2');
    });

    it('contains 操作符应该正确工作', () => {
      const { result } = renderHook(() => useFilters(mockTasks, TASK_FILTER_FIELDS));
      
      act(() => {
        result.current.addFilter({
          id: 'test',
          name: 'Test',
          conditions: [{ id: 'c1', field: 'title', operator: 'contains', value: 'Task' }],
          logic: 'AND',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      expect(result.current.filteredData.length).toBe(2);
    });

    it('isEmpty 操作符应该正确工作', () => {
      const { result } = renderHook(() => useFilters(mockTasks, TASK_FILTER_FIELDS));
      
      act(() => {
        result.current.addFilter({
          id: 'test',
          name: 'Test',
          conditions: [{ id: 'c1', field: 'assignee', operator: 'isEmpty', value: null }],
          logic: 'AND',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      expect(result.current.filteredData.length).toBe(1);
      expect(result.current.filteredData[0].assignee).toBeNull();
    });

    it('isNotEmpty 操作符应该正确工作', () => {
      const { result } = renderHook(() => useFilters(mockTasks, TASK_FILTER_FIELDS));
      
      act(() => {
        result.current.addFilter({
          id: 'test',
          name: 'Test',
          conditions: [{ id: 'c1', field: 'assignee', operator: 'isNotEmpty', value: null }],
          logic: 'AND',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      expect(result.current.filteredData.length).toBe(3);
    });

    it('greaterThan 操作符应该正确工作', () => {
      const { result } = renderHook(() => useFilters(mockTasks, TASK_FILTER_FIELDS));
      
      act(() => {
        result.current.addFilter({
          id: 'test',
          name: 'Test',
          conditions: [{ id: 'c1', field: 'comments', operator: 'greaterThan', value: 5 }],
          logic: 'AND',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      // comments > 5: Task 3 has 10 comments
      expect(result.current.filteredData.length).toBe(1);
      expect(result.current.filteredData[0].id).toBe('3');
    });

    it('in 操作符应该正确工作', () => {
      const { result } = renderHook(() => useFilters(mockTasks, TASK_FILTER_FIELDS));
      
      act(() => {
        result.current.addFilter({
          id: 'test',
          name: 'Test',
          conditions: [{ id: 'c1', field: 'priority', operator: 'in', value: ['high', 'urgent'] }],
          logic: 'AND',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      expect(result.current.filteredData.length).toBe(2);
    });
  });

  describe('模板功能', () => {
    it('应该正确从模板创建过滤器', () => {
      const { result } = renderHook(() => useFilters(mockTasks, TASK_FILTER_FIELDS));
      
      const template: FilterTemplate = {
        id: 'template-1',
        name: 'Open Tasks',
        description: 'Show open tasks',
        icon: '🟢',
        conditions: [{ field: 'state', operator: 'equals', value: 'open' }],
        logic: 'AND',
        category: 'task',
      };

      act(() => {
        result.current.createFromTemplate(template);
      });

      expect(result.current.filterCount).toBe(1);
      expect(result.current.filteredData.length).toBe(3);
    });
  });

  describe('持久化功能', () => {
    it('应该正确保存过滤器', () => {
      const { result } = renderHook(() => useFilters(mockTasks, TASK_FILTER_FIELDS));
      
      const filter: FilterConfig = {
        id: 'saved-1',
        name: 'Saved Filter',
        conditions: [{ id: 'c1', field: 'state', operator: 'equals', value: 'open' }],
        logic: 'AND',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      act(() => {
        result.current.saveFilter(filter);
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('Member 过滤', () => {
    it('应该正确过滤成员数据', () => {
      const { result } = renderHook(() => useFilters(mockMembers, MEMBER_FILTER_FIELDS, 'memberFilters'));
      
      act(() => {
        result.current.addFilter({
          id: 'test',
          name: 'Online Members',
          conditions: [{ id: 'c1', field: 'status', operator: 'in', value: ['working', 'busy'] }],
          logic: 'OR',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      expect(result.current.filteredData.length).toBe(2);
    });

    it('应该正确过滤有任务的成员', () => {
      const { result } = renderHook(() => useFilters(mockMembers, MEMBER_FILTER_FIELDS, 'memberFilters'));
      
      act(() => {
        result.current.addFilter({
          id: 'test',
          name: 'Members with Task',
          conditions: [{ id: 'c1', field: 'currentTask', operator: 'isNotEmpty', value: null }],
          logic: 'AND',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      expect(result.current.filteredData.length).toBe(2);
    });

    it('应该正确过滤高产出成员', () => {
      const { result } = renderHook(() => useFilters(mockMembers, MEMBER_FILTER_FIELDS, 'memberFilters'));
      
      act(() => {
        result.current.addFilter({
          id: 'test',
          name: 'Top Performers',
          conditions: [{ id: 'c1', field: 'completedTasks', operator: 'greaterThan', value: 10 }],
          logic: 'AND',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      expect(result.current.filteredData.length).toBe(2);
    });
  });
});

describe('useFilterConfig Hook', () => {
  it('应该正确初始化', () => {
    const { result } = renderHook(() => useFilterConfig(TASK_FILTER_FIELDS));
    
    expect(result.current.conditions).toEqual([]);
    expect(result.current.logic).toBe('AND');
    expect(result.current.filterName).toBe('');
    expect(result.current.isValid).toBe(false);
  });

  it('应该正确添加条件', () => {
    const { result } = renderHook(() => useFilterConfig(TASK_FILTER_FIELDS));
    
    act(() => {
      result.current.addCondition();
    });

    expect(result.current.conditions.length).toBe(1);
    expect(result.current.conditions[0].field).toBe('state');
  });

  it('应该正确移除条件', () => {
    const { result } = renderHook(() => useFilterConfig(TASK_FILTER_FIELDS));
    
    act(() => {
      result.current.addCondition();
    });

    const conditionId = result.current.conditions[0].id;

    act(() => {
      result.current.removeCondition(conditionId);
    });

    expect(result.current.conditions.length).toBe(0);
  });

  it('应该正确更新条件', () => {
    const { result } = renderHook(() => useFilterConfig(TASK_FILTER_FIELDS));
    
    act(() => {
      result.current.addCondition();
    });

    const conditionId = result.current.conditions[0].id;

    act(() => {
      result.current.updateCondition(conditionId, { field: 'priority', operator: 'equals', value: 'high' });
    });

    expect(result.current.conditions[0].field).toBe('priority');
    expect(result.current.conditions[0].value).toBe('high');
  });

  it('应该正确切换逻辑关系', () => {
    const { result } = renderHook(() => useFilterConfig(TASK_FILTER_FIELDS));
    
    expect(result.current.logic).toBe('AND');

    act(() => {
      result.current.setLogic('OR');
    });

    expect(result.current.logic).toBe('OR');
  });

  it('应该正确构建过滤器', () => {
    const { result } = renderHook(() => useFilterConfig(TASK_FILTER_FIELDS));
    
    act(() => {
      result.current.addCondition();
      result.current.setFilterName('Test Filter');
    });

    const conditionId = result.current.conditions[0].id;

    act(() => {
      result.current.updateCondition(conditionId, { field: 'state', operator: 'equals', value: 'open' });
    });

    const filter = result.current.buildFilter();

    expect(filter).not.toBeNull();
    expect(filter?.name).toBe('Test Filter');
    expect(filter?.conditions.length).toBe(1);
    expect(filter?.logic).toBe('AND');
  });

  it('没有条件时应该返回 null', () => {
    const { result } = renderHook(() => useFilterConfig(TASK_FILTER_FIELDS));
    
    const filter = result.current.buildFilter();

    expect(filter).toBeNull();
  });

  it('应该正确重置状态', () => {
    const { result } = renderHook(() => useFilterConfig(TASK_FILTER_FIELDS));
    
    act(() => {
      result.current.addCondition();
      result.current.setFilterName('Test');
      result.current.setLogic('OR');
    });

    expect(result.current.conditions.length).toBe(1);

    act(() => {
      result.current.reset();
    });

    expect(result.current.conditions.length).toBe(0);
    expect(result.current.filterName).toBe('');
    expect(result.current.logic).toBe('AND');
  });
});