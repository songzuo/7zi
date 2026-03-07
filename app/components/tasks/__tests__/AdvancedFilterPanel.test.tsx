/**
 * AdvancedFilterPanel 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdvancedFilterPanel } from '../AdvancedFilterPanel';
import { TaskFilter, TaskTag } from '@/lib/tasks/types';

describe('AdvancedFilterPanel', () => {
  const mockFilter: TaskFilter = {};
  const mockOnFilterChange = vi.fn();
  const mockOnReset = vi.fn();
  const mockOnApply = vi.fn();

  const mockTags: TaskTag[] = [
    { id: 'bug', name: 'Bug', color: 'red' },
    { id: 'feature', name: 'Feature', color: 'blue' },
    { id: 'urgent', name: 'Urgent', color: 'orange' },
  ];

  const mockAssignees = ['Executor', 'Architect', 'Tester'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render filter panel with title', () => {
    render(
      <AdvancedFilterPanel
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText('高级筛选')).toBeInTheDocument();
  });

  it('should show status filter options', () => {
    render(
      <AdvancedFilterPanel
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText('待办')).toBeInTheDocument();
    expect(screen.getByText('进行中')).toBeInTheDocument();
    expect(screen.getByText('评审中')).toBeInTheDocument();
    expect(screen.getByText('已完成')).toBeInTheDocument();
  });

  it('should show priority filter options', () => {
    render(
      <AdvancedFilterPanel
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
      />
    );

    // 使用 getAllByText 因为优先级出现在多个地方
    const priorityElements = screen.getAllByText('优先级');
    expect(priorityElements.length).toBeGreaterThan(0);
  });

  it('should toggle status selection', () => {
    render(
      <AdvancedFilterPanel
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
      />
    );

    const todoButton = screen.getByText('待办').closest('button');
    if (todoButton) {
      fireEvent.click(todoButton);
    }

    // Check that the button is selected (active state)
    expect(todoButton).toHaveClass('border-blue-500');
  });

  it('should show tags when available', () => {
    render(
      <AdvancedFilterPanel
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
        availableTags={mockTags}
      />
    );

    expect(screen.getByText('Bug')).toBeInTheDocument();
    expect(screen.getByText('Feature')).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
  });

  it('should toggle tag selection', () => {
    render(
      <AdvancedFilterPanel
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
        availableTags={mockTags}
      />
    );

    const bugTag = screen.getByText('Bug').closest('button');
    if (bugTag) {
      fireEvent.click(bugTag);
    }

    // The tag should be selected
    expect(bugTag).toHaveClass('border-blue-500');
  });

  it('should show assignee dropdown when assignees are provided', () => {
    render(
      <AdvancedFilterPanel
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
        assignees={mockAssignees}
      />
    );

    const assigneeSelect = screen.getByRole('combobox', { name: '' });
    expect(assigneeSelect).toBeInTheDocument();

    // Check options
    expect(screen.getByText('全部负责人')).toBeInTheDocument();
    expect(screen.getByText('Executor')).toBeInTheDocument();
    expect(screen.getByText('Architect')).toBeInTheDocument();
    expect(screen.getByText('Tester')).toBeInTheDocument();
  });

  it('should show date range pickers', () => {
    render(
      <AdvancedFilterPanel
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText('截止日期')).toBeInTheDocument();
    expect(screen.getByText('创建日期')).toBeInTheDocument();
  });

  it('should show sort options', () => {
    render(
      <AdvancedFilterPanel
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText('排序')).toBeInTheDocument();
    expect(screen.getByText('创建时间')).toBeInTheDocument();
    expect(screen.getByText('更新时间')).toBeInTheDocument();
    expect(screen.getByText('截止日期')).toBeInTheDocument();
    expect(screen.getByText('优先级')).toBeInTheDocument();
  });

  it('should call onReset when clicking reset button', () => {
    render(
      <AdvancedFilterPanel
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
      />
    );

    const resetButton = screen.getByText('重置');
    fireEvent.click(resetButton);

    expect(mockOnReset).toHaveBeenCalled();
  });

  it('should call onApply when clicking apply button', () => {
    render(
      <AdvancedFilterPanel
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
        onApply={mockOnApply}
      />
    );

    const applyButton = screen.getByText('应用筛选');
    fireEvent.click(applyButton);

    expect(mockOnApply).toHaveBeenCalled();
    expect(mockOnFilterChange).toHaveBeenCalled();
  });

  it('should show active filter count', () => {
    const filterWithMultiple: TaskFilter = {
      priority: 'high',
      status: 'todo',
      tags: ['bug'],
    };

    render(
      <AdvancedFilterPanel
        filter={filterWithMultiple}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText(/个条件/)).toBeInTheDocument();
  });

  it('should toggle sort order buttons', () => {
    render(
      <AdvancedFilterPanel
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
      />
    );

    const ascButton = screen.getByText('升序');
    const descButton = screen.getByText('降序');

    // Default should be desc
    expect(descButton).toHaveClass('bg-blue-500');

    // Click asc
    fireEvent.click(ascButton);
    expect(ascButton).toHaveClass('bg-blue-500');
  });

  it('should update date range inputs', () => {
    render(
      <AdvancedFilterPanel
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
      />
    );

    const dateInputs = screen.getAllByRole('textbox');
    expect(dateInputs.length).toBeGreaterThan(0);
  });

  it('should handle clear all filters', () => {
    const filterWithMultiple: TaskFilter = {
      priority: 'high',
      status: 'todo',
      search: 'test',
    };

    render(
      <AdvancedFilterPanel
        filter={filterWithMultiple}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
      />
    );

    const clearButton = screen.getByText('清除筛选');
    fireEvent.click(clearButton);

    expect(mockOnReset).toHaveBeenCalled();
  });

  it('should not show tags section when no tags provided', () => {
    render(
      <AdvancedFilterPanel
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
        availableTags={[]}
      />
    );

    expect(screen.queryByText('标签')).not.toBeInTheDocument();
  });

  it('should not show assignee section when no assignees provided', () => {
    render(
      <AdvancedFilterPanel
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
        assignees={[]}
      />
    );

    expect(screen.queryByText('负责人')).not.toBeInTheDocument();
  });
});