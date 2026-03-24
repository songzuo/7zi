/**
 * @fileoverview 全局过滤状态 Store
 * @description 使用 Zustand 实现全局过滤和排序状态管理
 *
 * 功能:
 * - 多组件共享的过滤状态
 * - 排序状态管理
 * - 搜索查询状态
 * - 分页状态
 * - 持久化存储
 *
 * @example
 * // 在组件中使用
 * const { filters, setFilter, setSearch } = useFilterStore();
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 过滤条件类型
 */
export type FilterOperator =
  | 'equals'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'gt'      // greater than
  | 'lt'      // less than
  | 'gte'     // greater than or equal
  | 'lte'     // less than or equal
  | 'in'      // in array
  | 'between' // between two values
  | 'exists';

/**
 * 单个过滤条件
 */
export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

/**
 * 排序方向
 */
export type SortDirection = 'asc' | 'desc';

/**
 * 排序条件
 */
export interface SortCondition {
  field: string;
  direction: SortDirection;
}

/**
 * 分页信息
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * 过滤状态集合
 */
export interface FiltersState {
  conditions: FilterCondition[];
  searchQuery: string;
}

/**
 * 完整过滤配置
 */
export interface FilterConfig {
  filters: FiltersState;
  sort: SortCondition | null;
  pagination: PaginationState;
}

interface FilterStoreState {
  // 数据
  activeFilters: Map<string, FiltersState>; // 按组件/页面分离的过滤状态
  activeSorts: Map<string, SortCondition | null>; // 按组件/页面分离的排序状态
  activePagination: Map<string, PaginationState>; // 按组件/页面分离的分页状态
  isLoaded: boolean;

  // 操作
  setFilters: (namespace: string, filters: FiltersState) => void;
  setFilterCondition: (namespace: string, condition: FilterCondition) => void;
  removeFilterCondition: (namespace: string, field: string) => void;
  clearFilters: (namespace: string) => void;

  setSearchQuery: (namespace: string, query: string) => void;
  clearSearchQuery: (namespace: string) => void;

  setSort: (namespace: string, sort: SortCondition | null) => void;
  toggleSort: (namespace: string, field: string) => void;
  clearSort: (namespace: string) => void;

  setPagination: (namespace: string, pagination: PaginationState) => void;
  setPage: (namespace: string, page: number) => void;
  setPageSize: (namespace: string, pageSize: number) => void;
  setTotal: (namespace: string, total: number) => void;

  // 批量操作
  setFilterConfig: (namespace: string, config: FilterConfig) => void;
  getFilterConfig: (namespace: string) => FilterConfig;

  // 重置
  resetNamespace: (namespace: string) => void;
  resetAll: () => void;
}

// ============================================================================
// 常量
// ============================================================================

const STORAGE_KEY = '7zi-filters-storage';

const DEFAULT_FILTERS: FiltersState = {
  conditions: [],
  searchQuery: '',
};

const DEFAULT_PAGINATION: PaginationState = {
  page: 1,
  pageSize: 20,
  total: 0,
};

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 创建默认分页状态
 */
function createDefaultPagination(pageSize?: number): PaginationState {
  return {
    page: 1,
    pageSize: pageSize || 20,
    total: 0,
  };
}

// ============================================================================
// Store 实现
// ============================================================================

