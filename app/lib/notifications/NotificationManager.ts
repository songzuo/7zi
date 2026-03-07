/**
 * 通知管理器 - 统一管理应用通知
 * 
 * 支持: success, error, warning, info 四种类型
 * 支持: 自动消失、手动关闭、堆叠显示
 */

export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type NotificationPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // 毫秒，0 表示不自动关闭
  createdAt: number;
  dismissed: boolean;
}

export interface NotificationOptions {
  title: string;
  message?: string;
  type?: NotificationType;
  duration?: number;
}

type NotificationListener = (notifications: Notification[]) => void;

export class NotificationManager {
  private notifications: Notification[] = [];
  private listeners: Set<NotificationListener> = new Set();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private maxNotifications = 5;
  private defaultDuration = 5000; // 5 秒

  /**
   * 添加通知
   */
  push(options: NotificationOptions): Notification {
    const notification: Notification = {
      id: this.generateId(),
      type: options.type || 'info',
      title: options.title,
      message: options.message,
      duration: options.duration ?? this.defaultDuration,
      createdAt: Date.now(),
      dismissed: false,
    };

    // 添加到列表开头
    this.notifications = [notification, ...this.notifications];

    // 限制最大数量
    if (this.notifications.length > this.maxNotifications) {
      const removed = this.notifications.pop();
      if (removed) {
        this.clearTimer(removed.id);
      }
    }

    // 设置自动消失
    if (notification.duration && notification.duration > 0) {
      this.setTimer(notification);
    }

    this.notifyListeners();
    return notification;
  }

  /**
   * 关闭指定通知
   */
  dismiss(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification && !notification.dismissed) {
      notification.dismissed = true;
      this.clearTimer(id);
      this.notifyListeners();

      // 延迟移除，允许动画执行
      setTimeout(() => {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.notifyListeners();
      }, 300);
    }
  }

  /**
   * 关闭所有通知
   */
  clearAll(): void {
    this.timers.forEach((_, id) => this.clearTimer(id));
    this.notifications = [];
    this.notifyListeners();
  }

  /**
   * 获取当前所有通知
   */
  getAll(): Notification[] {
    return [...this.notifications];
  }

  /**
   * 订阅通知变化
   */
  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ========== 快捷方法 ==========

  success(title: string, message?: string, duration?: number): Notification {
    return this.push({ type: 'success', title, message, duration });
  }

  error(title: string, message?: string, duration?: number): Notification {
    return this.push({ type: 'error', title, message, duration: duration ?? 8000 }); // 错误默认 8 秒
  }

  warning(title: string, message?: string, duration?: number): Notification {
    return this.push({ type: 'warning', title, message, duration });
  }

  info(title: string, message?: string, duration?: number): Notification {
    return this.push({ type: 'info', title, message, duration });
  }

  // ========== 私有方法 ==========

  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setTimer(notification: Notification): void {
    if (!notification.duration) return;

    const timer = setTimeout(() => {
      this.dismiss(notification.id);
    }, notification.duration);

    this.timers.set(notification.id, timer);
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getAll());
      } catch (err) {
        console.error('Notification listener error:', err);
      }
    });
  }
}

// 单例导出
export const notificationManager = new NotificationManager();

// 默认导出
export default notificationManager;