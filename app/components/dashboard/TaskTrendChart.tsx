'use client';

/**
 * 任务趋势图表组件
 * 
 * 展示任务完成和创建的趋势
 * 使用纯 CSS 实现的简单图表
 */

import React, { useMemo, memo } from 'react';
import type { TaskTrend } from '@/app/users/[userId]/dashboard/page';

interface TaskTrendChartProps {
  data: TaskTrend[];
}

const TaskTrendChart = memo(function TaskTrendChart({ data }: TaskTrendChartProps) {
  // 计算最大值用于比例
  const maxValue = useMemo(() => {
    if (data.length === 0) return 10;
    return Math.max(
      ...data.map((d) => Math.max(d.completed, d.created)),
      1
    );
  }, [data]);

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 计算总计
  const totals = useMemo(() => {
    const completed = data.reduce((sum, d) => sum + d.completed, 0);
    const created = data.reduce((sum, d) => sum + d.created, 0);
    return { completed, created };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          📈 任务趋势
        </h3>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          暂无数据
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-colors">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          📈 任务趋势
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            (近 {data.length} 天)
          </span>
        </h3>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">
              完成: {totals.completed}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-600 dark:text-gray-400">
              创建: {totals.created}
            </span>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="relative">
        {/* Y 轴标签 */}
        <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{maxValue}</span>
          <span>{Math.round(maxValue / 2)}</span>
          <span>0</span>
        </div>

        {/* 图表主体 */}
        <div className="ml-10">
          {/* 网格线 */}
          <div className="absolute left-10 right-0 top-0 bottom-6">
            <div className="h-full flex flex-col justify-between">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="border-t border-gray-200 dark:border-gray-700"
                />
              ))}
            </div>
          </div>

          {/* 柱状图 */}
          <div className="flex items-end gap-1 h-48 relative z-10">
            {data.map((item) => {
              const completedHeight = (item.completed / maxValue) * 100;
              const createdHeight = (item.created / maxValue) * 100;

              return (
                <div
                  key={item.date}
                  className="flex-1 flex items-end justify-center gap-0.5 group"
                >
                  {/* 完成柱 */}
                  <div
                    className="w-2 bg-green-500 rounded-t transition-all group-hover:bg-green-400"
                    style={{ height: `${completedHeight}%` }}
                    title={`完成: ${item.completed}`}
                  />
                  {/* 创建柱 */}
                  <div
                    className="w-2 bg-blue-500 rounded-t transition-all group-hover:bg-blue-400"
                    style={{ height: `${createdHeight}%` }}
                    title={`创建: ${item.created}`}
                  />
                </div>
              );
            })}
          </div>

          {/* X 轴标签 */}
          <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            {data.length > 7 ? (
              <>
                <span>{formatDate(data[0].date)}</span>
                <span>{formatDate(data[Math.floor(data.length / 2)].date)}</span>
                <span>{formatDate(data[data.length - 1].date)}</span>
              </>
            ) : (
              data.map((item) => (
                <span key={item.date} className="flex-1 text-center">
                  {formatDate(item.date)}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default TaskTrendChart;
