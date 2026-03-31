/**
 * @fileoverview UI 状态管理 Store
 * @description 使用 Zustand 实现 UI 组件状态管理（sidebar、modal、toast）
 *
 * 功能:
 * - 侧边栏状态（展开/收起）
 * - Modal 对话框管理
 * - Toast 通知管理
 * - 加载状态
 * - 持久化存储（部分状态）
 *
 * @example
 * // 在组件中使用
 * const { sidebarOpen, toggleSidebar } = useUIStore();
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * Toast 类型
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

/**
 * Toast 优先级
 */
export type ToastPriority = 'low' | 'medium' | 'high';

/**
 * Toast 通知
 */
export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  priority?: ToastPriority;
  duration?: number; // 自动关闭时间（毫秒），0 表示不自动关闭
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: number;
}

/**
 * Modal 配置
 */
export interface Modal {
  id: string;
  title?: string;
  content: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  onClose?: () => void;
  isOpen: boolean;
}

/**
 * 侧边栏状态
 */
export interface SidebarState {
  isOpen: boolean;
  isCollapsed: boolean;
  width: number;
}

/**
 * 表单草稿状态
 */
export interface FormDraft {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  updatedAt: number;
}

interface UIState {
  // 侧边栏
  sidebar: SidebarState;

  // Modal
  activeModal: Modal | null;
  modalHistory: Modal[];

  // Toast
  toasts: Toast[];
  maxToasts: number;
  toastQueue: Toast[];

  // 加载状态
  globalLoading: boolean;
  loadingMessage?: string;

  // 表单草稿
  formDrafts: Map<string, FormDraft>;

  // 操作 - 侧边栏
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebarCollapse: () => void;
  setSidebarWidth: (width: number) => void;

  // 操作 - Modal
  openModal: (modal: Omit<Modal, 'id' | 'isOpen'>) => void;
  closeModal: (modalId?: string) => void;
  closeAllModals: () => void;
  updateModal: (modalId: string, updates: Partial<Modal>) => void;

  // 操作 - Toast
  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => string;
  removeToast: (toastId: string) => void;
  clearToasts: () => void;
  clearToastsByType: (type: ToastType) => void;

  // 便捷方法 - Toast
  success: (message: string, title?: string, options?: Partial<Toast>) => string;
  error: (message: string, title?: string, options?: Partial<Toast>) => string;
  warning: (message: string, title?: string, options?: Partial<Toast>) => string;
  info: (message: string, title?: string, options?: Partial<Toast>) => string;
  loading: (message: string, title?: string) => string;

  // 操作 - 加载状态
  setGlobalLoading: (loading: boolean, message?: string) => void;

  // 操作 - 表单草稿
  saveFormDraft: (formId: string, data: Record<string, unknown>) => void;
  loadFormDraft: (formId: string) => Record<string, unknown> | undefined;
  deleteFormDraft: (formId: string) => void;
  clearFormDrafts: () => void;

  // 重置
  resetUI: () => void;
}

// ============================================================================
// 常量
// ============================================================================

const STORAGE_KEY = '7zi-ui-storage';

const DEFAULT_SIDEBAR_WIDTH = 280;
const COLLAPSED_SIDEBAR_WIDTH = 64;

const DEFAULT_MODAL: Omit<Modal, 'id' | 'isOpen'> = {
  content: null,
  size: 'md',
  closeOnBackdropClick: true,
  closeOnEscape: true,
};

