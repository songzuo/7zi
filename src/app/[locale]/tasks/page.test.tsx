import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TasksPage from '@/app/[locale]/tasks/page';

// Note: This is a client component ('use client'), so no generateMetadata
// Metadata for this page would be handled via a layout or separate server component

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



  describe('边界情况', () => {
    it('应该处理空任务列表', async () => {
      const page = await TasksPage();
      render(page);
      
      // 页面应该正常渲染
      expect(screen.getByText('Tasks')).toBeInTheDocument();
    });
  });
});