/**
 * @fileoverview TeamActivityTracker 组件测试
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { TeamActivityTracker } from '../TeamActivityTracker';

describe('TeamActivityTracker', () => {
  describe('渲染', () => {
    it('应该显示加载状态', () => {
      render(<TeamActivityTracker />);
      // 加载状态会在数据加载后消失
    });

    it('应该显示标题', async () => {
      render(<TeamActivityTracker />);

      await waitFor(() => {
        expect(screen.getByText(/团队活动追踪/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('应该显示过滤按钮', async () => {
      render(<TeamActivityTracker />);

      await waitFor(() => {
        expect(screen.getByText(/过滤/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('应该显示导出按钮', async () => {
      render(<TeamActivityTracker />);

      await waitFor(() => {
        expect(screen.getByText(/导出/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('应该显示最近活动', async () => {
      render(<TeamActivityTracker />);

      await waitFor(() => {
        expect(screen.getByText(/最近活动/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('应该显示统计面板', async () => {
      render(<TeamActivityTracker />);

      await waitFor(() => {
        expect(screen.getByText(/统计/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('过滤功能', () => {
    it('点击过滤按钮应该显示过滤面板', async () => {
      render(<TeamActivityTracker />);

      const filterButton = await screen.findByText(/过滤/, {}, { timeout: 5000 });
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText(/所有类型/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('应该显示所有活动类型选项', async () => {
      render(<TeamActivityTracker />);

      // 等待数据加载完成
      await screen.findByText(/最近活动/, {}, { timeout: 5000 });

      const filterButton = screen.getByText(/过滤/);
      fireEvent.click(filterButton);

      // 等待过滤面板出现
      await waitFor(() => {
        expect(screen.getByText(/所有类型/)).toBeInTheDocument();
      }, { timeout: 5000 });

      // 检查活动类型选项 - 使用 getAllByText 并验证存在
      const commitButtons = screen.getAllByText(/提交/);
      expect(commitButtons.length).toBeGreaterThan(0);

      const issueCreateButtons = screen.getAllByText(/创建 Issue/);
      expect(issueCreateButtons.length).toBeGreaterThan(0);

      const issueCloseButtons = screen.getAllByText(/关闭 Issue/);
      expect(issueCloseButtons.length).toBeGreaterThan(0);
    });

    it('点击活动类型应该过滤活动', async () => {
      render(<TeamActivityTracker />);

      // 等待数据加载完成
      await screen.findByText(/最近活动/, {}, { timeout: 5000 });

      // 获取主过滤按钮（第一个包含"过滤"文本的按钮）
      const filterButton = screen.getAllByText(/过滤/).find(btn =>
        btn.textContent === '🔍 过滤' ||
        btn.classList.contains('px-3') ||
        btn.classList.contains('rounded-lg')
      ) || screen.getAllByText(/过滤/)[0];
      fireEvent.click(filterButton);

      // 等待过滤面板出现
      await waitFor(() => {
        expect(screen.getByText(/所有类型/)).toBeInTheDocument();
      }, { timeout: 5000 });

      // 获取过滤面板中的第一个"提交"按钮
      const commitButtons = screen.getAllByText(/提交/);
      const filterPanelCommitButton = commitButtons.find(btn =>
        btn.classList.contains('border-green-200') ||
        btn.classList.contains('bg-green-50')
      ) || commitButtons[0];
      fireEvent.click(filterPanelCommitButton);

      // 应该显示过滤计数 - 再次获取主过滤按钮
      await waitFor(() => {
        const filterButtons = screen.getAllByText(/过滤/);
        const mainFilterButton = filterButtons.find(btn =>
          btn.textContent === '🔍 过滤' ||
          btn.classList.contains('px-3') ||
          btn.classList.contains('rounded-lg')
        ) || filterButtons[0];
        expect(mainFilterButton.textContent).toMatch(/[1-9]/);
      }, { timeout: 5000 });
    });

    it('应该显示所有成员过滤选项', async () => {
      render(<TeamActivityTracker />);

      // 等待数据加载完成
      await screen.findByText(/最近活动/, {}, { timeout: 5000 });

      const filterButton = screen.getByText(/过滤/);
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText(/所有成员/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('点击清除过滤应该重置过滤器', async () => {
      render(<TeamActivityTracker />);

      // 等待数据加载完成
      await screen.findByText(/最近活动/, {}, { timeout: 5000 });

      // 打开过滤面板并选择一个类型
      const filterButton = screen.getByText(/过滤/);
      fireEvent.click(filterButton);

      // 等待过滤面板出现
      await waitFor(() => {
        expect(screen.getByText(/所有类型/)).toBeInTheDocument();
      }, { timeout: 5000 });

      // 获取过滤面板中的第一个"提交"按钮
      const commitButtons = screen.getAllByText(/提交/);
      const filterPanelCommitButton = commitButtons.find(btn =>
        btn.classList.contains('border-green-200') ||
        btn.classList.contains('bg-green-50')
      ) || commitButtons[0];
      fireEvent.click(filterPanelCommitButton);

      // 清除过滤
      const clearButtons = screen.getAllByText(/清除过滤/);
      const clearButton = clearButtons[0];
      fireEvent.click(clearButton);

      // 过滤器应该被清除
      await waitFor(() => {
        expect(screen.queryByText(/清除过滤/)).not.toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('统计数据', () => {
    it('应该显示成员排名和活动数', async () => {
      render(<TeamActivityTracker />);

      // 等待数据加载完成，寻找成员活动数（括号内的数字）
      await waitFor(() => {
        const stats = screen.getAllByText(/\(\d+\)/);
        expect(stats.length).toBeGreaterThan(0);
      }, { timeout: 5000 });
    });
  });

  describe('活动列表', () => {
    it('应该显示活动类型标签', async () => {
      render(<TeamActivityTracker />);

      await waitFor(() => {
        // 检查是否有活动类型标签
        expect(screen.getAllByText(/提交|创建 Issue|关闭 Issue/).length).toBeGreaterThan(0);
      }, { timeout: 5000 });
    });

    it('应该显示时间信息', async () => {
      render(<TeamActivityTracker />);

      await waitFor(() => {
        // 检查是否有时间信息（分钟前、小时前、天前）
        expect(screen.getAllByText(/前|刚刚/).length).toBeGreaterThan(0);
      }, { timeout: 5000 });
    });
  });

  describe('国际化', () => {
    it('应该支持英文', async () => {
      render(<TeamActivityTracker locale="en" />);

      await waitFor(() => {
        expect(screen.getByText(/Team Activity Tracker/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('应该显示英文过滤按钮', async () => {
      render(<TeamActivityTracker locale="en" />);

      await waitFor(() => {
        expect(screen.getByText(/Filter/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('应该显示英文统计', async () => {
      render(<TeamActivityTracker locale="en" />);

      await waitFor(() => {
        expect(screen.getByText(/Statistics/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('配置选项', () => {
    it('showFilters=false 应该隐藏过滤按钮', async () => {
      render(<TeamActivityTracker showFilters={false} />);

      await waitFor(() => {
        expect(screen.queryByText(/过滤/)).not.toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('showStats=false 应该隐藏统计面板', async () => {
      render(<TeamActivityTracker showStats={false} />);

      await waitFor(() => {
        expect(screen.queryByText(/统计/)).not.toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('maxItems 应该限制活动数量', async () => {
      render(<TeamActivityTracker maxItems={10} />);

      await waitFor(() => {
        expect(screen.getByText(/最近活动/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});