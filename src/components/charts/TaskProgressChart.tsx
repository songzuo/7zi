'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScriptableContext,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TaskProgressData {
  labels: string[];
  completed: number[];
  total: number[];
}

interface TaskProgressChartProps {
  data: TaskProgressData;
  height?: number;
}

export function TaskProgressChart({ data, height = 300 }: TaskProgressChartProps) {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: '已完成任务',
        data: data.completed,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#06b6d4',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
      {
        label: '总任务数',
        data: data.total,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#8b5cf6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    height: height,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#6b7280',
          font: {
            size: 12,
          },
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#1f2937',
        bodyColor: '#374151',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context: { dataset: { label: string }; parsed: { y: number } }) {
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      },
      title: {
        display: true,
        text: '任务进度趋势',
        color: '#1f2937',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        padding: {
          top: 10,
          bottom: 20,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11,
          },
          stepSize: 1,
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  return (
    <div className="w-full h-full">
      <Line data={chartData} options={options as unknown as any} />
    </div>
  );
}