import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemberCard } from '../components/MemberCard';
import { AIMember } from '../app/dashboard/page';

// 清理 React StrictMode 导致的重复渲染
afterEach(() => {
  cleanup();
});

// ============================================================================
// 测试数据
// ============================================================================
const createMockMember = (overrides?: Partial<AIMember>): AIMember => ({
  id: 'test-1',
  name: '测试代理',
  emoji: '🤖',
  role: '测试工程师',
  provider: 'test-provider',
  status: 'working',
  avatar: 'https://example.com/avatar.png',
  completedTasks: 10,
  ...overrides,
});

// ============================================================================
// MemberCard 正常模式测试
// ============================================================================
describe('MemberCard (Normal Mode)', () => {
  it('renders member information correctly', () => {
    const member = createMockMember();
    render(<MemberCard member={member} />);

    expect(screen.getByText('🤖 测试代理')).toBeDefined();
    expect(screen.getByText('测试工程师')).toBeDefined();
    expect(screen.getByText(/提供商：test-provider/)).toBeDefined();
  });

  it('displays completed tasks count', () => {
    const member = createMockMember({ completedTasks: 25 });
    render(<MemberCard member={member} />);

    expect(screen.getByText('25')).toBeDefined();
    expect(screen.getByText('完成任务')).toBeDefined();
  });

  it('shows current task when present', () => {
    const member = createMockMember({ currentTask: '编写测试用例' });
    render(<MemberCard member={member} />);

    expect(screen.getByText(/编写测试用例/)).toBeDefined();
  });

  it('hides current task when not present', () => {
    const member = createMockMember();
    delete member.currentTask;
    render(<MemberCard member={member} />);

    expect(screen.queryByText(/📌/)).toBeNull();
  });
});

// ============================================================================
// MemberCard 紧凑模式测试
// ============================================================================
describe('MemberCard (Compact Mode)', () => {
  it('renders in compact mode when compact prop is true', () => {
    const member = createMockMember();
    const { container } = render(<MemberCard member={member} compact={true} />);

    // 紧凑模式使用 hover:bg-gray-50
    const article = container.querySelector('.hover\\:bg-gray-50');
    expect(article).toBeDefined();
  });

  it('shows member name and status in compact mode', () => {
    const member = createMockMember();
    render(<MemberCard member={member} compact={true} />);

    expect(screen.getByText('🤖 测试代理')).toBeDefined();
    expect(screen.getByText('工作中')).toBeDefined();
  });

  it('shows role and provider in compact mode', () => {
    const member = createMockMember();
    render(<MemberCard member={member} compact={true} />);

    expect(screen.getByText('测试工程师')).toBeDefined();
    expect(screen.getByText('test-provider')).toBeDefined();
  });

  it('shows current task in compact mode when present', () => {
    const member = createMockMember({ currentTask: '代码审查' });
    render(<MemberCard member={member} compact={true} />);

    expect(screen.getByText(/代码审查/)).toBeDefined();
  });

  it('shows completed tasks count in compact mode', () => {
    const member = createMockMember({ completedTasks: 15 });
    render(<MemberCard member={member} compact={true} />);

    expect(screen.getByText('15')).toBeDefined();
  });
});

// ============================================================================
// 状态显示测试
// ============================================================================
describe('MemberCard Status Display', () => {
  it('displays "working" status correctly', () => {
    const member = createMockMember({ status: 'working' });
    render(<MemberCard member={member} />);

    expect(screen.getByText('工作中')).toBeDefined();
  });

  it('displays "busy" status correctly', () => {
    const member = createMockMember({ status: 'busy' });
    render(<MemberCard member={member} />);

    expect(screen.getByText('忙碌')).toBeDefined();
  });

  it('displays "idle" status correctly', () => {
    const member = createMockMember({ status: 'idle' });
    render(<MemberCard member={member} />);

    expect(screen.getByText('空闲')).toBeDefined();
  });

  it('displays "offline" status correctly', () => {
    const member = createMockMember({ status: 'offline' });
    render(<MemberCard member={member} />);

    expect(screen.getByText('离线')).toBeDefined();
  });

  it('has correct status color indicator for working', () => {
    const member = createMockMember({ status: 'working' });
    const { container } = render(<MemberCard member={member} />);

    expect(container.querySelector('.bg-green-500')).toBeDefined();
  });

  it('has correct status color indicator for busy', () => {
    const member = createMockMember({ status: 'busy' });
    const { container } = render(<MemberCard member={member} />);

    expect(container.querySelector('.bg-yellow-500')).toBeDefined();
  });

  it('has correct status color indicator for idle', () => {
    const member = createMockMember({ status: 'idle' });
    const { container } = render(<MemberCard member={member} />);

    expect(container.querySelector('.bg-gray-400')).toBeDefined();
  });

  it('has correct status color indicator for offline', () => {
    const member = createMockMember({ status: 'offline' });
    const { container } = render(<MemberCard member={member} />);

    expect(container.querySelector('.bg-gray-500')).toBeDefined();
  });
});

// ============================================================================
// 头像测试
// ============================================================================
describe('MemberCard Avatar', () => {
  it('renders avatar image with correct src', () => {
    const member = createMockMember();
    const { container } = render(<MemberCard member={member} />);

    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://example.com/avatar.png');
  });

  it('falls back to dicebear avatar on error', () => {
    const member = createMockMember({ id: 'fallback-test' });
    const { container } = render(<MemberCard member={member} />);

    const img = container.querySelector('img') as HTMLImageElement;
    
    // 模拟图片加载失败
    fireEvent.error(img);

    expect(img.src).toContain('dicebear');
    expect(img.src).toContain('fallback-test');
  });

  it('has correct avatar size in normal mode', () => {
    const member = createMockMember();
    const { container } = render(<MemberCard member={member} />);

    const img = container.querySelector('img');
    expect(img?.className).toContain('w-12');
    expect(img?.className).toContain('h-12');
  });

  it('has correct avatar size in compact mode', () => {
    const member = createMockMember();
    const { container } = render(<MemberCard member={member} compact={true} />);

    const img = container.querySelector('img');
    expect(img?.className).toContain('w-10');
    expect(img?.className).toContain('h-10');
  });
});

