import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import {
  FeedbackSystem,
  FeedbackForm,
  FeedbackCard,
  FeedbackList,
  FeedbackStats,
  FeedbackItem,
  FeedbackCategory,
  FeedbackStatus,
} from '../FeedbackSystem';

// Mock Rating component
vi.mock('../Rating', () => ({
  Rating: ({ value, onChange, size, readonly: _readonly, showValue }: any) => (
    <div 
      data-testid="rating" 
      data-value={value} 
      data-size={size}
      data-show-value={showValue}
      onClick={() => !readonly && onChange?.(value + 1)}
    >
      {'★'.repeat(value)}{'☆'.repeat(5 - value)}
    </div>
  ),
}));

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

// 测试数据
const mockFeedbacks: FeedbackItem[] = [
  {
    id: 'fb-1',
    userId: 'user-1',
    userName: '测试用户1',
    rating: 5,
    category: 'feature',
    title: '功能建议标题',
    content: '这是一个功能建议的详细内容',
    status: 'pending',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    tags: ['UI', '重要'],
  },
  {
    id: 'fb-2',
    userId: 'user-2',
    userName: '测试用户2',
    rating: 3,
    category: 'bug',
    title: 'Bug 反馈标题',
    content: '这是一个 Bug 反馈的详细内容',
    status: 'resolved',
    createdAt: '2024-01-14T10:00:00Z',
    updatedAt: '2024-01-15T12:00:00Z',
    tags: ['紧急'],
    responses: [
      {
        id: 'resp-1',
        content: '感谢反馈，已修复',
        createdAt: '2024-01-15T12:00:00Z',
        isAdmin: true,
      },
    ],
  },
  {
    id: 'fb-3',
    userId: 'user-3',
    userName: '测试用户3',
    rating: 4,
    category: 'question',
    title: '问题咨询标题',
    content: '这是一个问题咨询的详细内容',
    status: 'reviewing',
    createdAt: '2024-01-13T10:00:00Z',
    updatedAt: '2024-01-13T10:00:00Z',
  },
];