const DEFAULT_TOAST_DURATION = 3000;
const MAX_TOASTS = 5;

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 生成唯一 ID
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Store 实现
// ============================================================================

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        sidebar: {
          isOpen: true,
          isCollapsed: false,
          width: DEFAULT_SIDEBAR_WIDTH,
        },
        activeModal: null,
        modalHistory: [],
        toasts: [],
        maxToasts: MAX_TOASTS,
        toastQueue: [],
        globalLoading: false,
        loadingMessage: undefined,
        formDrafts: new Map(),

        // 侧边栏 - 切换
        toggleSidebar: () => {
          set((state) => ({
            sidebar: {
              ...state.sidebar,
              isOpen: !state.sidebar.isOpen,
            },
          }));
        },

        // 侧边栏 - 打开
        openSidebar: () => {
          set((state) => ({
            sidebar: {
              ...state.sidebar,
              isOpen: true,
              isCollapsed: false,
            },
          }));
        },

        // 侧边栏 - 关闭
        closeSidebar: () => {
          set((state) => ({
            sidebar: {
              ...state.sidebar,
              isOpen: false,
            },
          }));
        },

        // 侧边栏 - 切换折叠
        toggleSidebarCollapse: () => {
          set((state) => {
            const isCollapsed = !state.sidebar.isCollapsed;
            return {
              sidebar: {
                ...state.sidebar,
                isCollapsed,
                width: isCollapsed ? COLLAPSED_SIDEBAR_WIDTH : DEFAULT_SIDEBAR_WIDTH,
              },
            };
          });
        },

        // 侧边栏 - 设置宽度
        setSidebarWidth: (width) => {
          set((state) => ({
            sidebar: {
              ...state.sidebar,
              width,
            },
          }));
        },

        // Modal - 打开
        openModal: (modal) => {
          const newModal: Modal = {
            ...DEFAULT_MODAL,
            ...modal,
            id: generateId('modal'),
            isOpen: true,
          };

          set((state) => ({
            activeModal: newModal,
            modalHistory: [...state.modalHistory, newModal],
          }));
        },

        // Modal - 关闭
        closeModal: (modalId) => {
          // 在状态更新前捕获要关闭的 modal
          const state = get();
          const targetId = modalId || state.activeModal?.id;
          if (!targetId) return;

          const modalToClose = state.activeModal?.id === targetId
            ? state.activeModal
            : state.modalHistory.find((m) => m.id === targetId);

          set((state) => {
            const newHistory = state.modalHistory.map((m) =>
              m.id === targetId ? { ...m, isOpen: false } : m
            );

            return {
              activeModal: null,
              modalHistory: newHistory,
            };
          });

          // 触发 onClose 回调
          if (modalToClose?.onClose) {
            modalToClose.onClose();
          }
        },

        // Modal - 关闭所有
        closeAllModals: () => {
          const { modalHistory } = get();
          modalHistory.forEach((m) => {
            if (m.isOpen && m.onClose) {
              m.onClose();
            }
          });

          set({
            activeModal: null,
            modalHistory: modalHistory.map((m) => ({ ...m, isOpen: false })),
          });
        },

        // Modal - 更新
        updateModal: (modalId, updates) => {
          set((state) => {
            if (state.activeModal?.id === modalId) {
              return {
                activeModal: { ...state.activeModal, ...updates },
              };
            }
            return state;
          });
        },

        // Toast - 添加
        addToast: (toast) => {
          const newToast: Toast = {
            ...toast,
            id: generateId('toast'),
            createdAt: Date.now(),
            duration: toast.duration ?? DEFAULT_TOAST_DURATION,
          };

          set((state) => {
            const currentToasts = [...state.toasts];
            const newQueue = [...state.toastQueue];

            // 如果已达到最大数量，将新的 toast 加入队列
            if (currentToasts.length >= state.maxToasts) {
              newQueue.push(newToast);
              return { toastQueue: newQueue };
            }

            // 添加到当前 toasts
            const updatedToasts = [newToast, ...currentToasts];

            // 自动关闭
            if (newToast.duration && newToast.duration > 0) {
              setTimeout(() => {
                get().removeToast(newToast.id);
              }, newToast.duration);
            }

            return { toasts: updatedToasts };
          });

          return newToast.id;
        },

        // Toast - 移除
        removeToast: (toastId) => {
          set((state) => {
            const updatedToasts = state.toasts.filter((t) => t.id !== toastId);
            const newQueue = [...state.toastQueue];
            let nextToast: Toast | undefined;

            // 如果队列中有等待的 toast，加入当前列表
            if (updatedToasts.length < state.maxToasts && state.toastQueue.length > 0) {
              nextToast = newQueue.shift();
              if (nextToast) {
                updatedToasts.unshift(nextToast);

                // 自动关闭
                if (nextToast.duration && nextToast.duration > 0) {
                  setTimeout(() => {
                    get().removeToast(nextToast!.id);
                  }, nextToast.duration);
                }
              }
            }

            return {
              toasts: updatedToasts,
              toastQueue: newQueue,
            };
          });
        },

        // Toast - 清空所有
        clearToasts: () => {
          set({ toasts: [], toastQueue: [] });
        },

        // Toast - 按类型清空
        clearToastsByType: (type) => {
          set((state) => ({
            toasts: state.toasts.filter((t) => t.type !== type),
          }));
        },

        // Toast - 成功
        success: (message, title, options) => {
          return get().addToast({
            type: 'success',
            title,
            message,
            ...options,
          });
        },

        // Toast - 错误
        error: (message, title, options) => {
          return get().addToast({
            type: 'error',
            title,
            message,
            priority: 'high',
            duration: 5000,
            ...options,
          });
        },

        // Toast - 警告
        warning: (message, title, options) => {
          return get().addToast({
            type: 'warning',
            title,
            message,
            priority: 'medium',
            ...options,
          });
        },

        // Toast - 信息
        info: (message, title, options) => {
          return get().addToast({
            type: 'info',
            title,
            message,
            ...options,
          });
        },

        // Toast - 加载
        loading: (message, title) => {
          return get().addToast({
            type: 'loading',
            title,
            message,
            duration: 0, // 不自动关闭
          });
        },

        // 加载状态 - 设置
        setGlobalLoading: (loading, message) => {
          set({ globalLoading: loading, loadingMessage: message });
        },

        // 表单草稿 - 保存
        saveFormDraft: (formId, data) => {
          set((state) => {
            const newDrafts = new Map(state.formDrafts);
            newDrafts.set(formId, {
              id: generateId('draft'),
              formId,
              data,
              updatedAt: Date.now(),
            });
            return { formDrafts: newDrafts };
          });
        },

        // 表单草稿 - 加载
        loadFormDraft: (formId) => {
          const { formDrafts } = get();
          return formDrafts.get(formId)?.data;
        },

        // 表单草稿 - 删除
        deleteFormDraft: (formId) => {
          set((state) => {
            const newDrafts = new Map(state.formDrafts);
            newDrafts.delete(formId);
            return { formDrafts: newDrafts };
          });
        },

        // 表单草稿 - 清空
        clearFormDrafts: () => {
          set({ formDrafts: new Map() });
        },

        // 重置
        resetUI: () => {
          set({
            sidebar: {
              isOpen: true,
              isCollapsed: false,
              width: DEFAULT_SIDEBAR_WIDTH,
            },
            activeModal: null,
            modalHistory: [],
            toasts: [],
            toastQueue: [],
            globalLoading: false,
            loadingMessage: undefined,
          });
        },
      }),
      {
        name: STORAGE_KEY,
        // 只持久化部分状态（侧边栏状态和表单草稿）
        partialize: (state) => ({
          sidebar: state.sidebar,
          formDrafts: Array.from(state.formDrafts.entries()),
        }),
        // 自定义序列化以处理 Map
        storage: {
          getItem: (name) => {
            if (typeof window === 'undefined') return null;
            const str = localStorage.getItem(name);
            if (!str) return null;
            try {
              const data = JSON.parse(str);
              // 将数组转回 Map
              if (data.state?.formDrafts) {
                data.state.formDrafts = new Map(data.state.formDrafts);
              }
              return data;
            } catch {
              return null;
            }
          },
          setItem: (name, value) => {
            if (typeof window === 'undefined') return;
            // 将 Map 转为数组存储
            const data = { ...value };
            if (data.state?.formDrafts instanceof Map) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data.state.formDrafts = Array.from(data.state.formDrafts.entries()) as any;
            }
            try {
              localStorage.setItem(name, JSON.stringify(data));
            } catch (_error) {
              console.error('Failed to save UI store:', error);
            }
          },
          removeItem: (name) => {
            if (typeof window === 'undefined') return;
            localStorage.removeItem(name);
          },
        },
      }
    ),
    { name: 'ui-store' }
  )
);

