/**
 * @fileoverview Enhanced Empty State Components
 * @description 友好的空状态展示组件，支持多种场景
 *
 * Features:
 * - 多种预设场景（任务列表、项目列表、搜索结果、通知等）
 * - 自定义图标、标题、描述
 * - 支持操作按钮
 * - 响应式设计
 * - 深色/浅色模式
 * - ARIA 无障碍支持
 */

'use client';

import { memo, type FC, type ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export type EmptyStateVariant =
  | 'default'
  | 'tasks'
  | 'projects'
  | 'search'
  | 'notifications'
  | 'messages'
  | 'files'
  | 'data'
  | 'error'
  | 'no-permission'
  | 'coming-soon';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  icon?: ReactNode;
}

export interface EmptyStateProps {
  /** 预设变体 */
  variant?: EmptyStateVariant;
  /** 自定义图标（emoji 或 React 节点） */
  icon?: string | ReactNode;
  /** 标题 */
  title?: string;
  /** 描述文字 */
  description?: string;
  /** 操作按钮 */
  action?: EmptyStateAction;
  /** 次要操作按钮 */
  secondaryAction?: EmptyStateAction;
  /** 自定义内容 */
  children?: ReactNode;
  /** 紧凑模式 */
  compact?: boolean;
  /** 自定义类名 */
  className?: string;
}

// ============================================================================
// Preset Configurations
// ============================================================================

interface PresetConfig {
  icon: string;
  title: string;
  description: string;
}

const PRESET_CONFIGS: Record<EmptyStateVariant, PresetConfig> = {
  default: {
    icon: '📭',
    title: '暂无内容',
    description: '这里还没有任何内容',
  },
  tasks: {
    icon: '📋',
    title: '暂无任务',
    description: '创建您的第一个任务，开始管理工作',
  },
  projects: {
    icon: '📁',
    title: '暂无项目',
    description: '创建一个新项目，组织您的工作流程',
  },
  search: {
    icon: '🔍',
    title: '未找到结果',
    description: '尝试使用不同的关键词进行搜索',
  },
  notifications: {
    icon: '🔔',
    title: '暂无通知',
    description: '当有新消息时，您会在这里看到通知',
  },
  messages: {
    icon: '💬',
    title: '暂无消息',
    description: '开始与团队成员交流吧',
  },
  files: {
    icon: '📄',
    title: '暂无文件',
    description: '上传文件以共享和协作',
  },
  data: {
    icon: '📊',
    title: '暂无数据',
    description: '当有数据可用时，将在此处显示',
  },
  error: {
    icon: '⚠️',
    title: '加载失败',
    description: '数据加载出现问题，请稍后重试',
  },
  'no-permission': {
    icon: '🔒',
    title: '无访问权限',
    description: '您没有权限查看此内容',
  },
  'coming-soon': {
    icon: '🚀',
    title: '即将推出',
    description: '此功能正在开发中，敬请期待',
  },
};

// ============================================================================
// Icon Renderer
// ============================================================================

interface IconProps {
  icon: string | ReactNode;
  size: 'sm' | 'md' | 'lg';
}

const IconRenderer: FC<IconProps> = memo(({ icon, size }) => {
  const sizeClasses = {
    sm: 'text-3xl',
    md: 'text-5xl',
    lg: 'text-6xl',
  };

  if (typeof icon === 'string') {
    return (
      <span
        className={`${sizeClasses[size]} select-none`}
        role="img"
        aria-hidden="true"
      >
        {icon}
      </span>
    );
  }

  return (
    <div className={`${sizeClasses[size]} flex items-center justify-center`}>
      {icon}
    </div>
  );
});

IconRenderer.displayName = 'IconRenderer';

// ============================================================================
// Action Button
// ============================================================================

interface ActionButtonProps {
  action: EmptyStateAction;
  size: 'sm' | 'md';
}

const ActionButton: FC<ActionButtonProps> = memo(({ action, size }) => {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200';
  const sizeClasses = size === 'sm'
    ? 'px-4 py-2 text-sm rounded-lg'
    : 'px-6 py-3 text-base rounded-full';

  const variantClasses = action.variant === 'secondary'
    ? 'border-2 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:border-cyan-500 hover:text-cyan-500'
    : 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:shadow-lg hover:shadow-cyan-500/25 hover:-translate-y-0.5';

  return (
    <button
      onClick={action.onClick}
      className={`${baseClasses} ${sizeClasses} ${variantClasses}`}
      aria-label={action.label}
    >
      {action.icon && <span className="flex-shrink-0">{action.icon}</span>}
      {action.label}
    </button>
  );
});

