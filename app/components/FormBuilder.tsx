/**
 * 表单编辑器组件
 * 动态创建和编辑表单字段
 */

'use client';

import React, { useState, useCallback, memo } from 'react';
import { RichTextEditor } from './RichTextEditor';

/**
 * 字段类型
 */
export type FieldType = 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'richtext';

/**
 * 选项（用于 select/radio）
 */
export interface FieldOption {
  value: string;
  label: string;
}

/**
 * 表单字段配置
 */
export interface FormField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  defaultValue?: string | number | boolean;
  options?: FieldOption[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    message?: string;
  };
  helpText?: string;
  order: number;
}

/**
 * 表单配置
 */
export interface FormConfig {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  submitText?: string;
  resetText?: string;
}

/**
 * 表单数据
 */
export type FormData = Record<string, string | number | boolean>;

/**
 * 表单错误
 */
export type FormErrors = Record<string, string>;

/**
 * 字段编辑器属性
 */
interface FieldEditorProps {
  field: FormField;
  onUpdate: (field: FormField) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst: boolean;
  isLast: boolean;
}

/**
 * 字段类型选项
 */
const FIELD_TYPES: { value: FieldType; label: string; icon: string }[] = [
  { value: 'text', label: '文本', icon: '📝' },
  { value: 'email', label: '邮箱', icon: '📧' },
  { value: 'password', label: '密码', icon: '🔑' },
  { value: 'number', label: '数字', icon: '🔢' },
  { value: 'textarea', label: '多行文本', icon: '📄' },
  { value: 'richtext', label: '富文本', icon: '✨' },
  { value: 'select', label: '下拉选择', icon: '📋' },
  { value: 'checkbox', label: '复选框', icon: '☑️' },
  { value: 'radio', label: '单选', icon: '⭕' },
  { value: 'date', label: '日期', icon: '📅' },
];

/**
 * 字段编辑器组件
 */
