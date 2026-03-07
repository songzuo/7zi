import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ============================================================================
// next-intl Mock
// ============================================================================
// Mock translations for all namespaces
const mockTranslations: Record<string, Record<string, string | Record<string, string>>> = {
  // Activity namespace
  activity: {
    title: '实时活动日志',
    recentCount: '最近 {count} 条活动',
    noActivity: '暂无活动记录',
    githubActivity: 'GitHub 活动将显示在这里',
    autoRefreshInterval: '自动刷新 · 30 秒间隔',
    author: '作者',
    viewDetails: '查看详细内容',
    'type.commit': '提交',
    'type.issue': '任务',
    'type.comment': '评论',
  },
  // Member namespace
  member: {
    statusLabel: '状态',
    provider: '提供商',
    currentTask: '当前任务',
    completedTasks: '完成任务',
    'status.working': '工作中',
    'status.busy': '忙碌',
    'status.idle': '空闲',
    'status.offline': '离线',
    role: '角色',
  },
  // Dashboard namespace
  dashboard: {
    title: 'AI 团队仪表盘',
    subtitle: '实时监控团队成员状态和任务进度',
    autoRefresh: '自动刷新',
    seconds: '秒',
    refreshing: '正在刷新...',
    refreshInterval: '刷新间隔',
    closeAutoRefresh: '关闭自动刷新',
    refresh: '刷新',
    statsOverview: '统计概览',
    'stats.totalTasks': '总任务数',
    'stats.completed': '已完成',
    'stats.activeMembers': '活跃成员',
    'stats.avgResponse': '平均响应',
    taskProgress: '任务完成进度',
    members: '团队成员',
    activity: '活动日志',
    taskBoard: '任务看板',
    contributionStats: '贡献统计',
    loadingFailed: '加载失败',
  },
  // Navigation namespace
  navigation: {
    mainNav: '主导航',
    aiTeamHome: 'AI 团队首页',
    pageNav: '页面导航',
    userActions: '用户操作',
    notifications: '通知',
    settings: '设置',
    openMenu: '打开菜单',
    closeMenu: '关闭菜单',
    mobileNav: '移动端导航',
    menu: '菜单',
    theme: '主题',
    current: '当前页面',
    home: '首页',
    dashboard: '实时看板',
    subagents: '子代理',
    tasks: '任务',
    profile: '个人资料',
    'settings.language': '语言',
  },
  // Common namespace
  common: {
    error: '发生错误',
    retry: '重试',
    loading: '加载中...',
    save: '保存',
    cancel: '取消',
    confirm: '确认',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    search: '搜索',
    filter: '筛选',
    sort: '排序',
    export: '导出',
    import: '导入',
  },
};

// Mock useTranslations hook
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => {
    const translations = mockTranslations[namespace] || {};
    
    return (key: string, params?: Record<string, string | number>) => {
      // Handle nested keys like 'type.commit' or 'status.working'
      const value = translations[key];
      
      if (typeof value === 'string') {
        // Replace placeholders like {count} with actual values
        if (params) {
          return Object.entries(params).reduce(
            (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
            value
          );
        }
        return value;
      }
      
      // Return key if translation not found
      return key;
    };
  },
}));

// ============================================================================
// Next.js Navigation Mock
// ============================================================================
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// ============================================================================
// Next.js Link Mock - 返回简单的函数，不使用 JSX
// ============================================================================
vi.mock('next/link', () => ({
  default: vi.fn(({ children, href, ...props }) => {
    // 返回一个简单对象让 React 渲染
    const React = require('react');
    return React.createElement('a', { href, ...props }, children);
  }),
}));

// ============================================================================
// Image Mock for Next.js
// ============================================================================
vi.mock('next/image', () => ({
  default: vi.fn(({ src, alt, width, height, ...props }) => {
    const React = require('react');
    return React.createElement('img', { src, alt, width, height, ...props });
  }),
}));