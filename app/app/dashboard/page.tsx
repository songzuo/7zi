import Dashboard from '../../components/Dashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '仪表盘 - AI 团队实时看板',
  description: '实时监控 AI 团队成员状态、任务进度和活动日志。查看 11 个专业 AI 代理的工作状态、当前任务和完成情况。支持自动刷新和实时更新。',
  keywords: ['AI团队仪表盘', '实时监控', '团队状态', '任务进度', '活动日志', 'AI代理状态'],
  openGraph: {
    title: '仪表盘 - AI 团队实时看板',
    description: '实时监控 AI 团队成员状态、任务进度和活动日志',
    url: 'https://7zi.com/dashboard',
    images: [
      {
        url: '/og-dashboard.png',
        width: 1200,
        height: 630,
        alt: 'AI 团队仪表盘',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '仪表盘 - AI 团队实时看板',
    description: '实时监控 AI 团队成员状态、任务进度和活动日志',
    images: ['/og-dashboard.png'],
  },
  alternates: {
    canonical: 'https://7zi.com/dashboard',
  },
};

// 导出统一的类型定义
export interface AIMember {
  id: string;
  name: string;
  role: string;
  emoji: string;
  avatar: string;
  status: 'idle' | 'working' | 'busy' | 'offline';
  provider: string;
  currentTask?: string;
  completedTasks: number;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string; color: string }>;
  assignee?: { login: string; avatar_url: string } | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface ActivityItem {
  id: string;
  type: 'commit' | 'issue' | 'comment';
  title: string;
  author: string;
  avatar?: string;
  timestamp: string;
  url: string;
}

export default function DashboardPage() {
  return <Dashboard />;
}
