'use client';

import { useEffect, useState } from 'react';

interface ServiceWorkerEventMap {
  'sw-updated': { version: string };
  'sw-error': { error: string };
}

/**
 * Service Worker 注册组件
 *
 * 功能:
 * - 注册 Service Worker
 * - 检测更新并提示用户
 * - 处理离线/在线状态
 * - 提供缓存清理功能
 */
export function ServiceWorkerRegistration() {
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [swVersion, setSwVersion] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Check online status
    setIsOnline(navigator.onLine);

    // Network status listeners
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register Service Worker
    registerServiceWorker();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      // Wait for the page to load
      if (document.readyState === 'loading') {
        await new Promise<void>((resolve) => {
          document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
        });
      }

      // Unregister any old service workers
      await unregisterOldServiceWorkers();

      // Register new service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      setSwRegistration(registration);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is waiting
            setUpdateAvailable(true);

            // Dispatch custom event for other components
            getSWVersion(registration).then((version) => {
              window.dispatchEvent(
                new CustomEvent('sw-updated', {
                  detail: { version },
                })
              );
            });
          }
        });
      });

      // Get current SW version
      const version = await getSWVersion(registration);
      setSwVersion(version);

      // Periodically check for updates
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // Check every hour

    } catch (error) {
      console.error('[SW] Service Worker registration failed:', error);
      window.dispatchEvent(
        new CustomEvent('sw-error', {
          detail: { error: (error as Error).message },
        })
      );
    }
  };

  const unregisterOldServiceWorkers = async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();

      for (const registration of registrations) {
        const scriptURL = new URL(registration.active?.scriptURL || '');

        // Unregister if it's not our current SW
        if (!scriptURL.pathname.endsWith('/sw.js')) {
          await registration.unregister();
        }
      }
    } catch (error) {
      console.error('[SW] Failed to unregister old service workers:', error);
    }
  };

  const getSWVersion = async (registration: ServiceWorkerRegistration): Promise<string> => {
    try {
      // Send message to SW to get version
      if (registration.active) {
        const messageChannel = new MessageChannel();
        const versionPromise = new Promise<string>((resolve) => {
          messageChannel.port1.onmessage = (event) => {
            resolve(event.data.version);
          };
        });

        registration.active.postMessage(
          { type: 'GET_VERSION' },
          [messageChannel.port2]
        );

        return versionPromise;
      }
    } catch (error) {
      console.error('[SW] Failed to get SW version:', error);
    }
    return 'unknown';
  };

  const handleUpdate = async () => {
    if (!swRegistration || !swRegistration.waiting) {
      window.location.reload();
      return;
    }

    // Tell the waiting service worker to activate
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Wait for the new service worker to become active
    swRegistration.waiting.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  };

  const clearCache = async () => {
    if (!swRegistration) return;

    try {
      // Send message to SW to clear cache
      if (swRegistration.active) {
        swRegistration.active.postMessage({ type: 'CLEAR_CACHE' });
      }

      // Also clear from main thread
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));

      window.location.reload();
    } catch (error) {
      console.error('[SW] Failed to clear cache:', error);
    }
  };

  // Expose functions to window for manual control
  useEffect(() => {
    (window as any).__SW_CONTROL = { // Global debug variable
      update: handleUpdate,
      clearCache,
      getVersion: () => swVersion,
      isOnline,
      hasUpdate: updateAvailable,
    };
  }, [handleUpdate, clearCache, swVersion, isOnline, updateAvailable]);

  return (
    <>
      {/* Update Available Banner */}
      {updateAvailable && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-cyan-600 text-white px-4 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm font-medium">
                新版本可用！刷新页面获取最新功能。
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleUpdate}
                className="px-3 py-1.5 text-xs font-medium text-cyan-600 bg-white hover:bg-cyan-50 rounded-md transition-colors"
              >
                立即更新
              </button>
              <button
                onClick={() => setUpdateAvailable(false)}
                className="text-white hover:text-cyan-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Online/Offline Indicator (small) */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-xs">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span>离线模式</span>
        </div>
      )}

      {/* Debug info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg text-xs opacity-75 hover:opacity-100 transition-opacity">
          <div>SW Version: {swVersion || 'unknown'}</div>
          <div>Status: {isOnline ? '🟢 在线' : '🔴 离线'}</div>
          <div>Update Available: {updateAvailable ? '是' : '否'}</div>
        </div>
      )}
    </>
  );
}
