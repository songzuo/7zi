/**
 * SortableTaskList 组件测试
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SortableTaskList } from '../SortableTaskList';

// Mock dnd-kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dnd-context">{children}</div>
  ),
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sortable-context">{children}</div>
  ),
  verticalListSortingStrategy: 'vertical',
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: '',
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ''),
    },
  },
}));

interface TestTask {
  id: string;
  title: string;
}

const mockTasks: TestTask[] = [
  { id: '1', title: 'Task 1' },
  { id: '2', title: 'Task 2' },
  { id: '3', title: 'Task 3' },
];

const mockRenderTask = (task: TestTask, isDragging: boolean) => (
  <div data-testid={`task-${task.id}`} className={isDragging ? 'dragging' : ''}>
    {task.title}
  </div>
);

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('SortableTaskList', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should render all tasks', () => {
    render(
      <SortableTaskList
        tasks={mockTasks}
        renderTask={mockRenderTask}
      />
    );

    expect(screen.getByTestId('task-1')).toBeInTheDocument();
    expect(screen.getByTestId('task-2')).toBeInTheDocument();
    expect(screen.getByTestId('task-3')).toBeInTheDocument();
  });

  it('should call onTaskClick when task is clicked', () => {
    const handleClick = vi.fn();
    
    render(
      <SortableTaskList
        tasks={mockTasks}
        renderTask={mockRenderTask}
        onTaskClick={handleClick}
      />
    );

    fireEvent.click(screen.getByTestId('task-1'));
    expect(handleClick).toHaveBeenCalledWith(mockTasks[0]);
  });

  it('should render with custom aria label', () => {
    render(
      <SortableTaskList
        tasks={mockTasks}
        renderTask={mockRenderTask}
        listAriaLabel="My Custom List"
      />
    );

    expect(screen.getByRole('list', { name: 'My Custom List' })).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <SortableTaskList
        tasks={mockTasks}
        renderTask={mockRenderTask}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should pass isDragging prop to renderTask', () => {
    render(
      <SortableTaskList
        tasks={mockTasks}
        renderTask={mockRenderTask}
      />
    );

    // Tasks should not be dragging initially
    expect(screen.getByTestId('task-1')).not.toHaveClass('dragging');
  });
});