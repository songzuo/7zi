/**
 * 数据导入向导组件
 * 支持多步骤导入流程：上传文件 -> 预览数据 -> 字段映射 -> 确认导入 -> 结果展示
 * @module components/ImportWizard
 */

'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useImport, type ImportOptions, type ImportPreview, type ImportResult } from '../hooks/useImport';
import { TaskPriority, TaskStatus, DEFAULT_TAGS, type TaskTag } from '../lib/tasks/types';

// 步骤定义
type Step = 'upload' | 'preview' | 'mapping' | 'importing' | 'result';

// 可映射的系统字段
const SYSTEM_FIELDS = [
  { key: 'title', label: '任务标题', required: true },
  { key: 'description', label: '任务描述', required: false },
  { key: 'priority', label: '优先级', required: false },
  { key: 'status', label: '状态', required: false },
  { key: 'tags', label: '标签', required: false },
  { key: 'assignee', label: '负责人', required: false },
  { key: 'dueDate', label: '截止日期', required: false },
];

// 图标组件
const Icons = {
  Upload: () => (
    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  ),
  File: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  ArrowRight: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  Download: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  Loading: () => (
    <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  Alert: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

// 步骤指示器组件
function StepIndicator({ currentStep, steps }: { currentStep: Step; steps: Step[] }) {
  const stepLabels: Record<Step, string> = {
    upload: '上传文件',
    preview: '预览数据',
    mapping: '字段映射',
    importing: '导入中',
    result: '完成',
  };

  const stepIndex = steps.indexOf(currentStep);

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                index < stepIndex
                  ? 'bg-green-500 text-white'
                  : index === stepIndex
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              {index < stepIndex ? <Icons.Check /> : index + 1}
            </div>
            <span
              className={`ml-2 text-sm ${
                index <= stepIndex ? 'text-gray-900 dark:text-white' : 'text-gray-400'
              }`}
            >
              {stepLabels[step]}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-12 h-0.5 mx-2 ${
                index < stepIndex ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// 文件上传组件
function FileUploadStep({
  onFileSelect,
  onDownloadTemplate,
  loading,
}: {
  onFileSelect: (file: File) => void;
  onDownloadTemplate: (format: 'csv' | 'json') => void;
  loading: boolean;
}) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.name.endsWith('.csv') || file.name.endsWith('.json')) {
          onFileSelect(file);
        }
      }
    },
    [onFileSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  return (
    <div className="space-y-6">
      {/* 拖拽上传区域 */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <Icons.Upload />
          </div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
            拖拽文件到此处或点击上传
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            支持 CSV 和 JSON 格式，最大 10MB
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {loading ? '处理中...' : '选择文件'}
          </button>
        </div>
      </div>

      {/* 模板下载 */}
      <div className="flex items-center justify-center gap-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">下载模板：</span>
        <button
          onClick={() => onDownloadTemplate('csv')}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <Icons.Download />
          CSV 模板
        </button>
        <button
          onClick={() => onDownloadTemplate('json')}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <Icons.Download />
          JSON 模板
        </button>
      </div>
    </div>
  );
}

// 数据预览组件
function PreviewStep({
  preview,
  file,
  onBack,
  onContinue,
}: {
  preview: ImportPreview;
  file: File;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* 文件信息 */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="text-gray-400">
          <Icons.File />
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {preview.format.toUpperCase()} 格式 · {preview.totalRows} 行数据
          </p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-sm ${
            preview.validRows === preview.totalRows
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}
        >
          {preview.validRows}/{preview.totalRows} 有效
        </div>
      </div>

      {/* 错误信息 */}
      {preview.errors.length > 0 && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="text-yellow-500 mt-0.5">
              <Icons.Alert />
            </div>
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                发现 {preview.errors.length} 个警告
              </p>
              <ul className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                {preview.errors.slice(0, 5).map((error, i) => (
                  <li key={i}>
                    行 {error.row}: {error.message}
                  </li>
                ))}
                {preview.errors.length > 5 && (
                  <li>...还有 {preview.errors.length - 5} 个</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 数据表格预览 */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-gray-500 dark:text-gray-400 font-medium">
                  #
                </th>
                {preview.headers.map((header) => (
                  <th
                    key={header}
                    className="px-4 py-2 text-left text-gray-500 dark:text-gray-400 font-medium"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {preview.rows.slice(0, 10).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                  {preview.headers.map((header) => (
                    <td
                      key={header}
                      className="px-4 py-2 text-gray-900 dark:text-white truncate max-w-[200px]"
                    >
                      {row[header] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {preview.rows.length > 10 && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 text-center">
            显示前 10 行，共 {preview.rows.length} 行
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Icons.ArrowLeft />
          返回
        </button>
        <button
          onClick={onContinue}
          className="flex items-center gap-1 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          配置字段映射
          <Icons.ArrowRight />
        </button>
      </div>
    </div>
  );
}

// 字段映射组件
function MappingStep({
  preview,
  onBack,
  onImport,
  loading,
}: {
  preview: ImportPreview;
  onBack: () => void;
  onImport: (options: ImportOptions) => void;
  loading: boolean;
}) {
  // 字段映射状态
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    // 自动匹配字段
    const autoMappings: Record<string, string> = {};
    preview.headers.forEach((header) => {
      const lowerHeader = header.toLowerCase();
      // 尝试自动匹配
      if (lowerHeader.includes('title') || lowerHeader.includes('名称') || lowerHeader === 'name') {
        autoMappings[header] = 'title';
      } else if (lowerHeader.includes('desc') || lowerHeader.includes('描述') || lowerHeader === 'description') {
        autoMappings[header] = 'description';
      } else if (lowerHeader.includes('priority') || lowerHeader.includes('优先级')) {
        autoMappings[header] = 'priority';
      } else if (lowerHeader.includes('status') || lowerHeader.includes('状态')) {
        autoMappings[header] = 'status';
      } else if (lowerHeader.includes('tag') || lowerHeader.includes('标签')) {
        autoMappings[header] = 'tags';
      } else if (lowerHeader.includes('assignee') || lowerHeader.includes('负责人') || lowerHeader.includes('执行人')) {
        autoMappings[header] = 'assignee';
      } else if (lowerHeader.includes('due') || lowerHeader.includes('截止') || lowerHeader.includes('到期')) {
        autoMappings[header] = 'dueDate';
      }
    });
    return autoMappings;
  });

  // 导入选项
  const [options, setOptions] = useState({
    skipErrors: true,
    defaultPriority: 'medium' as TaskPriority,
    defaultStatus: 'todo' as TaskStatus,
  });

  const handleMappingChange = (sourceField: string, targetField: string) => {
    setMappings((prev) => ({
      ...prev,
      [sourceField]: targetField,
    }));
  };

  const hasTitleMapping = Object.values(mappings).includes('title');

  const handleImport = () => {
    const importOptions: ImportOptions = {
      skipErrors: options.skipErrors,
      defaultPriority: options.defaultPriority,
      defaultStatus: options.defaultStatus,
    };
    onImport(importOptions);
  };

  return (
    <div className="space-y-6">
      {/* 字段映射表格 */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">字段映射</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          将文件中的字段映射到系统字段
        </p>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-gray-500 dark:text-gray-400 font-medium">
                  源字段
                </th>
                <th className="px-4 py-2 text-left text-gray-500 dark:text-gray-400 font-medium">
                  系统字段
                </th>
                <th className="px-4 py-2 text-left text-gray-500 dark:text-gray-400 font-medium">
                  示例值
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {preview.headers.map((header) => (
                <tr key={header} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-2 text-gray-900 dark:text-white font-medium">{header}</td>
                  <td className="px-4 py-2">
                    <select
                      value={mappings[header] || ''}
                      onChange={(e) => handleMappingChange(header, e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">-- 不映射 --</option>
                      {SYSTEM_FIELDS.map((field) => (
                        <option key={field.key} value={field.key}>
                          {field.label} {field.required ? '*' : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                    {preview.rows[0]?.[header] || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!hasTitleMapping && (
          <div className="mt-2 text-sm text-red-500 flex items-center gap-1">
            <Icons.Alert />
            必须映射标题字段
          </div>
        )}
      </div>

      {/* 导入选项 */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">导入选项</h3>
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {/* 跳过错误 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={options.skipErrors}
              onChange={(e) => setOptions((prev) => ({ ...prev, skipErrors: e.target.checked }))}
              className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
            />
            <span className="text-gray-700 dark:text-gray-200">跳过错误行继续导入</span>
          </label>

          {/* 默认优先级 */}
          <div className="flex items-center gap-3">
            <label className="text-gray-700 dark:text-gray-200 w-24">默认优先级</label>
            <select
              value={options.defaultPriority}
              onChange={(e) =>
                setOptions((prev) => ({ ...prev, defaultPriority: e.target.value as TaskPriority }))
              }
              className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>

          {/* 默认状态 */}
          <div className="flex items-center gap-3">
            <label className="text-gray-700 dark:text-gray-200 w-24">默认状态</label>
            <select
              value={options.defaultStatus}
              onChange={(e) =>
                setOptions((prev) => ({ ...prev, defaultStatus: e.target.value as TaskStatus }))
              }
              className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="todo">待办</option>
              <option value="in_progress">进行中</option>
              <option value="review">评审中</option>
              <option value="done">已完成</option>
            </select>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Icons.ArrowLeft />
          返回
        </button>
        <button
          onClick={handleImport}
          disabled={loading || !hasTitleMapping}
          className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Icons.Loading />
              导入中...
            </>
          ) : (
            <>
              开始导入
              <Icons.ArrowRight />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// 导入中组件
function ImportingStep() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Icons.Loading />
      <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">正在导入数据...</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">请稍候，不要关闭此页面</p>
    </div>
  );
}

// 结果组件
function ResultStep({
  result,
  onReset,
}: {
  result: ImportResult;
  onReset: () => void;
}) {
  const isSuccess = result.success && result.imported > 0;

  return (
    <div className="space-y-6">
      {/* 结果图标 */}
      <div className="flex flex-col items-center py-8">
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center ${
            isSuccess ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
          }`}
        >
          {isSuccess ? (
            <div className="text-green-500">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="text-red-500">
              <Icons.X />
            </div>
          )}
        </div>
        <h3 className="mt-4 text-xl font-medium text-gray-900 dark:text-white">
          {isSuccess ? '导入成功' : '导入失败'}
        </h3>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          {isSuccess
            ? `成功导入 ${result.imported} 条任务`
            : result.errors[0]?.message || '请检查文件格式后重试'}
        </p>
      </div>

      {/* 详细结果 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.imported}</p>
          <p className="text-sm text-green-700 dark:text-green-300">成功导入</p>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{result.failed}</p>
          <p className="text-sm text-red-700 dark:text-red-300">失败</p>
        </div>
      </div>

      {/* 错误详情 */}
      {result.errors.length > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">错误详情</h4>
          <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
            {result.errors.slice(0, 10).map((error, i) => (
              <li key={i}>
                行 {error.row}: {error.message}
                {error.field && ` (${error.field})`}
              </li>
            ))}
            {result.errors.length > 10 && (
              <li>...还有 {result.errors.length - 10} 个错误</li>
            )}
          </ul>
        </div>
      )}

      {/* 导入的任务列表 */}
      {result.tasks && result.tasks.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 font-medium text-gray-700 dark:text-gray-200">
            已导入任务
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-60 overflow-y-auto">
            {result.tasks.slice(0, 20).map((task) => (
              <li key={task.id} className="px-4 py-2 flex items-center justify-between">
                <span className="text-gray-900 dark:text-white">{task.title}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{task.status}</span>
              </li>
            ))}
            {result.tasks.length > 20 && (
              <li className="px-4 py-2 text-center text-sm text-gray-500 dark:text-gray-400">
                显示前 20 条，共 {result.tasks.length} 条
              </li>
            )}
          </ul>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-center pt-4">
        <button
          onClick={onReset}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          再次导入
        </button>
      </div>
    </div>
  );
}

// 主组件
export default function ImportWizard({
  isOpen,
  onClose,
  onImportComplete,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (result: ImportResult) => void;
}) {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const {
    loading,
    error,
    preview,
    result,
    file,
    parseFile,
    importData,
    downloadTemplate,
    reset,
  } = useImport();

  const steps: Step[] = ['upload', 'preview', 'mapping', 'importing', 'result'];

  // 处理文件选择
  const handleFileSelect = useCallback(
    async (file: File) => {
      const previewData = await parseFile(file);
      if (previewData) {
        setCurrentStep('preview');
      }
    },
    [parseFile]
  );

  // 返回上一步
  const handleBack = useCallback(() => {
    const stepIndex = steps.indexOf(currentStep);
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1]);
    }
  }, [currentStep]);

  // 执行导入
  const handleImport = useCallback(
    async (options: ImportOptions) => {
      setCurrentStep('importing');
      const importResult = await importData(options);
      if (importResult) {
        setCurrentStep('result');
        if (onImportComplete) {
          onImportComplete(importResult);
        }
      } else {
        setCurrentStep('mapping');
      }
    },
    [importData, onImportComplete]
  );

  // 重置向导
  const handleReset = useCallback(() => {
    reset();
    setCurrentStep('upload');
  }, [reset]);

  // 关闭弹窗
  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* 弹窗内容 */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-3xl">
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">数据导入向导</h2>
            <button
              onClick={handleClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <Icons.X />
            </button>
          </div>

          {/* 步骤指示器 */}
          <div className="px-6 pt-6">
            <StepIndicator currentStep={currentStep} steps={steps} />
          </div>

          {/* 内容区域 */}
          <div className="p-6">
            {/* 错误提示 */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {/* 步骤内容 */}
            {currentStep === 'upload' && (
              <FileUploadStep
                onFileSelect={handleFileSelect}
                onDownloadTemplate={downloadTemplate}
                loading={loading}
              />
            )}

            {currentStep === 'preview' && preview && file && (
              <PreviewStep
                preview={preview}
                file={file}
                onBack={handleBack}
                onContinue={() => setCurrentStep('mapping')}
              />
            )}

            {currentStep === 'mapping' && preview && (
              <MappingStep
                preview={preview}
                onBack={handleBack}
                onImport={handleImport}
                loading={loading}
              />
            )}

            {currentStep === 'importing' && <ImportingStep />}

            {currentStep === 'result' && result && (
              <ResultStep result={result} onReset={handleReset} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}