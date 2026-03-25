/**
 * @fileoverview filterStore 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useFilterStore } from '../filterStore';

describe('filterStore', () => {
  beforeEach(() => {
    // 重置 store
    useFilterStore.setState({
      activeFilters: new Map(),
      activeSorts: new Map(),
      activePagination: new Map(),
      isLoaded: false,
    });
  });

  describe('initial state', () => {
    it('should have empty maps initially', () => {
      const state = useFilterStore.getState();
      expect(state.activeFilters.size).toBe(0);
      expect(state.activeSorts.size).toBe(0);
      expect(state.activePagination.size).toBe(0);
    });
  });

  describe('setFilters', () => {
    it('should set filters for a namespace', () => {
      const filters = {
        conditions: [
          { field: 'status', operator: 'equals' as const, value: 'active' },
        ],
        searchQuery: '',
      };

      useFilterStore.getState().setFilters('dashboard', filters);
      const result = useFilterStore.getState().activeFilters.get('dashboard');

      expect(result).toBeDefined();
      expect(result?.conditions).toHaveLength(1);
      expect(result?.conditions[0].field).toBe('status');
    });

    it('should support multiple namespaces', () => {
      useFilterStore.getState().setFilters('dashboard', {
        conditions: [],
        searchQuery: '',
      });

      useFilterStore.getState().setFilters('tasks', {
        conditions: [],
        searchQuery: 'test',
      });

      const dashboardFilters = useFilterStore.getState().activeFilters.get('dashboard');
      const tasksFilters = useFilterStore.getState().activeFilters.get('tasks');

      expect(dashboardFilters?.searchQuery).toBe('');
      expect(tasksFilters?.searchQuery).toBe('test');
    });
  });

  describe('setFilterCondition', () => {
    it('should add new condition', () => {
      useFilterStore.getState().setFilterCondition('tasks', {
        field: 'priority',
        operator: 'equals',
        value: 'high',
      });

      const filters = useFilterStore.getState().activeFilters.get('tasks');
      expect(filters?.conditions).toHaveLength(1);
    });

    it('should update existing condition', () => {
      useFilterStore.getState().setFilterCondition('tasks', {
        field: 'status',
        operator: 'equals',
        value: 'active',
      });

      useFilterStore.getState().setFilterCondition('tasks', {
        field: 'status',
        operator: 'equals',
        value: 'inactive',
      });

      const filters = useFilterStore.getState().activeFilters.get('tasks');
      expect(filters?.conditions).toHaveLength(1);
      expect(filters?.conditions[0].value).toBe('inactive');
    });
  });

  describe('removeFilterCondition', () => {
    it('should remove condition by field', () => {
      useFilterStore.getState().setFilterCondition('tasks', {
        field: 'status',
        operator: 'equals',
        value: 'active',
      });

      useFilterStore.getState().removeFilterCondition('tasks', 'status');

      const filters = useFilterStore.getState().activeFilters.get('tasks');
      expect(filters?.conditions).toHaveLength(0);
    });
  });

  describe('clearFilters', () => {
    it('should clear all conditions and search query', () => {
      useFilterStore.getState().setSearchQuery('tasks', 'test');
      useFilterStore.getState().setFilterCondition('tasks', {
        field: 'status',
        operator: 'equals',
        value: 'active',
      });

      useFilterStore.getState().clearFilters('tasks');

      const filters = useFilterStore.getState().activeFilters.get('tasks');
      expect(filters?.conditions).toHaveLength(0);
      expect(filters?.searchQuery).toBe('');
    });
  });

  describe('setSearchQuery', () => {
    it('should set search query', () => {
      useFilterStore.getState().setSearchQuery('dashboard', 'test query');
      const filters = useFilterStore.getState().activeFilters.get('dashboard');
      expect(filters?.searchQuery).toBe('test query');
    });
  });

  describe('setSort', () => {
    it('should set sort condition', () => {
      useFilterStore.getState().setSort('dashboard', {
        field: 'createdAt',
        direction: 'desc',
      });

      const sort = useFilterStore.getState().activeSorts.get('dashboard');
      expect(sort?.field).toBe('createdAt');
      expect(sort?.direction).toBe('desc');
    });

    it('should clear sort when setting to null', () => {
      useFilterStore.getState().setSort('dashboard', {
        field: 'name',
        direction: 'asc',
      });

      useFilterStore.getState().setSort('dashboard', null);

      const sort = useFilterStore.getState().activeSorts.get('dashboard');
      expect(sort).toBeNull();
    });
  });

  describe('toggleSort', () => {
    it('should toggle sort direction for same field', () => {
      useFilterStore.getState().toggleSort('dashboard', 'name');
      let sort = useFilterStore.getState().activeSorts.get('dashboard');
      expect(sort?.direction).toBe('asc');

      useFilterStore.getState().toggleSort('dashboard', 'name');
      sort = useFilterStore.getState().activeSorts.get('dashboard');
      expect(sort?.direction).toBe('desc');
    });

    it('should create new sort for different field', () => {
      useFilterStore.getState().toggleSort('dashboard', 'name');
      useFilterStore.getState().toggleSort('dashboard', 'status');
      const sort = useFilterStore.getState().activeSorts.get('dashboard');
      expect(sort?.field).toBe('status');
      expect(sort?.direction).toBe('asc'); // reset to asc
    });
  });

  describe('setPagination', () => {
    it('should set pagination', () => {
      const pagination = {
        page: 2,
        pageSize: 50,
        total: 100,
      };

      useFilterStore.getState().setPagination('dashboard', pagination);
      const result = useFilterStore.getState().activePagination.get('dashboard');

      expect(result?.page).toBe(2);
      expect(result?.pageSize).toBe(50);
      expect(result?.total).toBe(100);
    });
  });

  describe('setPage', () => {
    it('should update page number', () => {
      useFilterStore.getState().setPage('dashboard', 5);
      const pagination = useFilterStore.getState().activePagination.get('dashboard');
      expect(pagination?.page).toBe(5);
    });
  });

  describe('setPageSize', () => {
    it('should update page size and reset to page 1', () => {
      useFilterStore.getState().setPage('dashboard', 5);
      useFilterStore.getState().setPageSize('dashboard', 100);
      const pagination = useFilterStore.getState().activePagination.get('dashboard');
      expect(pagination?.page).toBe(1);
      expect(pagination?.pageSize).toBe(100);
    });
  });

  describe('setTotal', () => {
    it('should update total count', () => {
      useFilterStore.getState().setTotal('dashboard', 250);
      const pagination = useFilterStore.getState().activePagination.get('dashboard');
      expect(pagination?.total).toBe(250);
    });
  });

  describe('setFilterConfig', () => {
    it('should set all configs at once', () => {
      const config = {
        filters: {
          conditions: [{ field: 'status', operator: 'equals' as const, value: 'active' }],
          searchQuery: 'test',
        },
        sort: { field: 'name', direction: 'asc' as const },
        pagination: { page: 1, pageSize: 20, total: 100 },
      };

      useFilterStore.getState().setFilterConfig('dashboard', config);

      const result = useFilterStore.getState().getFilterConfig('dashboard');
      expect(result.filters.conditions).toHaveLength(1);
      expect(result.filters.searchQuery).toBe('test');
      expect(result.sort?.field).toBe('name');
      expect(result.pagination.page).toBe(1);
    });
  });

  describe('resetNamespace', () => {
    it('should reset namespace configs', () => {
      useFilterStore.getState().setSearchQuery('dashboard', 'test');
      useFilterStore.getState().setSort('dashboard', { field: 'name', direction: 'asc' as const });
      useFilterStore.getState().setPage('dashboard', 3);

      useFilterStore.getState().resetNamespace('dashboard');

      expect(useFilterStore.getState().activeFilters.has('dashboard')).toBe(false);
      expect(useFilterStore.getState().activeSorts.has('dashboard')).toBe(false);
      expect(useFilterStore.getState().activePagination.has('dashboard')).toBe(false);
    });
  });

  describe('resetAll', () => {
    it('should reset all namespaces', () => {
      useFilterStore.getState().setSearchQuery('dashboard', 'test');
      useFilterStore.getState().setSearchQuery('tasks', 'test2');

      useFilterStore.getState().resetAll();

      expect(useFilterStore.getState().activeFilters.size).toBe(0);
      expect(useFilterStore.getState().activeSorts.size).toBe(0);
      expect(useFilterStore.getState().activePagination.size).toBe(0);
    });
  });
});
