'use client';

/**
 * 效率趋势图表
 * 使用 Canvas 绘制折线图
 */

import React, { useRef, useEffect, memo, useCallback } from 'react';

export interface EfficiencyDataPoint {
  date: string;
  efficiency: number;
  tasksCompleted: number;
  avgTime: number;
}

interface EfficiencyChartProps {
  data: EfficiencyDataPoint[];
  height?: number;
}

const EfficiencyChart = memo(function EfficiencyChart({ data, height = 200 }: EfficiencyChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const chartHeight = height;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartAreaHeight = chartHeight - padding.top - padding.bottom;

    // 清空
    ctx.clearRect(0, 0, width, chartHeight);

    // 计算最大值
    const maxEfficiency = Math.max(...data.map(d => d.efficiency), 100);
    const maxTasks = Math.max(...data.map(d => d.tasksCompleted), 10);

    // 绘制网格
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartAreaHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Y 轴标签
      const value = Math.round(maxEfficiency - (maxEfficiency / 4) * i);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${value}%`, padding.left - 10, y + 4);
    }

    // X 轴标签
    const stepX = chartWidth / (data.length - 1 || 1);
    ctx.textAlign = 'center';
    data.forEach((d, i) => {
      const x = padding.left + i * stepX;
      const date = new Date(d.date);
      const label = `${date.getMonth() + 1}/${date.getDate()}`;
      
      if (i % Math.ceil(data.length / 7) === 0 || i === data.length - 1) {
        ctx.fillText(label, x, chartHeight - 10);
      }
    });

    // 绘制效率线
    const gradient = ctx.createLinearGradient(0, padding.top, 0, chartHeight - padding.bottom);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

    // 填充区域
    ctx.beginPath();
    ctx.moveTo(padding.left, chartHeight - padding.bottom);
    data.forEach((d, i) => {
      const x = padding.left + i * stepX;
      const y = padding.top + chartAreaHeight * (1 - d.efficiency / maxEfficiency);
      ctx.lineTo(x, y);
    });
    ctx.lineTo(padding.left + (data.length - 1) * stepX, chartHeight - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // 绘制线条
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = padding.left + i * stepX;
      const y = padding.top + chartAreaHeight * (1 - d.efficiency / maxEfficiency);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 绘制数据点
    data.forEach((d, i) => {
      const x = padding.left + i * stepX;
      const y = padding.top + chartAreaHeight * (1 - d.efficiency / maxEfficiency);

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // 绘制任务完成柱状图（次要）
    const barWidth = stepX * 0.3;
    data.forEach((d, i) => {
      const x = padding.left + i * stepX - barWidth / 2;
      const barHeight = (d.tasksCompleted / maxTasks) * (chartAreaHeight * 0.4);
      const y = chartHeight - padding.bottom - barHeight;

      ctx.fillStyle = 'rgba(16, 185, 129, 0.5)';
      ctx.fillRect(x, y, barWidth, barHeight);
    });
  }, [data, height]);

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        暂无数据
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      <canvas ref={canvasRef} className="w-full" style={{ height: `${height}px` }} />
      
      {/* 图例 */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-4 h-1 bg-blue-500 rounded" />
          <span className="text-gray-600 dark:text-gray-400">效率</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-green-500/50 rounded" />
          <span className="text-gray-600 dark:text-gray-400">任务完成</span>
        </div>
      </div>
    </div>
  );
});

export default EfficiencyChart;