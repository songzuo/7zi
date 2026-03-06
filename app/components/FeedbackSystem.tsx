'use client';

import React, { memo, useCallback, useState } from 'react';
import { Rating } from './Rating';

export interface FeedbackItem {
  id: string;
  userId: string;
  userName?: string;
  rating: number;
  category: FeedbackCategory;
  title: string;
  content: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  responses?: FeedbackResponse[];
}

export interface FeedbackResponse {
  id: string;
  content: string;
  createdAt: string;
  isAdmin: boolean;
}

export type FeedbackCategory =
  | 'bug'
  | 'feature'
  | 'improvement'
  | 'question'
  | 'other';

export type FeedbackStatus =
  | 'pending'
  | 'reviewing'
  | 'resolved'
  | 'rejected';

// 分类配置
const CATEGORY_CONFIG: Record<FeedbackCategory, {
  label: string;
  icon: string;
  color: string;
}> = {
  bug: {
    label: 'Bug 反馈',
    icon: '🐛',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  feature: {
    label: '功能建议',
    icon: '💡',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  improvement: {
    label: '改进建议',
    icon: '⚡',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  question: {
    label: '问题咨询',
    icon: '❓',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  other: {
    label: '其他',
    icon: '📝',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
  },
};

// 状态配置
const STATUS_CONFIG: Record<FeedbackStatus, {
  label: string;
  color: string;
}> = {
  pending: {
    label: '待处理',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  },
  reviewing: {
    label: '处理中',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  resolved: {
    label: '已解决',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  rejected: {
    label: '已拒绝',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
};

// ============================================================================
// 反馈表单组件
// ============================================================================

export interface FeedbackFormProps {
  onSubmit: (feedback: Omit<FeedbackItem, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => void;
  onCancel?: () => void;
  defaultCategory?: FeedbackCategory;
}

const FeedbackFormComponent: React.FC<FeedbackFormProps> = ({
  onSubmit,
  onCancel,
  defaultCategory = 'other',
}) => {
  const [formData, setFormData] = useState({
    rating: 0,
    category: defaultCategory,
    title: '',
    content: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.title.trim() || !formData.content.trim() || formData.rating === 0) {
        return;
      }
      onSubmit({
        userId: 'current-user', // 实际应用中从认证系统获取
        userName: '当前用户',
        rating: formData.rating,
        category: formData.category,
        title: formData.title,
        content: formData.content,
        tags: formData.tags,
      });
      // 重置表单
      setFormData({
        rating: 0,
        category: defaultCategory,
        title: '',
        content: '',
        tags: [],
      });
    },
    [formData, onSubmit, defaultCategory]
  );

  const addTag = useCallback(() => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setTagInput('');
  }, [tagInput, formData.tags]);

  const removeTag = useCallback((tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg space-y-6"
    >
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
        提交反馈
      </h3>

      {/* 评分 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          整体评分 *
        </label>
        <Rating
          value={formData.rating}
          onChange={(rating) => setFormData((prev) => ({ ...prev, rating }))}
          size="lg"
          showValue
        />
      </div>

      {/* 分类 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          反馈类型 *
        </label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORY_CONFIG) as FeedbackCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, category: cat }))}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${formData.category === cat
                  ? CATEGORY_CONFIG[cat].color + ' ring-2 ring-offset-2 dark:ring-offset-gray-800'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
            >
              <span className="mr-1.5">{CATEGORY_CONFIG[cat].icon}</span>
              {CATEGORY_CONFIG[cat].label}
            </button>
          ))}
        </div>
      </div>

      {/* 标题 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          标题 *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="简要描述您的反馈"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {/* 内容 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          详细描述 *
        </label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
          placeholder="请详细描述您的反馈内容..."
          rows={5}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          required
        />
      </div>

      {/* 标签 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          标签 (可选)
        </label>
        <div className="flex gap-2 mb-2 flex-wrap">
          {formData.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-blue-900 dark:hover:text-blue-200"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="输入标签后按回车添加"
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            添加
          </button>
        </div>
      </div>

      {/* 按钮 */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={formData.rating === 0 || !formData.title.trim() || !formData.content.trim()}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          提交反馈
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            取消
          </button>
        )}
      </div>
    </form>
  );
};

export const FeedbackForm = memo(FeedbackFormComponent);

// ============================================================================
// 反馈卡片组件
// ============================================================================

export interface FeedbackCardProps {
  feedback: FeedbackItem;
  onStatusChange?: (id: string, status: FeedbackStatus) => void;
  onRespond?: (id: string, response: string) => void;
  isAdmin?: boolean;
}

const FeedbackCardComponent: React.FC<FeedbackCardProps> = ({
  feedback,
  onStatusChange,
  onRespond,
  isAdmin = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [showResponseForm, setShowResponseForm] = useState(false);

  const categoryConfig = CATEGORY_CONFIG[feedback.category];
  const statusConfig = STATUS_CONFIG[feedback.status];

  const handleResponse = useCallback(() => {
    if (responseText.trim() && onRespond) {
      onRespond(feedback.id, responseText);
      setResponseText('');
      setShowResponseForm(false);
    }
  }, [feedback.id, responseText, onRespond]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow">
      {/* 头部 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${categoryConfig.color}`}>
            {categoryConfig.icon} {categoryConfig.label}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
        <Rating value={feedback.rating} readonly size="sm" showValue={false} />
      </div>

      {/* 标题 */}
      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {feedback.title}
      </h4>

      {/* 内容 */}
      <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-3">
        {feedback.content}
      </p>

      {/* 标签 */}
      {feedback.tags && feedback.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {feedback.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 元信息 */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>
          {feedback.userName || '匿名用户'} · {new Date(feedback.createdAt).toLocaleDateString('zh-CN')}
        </span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          {isExpanded ? '收起' : '展开详情'}
        </button>
      </div>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
          {/* 完整内容 */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              详细内容
            </h5>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {feedback.content}
            </p>
          </div>

          {/* 回复列表 */}
          {feedback.responses && feedback.responses.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                回复 ({feedback.responses.length})
              </h5>
              {feedback.responses.map((response) => (
                <div
                  key={response.id}
                  className={`p-3 rounded-lg ${
                    response.isAdmin
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                      : 'bg-gray-50 dark:bg-gray-700/50'
                  }`}
                >
                  <p className="text-gray-700 dark:text-gray-300">{response.content}</p>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                    {response.isAdmin ? '管理员' : '用户'} · {new Date(response.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 管理员操作 */}
          {isAdmin && (
            <div className="space-y-3">
              {/* 状态变更 */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  更改状态
                </h5>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(STATUS_CONFIG) as FeedbackStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => onStatusChange?.(feedback.id, status)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        feedback.status === status
                          ? STATUS_CONFIG[status].color + ' ring-2 ring-offset-2'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {STATUS_CONFIG[status].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 回复表单 */}
              {showResponseForm ? (
                <div className="space-y-2">
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="输入回复内容..."
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleResponse}
                      disabled={!responseText.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      发送回复
                    </button>
                    <button
                      onClick={() => setShowResponseForm(false)}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowResponseForm(true)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  回复
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const FeedbackCard = memo(FeedbackCardComponent);

// ============================================================================
// 反馈列表组件
// ============================================================================

export interface FeedbackListProps {
  feedbacks: FeedbackItem[];
  onStatusChange?: (id: string, status: FeedbackStatus) => void;
  onRespond?: (id: string, response: string) => void;
  isAdmin?: boolean;
  filter?: {
    category?: FeedbackCategory;
    status?: FeedbackStatus;
    minRating?: number;
  };
}

const FeedbackListComponent: React.FC<FeedbackListProps> = ({
  feedbacks,
  onStatusChange,
  onRespond,
  isAdmin,
  filter,
}) => {
  // 应用过滤
  const filteredFeedbacks = feedbacks.filter((f) => {
    if (filter?.category && f.category !== filter.category) return false;
    if (filter?.status && f.status !== filter.status) return false;
    if (filter?.minRating && f.rating < filter.minRating) return false;
    return true;
  });

  if (filteredFeedbacks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">暂无反馈数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredFeedbacks.map((feedback) => (
        <FeedbackCard
          key={feedback.id}
          feedback={feedback}
          onStatusChange={onStatusChange}
          onRespond={onRespond}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
};

export const FeedbackList = memo(FeedbackListComponent);

// ============================================================================
// 反馈统计组件
// ============================================================================

export interface FeedbackStatsProps {
  feedbacks: FeedbackItem[];
}

const FeedbackStatsComponent: React.FC<FeedbackStatsProps> = ({ feedbacks }) => {
  const stats = React.useMemo(() => {
    const total = feedbacks.length;
    const avgRating = total > 0
      ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / total
      : 0;

    const byCategory = Object.keys(CATEGORY_CONFIG).reduce((acc, cat) => {
      acc[cat as FeedbackCategory] = feedbacks.filter((f) => f.category === cat).length;
      return acc;
    }, {} as Record<FeedbackCategory, number>);

    const byStatus = Object.keys(STATUS_CONFIG).reduce((acc, status) => {
      acc[status as FeedbackStatus] = feedbacks.filter((f) => f.status === status).length;
      return acc;
    }, {} as Record<FeedbackStatus, number>);

    return { total, avgRating, byCategory, byStatus };
  }, [feedbacks]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 总数 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md">
        <p className="text-sm text-gray-500 dark:text-gray-400">总反馈数</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
      </div>

      {/* 平均评分 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md">
        <p className="text-sm text-gray-500 dark:text-gray-400">平均评分</p>
        <div className="flex items-center gap-2">
          <p className="text-3xl font-bold text-yellow-500">{stats.avgRating.toFixed(1)}</p>
          <span className="text-2xl">⭐</span>
        </div>
      </div>

      {/* 待处理 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md">
        <p className="text-sm text-gray-500 dark:text-gray-400">待处理</p>
        <p className="text-3xl font-bold text-blue-500">{stats.byStatus.pending}</p>
      </div>

      {/* 已解决 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md">
        <p className="text-sm text-gray-500 dark:text-gray-400">已解决</p>
        <p className="text-3xl font-bold text-green-500">{stats.byStatus.resolved}</p>
      </div>
    </div>
  );
};

export const FeedbackStats = memo(FeedbackStatsComponent);

// ============================================================================
// 完整的反馈系统组件
// ============================================================================

export interface FeedbackSystemProps {
  initialFeedbacks?: FeedbackItem[];
  isAdmin?: boolean;
}

const FeedbackSystemComponent: React.FC<FeedbackSystemProps> = ({
  initialFeedbacks = [],
  isAdmin = false,
}) => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>(initialFeedbacks);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<{
    category?: FeedbackCategory;
    status?: FeedbackStatus;
  }>({});

  const handleSubmit = useCallback(
    (data: Omit<FeedbackItem, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
      const newFeedback: FeedbackItem = {
        ...data,
        id: `fb-${Date.now()}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setFeedbacks((prev) => [newFeedback, ...prev]);
      setShowForm(false);
    },
    []
  );

  const handleStatusChange = useCallback((id: string, status: FeedbackStatus) => {
    setFeedbacks((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, status, updatedAt: new Date().toISOString() } : f
      )
    );
  }, []);

  const handleRespond = useCallback((id: string, response: string) => {
    setFeedbacks((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const newResponse: FeedbackResponse = {
          id: `resp-${Date.now()}`,
          content: response,
          createdAt: new Date().toISOString(),
          isAdmin,
        };
        return {
          ...f,
          responses: [...(f.responses || []), newResponse],
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, [isAdmin]);

  return (
    <div className="space-y-6">
      {/* 统计 */}
      <FeedbackStats feedbacks={feedbacks} />

      {/* 工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md">
        <div className="flex flex-wrap gap-2">
          {/* 分类过滤 */}
          <select
            value={filter.category || ''}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                category: e.target.value as FeedbackCategory || undefined,
              }))
            }
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">所有类型</option>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.icon} {config.label}
              </option>
            ))}
          </select>

          {/* 状态过滤 */}
          <select
            value={filter.status || ''}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                status: e.target.value as FeedbackStatus || undefined,
              }))
            }
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">所有状态</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? '取消' : '+ 新建反馈'}
        </button>
      </div>

      {/* 表单 */}
      {showForm && (
        <FeedbackForm onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />
      )}

      {/* 列表 */}
      <FeedbackList
        feedbacks={feedbacks}
        filter={filter}
        onStatusChange={handleStatusChange}
        onRespond={handleRespond}
        isAdmin={isAdmin}
      />
    </div>
  );
};

export const FeedbackSystem = memo(FeedbackSystemComponent);

export default FeedbackSystem;