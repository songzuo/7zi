/**
 * @fileoverview MemberCard 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemberCard, AIMember } from '../MemberCard';

const mockMember: AIMember = {
  id: '1',
  name: '测试AI',
  role: '测试工程师',
  emoji: '🧪',
  avatar: '/test-avatar.png',
  status: 'working',
  provider: 'test-provider',
  currentTask: '编写测试用例',
  completedTasks: 42,
};

describe('MemberCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Next.js Image component
    vi.mock('next/image', () => ({
      __esModule: true,
      default: ({ src, alt, className, unoptimized }: { src: string; alt?: string; className?: string; unoptimized?: boolean }) => (
        <img src={src} alt={alt} className={className} data-unoptimized={unoptimized} />
      ),
    }));
  });

  describe('默认（非紧凑）模式渲染', () => {
    it('应该正确显示成员信息', () => {
      render(<MemberCard member={mockMember} />);

      expect(screen.getByText('🧪 测试AI')).toBeInTheDocument();
      expect(screen.getByText('测试工程师')).toBeInTheDocument();
      expect(screen.getByText('提供商：test-provider')).toBeInTheDocument();
    });

    it('应该显示当前任务', () => {
      render(<MemberCard member={mockMember} />);

      expect(screen.getByText('📌 编写测试用例')).toBeInTheDocument();
    });

    it('应该显示完成任务数', () => {
      render(<MemberCard member={mockMember} />);

      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('完成任务')).toBeInTheDocument();
    });

    it('不应该显示未提供的当前任务', () => {
      const memberWithoutTask = { ...mockMember, currentTask: undefined };
      render(<MemberCard member={memberWithoutTask} />);

      expect(screen.queryByText('📌')).not.toBeInTheDocument();
    });

    it('应该正确显示工作状态', () => {
      render(<MemberCard member={mockMember} />);

      expect(screen.getByText('工作中')).toBeInTheDocument();
    });

    it('应该正确显示忙碌状态', () => {
      const busyMember = { ...mockMember, status: 'busy' as const };
      render(<MemberCard member={busyMember} />);

      expect(screen.getByText('忙碌')).toBeInTheDocument();
    });

    it('应该正确显示空闲状态', () => {
      const idleMember = { ...mockMember, status: 'idle' as const };
      render(<MemberCard member={idleMember} />);

      expect(screen.getByText('空闲')).toBeInTheDocument();
    });

    it('应该正确显示离线状态', () => {
      const offlineMember = { ...mockMember, status: 'offline' as const };
      render(<MemberCard member={offlineMember} />);

      expect(screen.getByText('离线')).toBeInTheDocument();
    });
  });

  describe('紧凑模式渲染', () => {
    it('应该正确渲染紧凑卡片', () => {
      render(<MemberCard member={mockMember} compact />);

      expect(screen.getByText('🧪 测试AI')).toBeInTheDocument();
      expect(screen.getByText('测试工程师')).toBeInTheDocument();
    });

    it('应该在紧凑模式下显示状态徽章', () => {
      render(<MemberCard member={mockMember} compact />);

      expect(screen.getByText('工作中')).toBeInTheDocument();
    });

    it('应该在紧凑模式下显示当前任务', () => {
      render(<MemberCard member={mockMember} compact />);

      expect(screen.getByText('📌 编写测试用例')).toBeInTheDocument();
    });

    it('应该在紧凑模式下显示完成任务数', () => {
      render(<MemberCard member={mockMember} compact />);

      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('应该在紧凑模式下显示提供商', () => {
      render(<MemberCard member={mockMember} compact />);

      expect(screen.getByText('test-provider')).toBeInTheDocument();
    });

    it('应该在紧凑模式下隐藏未提供的当前任务', () => {
      const memberWithoutTask = { ...mockMember, currentTask: undefined };
      render(<MemberCard member={memberWithoutTask} compact />);

      expect(screen.queryByText('📌')).not.toBeInTheDocument();
    });
  });

  describe('选择模式', () => {
    it('在选择模式下应该显示复选框', () => {
      const { container } = render(
        <MemberCard member={mockMember} isSelectionMode />
      );

      const checkbox = container.querySelector('.w-5.h-5.rounded');
      expect(checkbox).toBeInTheDocument();
    });

    it('选中时应该显示蓝色复选框', () => {
      const { container } = render(
        <MemberCard member={mockMember} isSelectionMode isSelected />
      );

      const checkbox = container.querySelector('.bg-blue-600');
      expect(checkbox).toBeInTheDocument();
    });

    it('未选中时应该显示灰色边框复选框', () => {
      const { container } = render(
        <MemberCard member={mockMember} isSelectionMode isSelected={false} />
      );

      const checkbox = container.querySelector('.border-gray-300');
      expect(checkbox).toBeInTheDocument();
    });

    it('点击应该调用 onSelect 回调', () => {
      const onSelect = vi.fn();
      const { container } = render(
        <MemberCard member={mockMember} isSelectionMode onSelect={onSelect} />
      );

      const card = container.querySelector('.px-4.py-3');
      if (card) {
        fireEvent.click(card);
        expect(onSelect).toHaveBeenCalledWith('1', expect.any(Object));
      }
    });

    it('选中时应该显示蓝色边框', () => {
      const { container } = render(
        <MemberCard member={mockMember} isSelectionMode isSelected />
      );

      const card = container.querySelector('.ring-2.ring-blue-500');
      expect(card).toBeInTheDocument();
    });
  });

  describe('点击交互', () => {
    it('非选择模式下点击应该调用 onClick 回调', () => {
      const onClick = vi.fn();
      const { container } = render(
        <MemberCard member={mockMember} onClick={onClick} />
      );

      const card = container.querySelector('.p-4');
      if (card) {
        fireEvent.click(card);
        expect(onClick).toHaveBeenCalledWith(mockMember);
      }
    });

    it('选择模式下点击应该调用 onSelect 而不是 onClick', () => {
      const onClick = vi.fn();
      const onSelect = vi.fn();
      const { container } = render(
        <MemberCard
          member={mockMember}
          isSelectionMode
          onClick={onClick}
          onSelect={onSelect}
        />
      );

      const card = container.querySelector('.px-4.py-3');
      if (card) {
        fireEvent.click(card);
        expect(onSelect).toHaveBeenCalledWith('1', expect.any(Object));
        expect(onClick).not.toHaveBeenCalled();
      }
    });
  });

  describe('样式和布局', () => {
    it('应该显示头像', () => {
      const { container } = render(<MemberCard member={mockMember} />);

      const avatar = container.querySelector('img[src="/test-avatar.png"]');
      expect(avatar).toBeInTheDocument();
    });

    it('应该显示状态指示器', () => {
      const { container } = render(<MemberCard member={mockMember} />);

      const statusDot = container.querySelector('.w-3.h-3.rounded-full');
      expect(statusDot).toBeInTheDocument();
    });

    it('应该有圆角边框', () => {
      const { container } = render(<MemberCard member={mockMember} />);

      const card = container.querySelector('.rounded-xl');
      expect(card).toBeInTheDocument();
    });

    it('紧凑模式下应该有不同的布局', () => {
      const { container } = render(<MemberCard member={mockMember} compact />);

      const card = container.querySelector('.px-4.py-3');
      expect(card).toBeInTheDocument();
    });
  });

  describe('hover 效果', () => {
    it('非选择模式下应该有 hover 效果', () => {
      const { container } = render(<MemberCard member={mockMember} />);

      const card = container.querySelector('.hover\\:-translate-y-1');
      expect(card).toBeInTheDocument();
    });

    it('选择模式下应该有 hover 效果', () => {
      const { container } = render(
        <MemberCard member={mockMember} isSelectionMode />
      );

      const card = container.querySelector('.hover\\:bg-blue-50');
      expect(card).toBeInTheDocument();
    });
  });

  describe('不同状态', () => {
    it('工作状态应该显示绿色指示器', () => {
      const { container } = render(<MemberCard member={mockMember} />);

      const statusDot = container.querySelector('.bg-green-500');
      expect(statusDot).toBeInTheDocument();
    });

    it('忙碌状态应该显示黄色指示器', () => {
      const busyMember = { ...mockMember, status: 'busy' as const };
      const { container } = render(<MemberCard member={busyMember} />);

      const statusDot = container.querySelector('.bg-yellow-500');
      expect(statusDot).toBeInTheDocument();
    });

    it('空闲状态应该显示灰色指示器', () => {
      const idleMember = { ...mockMember, status: 'idle' as const };
      const { container } = render(<MemberCard member={idleMember} />);

      const statusDot = container.querySelector('.bg-gray-400');
      expect(statusDot).toBeInTheDocument();
    });

    it('离线状态应该显示灰色指示器', () => {
      const offlineMember = { ...mockMember, status: 'offline' as const };
      const { container } = render(<MemberCard member={offlineMember} />);

      const statusDot = container.querySelector('.bg-gray-300');
      expect(statusDot).toBeInTheDocument();
    });
  });

  describe('响应式设计', () => {
    it('应该在所有屏幕尺寸上正确渲染', () => {
      const { container } = render(<MemberCard member={mockMember} />);

      const card = container.querySelector('.p-4');
      expect(card).toBeInTheDocument();
    });
  });
});
