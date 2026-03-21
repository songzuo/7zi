/**
 * Rating component with review form
 */

'use client';

import React, { useState } from 'react';
import { StarRating } from './StarRating';
import { CreateRatingDto } from '@/types/feedback';

interface RatingFormProps {
  targetType: 'agent' | 'task' | 'feature' | 'project' | 'overall';
  targetId: string;
  targetName?: string;
  onSubmit: (rating: CreateRatingDto) => Promise<void>;
  existingRating?: { rating: number; title?: string; description?: string };
  onCancel?: () => void;
  isLoading?: boolean;
}

export const RatingForm: React.FC<RatingFormProps> = ({
  targetType,
  targetId,
  targetName,
  onSubmit,
  existingRating,
  onCancel,
  isLoading = false,
}) => {
  const [rating, setRating] = useState(existingRating?.rating || 5);
  const [title, setTitle] = useState(existingRating?.title || '');
  const [description, setDescription] = useState(existingRating?.description || '');
  const [images, setImages] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => file.type.startsWith('image/'));

    if (validFiles.length === 0) {
      return;
    }

    if (images.length + validFiles.length > 5) {
      alert('最多只能上传5张图片');
      return;
    }

    const previews = validFiles.map(file => URL.createObjectURL(file));

    setImages(prev => [...prev, ...validFiles]);
    setPreviewImages(prev => [...prev, ...previews]);
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviewImages(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index]);
      return newPreviews.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating < 1 || rating > 5) {
      alert('请选择评分');
      return;
    }

    const ratingData: CreateRatingDto = {
      target_type: targetType,
      target_id: targetId,
      rating,
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      images: images.length > 0 ? images : undefined,
    };

    await onSubmit(ratingData);

    // Clean up preview URLs
    previewImages.forEach(url => URL.revokeObjectURL(url));
  };

  const targetLabels: Record<typeof targetType, string> = {
    agent: '智能体',
    task: '任务',
    feature: '功能',
    project: '项目',
    overall: '整体',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {targetName && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            评价对象: <span className="font-semibold">{targetLabels[targetType]} - {targetName}</span>
          </p>
        </div>
      )}

      {/* Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          您的评分 <span className="text-red-500">*</span>
        </label>
        <StarRating
          rating={rating}
          onRatingChange={setRating}
          size="lg"
          showLabels
        />
      </div>

      {/* Title */}
      <div>
        <label
          htmlFor="rating-title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          标题（可选）
        </label>
        <input
          type="text"
          id="rating-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="简要总结您的评价..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all"
          maxLength={100}
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {title.length}/100
          </span>
        </div>
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="rating-description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          详细评价（可选）
        </label>
        <textarea
          id="rating-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="分享您的使用体验..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-none transition-all"
          maxLength={1000}
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {description.length}/1000
          </span>
        </div>
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          图片上传（可选）
        </label>
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <input
            type="file"
            id="rating-images"
            multiple
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <label
            htmlFor="rating-images"
            className="flex flex-col items-center justify-center cursor-pointer"
          >
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              点击或拖拽上传图片
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-500">
              最多上传5张，每张不超过5MB
            </span>
          </label>
        </div>

        {/* Image Previews */}
        {previewImages.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {previewImages.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            取消
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {existingRating ? '更新中...' : '提交中...'}
            </>
          ) : existingRating ? (
            '更新评价'
          ) : (
            '提交评价'
          )}
        </button>
      </div>
    </form>
  );
};

/**
 * Rating display component with helpful buttons
 */
interface RatingDisplayProps {
  rating: {
    id: string;
    user_id: string;
    rating: number;
    title?: string;
    description?: string;
    helpful_count: number;
    not_helpful_count: number;
    is_helpful?: boolean;
    created_at: string;
    verified?: boolean;
  };
  userId?: string;
  onHelpfulClick?: (ratingId: string, isHelpful: boolean) => Promise<void>;
  showActions?: boolean;
}

export const RatingDisplay: React.FC<RatingDisplayProps> = ({
  rating,
  userId,
  onHelpfulClick,
  showActions = true,
}) => {
  const [isVoting, setIsVoting] = useState(false);
  const [isHelpful, setIsHelpful] = useState(rating.is_helpful);

  const handleHelpful = async (helpful: boolean) => {
    if (!onHelpfulClick || isVoting) return;

    setIsVoting(true);
    try {
      await onHelpfulClick(rating.id, helpful);
      setIsHelpful(helpful);
    } catch (error) {
      // Silently handle error in production
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to vote:', error);
      }
    } finally {
      setIsVoting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <StarRating
              rating={rating.rating}
              readonly
              size="sm"
              showLabels={false}
            />
            {rating.verified && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                ✓ 已验证用户
              </span>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(rating.created_at)}
            </span>
          </div>

          {/* Title */}
          {rating.title && (
            <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              {rating.title}
            </h4>
          )}

          {/* Description */}
          {rating.description && (
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-3">
              {rating.description}
            </p>
          )}
        </div>

        {/* Helpful Actions */}
        {showActions && onHelpfulClick && (
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleHelpful(true)}
                disabled={isVoting}
                className={`
                  flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${
                    isHelpful === true
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                <span>{rating.helpful_count}</span>
              </button>
              <button
                type="button"
                onClick={() => handleHelpful(false)}
                disabled={isVoting}
                className={`
                  flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${
                    isHelpful === false
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
                <span>{rating.not_helpful_count}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RatingForm;
