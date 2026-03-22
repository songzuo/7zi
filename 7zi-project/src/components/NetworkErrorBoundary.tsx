'use client';

import { useState, useCallback } from 'react';
import { ErrorDisplay } from './ErrorDisplay';

interface NetworkErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => Promise<void> | void;
  /** 网络检测 URL */
  pingUrl?: string;
  /** 自动检测网络状态 */
  autoDetect?: boolean;
  /** 检测间隔（毫秒） */
  detectInterval?: number;
}

interface NetworkStatus {
  isOnline: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
}

/**
 * 网络错误边界组件
 * 专门处理网络相关的错误，提供网络状态检测和重连功能
 */
export function NetworkErrorBoundary({
  children,
  onRetry,
  pingUrl = '/api/health',
}: NetworkErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isChecking: false,
    lastChecked: null,
  });

  const checkNetwork = useCallback(async () => {
    setStatus((prev) => ({ ...prev, isChecking: true }));
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(pingUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const isOnline = response.ok;
      setStatus({
        isOnline,
        isChecking: false,
        lastChecked: new Date(),
      });
      
      if (isOnline && hasError) {
        setHasError(false);
        await onRetry?.();
      }
      
      return isOnline;
    } catch {
      setStatus({
        isOnline: false,
        isChecking: false,
        lastChecked: new Date(),
      });
      return false;
    }
  }, [pingUrl, hasError, onRetry]);

  const handleRetry = useCallback(async () => {
    const isOnline = await checkNetwork();
    if (isOnline) {
      setHasError(false);
    }
  }, [checkNetwork]);

  // 监听网络状态变化
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      setStatus((prev) => ({ ...prev, isOnline: true }));
    });
    
    window.addEventListener('offline', () => {
      setStatus((prev) => ({ ...prev, isOnline: false }));
      setHasError(true);
    });
  }

  if (hasError || !status.isOnline) {
    return (
      <ErrorDisplay
        title="网络连接失败"
        message={status.isChecking ? '正在检测网络连接...' : '请检查您的网络设置后重试'}
        errorType="network"
        showReset
        onReset={handleRetry}
        showHomeButton
        showRefreshButton
      />
    );
  }

  return <>{children}</>;
}

export default NetworkErrorBoundary;