'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWA 安装提示组件
 *
 * 功能:
 * - 检测是否可以安装 PWA
 * - 显示安装提示横幅
 * - 记录用户选择
 * - 支持 iOS 手动安装引导
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      // For iOS - check if running in standalone mode
      interface NavigatorWithStandalone extends Navigator {
        standalone?: boolean;
      }

      const nav = navigator as NavigatorWithStandalone;
      const isIOSStandalone = nav.standalone === true; // iOS Safari non-standard API

      // For Android/Chrome - check if display mode is standalone
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

      return isIOSStandalone || isStandalone;
    };

    setIsInstalled(checkInstalled());

    if (isInstalled) {
      return; // Don't show prompt if already installed
    }

    // Check if iOS device
    const ua = window.navigator.userAgent;
    const isIPad = !!ua.match(/iPad/i);
    const isIPhone = !!ua.match(/iPhone/i);
    const isIOSDevice = isIPad || isIPhone;

    setIsIOS(isIOSDevice);

    // Check if user has dismissed the prompt
    const hasDismissed = localStorage.getItem('pwa-install-dismissed');
    const lastDismissed = localStorage.getItem('pwa-install-dismissed-time');

    // Show prompt again after 7 days
    if (hasDismissed && lastDismissed) {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (parseInt(lastDismissed) > sevenDaysAgo) {
        return;
      }
    }

    // For iOS, show prompt after 2 page views (simulate engagement)
    if (isIOSDevice) {
      const pageViews = parseInt(localStorage.getItem('pwa-page-views') || '0');
      localStorage.setItem('pwa-page-views', (pageViews + 1).toString());

      if (pageViews >= 2) {
        setShowPrompt(true);
      }
    }

    // For Android/Chrome, listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      localStorage.setItem('pwa-installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // For iOS devices, show installation guide
      if (isIOS) {
        setShowIOSGuide(true);
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        localStorage.setItem('pwa-installed', 'true');
      } else {
        localStorage.setItem('pwa-install-dismissed', 'true');
        localStorage.setItem('pwa-install-dismissed-time', Date.now().toString());
      }
    } catch (_err) {
      // Silently handle error in production
      if (process.env.NODE_ENV === 'development') {
        console.error('[PWA] Error prompting for install:', err);
      }
    } finally {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    localStorage.setItem('pwa-install-dismissed-time', Date.now().toString());
    setShowPrompt(false);
  };

  const handleInstallLater = () => {
    setShowPrompt(false);
  };

  if (isInstalled) {
    return null;
  }

  if (showIOSGuide) {
    return <IOSInstallGuide onClose={() => setShowIOSGuide(false)} />;
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
              <h3 className="text-sm font-semibold text-white">安装 7zi Studio 应用</h3>
            </div>
            <button
              onClick={handleDismiss}
              className="text-cyan-100 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          <div className="flex gap-3">
            {/* App Icon */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">7Z</span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {isIOS
                  ? '在 iOS 设备上，通过 Safari 的分享菜单添加到主屏幕。'
                  : '将我们的应用安装到您的设备上，获得更好的体验和离线访问功能。'}
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="mt-3 flex gap-2">
            <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>离线访问</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>更快的启动</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>原生体验</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
          >
            立即安装
          </button>
          <button
            onClick={handleInstallLater}
            className="flex-1 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            稍后再说
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * iOS 安装引导组件
 */
function IOSInstallGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl max-w-sm mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">
              在 iOS 上安装
            </h3>
            <button
              onClick={onClose}
              className="text-cyan-100 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <ol className="space-y-4">
            <li className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  点击底部的分享按钮
                </p>
                <div className="mt-1 flex justify-center">
                  <div className="bg-zinc-100 dark:bg-zinc-700 rounded-lg px-2 py-1">
                    <svg className="w-6 h-6 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </div>
                </div>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  向下滚动并点击&quot;添加到主屏幕&quot;
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  点击&quot;添加&quot;完成安装
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-cyan-600 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-900/20 rounded-lg transition-colors"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}
