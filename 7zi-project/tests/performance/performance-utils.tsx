/**
 * Performance Test Utilities
 *
 * Tools for measuring React component performance:
 * - Render count tracking
 * - Render time measurement
 * - Profiler API utilities
 * - Benchmark comparison helpers
 */

import React, { Profiler, ProfilerOnRenderCallback } from 'react';
import { render, renderHook, act } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';

// ============================================================================
// Types
// ============================================================================

export interface RenderMetrics {
  renderCount: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
}

export interface ProfilerData {
  id: string;
  phase: 'mount' | 'update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
}

export interface BenchmarkResult {
  testName: string;
  optimized: RenderMetrics;
  unoptimized: RenderMetrics;
  improvement: {
    renderCount: number; // percentage
    totalTime: number; // percentage
    averageTime: number; // percentage
  };
}

// ============================================================================
// Render Counter
// ============================================================================

export class RenderCounter {
  private count: number = 0;
  private startTime: number = 0;
  private renderTimes: number[] = [];

  reset() {
    this.count = 0;
    this.startTime = 0;
    this.renderTimes = [];
  }

  increment() {
    this.count++;
    if (this.startTime === 0) {
      this.startTime = performance.now();
    }
  }

  recordRenderTime(time: number) {
    this.renderTimes.push(time);
  }

  getMetrics(): RenderMetrics {
    const totalTime = this.renderTimes.reduce((a, b) => a + b, 0);
    const averageTime = this.renderTimes.length > 0 ? totalTime / this.renderTimes.length : 0;
    const minTime = this.renderTimes.length > 0 ? Math.min(...this.renderTimes) : 0;
    const maxTime = this.renderTimes.length > 0 ? Math.max(...this.renderTimes) : 0;

    return {
      renderCount: this.count,
      totalTime,
      averageTime,
      minTime,
      maxTime,
    };
  }

  getCount(): number {
    return this.count;
  }
}

// ============================================================================
// Profiler Callback Builder
// ============================================================================

export const createProfilerCallback = (
  onRender: (data: ProfilerData) => void
): ProfilerOnRenderCallback => {
  return (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    onRender({
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
    });
  };
};

// ============================================================================
// Measure Render Time
// ============================================================================

export function measureRenderTime(
  renderFn: () => any
): { result: any; time: number } {
  const start = performance.now();
  const result = renderFn();
  const end = performance.now();
  return { result, time: end - start };
}

// ============================================================================
// Measure Multiple Renders
// ============================================================================

export function measureMultipleRenders(
  renderFn: (props: any) => any,
  propsSequence: any[]
): { results: any[]; metrics: RenderMetrics } {
  const renderTimes: number[] = [];
  const results: any[] = [];

  propsSequence.forEach((props) => {
    const { result, time } = measureRenderTime(() => renderFn(props));
    renderTimes.push(time);
    results.push(result);

    // Cleanup after each render
    result.unmount();
  });

  const totalTime = renderTimes.reduce((a, b) => a + b, 0);
  const averageTime = totalTime / renderTimes.length;

  return {
    results,
    metrics: {
      renderCount: renderTimes.length,
      totalTime,
      averageTime,
      minTime: Math.min(...renderTimes),
      maxTime: Math.max(...renderTimes),
    },
  };
}

// ============================================================================
// Benchmark Comparison
// ============================================================================

export function comparePerformance(
  optimized: RenderMetrics,
  unoptimized: RenderMetrics
): BenchmarkResult {
  const calculateImprovement = (optimized: number, unoptimized: number): number => {
    if (unoptimized === 0) return 0;
    return ((unoptimized - optimized) / unoptimized) * 100;
  };

  return {
    testName: 'performance-comparison',
    optimized,
    unoptimized,
    improvement: {
      renderCount: calculateImprovement(optimized.renderCount, unoptimized.renderCount),
      totalTime: calculateImprovement(optimized.totalTime, unoptimized.totalTime),
      averageTime: calculateImprovement(optimized.averageTime, unoptimized.averageTime),
    },
  };
}

// ============================================================================
// Component Wrapper with Render Counting
// ============================================================================

export function withRenderCounting(
  Component: any,
  counter: RenderCounter
): any {
  const WrappedComponent = React.forwardRef((props: any, ref: any) => {
    React.useEffect(() => {
      counter.increment();
    });

    return React.createElement(Component, { ...props, ref });
  });

  WrappedComponent.displayName = `withRenderCounting(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// ============================================================================
// Assert Performance Improvement
// ============================================================================

export function expectImprovement(
  result: BenchmarkResult,
  metric: keyof BenchmarkResult['improvement'],
  threshold: number = 20 // default 20% improvement expected
) {
  const improvement = result.improvement[metric];
  if (improvement < threshold) {
    throw new Error(
      `Performance improvement for ${metric} is ${improvement.toFixed(2)}%, ` +
      `expected at least ${threshold}% improvement. ` +
      `Unoptimized: ${result.unoptimized[metric]}, ` +
      `Optimized: ${result.optimized[metric]}`
    );
  }
}

// ============================================================================
// Memo Efficacy Test
// ============================================================================

export function testMemoEfficacy(
  Component: any,
  propsSequence: any[],
  threshold: number = 0.5 // percentage of props that should trigger re-render
): { reRenderCount: number; reRenderRatio: number; passed: boolean } {
  const counter = new RenderCounter();
  const WrappedComponent = withRenderCounting(Component, counter);

  const { rerender } = render(
    React.createElement(WrappedComponent, propsSequence[0])
  );

  propsSequence.slice(1).forEach((props) => {
    rerender(React.createElement(WrappedComponent, props));
  });

  const reRenderCount = counter.getCount();
  const reRenderRatio = reRenderCount / propsSequence.length;
  const passed = reRenderRatio <= threshold;

  return {
    reRenderCount,
    reRenderRatio,
    passed,
  };
}

// ============================================================================
// Profiler Wrapper
// ============================================================================

export interface ProfilerWrapperProps {
  id: string;
  children: React.ReactNode;
  onRender: (data: ProfilerData) => void;
}

export const ProfilerWrapper: React.FC<ProfilerWrapperProps> = ({
  id,
  children,
  onRender,
}) => {
  return (
    <Profiler id={id} onRender={createProfilerCallback(onRender)}>
      {children}
    </Profiler>
  );
};