// ============================================================================
// 选择器 Hooks
// ============================================================================

/**
 * 获取侧边栏状态
 */
export const useSidebar = () =>
  useUIStore((state) => ({
    isOpen: state.sidebar.isOpen,
    isCollapsed: state.sidebar.isCollapsed,
    width: state.sidebar.width,
    toggle: state.toggleSidebar,
    open: state.openSidebar,
    close: state.closeSidebar,
    toggleCollapse: state.toggleSidebarCollapse,
    setWidth: state.setSidebarWidth,
  }));

/**
 * 获取当前活动的 Modal
 */
export const useActiveModal = () =>
  useUIStore((state) => state.activeModal);

/**
 * 获取所有 Toast
 */
export const useToasts = () => useUIStore((state) => state.toasts);

/**
 * 获取 Toast 数量
 */
export const useToastCount = () => useUIStore((state) => state.toasts.length);

/**
 * 获取全局加载状态
 */
export const useGlobalLoading = () =>
  useUIStore((state) => ({
    isLoading: state.globalLoading,
    message: state.loadingMessage,
  }));

/**
 * 获取表单草稿
 */
export const useFormDraft = (formId: string) =>
  useUIStore((state) => state.formDrafts.get(formId)?.data);

/**
 * 检查表单是否有草稿
 */
