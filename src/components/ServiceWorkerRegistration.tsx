'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Dispatch custom event for update available
                window.dispatchEvent(new CustomEvent('sw-update-available'));
              }
            });
          }
        });
      } catch (error) {
        // Silent error handling in production
        if (process.env.NODE_ENV === 'development') {
          console.error('[SW] Service Worker registration failed:', error);
        }
      }
    };

    // Wait for page to load before registering
    if (window.document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker);
    }
  }, []);

  return null;
}
