/**
 * Zustand Helpers 单元测试
 */

import { describe, it, expect, vi } from 'vitest';
import {
  StoreState,
  Selector,
  createMockSelector,
} from '@/lib/types/zustand-helpers';

describe('ZustandHelpers', () => {
  describe('StoreState', () => {
    it('应该正确推断状态类型', () => {
      // 模拟 Zustand store hook 类型
      type MockStoreHook = (selector: (state: { tasks: string[] }) => string[]) => string[];
      type State = StoreState<MockStoreHook>;
      
      const mockState: State = { tasks: ['task1', 'task2'] };
      expect(mockState.tasks).toHaveLength(2);
    });

    it('应该处理复杂状态类型', () => {
      type ComplexStoreHook = (selector: (state: {
        users: Array<{ id: string; name: string }>;
        loading: boolean;
        error: string | null;
      }) => boolean) => boolean;
      
      type State = StoreState<ComplexStoreHook>;
      const mockState: State = {
        users: [{ id: '1', name: 'Test' }],
        loading: false,
        error: null,
      };
      
      expect(mockState.users).toHaveLength(1);
      expect(mockState.loading).toBe(false);
      expect(mockState.error).toBeNull();
    });
  });

  describe('Selector', () => {
    it('应该定义正确类型的 selector', () => {
      interface TestState {
        count: number;
        name: string;
      }
      
      const selector: Selector<TestState, number> = (state) => state.count;
      const state: TestState = { count: 42, name: 'test' };
      
      expect(selector(state)).toBe(42);
    });

    it('应该支持返回复杂类型', () => {
      interface TestState {
        items: string[];
      }
      
      const selector: Selector<TestState, string[]> = (state) => state.items;
      const state: TestState = { items: ['a', 'b', 'c'] };
      
      expect(selector(state)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('createMockSelector', () => {
    it('应该创建可用的 mock selector', () => {
      const mockState = {
        tasks: ['task1', 'task2'],
        loading: false,
      };
      
      const mockSelector = createMockSelector(mockState);
      
      const result = mockSelector((state) => state.tasks);
      expect(result).toEqual(['task1', 'task2']);
    });

    it('应该正确处理嵌套状态选择', () => {
      const mockState = {
        user: {
          profile: {
            name: 'Test User',
            email: 'test@example.com',
          },
        },
      };
      
      const mockSelector = createMockSelector(mockState);
      
      const name = mockSelector((state) => state.user.profile.name);
      expect(name).toBe('Test User');
      
      const email = mockSelector((state) => state.user.profile.email);
      expect(email).toBe('test@example.com');
    });

    it('应该支持函数 (actions) 在 mock 状态中', () => {
      const mockAddTask = vi.fn();
      const mockState = {
        tasks: [] as string[],
        addTask: mockAddTask,
      };
      
      const mockSelector = createMockSelector(mockState);
      
      const addTask = mockSelector((state) => state.addTask);
      expect(typeof addTask).toBe('function');
      
      addTask('new-task');
      expect(mockAddTask).toHaveBeenCalledWith('new-task');
    });

    it('应该支持多个选择器独立工作', () => {
      const mockState = {
        count: 10,
        name: 'Test',
        items: ['a', 'b'],
      };
      
      const mockSelector = createMockSelector(mockState);
      
      const countResult = mockSelector((state) => state.count);
      const nameResult = mockSelector((state) => state.name);
      const itemsResult = mockSelector((state) => state.items);
      
      expect(countResult).toBe(10);
      expect(nameResult).toBe('Test');
      expect(itemsResult).toEqual(['a', 'b']);
    });

    it('应该正确处理计算属性选择器', () => {
      const mockState = {
        numbers: [1, 2, 3, 4, 5],
      };
      
      const mockSelector = createMockSelector(mockState);
      
      const sum = mockSelector((state) => 
        state.numbers.reduce((acc, n) => acc + n, 0)
      );
      expect(sum).toBe(15);
      
      const evenCount = mockSelector((state) =>
        state.numbers.filter(n => n % 2 === 0).length
      );
      expect(evenCount).toBe(2);
    });

    it('应该处理空对象状态', () => {
      const mockState = {};
      const mockSelector = createMockSelector(mockState);
      
      const result = mockSelector((state) => (state as Record<string, unknown>).anything);
      expect(result).toBeUndefined();
    });

    it('应该支持泛型状态类型', () => {
      interface GenericState<T> {
        data: T;
        loading: boolean;
      }
      
      const mockState: GenericState<string[]> = {
        data: ['item1', 'item2'],
        loading: false,
      };
      
      const mockSelector = createMockSelector(mockState);
      
      const result = mockSelector((state) => state.data);
      expect(result).toEqual(['item1', 'item2']);
    });

    it('应该模拟 Zustand store hook 行为', () => {
      // 这是使用 createMockSelector 的典型场景
      interface Task {
        id: string;
        title: string;
        completed: boolean;
      }
      
      const mockState = {
        tasks: [
          { id: '1', title: 'Task 1', completed: false },
          { id: '2', title: 'Task 2', completed: true },
        ] as Task[],
        addTask: vi.fn(),
        toggleTask: vi.fn(),
        deleteTask: vi.fn(),
      };
      
      // 模拟 useTasksStore
      const useTasksStore = createMockSelector(mockState);
      
      // 选择所有任务
      const tasks = useTasksStore((state) => state.tasks);
      expect(tasks).toHaveLength(2);
      
      // 选择未完成任务
      const incompleteTasks = useTasksStore(
        (state) => state.tasks.filter(t => !t.completed)
      );
      expect(incompleteTasks).toHaveLength(1);
      
      // 选择任务数量
      const count = useTasksStore((state) => state.tasks.length);
      expect(count).toBe(2);
      
      // 调用 action
      const addTask = useTasksStore((state) => state.addTask);
      addTask({ id: '3', title: 'Task 3', completed: false });
      
      expect(mockState.addTask).toHaveBeenCalledWith({
        id: '3',
        title: 'Task 3',
        completed: false,
      });
    });
  });
});
