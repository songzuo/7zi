'use client';

import { useEffect } from 'react';
import { setupGlobalErrorHandler } from '@/lib/error-reporter';

/**
 * 全局错误处理器提供者
 * 
 * 在应用初始化时设置全局错误捕获
 */
export function GlobalErrorHandler({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  useEffect(() => {
    // 设置全局错误处理器
    setupGlobalErrorHandler();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[GlobalErrorHandler] 全局错误处理器已初始化');
    }
  }, []);

  return <>{children}</>;
}