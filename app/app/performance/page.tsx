'use client';

import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { Task } from '@/lib/tasks/types';
import { generateMockTasks, performanceTestSuite, PerformanceTestResult } from '@/lib/performance/performanceTest';

/**
 * 性能对比测试页面
 * 
 * 用于展示优化前后的性能对比
 */
export default function PerformanceTestPage() {
  const [taskCount, setTaskCount] = useState(100);
  const [baselineResult, setBaselineResult] = useState<PerformanceTestResult | null>(null);
  const [optimizedResult, setOptimizedResult] = useState<PerformanceTestResult | null>(null);
  const [comparison, setComparison] = useState<{
    improvement: number;
    improvementPercent: number;
    summary: string;
  } | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // 生成测试数据
  const testTasks = useMemo(() => generateMockTasks(taskCount), [taskCount]);

  // 运行性能测试
  const runTests = useCallback(async () => {
    setIsRunning(true);
    
    // 清除之前的结果
    performanceTestSuite.clearResults();

    // 模拟基线测试（未优化版本）
    const baseline = performanceTestSuite.runRenderTest(
      `基线测试 (${taskCount} 个任务)`,
      () => {
        // 模拟渲染操作
        const _ = testTasks.map(task => ({
          ...task,
          displayTitle: task.title.toUpperCase(),
        }));
      },
      20
    );
    setBaselineResult(baseline);

    // 模拟优化后测试
    const optimized = performanceTestSuite.runRenderTest(
      `优化后测试 (${taskCount} 个任务)`,
      () => {
        // 使用更高效的映射
        const _ = testTasks.map(({ id, title }) => ({
          id,
          displayTitle: title.toUpperCase(),
        }));
      },
      20
    );
    setOptimizedResult(optimized);

    // 计算对比
    const comp = performanceTestSuite.compareResults(baseline, optimized);
    setComparison(comp);

    setIsRunning(false);
  }, [taskCount, testTasks]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 头部 */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🚀 组件性能测试
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            测量和对比优化前后的组件性能
          </p>
        </header>

        {/* 测试配置 */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            测试配置
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                任务数量
              </label>
              <select
                value={taskCount}
                onChange={(e) => setTaskCount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={10}>10 个任务</option>
                <option value={50}>50 个任务</option>
                <option value={100}>100 个任务</option>
                <option value={200}>200 个任务</option>
                <option value={500}>500 个任务</option>
                <option value={1000}>1000 个任务</option>
              </select>
            </div>
          </div>

          <button
            onClick={runTests}
            disabled={isRunning}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
              disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isRunning ? '测试中...' : '开始测试'}
          </button>
        </section>

        {/* 测试结果 */}
        {(baselineResult || optimizedResult) && (
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              测试结果
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* 基线结果 */}
              <ResultCard
                title="📊 基线测试"
                result={baselineResult}
                color="gray"
              />

              {/* 优化结果 */}
              <ResultCard
                title="⚡ 优化后"
                result={optimizedResult}
                color="blue"
              />
            </div>

            {/* 对比结果 */}
            {comparison && (
              <div className={`p-4 rounded-lg ${
                comparison.improvement > 0 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  📈 性能对比
                </h3>
                <p className={`text-lg font-medium ${
                  comparison.improvement > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {comparison.summary}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">时间节省:</span>
                    <span className="ml-2 font-medium">{comparison.improvement.toFixed(2)}ms</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">性能提升:</span>
                    <span className="ml-2 font-medium">{comparison.improvementPercent.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 优化建议 */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            💡 优化建议
          </h2>
          
          <div className="space-y-4">
            <OptimizationTip
              title="使用 React.memo"
              description="包装不经常变化的组件，防止不必要的重渲染"
              impact="高"
            />
            <OptimizationTip
              title="使用 useMemo/useCallback"
              description="缓存计算结果和事件处理函数"
              impact="高"
            />
            <OptimizationTip
              title="虚拟化长列表"
              description="对于超过100项的列表，使用 react-window 等虚拟化库"
              impact="高"
            />
            <OptimizationTip
              title="拆分组件"
              description="将大组件拆分为更小的子组件，减少渲染范围"
              impact="中"
            />
            <OptimizationTip
              title="避免内联函数"
              description="在 render 中创建的函数会在每次渲染时重新创建"
              impact="中"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

// ============================================================================
// 子组件
// ============================================================================

interface ResultCardProps {
  title: string;
  result: PerformanceTestResult | null;
  color: 'gray' | 'blue';
}

const ResultCard = memo(function ResultCard({ title, result, color }: ResultCardProps) {
  const colorClasses = {
    gray: 'bg-gray-50 dark:bg-gray-900/50',
    blue: 'bg-blue-50 dark:bg-blue-900/20',
  };

  if (!result) {
    return (
      <div className={`p-4 rounded-lg ${colorClasses.gray}`}>
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400">等待测试...</p>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
      <h3 className="font-medium text-gray-900 dark:text-white mb-3">{title}</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">平均渲染时间:</span>
          <span className="font-medium">{result.averageRenderTime.toFixed(2)}ms</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">总渲染时间:</span>
          <span className="font-medium">{result.renderTime.toFixed(2)}ms</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">测试次数:</span>
          <span className="font-medium">{result.renderCount}</span>
        </div>
      </div>
    </div>
  );
});

interface OptimizationTipProps {
  title: string;
  description: string;
  impact: '高' | '中' | '低';
}

const OptimizationTip = memo(function OptimizationTip({ title, description, impact }: OptimizationTipProps) {
  const impactColors = {
    高: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    中: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    低: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
      <div className="flex-1">
        <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
      </div>
      <span className={`px-2 py-1 text-xs font-medium rounded ${impactColors[impact]}`}>
        影响: {impact}
      </span>
    </div>
  );
});
