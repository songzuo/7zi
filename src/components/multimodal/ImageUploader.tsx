'use client';

/**
 * Image Uploader Component
 * Supports drag & drop, preview, and AI analysis
 */

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { ImageData } from '@/lib/multimodal/types';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  onAnalysisResult?: (result: ImageData) => void;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  disabled?: boolean;
  placeholder?: string;
}

export function ImageUploader({
  onImageSelect,
  onAnalysisResult,
  maxSize = 10 * 1024 * 1024,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  disabled = false,
  placeholder,
}: ImageUploaderProps) {
  const t = useTranslations('multimodal');
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const processFile = useCallback(async (file: File) => {
    setError(null);

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      setError(t('invalidFileType', { types: acceptedTypes.join(', ') }));
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      setError(t('fileTooLarge', { maxSize: Math.round(maxSize / 1024 / 1024) }));
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Notify parent
    onImageSelect(file);

    // Auto-analyze if callback provided
    if (onAnalysisResult) {
      await analyzeImage(file);
    }
  }, [acceptedTypes, maxSize, onImageSelect, onAnalysisResult, t]);

  const analyzeImage = async (file: File) => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('compress', 'true');
      formData.append('quality', '0.8');

      const response = await fetch('/api/multimodal/image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        onAnalysisResult?.(result.data);
      } else {
        setError(result.error || t('analysisFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('analysisFailed'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const clearPreview = () => {
    setPreview(null);
    setError(null);
  };

  if (preview) {
    return (
      <div className="relative group">
        <img
          src={preview}
          alt="Preview"
          className="w-full h-auto rounded-lg shadow-lg"
        />
        <button
          onClick={clearPreview}
          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label={t('clearPreview')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {isAnalyzing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2" />
              <p className="text-sm">{t('analyzing')}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-300 dark:border-gray-600'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}
        `}
      >
        <input
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          disabled={disabled}
          className="hidden"
          id="image-upload"
        />
        <label htmlFor="image-upload" className="cursor-pointer">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {placeholder || t('uploadPlaceholder')}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {t('fileSizeLimit', { maxSize: Math.round(maxSize / 1024 / 1024) })}
          </p>
        </label>
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
