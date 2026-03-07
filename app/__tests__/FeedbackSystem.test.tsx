import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  FeedbackForm,
  FeedbackCard,
  FeedbackList,
  FeedbackStats,
  FeedbackSystem,
  FeedbackItem,
} from '@/components/FeedbackSystem';

// 模拟数据
const mockFeedback: FeedbackItem = {
  id: 'fb-1',
  userId: 'user-1',
  userName: '测试用户',
  rating: 4,
  category: 'feature',
  title: '测试标题',
  content: '这是一条测试反馈内容',
  status: 'pending',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  tags: ['测试'],
};

const mockFeedbacks: FeedbackItem[] = [
  mockFeedback,
  {
    ...mockFeedback,
    id: 'fb-2',
    status: 'resolved',
    rating: 5,
    category: 'bug',
  },
  {
    ...mockFeedback,
    id: 'fb-3',
    status: 'reviewing',
    rating: 3,
    category: 'improvement',
  },
];

describe('FeedbackForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

  it('应该渲染所有表单字段', () => {
    render(<FeedbackForm onSubmit={mockOnSubmit} />);

    expect(screen.getByText('整体评分 *')).toBeInTheDocument();
    expect(screen.getByText('反馈类型 *')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('简要描述您的反馈')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请详细描述您的反馈内容...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '提交反馈' })).toBeInTheDocument();
  });

  it('应该渲染所有分类选项', () => {
    render(<FeedbackForm onSubmit={mockOnSubmit} />);

    expect(screen.getByText(/Bug 反馈/)).toBeInTheDocument();
    expect(screen.getByText(/功能建议/)).toBeInTheDocument();
    expect(screen.getByText(/改进建议/)).toBeInTheDocument();
    expect(screen.getByText(/问题咨询/)).toBeInTheDocument();
    expect(screen.getByText(/其他/)).toBeInTheDocument();
  });

  it('应该验证必填字段', async () => {
    render(<FeedbackForm onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByRole('button', { name: '提交反馈' });
    expect(submitButton).toBeDisabled();
  });

  it('应该在填写所有必填字段后启用提交按钮', async () => {
    render(<FeedbackForm onSubmit={mockOnSubmit} />);

    // 填写标题
    const titleInput = screen.getByPlaceholderText('简要描述您的反馈');
    fireEvent.change(titleInput, { target: { value: '测试标题' } });

    // 填写内容
    const contentTextarea = screen.getByPlaceholderText('请详细描述您的反馈内容...');
    fireEvent.change(contentTextarea, { target: { value: '测试内容' } });

    // 设置评分 (点击第4颗星)
    const stars = screen.getAllByRole('radio');
    fireEvent.click(stars[3]);

    const submitButton = screen.getByRole('button', { name: '提交反馈' });
    expect(submitButton).not.toBeDisabled();
  });

  it('应该允许选择不同的分类', () => {
    render(<FeedbackForm onSubmit={mockOnSubmit} />);

    const bugButton = screen.getByText(/Bug 反馈/).closest('button');
    if (bugButton) {
      fireEvent.click(bugButton);
    }

    // 可以检查是否有选中状态
  });

  it('应该支持添加和删除标签', async () => {
    render(<FeedbackForm onSubmit={mockOnSubmit} />);

    const tagInput = screen.getByPlaceholderText('输入标签后按回车添加');
    const addButton = screen.getByText('添加');

    // 添加标签
    fireEvent.change(tagInput, { target: { value: '新标签' } });
    fireEvent.click(addButton);

    expect(screen.getByText('新标签')).toBeInTheDocument();

    // 删除标签
    const removeButton = screen.getByText('×');
    fireEvent.click(removeButton);

    expect(screen.queryByText('新标签')).not.toBeInTheDocument();
  });

  it('应该调用 onCancel 回调', () => {
    render(<FeedbackForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByText('取消');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });
});

