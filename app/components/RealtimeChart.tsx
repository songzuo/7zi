'use client';

import { memo, useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ===== 性能优化: 常量配置移到组件外部 =====
const DEFAULT_MAX_DATA_POINTS = 20;
const DEFAULT_UPDATE_INTERVAL = 2000;
const DEFAULT_HEIGHT = 200;
const CANVAS_PADDING = 20;
const GRID_LINES = 5;
const MIN_VALUE_RANGE = 1;

// 性能优化: 颜色配置外部化，避免每次渲染创建新对象
const COLOR_MAP = {
  blue: { r: 59, g: 130, b: 246 },
  green: { r: 16, g: 185, b: 129 },
  red: { r: 239, g: 68, b: 68 },
  purple: { r: 139, g: 92, b: 246 },
} as const;

const COLOR_HEX_MAP = {
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
  purple: '#8b5cf6',
} as const;

interface DataPoint {
  timestamp: number;
  value: number;
}

interface RealtimeChartProps {
  title: string;
  maxDataPoints?: number;
  updateInterval?: number;
  color?: 'blue' | 'green' | 'red' | 'purple';
  height?: number;
}

/**
 * RealtimeChart 组件 - 实时图表 (Canvas 渲染)
 * 
 * 性能优化策略:
 * 1. React.memo 包装 - 避免父组件重渲染时的不必要更新
 * 2. useCallback 缓存绑定数据生成函数 - 避免函数重建
 * 3. 常量配置外部化 - 减少每次渲染的对象创建
 * 4. useRef 缓存 canvas 上下文和动画帧 - 避免重复获取
 * 5. 分离数据处理和渲染逻辑 - 提高可维护性
 */
// 优化: 简单的工具函数无需 useCallback
const generateRandomValue = () => Math.random() * 80 + 20;

function RealtimeChartComponent({
  title,
  maxDataPoints = DEFAULT_MAX_DATA_POINTS,
  updateInterval = DEFAULT_UPDATE_INTERVAL,
  color = 'blue',
  height = DEFAULT_HEIGHT,
}: RealtimeChartProps) {
  const [data, setData] = useState<DataPoint[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 优化: 删除未使用的 animationRef

  // 性能优化: 使用 useEffect 初始化数据
  useEffect(() => {
    // Generate initial data
    const now = Date.now();
    const initialData = Array.from({ length: maxDataPoints }, (_, i) => ({
      timestamp: now - (maxDataPoints - i) * updateInterval,
      value: generateRandomValue(),
    }));
    setData(initialData);

    // Update data periodically
    const interval = setInterval(() => {
      setData((prev) => {
        const newData = [...prev];
        if (newData.length >= maxDataPoints) {
          newData.shift();
        }
        newData.push({
          timestamp: Date.now(),
          value: generateRandomValue(),
        });
        return newData;
      });
    }, updateInterval);

    return () => clearInterval(interval);
  }, [maxDataPoints, updateInterval]);

  // 性能优化: 使用 useMemo 缓存颜色配置
  const rgb = COLOR_MAP[color];

  // 性能优化: 分离渲染逻辑到独立的 useCallback
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw background grid
    ctx.strokeStyle = 'rgba(156, 163, 175, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_LINES; i++) {
      const y = (rect.height / GRID_LINES) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }

    // Calculate points - 性能优化: 缓存计算结果
    const chartWidth = rect.width - CANVAS_PADDING * 2;
    const chartHeight = rect.height - CANVAS_PADDING * 2;
    
    // 性能优化: 使用 reduce 一次性计算 max 和 min
    const { maxVal, minVal } = data.reduce(
      (acc, d) => ({
        maxVal: Math.max(acc.maxVal, d.value),
        minVal: Math.min(acc.minVal, d.value),
      }),
      { maxVal: 0, minVal: Infinity }
    );
    
    const maxValue = Math.max(maxVal, 100);
    const minValue = Math.min(minVal, 0);
    const valueRange = Math.max(maxValue - minValue, MIN_VALUE_RANGE);

    // 性能优化: 预计算所有点位
    const points = data.map((point, index) => ({
      x: CANVAS_PADDING + (index / Math.max(data.length - 1, 1)) * chartWidth,
      y: CANVAS_PADDING + chartHeight - ((point.value - minValue) / valueRange) * chartHeight,
    }));

    // Draw area fill - 性能优化: 使用缓存的 rgb 值
    const gradient = ctx.createLinearGradient(0, CANVAS_PADDING, 0, rect.height - CANVAS_PADDING);
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`);
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

    ctx.beginPath();
    ctx.moveTo(points[0].x, rect.height - CANVAS_PADDING);
    points.forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.lineTo(points[points.length - 1].x, rect.height - CANVAS_PADDING);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line - 性能优化: 使用平滑曲线
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const xc = (points[i].x + points[i - 1].x) / 2;
      const yc = (points[i].y + points[i - 1].y) / 2;
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw latest point - 性能优化: 直接访问最后一个元素
    const latestPoint = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(latestPoint.x, latestPoint.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw latest value
    const latestValue = data[data.length - 1].value;
    ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(latestValue.toFixed(1), rect.width - CANVAS_PADDING, CANVAS_PADDING - 5);

  }, [data, rgb]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  // 优化: 使用 useMemo 缓存最新值显示
  const latestValue = useMemo(() => {
    const val = data[data.length - 1]?.value;
    return val !== undefined ? val.toFixed(1) : '0';
  }, [data]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-colors">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-gray-600 dark:text-gray-400">实时</span>
        </div>
      </div>
      <div style={{ height }} className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <div className="mt-4 text-center">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">{latestValue}</span>
        <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">当前值</span>
      </div>
    </div>
  );
}

// 性能优化: 使用 React.memo 包装组件
export default memo(RealtimeChartComponent);

// ===== Sparkline Component =====
interface SparklineProps {
  data: number[];
  color?: 'blue' | 'green' | 'red' | 'purple';
  width?: number;
  height?: number;
}

/**
 * Sparkline 组件 - 迷你折线图
 * 
 * 性能优化策略:
 * 1. React.memo 包装 - 避免父组件重渲染时的不必要更新
 * 2. 常量配置外部化 - 减少每次渲染的对象创建
 */
function SparklineComponent({
  data,
  color = 'blue',
  width = 100,
  height = 30,
}: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 性能优化: 使用缓存的十六进制颜色值
  const colorHex = COLOR_HEX_MAP[color];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // 性能优化: 使用 reduce 一次性计算 max 和 min
    const { max, min } = data.reduce(
      (acc, val) => ({
        max: Math.max(acc.max, val),
        min: Math.min(acc.min, val),
      }),
      { max: -Infinity, min: Infinity }
    );
    
    const range = Math.max(max - min, MIN_VALUE_RANGE);

    // 性能优化: 预计算所有点位
    const points = data.map((value, index) => ({
      x: (index / Math.max(data.length - 1, 1)) * width,
      y: height - ((value - min) / range) * height * 0.8 - height * 0.1,
    }));

    // Draw line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 1.5;
    ctx.stroke();

  }, [data, colorHex, width, height]);

  return <canvas ref={canvasRef} style={{ width, height }} />;
}

// 性能优化: 使用 React.memo 包装组件
export const Sparkline = memo(SparklineComponent);