const FieldEditor = memo(function FieldEditor({
  field,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: FieldEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const updateField = useCallback(<K extends keyof FormField>(key: K, value: FormField[K]) => {
    onUpdate({ ...field, [key]: value });
  }, [field, onUpdate]);

  const addOption = useCallback(() => {
    const newOption: FieldOption = {
      value: `option-${Date.now()}`,
      label: '新选项',
    };
    updateField('options', [...(field.options || []), newOption]);
  }, [field, updateField]);

  const updateOption = useCallback((index: number, option: FieldOption) => {
    const newOptions = [...(field.options || [])];
    newOptions[index] = option;
    updateField('options', newOptions);
  }, [field, updateField]);

  const removeOption = useCallback((index: number) => {
    const newOptions = (field.options || []).filter((_, i) => i !== index);
    updateField('options', newOptions);
  }, [field, updateField]);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-lg">
            {FIELD_TYPES.find(t => t.value === field.type)?.icon || '📝'}
          </span>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              {field.label || '未命名字段'}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {field.name} · {FIELD_TYPES.find(t => t.value === field.type)?.label}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30"
            title="上移"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30"
            title="下移"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title={isExpanded ? '收起' : '展开'}
          >
            <svg 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-red-400 hover:text-red-600 dark:hover:text-red-300"
            title="删除"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* 详细配置 */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-white dark:bg-gray-900">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={`field-name-${field.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                字段名称
              </label>
              <input
                id={`field-name-${field.id}`}
                type="text"
                value={field.name}
                onChange={(e) => updateField('name', e.target.value.replace(/\s+/g, '_').toLowerCase())}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="field_name"
              />
            </div>
            <div>
              <label htmlFor={`field-label-${field.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                显示标签
              </label>
              <input
                id={`field-label-${field.id}`}
                type="text"
                value={field.label}
                onChange={(e) => updateField('label', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="字段标签"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                字段类型
              </label>
              <select
                value={field.type}
                onChange={(e) => updateField('type', e.target.value as FieldType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {FIELD_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                占位文本
              </label>
              <input
                type="text"
                value={field.placeholder || ''}
                onChange={(e) => updateField('placeholder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="请输入..."
              />
            </div>
          </div>

          {/* 帮助文本 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              帮助文本
            </label>
            <input
              type="text"
              value={field.helpText || ''}
              onChange={(e) => updateField('helpText', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="显示在字段下方的提示信息"
            />
          </div>

          {/* 选项（select/radio） */}
          {(field.type === 'select' || field.type === 'radio') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  选项列表
                </label>
                <button
                  type="button"
                  onClick={addOption}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  + 添加选项
                </button>
              </div>
              <div className="space-y-2">
                {(field.options || []).map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={option.value}
                      onChange={(e) => updateOption(index, { ...option, value: e.target.value })}
                      className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      placeholder="值"
                    />
                    <input
                      type="text"
                      value={option.label}
                      onChange={(e) => updateOption(index, { ...option, label: e.target.value })}
                      className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      placeholder="标签"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="p-1.5 text-red-400 hover:text-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 验证规则 */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">验证规则</h5>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.required || false}
                  onChange={(e) => updateField('required', e.target.checked)}
                  className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">必填字段</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.disabled || false}
                  onChange={(e) => updateField('disabled', e.target.checked)}
                  className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">禁用字段</span>
              </label>
            </div>

            {(field.type === 'text' || field.type === 'textarea' || field.type === 'richtext') && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">最小长度</label>
                  <input
                    type="number"
                    min="0"
                    value={field.validation?.minLength || ''}
                    onChange={(e) => updateField('validation', { 
                      ...field.validation, 
                      minLength: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">最大长度</label>
                  <input
                    type="number"
                    min="0"
                    value={field.validation?.maxLength || ''}
                    onChange={(e) => updateField('validation', { 
                      ...field.validation, 
                      maxLength: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    placeholder="1000"
                  />
                </div>
              </div>
            )}

            {field.type === 'number' && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">最小值</label>
                  <input
                    type="number"
                    value={field.validation?.min || ''}
                    onChange={(e) => updateField('validation', { 
                      ...field.validation, 
                      min: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                    className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">最大值</label>
                  <input
                    type="number"
                    value={field.validation?.max || ''}
                    onChange={(e) => updateField('validation', { 
                      ...field.validation, 
                      max: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                    className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * 表单编辑器属性
 */
export interface FormBuilderProps {
  /** 表单配置 */
  config: FormConfig;
  /** 配置变化回调 */
  onChange: (config: FormConfig) => void;
  /** 预览模式 */
  previewMode?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 表单编辑器/构建器组件
 */
export const FormBuilder = memo(function FormBuilder({
  config,
  onChange,
  previewMode = false,
  className = '',
}: FormBuilderProps) {
  // 添加新字段
  const addField = useCallback((type: FieldType) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      name: `field_${config.fields.length + 1}`,
      label: '新字段',
      type,
      order: config.fields.length,
      options: type === 'select' || type === 'radio' 
        ? [{ value: 'option1', label: '选项 1' }, { value: 'option2', label: '选项 2' }]
        : undefined,
    };
    onChange({
      ...config,
      fields: [...config.fields, newField],
    });
  }, [config, onChange]);

  // 更新字段
  const updateField = useCallback((index: number, field: FormField) => {
    const newFields = [...config.fields];
    newFields[index] = field;
    onChange({ ...config, fields: newFields });
  }, [config, onChange]);

  // 删除字段
  const deleteField = useCallback((index: number) => {
    const newFields = config.fields.filter((_, i) => i !== index);
    onChange({ ...config, fields: newFields });
  }, [config, onChange]);

  // 移动字段
  const moveField = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= config.fields.length) return;
    
    const newFields = [...config.fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    newFields.forEach((f, i) => f.order = i);
    onChange({ ...config, fields: newFields });
  }, [config, onChange]);

  // 更新表单基本信息
  const updateMeta = useCallback(<K extends keyof FormConfig>(key: K, value: FormConfig[K]) => {
    onChange({ ...config, [key]: value });
  }, [config, onChange]);

  if (previewMode) {
    return <FormPreview config={config} className={className} />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 表单基本信息 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">表单信息</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="form-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              表单标题
            </label>
            <input
              id="form-title"
              type="text"
              value={config.title}
              onChange={(e) => updateMeta('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="我的表单"
            />
          </div>
          <div>
            <label htmlFor="form-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              表单描述
            </label>
            <RichTextEditor
              content={config.description || ''}
              onChange={(html) => updateMeta('description', html)}
              placeholder="输入表单描述（可选）..."
              minHeight={80}
              showToolbar={true}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                提交按钮文本
              </label>
              <input
                type="text"
                value={config.submitText || '提交'}
                onChange={(e) => updateMeta('submitText', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                重置按钮文本
              </label>
              <input
                type="text"
                value={config.resetText || '重置'}
                onChange={(e) => updateMeta('resetText', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 添加字段 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">添加字段</h3>
        <div className="flex flex-wrap gap-2">
          {FIELD_TYPES.map(type => (
            <button
              key={type.value}
              type="button"
              onClick={() => addField(type.value)}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
            >
              {type.icon} {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* 字段列表 */}
      {config.fields.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            字段列表 ({config.fields.length})
          </h3>
          {config.fields.map((field, index) => (
            <FieldEditor
              key={field.id}
              field={field}
              onUpdate={(f) => updateField(index, f)}
              onDelete={() => deleteField(index)}
              onMoveUp={() => moveField(index, 'up')}
              onMoveDown={() => moveField(index, 'down')}
              isFirst={index === 0}
              isLast={index === config.fields.length - 1}
            />
          ))}
        </div>
      )}

      {config.fields.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>点击上方按钮添加字段</p>
        </div>
      )}
    </div>
  );
});

/**
 * 表单预览属性
 */
interface FormPreviewProps {
  config: FormConfig;
  className?: string;
  onSubmit?: (data: FormData) => void;
}

/**
 * 表单预览组件
 */
export const FormPreview = memo(function FormPreview({
  config,
  className = '',
  onSubmit,
}: FormPreviewProps) {
  const [data, setData] = useState<FormData>({});
  const [errors, setErrors] = useState<FormErrors>({});

  const updateValue = useCallback((name: string, value: string | number | boolean) => {
    setData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    
    config.fields.forEach(field => {
      if (field.required) {
        const value = data[field.name];
        if (value === undefined || value === '' || value === null) {
          newErrors[field.name] = '此字段为必填项';
        }
      }
      
      if (field.validation?.minLength && typeof data[field.name] === 'string') {
        if ((data[field.name] as string).length < field.validation.minLength) {
          newErrors[field.name] = `最少需要 ${field.validation.minLength} 个字符`;
        }
      }
      
      if (field.validation?.maxLength && typeof data[field.name] === 'string') {
        if ((data[field.name] as string).length > field.validation.maxLength) {
          newErrors[field.name] = `最多允许 ${field.validation.maxLength} 个字符`;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [config.fields, data]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit?.(data);
    }
  }, [data, validate, onSubmit]);

  const handleReset = useCallback(() => {
    setData({});
    setErrors({});
  }, []);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* 标题 */}
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {config.title}
      </h2>
      
      {/* 描述 */}
      {config.description && (
        <div 
          className="text-gray-600 dark:text-gray-400 mb-6 prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: config.description }}
        />
      )}
      
      {/* 表单 */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {config.fields
          .sort((a, b) => a.order - b.order)
          .map(field => (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              
              {/* 根据类型渲染不同输入 */}
              {field.type === 'text' || field.type === 'email' || field.type === 'password' || field.type === 'date' ? (
                <input
                  type={field.type}
                  name={field.name}
                  value={(data[field.name] as string) || ''}
                  onChange={(e) => updateValue(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  disabled={field.disabled}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                    errors[field.name] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } ${field.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              ) : field.type === 'number' ? (
                <input
                  type="number"
                  name={field.name}
                  value={(data[field.name] as number) || ''}
                  onChange={(e) => updateValue(field.name, e.target.value ? parseFloat(e.target.value) : '')}
                  placeholder={field.placeholder}
                  disabled={field.disabled}
                  min={field.validation?.min}
                  max={field.validation?.max}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                    errors[field.name] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } ${field.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              ) : field.type === 'textarea' ? (
                <textarea
                  name={field.name}
                  value={(data[field.name] as string) || ''}
                  onChange={(e) => updateValue(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  disabled={field.disabled}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none ${
                    errors[field.name] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } ${field.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              ) : field.type === 'richtext' ? (
                <RichTextEditor
                  content={(data[field.name] as string) || ''}
                  onChange={(html) => updateValue(field.name, html)}
                  placeholder={field.placeholder}
                  disabled={field.disabled}
                  minHeight={120}
                />
              ) : field.type === 'select' ? (
                <select
                  name={field.name}
                  value={(data[field.name] as string) || ''}
                  onChange={(e) => updateValue(field.name, e.target.value)}
                  disabled={field.disabled}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                    errors[field.name] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } ${field.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value="">请选择...</option>
                  {field.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : field.type === 'checkbox' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name={field.name}
                    checked={(data[field.name] as boolean) || false}
                    onChange={(e) => updateValue(field.name, e.target.checked)}
                    disabled={field.disabled}
                    className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {field.placeholder || '勾选此项'}
                  </span>
                </label>
              ) : field.type === 'radio' ? (
                <div className="space-y-2">
                  {field.options?.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={field.name}
                        value={opt.value}
                        checked={data[field.name] === opt.value}
                        onChange={(e) => updateValue(field.name, e.target.value)}
                        disabled={field.disabled}
                        className="w-4 h-4 text-blue-500 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
                    </label>
                  ))}
                </div>
              ) : null}
              
              {/* 帮助文本 */}
              {field.helpText && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
              )}
              
              {/* 错误信息 */}
              {errors[field.name] && (
                <p className="mt-1 text-sm text-red-500">{errors[field.name]}</p>
              )}
            </div>
          ))}
        
        {/* 提交按钮 */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            {config.submitText || '提交'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {config.resetText || '重置'}
          </button>
        </div>
      </form>
    </div>
  );
});

/**
 * 创建默认表单配置
 */
export function createDefaultFormConfig(): FormConfig {
  return {
    id: `form-${Date.now()}`,
    title: '新表单',
    fields: [],
    submitText: '提交',
    resetText: '重置',
  };
}

export default FormBuilder;