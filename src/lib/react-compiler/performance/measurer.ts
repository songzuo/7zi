/**
 * React Compiler Performance Measurer
 * 
 * 测量和对比编译前后的性能差异
 */

// Chrome-specific memory info type
interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

declare global {
  interface Performance {
    memory?: MemoryInfo;
  }
}

export interface PerformanceMetrics {
  /** 渲染次数 */
  renderCount: number;
  /** 平均渲染时间 (ms) */
  avgRenderTime: number;
  /** 总渲染时间 (ms) */
  totalRenderTime: number;
  /** 内存使用 (bytes) */
  memoryUsage: number;
  /** 首次渲染时间 (ms) */
  firstRenderTime: number;
  /** 更新渲染时间 (ms) */
  updateRenderTime: number;
}

export interface PerformanceComparison {
  component: string;
  withoutCompiler: PerformanceMetrics;
  withCompiler: PerformanceMetrics;
  improvement: {
    renderCount: number; // percentage
    avgRenderTime: number;
    totalRenderTime: number;
    memoryUsage: number;
    firstRenderTime: number;
    updateRenderTime: number;
  };
  recommendation: 'enable' | 'keep-disabled' | 'investigate';
}

export interface BenchmarkResult {
  timestamp: number;
  componentName: string;
  metrics: PerformanceMetrics;
  environment: {
    nodeVersion: string;
    reactVersion: string;
    compilerEnabled: boolean;
  };
}

/**
 * 性能测量器
 */
export class PerformanceMeasurer {
  private results: BenchmarkResult[] = [];

  /**
   * 测量组件性能
   */
  async measureComponent(
    componentName: string,
    renderFunction: () => Promise<void> | void,
    options: {
      iterations?: number;
      warmupIterations?: number;
    } = {}
  ): Promise<PerformanceMetrics> {
    const { iterations = 10, warmupIterations = 3 } = options;

    // 预热
    for (let i = 0; i < warmupIterations; i++) {
      await renderFunction();
    }

    // 正式测量
    const renderTimes: number[] = [];
    const startMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const renderStart = performance.now();
      await renderFunction();
      const renderEnd = performance.now();
      renderTimes.push(renderEnd - renderStart);
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;

    const totalRenderTime = endTime - startTime;
    const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / iterations;
    const firstRenderTime = renderTimes[0];
    const updateRenderTime = renderTimes.slice(1).reduce((a, b) => a + b, 0) / (iterations - 1);

    return {
      renderCount: iterations,
      avgRenderTime,
      totalRenderTime,
      memoryUsage: endMemory - startMemory,
      firstRenderTime,
      updateRenderTime,
    };
  }

  /**
   * 对比性能
   */
  comparePerformance(
    component: string,
    withoutCompiler: PerformanceMetrics,
    withCompiler: PerformanceMetrics
  ): PerformanceComparison {
    const improvement = {
      renderCount: this.calculateImprovement(withoutCompiler.renderCount, withCompiler.renderCount),
      avgRenderTime: this.calculateImprovement(withoutCompiler.avgRenderTime, withCompiler.avgRenderTime),
      totalRenderTime: this.calculateImprovement(withoutCompiler.totalRenderTime, withCompiler.totalRenderTime),
      memoryUsage: this.calculateImprovement(withoutCompiler.memoryUsage, withCompiler.memoryUsage),
      firstRenderTime: this.calculateImprovement(withoutCompiler.firstRenderTime, withCompiler.firstRenderTime),
      updateRenderTime: this.calculateImprovement(withoutCompiler.updateRenderTime, withCompiler.updateRenderTime),
    };

    // 生成建议
    let recommendation: PerformanceComparison['recommendation'] = 'investigate';
    
    const avgImprovement = 
      (improvement.avgRenderTime + improvement.updateRenderTime + improvement.memoryUsage) / 3;
    
    if (avgImprovement > 10) {
      recommendation = 'enable';
    } else if (avgImprovement > -5) {
      recommendation = 'keep-disabled';
    }

    return {
      component,
      withoutCompiler,
      withCompiler,
      improvement,
      recommendation,
    };
  }

  /**
   * 计算改进百分比
   */
  private calculateImprovement(before: number, after: number): number {
    if (before === 0) return 0;
    return ((before - after) / before) * 100;
  }

  /**
   * 记录结果
   */
  recordResult(result: BenchmarkResult): void {
    this.results.push(result);
  }

  /**
   * 获取历史结果
   */
  getHistory(): BenchmarkResult[] {
    return [...this.results];
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    const lines: string[] = [
      '# React Compiler Performance Report',
      '',
      '## Summary',
      '',
      `Total benchmarks: ${this.results.length}`,
      '',
      '## Details',
      '',
    ];

    for (const result of this.results) {
      lines.push(`### ${result.componentName}`);
      lines.push(`- Compiler enabled: ${result.environment.compilerEnabled}`);
      lines.push(`- Average render time: ${result.metrics.avgRenderTime.toFixed(2)}ms`);
      lines.push(`- Memory usage: ${(result.metrics.memoryUsage / 1024).toFixed(2)}KB`);
      lines.push('');
    }

    return lines.join('\n');
  }
}

/**
 * React 性能追踪 Hook
 */
export function usePerformanceTracker(componentName: string) {
  if (typeof window === 'undefined') {
    return { trackRender: () => {}, getMetrics: () => null };
  }

  let renderCount = 0;
  const renderTimes: number[] = [];

  const trackRender = () => {
    renderCount++;
    // 在实际使用中，这里会使用 React Profiler 或 performance API
  };

  const getMetrics = (): PerformanceMetrics | null => {
    if (renderTimes.length === 0) return null;
    
    return {
      renderCount,
      avgRenderTime: renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length,
      totalRenderTime: renderTimes.reduce((a, b) => a + b, 0),
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      firstRenderTime: renderTimes[0] || 0,
      updateRenderTime: renderTimes.slice(1).reduce((a, b) => a + b, 0) / Math.max(renderTimes.length - 1, 1),
    };
  };

  return { trackRender, getMetrics };
}