export const useHasFormDraft = (formId: string) =>
  useUIStore((state) => state.formDrafts.has(formId));

// ============================================================================
// Action Hooks
// ============================================================================

/**
 * 获取 Modal 操作
 */
export const useModalActions = () =>
  useUIStore((state) => ({
    openModal: state.openModal,
    closeModal: state.closeModal,
    closeAllModals: state.closeAllModals,
    updateModal: state.updateModal,
  }));

/**
 * 获取 Toast 操作
 */
export const useToastActions = () =>
  useUIStore((state) => ({
    addToast: state.addToast,
    removeToast: state.removeToast,
    clearToasts: state.clearToasts,
    clearToastsByType: state.clearToastsByType,
    success: state.success,
    error: state.error,
    warning: state.warning,
    info: state.info,
    loading: state.loading,
  }));

/**
 * 获取加载状态操作
 */
export const useLoadingActions = () =>
  useUIStore((state) => ({
    setGlobalLoading: state.setGlobalLoading,
  }));

/**
 * 获取表单草稿操作
 */
export const useFormDraftActions = () =>
  useUIStore((state) => ({
    saveFormDraft: state.saveFormDraft,
    loadFormDraft: state.loadFormDraft,
    deleteFormDraft: state.deleteFormDraft,
    clearFormDrafts: state.clearFormDrafts,
  }));

// ============================================================================
// 实用 Hooks
// ============================================================================

/**
 * 是否有打开的 Modal
 */
export const useHasOpenModal = () =>
  useUIStore((state) => state.activeModal !== null);

/**
 * 是否有 Toast 通知
 */
export const useHasToasts = () =>
  useUIStore((state) => state.toasts.length > 0);

/**
 * 获取按类型分组的 Toast
 */
export const useToastsByType = (type: ToastType) =>
  useUIStore((state) => state.toasts.filter((t) => t.type === type));

// ============================================================================
// 外部访问 API
// ============================================================================

/**
 * 显示 Toast（非 React）
 */
export const toast = {
  success: (message: string, title?: string, options?: Partial<Toast>) => {
    return useUIStore.getState().success(message, title, options);
  },
  error: (message: string, title?: string, options?: Partial<Toast>) => {
    return useUIStore.getState().error(message, title, options);
  },
  warning: (message: string, title?: string, options?: Partial<Toast>) => {
    return useUIStore.getState().warning(message, title, options);
  },
  info: (message: string, title?: string, options?: Partial<Toast>) => {
    return useUIStore.getState().info(message, title, options);
  },
  loading: (message: string, title?: string) => {
    return useUIStore.getState().loading(message, title);
  },
};

/**
 * 打开 Modal（非 React）
 */
export const openModal = (modal: Omit<Modal, 'id' | 'isOpen'>) => {
  return useUIStore.getState().openModal(modal);
};

/**
 * 关闭 Modal（非 React）
 */
export const closeModal = (modalId?: string) => {
  return useUIStore.getState().closeModal(modalId);
};

/**
 * 设置全局加载状态（非 React）
 */
export const setGlobalLoading = (loading: boolean, message?: string) => {
  useUIStore.getState().setGlobalLoading(loading, message);
};
