/**
 * Enhanced feedback modal with image upload support
 */

'use client';

import React, { useState, useCallback } from 'react';
import { StarRating } from './StarRating';
import { FeedbackType, CreateFeedbackDto } from '@/types/feedback';

interface EnhancedFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: CreateFeedbackDto) => Promise<void>;
  isLoading?: boolean;
  feedbackType?: FeedbackType;
}

interface FeedbackTypeOption {
  value: FeedbackType;
  label: string;
  icon: string;
  description: string;
}

const FEEDBACK_TYPES: FeedbackTypeOption[] = [
  {
    value: FeedbackType.GENERAL,
    label: '一般反馈',
    icon: '💬',
    description: '分享您的想法和建议',
  },
  {
    value: FeedbackType.BUG,
    label: '问题报告',
    icon: '🐛',
    description: '报告遇到的错误或问题',
  },
  {
    value: FeedbackType.FEATURE,
    label: '功能建议',
    icon: '💡',
    description: '提出新功能或改进建议',
  },
  {
    value: FeedbackType.SUGGESTION,
    label: '建议',
    icon: '✨',
    description: '提供改进建议',
  },
  {
    value: FeedbackType.COMPLAINT,
    label: '投诉',
    icon: '😠',
    description: '反馈不满意的地方',
  },
  {
    value: FeedbackType.COMPLIMENT,
    label: '表扬',
    icon: '👍',
    description: '称赞做得好的地方',
  },
  {
    value: FeedbackType.OTHER,
    label: '其他',
    icon: '📝',
    description: '其他类型的反馈',
  },
];

export function EnhancedFeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  feedbackType = FeedbackType.GENERAL,
}: EnhancedFeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>(feedbackType);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setType(feedbackType);
      setRating(5);
      setTitle('');
      setDescription('');
      setEmail('');
      setImages([]);
      setPreviewImages([]);
    }
  }, [isOpen, feedbackType]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => file.type.startsWith('image/'));

    if (validFiles.length === 0) {
      return;
    }

    // Check total number of images
    if (images.length + validFiles.length > 5) {
      alert('最多只能上传5张图片');
      return;
    }

    // Create preview URLs
    const previews = validFiles.map(file => URL.createObjectURL(file));

    setImages(prev => [...prev, ...validFiles]);
    setPreviewImages(prev => [...prev, ...previews]);
  }, [images]);

  const handleRemoveImage = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviewImages(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index]);
      return newPreviews.filter((_, i) => i !== index);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      alert('请填写标题和详细描述');
      return;
    }

    if (rating < 1 || rating > 5) {
      alert('请选择评分');
      return;
    }

    const feedback: CreateFeedbackDto = {
      type,
      rating,
      title: title.trim(),
      description: description.trim(),
      email: email.trim() || undefined,
      images: images.length > 0 ? images : undefined,
    };

    await onSubmit(feedback);
    onClose();

    // Clean up preview URLs
    previewImages.forEach(url => URL.revokeObjectURL(url));
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl transform rounded-xl bg-white dark:bg-zinc-900 shadow-2xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-6 py-4">
            <h3
              id="modal-title"
              className="text-lg font-semibold text-zinc-900 dark:text-white"
            >
              提交反馈
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1 transition-colors"
              aria-label="关闭"
            >
              <svg
                className="h-6 w-6"
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
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
            {/* Feedback Type */}
            <div>
              <label
                htmlFor="feedback-type"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3"
              >
                反馈类型
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FEEDBACK_TYPES.map((ft) => (
                  <button
                    key={ft.value}
                    type="button"
                    onClick={() => setType(ft.value)}
                    className={`
                      flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all
                      ${
                        type === ft.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                      }
                    `}
                  >
                    <span className="text-2xl">{ft.icon}</span>
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {ft.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                您的评分
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
                htmlFor="feedback-title"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="feedback-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="简要描述您的反馈..."
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-800 dark:text-white transition-all"
                required
                maxLength={100}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {title.length}/100
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="feedback-description"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                详细描述 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="feedback-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请详细描述您的问题或建议..."
                rows={5}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-800 dark:text-white resize-none transition-all"
                required
                maxLength={1000}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {description.length}/1000
                </span>
              </div>
            </div>

            {/* Email (Optional) */}
            <div>
              <label
                htmlFor="feedback-email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                邮箱（可选）
              </label>
              <input
                type="email"
                id="feedback-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="如果您希望收到回复，请留下邮箱"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-800 dark:text-white transition-all"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                图片上传（可选）
              </label>
              <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg p-4">
                <input
                  type="file"
                  id="feedback-images"
                  multiple
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <label
                  htmlFor="feedback-images"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <svg
                    className="w-12 h-12 text-zinc-400"
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
                  <span className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    点击或拖拽上传图片
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-500">
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
                        className="w-full h-24 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700"
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
          </form>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-zinc-200 dark:border-zinc-700 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading || !title.trim() || !description.trim()}
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
                  提交中...
                </>
              ) : (
                '提交反馈'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedFeedbackModal;
