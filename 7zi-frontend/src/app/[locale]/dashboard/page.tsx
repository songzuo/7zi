import { DashboardClient } from './DashboardClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '数据仪表板 | 7zi Platform',
  description: '实时数据可视化仪表板',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