export const useFilterStore = create<FilterStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        activeFilters: new Map(),
        activeSorts: new Map(),
        activePagination: new Map(),
        isLoaded: false,

        // 设置过滤器
        setFilters: (namespace, filters) => {
          set((state) => {
            const newFilters = new Map(state.activeFilters);
            newFilters.set(namespace, filters);
            return { activeFilters: newFilters };
          });
        },

        // 设置单个过滤条件
        setFilterCondition: (namespace, condition) => {
          set((state) => {
            const newFilters = new Map(state.activeFilters);
            const currentFilters = newFilters.get(namespace) || { ...DEFAULT_FILTERS };

            // 查找是否已存在该字段的过滤条件
            const existingIndex = currentFilters.conditions.findIndex(
              (c) => c.field === condition.field
            );

            let newConditions: FilterCondition[];
            if (existingIndex >= 0) {
              // 更新现有条件
              newConditions = [...currentFilters.conditions];
              newConditions[existingIndex] = condition;
            } else {
              // 添加新条件
              newConditions = [...currentFilters.conditions, condition];
            }

            newFilters.set(namespace, {
              ...currentFilters,
              conditions: newConditions,
            });

            return { activeFilters: newFilters };
          });
        },

        // 移除过滤条件
        removeFilterCondition: (namespace, field) => {
          set((state) => {
            const newFilters = new Map(state.activeFilters);
            const currentFilters = newFilters.get(namespace);

            if (!currentFilters) return state;

            newFilters.set(namespace, {
              ...currentFilters,
              conditions: currentFilters.conditions.filter((c) => c.field !== field),
            });

            return { activeFilters: newFilters };
          });
        },

        // 清空过滤器
        clearFilters: (namespace) => {
          set((state) => {
            const newFilters = new Map(state.activeFilters);
            const currentFilters = newFilters.get(namespace);

            if (!currentFilters) return state;

            newFilters.set(namespace, {
              ...currentFilters,
              conditions: [],
              searchQuery: '',
            });

            return { activeFilters: newFilters };
          });
        },

        // 设置搜索查询
        setSearchQuery: (namespace, query) => {
          set((state) => {
            const newFilters = new Map(state.activeFilters);
            const currentFilters = newFilters.get(namespace) || { ...DEFAULT_FILTERS };

            newFilters.set(namespace, {
              ...currentFilters,
              searchQuery: query,
            });

            return { activeFilters: newFilters };
          });
        },

        // 清空搜索查询
        clearSearchQuery: (namespace) => {
          set((state) => {
            const newFilters = new Map(state.activeFilters);
            const currentFilters = newFilters.get(namespace);

            if (!currentFilters) return state;

            newFilters.set(namespace, {
              ...currentFilters,
              searchQuery: '',
            });

            return { activeFilters: newFilters };
          });
        },

        // 设置排序
        setSort: (namespace, sort) => {
          set((state) => {
            const newSorts = new Map(state.activeSorts);
            newSorts.set(namespace, sort);
            return { activeSorts: newSorts };
          });
        },

        // 切换排序（asc ↔ desc）
        toggleSort: (namespace, field) => {
          set((state) => {
            const newSorts = new Map(state.activeSorts);
            const currentSort = newSorts.get(namespace);

            let newSort: SortCondition | null;
            if (currentSort && currentSort.field === field) {
              // 切换方向
              newSort = {
                field,
                direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
              };
            } else {
              // 新排序
              newSort = { field, direction: 'asc' };
            }

            newSorts.set(namespace, newSort);
            return { activeSorts: newSorts };
          });
        },

        // 清空排序
        clearSort: (namespace) => {
          set((state) => {
            const newSorts = new Map(state.activeSorts);
            newSorts.set(namespace, null);
            return { activeSorts: newSorts };
          });
        },

        // 设置分页
        setPagination: (namespace, pagination) => {
          set((state) => {
            const newPagination = new Map(state.activePagination);
            newPagination.set(namespace, pagination);
            return { activePagination: newPagination };
          });
        },

        // 设置页码
        setPage: (namespace, page) => {
          set((state) => {
            const newPagination = new Map(state.activePagination);
            const currentPagination = newPagination.get(namespace) || createDefaultPagination();

            newPagination.set(namespace, {
              ...currentPagination,
              page,
            });

            return { activePagination: newPagination };
          });
        },

        // 设置每页数量
        setPageSize: (namespace, pageSize) => {
          set((state) => {
            const newPagination = new Map(state.activePagination);
            const currentPagination = newPagination.get(namespace) || createDefaultPagination();

            newPagination.set(namespace, {
              ...currentPagination,
              pageSize,
              page: 1, // 重置到第一页
            });

            return { activePagination: newPagination };
          });
        },

        // 设置总数
        setTotal: (namespace, total) => {
          set((state) => {
            const newPagination = new Map(state.activePagination);
            const currentPagination = newPagination.get(namespace) || createDefaultPagination();

            newPagination.set(namespace, {
              ...currentPagination,
              total,
            });

            return { activePagination: newPagination };
          });
        },

        // 批量设置过滤配置
        setFilterConfig: (namespace, config) => {
          set((state) => {
            const newFilters = new Map(state.activeFilters);
            const newSorts = new Map(state.activeSorts);
            const newPagination = new Map(state.activePagination);

            newFilters.set(namespace, config.filters);
            newSorts.set(namespace, config.sort);
            newPagination.set(namespace, config.pagination);

            return {
              activeFilters: newFilters,
              activeSorts: newSorts,
              activePagination: newPagination,
            };
          });
        },

        // 获取过滤配置
        getFilterConfig: (namespace) => {
          const { activeFilters, activeSorts, activePagination } = get();
          return {
            filters: activeFilters.get(namespace) || { ...DEFAULT_FILTERS },
            sort: activeSorts.get(namespace) || null,
            pagination: activePagination.get(namespace) || createDefaultPagination(),
          };
        },

        // 重置命名空间
        resetNamespace: (namespace) => {
          set((state) => {
            const newFilters = new Map(state.activeFilters);
            const newSorts = new Map(state.activeSorts);
            const newPagination = new Map(state.activePagination);

            newFilters.delete(namespace);
            newSorts.delete(namespace);
            newPagination.delete(namespace);

            return {
              activeFilters: newFilters,
              activeSorts: newSorts,
              activePagination: newPagination,
            };
          });
        },

        // 重置所有
        resetAll: () => {
          set({
            activeFilters: new Map(),
            activeSorts: new Map(),
            activePagination: new Map(),
          });
        },
      }),
      {
        name: STORAGE_KEY,
        // 自定义序列化以处理 Map
        storage: {
          getItem: (name) => {
            if (typeof window === 'undefined') return null;
            const str = localStorage.getItem(name);
            if (!str) return null;
            try {
              const data = JSON.parse(str);
              // 将数组转回 Map
              if (data.state?.activeFilters) {
                data.state.activeFilters = new Map(data.state.activeFilters as [string, FiltersState][]);
              }
              if (data.state?.activeSorts) {
                data.state.activeSorts = new Map(data.state.activeSorts as [string, SortCondition | null][]);
              }
              if (data.state?.activePagination) {
                data.state.activePagination = new Map(data.state.activePagination as [string, PaginationState][]);
              }
              return data;
            } catch {
              return null;
            }
          },
          setItem: (name, value) => {
            if (typeof window === 'undefined') return;
            // 将 Map 转为数组存储
            const data = { ...value };
            if (data.state?.activeFilters instanceof Map) {
              (data.state as any).activeFilters = Array.from(data.state.activeFilters.entries());
            }
            if (data.state?.activeSorts instanceof Map) {
              (data.state as any).activeSorts = Array.from(data.state.activeSorts.entries());
            }
            if (data.state?.activePagination instanceof Map) {
              (data.state as any).activePagination = Array.from(data.state.activePagination.entries());
            }
            try {
              localStorage.setItem(name, JSON.stringify(data));
            } catch (error) {
              console.error('Failed to save filter store:', error);
            }
          },
          removeItem: (name) => {
            if (typeof window === 'undefined') return;
            localStorage.removeItem(name);
          },
        },
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.isLoaded = true;
          }
        },
      }
    ),
    { name: 'filter-store' }
  )
);

