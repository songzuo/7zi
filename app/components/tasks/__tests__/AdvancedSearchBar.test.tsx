/**
 * AdvancedSearchBar 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdvancedSearchBar } from '../AdvancedSearchBar';
import { TaskFilter } from '@/lib/tasks/types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('AdvancedSearchBar', () => {
  const mockFilter: TaskFilter = {};
  const mockOnFilterChange = vi.fn();
  const mockOnAdvancedToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should render search input', () => {
    render(
      <AdvancedSearchBar
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
      />
    );

    const searchInput = screen.getByPlaceholderText('搜索任务标题、描述...');
    expect(searchInput).toBeInTheDocument();
  });

  it('should call onFilterChange when typing', () => {
    render(
      <AdvancedSearchBar
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
      />
    );

    const searchInput = screen.getByPlaceholderText('搜索任务标题、描述...');
    fireEvent.change(searchInput, { target: { value: 'test search' } });

    expect(mockOnFilterChange).toHaveBeenCalledWith({ search: 'test search' });
  });

  it('should show clear button when search has value', () => {
    const filterWithSearch: TaskFilter = { search: 'existing search' };

    render(
      <AdvancedSearchBar
        filter={filterWithSearch}
        onFilterChange={mockOnFilterChange}
      />
    );

    const clearButton = screen.getByLabelText('清除搜索');
    expect(clearButton).toBeInTheDocument();
  });

  it('should clear search when clicking clear button', () => {
    const filterWithSearch: TaskFilter = { search: 'existing search' };

    render(
      <AdvancedSearchBar
        filter={filterWithSearch}
        onFilterChange={mockOnFilterChange}
      />
    );

    const clearButton = screen.getByLabelText('清除搜索');
    fireEvent.click(clearButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith({ search: undefined });
  });

  it('should show advanced filter button when showAdvancedToggle is true', () => {
    render(
      <AdvancedSearchBar
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
        showAdvancedToggle={true}
        onAdvancedToggle={mockOnAdvancedToggle}
      />
    );

    const advancedButton = screen.getByLabelText('高级筛选');
    expect(advancedButton).toBeInTheDocument();
  });

  it('should call onAdvancedToggle when clicking advanced button', () => {
    render(
      <AdvancedSearchBar
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
        showAdvancedToggle={true}
        onAdvancedToggle={mockOnAdvancedToggle}
      />
    );

    const advancedButton = screen.getByLabelText('高级筛选');
    fireEvent.click(advancedButton);

    expect(mockOnAdvancedToggle).toHaveBeenCalled();
  });

  it('should show active filter count badge', () => {
    const filterWithMultiple: TaskFilter = {
      priority: 'high',
      status: 'todo',
    };

    render(
      <AdvancedSearchBar
        filter={filterWithMultiple}
        onFilterChange={mockOnFilterChange}
        showAdvancedToggle={true}
        onAdvancedToggle={mockOnAdvancedToggle}
      />
    );

    // 查找显示筛选数量的元素
    const badge = screen.getByText('2');
    expect(badge).toBeInTheDocument();
  });

  it('should render quick filter buttons', () => {
    render(
      <AdvancedSearchBar
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
      />
    );

    expect(screen.getByText('今日到期')).toBeInTheDocument();
    expect(screen.getByText('本周到期')).toBeInTheDocument();
    expect(screen.getByText('已逾期')).toBeInTheDocument();
    expect(screen.getByText('高优先级')).toBeInTheDocument();
  });

  it('should apply quick filter for high priority', () => {
    render(
      <AdvancedSearchBar
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
      />
    );

    const highPriorityButton = screen.getByText('高优先级');
    fireEvent.click(highPriorityButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith({ priority: 'high' });
  });

  it('should load search history from localStorage', () => {
    const historyItems = [
      { query: 'previous search', timestamp: Date.now() },
    ];
    localStorageMock.getItem.mockReturnValue(JSON.stringify(historyItems));

    render(
      <AdvancedSearchBar
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
      />
    );

    expect(localStorageMock.getItem).toHaveBeenCalledWith('task-search-history');
  });

  it('should focus input when autoFocus is true', () => {
    render(
      <AdvancedSearchBar
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
        autoFocus={true}
      />
    );

    const searchInput = screen.getByPlaceholderText('搜索任务标题、描述...');
    expect(searchInput).toHaveFocus();
  });

  it('should call onFilterChange with date range for today filter', () => {
    render(
      <AdvancedSearchBar
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
      />
    );

    const todayButton = screen.getByText('今日到期');
    fireEvent.click(todayButton);

    expect(mockOnFilterChange).toHaveBeenCalled();
    const callArgs = mockOnFilterChange.mock.calls[0][0];
    expect(callArgs.dueDateFrom).toBeDefined();
    expect(callArgs.dueDateTo).toBeDefined();
  });

  it('should apply week filter', () => {
    render(
      <AdvancedSearchBar
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
      />
    );

    const weekButton = screen.getByText('本周到期');
    fireEvent.click(weekButton);

    expect(mockOnFilterChange).toHaveBeenCalled();
    const callArgs = mockOnFilterChange.mock.calls[0][0];
    expect(callArgs.dueDateFrom).toBeDefined();
    expect(callArgs.dueDateTo).toBeDefined();
  });

  it('should apply overdue filter', () => {
    render(
      <AdvancedSearchBar
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
      />
    );

    const overdueButton = screen.getByText('已逾期');
    fireEvent.click(overdueButton);

    expect(mockOnFilterChange).toHaveBeenCalled();
    const callArgs = mockOnFilterChange.mock.calls[0][0];
    expect(callArgs.dueDateTo).toBeDefined();
  });
});