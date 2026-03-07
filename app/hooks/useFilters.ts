'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  FilterConfig,
  FilterCondition,
  FilterLogic,
  FieldConfig,
  FILTER_STORAGE_KEYS,
  FilterTemplate,
} from '@/lib/types/filters';

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 解析模板变量
 */
function parseTemplateValue(value: any): any {
  if (typeof value === 'string') {
    // 解析日期变量
    if (value === '{{today}}') {
      return new Date().toISOString().split('T')[0];
    }
    if (value === '{{7_days_ago}}') {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      return date.toISOString().split('T')[0];
    }
    if (value === '{{30_days_ago}}') {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString().split('T')[0];
    }
  }
  return value;
}

/**
 * useFilters Hook - 过滤器状态管理
 */
export function useFilters<T extends Record<string, any>>(
  data: T[],
  fields: FieldConfig[],
  storageKey: keyof typeof FILTER_STORAGE_KEYS = 'taskFilters'
) {
  // 当前激活的过滤器
  const [activeFilters, setActiveFilters] = useState<FilterConfig[]>([]);
  
  // 保存的过滤器配置
  const [savedFilters, setSavedFilters] = useState<FilterConfig[]>([]);
  
  // 逻辑关系
  const [globalLogic, setGlobalLogic] = useState<FilterLogic>('AND');

  // 从 localStorage 加载保存的过滤器
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FILTER_STORAGE_KEYS[storageKey]);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSavedFilters(parsed);
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error);
    }
  }, [storageKey]);

  // 保存过滤器到 localStorage
  const saveFiltersToStorage = useCallback((filters: FilterConfig[]) => {
    try {
      localStorage.setItem(FILTER_STORAGE_KEYS[storageKey], JSON.stringify(filters));
    } catch (error) {
      console.error('Failed to save filters:', error);
    }
  }, [storageKey]);

  // 计算过滤后的数据
  const filteredData = useMemo(() => {
    if (activeFilters.length === 0) {
      return data;
    }

    return data.filter(item => {
      const results = activeFilters.map(filter => {
        return evaluateFilter(item, filter);
      });

      return globalLogic === 'AND'
        ? results.every(Boolean)
        : results.some(Boolean);
    });
  }, [data, activeFilters, globalLogic]);

  // 评估单个过滤器
  function evaluateFilter(item: T, filter: FilterConfig): boolean {
    const results = filter.conditions.map(condition => {
      return evaluateCondition(item, condition);
    });

    return filter.logic === 'AND'
      ? results.every(Boolean)
      : results.some(Boolean);
  }

  // 评估单个条件
  function evaluateCondition(item: T, condition: FilterCondition): boolean {
    const fieldValue = getNestedValue(item, condition.field);
    const targetValue = parseTemplateValue(condition.value);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === targetValue;
      
      case 'notEquals':
        return fieldValue !== targetValue;
      
      case 'contains':
        if (Array.isArray(fieldValue)) {
          return fieldValue.some(v => 
            String(v).toLowerCase().includes(String(targetValue).toLowerCase())
          );
        }
        return String(fieldValue).toLowerCase().includes(String(targetValue).toLowerCase());
      
      case 'notContains':
        if (Array.isArray(fieldValue)) {
          return !fieldValue.some(v => 
            String(v).toLowerCase().includes(String(targetValue).toLowerCase())
          );
        }
        return !String(fieldValue).toLowerCase().includes(String(targetValue).toLowerCase());
      
      case 'startsWith':
        return String(fieldValue).toLowerCase().startsWith(String(targetValue).toLowerCase());
      
      case 'endsWith':
        return String(fieldValue).toLowerCase().endsWith(String(targetValue).toLowerCase());
      
      case 'greaterThan':
        return Number(fieldValue) > Number(targetValue);
      
      case 'lessThan':
        return Number(fieldValue) < Number(targetValue);
      
      case 'greaterThanOrEqual':
        return Number(fieldValue) >= Number(targetValue);
      
      case 'lessThanOrEqual':
        return Number(fieldValue) <= Number(targetValue);
      
      case 'isEmpty':
        return fieldValue === null || fieldValue === undefined || fieldValue === '' ||
          (Array.isArray(fieldValue) && fieldValue.length === 0);
      
      case 'isNotEmpty':
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== '' &&
          !(Array.isArray(fieldValue) && fieldValue.length === 0);
      
      case 'in':
        if (Array.isArray(targetValue)) {
          return targetValue.includes(fieldValue);
        }
        return false;
      
      case 'notIn':
        if (Array.isArray(targetValue)) {
          return !targetValue.includes(fieldValue);
        }
        return true;
      
      default:
        return true;
    }
  }

  // 获取嵌套值
  function getNestedValue(obj: T, path: string): any {
    return path.split('.').reduce((acc: any, key) => acc?.[key], obj);
  }

  // 添加过滤器
  const addFilter = useCallback((filter: FilterConfig) => {
    setActiveFilters(prev => [...prev, filter]);
  }, []);

  // 移除过滤器
  const removeFilter = useCallback((filterId: string) => {
    setActiveFilters(prev => prev.filter(f => f.id !== filterId));
  }, []);

  // 更新过滤器
  const updateFilter = useCallback((filterId: string, updates: Partial<FilterConfig>) => {
    setActiveFilters(prev => prev.map(f => 
      f.id === filterId ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f
    ));
  }, []);

  // 清除所有过滤器
  const clearFilters = useCallback(() => {
    setActiveFilters([]);
  }, []);

  // 保存过滤器配置
  const saveFilter = useCallback((filter: FilterConfig) => {
    const newFilter = {
      ...filter,
      id: filter.id || generateId(),
      createdAt: filter.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setSavedFilters(prev => {
      const updated = [...prev.filter(f => f.id !== newFilter.id), newFilter];
      saveFiltersToStorage(updated);
      return updated;
    });
    
    return newFilter;
  }, [saveFiltersToStorage]);

  // 删除保存的过滤器
  const deleteSavedFilter = useCallback((filterId: string) => {
    setSavedFilters(prev => {
      const updated = prev.filter(f => f.id !== filterId);
      saveFiltersToStorage(updated);
      return updated;
    });
  }, [saveFiltersToStorage]);

  // 从模板创建过滤器
  const createFromTemplate = useCallback((template: FilterTemplate): FilterConfig => {
    const filter: FilterConfig = {
      id: generateId(),
      name: template.name,
      conditions: template.conditions.map((c, idx) => ({
        ...c,
        id: `cond_${Date.now()}_${idx}`,
        value: parseTemplateValue(c.value),
      })),
      logic: template.logic,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setActiveFilters(prev => [...prev, filter]);
    return filter;
  }, []);

  // 应用保存的过滤器
  const applySavedFilter = useCallback((filterId: string) => {
    const filter = savedFilters.find(f => f.id === filterId);
    if (filter) {
      setActiveFilters(prev => {
        if (prev.some(f => f.id === filterId)) {
          return prev;
        }
        return [...prev, filter];
      });
    }
  }, [savedFilters]);

  // 获取字段配置
  const getFieldConfig = useCallback((fieldName: string): FieldConfig | undefined => {
    return fields.find(f => f.name === fieldName);
  }, [fields]);

  // 验证条件值
  const validateCondition = useCallback((condition: FilterCondition): boolean => {
    const field = getFieldConfig(condition.field);
    if (!field) return false;

    // 空值操作符不需要值
    if (condition.operator === 'isEmpty' || condition.operator === 'isNotEmpty') {
      return true;
    }

    // 检查值是否存在
    if (condition.value === null || condition.value === undefined || condition.value === '') {
      return false;
    }

    return true;
  }, [getFieldConfig]);

  return {
    // 状态
    activeFilters,
    savedFilters,
    globalLogic,
    filteredData,
    
    // 操作
    addFilter,
    removeFilter,
    updateFilter,
    clearFilters,
    setGlobalLogic,
    
    // 持久化
    saveFilter,
    deleteSavedFilter,
    applySavedFilter,
    createFromTemplate,
    
    // 工具
    getFieldConfig,
    validateCondition,
    
    // 统计
    filterCount: activeFilters.length,
    dataCount: data.length,
    filteredCount: filteredData.length,
  };
}

/**
 * useFilterConfig Hook - 过滤器配置管理
 */
export function useFilterConfig(fields: FieldConfig[]) {
  // 当前编辑的过滤器
  const [editingFilter, setEditingFilter] = useState<FilterConfig | null>(null);
  
  // 条件列表
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  
  // 逻辑关系
  const [logic, setLogic] = useState<FilterLogic>('AND');
  
  // 过滤器名称
  const [filterName, setFilterName] = useState('');

  // 添加条件
  const addCondition = useCallback(() => {
    const firstField = fields[0];
    const firstOperator = firstField?.operators[0] || 'equals';
    
    const newCondition: FilterCondition = {
      id: `cond_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      field: firstField?.name || '',
      operator: firstOperator,
      value: null,
    };
    
    setConditions(prev => [...prev, newCondition]);
  }, [fields]);

  // 移除条件
  const removeCondition = useCallback((conditionId: string) => {
    setConditions(prev => prev.filter(c => c.id !== conditionId));
  }, []);

  // 更新条件
  const updateCondition = useCallback((conditionId: string, updates: Partial<FilterCondition>) => {
    setConditions(prev => prev.map(c => 
      c.id === conditionId ? { ...c, ...updates } : c
    ));
  }, []);

  // 重置
  const reset = useCallback(() => {
    setConditions([]);
    setLogic('AND');
    setFilterName('');
    setEditingFilter(null);
  }, []);

  // 编辑现有过滤器
  const editFilter = useCallback((filter: FilterConfig) => {
    setEditingFilter(filter);
    setConditions(filter.conditions);
    setLogic(filter.logic);
    setFilterName(filter.name);
  }, []);

  // 构建过滤器配置
  const buildFilter = useCallback((): FilterConfig | null => {
    if (conditions.length === 0) {
      return null;
    }

    return {
      id: editingFilter?.id || generateId(),
      name: filterName || '未命名过滤器',
      conditions,
      logic,
      createdAt: editingFilter?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [conditions, logic, filterName, editingFilter]);

  // 获取字段可用操作符
  const getOperatorsForField = useCallback((fieldName: string): FieldConfig['operators'] => {
    const field = fields.find(f => f.name === fieldName);
    return field?.operators || [];
  }, [fields]);

  // 获取字段类型
  const getFieldType = useCallback((fieldName: string): FieldConfig['type'] => {
    const field = fields.find(f => f.name === fieldName);
    return field?.type || 'string';
  }, [fields]);

  // 获取字段选项
  const getFieldOptions = useCallback((fieldName: string): FieldConfig['options'] => {
    const field = fields.find(f => f.name === fieldName);
    return field?.options;
  }, [fields]);

  return {
    // 状态
    editingFilter,
    conditions,
    logic,
    filterName,
    
    // 操作
    addCondition,
    removeCondition,
    updateCondition,
    setLogic,
    setFilterName,
    reset,
    editFilter,
    buildFilter,
    
    // 工具
    getOperatorsForField,
    getFieldType,
    getFieldOptions,
    
    // 验证
    isValid: conditions.length > 0,
    hasName: filterName.trim().length > 0,
  };
}

export default useFilters;