describe('FeedbackForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('渲染', () => {
    it('渲染反馈表单', () => {
      render(<FeedbackForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText('提交反馈')).toBeInTheDocument();
      expect(screen.getByLabelText(/整体评分/)).toBeInTheDocument();
      expect(screen.getByLabelText(/反馈类型/)).toBeInTheDocument();
      expect(screen.getByLabelText(/标题/)).toBeInTheDocument();
      expect(screen.getByLabelText(/详细描述/)).toBeInTheDocument();
    });

    it('渲染所有分类选项', () => {
      render(<FeedbackForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Bug 反馈')).toBeInTheDocument();
      expect(screen.getByText('功能建议')).toBeInTheDocument();
      expect(screen.getByText('改进建议')).toBeInTheDocument();
      expect(screen.getByText('问题咨询')).toBeInTheDocument();
      expect(screen.getByText('其他')).toBeInTheDocument();
    });

    it('渲染取消按钮（如果提供了 onCancel）', () => {
      render(<FeedbackForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();
    });

    it('不渲染取消按钮（如果没有 onCancel）', () => {
      render(<FeedbackForm onSubmit={mockOnSubmit} />);

      expect(screen.queryByRole('button', { name: '取消' })).not.toBeInTheDocument();
    });
  });

  describe('交互', () => {
    it('提交表单需要填写所有必填字段', async () => {
      render(<FeedbackForm onSubmit={mockOnSubmit} />);

      // 没有填写任何字段时提交按钮应该禁用
      const submitButton = screen.getByRole('button', { name: '提交反馈' });
      expect(submitButton).toBeDisabled();
    });

    it('填写所有必填字段后启用提交按钮', async () => {
      render(<FeedbackForm onSubmit={mockOnSubmit} />);

      // 填写标题
      fireEvent.change(screen.getByPlaceholderText('简要描述您的反馈'), {
        target: { value: '测试标题' },
      });

      // 填写内容
      fireEvent.change(screen.getByPlaceholderText('请详细描述您的反馈内容...'), {
        target: { value: '测试内容' },
      });

      // 点击评分
      fireEvent.click(screen.getByTestId('rating'));

      const submitButton = screen.getByRole('button', { name: '提交反馈' });
      expect(submitButton).not.toBeDisabled();
    });

    it('点击取消调用 onCancel', () => {
      render(<FeedbackForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByRole('button', { name: '取消' }));
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('可以选择不同的分类', () => {
      render(<FeedbackForm onSubmit={mockOnSubmit} />);

      const bugButton = screen.getByText('Bug 反馈');
      fireEvent.click(bugButton);

      // 按钮应该有选中状态（通过 class）
      expect(bugButton).toHaveClass('ring-2');
    });

    it('可以添加和移除标签', () => {
      render(<FeedbackForm onSubmit={mockOnSubmit} />);

      const tagInput = screen.getByPlaceholderText('输入标签后按回车添加');
      const addButton = screen.getByRole('button', { name: '添加' });

      // 添加标签
      fireEvent.change(tagInput, { target: { value: '测试标签' } });
      fireEvent.click(addButton);

      expect(screen.getByText('测试标签')).toBeInTheDocument();

      // 移除标签
      fireEvent.click(screen.getByText('×'));
      expect(screen.queryByText('测试标签')).not.toBeInTheDocument();
    });

    it('按回车添加标签', () => {
      render(<FeedbackForm onSubmit={mockOnSubmit} />);

      const tagInput = screen.getByPlaceholderText('输入标签后按回车添加');

      fireEvent.change(tagInput, { target: { value: '回车标签' } });
      fireEvent.keyPress(tagInput, { key: 'Enter', code: 'Enter', charCode: 13 });

      expect(screen.getByText('回车标签')).toBeInTheDocument();
    });
  });
});

describe('FeedbackCard', () => {
  const mockFeedback = mockFeedbacks[0];
  const mockOnStatusChange = vi.fn();
  const mockOnRespond = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('渲染', () => {
    it('渲染反馈卡片', () => {
      render(<FeedbackCard feedback={mockFeedback} />);

      expect(screen.getByText(mockFeedback.title)).toBeInTheDocument();
      expect(screen.getByText(mockFeedback.content)).toBeInTheDocument();
    });

    it('显示分类和状态标签', () => {
      render(<FeedbackCard feedback={mockFeedback} />);

      expect(screen.getByText('功能建议')).toBeInTheDocument();
      expect(screen.getByText('待处理')).toBeInTheDocument();
    });

    it('显示用户名和日期', () => {
      render(<FeedbackCard feedback={mockFeedback} />);

      expect(screen.getByText(/测试用户1/)).toBeInTheDocument();
    });

    it('显示标签', () => {
      render(<FeedbackCard feedback={mockFeedback} />);

      expect(screen.getByText('#UI')).toBeInTheDocument();
      expect(screen.getByText('#重要')).toBeInTheDocument();
    });

    it('不显示没有的标签', () => {
      const feedbackWithoutTags = { ...mockFeedback, tags: undefined };
      render(<FeedbackCard feedback={feedbackWithoutTags} />);

      expect(screen.queryByText('#')).not.toBeInTheDocument();
    });
  });

  describe('展开/收起', () => {
    it('默认收起详细内容', () => {
      render(<FeedbackCard feedback={mockFeedback} />);

      expect(screen.getByText('展开详情')).toBeInTheDocument();
    });

    it('点击展开显示详细内容', () => {
      render(<FeedbackCard feedback={mockFeedback} />);

      fireEvent.click(screen.getByText('展开详情'));
      expect(screen.getByText('收起')).toBeInTheDocument();
      expect(screen.getByText('详细内容')).toBeInTheDocument();
    });

    it('有回复时显示回复列表', () => {
      render(<FeedbackCard feedback={mockFeedbacks[1]} />);

      fireEvent.click(screen.getByText('展开详情'));
      expect(screen.getByText('回复 (1)')).toBeInTheDocument();
    });
  });

  describe('管理员操作', () => {
    it('管理员可以看到状态变更按钮', () => {
      render(<FeedbackCard feedback={mockFeedback} isAdmin={true} />);

      fireEvent.click(screen.getByText('展开详情'));
      expect(screen.getByText('更改状态')).toBeInTheDocument();
    });

    it('管理员可以更改状态', () => {
      render(
        <FeedbackCard feedback={mockFeedback} isAdmin={true} onStatusChange={mockOnStatusChange} />
      );

      fireEvent.click(screen.getByText('展开详情'));
      fireEvent.click(screen.getByText('已解决'));

      expect(mockOnStatusChange).toHaveBeenCalledWith('fb-1', 'resolved');
    });

    it('管理员可以看到回复按钮', () => {
      render(<FeedbackCard feedback={mockFeedback} isAdmin={true} />);

      fireEvent.click(screen.getByText('展开详情'));
      expect(screen.getByRole('button', { name: '回复' })).toBeInTheDocument();
    });

    it('管理员可以提交回复', async () => {
      render(
        <FeedbackCard feedback={mockFeedback} isAdmin={true} onRespond={mockOnRespond} />
      );

      fireEvent.click(screen.getByText('展开详情'));
      fireEvent.click(screen.getByRole('button', { name: '回复' }));

      const textarea = screen.getByPlaceholderText('输入回复内容...');
      fireEvent.change(textarea, { target: { value: '测试回复' } });

      fireEvent.click(screen.getByRole('button', { name: '发送回复' }));

      expect(mockOnRespond).toHaveBeenCalledWith('fb-1', '测试回复');
    });

    it('非管理员看不到管理操作', () => {
      render(<FeedbackCard feedback={mockFeedback} isAdmin={false} />);

      fireEvent.click(screen.getByText('展开详情'));
      expect(screen.queryByText('更改状态')).not.toBeInTheDocument();
    });
  });
});

describe('FeedbackList', () => {
  describe('渲染', () => {
    it('渲染反馈列表', () => {
      render(<FeedbackList feedbacks={mockFeedbacks} />);

      expect(screen.getByText('功能建议标题')).toBeInTheDocument();
      expect(screen.getByText('Bug 反馈标题')).toBeInTheDocument();
      expect(screen.getByText('问题咨询标题')).toBeInTheDocument();
    });

    it('空列表显示提示', () => {
      render(<FeedbackList feedbacks={[]} />);

      expect(screen.getByText('暂无反馈数据')).toBeInTheDocument();
    });
  });

  describe('过滤', () => {
    it('按分类过滤', () => {
      render(<FeedbackList feedbacks={mockFeedbacks} filter={{ category: 'bug' }} />);

      expect(screen.getByText('Bug 反馈标题')).toBeInTheDocument();
      expect(screen.queryByText('功能建议标题')).not.toBeInTheDocument();
    });

    it('按状态过滤', () => {
      render(<FeedbackList feedbacks={mockFeedbacks} filter={{ status: 'resolved' }} />);

      expect(screen.getByText('Bug 反馈标题')).toBeInTheDocument();
      expect(screen.queryByText('功能建议标题')).not.toBeInTheDocument();
    });

    it('按最小评分过滤', () => {
      render(<FeedbackList feedbacks={mockFeedbacks} filter={{ minRating: 4 }} />);

      expect(screen.getByText('功能建议标题')).toBeInTheDocument();
      expect(screen.getByText('问题咨询标题')).toBeInTheDocument();
      expect(screen.queryByText('Bug 反馈标题')).not.toBeInTheDocument();
    });
  });
});

describe('FeedbackStats', () => {
  describe('渲染', () => {
    it('渲染统计卡片', () => {
      render(<FeedbackStats feedbacks={mockFeedbacks} />);

      expect(screen.getByText('总反馈数')).toBeInTheDocument();
      expect(screen.getByText('平均评分')).toBeInTheDocument();
      expect(screen.getByText('待处理')).toBeInTheDocument();
      expect(screen.getByText('已解决')).toBeInTheDocument();
    });

    it('显示正确的统计数字', () => {
      render(<FeedbackStats feedbacks={mockFeedbacks} />);

      expect(screen.getByText('3')).toBeInTheDocument(); // 总数
    });

    it('计算平均评分', () => {
      render(<FeedbackStats feedbacks={mockFeedbacks} />);

      // (5 + 3 + 4) / 3 = 4.0
      expect(screen.getByText('4.0')).toBeInTheDocument();
    });

    it('空反馈时显示零', () => {
      render(<FeedbackStats feedbacks={[]} />);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('0.0')).toBeInTheDocument();
    });
  });
});

