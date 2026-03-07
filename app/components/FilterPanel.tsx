'use client';

import React, { useState, useCallback, useMemo, memo, useId } from 'react';
import { useFilters, useFilterConfig } from '@/hooks/useFilters';
import {
  FilterConfig,
  FilterCondition,
  FilterLogic,
  FieldConfig,
  FilterTemplate,
  TASK_FILTER_FIELDS,
  MEMBER_FILTER_FIELDS,
  FILTER_TEMPLATES,
  OPERATOR_LABELS,
} from '@/lib/types/filters';
import { useTranslations } from 'next-intl';

// ============================================================================
// 类型定义
// ============================================================================

interface FilterPanelProps {
  type: 'task' | 'member';
  fields?: FieldConfig[];
  onSave?: (filter: FilterConfig) => void;
  onCancel?: () => void;
  className?: string;
}

interface FilterConditionRowProps {
  condition: FilterCondition;
  fields: FieldConfig[];
  onUpdate: (updates: Partial<FilterCondition>) => void;
  onRemove: () => void;
}

interface FilterChipProps {
  filter: FilterConfig;
  onEdit?: () => void;
  onRemove?: () => void;
}

interface FilterTemplatesProps {
  templates: FilterTemplate[];
  onSelect: (template: FilterTemplate) => void;
}

// ============================================================================
// 过滤器条件行组件
// ============================================================================

