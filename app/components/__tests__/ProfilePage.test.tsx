/**
 * ProfilePage 组件测试
 * 
 * 测试覆盖:
 * - 组件渲染（加载状态、成功状态、错误状态、空数据）
 * - 用户交互（表单输入、提交、头像上传、重置）
 * - 边界情况（API 响应异常、网络错误）
 * - 错误处理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfilePage } from '../ProfilePage';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');

// Mock console.error to suppress noise in tests
const originalConsoleError = console.error;

describe('ProfilePage', () => {
  const mockUser = {
    id: 'user_123',
    name: 'Test User',
    email: 'test@example.com',
    avatar: '/uploads/avatar.png',
    bio: 'Test bio',
    role: 'member',
    provider: 'system',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockProfile = {
    id: 'profile_123',
    userId: 'user_123',
    displayName: 'Test Display Name',
    bio: 'Profile bio',
    location: 'Beijing, China',
    website: 'https://example.com',
    settings: {
      theme: 'system' as const,
      language: 'zh-CN',
      notifications: {
        email: true,
        push: true,
        taskAssigned: true,
        taskCompleted: true,
        mentions: true,
      },
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    console.error = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    console.error = originalConsoleError;
  });

  // ==================== 渲染测试 ====================

  describe('渲染测试', () => {
    it('应显示加载状态', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<ProfilePage userId="user_123" />);
      
      // 检查加载动画元素存在
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeTruthy();
    });

    it('应正确加载并显示用户数据', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByText('个人资料')).toBeTruthy();
      });

      // 验证表单数据
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeTruthy();
        expect(screen.getByDisplayValue('test@example.com')).toBeTruthy();
        expect(screen.getByDisplayValue('Test Display Name')).toBeTruthy();
        expect(screen.getByDisplayValue('Beijing, China')).toBeTruthy();
        expect(screen.getByDisplayValue('https://example.com')).toBeTruthy();
      });
    });

    it('应正确显示默认头像', async () => {
      const userWithoutAvatar = { ...mockUser, avatar: null };
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: userWithoutAvatar }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        });

      render(<ProfilePage userId="user_123" />);

      // 推进定时器让 fetch 完成
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      const avatar = screen.getByAltText('头像') as HTMLImageElement;
      expect(avatar.src).toContain('dicebear');
    });

    it('应正确显示自定义头像', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        const avatar = screen.getByAltText('头像') as HTMLImageElement;
        expect(avatar.src).toContain('/uploads/avatar.png');
      });
    });

    it('应正确显示账户信息卡片', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByText('账户信息')).toBeTruthy();
      });

      expect(screen.getByText(/角色:/)).toBeTruthy();
      expect(screen.getByText('member')).toBeTruthy();
      expect(screen.getByText(/提供商:/)).toBeTruthy();
      expect(screen.getByText('system')).toBeTruthy();
      expect(screen.getByText(/创建时间:/)).toBeTruthy();
    });

    it('应正确处理没有 profile 数据的情况', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByText('个人资料')).toBeTruthy();
      });

      // 表单应显示用户基本信息
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeTruthy();
        expect(screen.getByDisplayValue('Test bio')).toBeTruthy();
      });
    });

    it('应正确渲染所有表单字段', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByLabelText('姓名 *')).toBeTruthy();
        expect(screen.getByLabelText('邮箱')).toBeTruthy();
        expect(screen.getByLabelText('显示名称')).toBeTruthy();
        expect(screen.getByLabelText('位置')).toBeTruthy();
        expect(screen.getByLabelText('个人网站')).toBeTruthy();
        expect(screen.getByLabelText('个人简介')).toBeTruthy();
      });

      // 邮箱字段应为禁用状态
      const emailInput = screen.getByLabelText('邮箱') as HTMLInputElement;
      expect(emailInput.disabled).toBe(true);
    });
  });

  // ==================== 用户不存在测试 ====================

  describe('用户不存在测试', () => {
    it('应显示用户不存在错误', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        });

      render(<ProfilePage userId="non-existent" />);

      await waitFor(() => {
        expect(screen.getByText('用户不存在')).toBeTruthy();
      });
    });

    it('应在 API 返回错误时显示错误信息', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: '服务器错误' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByText('用户不存在')).toBeTruthy();
      });
    });
  });

  // ==================== 表单交互测试 ====================

  describe('表单交互测试', () => {
    beforeEach(() => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        });
    });

    it('应正确更新文本输入', async () => {
      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByLabelText('姓名 *')).toBeTruthy();
      });

      const nameInput = screen.getByLabelText('姓名 *') as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: '新名字' } });

      expect(nameInput.value).toBe('新名字');
    });

    it('应正确更新显示名称', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByLabelText('显示名称')).toBeTruthy();
      });

      const displayNameInput = screen.getByLabelText('显示名称') as HTMLInputElement;
      await user.clear(displayNameInput);
      await user.type(displayNameInput, '新的显示名称');

      expect(displayNameInput.value).toBe('新的显示名称');
    });

    it('应正确更新位置', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByLabelText('位置')).toBeTruthy();
      });

      const locationInput = screen.getByLabelText('位置') as HTMLInputElement;
      await user.clear(locationInput);
      await user.type(locationInput, '上海，中国');

      expect(locationInput.value).toBe('上海，中国');
    });

    it('应正确更新网站', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByLabelText('个人网站')).toBeTruthy();
      });

      const websiteInput = screen.getByLabelText('个人网站') as HTMLInputElement;
      await user.clear(websiteInput);
      await user.type(websiteInput, 'https://newsite.com');

      expect(websiteInput.value).toBe('https://newsite.com');
    });

    it('应正确更新个人简介', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByLabelText('个人简介')).toBeTruthy();
      });

      const bioInput = screen.getByLabelText('个人简介') as HTMLTextAreaElement;
      await user.clear(bioInput);
      await user.type(bioInput, '这是新的个人简介');

      expect(bioInput.value).toBe('这是新的个人简介');
    });

    it('邮箱字段应不可编辑', async () => {
      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByLabelText('邮箱')).toBeTruthy();
      });

      const emailInput = screen.getByLabelText('邮箱') as HTMLInputElement;
      expect(emailInput.disabled).toBe(true);
      expect(emailInput).toHaveClass('cursor-not-allowed');
    });
  });

  // ==================== 表单提交测试 ====================

  describe('表单提交测试', () => {
    it('应成功提交表单并显示成功消息', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: { ...mockUser, name: 'Updated Name' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByText('保存')).toBeTruthy();
      });

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('个人资料已更新！')).toBeTruthy();
      });

      // 验证 API 调用
      expect(mockFetch).toHaveBeenCalledTimes(4); // 2 initial + 2 save
    });

    it('应在提交时显示保存中状态', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        })
        .mockImplementationOnce(() => new Promise(() => {})); // Pending

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByText('保存')).toBeTruthy();
      });

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('保存中...')).toBeTruthy();
      });
    });

    it('提交成功后成功消息应在 3 秒后消失', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByText('保存')).toBeTruthy();
      });

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('个人资料已更新！')).toBeTruthy();
      });

      // 快进 3 秒
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.queryByText('个人资料已更新！')).toBeNull();
      });
    });

    it('应在用户 API 更新失败时显示错误', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: '更新失败' }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByText('保存')).toBeTruthy();
      });

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to update user')).toBeTruthy();
      });
    });

    it('应在 profile API 更新失败时显示错误', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Profile 更新失败' }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByText('保存')).toBeTruthy();
      });

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to update profile')).toBeTruthy();
      });
    });

    it('应在网络错误时显示错误消息', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByText('保存')).toBeTruthy();
      });

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeTruthy();
      });
    });
  });

  // ==================== 重置按钮测试 ====================

  describe('重置按钮测试', () => {
    it('应重置表单到原始数据', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByLabelText('姓名 *')).toBeTruthy();
      });

      // 修改表单
      const nameInput = screen.getByLabelText('姓名 *') as HTMLInputElement;
      await user.clear(nameInput);
      await user.type(nameInput, '修改后的名字');
      expect(nameInput.value).toBe('修改后的名字');

      // 点击重置
      const resetButton = screen.getByText('重置');
      fireEvent.click(resetButton);

      // 等待重新加载完成
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeTruthy();
      });
    });
  });

  // ==================== 头像上传测试 ====================

  describe('头像上传测试', () => {
    it('应能点击头像触发文件选择', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByAltText('头像')).toBeTruthy();
      });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeTruthy();
      expect(fileInput.accept).toBe('image/jpeg,image/png,image/gif,image/webp');
    });

    it('应成功上传头像', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ avatarUrl: '/uploads/new-avatar.png' }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByAltText('头像')).toBeTruthy();
      });

      const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/users/user_123/avatar',
          expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByText('头像已更新！')).toBeTruthy();
      });
    });

    it('应在头像上传时显示上传状态', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        })
        .mockImplementationOnce(() => new Promise(() => {})); // Pending

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByAltText('头像')).toBeTruthy();
      });

      const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      // 检查上传中状态 - 应该显示 spinner
      await waitFor(() => {
        const spinners = document.querySelectorAll('.animate-spin');
        expect(spinners.length).toBeGreaterThan(0);
      });
    });

    it('应处理头像上传失败', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 413,
          json: () => Promise.resolve({ error: '文件过大' }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByAltText('头像')).toBeTruthy();
      });

      const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('文件过大')).toBeTruthy();
      });
    });

    it('上传失败时应显示通用错误消息', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({}),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByAltText('头像')).toBeTruthy();
      });

      const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Failed to upload avatar')).toBeTruthy();
      });
    });

    it('应处理头像上传网络错误', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByAltText('头像')).toBeTruthy();
      });

      const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeTruthy();
      });
    });

    it('未选择文件时不应触发上传', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByAltText('头像')).toBeTruthy();
      });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [] } });

      // 不应该有额外的 API 调用
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ==================== 边界情况测试 ====================

  describe('边界情况测试', () => {
    it('应正确处理空字符串字段', async () => {
      const emptyUser = {
        ...mockUser,
        name: '',
        bio: '',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: emptyUser }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByText('个人资料')).toBeTruthy();
      });

      const nameInput = screen.getByLabelText('姓名 *') as HTMLInputElement;
      expect(nameInput.value).toBe('');
    });

    it('应正确处理 null 和 undefined 值', async () => {
      const userWithNulls = {
        ...mockUser,
        bio: null,
      };
      const profileWithNulls = {
        ...mockProfile,
        displayName: null,
        location: null,
        website: null,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: userWithNulls }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: profileWithNulls }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByText('个人资料')).toBeTruthy();
      });

      // 不应崩溃，应显示空值
      const displayNameInput = screen.getByLabelText('显示名称') as HTMLInputElement;
      expect(displayNameInput.value).toBe('Test User'); // fallback to user.name
    });

    it('应正确处理加载用户数据的网络错误', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeTruthy();
      });
    });

    it('应正确处理 JSON 解析错误', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.reject(new Error('Invalid JSON')),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByText('Invalid JSON')).toBeTruthy();
      });
    });

    it('应在 userId 改变时重新加载数据', async () => {
      const { rerender } = render(<ProfilePage userId="user_123" />);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        });

      await waitFor(() => {
        expect(screen.getByText('个人资料')).toBeTruthy();
      });

      // 重新渲染不同的 userId
      const newUser = { ...mockUser, id: 'user_456', name: 'Other User' };
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: newUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: { ...mockProfile, userId: 'user_456' } }),
        });

      rerender(<ProfilePage userId="user_456" />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Other User')).toBeTruthy();
      });
    });
  });

  // ==================== UI 状态测试 ====================

  describe('UI 状态测试', () => {
    it('提交按钮应在保存时禁用', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        })
        .mockImplementationOnce(() => new Promise(() => {})); // Pending

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByText('保存')).toBeTruthy();
      });

      const saveButton = screen.getByText('保存').closest('button') as HTMLButtonElement;
      expect(saveButton.disabled).toBe(false);

      fireEvent.click(saveButton);

      await waitFor(() => {
        const savingButton = screen.getByText('保存中...').closest('button');
        expect(savingButton?.hasAttribute('disabled')).toBe(true);
      });
    });

    it('应在姓名字段显示必填标记', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        const nameLabel = screen.getByText('姓名 *');
        expect(nameLabel).toBeTruthy();
      });
    });

    it('成功消息应使用绿色样式', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByText('保存')).toBeTruthy();
      });

      fireEvent.click(screen.getByText('保存'));

      await waitFor(() => {
        const successMessage = screen.getByText('个人资料已更新！').parentElement;
        expect(successMessage?.className).toContain('bg-green');
      });
    });

    it('错误消息应使用红色样式', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        const errorContainer = screen.getByText('用户不存在').parentElement;
        expect(errorContainer?.className).toContain('bg-red');
      });
    });
  });

  // ==================== 无障碍测试 ====================

  describe('无障碍测试', () => {
    it('所有表单元素应有正确的标签关联', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        expect(screen.getByLabelText('姓名 *')).toBeTruthy();
        expect(screen.getByLabelText('邮箱')).toBeTruthy();
        expect(screen.getByLabelText('显示名称')).toBeTruthy();
        expect(screen.getByLabelText('位置')).toBeTruthy();
        expect(screen.getByLabelText('个人网站')).toBeTruthy();
        expect(screen.getByLabelText('个人简介')).toBeTruthy();
      });
    });

    it('头像应有 alt 文本', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        const avatar = screen.getByRole('img', { name: '头像' });
        expect(avatar).toBeTruthy();
      });
    });

    it('提交按钮应有明确的文本', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: '保存' });
        const resetButton = screen.getByRole('button', { name: '重置' });
        expect(saveButton).toBeTruthy();
        expect(resetButton).toBeTruthy();
      });
    });
  });

  // ==================== 表单验证测试 ====================

  describe('表单验证测试', () => {
    it('姓名字段为必填项', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText('姓名 *') as HTMLInputElement;
        expect(nameInput.required).toBe(true);
      });
    });

    it('网站字段应为 url 类型', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        const websiteInput = screen.getByLabelText('个人网站') as HTMLInputElement;
        expect(websiteInput.type).toBe('url');
      });
    });

    it('文件输入应只接受图片格式', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ profile: mockProfile }),
        });

      render(<ProfilePage userId="user_123" />);

      await waitFor(() => {
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        expect(fileInput.accept).toBe('image/jpeg,image/png,image/gif,image/webp');
      });
    });
  });
});