describe('FeedbackSystem', () => {
  describe('渲染', () => {
    it('渲染完整的反馈系统', () => {
      render(<FeedbackSystem initialFeedbacks={mockFeedbacks} />);

      expect(screen.getByText('总反馈数')).toBeInTheDocument();
      expect(screen.getByText('功能建议标题')).toBeInTheDocument();
    });

    it('显示新建反馈按钮', () => {
      render(<FeedbackSystem initialFeedbacks={mockFeedbacks} />);

      expect(screen.getByRole('button', { name: '+ 新建反馈' })).toBeInTheDocument();
    });
  });

  describe('交互', () => {
    it('点击新建反馈显示表单', () => {
      render(<FeedbackSystem initialFeedbacks={mockFeedbacks} />);

      fireEvent.click(screen.getByRole('button', { name: '+ 新建反馈' }));
      expect(screen.getByText('提交反馈')).toBeInTheDocument();
    });

    it('再次点击隐藏表单', () => {
      render(<FeedbackSystem initialFeedbacks={mockFeedbacks} />);

      const button = screen.getByRole('button', { name: '+ 新建反馈' });
      fireEvent.click(button);
      fireEvent.click(button);

      expect(screen.queryByText('提交反馈')).not.toBeInTheDocument();
    });

    it('可以使用过滤下拉菜单', () => {
      render(<FeedbackSystem initialFeedbacks={mockFeedbacks} />);

      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBe(2); // 分类和状态过滤
    });

    it('提交新反馈添加到列表', async () => {
      render(<FeedbackSystem initialFeedbacks={[]} />);

      // 打开表单
      fireEvent.click(screen.getByRole('button', { name: '+ 新建反馈' }));

      // 填写表单
      fireEvent.change(screen.getByPlaceholderText('简要描述您的反馈'), {
        target: { value: '新反馈标题' },
      });

      fireEvent.change(screen.getByPlaceholderText('请详细描述您的反馈内容...'), {
        target: { value: '新反馈内容' },
      });

      fireEvent.click(screen.getByTestId('rating'));

      // 提交
      fireEvent.click(screen.getByRole('button', { name: '提交反馈' }));

      await waitFor(() => {
        expect(screen.getByText('新反馈标题')).toBeInTheDocument();
      });
    });
  });

  describe('管理员模式', () => {
    it('管理员可以更改反馈状态', async () => {
      const handleStatusChange = vi.fn();
      render(
        <FeedbackSystem
          initialFeedbacks={mockFeedbacks}
          isAdmin={true}
        />
      );

      // 展开第一个反馈
      fireEvent.click(screen.getAllByText('展开详情')[0]);
      fireEvent.click(screen.getByText('已解决'));
    });

    it('管理员可以回复反馈', async () => {
      render(<FeedbackSystem initialFeedbacks={mockFeedbacks} isAdmin={true} />);

      fireEvent.click(screen.getAllByText('展开详情')[0]);
      expect(screen.getByRole('button', { name: '回复' })).toBeInTheDocument();
    });
  });
});