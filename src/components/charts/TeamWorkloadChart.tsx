'use client';

import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ScriptableContext,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

interface Task {
  id: string;
  title: string;
  assignee: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  type: 'development' | 'design' | 'research' | 'marketing' | 'other';
}

interface TeamWorkloadChartProps {
  members: TeamMember[];
  tasks: Task[];
}

export function TeamWorkloadChart({ members, tasks }: TeamWorkloadChartProps) {
  const [chartData, setChartData] = useState<{
    labels: string[];
    datasets: Array<{ label: string; data: number[]; backgroundColor: string }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!members || !tasks) {
      requestAnimationFrame(() => {
        setIsLoading(false);
      });
      return;
    }

    // Calculate workload per team member
    const workloadData = members.map(member => {
      const assignedTasks = tasks.filter(task => task.assignee === member.id);
      const activeTasks = assignedTasks.filter(task => 
        task.status === 'assigned' || task.status === 'in_progress'
      ).length;
      const completedTasks = assignedTasks.filter(task => 
        task.status === 'completed'
      ).length;
      
      return {
        name: member.name,
        active: activeTasks,
        completed: completedTasks,
        total: assignedTasks.length
      };
    });

    // Filter out members with no tasks
    const filteredWorkload = workloadData.filter(member => member.total > 0);

    if (filteredWorkload.length === 0) {
      requestAnimationFrame(() => {
        setIsLoading(false);
      });
      return;
    }

    const chartData = {
      labels: filteredWorkload.map(member => member.name),
      datasets: [
        {
          label: '进行中任务',
          data: filteredWorkload.map(member => member.active),
          backgroundColor: 'rgba(59, 130, 246, 0.8)', // blue-500
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        },
        {
          label: '已完成任务',
          data: filteredWorkload.map(member => member.completed),
          backgroundColor: 'rgba(16, 185, 129, 0.8)', // green-500
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
        }
      ],
    };

    requestAnimationFrame(() => {
      setChartData(chartData);
      setIsLoading(false);
    });
  }, [members, tasks]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#6b7280', // text-gray-500
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: ScriptableContext<'bar'>) {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            return `${label}: ${value}`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
        },
        ticks: {
          color: '#6b7280', // text-gray-500
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)', // gray-400 with opacity
        },
        ticks: {
          color: '#6b7280', // text-gray-500
          stepSize: 1,
        },
      },
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500 dark:text-zinc-400">加载中...</div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <div className="text-zinc-500 dark:text-zinc-400">暂无团队工作负载数据</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64">
      <Bar data={chartData} options={options as unknown as any} />
    </div>
  );
}