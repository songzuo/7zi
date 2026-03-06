'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/error-reporter';

/**
 * 全局错误边界
 * 
 * 捕获整个应用的根级别错误
 * 注意：此文件必须包含 html 和 body 标签，因为它会替换整个根布局
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, 'react-error', {
      digest: error.digest,
      route: 'global',
    });
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="text-center max-w-lg w-full">
            {/* 错误图标 */}
            <div 
              className="text-8xl mb-6"
              aria-hidden="true"
            >
              💥
            </div>
            
            {/* 错误标题 */}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              应用发生错误
            </h1>
            
            {/* 错误描述 */}
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              很抱歉，应用程序遇到了一个严重错误。请尝试刷新页面或返回首页。
            </p>

            {/* 错误摘要 */}
            {error.digest && (
              <p className="text-sm text-gray-400 dark:text-gray-600 mb-4 font-mono">
                错误ID: {error.digest}
              </p>
            )}
            
            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={reset}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                  focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800
                  transition-colors font-medium flex items-center gap-2"
              >
                <span>🔄</span>
                <span>重试</span>
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="px-8 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 
                  rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 
                  focus:outline-none focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600
                  transition-colors font-medium flex items-center gap-2"
              >
                <span>🏠</span>
                <span>返回首页</span>
              </button>
            </div>

            {/* 联系支持 */}
            <p className="mt-8 text-sm text-gray-500 dark:text-gray-500">
              如果问题持续存在，请联系{' '}
              <a 
                href="mailto:support@7zi.com" 
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                技术支持
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}