ActionButton.displayName = 'ActionButton';

// ============================================================================
// Main EmptyState Component
// ============================================================================

export const EmptyState: FC<EmptyStateProps> = memo(({
  variant = 'default',
  icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  compact = false,
  className = '',
}) => {
  const preset = PRESET_CONFIGS[variant];

  const finalIcon = icon ?? preset.icon;
  const finalTitle = title ?? preset.title;
  const finalDescription = description ?? preset.description;

  const iconSize = compact ? 'sm' : 'md';
  const containerPadding = compact ? 'py-8' : 'py-16';
  const textSpacing = compact ? 'mt-2' : 'mt-4';

  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center
        ${containerPadding} px-4
        ${className}
      `}
      role="status"
      aria-label={finalTitle}
    >
      {/* Icon */}
      <div className="animate-fade-in">
        <IconRenderer icon={finalIcon} size={iconSize} />
      </div>

      {/* Title */}
      <h3
        className={`
          text-lg sm:text-xl font-semibold
          text-zinc-800 dark:text-zinc-100
          ${textSpacing}
          animate-fade-in-up
        `}
        style={{ animationDelay: '100ms' }}
      >
        {finalTitle}
      </h3>

      {/* Description */}
      {finalDescription && (
        <p
          className={`
            text-sm sm:text-base
            text-zinc-500 dark:text-zinc-400
            mt-2 max-w-md
            animate-fade-in-up
          `}
          style={{ animationDelay: '200ms' }}
        >
          {finalDescription}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div
          className={`
            flex flex-col sm:flex-row gap-3
            mt-6
            animate-fade-in-up
          `}
          style={{ animationDelay: '300ms' }}
        >
          {action && <ActionButton action={action} size={compact ? 'sm' : 'md'} />}
          {secondaryAction && (
            <ActionButton
              action={{ ...secondaryAction, variant: 'secondary' }}
              size={compact ? 'sm' : 'md'}
            />
          )}
        </div>
      )}

      {/* Custom Content */}
      {children && (
        <div
          className="mt-6 animate-fade-in-up"
          style={{ animationDelay: '400ms' }}
        >
          {children}
        </div>
      )}
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

// ============================================================================
// Specialized Empty State Components
// ============================================================================

/** 任务列表空状态 */
export const EmptyTasks: FC<Omit<EmptyStateProps, 'variant'>> = (props) => (
  <EmptyState variant="tasks" {...props} />
);

/** 项目列表空状态 */
export const EmptyProjects: FC<Omit<EmptyStateProps, 'variant'>> = (props) => (
  <EmptyState variant="projects" {...props} />
);

/** 搜索结果空状态 */
export const EmptySearch: FC<Omit<EmptyStateProps, 'variant'>> = (props) => (
  <EmptyState variant="search" {...props} />
);

/** 通知列表空状态 */
export const EmptyNotifications: FC<Omit<EmptyStateProps, 'variant'>> = (props) => (
  <EmptyState variant="notifications" {...props} />
);

/** 消息列表空状态 */
export const EmptyMessages: FC<Omit<EmptyStateProps, 'variant'>> = (props) => (
  <EmptyState variant="messages" {...props} />
);

/** 文件列表空状态 */
export const EmptyFiles: FC<Omit<EmptyStateProps, 'variant'>> = (props) => (
  <EmptyState variant="files" {...props} />
);

/** 数据空状态 */
export const EmptyData: FC<Omit<EmptyStateProps, 'variant'>> = (props) => (
  <EmptyState variant="data" {...props} />
);

/** 错误状态 */
export const ErrorState: FC<Omit<EmptyStateProps, 'variant'>> = (props) => (
  <EmptyState variant="error" {...props} />
);

/** 无权限状态 */
export const NoPermission: FC<Omit<EmptyStateProps, 'variant'>> = (props) => (
  <EmptyState variant="no-permission" {...props} />
);

/** 即将推出状态 */
export const ComingSoon: FC<Omit<EmptyStateProps, 'variant'>> = (props) => (
  <EmptyState variant="coming-soon" {...props} />
);

// ============================================================================
// Exports
// ============================================================================

export default EmptyState;
