import React from 'react';
import { TaskTag, DEFAULT_TAGS } from '@/lib/tasks/types';

interface TagBadgeProps {
  tag: TaskTag;
  size?: 'sm' | 'md' | 'lg';
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

/**
 * 任务标签徽章组件
 */
export function TagBadge({
  tag,
  size = 'md',
  removable = false,
  onRemove,
  className = '',
}: TagBadgeProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const colorMap: Record<string, string> = {
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  };

  const colorClass = colorMap[tag.color] || colorMap.gray;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]} ${colorClass} ${className}`}
      role="badge"
      aria-label={`标签: ${tag.name}`}
    >
      <span>{tag.name}</span>
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
          aria-label={`移除标签 ${tag.name}`}
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
}

/**
 * 标签选择器组件
 */
interface TagSelectorProps {
  selectedTags: TaskTag[];
  availableTags?: TaskTag[];
  onChange: (tags: TaskTag[]) => void;
  disabled?: boolean;
  maxTags?: number;
  className?: string;
}

export function TagSelector({
  selectedTags,
  availableTags = DEFAULT_TAGS,
  onChange,
  disabled = false,
  maxTags = 5,
  className = '',
}: TagSelectorProps) {
  const toggleTag = (tag: TaskTag) => {
    const isSelected = selectedTags.some((t) => t.id === tag.id);
    if (isSelected) {
      onChange(selectedTags.filter((t) => t.id !== tag.id));
    } else {
      if (selectedTags.length >= maxTags) {
        return; // 达到最大标签数量
      }
      onChange([...selectedTags, tag]);
    }
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        标签 (最多 {maxTags} 个)
      </label>
      <div className="flex flex-wrap gap-2" role="group" aria-label="选择标签">
        {availableTags.map((tag) => {
          const isSelected = selectedTags.some((t) => t.id === tag.id);

          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag)}
              disabled={disabled}
              className={`
                px-3 py-1.5 rounded-lg border-2 transition-all
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
              aria-pressed={isSelected}
              aria-label={`${isSelected ? '取消选择' : '选择'}标签 ${tag.name}`}
            >
              <TagBadge tag={tag} size="sm" />
            </button>
          );
        })}
      </div>
      {selectedTags.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">已选择:</p>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <TagBadge
                key={tag.id}
                tag={tag}
                size="sm"
                removable
                onRemove={() => toggleTag(tag)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}