// ============================================================================
// 可访问性测试
// ============================================================================
describe('MemberCard Accessibility', () => {
  it('has article element for semantic structure', () => {
    const member = createMockMember();
    const { container } = render(<MemberCard member={member} />);

    const article = container.querySelector('article');
    expect(article).toBeDefined();
  });

  it('has aria-labelledby for member name', () => {
    const member = createMockMember({ id: 'a11y-test' });
    render(<MemberCard member={member} />);

    const title = screen.getByText('🤖 测试代理');
    expect(title.id).toBe('member-a11y-test-title');
  });

  it('has sr-only text for status', () => {
    const member = createMockMember({ name: '可访问性代理', status: 'working' });
    const { container } = render(<MemberCard member={member} />);

    const srOnly = container.querySelector('.sr-only');
    expect(srOnly?.textContent).toContain('可访问性代理');
    expect(srOnly?.textContent).toContain('工作中');
  });

  it('has aria-label for status badge', () => {
    const member = createMockMember({ status: 'busy' });
    render(<MemberCard member={member} />);

    const statusBadge = screen.getByLabelText('状态：忙碌');
    expect(statusBadge).toBeDefined();
  });

  it('has aria-label for completed tasks', () => {
    const member = createMockMember({ completedTasks: 42 });
    render(<MemberCard member={member} />);

    const tasksInfo = screen.getByLabelText(/已完成 42 个任务/);
    expect(tasksInfo).toBeDefined();
  });

  it('has aria-label for current task', () => {
    const member = createMockMember({ currentTask: '修复Bug' });
    render(<MemberCard member={member} />);

    const taskInfo = screen.getByLabelText('当前任务：修复Bug');
    expect(taskInfo).toBeDefined();
  });
});

// ============================================================================
// 样式和交互测试
// ============================================================================
describe('MemberCard Styles and Interaction', () => {
  it('has hover shadow effect in normal mode', () => {
    const member = createMockMember();
    const { container } = render(<MemberCard member={member} />);

    const article = container.querySelector('article');
    expect(article?.className).toContain('hover:shadow-md');
  });

  it('has hover background in compact mode', () => {
    const member = createMockMember();
    const { container } = render(<MemberCard member={member} compact={true} />);

    const article = container.querySelector('article');
    expect(article?.className).toContain('hover:bg-gray-50');
  });

  it('has focus-within ring in normal mode', () => {
    const member = createMockMember();
    const { container } = render(<MemberCard member={member} />);

    const article = container.querySelector('article');
    expect(article?.className).toContain('focus-within:ring-2');
    expect(article?.className).toContain('focus-within:ring-blue-500');
  });

  it('has transition effects', () => {
    const member = createMockMember();
    const { container } = render(<MemberCard member={member} />);

    const article = container.querySelector('article');
    expect(article?.className).toContain('transition-shadow');
  });
});

// ============================================================================
// 边界情况测试
// ============================================================================
describe('MemberCard Edge Cases', () => {
  it('handles zero completed tasks', () => {
    const member = createMockMember({ completedTasks: 0 });
    render(<MemberCard member={member} />);

    expect(screen.getByText('0')).toBeDefined();
  });

  it('handles large completed tasks count', () => {
    const member = createMockMember({ completedTasks: 9999 });
    render(<MemberCard member={member} />);

    expect(screen.getByText('9999')).toBeDefined();
  });

  it('handles long member name', () => {
    const member = createMockMember({ 
      name: '这是一个非常非常非常非常长的代理名称用于测试文本截断效果',
      emoji: '🚀'
    });
    render(<MemberCard member={member} />);

    // 使用 getAllByText 因为文本可能在多个元素中出现 (sr-only 和标题)
    const elements = screen.getAllByText(/这是一个非常/);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('handles long current task', () => {
    const member = createMockMember({ 
      currentTask: '这是一个非常非常非常长的任务名称用于测试文本截断效果在紧凑模式下显示'
    });
    render(<MemberCard member={member} compact={true} />);

    // 应该有 truncate 类
    const taskElement = screen.getByText(/这是一个非常/);
    expect(taskElement.className).toContain('truncate');
  });

  it('handles emoji in member name', () => {
    const member = createMockMember({ name: '测试', emoji: '🌟' });
    render(<MemberCard member={member} />);

    expect(screen.getByText('🌟 测试')).toBeDefined();
  });

  it('handles special characters in role', () => {
    const member = createMockMember({ role: '前端 & UI/UX <工程师>' });
    render(<MemberCard member={member} />);

    expect(screen.getByText('前端 & UI/UX <工程师>')).toBeDefined();
  });
});

// ============================================================================
// Props 验证测试
// ============================================================================
describe('MemberCard Props Validation', () => {
  it('uses default compact value (false) when not provided', () => {
    const member = createMockMember();
    const { container } = render(<MemberCard member={member} />);

    // 正常模式应该有 border 类
    const article = container.querySelector('article');
    expect(article?.className).toContain('border');
  });

  it('requires member prop', () => {
    // TypeScript 会在编译时检查，但运行时应该能正常渲染
    const member = createMockMember();
    expect(() => render(<MemberCard member={member} />)).not.toThrow();
  });
});