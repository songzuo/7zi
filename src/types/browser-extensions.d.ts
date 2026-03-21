/**
 * Browser Extension Type Definitions
 *
 * TypeScript definitions for non-standard browser APIs and extensions
 */

// ============================================================================
// Window Extensions
// ============================================================================

/**
 * WebKit Audio Context (Safari non-standard API)
 */
interface WindowWithWebKitAudioContext extends Window {
  webkitAudioContext: typeof AudioContext;
}

/**
 * iOS Safari standalone mode (non-standard API)
 */
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

/**
 * Window with debug variables for development
 */
interface WindowWithDebugVars extends Window {
  __THEME__?: {
    stored: 'light' | 'dark' | 'system';
    effective: 'light' | 'dark';
  };
  __SW_CONTROL?: {
    update: () => void;
    clearCache: () => void;
    getVersion: () => string | null;
    isOnline: boolean;
    hasUpdate: boolean;
  };
}

// ============================================================================
// Navigator Extensions (Network Information API)
// ============================================================================

/**
 * Network Information API (experimental)
 * https://wicg.github.io/netinfo/
 */
interface NetworkConnection extends EventTarget {
  /** Effective connection type */
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';

  /** Estimated downlink bandwidth in Mbps */
  downlink: number;

  /** Estimated round-trip time in milliseconds */
  rtt: number;

  /** Data saving mode enabled */
  saveData: boolean;

  /** Connection change event */
  addEventListener(type: 'change', listener: () => void, options?: AddEventListenerOptions): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkConnection;
}

// ============================================================================
// Type Guards and Helpers
// ============================================================================

/**
 * Check if window has webkitAudioContext
 */
export function hasWebKitAudioContext(win: Window): win is WindowWithWebKitAudioContext {
  return 'webkitAudioContext' in win;
}

/**
 * Check if navigator has standalone property (iOS Safari)
 */
export function hasNavigatorStandalone(nav: Navigator): nav is NavigatorWithStandalone {
  return 'standalone' in nav;
}

/**
 * Check if navigator has connection API
 */
export function hasNavigatorConnection(nav: Navigator): nav is NavigatorWithConnection {
  return 'connection' in nav;
}

/**
 * Get AudioContext with WebKit fallback
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  const win = window as Window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextClass = win.AudioContext || win.webkitAudioContext;

  return AudioContextClass ? new AudioContextClass() : null;
}
