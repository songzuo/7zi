/**
 * EmptyState 组件 - 空状态展示
 * 用于列表、表格、搜索等空状态展示
 * 
 * @example
 * // 基本用法
 * <EmptyState
 *   title="暂无数据"
 *   description="还没有任何内容"
 *   action={{ label: '添加', onClick: handleAdd }}
 * />
 * 
 * // 使用预设变体
 * <EmptyList onAdd={handleAdd} />
 * <EmptySearch keyword="测试" />
 * <EmptyError onRetry={handleRetry} />
 */

import React from 'react';
import clsx from 'clsx';
import { Button } from './Button';

export interface EmptyStateProps {
  /** 图标 */
  icon?: React.ReactNode;
  /** 标题 */
  title: string;
  /** 描述 */
  description?: string;
  /** 操作按钮 */
  action?: {
    label: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    onClick: () => void;
  };
  /** 自定义类名 */
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {icon && (
        <div className="mb-4 text-gray-400 dark:text-gray-500" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <Button
          variant={action.variant || 'primary'}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

/**
 * EmptyList 组件 - 空列表状态
 * 用于列表、表格等无数据时的展示
 * 
 * @example
 * <EmptyList onAdd={() => console.log('add')} />
 */
export interface EmptyListProps {
  /** 自定义标题 */
  title?: string;
  /** 自定义描述 */
  description?: string;
  /** 添加按钮的标签 */
  actionLabel?: string;
  /** 点击添加的回调 */
  onAdd?: () => void;
  /** 自定义类名 */
  className?: string;
}

export const EmptyList: React.FC<EmptyListProps> = ({
  title = '暂无数据',
  description = '还没有任何内容，点击下方按钮添加',
  actionLabel = '添加',
  onAdd,
  className,
}) => (
  <EmptyState
    icon={
      <svg
        className="w-16 h-16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    }
    title={title}
    description={description}
    action={onAdd ? { label: actionLabel, onClick: onAdd } : undefined}
    className={className}
  />
);

/**
 * EmptySearch 组件 - 空搜索结果状态
 * 用于搜索无结果时的展示
 * 
 * @example
 * <EmptySearch keyword="测试" />
 */
export interface EmptySearchProps {
  /** 搜索关键词 */
  keyword?: string;
  /** 自定义标题 */
  title?: string;
  /** 自定义描述 */
  description?: string;
  /** 清除搜索的回调 */
  onClear?: () => void;
  /** 自定义类名 */
  className?: string;
}

export const EmptySearch: React.FC<EmptySearchProps> = ({
  keyword,
  title = '未找到结果',
  description = keyword 
    ? `没有找到 "${keyword}" 相关的内容` 
    : '没有找到相关内容，请尝试其他关键词',
  onClear,
  className,
}) => (
  <EmptyState
    icon={
      <svg
        className="w-16 h-16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    }
    title={title}
    description={description}
    action={onClear ? { label: '清除搜索', variant: 'outline', onClick: onClear } : undefined}
    className={className}
  />
);

/**
 * EmptyError 组件 - 加载错误状态
 * 用于加载失败时的展示
 * 
 * @example
 * <EmptyError onRetry={() => console.log('retry')} />
 */
export interface EmptyErrorProps {
  /** 错误信息 */
  error?: string;
  /** 自定义标题 */
  title?: string;
  /** 自定义描述 */
  description?: string;
  /** 重试按钮的标签 */
  actionLabel?: string;
  /** 点击重试的回调 */
  onRetry?: () => void;
  /** 自定义类名 */
  className?: string;
}

export const EmptyError: React.FC<EmptyErrorProps> = ({
  error,
  title = '加载失败',
  description = error || '数据加载失败，请重试',
  actionLabel = '重试',
  onRetry,
  className,
}) => (
  <EmptyState
    icon={
      <svg
        className="w-16 h-16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    }
    title={title}
    description={description}
    action={onRetry ? { label: actionLabel, variant: 'primary', onClick: onRetry } : undefined}
    className={className}
  />
);

/**
 * EmptyNetwork 组件 - 网络错误状态
 * 用于网络错误时的展示
 * 
 * @example
 * <EmptyNetwork onRetry={() => console.log('retry')} />
 */
export interface EmptyNetworkProps {
  /** 自定义标题 */
  title?: string;
  /** 自定义描述 */
  description?: string;
  /** 重试按钮的标签 */
  actionLabel?: string;
  /** 点击重试的回调 */
  onRetry?: () => void;
  /** 自定义类名 */
  className?: string;
}

export const EmptyNetwork: React.FC<EmptyNetworkProps> = ({
  title = '网络连接失败',
  description = '请检查网络连接后重试',
  actionLabel = '重试',
  onRetry,
  className,
}) => (
  <EmptyState
    icon={
      <svg
        className="w-16 h-16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
        />
      </svg>
    }
    title={title}
    description={description}
    action={onRetry ? { label: actionLabel, variant: 'primary', onClick: onRetry } : undefined}
    className={className}
  />
);

/**
 * EmptyPermission 组件 - 权限不足状态
 * 用于权限不足时的展示
 * 
 * @example
 * <EmptyPermission />
 */
export interface EmptyPermissionProps {
  /** 自定义标题 */
  title?: string;
  /** 自定义描述 */
  description?: string;
  /** 返回首页的回调 */
  onBack?: () => void;
  /** 自定义类名 */
  className?: string;
}

export const EmptyPermission: React.FC<EmptyPermissionProps> = ({
  title = '权限不足',
  description = '您没有权限访问此内容',
  onBack,
  className,
}) => (
  <EmptyState
    icon={
      <svg
        className="w-16 h-16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    }
    title={title}
    description={description}
    action={onBack ? { label: '返回首页', variant: 'outline', onClick: onBack } : undefined}
    className={className}
  />
);

/**
 * EmptyMaintenance 组件 - 系统维护状态
 * 用于系统维护时的展示
 * 
 * @example
 * <EmptyMaintenance />
 */
export interface EmptyMaintenanceProps {
  /** 自定义标题 */
  title?: string;
  /** 自定义描述 */
  description?: string;
  /** 预计恢复时间 */
  estimatedTime?: string;
  /** 联系支持 */
  onContact?: () => void;
  /** 自定义类名 */
  className?: string;
}

export const EmptyMaintenance: React.FC<EmptyMaintenanceProps> = ({
  title = '系统维护中',
  description = '系统正在进行维护升级，请稍后再试',
  estimatedTime,
  onContact,
  className,
}) => (
  <EmptyState
    icon={
      <svg
        className="w-16 h-16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    }
    title={title}
    description={
      <div className="space-y-2">
        <p>{description}</p>
        {estimatedTime && (
          <p className="text-sm">
            预计恢复时间: <span className="font-medium">{estimatedTime}</span>
          </p>
        )}
      </div>
    }
    action={onContact ? { label: '联系支持', variant: 'outline', onClick: onContact } : undefined}
    className={className}
  />
);
