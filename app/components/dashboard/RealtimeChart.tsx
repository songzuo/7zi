'use client';

/**
 * 实时统计图表组件
 * 使用 Canvas 绘制实时更新的图表
 */

import React, { useRef, useEffect, memo, useCallback } from 'react';

interface RealtimeChartProps {
  data: number[];
  maxValue?: number;
  color?: string;
  height?: number;
  showGrid?: boolean;
  label?: string;
}

const RealtimeChart = memo(function RealtimeChart({
  data,
  maxValue,
  color = '#3b82f6',
  height = 100,
  showGrid = true,
  label,
}: RealtimeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布尺寸
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const chartHeight = height;
    const padding = 10;

    // 清空画布
    ctx.clearRect(0, 0, width, chartHeight);

    // 计算最大值
    const max = maxValue || Math.max(...data, 1);

    // 绘制网格
    if (showGrid) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;

      // 水平线
      for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight - padding * 2) * (i / 4);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
      }
    }

    // 绘制数据线
    const stepX = (width - padding * 2) / (data.length - 1 || 1);
    
    // 绘制渐变填充
    const gradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
    gradient.addColorStop(0, `${color}40`);
    gradient.addColorStop(1, `${color}00`);

    ctx.beginPath();
    ctx.moveTo(padding, chartHeight - padding);

    data.forEach((value, index) => {
      const x = padding + index * stepX;
      const y = chartHeight - padding - (value / max) * (chartHeight - padding * 2);
      
      if (index === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.lineTo(padding + (data.length - 1) * stepX, chartHeight - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // 绘制线条
    ctx.beginPath();
    data.forEach((value, index) => {
      const x = padding + index * stepX;
      const y = chartHeight - padding - (value / max) * (chartHeight - padding * 2);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 绘制最后一个点
    const lastX = padding + (data.length - 1) * stepX;
    const lastY = chartHeight - padding - (data[data.length - 1] / max) * (chartHeight - padding * 2);
    
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [data, maxValue, color, height, showGrid]);

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {data[data.length - 1]?.toLocaleString() || 0}
          </span>
        </div>
      )}
      <canvas ref={canvasRef} className="w-full" style={{ height: `${height}px` }} />
    </div>
  );
});

export default RealtimeChart;
