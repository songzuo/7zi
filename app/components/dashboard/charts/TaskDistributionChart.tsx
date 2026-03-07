'use client';

/**
 * 任务分布饼图
 * 使用 Canvas 绘制环形图
 */

import React, { useRef, useEffect, memo, useCallback, useState } from 'react';

export interface TaskDistribution {
  category: string;
  count: number;
  color: string;
}

interface TaskDistributionChartProps {
  data: TaskDistribution[];
  height?: number;
}

const TaskDistributionChart = memo(function TaskDistributionChart({ data, height = 220 }: TaskDistributionChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(width, height) / 2 - 20;
    const innerRadius = outerRadius * 0.6;

    // 清空
    ctx.clearRect(0, 0, width, height);

    // 计算总和
    const total = data.reduce((sum, d) => sum + d.count, 0);

    // 绘制环形图
    let startAngle = -Math.PI / 2;

    data.forEach((item, index) => {
      const sliceAngle = (item.count / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;

      // 绘制扇形
      ctx.beginPath();
      ctx.arc(centerX, centerY, hoveredIndex === index ? outerRadius + 5 : outerRadius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();

      // 边框
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      startAngle = endAngle;
    });

    // 中心文字
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total.toString(), centerX, centerY - 10);
    
    ctx.fillStyle = '#6b7280';
    ctx.font = '14px sans-serif';
    ctx.fillText('总任务', centerX, centerY + 15);
  }, [data, height, hoveredIndex]);

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  // 鼠标移动检测
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = height / 2;

    // 计算鼠标位置相对于圆心的角度
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const outerRadius = Math.min(rect.width, height) / 2 - 20;
    const innerRadius = outerRadius * 0.6;

    // 检查是否在环形区域内
    if (distance < innerRadius || distance > outerRadius + 10) {
      setHoveredIndex(null);
      return;
    }

    let angle = Math.atan2(dy, dx) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;

    const total = data.reduce((sum, d) => sum + d.count, 0);
    let currentAngle = 0;

    for (let i = 0; i < data.length; i++) {
      const sliceAngle = (data[i].count / total) * Math.PI * 2;
      if (angle >= currentAngle && angle < currentAngle + sliceAngle) {
        setHoveredIndex(i);
        return;
      }
      currentAngle += sliceAngle;
    }

    setHoveredIndex(null);
  }, [data, height]);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        暂无数据
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div ref={containerRef} className="w-full">
      <canvas 
        ref={canvasRef} 
        className="w-full cursor-pointer" 
        style={{ height: `${height}px` }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      
      {/* 图例 */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {data.map((item, index) => (
          <div 
            key={item.category}
            className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
              hoveredIndex === index ? 'bg-gray-100 dark:bg-gray-700' : ''
            }`}
          >
            <span 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.category}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white ml-auto">
              {item.count} ({((item.count / total) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

export default TaskDistributionChart;