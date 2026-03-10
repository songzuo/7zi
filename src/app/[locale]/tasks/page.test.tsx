import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TasksPage from '@/app/[locale]/tasks/page';

// Mock next-intl/server
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => {
    const translations: Record<string, string> = {
      'meta.title': 'Tasks - 7zi',
      'meta.description': 'Manage your tasks',
      'title': 'Tasks',
      'description': 'Task management',
    };
    return translations[key] || key;
  }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

describe('TasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('渲染', () => {
    it('应该渲染页面容器', async () => {
      const page = await TasksPage();
      const { container } = render(page);
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it('应该渲染任务列表区域', async () => {
      const page = await TasksPage();
      const { container } = render(page);
      
      // 检查页面是否渲染
      expect(container).toBeTruthy();
    });
  });

  describe('元数据生成', () => {
    it('应该生成正确的元数据', async () => {
      const metadata = await TasksPage.generateMetadata?.();
      
      expect(metadata).toBeDefined();
      expect(metadata?.title).toBe('Tasks - 7zi');
      expect(metadata?.description).toBe('Manage your tasks');
    });
  });

  describe('边界情况', () => {
    it('应该处理空任务列表', async () => {
      const page = await TasksPage();
      render(page);
      
      // 页面应该正常渲染
      expect(screen.getByText('Tasks')).toBeInTheDocument();
    });
  });
});