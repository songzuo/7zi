/**
 * 表单编辑器测试页面
 */

'use client';

import React, { useState, useCallback } from 'react';
import { 
  FormBuilder, 
  FormPreview, 
  createDefaultFormConfig,
  type FormConfig,
  type FormData,
} from '@/components';

export default function FormBuilderPage() {
  const [config, setConfig] = useState<FormConfig>(() => {
    // 初始化一个带示例字段的表单
    const defaultConfig = createDefaultFormConfig();
    defaultConfig.title = '用户注册表单';
    defaultConfig.description = '<p>请填写以下信息完成注册</p>';
    defaultConfig.fields = [
      {
        id: 'field-1',
        name: 'username',
        label: '用户名',
        type: 'text',
        placeholder: '请输入用户名',
        required: true,
        validation: { minLength: 3, maxLength: 20 },
        helpText: '3-20个字符',
        order: 0,
      },
      {
        id: 'field-2',
        name: 'email',
        label: '邮箱地址',
        type: 'email',
        placeholder: 'example@email.com',
        required: true,
        order: 1,
      },
      {
        id: 'field-3',
        name: 'password',
        label: '密码',
        type: 'password',
        placeholder: '请输入密码',
        required: true,
        validation: { minLength: 8 },
        helpText: '至少8个字符',
        order: 2,
      },
      {
        id: 'field-4',
        name: 'bio',
        label: '个人简介',
        type: 'richtext',
        placeholder: '介绍一下自己...',
        validation: { maxLength: 500 },
        order: 3,
      },
      {
        id: 'field-5',
        name: 'role',
        label: '选择角色',
        type: 'select',
        required: true,
        options: [
          { value: 'developer', label: '开发者' },
          { value: 'designer', label: '设计师' },
          { value: 'manager', label: '产品经理' },
          { value: 'other', label: '其他' },
        ],
        order: 4,
      },
      {
        id: 'field-6',
        name: 'experience',
        label: '工作经验',
        type: 'radio',
        options: [
          { value: 'junior', label: '1-3年' },
          { value: 'mid', label: '3-5年' },
          { value: 'senior', label: '5年以上' },
        ],
        order: 5,
      },
      {
        id: 'field-7',
        name: 'agree',
        label: '同意条款',
        type: 'checkbox',
        placeholder: '我已阅读并同意服务条款',
        required: true,
        order: 6,
      },
    ];
    return defaultConfig;
  });
  
  const [showPreview, setShowPreview] = useState(false);
  const [submittedData, setSubmittedData] = useState<FormData | null>(null);

  const handleSubmit = useCallback((data: FormData) => {
    setSubmittedData(data);
    alert('表单提交成功！\n\n' + JSON.stringify(data, null, 2));
  }, []);

  const handleExport = useCallback(() => {
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `form-${config.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [config]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        setConfig(imported);
      } catch (err) {
        alert('导入失败：无效的 JSON 格式');
      }
    };
    reader.readAsText(file);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 头部 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                表单编辑器
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                可视化构建动态表单，支持富文本编辑
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                📥 导入
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                📤 导出
              </button>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  showPreview 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {showPreview ? '✏️ 编辑模式' : '👁️ 预览模式'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 编辑器 */}
          <div>
            <FormBuilder
              config={config}
              onChange={setConfig}
              previewMode={showPreview}
            />
          </div>

          {/* 预览和数据 */}
          <div className="space-y-6">
            {/* 实时预览 */}
            {showPreview && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  表单预览
                </h3>
                <FormPreview 
                  config={config} 
                  onSubmit={handleSubmit}
                />
              </div>
            )}

            {/* 提交的数据 */}
            {submittedData && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  提交的数据
                </h3>
                <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm text-gray-700 dark:text-gray-300">
                  {JSON.stringify(submittedData, null, 2)}
                </pre>
              </div>
            )}

            {/* JSON 配置 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                表单配置 (JSON)
              </h3>
              <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-xs text-gray-700 dark:text-gray-300 max-h-96">
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}