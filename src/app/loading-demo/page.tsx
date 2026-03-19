/**
 * Loading Demo Page
 *
 * Demonstrates the usage of GlobalLoader, LoadingSpinner, and useGlobalLoading hook.
 */

'use client';

import React, { useState } from 'react';
import {
  LoadingSpinner,
  GlobalLoader,
} from '@/components';
import type { LoadingVariant, LoadingSize, LoadingColor } from '@/components/LoadingSpinner';
import {
  useGlobalLoading,
  useScopedLoading,
  GlobalLoadingProvider,
} from '@/hooks';
import { cn } from '@/lib/utils';

/**
 * Demo section component
 */
function DemoSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4 p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700', className)}>
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
      {children}
    </div>
  );
}

/**
 * Button component
 */
function Button({
  onClick,
  children,
  variant = 'primary',
  disabled = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  disabled?: boolean;
}) {
  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-4 py-2 rounded-lg font-medium transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant]
      )}
    >
      {children}
    </button>
  );
}

/**
 * Demo: Spinner variants
 */
function SpinnerVariantsDemo() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {['spin', 'pulse', 'bounce', 'dots', 'bars', 'wave'].map((variant) => (
        <div key={variant} className="flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <LoadingSpinner variant={variant as LoadingVariant} size="lg" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{variant}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Demo: Spinner sizes
 */
function SpinnerSizesDemo() {
  return (
    <div className="flex items-end gap-6 justify-center py-4">
      {['xs', 'sm', 'md', 'lg', 'xl'].map((size) => (
        <div key={size} className="flex flex-col items-center gap-1">
          <LoadingSpinner size={size as LoadingSize} />
          <p className="text-xs text-gray-600 dark:text-gray-400">{size}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Demo: Spinner colors
 */
function SpinnerColorsDemo() {
  return (
    <div className="flex items-center gap-4 justify-center flex-wrap">
      {['primary', 'secondary', 'success', 'warning', 'error', 'info'].map((color) => (
        <div key={color} className="flex flex-col items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <LoadingSpinner color={color as LoadingColor} size="md" />
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">{color}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Demo: Global loading control
 */
function GlobalLoadingDemo() {
  const { startLoading, stopLoading, updateProgress, withLoading } = useGlobalLoading();
  const [progress, setProgress] = useState(0);

  const handleProgressiveLoading = async () => {
    startLoading('Loading with progress...');
    setProgress(0);

    for (let i = 1; i <= 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const newProgress = i * 10;
      setProgress(newProgress);
      updateProgress(newProgress, `Loading... ${newProgress}%`);
    }

    stopLoading();
  };

  const handleAsyncOperation = async () => {
    try {
      await withLoading(
        new Promise(resolve => setTimeout(resolve, 2000)),
        'Simulating API call...'
      );
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleErrorCase = async () => {
    try {
      await withLoading(
        new Promise((_, reject) => setTimeout(() => reject(new Error('Failed!')), 1000)),
        'Trying to load...'
      );
    } catch (error) {
      console.error('Caught error:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => startLoading('Simple loading...')}>
          Start Simple Loading
        </Button>
        <Button onClick={stopLoading} variant="secondary">
          Stop Loading
        </Button>
        <Button onClick={handleProgressiveLoading} variant="success">
          Progressive Loading
        </Button>
        <Button onClick={handleAsyncOperation} variant="primary">
          Async Operation
        </Button>
        <Button onClick={handleErrorCase} variant="danger">
          Simulate Error
        </Button>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Current progress: {progress}%
      </p>
    </div>
  );
}

/**
 * Demo: Scoped loading
 */
function ScopedLoadingDemo() {
  const { state, startLoading, stopLoading, withLoading } = useScopedLoading();

  const handleScopedAsync = async () => {
    try {
      await withLoading(
        new Promise(resolve => setTimeout(resolve, 2000)),
        'Scoped operation...'
      );
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={() => startLoading('Loading...')}>
          Start Scoped Loading
        </Button>
        <Button onClick={stopLoading} variant="secondary">
          Stop
        </Button>
        <Button onClick={handleScopedAsync} variant="success">
          Async Operation
        </Button>
      </div>
      {state.isLoading && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <LoadingSpinner size="sm" />
          <span className="text-sm text-blue-700 dark:text-blue-300">{state.message}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Demo: GlobalLoader variants
 */
function GlobalLoaderVariantsDemo() {
  const { startLoading, stopLoading } = useGlobalLoading();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Overlay (Default)</h4>
          <Button onClick={() => startLoading('Overlay loading...')}>
            Show Overlay
          </Button>
        </div>
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Inline</h4>
          <Button onClick={() => startLoading('Inline loading...')}>
            Show Inline
          </Button>
        </div>
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Minimal</h4>
          <Button onClick={() => startLoading('Minimal loading...')}>
            Show Minimal
          </Button>
        </div>
      </div>
      <Button onClick={stopLoading} variant="secondary">
        Stop All
      </Button>
      {/* GlobalLoader will render when loading is active */}
      <GlobalLoader />
    </div>
  );
}

/**
 * Demo: Progress tracking
 */
function ProgressTrackingDemo() {
  const { startLoading, updateProgress, stopLoading } = useGlobalLoading();

  const handleProgressTracking = async () => {
    startLoading('Uploading file...');
    await new Promise(resolve => setTimeout(resolve, 100));
    updateProgress(20, 'Uploading... 20%');
    await new Promise(resolve => setTimeout(resolve, 200));
    updateProgress(40, 'Uploading... 40%');
    await new Promise(resolve => setTimeout(resolve, 200));
    updateProgress(60, 'Uploading... 60%');
    await new Promise(resolve => setTimeout(resolve, 200));
    updateProgress(80, 'Uploading... 80%');
    await new Promise(resolve => setTimeout(resolve, 200));
    updateProgress(100, 'Upload complete!');
    await new Promise(resolve => setTimeout(resolve, 500));
    stopLoading();
  };

  return (
    <div className="space-y-4">
      <Button onClick={handleProgressTracking} variant="success">
        Start Progress Tracking
      </Button>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        This will display a progress bar while loading.
      </p>
      <GlobalLoader showProgress={true} />
    </div>
  );
}

/**
 * Main demo page
 */
export default function LoadingDemoPage() {
  return (
    <GlobalLoadingProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Loading Components Demo
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              A comprehensive loading state management system with global and scoped loaders,
              multiple spinner variants, and progress tracking.
            </p>
          </div>

          {/* Demo Sections */}
          <div className="space-y-8">
            {/* Spinner Variants */}
            <DemoSection title="Spinner Variants">
              <SpinnerVariantsDemo />
            </DemoSection>

            {/* Spinner Sizes */}
            <DemoSection title="Spinner Sizes">
              <SpinnerSizesDemo />
            </DemoSection>

            {/* Spinner Colors */}
            <DemoSection title="Spinner Colors">
              <SpinnerColorsDemo />
            </DemoSection>

            {/* Global Loading Control */}
            <DemoSection title="Global Loading Control">
              <GlobalLoadingDemo />
              <GlobalLoader />
            </DemoSection>

            {/* Scoped Loading */}
            <DemoSection title="Scoped Loading (Isolated States)">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ScopedLoadingDemo />
                <ScopedLoadingDemo />
              </div>
            </DemoSection>

            {/* GlobalLoader Variants */}
            <DemoSection title="GlobalLoader Variants">
              <GlobalLoaderVariantsDemo />
            </DemoSection>

            {/* Progress Tracking */}
            <DemoSection title="Progress Tracking">
              <ProgressTrackingDemo />
            </DemoSection>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>
              Built with Next.js, React, and Tailwind CSS
            </p>
          </div>
        </div>
      </div>
    </GlobalLoadingProvider>
  );
}
