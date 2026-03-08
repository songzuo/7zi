'use client';

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { TaskStatus } from '@/lib/types/task-types';

// Register required components
ChartJS.register(ArcElement, Tooltip, Legend, Title);

interface TaskStatusChartProps {
  tasks: Array<{
    status: TaskStatus;
  }>;
}

export function TaskStatusChart({ tasks }: TaskStatusChartProps) {
  // Count tasks by status
  const statusCounts = {
    pending: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
  };

  tasks.forEach(task => {
    statusCounts[task.status]++;
  });

  const data = {
    labels: ['待处理', '已分配', '进行中', '已完成'],
    datasets: [
      {
        data: [
          statusCounts.pending,
          statusCounts.assigned,
          statusCounts.in_progress,
          statusCounts.completed,
        ],
        backgroundColor: [
          '#f59e0b', // amber-500 for pending
          '#3b82f6', // blue-500 for assigned
          '#06b6d4', // cyan-500 for in_progress
          '#10b981', // emerald-500 for completed
        ],
        borderColor: [
          '#f59e0b',
          '#3b82f6',
          '#06b6d4',
          '#10b981',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: '任务状态分布',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        padding: {
          top: 10,
          bottom: 30,
        },
      },
    },
  };

  return (
    <div className="h-full">
      <Pie data={data} options={options} />
    </div>
  );
}