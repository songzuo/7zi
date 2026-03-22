'use client';

import { useState, useCallback, createContext, useContext, ReactNode } from 'react';

/**
 * Global loading state interface
 */
interface GlobalLoadingState {
  /** Current loading message */
  message: string | null;
  /** Loading progress (0-100) */
  progress: number;
  /** Is loading active */
  isLoading: boolean;
}

/**
 * Global loading context
 */
const GlobalLoadingContext = createContext<{
  state: GlobalLoadingState;
  startLoading: (message?: string) => void;
  updateProgress: (progress: number, message?: string) => void;
  stopLoading: () => void;
  withLoading: <T>(promise: Promise<T>, message?: string) => Promise<T>;
} | null>(null);

/**
 * Global Loading Provider component props
 */
interface GlobalLoadingProviderProps {
  /** Child components */
  children: ReactNode;
}

/**
 * Provider for global loading state
 */
export function GlobalLoadingProvider({ children }: GlobalLoadingProviderProps) {
  const [state, setState] = useState<GlobalLoadingState>({
    message: null,
    progress: 0,
    isLoading: false,
  });

  const startLoading = useCallback((message?: string) => {
    setState({
      message: message || 'Loading...',
      progress: 0,
      isLoading: true,
    });
  }, []);

  const updateProgress = useCallback((progress: number, message?: string) => {
    setState((prev) => ({
      message: message || prev.message,
      progress: Math.max(0, Math.min(100, progress)),
      isLoading: true,
    }));
  }, []);

  const stopLoading = useCallback(() => {
    setState({
      message: null,
      progress: 0,
      isLoading: false,
    });
  }, []);

  const withLoading = useCallback(async <T,>(
    promise: Promise<T>,
    message?: string
  ): Promise<T> => {
    try {
      startLoading(message);
      const result = await promise;
      return result;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  const contextValue = {
    state,
    startLoading,
    updateProgress,
    stopLoading,
    withLoading,
  };

  return (
    <GlobalLoadingContext.Provider value={contextValue}>
      {children}
    </GlobalLoadingContext.Provider>
  );
}

/**
 * Hook to access global loading state
 *
 * @example
 * const { state, startLoading, stopLoading, withLoading } = useGlobalLoading();
 *
 * // Manual control
 * startLoading('Saving data...');
 * // ... do work ...
 * stopLoading();
 *
 * // Automatic with promise
 * await withLoading(fetchData(), 'Fetching data...');
 */
export function useGlobalLoading() {
  const context = useContext(GlobalLoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading must be used within GlobalLoadingProvider');
  }
  return context;
}

/**
 * Hook for creating scoped loading states
 * Useful for components that want isolated loading states
 *
 * @example
 * const { state, startLoading, stopLoading, withLoading } = useScopedLoading();
 */
export function useScopedLoading() {
  const [state, setState] = useState<GlobalLoadingState>({
    message: null,
    progress: 0,
    isLoading: false,
  });

  const startLoading = useCallback((message?: string) => {
    setState({
      message: message || 'Loading...',
      progress: 0,
      isLoading: true,
    });
  }, []);

  const updateProgress = useCallback((progress: number, message?: string) => {
    setState((prev) => ({
      message: message || prev.message,
      progress: Math.max(0, Math.min(100, progress)),
      isLoading: true,
    }));
  }, []);

  const stopLoading = useCallback(() => {
    setState({
      message: null,
      progress: 0,
      isLoading: false,
    });
  }, []);

  const withLoading = useCallback(async <T,>(
    promise: Promise<T>,
    message?: string
  ): Promise<T> => {
    try {
      startLoading(message);
      const result = await promise;
      return result;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  return {
    state,
    startLoading,
    updateProgress,
    stopLoading,
    withLoading,
  };
}
