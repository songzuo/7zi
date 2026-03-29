/**
 * FeedbackModal - User feedback submission modal
 *
 * Features:
 * - Multi-type feedback (bug, feature, improvement, complaint, praise)
 * - Star rating system
 * - File attachment support
 * - Screenshot capture
 * - Auto-save drafts
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { X, Star, Upload, Camera, Send, Save, Loader2 } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: FeedbackData) => Promise<void>;
  currentUser?: {
    id: string;
    name: string;
    email: string;
  };
  initialData?: Partial<FeedbackData>;
}

export type FeedbackType = 'bug' | 'feature' | 'improvement' | 'complaint' | 'praise' | 'other';

export type FeedbackPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface FeedbackData {
  type: FeedbackType;
  priority: FeedbackPriority;
  title: string;
  description: string;
  rating?: number;
  url?: string;
  attachments: string[];
  tags: string[];
}

const FEEDBACK_TYPES: { value: FeedbackType; label: string; icon: string; color: string }[] = [
  { value: 'bug', label: '问题报告', icon: '🐛', color: 'bg-red-500' },
  { value: 'feature', label: '功能建议', icon: '💡', color: 'bg-blue-500' },
  { value: 'improvement', label: '改进建议', icon: '✨', color: 'bg-purple-500' },
  { value: 'complaint', label: '投诉', icon: '⚠️', color: 'bg-orange-500' },
  { value: 'praise', label: '表扬', icon: '👍', color: 'bg-green-500' },
  { value: 'other', label: '其他', icon: '📝', color: 'bg-gray-500' },
];

const PRIORITIES: { value: FeedbackPriority; label: string; color: string }[] = [
  { value: 'low', label: '低', color: 'bg-gray-400' },
  { value: 'medium', label: '中', color: 'bg-blue-400' },
  { value: 'high', label: '高', color: 'bg-orange-400' },
  { value: 'urgent', label: '紧急', color: 'bg-red-500' },
];

export default function FeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  currentUser,
  initialData,
}: FeedbackModalProps) {
  const [feedback, setFeedback] = useState<FeedbackData>({
    type: 'bug',
    priority: 'medium',
    title: '',
    description: '',
    attachments: [],
    tags: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [currentUrl, setCurrentUrl] = useState('');
  const [currentTag, setCurrentTag] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial data
  useEffect(() => {
    if (initialData) {
      setFeedback(prev => ({ ...prev, ...initialData }));
      if (initialData.url) setCurrentUrl(initialData.url);
      if (initialData.attachments) setAttachmentUrls(initialData.attachments);
    }
  }, [initialData]);

  // Auto-save draft
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      saveDraft();
    }, 30000); // Save every 30 seconds

    return () => clearInterval(timer);
  }, [feedback, isOpen]);

  // Load draft from localStorage
  useEffect(() => {
    if (isOpen && !initialData) {
      const draft = localStorage.getItem('feedback-draft');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setFeedback(prev => ({ ...prev, ...parsed }));
          if (parsed.url) setCurrentUrl(parsed.url);
          if (parsed.attachments) setAttachmentUrls(parsed.attachments);
        } catch (error) {
          console.error('Failed to load draft:', error);
        }
      }
    }
  }, [isOpen, initialData]);

  const saveDraft = () => {
    try {
      const dataToSave = {
        ...feedback,
        url: currentUrl,
        attachments: attachmentUrls,
      };
      localStorage.setItem('feedback-draft', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedback.title.trim() || !feedback.description.trim()) {
      alert('请填写标题和描述');
      return;
    }

    setIsSubmitting(true);

    try {
      const dataToSubmit = {
        ...feedback,
        url: currentUrl || undefined,
        attachments: attachmentUrls,
      };
      
      await onSubmit(dataToSubmit);
      
      // Clear draft
      localStorage.removeItem('feedback-draft');
      
      // Reset form
      handleReset();
      onClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('提交失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFeedback({
      type: 'bug',
      priority: 'medium',
      title: '',
      description: '',
      attachments: [],
      tags: [],
    });
    setCurrentUrl('');
    setCurrentTag('');
    setAttachmentUrls([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('文件大小不能超过 5MB');
      return;
    }

    // TODO: Upload to server
    // For now, just simulate upload
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      setAttachmentUrls(prev => [...prev, url]);
    };
    reader.readAsDataURL(file);
  };

  const handleCaptureScreenshot = async () => {
    try {
      // Check if browser supports screenshot
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('您的浏览器不支持截图功能');
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as MediaTrackConstraints,
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Wait for video to start playing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        
        // Convert to base64
        const url = canvas.toDataURL('image/png');
        setAttachmentUrls(prev => [...prev, url]);
      }

      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      if (error instanceof Error && error.name !== 'NotAllowedError') {
        alert('截图失败，请重试');
      }
    }
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !feedback.tags.includes(currentTag.trim())) {
      setFeedback(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim().toLowerCase()],
      }));
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFeedback(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const handleRemoveAttachment = (url: string) => {
    setAttachmentUrls(prev => prev.filter(u => u !== url));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="提交反馈" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Feedback Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            反馈类型
          </label>
          <div className="grid grid-cols-3 gap-3">
            {FEEDBACK_TYPES.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFeedback(prev => ({ ...prev, type: type.value }))}
                className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                  feedback.type === type.value
                    ? `border-${type.color.replace('bg-', '')}-500 bg-${type.color.replace('bg-', '')}-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl mb-1">{type.icon}</span>
                <span className="text-sm font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            优先级
          </label>
          <div className="flex space-x-3">
            {PRIORITIES.map(priority => (
              <button
                key={priority.value}
                type="button"
                onClick={() => setFeedback(prev => ({ ...prev, priority: priority.value }))}
                className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                  feedback.priority === priority.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                {priority.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rating (for praise/complaint) */}
        {(feedback.type === 'praise' || feedback.type === 'complaint') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              评分
            </label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFeedback(prev => ({ ...prev, rating: star }))}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      feedback.rating && star <= feedback.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            标题 <span className="text-red-500">*</span>
          </label>
          <Input
            id="title"
            type="text"
            value={feedback.title}
            onChange={(e) => setFeedback(prev => ({ ...prev, title: e.target.value }))}
            placeholder="简要描述问题或建议..."
            required
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            详细描述 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            value={feedback.description}
            onChange={(e) => setFeedback(prev => ({ ...prev, description: e.target.value }))}
            placeholder="请详细描述您遇到的问题或建议..."
            required
            minLength={10}
            maxLength={1000}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            {feedback.description.length} / 1000 字符
          </p>
        </div>

        {/* URL */}
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            相关页面 URL
          </label>
          <Input
            id="url"
            type="url"
            value={currentUrl}
            onChange={(e) => setCurrentUrl(e.target.value)}
            placeholder="https://example.com/page"
          />
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            附件 / 截图
          </label>
          <div className="flex space-x-2 mb-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>上传文件</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCaptureScreenshot}
              className="flex items-center space-x-2"
            >
              <Camera className="w-4 h-4" />
              <span>截图</span>
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
          />
          {attachmentUrls.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {attachmentUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Attachment ${index + 1}`}
                    className="w-full h-20 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(url)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            标签
          </label>
          <div className="flex space-x-2">
            <Input
              type="text"
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              placeholder="输入标签后按回车添加..."
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddTag}
            >
              添加
            </Button>
          </div>
          {feedback.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {feedback.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 focus:outline-none"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* User Info (if not logged in) */}
        {!currentUser && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ 您当前未登录，请先登录后再提交反馈以获得更好的服务。
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
          >
            重置
          </Button>
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !feedback.title.trim() || !feedback.description.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  提交反馈
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
