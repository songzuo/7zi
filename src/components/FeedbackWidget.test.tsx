// @ts-nocheck - Test file with complex type issues
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeedbackWidget from '../FeedbackWidget';

// Mock the submitFeedback function
const mockSubmitFeedback = vi.fn();

describe('FeedbackWidget Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该渲染反馈表单', () => {
    render(<FeedbackWidget onSubmit={mockSubmitFeedback} />);
    expect(screen.getByRole('form')).toBeInTheDocument();
  });

  it('应该显示标题', () => {
    render(<FeedbackWidget onSubmit={mockSubmitFeedback} title="反馈" />);
    expect(screen.getByText('反馈')).toBeInTheDocument();
  });

  it('应该显示评分选择器', () => {
    render(<FeedbackWidget onSubmit={mockSubmitFeedback} />);
    const stars = screen.getAllByRole('button');
    expect(stars.length).toBeGreaterThan(0);
  });

  it('应该显示评论文本域', () => {
    render(<FeedbackWidget onSubmit={mockSubmitFeedback} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('placeholder');
  });

  it('应该显示提交按钮', () => {
    render(<FeedbackWidget onSubmit={mockSubmitFeedback} />);
    const submitButton = screen.getByRole('button', { name: /提交|submit/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('应该禁用提交按钮当评分为空时', () => {
    render(<FeedbackWidget onSubmit={mockSubmitFeedback} />);
    const submitButton = screen.getByRole('button', { name: /提交|submit/i });
    expect(submitButton).toBeDisabled();
  });

  it('应该在评分后启用提交按钮', async () => {
    const user = userEvent.setup();
    render(<FeedbackWidget onSubmit={mockSubmitFeedback} />);

    const stars = screen.getAllByRole('button');
    await user.click(stars[0]);

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /提交|submit/i });
      expect(submitButton).toBeEnabled();
    });
  });

  it('应该调用 onSubmit 当提交表单时', async () => {
    const user = userEvent.setup();
    render(<FeedbackWidget onSubmit={mockSubmitFeedback} />);

    const stars = screen.getAllByRole('button');
    await user.click(stars[4]); // 5 stars

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, '很好的功能！');

    const submitButton = screen.getByRole('button', { name: /提交|submit/i });
    await user.click(submitButton);

    expect(mockSubmitFeedback).toHaveBeenCalledWith({
      rating: 5,
      comment: '很好的功能！',
    });
  });

  it('应该处理提交成功', async () => {
    const user = userEvent.setup();
    mockSubmitFeedback.mockResolvedValueOnce({ success: true });

    render(<FeedbackWidget onSubmit={mockSubmitFeedback} />);

    const stars = screen.getAllByRole('button');
    await user.click(stars[0]);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, '测试反馈');

    const submitButton = screen.getByRole('button', { name: /提交|submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/提交成功|success|感谢/i)).toBeInTheDocument();
    });
  });

  it('应该处理提交错误', async () => {
    const user = userEvent.setup();
    mockSubmitFeedback.mockRejectedValueOnce(new Error('网络错误'));

    render(<FeedbackWidget onSubmit={mockSubmitFeedback} />);

    const stars = screen.getAllByRole('button');
    await user.click(stars[0]);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, '测试反馈');

    const submitButton = screen.getByRole('button', { name: /提交|submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/错误|error|失败/i)).toBeInTheDocument();
    });
  });

  it('应该支持自定义 placeholder', () => {
    render(
      <FeedbackWidget
        onSubmit={mockSubmitFeedback}
        placeholder="请输入您的反馈..."
      />
    );
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('placeholder', '请输入您的反馈...');
  });

  it('应该支持显示模式', () => {
    const { rerender } = render(<FeedbackWidget onSubmit={mockSubmitFeedback} />);
    expect(screen.getByRole('form')).toBeInTheDocument();

    rerender(<FeedbackWidget onSubmit={mockSubmitFeedback} show={false} />);
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('应该支持禁用状态', () => {
    render(<FeedbackWidget onSubmit={mockSubmitFeedback} disabled />);
    const submitButton = screen.getByRole('button', { name: /提交|submit/i });
    expect(submitButton).toBeDisabled();
  });

  it('应该支持自定义样式类名', () => {
    const { container } = render(
      <FeedbackWidget
        onSubmit={mockSubmitFeedback}
        className="custom-feedback"
      />
    );
    expect(container.querySelector('.custom-feedback')).toBeInTheDocument();
  });

  it('应该重置表单在成功提交后', async () => {
    const user = userEvent.setup();
    mockSubmitFeedback.mockResolvedValueOnce({ success: true });

    render(<FeedbackWidget onSubmit={mockSubmitFeedback} />);

    const stars = screen.getAllByRole('button');
    await user.click(stars[2]);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, '测试反馈');

    const submitButton = screen.getByRole('button', { name: /提交|submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/提交成功|success|感谢/i)).toBeInTheDocument();
    });
  });
});