// ============================================================================
// 选择器 Hooks（命名空间版本）
// ============================================================================

/**
 * 获取指定命名空间的过滤器状态
 */
export const useFilters = (namespace: string) =>
  useFilterStore((state) => state.activeFilters.get(namespace) || { ...DEFAULT_FILTERS });

/**
 * 获取指定命名空间的排序状态
 */
export const useSort = (namespace: string) =>
  useFilterStore((state) => state.activeSorts.get(namespace) || null);

/**
 * 获取指定命名空间的分页状态
 */
export const usePagination = (namespace: string) =>
  useFilterStore((state) => state.activePagination.get(namespace) || createDefaultPagination());

/**
 * 获取完整的过滤配置（命名空间版本）
 */
export const useFilterConfig = (namespace: string) =>
  useFilterStore((state) => ({
    filters: state.activeFilters.get(namespace) || { ...DEFAULT_FILTERS },
    sort: state.activeSorts.get(namespace) || null,
    pagination: state.activePagination.get(namespace) || createDefaultPagination(),
  }));

// ============================================================================
// Action Hooks（命名空间版本）
// ============================================================================

/**
 * 获取过滤操作（命名空间版本）
 */
export const useFilterActions = (namespace: string) => ({
  setFilters: (filters: FiltersState) =>
    useFilterStore.getState().setFilters(namespace, filters),
  setFilterCondition: (condition: FilterCondition) =>
    useFilterStore.getState().setFilterCondition(namespace, condition),
  removeFilterCondition: (field: string) =>
    useFilterStore.getState().removeFilterCondition(namespace, field),
  clearFilters: () =>
    useFilterStore.getState().clearFilters(namespace),
});