const FilterConditionRow = memo(function FilterConditionRow({
  condition,
  fields,
  onUpdate,
  onRemove,
}: FilterConditionRowProps) {
  const selectId = useId();
  const currentField = fields.find(f => f.name === condition.field);
  const operators = currentField?.operators || [];
  const fieldOptions = currentField?.options;
  const fieldType = currentField?.type || 'string';
  
  const needsValue = !['isEmpty', 'isNotEmpty'].includes(condition.operator);

  const handleFieldChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newField = fields.find(f => f.name === e.target.value);
    const newOperator = newField?.operators[0] || 'equals';
    onUpdate({ field: e.target.value, operator: newOperator, value: null });
  }, [fields, onUpdate]);

  const handleOperatorChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ operator: e.target.value as FilterCondition['operator'] });
  }, [onUpdate]);

  const handleValueChange = useCallback((value: any) => {
    onUpdate({ value });
  }, [onUpdate]);

  // 渲染值输入
  const renderValueInput = () => {
    if (!needsValue) return null;

    if (fieldType === 'select' || fieldType === 'multiselect') {
      if (fieldOptions) {
        const isMultiple = condition.operator === 'in' || condition.operator === 'notIn';
        
        if (isMultiple) {
          return (
            <select
              multiple
              value={Array.isArray(condition.value) ? condition.value : []}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, opt => opt.value);
                handleValueChange(values);
              }}
              className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 
                         rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="选择值"
            >
              {fieldOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          );
        }

        return (
          <select
            value={condition.value || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 
                       rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="选择值"
          >
            <option value="">请选择</option>
            {fieldOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      }
    }

    if (fieldType === 'number') {
      return (
        <input
          type="number"
          value={condition.value ?? ''}
          onChange={(e) => handleValueChange(e.target.value ? Number(e.target.value) : null)}
          placeholder={currentField?.placeholder || '输入数值'}
          className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 
                     rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-label="输入数值"
        />
      );
    }

    if (fieldType === 'date') {
      return (
        <input
          type="date"
          value={condition.value || ''}
          onChange={(e) => handleValueChange(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 
                     rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-label="选择日期"
        />
      );
    }

    if (fieldType === 'boolean') {
      return (
        <select
          value={condition.value ?? ''}
          onChange={(e) => handleValueChange(e.target.value === 'true')}
          className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 
                     rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-label="选择布尔值"
        >
          <option value="">请选择</option>
          <option value="true">是</option>
          <option value="false">否</option>
        </select>
      );
    }

    // 默认文本输入
    return (
      <input
        type="text"
        value={condition.value ?? ''}
        onChange={(e) => handleValueChange(e.target.value)}
        placeholder={currentField?.placeholder || '输入值'}
        className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 
                   rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        aria-label="输入值"
      />
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      {/* 字段选择 */}
      <select
        value={condition.field}
        onChange={handleFieldChange}
        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 
                   rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        aria-label="选择字段"
      >
        {fields.map(field => (
          <option key={field.name} value={field.name}>{field.label}</option>
        ))}
      </select>

      {/* 操作符选择 */}
      <select
        value={condition.operator}
        onChange={handleOperatorChange}
        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 
                   rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        aria-label="选择操作符"
      >
        {operators.map(op => (
          <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
        ))}
      </select>

      {/* 值输入 */}
      {renderValueInput()}

      {/* 删除按钮 */}
      <button
        type="button"
        onClick={onRemove}
        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
                   rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
        aria-label="删除条件"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
});

// ============================================================================
// 过滤器标签组件
// ============================================================================

const FilterChip = memo(function FilterChip({
  filter,
  onEdit,
  onRemove,
}: FilterChipProps) {
  const conditionCount = filter.conditions.length;
  
  return (
    <div 
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 
                 text-blue-700 dark:text-blue-300 rounded-full text-sm"
      role="group"
      aria-label={`过滤器：${filter.name}`}
    >
      <span className="font-medium">{filter.name}</span>
      <span className="text-blue-500 dark:text-blue-400 text-xs">
        ({conditionCount} 条件)
      </span>
      {onEdit && (
        <button
          onClick={onEdit}
          className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="编辑过滤器"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="移除过滤器"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
});

// ============================================================================
// 过滤器模板组件
// ============================================================================

const FilterTemplates = memo(function FilterTemplates({
  templates,
  onSelect,
}: FilterTemplatesProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (templates.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium 
                   text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 
                   border border-gray-300 dark:border-gray-600 rounded-lg 
                   hover:bg-gray-50 dark:hover:bg-gray-600 
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>📋</span>
        <span>模板</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
             fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 z-10 mt-1 w-64 bg-white dark:bg-gray-800 
                     border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
          role="listbox"
        >
          {templates.map(template => (
            <button
              key={template.id}
              onClick={() => {
                onSelect(template);
                setIsOpen(false);
              }}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 
                         dark:hover:bg-gray-700/50 transition-colors
                         focus:outline-none focus:bg-blue-50 dark:focus:bg-blue-900/30"
              role="option"
            >
              <span className="text-lg">{template.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {template.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                  {template.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// 主过滤器面板组件
// ============================================================================

export const FilterPanel: React.FC<FilterPanelProps> = memo(function FilterPanel({
  type,
  fields: customFields,
  onSave,
  onCancel,
  className = '',
}) {
  const fields = customFields || (type === 'task' ? TASK_FILTER_FIELDS : MEMBER_FILTER_FIELDS);
  const templates = useMemo(() => 
    FILTER_TEMPLATES.filter(t => t.category === type || t.category === 'general'),
    [type]
  );
  
  const config = useFilterConfig(fields);
  const panelId = useId();
  
  // 处理保存
  const handleSave = useCallback(() => {
    const filter = config.buildFilter();
    if (filter) {
      onSave?.(filter);
      config.reset();
    }
  }, [config, onSave]);

  // 处理取消
  const handleCancel = useCallback(() => {
    config.reset();
    onCancel?.();
  }, [config, onCancel]);

  // 应用模板
  const handleTemplateSelect = useCallback((template: FilterTemplate) => {
    config.reset();
    template.conditions.forEach(c => {
      config.addCondition();
      const conditions = config.conditions;
      const lastCondition = conditions[conditions.length - 1];
      if (lastCondition) {
        config.updateCondition(lastCondition.id, {
          field: c.field,
          operator: c.operator,
          value: c.value,
        });
      }
    });
    config.setFilterName(template.name);
    config.setLogic(template.logic);
  }, [config]);

  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 
                  shadow-sm overflow-hidden ${className}`}
      role="region"
      aria-label="过滤器面板"
    >
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 
                      bg-gray-50 dark:bg-gray-700/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            🔍 高级过滤器
          </h3>
          <div className="flex items-center gap-2">
            <FilterTemplates templates={templates} onSelect={handleTemplateSelect} />
          </div>
        </div>
      </div>

      {/* 过滤器名称 */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <label 
          htmlFor={`${panelId}-name`}
          className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          过滤器名称
        </label>
        <input
          id={`${panelId}-name`}
          type="text"
          value={config.filterName}
          onChange={(e) => config.setFilterName(e.target.value)}
          placeholder="输入过滤器名称（可选）"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 
                     rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* 逻辑关系选择 */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">条件关系：</span>
          <div className="flex items-center gap-2" role="radiogroup" aria-label="条件逻辑关系">
            {(['AND', 'OR'] as FilterLogic[]).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => config.setLogic(l)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           ${config.logic === l
                             ? 'bg-blue-600 text-white'
                             : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                           }`}
                role="radio"
                aria-checked={config.logic === l}
              >
                {l === 'AND' ? '并且' : '或者'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 条件列表 */}
      <div className="px-4 py-3 space-y-2 max-h-[300px] overflow-y-auto">
        {config.conditions.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <p className="text-sm">暂无过滤条件</p>
            <p className="text-xs mt-1">点击下方按钮添加条件</p>
          </div>
        ) : (
          config.conditions.map(condition => (
            <FilterConditionRow
              key={condition.id}
              condition={condition}
              fields={fields}
              onUpdate={(updates) => config.updateCondition(condition.id, updates)}
              onRemove={() => config.removeCondition(condition.id)}
            />
          ))
        )}
      </div>

      {/* 添加条件按钮 */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={config.addCondition}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium 
                     text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 
                     border border-blue-200 dark:border-blue-800 rounded-lg
                     hover:bg-blue-100 dark:hover:bg-blue-900/30 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加条件
        </button>
      </div>

      {/* 操作按钮 */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 
                      bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                     bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 
                     rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!config.isValid}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 
                     rounded-lg hover:bg-blue-700 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          应用过滤器
        </button>
      </div>
    </div>
  );
});

// ============================================================================
// 导出
// ============================================================================

export default FilterPanel;