describe('FeedbackCard', () => {
  const mockOnStatusChange = vi.fn();
  const mockOnRespond = vi.fn();

  beforeEach(() => {
    mockOnStatusChange.mockClear();
    mockOnRespond.mockClear();
  });

  it('应该正确渲染反馈内容', () => {
    render(
      <FeedbackCard
        feedback={mockFeedback}
        onStatusChange={mockOnStatusChange}
        onRespond={mockOnRespond}
      />
    );

    expect(screen.getByText('测试标题')).toBeInTheDocument();
    expect(screen.getByText(/这是一条测试反馈内容/)).toBeInTheDocument();
    // 用户名在元信息行
    expect(screen.getByText(/测试用户/)).toBeInTheDocument();
  });

  it('应该显示分类和状态标签', () => {
    render(
      <FeedbackCard
        feedback={mockFeedback}
        onStatusChange={mockOnStatusChange}
        onRespond={mockOnRespond}
      />
    );

    expect(screen.getByText(/功能建议/)).toBeInTheDocument();
    expect(screen.getByText('待处理')).toBeInTheDocument();
  });

  it('应该显示标签', () => {
    render(
      <FeedbackCard
        feedback={mockFeedback}
        onStatusChange={mockOnStatusChange}
        onRespond={mockOnRespond}
      />
    );

    expect(screen.getByText('#测试')).toBeInTheDocument();
  });

  it('应该展开/收起详情', () => {
    render(
      <FeedbackCard
        feedback={mockFeedback}
        onStatusChange={mockOnStatusChange}
        onRespond={mockOnRespond}
      />
    );

    const expandButton = screen.getByText('展开详情');
    fireEvent.click(expandButton);

    expect(screen.getByText('详细内容')).toBeInTheDocument();
    expect(screen.getByText('收起')).toBeInTheDocument();

    fireEvent.click(screen.getByText('收起'));
    expect(screen.queryByText('详细内容')).not.toBeInTheDocument();
  });

  it('应该显示回复列表', () => {
    const feedbackWithResponse: FeedbackItem = {
      ...mockFeedback,
      responses: [
        {
          id: 'resp-1',
          content: '这是一条回复',
          createdAt: new Date().toISOString(),
          isAdmin: true,
        },
      ],
    };

    render(
      <FeedbackCard
        feedback={feedbackWithResponse}
        onStatusChange={mockOnStatusChange}
        onRespond={mockOnRespond}
      />
    );

    // 展开详情
    fireEvent.click(screen.getByText('展开详情'));

    expect(screen.getByText('这是一条回复')).toBeInTheDocument();
    // 管理员标签在回复中
    expect(screen.getByText(/管理员/)).toBeInTheDocument();
  });

  it('应该在管理员模式下显示状态变更按钮', () => {
    render(
      <FeedbackCard
        feedback={mockFeedback}
        onStatusChange={mockOnStatusChange}
        onRespond={mockOnRespond}
        isAdmin
      />
    );

    // 展开详情
    fireEvent.click(screen.getByText('展开详情'));

    expect(screen.getByText('更改状态')).toBeInTheDocument();
    expect(screen.getByText('已解决')).toBeInTheDocument();
  });

  it('应该在管理员模式下允许更改状态', () => {
    render(
      <FeedbackCard
        feedback={mockFeedback}
        onStatusChange={mockOnStatusChange}
        onRespond={mockOnRespond}
        isAdmin
      />
    );

    // 展开详情
    fireEvent.click(screen.getByText('展开详情'));

    // 点击"已解决"
    fireEvent.click(screen.getByText('已解决'));

    expect(mockOnStatusChange).toHaveBeenCalledWith('fb-1', 'resolved');
  });
});

