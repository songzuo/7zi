/**
 * @fileoverview 通知中心类型定义
 * @description 定义通知相关的类型和接口
 */

/** 通知类型 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/** 通知优先级 */
export type NotificationPriority = 'low' | 'medium' | 'high';

/** 通知项接口 */
export interface Notification {
  /** 通知唯一标识 */
  id: string;
  /** 通知标题 */
  title: string;
  /** 通知内容 */
  message: string;
  /** 通知类型 */
  type: NotificationType;
  /** 通知优先级 */
  priority?: NotificationPriority;
  /** 是否已读 */
  read: boolean;
  /** 创建时间 */
  createdAt: Date;
  /** 可选的链接地址 */
  link?: string;
  /** 可选的图标名称 */
  icon?: string;
}

/** 通知中心组件 Props */
export interface NotificationCenterProps {
  /** 通知列表 */
  notifications: Notification[];
  /** 标记已读回调 */
  onMarkAsRead?: (id: string) => void;
  /** 标记全部已读回调 */
  onMarkAllAsRead?: () => void;
  /** 清空所有通知回调 */
  onClearAll?: () => void;
  /** 删除单个通知回调 */
  onDelete?: (id: string) => void;
  /** 是否显示未读数量徽章 */
  showUnreadBadge?: boolean;
  /** 最大显示数量 */
  maxVisible?: number;
  /** 自定义类名 */
  className?: string;
}

/** 通知项组件 Props */
export interface NotificationItemProps {
  /** 通知数据 */
  notification: Notification;
  /** 标记已读回调 */
  onMarkAsRead?: (id: string) => void;
  /** 删除回调 */
  onDelete?: (id: string) => void;
}

/** 通知徽章组件 Props */
export interface NotificationBadgeProps {
  /** 未读数量 */
  count: number;
  /** 最大显示数字 */
  maxCount?: number;
}