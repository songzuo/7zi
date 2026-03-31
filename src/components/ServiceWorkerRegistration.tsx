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
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [swVersion, setSwVersion] = useState<string | null>(null);

  // Register Service Worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

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
    (async () => {
      try {
        // Wait for the page to load
        if (document.readyState === 'loading') {
          await new Promise<void>((resolve) => {
            document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
          });
        }

        // Unregister any old service workers
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          const scriptURL = new URL(registration.active?.scriptURL || '');
          if (!scriptURL.pathname.endsWith('/sw.js')) {
            await registration.unregister();
          }
        }

        // Register new service worker
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        setSwRegistration(registration);

        // Get current SW version
        const getSWVersion = async (reg: ServiceWorkerRegistration): Promise<string> => {
          try {
            if (reg.active) {
              const messageChannel = new MessageChannel();
              const versionPromise = new Promise<string>((resolve) => {
                messageChannel.port1.onmessage = (event) => {
                  if (event.data.type === 'VERSION') {
                    resolve(event.data.version);
                  }
                };
              });

              reg.active.postMessage(
                { type: 'GET_VERSION' },
                [messageChannel.port2]
              );

              return versionPromise;
            }
          } catch (_error) {
            if (process.env.NODE_ENV === 'development') {
              console.error('[SW] Failed to get SW version:', error);
            }
          }
          return 'unknown';
        };

        const version = await getSWVersion(registration);
        setSwVersion(version);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is waiting
              setUpdateAvailable(true);

              // Dispatch custom event for other components
              getSWVersion(registration).then((v) => {
                window.dispatchEvent(
                  new CustomEvent('sw-updated', {
                    detail: { version: v },
                  })
                );
              }).catch(() => {
                // Silently ignore version fetch errors
              });
            }
          });
        });

        // Periodically check for updates
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour

      } catch (_error) {
        console.error('[SW] Service Worker registration failed:', error);
        window.dispatchEvent(
          new CustomEvent('sw-error', {
            detail: { error: (error as Error).message },
          })
        );
      }
    })();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
    } catch (_error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[SW] Failed to clear cache:', error);
      }
    }
  };

  // Expose functions to window for manual control
  useEffect(() => {
    interface WindowWithSWControl extends Window {
      __SW_CONTROL?: {
        update: () => void;
        clearCache: () => void;
        getVersion: () => string | null;
        isOnline: boolean;
        hasUpdate: boolean;
      };
    }

    const win = window as WindowWithSWControl;
    win.__SW_CONTROL = {
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
                className="px-4 py-2 bg-white text-cyan-600 rounded-lg font-medium hover:bg-cyan-50 transition-colors"
              >
                刷新
              </button>
              <button
                onClick={() => setUpdateAvailable(false)}
                className="p-2 hover:bg-cyan-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50 bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="text-sm font-medium">
              您目前处于离线状态。部分功能可能不可用。
            </span>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Register the service worker registration component
 */
export function registerServiceWorker() {
  // The registration is done automatically by the ServiceWorkerRegistration component
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    // Component handles registration
  }
}

/**
 * Get service worker registration
 */
export function getServiceWorkerRegistration(): ServiceWorkerRegistration | null {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    const win = window as WindowWithSWControl;
    return win.__SW_CONTROL || null;
  }
  return null;
}

interface WindowWithSWControl extends Window {
  __SW_CONTROL?: {
    update: () => void;
    clearCache: () => void;
    getVersion: () => string | null;
    isOnline: boolean;
    hasUpdate: boolean;
  };
}
