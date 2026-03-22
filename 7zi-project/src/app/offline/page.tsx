'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, WifiOff, Home } from 'lucide-react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className={`p-6 rounded-full ${isOnline ? 'bg-cyan-100 dark:bg-cyan-900/30' : 'bg-gray-200 dark:bg-gray-700'}`}>
            {isOnline ? (
              <RefreshCw className="w-16 h-16 text-cyan-600 dark:text-cyan-400 animate-spin" />
            ) : (
              <WifiOff className="w-16 h-16 text-gray-600 dark:text-gray-400" />
            )}
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isOnline ? '正在重新连接...' : '您离线了'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isOnline
              ? '请稍等，我们正在努力恢复连接'
              : '请检查您的网络连接，稍后再试'}
          </p>
        </div>

        {/* Cached Content Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            离线可用功能
          </h2>
          <ul className="text-left text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>✓ 浏览已缓存的项目和代理信息</li>
            <li>✓ 查看之前加载的页面内容</li>
            <li>✓ 基本的页面导航</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleRetry}
            disabled={isOnline}
            className="w-full px-4 py-3 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            重新加载页面
          </button>

          <Link
            href="/"
            className="w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600"
          >
            <Home className="w-4 h-4" />
            返回首页
          </Link>
        </div>

        {/* Network Status */}
        <div className="text-xs text-gray-500 dark:text-gray-500">
          网络状态: {isOnline ? '🟢 在线' : '🔴 离线'}
        </div>
      </div>
    </div>
  );
}