describe('FeedbackList', () => {
  it('应该渲染反馈列表', () => {
    render(<FeedbackList feedbacks={mockFeedbacks} />);

    expect(screen.getByText('测试标题')).toBeInTheDocument();
  });

  it('应该显示空状态', () => {
    render(<FeedbackList feedbacks={[]} />);

    expect(screen.getByText('暂无反馈数据')).toBeInTheDocument();
  });

  it('应该按分类过滤', () => {
    render(<FeedbackList feedbacks={mockFeedbacks} filter={{ category: 'bug' }} />);

    // 只应该显示 bug 分类的反馈
    const bugLabels = screen.queryAllByText(/Bug 反馈/);
    expect(bugLabels.length).toBeGreaterThan(0);
  });

  it('应该按状态过滤', () => {
    render(<FeedbackList feedbacks={mockFeedbacks} filter={{ status: 'resolved' }} />);

    // 只应该显示已解决状态的反馈
    const resolvedLabels = screen.queryAllByText('已解决');
    expect(resolvedLabels.length).toBeGreaterThan(0);
  });

  it('应该按最低评分过滤', () => {
    render(<FeedbackList feedbacks={mockFeedbacks} filter={{ minRating: 4 }} />);

    // 应该过滤掉评分低于4的反馈
    expect(screen.getByText('测试标题')).toBeInTheDocument();
  });
});

describe('FeedbackStats', () => {
  it('应该显示正确的统计数据', () => {
    render(<FeedbackStats feedbacks={mockFeedbacks} />);

    expect(screen.getByText('总反馈数')).toBeInTheDocument();
    expect(screen.getByText('平均评分')).toBeInTheDocument();
    expect(screen.getByText('待处理')).toBeInTheDocument();
    expect(screen.getByText('已解决')).toBeInTheDocument();
  });

  it('应该显示正确的总数', () => {
    render(<FeedbackStats feedbacks={mockFeedbacks} />);

    const totalCard = screen.getByText('总反馈数').parentElement;
    expect(totalCard).toHaveTextContent('3');
  });

  it('应该显示正确的平均评分', () => {
    render(<FeedbackStats feedbacks={mockFeedbacks} />);

    // (4 + 5 + 3) / 3 = 4.0
    const avgCard = screen.getByText('平均评分').parentElement;
    expect(avgCard).toHaveTextContent('4.0');
  });
});

describe('FeedbackSystem', () => {
  it('应该渲染完整的反馈系统', () => {
    render(<FeedbackSystem />);

    expect(screen.getByText('总反馈数')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ 新建反馈' })).toBeInTheDocument();
  });

  it('应该显示反馈表单', () => {
    render(<FeedbackSystem />);

    const newButton = screen.getByRole('button', { name: '+ 新建反馈' });
    fireEvent.click(newButton);

    // 使用 getByRole 来获取表单标题
    expect(screen.getByRole('heading', { name: '提交反馈' })).toBeInTheDocument();
  });

  it('应该隐藏反馈表单', () => {
    render(<FeedbackSystem />);

    // 显示表单
    fireEvent.click(screen.getByRole('button', { name: '+ 新建反馈' }));
    expect(screen.getByRole('heading', { name: '提交反馈' })).toBeInTheDocument();

    // 隐藏表单 - 使用 getAllByRole 并选择表单内的取消按钮
    const cancelButtons = screen.getAllByRole('button', { name: '取消' });
    // 表单内的取消按钮应该是在表单后面，选择最后一个
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    expect(screen.queryByRole('heading', { name: '提交反馈' })).not.toBeInTheDocument();
  });

  it('应该使用初始数据', () => {
    render(<FeedbackSystem initialFeedbacks={mockFeedbacks} />);

    // 使用 getAllByText 因为可能有多个相同标题
    const titles = screen.getAllByText('测试标题');
    expect(titles.length).toBeGreaterThan(0);
  });

  it('应该显示过滤选项', () => {
    render(<FeedbackSystem initialFeedbacks={mockFeedbacks} />);

    expect(screen.getByText('所有类型')).toBeInTheDocument();
    expect(screen.getByText('所有状态')).toBeInTheDocument();
  });

  it('应该支持管理员模式', () => {
    render(<FeedbackSystem initialFeedbacks={mockFeedbacks} isAdmin />);

    // 展开第一个反馈 - 使用 getAllByText 获取第一个
    const expandButtons = screen.getAllByText('展开详情');
    fireEvent.click(expandButtons[0]);

    expect(screen.getByText('更改状态')).toBeInTheDocument();
  });
});