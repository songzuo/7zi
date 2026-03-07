'use client';

import React, { useState, useRef, useCallback, memo } from 'react';
import { ImageCropper, CropArea } from './ImageCropper';

// ============================================================================
// 类型定义
// ============================================================================

export interface AvatarUploadProps {
  /** 用户 ID */
  userId: string;
  /** 当前头像 URL */
  avatarUrl?: string;
  /** 上传状态 */
  uploading?: boolean;
  /** 上传完成回调 */
  onUpload: (file: File) => void;
  /** 是否显示裁剪功能 */
  enableCrop?: boolean;
  /** 裁剪比例（1 = 正方形） */
  cropAspectRatio?: number;
  /** 最大文件大小（字节） */
  maxFileSize?: number;
  /** 支持的文件类型 */
  allowedTypes?: string[];
  /** 自定义提示文本 */
  hint?: string;
  /** 头像大小 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 禁用状态 */
  disabled?: boolean;
}

// ============================================================================
// 常量
// ============================================================================

const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const SIZE_CLASSES = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
  xl: 'w-40 h-40',
};

// ============================================================================
// 主组件
// ============================================================================

export const AvatarUpload: React.FC<AvatarUploadProps> = memo(function AvatarUpload({
  userId,
  avatarUrl,
  uploading = false,
  onUpload,
  enableCrop = true,
  cropAspectRatio = 1,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  hint,
  size = 'md',
  disabled = false,
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // ============================================================================
  // 文件验证
  // ============================================================================
  
  const validateFile = useCallback((file: File): string | null => {
    // 检查文件类型
    if (!allowedTypes.includes(file.type)) {
      return `不支持的文件格式。支持: ${allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}`;
    }
    
    // 检查文件大小
    if (file.size > maxFileSize) {
      return `文件太大。最大: ${(maxFileSize / 1024 / 1024).toFixed(1)}MB`;
    }
    
    return null;
  }, [allowedTypes, maxFileSize]);
  
  // ============================================================================
  // 文件选择处理
  // ============================================================================
  
  const handleFileSelect = useCallback((file: File) => {
    setError(null);
    
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    if (enableCrop) {
      // 创建预览 URL
      const previewUrl = URL.createObjectURL(file);
      setPendingFile(file);
      setImagePreview(previewUrl);
      setShowCropper(true);
    } else {
      // 直接上传
      onUpload(file);
    }
  }, [enableCrop, validateFile, onUpload]);
  
  const handleClick = useCallback(() => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  }, [disabled, uploading]);
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [handleFileSelect]);
  
  // ============================================================================
  // 拖放处理
  // ============================================================================
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled || uploading) return;
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [disabled, uploading, handleFileSelect]);
  
  // ============================================================================
  // 裁剪处理
  // ============================================================================
  
  const handleCropComplete = useCallback((croppedBlob: Blob, _cropArea: CropArea) => {
    // 清理预览 URL
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    
    // 转换为 File
    const croppedFile = new File(
      [croppedBlob],
      pendingFile?.name || 'avatar.jpg',
      { type: croppedBlob.type || 'image/jpeg' }
    );
    
    setShowCropper(false);
    setPendingFile(null);
    setImagePreview(null);
    
    // 上传裁剪后的文件
    onUpload(croppedFile);
  }, [imagePreview, pendingFile, onUpload]);
  
  const handleCropCancel = useCallback(() => {
    // 清理预览 URL
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    
    setShowCropper(false);
    setPendingFile(null);
    setImagePreview(null);
  }, [imagePreview]);
  
  // ============================================================================
  // 渲染
  // ============================================================================
  
  const avatarSize = SIZE_CLASSES[size];
  const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
  const displayAvatar = avatarUrl || defaultAvatar;
  
  return (
    <div className="relative">
      {/* 头像显示区域 */}
      <div
        className={`relative group ${avatarSize} rounded-full overflow-hidden cursor-pointer`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <img
          src={displayAvatar}
          alt="头像"
          className={`${avatarSize} rounded-full object-cover border-4 border-gray-200 dark:border-gray-700 transition-all duration-200 ${
            disabled ? 'opacity-50' : 'group-hover:border-blue-400'
          }`}
        />
        
        {/* 悬停遮罩 */}
        {!disabled && !uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="text-center text-white">
              <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs">更换</span>
            </div>
          </div>
        )}
        
        {/* 上传中状态 */}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
          </div>
        )}
        
        {/* 禁用状态 */}
        {disabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-full">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        )}
      </div>
      
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedTypes.join(',')}
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
      
      {/* 提示文本 */}
      {(hint || error) && (
        <div className="mt-2 text-center">
          {hint && !error && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
          )}
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </div>
      )}
      
      {/* 图片裁剪器 */}
      {showCropper && imagePreview && (
        <ImageCropper
          imageSrc={imagePreview}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={cropAspectRatio}
          title="裁剪头像"
          maxWidth={512}
          maxHeight={512}
        />
      )}
    </div>
  );
});

export default AvatarUpload;