/**
 * @fileoverview 通知徽章组件测试
 * @description 测试 NotificationBadge 组件的功能
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotificationBadge } from './NotificationBadge';

describe('NotificationBadge', () => {
  it('应该显示正确的数量', () => {
    render(<NotificationBadge count={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('数量为0时不应该显示', () => {
    const { container } = render(<NotificationBadge count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('数量为负数时不应该显示', () => {
    const { container } = render(<NotificationBadge count={-1} />);
    expect(container.firstChild).toBeNull();
  });

  it('超过最大数量应该显示 "99+"', () => {
    render(<NotificationBadge count={100} maxCount={99} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('等于最大数量时应该显示具体数字', () => {
    render(<NotificationBadge count={99} maxCount={99} />);
    expect(screen.getByText('99')).toBeInTheDocument();
  });

  it('应该有正确的 aria-label', () => {
    render(<NotificationBadge count={3} />);
    expect(screen.getByLabelText('3 条未读通知')).toBeInTheDocument();
  });

  it('应该支持自定义 maxCount', () => {
    render(<NotificationBadge count={50} maxCount={10} />);
    expect(screen.getByText('10+')).toBeInTheDocument();
  });
});