/**
 * 获取搜索操作（命名空间版本）
 */
export const useSearchActions = (namespace: string) => ({
  setSearchQuery: (query: string) =>
    useFilterStore.getState().setSearchQuery(namespace, query),
  clearSearchQuery: () =>
    useFilterStore.getState().clearSearchQuery(namespace),
});

/**
 * 获取排序操作（命名空间版本）
 */
export const useSortActions = (namespace: string) => ({
  setSort: (sort: SortCondition | null) =>
    useFilterStore.getState().setSort(namespace, sort),
  toggleSort: (field: string) =>
    useFilterStore.getState().toggleSort(namespace, field),
  clearSort: () =>
    useFilterStore.getState().clearSort(namespace),
});

/**
 * 获取分页操作（命名空间版本）
 */
export const usePaginationActions = (namespace: string) => ({
  setPagination: (pagination: PaginationState) =>
    useFilterStore.getState().setPagination(namespace, pagination),
  setPage: (page: number) =>
    useFilterStore.getState().setPage(namespace, page),
  setPageSize: (pageSize: number) =>
    useFilterStore.getState().setPageSize(namespace, pageSize),
  setTotal: (total: number) =>
    useFilterStore.getState().setTotal(namespace, total),
});

// ============================================================================
// 实用 Hooks
// ============================================================================

/**
 * 是否有活动过滤器
 */
export const useHasActiveFilters = (namespace: string) =>
  useFilterStore((state) => {
    const filters = state.activeFilters.get(namespace);
    return (
      filters &&
      (filters.conditions.length > 0 || filters.searchQuery.trim().length > 0)
    );
  });

/**
 * 计算总页数
 */
export const useTotalPages = (namespace: string) =>
  useFilterStore((state) => {
    const pagination = state.activePagination.get(namespace);
    if (!pagination || pagination.pageSize === 0) return 0;
    return Math.ceil(pagination.total / pagination.pageSize);
  });

// ============================================================================
// 外部访问 API
// ============================================================================

/**
 * 获取过滤配置（非 React）
 */
export const getFilterConfig = (namespace: string) => {
  return useFilterStore.getState().getFilterConfig(namespace);
};

/**
 * 设置过滤配置（非 React）
 */
export const setFilterConfig = (namespace: string, config: FilterConfig) => {
  useFilterStore.getState().setFilterConfig(namespace, config);
};
