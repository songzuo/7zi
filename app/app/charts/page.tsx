'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  GroupedBarChart,
  LineChart,
  RealtimeLineChart,
  MultiLineChart,
  PieChart,
  DonutChart,
  GaugeChart,
  CHART_COLORS,
  type ChartDataPoint,
  type TimeSeriesPoint,
} from '../../components/charts';

// ===== Sample Data =====
const teamContributionData: ChartDataPoint[] = [
  { label: '智能体专家', value: 85, color: CHART_COLORS.blue },
  { label: '咨询师', value: 72, color: CHART_COLORS.green },
  { label: '架构师', value: 68, color: CHART_COLORS.purple },
  { label: 'Executor', value: 92, color: CHART_COLORS.orange },
  { label: '系统管理员', value: 45, color: CHART_COLORS.cyan },
  { label: '测试员', value: 78, color: CHART_COLORS.pink },
  { label: '设计师', value: 55, color: CHART_COLORS.indigo },
];

const statusData: ChartDataPoint[] = [
  { label: '活跃', value: 7, color: CHART_COLORS.green },
  { label: '空闲', value: 3, color: CHART_COLORS.yellow },
  { label: '离线', value: 1, color: CHART_COLORS.red },
];

const weeklyTrend = [
  { label: '周一', value: 45 },
  { label: '周二', value: 52 },
  { label: '周三', value: 48 },
  { label: '周四', value: 61 },
  { label: '周五', value: 55 },
  { label: '周六', value: 32 },
  { label: '周日', value: 28 },
];

const categories = ['需求', '开发', '测试', '部署'];
const categorySeries = [
  { name: '已完成', data: [12, 18, 8, 5], color: CHART_COLORS.green },
  { name: '进行中', data: [3, 5, 4, 2], color: CHART_COLORS.blue },
  { name: '待处理', data: [2, 1, 3, 1], color: CHART_COLORS.orange },
];

const monthlyLabels = ['1月', '2月', '3月', '4月', '5月', '6月'];
const monthlySeries = [
  { name: '任务完成', values: [45, 52, 49, 63, 58, 72], color: CHART_COLORS.blue },
  { name: '代码提交', values: [120, 135, 142, 156, 148, 165], color: CHART_COLORS.green },
];

export default function ChartsDemoPage() {
  const [realtimeData, setRealtimeData] = useState<TimeSeriesPoint[]>([]);
  const [performanceValue, setPerformanceValue] = useState(72);

  // Simulate realtime data
  useEffect(() => {
    const now = Date.now();
    const initialData = Array.from({ length: 20 }, (_, i) => ({
      timestamp: now - (20 - i) * 2000,
      value: Math.random() * 40 + 60,
    }));
    setRealtimeData(initialData);

    const interval = setInterval(() => {
      setRealtimeData((prev) => {
        const newData = [...prev];
        if (newData.length >= 20) newData.shift();
        newData.push({
          timestamp: Date.now(),
          value: Math.random() * 40 + 60,
        });
        return newData;
      });
      setPerformanceValue(Math.random() * 30 + 60);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            📊 数据可视化组件库
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            轻量级、高性能的 React 图表组件，基于纯 SVG + CSS 实现
          </p>
        </header>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="组件数量" value="8+" color="blue" />
          <StatCard label="代码大小" value="<15KB" color="green" />
          <StatCard label="依赖" value="0" color="purple" />
          <StatCard label="动画" value="✓" color="orange" />
        </div>

        {/* Charts Grid */}
        <div className="space-y-8">
          {/* Row 1: Bar Charts */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>📊</span>
              <span>柱状图</span>
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BarChart
                data={teamContributionData}
                title="团队成员贡献度"
                subtitle="本周统计"
                height={280}
              />
              <GroupedBarChart
                categories={categories}
                series={categorySeries}
                title="任务状态分布"
                subtitle="按类别分组"
                height={280}
              />
            </div>
          </section>

          {/* Row 2: Line Charts */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>📈</span>
              <span>折线图</span>
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <LineChart
                data={weeklyTrend}
                title="本周任务趋势"
                height={250}
                color={CHART_COLORS.blue}
              />
              <RealtimeLineChart
                title="系统负载"
                data={realtimeData}
                height={250}
                color={CHART_COLORS.green}
              />
              <MultiLineChart
                data={monthlySeries}
                labels={monthlyLabels}
                title="月度趋势对比"
                height={250}
              />
            </div>
          </section>

          {/* Row 3: Pie & Gauge Charts */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>🥧</span>
              <span>饼图 & 仪表盘</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <PieChart
                data={statusData}
                title="成员状态分布"
                size={180}
              />
              <DonutChart
                data={teamContributionData.slice(0, 5)}
                title="贡献占比"
                size={180}
                donutWidth={25}
              />
              <GaugeChart
                value={performanceValue}
                max={100}
                title="系统性能"
                unit="%"
                thresholds={[
                  { value: 80, color: CHART_COLORS.green },
                  { value: 60, color: CHART_COLORS.yellow },
                  { value: 0, color: CHART_COLORS.red },
                ]}
              />
              <GaugeChart
                value={75}
                max={100}
                title="任务完成率"
                unit="%"
                color={CHART_COLORS.purple}
              />
            </div>
          </section>

          {/* Row 4: Interactive Demo */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>🎨</span>
              <span>交互式演示</span>
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                所有图表支持鼠标悬停交互，显示详细数据。动画效果可配置开关。
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500" />
                  <span className="text-gray-700 dark:text-gray-300">悬停高亮</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500" />
                  <span className="text-gray-700 dark:text-gray-300">动画过渡</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-purple-500" />
                  <span className="text-gray-700 dark:text-gray-300">响应式布局</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-orange-500" />
                  <span className="text-gray-700 dark:text-gray-300">暗色模式</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
            使用 SVG + CSS 构建，无第三方图表库依赖 | 支持暗色模式
          </p>
        </footer>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  };

  return (
    <div className={`rounded-lg border-2 p-4 ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  );
}