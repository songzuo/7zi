'use client';

import { useEffect } from 'react';

/**
 * Service Worker 注册组件
 * @description 暂时禁用以解决缓存导致的空白页问题
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // 暂时禁用 Service Worker
    // 等待缓存问题解决后再启用
    
    // 清除所有 Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
    }
    
    // 清除所有缓存
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName);
        });
      });
    }
  }, []);

  return null;
}
