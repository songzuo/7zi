'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';

/**
 * React Compiler 验证页面
 *
 * 用途: 对比启用/禁用 React Compiler 的性能差异
 *
 * 测试场景:
 * 1. 大列表渲染 (1000+ 项)
 * 2. 实时数据更新 (每秒更新)
 * 3. 复杂状态管理 (多个状态联动)
 * 4. 重渲染计数器 (测量组件重渲染次数)
 */

// 类型定义
interface ListItem {
  id: number;
  value: number;
  selected: boolean;
}

interface RenderCount {
  component: string;
  count: number;
}

export default function ReactCompilerVerifyPage() {
  const t = useTranslations('ReactCompilerVerify');

  // ===== 场景 1: 大列表渲染 =====
  const [listItems, setListItems] = useState<ListItem[]>(() =>
    Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      value: Math.random(),
      selected: false,
    }))
  );
  const [filterValue, setFilterValue] = useState('');

  const filteredItems = useMemo(() => {
    return listItems.filter(item =>
      item.value.toString().includes(filterValue)
    );
  }, [listItems, filterValue]);

  const toggleItem = useCallback((id: number) => {
    setListItems(items =>
      items.map(item =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  }, []);

  // ===== 场景 2: 实时数据更新 =====
  const [realtimeData, setRealtimeData] = useState({
    timestamp: Date.now(),
    cpuUsage: Math.random() * 100,
    memoryUsage: Math.random() * 100,
    activeConnections: Math.floor(Math.random() * 1000),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setRealtimeData({
        timestamp: Date.now(),
        cpuUsage: Math.random() * 100,
        memoryUsage: Math.random() * 100,
        activeConnections: Math.floor(Math.random() * 1000),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ===== 场景 3: 复杂状态管理 =====
  const [complexState, setComplexState] = useState({
    count1: 0,
    count2: 0,
    count3: 0,
    count4: 0,
    count5: 0,
  });

  const incrementCount = useCallback((key: keyof typeof complexState) => {
    setComplexState(prev => ({
      ...prev,
      [key]: prev[key] + 1,
    }));
  }, []);

  // 计算派生状态 (容易触发不必要的重渲染)
  const derivedValue = useMemo(() => {
    return Object.values(complexState).reduce((sum, val) => sum + val, 0);
  }, [complexState]);

  // ===== 场景 4: 重渲染计数器 =====
  const renderCounts = useRef<Map<string, number>>(new Map());

  const trackRender = (componentName: string) => {
    const current = renderCounts.current.get(componentName) || 0;
    renderCounts.current.set(componentName, current + 1);
  };

  const [refreshKey, setRefreshKey] = useState(0);

  // 强制所有组件重渲染
  const forceRerender = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // ===== 性能监控 =====
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 0,
    frameTime: 0,
  });

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        const fps = frameCount;
        const frameTime = 1000 / fps;

        setPerformanceMetrics({ fps, frameTime });

        frameCount = 0;
        lastTime = currentTime;
      }

      animationFrameId = requestAnimationFrame(measureFPS);
    };

    animationFrameId = requestAnimationFrame(measureFPS);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // 重置计数器
  const resetCounts = useCallback(() => {
    renderCounts.current.clear();
    setRefreshKey(prev => prev + 1);
  }, []);

  // ===== React Compiler 状态检查 =====
  const isCompilerEnabled = typeof (window as any).__REACT_COMPILER__ !== 'undefined';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* 页面标题 */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('title', { defaultValue: 'React Compiler Verification' })}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('description', { defaultValue: 'Test and compare performance with React Compiler enabled/disabled' })}
          </p>

          {/* 编译器状态 */}
          <div className="mt-4 flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">
              {t('compilerStatus', { defaultValue: 'React Compiler Status' })}:
            </span>
            {isCompilerEnabled ? (
              <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                <span className="mr-1.5 h-2 w-2 rounded-full bg-green-500" />
                {t('enabled', { defaultValue: 'Enabled' })}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
                <span className="mr-1.5 h-2 w-2 rounded-full bg-yellow-500" />
                {t('disabled', { defaultValue: 'Disabled' })}
              </span>
            )}
          </div>
        </div>

        {/* 控制面板 */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('controlPanel', { defaultValue: 'Control Panel' })}
          </h2>
          <div className="mt-4 flex flex-wrap gap-4">
            <button
              onClick={forceRerender}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              {t('forceRerender', { defaultValue: 'Force Rerender All' })}
            </button>
            <button
              onClick={resetCounts}
              className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            >
              {t('resetCounts', { defaultValue: 'Reset Render Counts' })}
            </button>
          </div>

          {/* 性能指标 */}
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-md bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700">
                {t('fps', { defaultValue: 'FPS' })}
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {performanceMetrics.fps}
              </p>
            </div>
            <div className="rounded-md bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700">
                {t('frameTime', { defaultValue: 'Frame Time' })}
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {performanceMetrics.frameTime.toFixed(1)} ms
              </p>
            </div>
            <div className="rounded-md bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700">
                {t('totalRenders', { defaultValue: 'Total Renders' })}
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {Array.from(renderCounts.current.values()).reduce((a, b) => a + b, 0)}
              </p>
            </div>
            <div className="rounded-md bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700">
                {t('refreshKey', { defaultValue: 'Refresh Key' })}
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {refreshKey}
              </p>
            </div>
          </div>
        </div>

        {/* 场景 1: 大列表渲染 */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('scenario1', { defaultValue: 'Scenario 1: Large List Rendering' })}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('scenario1Desc', {
              defaultValue: 'List with 1000 items. Filter and click to select.',
            })}
          </p>

          <ListRenderer
            key={`list-${refreshKey}`}
            items={filteredItems}
            onToggle={toggleItem}
            trackRender={(name) => trackRender(name)}
            renderCount={renderCounts.current.get('ListRenderer') || 0}
          />

          <div className="mt-4 flex items-center space-x-4">
            <input
              type="text"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              placeholder={t('filterPlaceholder', { defaultValue: 'Filter items...' })}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              {t('showingItems', {
                defaultValue: 'Showing {{count}} items',
                count: filteredItems.length,
              })}
            </span>
          </div>
        </div>

        {/* 场景 2: 实时数据更新 */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('scenario2', { defaultValue: 'Scenario 2: Realtime Data Updates' })}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('scenario2Desc', {
              defaultValue: 'Data updates every second. Observe render performance.',
            })}
          </p>

          <RealtimeDashboard
            key={`realtime-${refreshKey}`}
            data={realtimeData}
            trackRender={(name) => trackRender(name)}
            renderCount={renderCounts.current.get('RealtimeDashboard') || 0}
          />
        </div>

        {/* 场景 3: 复杂状态管理 */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('scenario3', { defaultValue: 'Scenario 3: Complex State Management' })}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('scenario3Desc', {
              defaultValue: 'Multiple linked counters. Click to increment.',
            })}
          </p>

          <ComplexStateComponent
            key={`complex-${refreshKey}`}
            state={complexState}
            derivedValue={derivedValue}
            onIncrement={incrementCount}
            trackRender={(name) => trackRender(name)}
            renderCount={renderCounts.current.get('ComplexStateComponent') || 0}
          />
        </div>

        {/* 渲染计数器报告 */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('renderCounts', { defaultValue: 'Render Counts Report' })}
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t('component', { defaultValue: 'Component' })}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t('renderCount', { defaultValue: 'Render Count' })}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t('percentage', { defaultValue: 'Percentage' })}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {Array.from(renderCounts.current.entries()).map(([component, count]) => {
                  const total = Array.from(renderCounts.current.values()).reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
                  return (
                    <tr key={component}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {component}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                        {count}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                        {percentage}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="rounded-lg bg-blue-50 p-6">
          <h3 className="text-lg font-semibold text-blue-900">
            {t('instructions', { defaultValue: 'Instructions' })}
          </h3>
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-sm text-blue-800">
            <li>
              {t('instruction1', {
                defaultValue: 'Open this page in two browser tabs',
              })}
            </li>
            <li>
              {t('instruction2', {
                defaultValue: 'In one tab, enable React Compiler (ENABLE_REACT_COMPILER=true)',
              })}
            </li>
            <li>
              {t('instruction3', {
                defaultValue: 'In the other tab, disable React Compiler (ENABLE_REACT_COMPILER=false)',
              })}
            </li>
            <li>
              {t('instruction4', {
                defaultValue: 'Run the same operations in both tabs (click buttons, filter, etc.)',
              })}
            </li>
            <li>
              {t('instruction5', {
                defaultValue: 'Compare the render counts and FPS to see the performance difference',
              })}
            </li>
            <li>
              {t('instruction6', {
                defaultValue: 'Use React DevTools Profiler for detailed analysis',
              })}
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// ===== 子组件 =====

/**
 * 列表渲染器
 */
function ListRenderer({
  items,
  onToggle,
  trackRender,
  renderCount,
}: {
  items: ListItem[];
  onToggle: (id: number) => void;
  trackRender: (name: string) => void;
  renderCount: number;
}) {
  trackRender('ListRenderer');

  return (
    <div className="mt-4">
      <div className="mb-2 text-sm text-gray-600">
        Renders: <span className="font-semibold">{renderCount}</span>
      </div>
      <div className="max-h-96 overflow-y-auto rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                ID
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Value
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Selected
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {items.slice(0, 100).map((item) => (
              <ListItem
                key={item.id}
                item={item}
                onToggle={onToggle}
                trackRender={(name) => trackRender(name)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * 列表项
 */
function ListItem({
  item,
  onToggle,
  trackRender,
}: {
  item: ListItem;
  onToggle: (id: number) => void;
  trackRender: (name: string) => void;
}) {
  trackRender(`ListItem-${item.id}`);

  return (
    <tr className={item.selected ? 'bg-blue-50' : ''}>
      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">
        {item.id}
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">
        {item.value.toFixed(4)}
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">
        {item.selected ? '✓' : '✗'}
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-sm">
        <button
          onClick={() => onToggle(item.id)}
          className="rounded-md bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300"
        >
          Toggle
        </button>
      </td>
    </tr>
  );
}

/**
 * 实时数据仪表板
 */
function RealtimeDashboard({
  data,
  trackRender,
  renderCount,
}: {
  data: {
    timestamp: number;
    cpuUsage: number;
    memoryUsage: number;
    activeConnections: number;
  };
  trackRender: (name: string) => void;
  renderCount: number;
}) {
  trackRender('RealtimeDashboard');

  return (
    <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
      <div className="rounded-md bg-gray-50 p-4">
        <div className="mb-2 text-sm text-gray-600">
          Renders: <span className="font-semibold">{renderCount}</span>
        </div>
        <p className="text-sm font-medium text-gray-700">Timestamp</p>
        <p className="mt-1 text-lg font-semibold text-gray-900">
          {new Date(data.timestamp).toLocaleTimeString()}
        </p>
      </div>
      <div className="rounded-md bg-gray-50 p-4">
        <div className="mb-2 text-sm text-gray-600">
          Renders: <span className="font-semibold">{renderCount}</span>
        </div>
        <p className="text-sm font-medium text-gray-700">CPU Usage</p>
        <p className="mt-1 text-lg font-semibold text-gray-900">
          {data.cpuUsage.toFixed(1)}%
        </p>
      </div>
      <div className="rounded-md bg-gray-50 p-4">
        <div className="mb-2 text-sm text-gray-600">
          Renders: <span className="font-semibold">{renderCount}</span>
        </div>
        <p className="text-sm font-medium text-gray-700">Memory Usage</p>
        <p className="mt-1 text-lg font-semibold text-gray-900">
          {data.memoryUsage.toFixed(1)}%
        </p>
      </div>
      <div className="rounded-md bg-gray-50 p-4">
        <div className="mb-2 text-sm text-gray-600">
          Renders: <span className="font-semibold">{renderCount}</span>
        </div>
        <p className="text-sm font-medium text-gray-700">Active Connections</p>
        <p className="mt-1 text-lg font-semibold text-gray-900">
          {data.activeConnections}
        </p>
      </div>
    </div>
  );
}

/**
 * 复杂状态组件
 */
function ComplexStateComponent({
  state,
  derivedValue,
  onIncrement,
  trackRender,
  renderCount,
}: {
  state: {
    count1: number;
    count2: number;
    count3: number;
    count4: number;
    count5: number;
  };
  derivedValue: number;
  onIncrement: (key: keyof typeof state) => void;
  trackRender: (name: string) => void;
  renderCount: number;
}) {
  trackRender('ComplexStateComponent');

  return (
    <div className="mt-4">
      <div className="mb-2 text-sm text-gray-600">
        Renders: <span className="font-semibold">{renderCount}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
        {Object.entries(state).map(([key, value]) => (
          <div key={key} className="rounded-md bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-700">{key}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
            <button
              onClick={() => onIncrement(key as keyof typeof state)}
              className="mt-2 rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              Increment
            </button>
          </div>
        ))}
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm font-medium text-green-700">Derived Value</p>
          <p className="mt-1 text-2xl font-semibold text-green-900">{derivedValue}</p>
          <p className="mt-2 text-xs text-green-600">
            (Sum of all counters)
          </p>
        </div>
      </div>
    </div>
  );
}
