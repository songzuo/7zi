'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/error-reporter';

/**
 * Settings 路由错误边界
 */

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, 'react-error', {
      digest: error.digest,
      route: '/settings',
    });
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
      <div className="text-center max-w-lg w-full">
        {/* 错误图标 */}
        <div 
          className="text-7xl mb-6"
          aria-hidden="true"
        >
          ⚙️
        </div>
        
        {/* 错误标题 */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          设置页面加载失败
        </h2>
        
        {/* 错误描述 */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          无法加载设置页面。请稍后重试。
        </p>
        
        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
              focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800
              transition-colors font-medium flex items-center gap-2"
          >
            <span>🔄</span>
            <span>重试</span>
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2.5 border-2 border-gray-300 dark:border-gray-600 
              text-gray-700 dark:text-gray-200 rounded-lg 
              hover:bg-gray-100 dark:hover:bg-gray-800 
              focus:outline-none focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600
              transition-colors font-medium flex items-center gap-2"
          >
            <span>🏠</span>
            <span>返回首页</span>
          </button>
        </div>
      </div>
    </div>
  );
}