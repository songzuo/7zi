/**
 * 性能测试和对比工具
 * 用于测量优化前后的性能差异
 */

import { Task } from '@/lib/tasks/types';

export interface PerformanceTestResult {
  testName: string;
  renderTime: number;
  renderCount: number;
  averageRenderTime: number;
  timestamp: string;
}

/**
 * 性能测试套件
 */
export class PerformanceTestSuite {
  private results: PerformanceTestResult[] = [];

  /**
   * 运行渲染性能测试
   */
  runRenderTest(
    testName: string,
    renderFn: () => void,
    iterations: number = 10
  ): PerformanceTestResult {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      renderFn();
      const end = performance.now();
      times.push(end - start);
    }

    const totalTime = times.reduce((a, b) => a + b, 0);
    const averageTime = totalTime / iterations;

    const result: PerformanceTestResult = {
      testName,
      renderTime: totalTime,
      renderCount: iterations,
      averageRenderTime: averageTime,
      timestamp: new Date().toISOString(),
    };

    this.results.push(result);
    return result;
  }

  /**
   * 比较两个测试结果
   */
  compareResults(
    baseline: PerformanceTestResult,
    optimized: PerformanceTestResult
  ): {
    improvement: number;
    improvementPercent: number;
    summary: string;
  } {
    const improvement = baseline.averageRenderTime - optimized.averageRenderTime;
    const improvementPercent = (improvement / baseline.averageRenderTime) * 100;

    const summary = improvement > 0
      ? `优化后性能提升 ${improvementPercent.toFixed(1)}% (${improvement.toFixed(2)}ms)`
      : `优化后性能下降 ${Math.abs(improvementPercent).toFixed(1)}% (${Math.abs(improvement).toFixed(2)}ms)`;

    return {
      improvement,
      improvementPercent,
      summary,
    };
  }

  /**
   * 获取所有测试结果
   */
  getResults(): PerformanceTestResult[] {
    return [...this.results];
  }

  /**
   * 清除所有测试结果
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * 生成报告
   */
  generateReport(): string {
    const lines: string[] = [
      '# 性能测试报告',
      '',
      '## 测试结果摘要',
      '',
      '| 测试名称 | 平均渲染时间 (ms) | 测试次数 |',
      '|---------|-----------------|---------|',
    ];

    this.results.forEach((result) => {
      lines.push(
        `| ${result.testName} | ${result.averageRenderTime.toFixed(2)} | ${result.renderCount} |`
      );
    });

    lines.push('', '---', `生成时间: ${new Date().toLocaleString()}`);

    return lines.join('\n');
  }
}

/**
 * 生成模拟任务数据（用于性能测试）
 */
export function generateMockTasks(count: number): Task[] {
  const statuses: Task['status'][] = ['todo', 'in_progress', 'review', 'done'];
  const priorities: Task['priority'][] = ['low', 'medium', 'high'];
  const assignees = [
    '🌟 智能体世界专家',
    '📚 咨询师',
    '🏗️ 架构师',
    '⚡ Executor',
    '🛡️ 系统管理员',
    '🧪 测试员',
    '🎨 设计师',
  ];

  const tasks: Task[] = [];

  for (let i = 0; i < count; i++) {
    const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const dueDate = Math.random() > 0.3 
      ? new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000)
      : undefined;

    tasks.push({
      id: `task-${i}`,
      title: `任务 ${i + 1}: ${getRandomTitle()}`,
      description: Math.random() > 0.5 ? getRandomDescription() : undefined,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      assignee: assignees[Math.floor(Math.random() * assignees.length)],
      tags: [],
      createdAt,
      updatedAt: createdAt,
      dueDate,
      completedAt: undefined,
    });
  }

  return tasks;
}

function getRandomTitle(): string {
  const titles = [
    '修复登录页面样式问题',
    '实现用户权限管理',
    '优化数据库查询性能',
    '添加单元测试',
    '重构代码结构',
    '更新文档',
    '修复安全漏洞',
    '实现新功能模块',
    '代码审查',
    '部署到生产环境',
  ];
  return titles[Math.floor(Math.random() * titles.length)];
}

function getRandomDescription(): string {
  const descriptions = [
    '这是一个重要的任务，需要仔细处理。',
    '请确保代码质量，添加必要的测试。',
    '需要在下周之前完成，优先级较高。',
    '与团队成员协作完成，及时沟通进度。',
  ];
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

/**
 * 测量列表渲染性能
 */
export function measureListRenderPerformance(
  listSize: number,
  container: HTMLElement
): {
  firstRender: number;
  updateRender: number;
  memoryUsage?: number;
} {
  const startFirst = performance.now();
  
  // 模拟首次渲染
  const tasks = generateMockTasks(listSize);
  
  const endFirst = performance.now();

  const startUpdate = performance.now();
  
  // 模拟更新（修改一个任务）
  if (tasks.length > 0) {
    tasks[0].title = tasks[0].title + ' (已更新)';
  }
  
  const endUpdate = performance.now();

  // 尝试获取内存使用（如果可用）
  let memoryUsage: number | undefined;
  if ('memory' in performance && (performance as any).memory) {
    memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
  }

  return {
    firstRender: endFirst - startFirst,
    updateRender: endUpdate - startUpdate,
    memoryUsage,
  };
}

/**
 * 创建性能监控装饰器
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  label: string
): T {
  return ((...args: Parameters<T>) => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    
    console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
    
    return result;
  }) as T;
}

/**
 * 导出单例测试套件
 */
export const performanceTestSuite = new PerformanceTestSuite();
