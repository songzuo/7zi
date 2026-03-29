/**
 * 客户端翻译示例组件
 */

'use client';

import { useTranslation } from 'react-i18next';
import { useState } from 'react';

export default function ClientTranslationExample() {
  const { t, i18n } = useTranslation('common');
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        ⚡ 客户端翻译示例
      </h2>
      
      <div className="space-y-4">
        {/* 当前语言显示 */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">当前语言:</p>
          <p className="text-lg font-bold text-blue-600">
            {i18n.language === 'zh' ? '中文' : 'English'} ({i18n.language})
          </p>
        </div>

        {/* 输入框示例 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('search')}
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('search')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 按钮示例 */}
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            {t('save')}
          </button>
          <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
            {t('cancel')}
          </button>
          <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
            {t('delete')}
          </button>
        </div>

        {/* 状态显示 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 bg-green-50 rounded text-center">
            <p className="text-xs text-gray-600">{t('success')}</p>
            <p className="font-bold text-green-600">✓</p>
          </div>
          <div className="p-2 bg-red-50 rounded text-center">
            <p className="text-xs text-gray-600">{t('error')}</p>
            <p className="font-bold text-red-600">✗</p>
          </div>
          <div className="p-2 bg-yellow-50 rounded text-center">
            <p className="text-xs text-gray-600">{t('loading')}</p>
            <p className="font-bold text-yellow-600">⋯</p>
          </div>
        </div>
      </div>
    </div>
  );
}
