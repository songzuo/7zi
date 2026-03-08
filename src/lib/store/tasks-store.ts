import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useDashboardStore } from '@/stores/dashboardStore';

// Import task types
import type { Task, TaskComment } from '@/lib/types/task-types';

interface TasksState {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'history'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  assignTask: (taskId: string, assigneeId: string) => void;
  completeTask: (id: string) => void;
  addComment: (taskId: string, comment: Omit<TaskComment, 'id' | 'timestamp'>) => void;
}

export const useTasksStore = create<TasksState>()(
  persist(
    (set, get) => ({
      tasks: [],
      
      addTask: (taskData) => {
        const newTask: Task = {
          id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          ...taskData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          comments: [],
          history: [{
            status: 'pending',
            timestamp: new Date().toISOString(),
            changedBy: taskData.createdBy
          }]
        };
        
        set((state) => ({
          tasks: [...state.tasks, newTask]
        }));
      },
      
      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map(task => 
            task.id === id 
              ? { ...task, ...updates, updatedAt: new Date().toISOString() }
              : task
          )
        }));
      },
      
      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter(task => task.id !== id)
        }));
      },
      
      assignTask: (taskId, assigneeId) => {
        set((state) => ({
          tasks: state.tasks.map(task => {
            if (task.id === taskId) {
              const updatedTask = {
                ...task,
                assignee: assigneeId,
                status: 'assigned' as const,
                updatedAt: new Date().toISOString(),
                history: [
                  ...task.history,
                  {
                    status: 'assigned' as const,
                    timestamp: new Date().toISOString(),
                    changedBy: 'system'
                  }
                ]
              };
              
              // Update AI member status in dashboard store
              useDashboardStore.getState().updateMemberStatus(assigneeId, 'working');
              useDashboardStore.getState().updateMemberTask(assigneeId, `#${taskId} ${task.title}`);
              
              return updatedTask;
            }
            return task;
          })
        }));
      },
      
      completeTask: (id) => {
        const currentTask = get().tasks.find(task => task.id === id);
        if (!currentTask) return;
        
        set((state) => ({
          tasks: state.tasks.map(task => {
            if (task.id === id) {
              const updatedTask = {
                ...task,
                status: 'completed' as const,
                updatedAt: new Date().toISOString(),
                history: [
                  ...task.history,
                  {
                    status: 'completed' as const,
                    timestamp: new Date().toISOString(),
                    changedBy: task.assignee || 'system'
                  }
                ]
              };
              
              // Update AI member in dashboard store
              if (task.assignee) {
                const dashboardStore = useDashboardStore.getState();
                const member = dashboardStore.members.find(m => m.id === task.assignee);
                if (member) {
                  dashboardStore.updateMemberStatus(task.assignee, 'idle');
                  dashboardStore.updateMemberTask(task.assignee, undefined);
                  // Note: completedTasks is managed in the dashboard store itself
                }
              }
              
              return updatedTask;
            }
            return task;
          })
        }));
      },
      
      addComment: (taskId, commentData) => {
        set((state) => ({
          tasks: state.tasks.map(task => {
            if (task.id === taskId) {
              const newComment: TaskComment = {
                id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                ...commentData,
                timestamp: new Date().toISOString()
              };
              
              return {
                ...task,
                comments: [...task.comments, newComment],
                updatedAt: new Date().toISOString()
              };
            }
            return task;
          })
        }));
      }
    }),
    {
      name: 'tasks-storage',
      partialize: (state) => ({ tasks: state.tasks })
    }
  )
);