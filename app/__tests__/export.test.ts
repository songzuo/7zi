/**
 * 导出功能测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  downloadCSV,
  exportMembersCSV,
  exportIssuesCSV,
  exportCommitsCSV,
  exportActivitiesCSV,
} from '../lib/export';
import type { AIMember, GitHubIssue, GitHubCommit, ActivityItem } from '../app/dashboard/page';

// 模拟 document.createElement
const mockCreateElement = vi.fn();
const mockClick = vi.fn();
const mockRemoveChild = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  
  // Mock document functions
  document.createElement = mockCreateElement.mockImplementation((tag: string) => {
    if (tag === 'a') {
      return {
        setAttribute: vi.fn(),
        style: {},
        click: mockClick,
      };
    }
    return {};
  });
  
  document.body.appendChild = vi.fn();
  document.body.removeChild = mockRemoveChild;
  URL.createObjectURL = vi.fn().mockReturnValue('blob:http://test');
  URL.revokeObjectURL = vi.fn();
});

describe('downloadCSV', () => {
  it('应该创建并点击下载链接', () => {
    const data = [{ name: '测试' }];
    
    downloadCSV(data, 'test-file');
    
    expect(mockCreateElement).toHaveBeenCalledWith('a');
    expect(document.body.appendChild).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(document.body.removeChild).toHaveBeenCalled();
  });

  it('应该使用正确的文件名', () => {
    const data = [{ name: '测试' }];
    
    downloadCSV(data, 'my-report');
    
    const link = mockCreateElement.mock.results[0].value;
    expect(link.setAttribute).toHaveBeenCalledWith('download', 'my-report.csv');
  });
});

describe('exportMembersCSV', () => {
  it('应该正确导出成员数据', () => {
    const members: AIMember[] = [
      {
        id: 'test-1',
        name: '测试成员',
        role: '测试角色',
        emoji: '🧪',
        avatar: 'https://example.com/avatar.png',
        status: 'working',
        provider: 'test-provider',
        currentTask: '测试任务',
        completedTasks: 10,
      },
    ];
    
    exportMembersCSV(members);
    
    expect(mockClick).toHaveBeenCalled();
  });
});

describe('exportIssuesCSV', () => {
  it('应该正确导出 Issues 数据', () => {
    const issues: GitHubIssue[] = [
      {
        number: 1,
        title: '测试 Issue',
        state: 'open',
        labels: [{ name: 'bug', color: 'red' }],
        assignee: { login: 'testuser', avatar_url: 'https://example.com/avatar.png' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        html_url: 'https://github.com/test/issue/1',
      },
    ];
    
    exportIssuesCSV(issues);
    
    expect(mockClick).toHaveBeenCalled();
  });

  it('应该正确处理无负责人的 Issue', () => {
    const issues: GitHubIssue[] = [
      {
        number: 1,
        title: '测试 Issue',
        state: 'closed',
        labels: [],
        assignee: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        html_url: 'https://github.com/test/issue/1',
      },
    ];
    
    exportIssuesCSV(issues);
    
    expect(mockClick).toHaveBeenCalled();
  });
});

describe('exportCommitsCSV', () => {
  it('应该正确导出 Commits 数据', () => {
    const commits: GitHubCommit[] = [
      {
        sha: 'abc123',
        commit: {
          message: '测试提交',
          author: { name: '测试作者', date: '2024-01-01T00:00:00Z' },
        },
        html_url: 'https://github.com/test/commit/abc123',
        author: { avatar_url: 'https://example.com/avatar.png' },
      },
    ];
    
    exportCommitsCSV(commits);
    
    expect(mockClick).toHaveBeenCalled();
  });
});

describe('exportActivitiesCSV', () => {
  it('应该正确导出活动数据', () => {
    const activities: ActivityItem[] = [
      {
        id: '1',
        type: 'commit',
        title: '测试活动',
        author: '测试作者',
        timestamp: '2024-01-01T00:00:00Z',
        url: 'https://example.com/activity/1',
      },
    ];
    
    exportActivitiesCSV(activities);
    
    expect(mockClick).toHaveBeenCalled();
  });
});
