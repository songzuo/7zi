'use client';

import React, { useState, useRef, useCallback, useEffect, memo } from 'react';

// ============================================================================
// 类型定义
// ============================================================================

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageCropperProps {
  /** 图片源（URL 或 base64） */
  imageSrc: string;
  /** 裁剪完成回调 */
  onCropComplete: (croppedImageBlob: Blob, cropArea: CropArea) => void;
  /** 取消回调 */
  onCancel: () => void;
  /** 裁剪区域比例（宽/高），如 1 为正方形 */
  aspectRatio?: number;
  /** 输出图片格式 */
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
  /** 输出图片质量 (0-1) */
  outputQuality?: number;
  /** 输出图片最大宽度 */
  maxWidth?: number;
  /** 输出图片最大高度 */
  maxHeight?: number;
  /** 标题 */
  title?: string;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 限制值在指定范围内
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 获取图片尺寸
 */
function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = src;
  });
}

// ============================================================================
// 主组件
// ============================================================================

export const ImageCropper: React.FC<ImageCropperProps> = memo(function ImageCropper({
  imageSrc,
  onCropComplete,
  onCancel,
  aspectRatio = 1,
  outputFormat = 'image/jpeg',
  outputQuality = 0.9,
  maxWidth = 512,
  maxHeight = 512,
  title = '裁剪图片',
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [crop, setCrop] = useState<CropArea>({ x: 0, y: 0, width: 100, height: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  
  // ============================================================================
  // 初始化裁剪区域
  // ============================================================================
  
  useEffect(() => {
    const loadImage = async () => {
      try {
        const dims = await getImageDimensions(imageSrc);
        setImageDimensions(dims);
        setImageLoaded(true);
      } catch (error) {
        console.error('Failed to load image:', error);
      }
    };
    
    loadImage();
  }, [imageSrc]);
  
  // 当容器和图片尺寸都已知时，初始化裁剪区域
  useEffect(() => {
    if (!imageLoaded || !containerRef.current) return;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    setContainerDimensions({ width: containerRect.width, height: containerRect.height });
    
    // 计算缩放比例，使图片适应容器
    const scaleX = containerRect.width / imageDimensions.width;
    const scaleY = containerRect.height / imageDimensions.height;
    const newScale = Math.min(scaleX, scaleY, 1); // 不放大图片
    setScale(newScale);
    
    // 初始化裁剪区域为图片中心
    const displayWidth = imageDimensions.width * newScale;
    const displayHeight = imageDimensions.height * newScale;
    const offsetX = (containerRect.width - displayWidth) / 2;
    const offsetY = (containerRect.height - displayHeight) / 2;
    
    // 计算初始裁剪框大小（基于纵横比）
    let cropWidth = Math.min(displayWidth, displayHeight * aspectRatio);
    let cropHeight = cropWidth / aspectRatio;
    
    // 如果高度超出，调整
    if (cropHeight > displayHeight) {
      cropHeight = displayHeight;
      cropWidth = cropHeight * aspectRatio;
    }
    
    // 居中裁剪框
    const cropX = offsetX + (displayWidth - cropWidth) / 2;
    const cropY = offsetY + (displayHeight - cropHeight) / 2;
    
    setCrop({
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
    });
  }, [imageLoaded, imageDimensions, aspectRatio]);
  
  // ============================================================================
  // 鼠标事件处理
  // ============================================================================
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      // 点击裁剪框内部，开始拖动
      setIsDragging(true);
      setDragStart({ x: e.clientX - crop.x, y: e.clientY - crop.y });
    }
  }, [crop.x, crop.y]);
  
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging && !isResizing) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    
    if (isDragging) {
      // 拖动裁剪框
      const displayWidth = imageDimensions.width * scale;
      const displayHeight = imageDimensions.height * scale;
      const offsetX = (containerRect.width - displayWidth) / 2;
      const offsetY = (containerRect.height - displayHeight) / 2;
      
      const newX = clamp(
        e.clientX - dragStart.x,
        offsetX,
        offsetX + displayWidth - crop.width
      );
      const newY = clamp(
        e.clientY - dragStart.y,
        offsetY,
        offsetY + displayHeight - crop.height
      );
      
      setCrop(prev => ({ ...prev, x: newX, y: newY }));
    } else if (isResizing && resizeDirection) {
      // 调整裁剪框大小
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      let newWidth = crop.width;
      let newHeight = crop.height;
      let newX = crop.x;
      let newY = crop.y;
      
      // 根据调整方向更新尺寸
      if (resizeDirection.includes('e')) {
        newWidth = clamp(crop.width + dx, 50, containerRect.width - crop.x);
      }
      if (resizeDirection.includes('w')) {
        const maxDx = crop.width - 50;
        const actualDx = clamp(dx, -crop.x, maxDx);
        newX = crop.x + actualDx;
        newWidth = crop.width - actualDx;
      }
      if (resizeDirection.includes('s')) {
        newHeight = clamp(crop.height + dy, 50, containerRect.height - crop.y);
      }
      if (resizeDirection.includes('n')) {
        const maxDy = crop.height - 50;
        const actualDy = clamp(dy, -crop.y, maxDy);
        newY = crop.y + actualDy;
        newHeight = crop.height - actualDy;
      }
      
      // 保持纵横比
      if (aspectRatio > 0) {
        if (resizeDirection.includes('e') || resizeDirection.includes('w')) {
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = newHeight * aspectRatio;
        }
      }
      
      setCrop({ x: newX, y: newY, width: newWidth, height: newHeight });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, isResizing, resizeDirection, dragStart, crop, imageDimensions, scale, aspectRatio]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeDirection(null);
  }, []);
  
  // ============================================================================
  // 裁剪处理
  // ============================================================================
  
  const handleCrop = useCallback(async () => {
    if (!imageRef.current || !canvasRef.current) return;
    
    setProcessing(true);
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');
      
      const container = containerRef.current;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const displayWidth = imageDimensions.width * scale;
      const displayHeight = imageDimensions.height * scale;
      const offsetX = (containerRect.width - displayWidth) / 2;
      const offsetY = (containerRect.height - displayHeight) / 2;
      
      // 计算裁剪区域在原图上的位置
      const sourceX = (crop.x - offsetX) / scale;
      const sourceY = (crop.y - offsetY) / scale;
      const sourceWidth = crop.width / scale;
      const sourceHeight = crop.height / scale;
      
      // 计算输出尺寸
      let outputWidth = sourceWidth;
      let outputHeight = sourceHeight;
      
      // 如果超过最大尺寸，按比例缩小
      if (outputWidth > maxWidth || outputHeight > maxHeight) {
        const ratio = Math.min(maxWidth / outputWidth, maxHeight / outputHeight);
        outputWidth *= ratio;
        outputHeight *= ratio;
      }
      
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      
      // 绘制裁剪后的图片
      ctx.drawImage(
        imageRef.current,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        outputWidth,
        outputHeight
      );
      
      // 转换为 Blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onCropComplete(blob, {
              x: sourceX,
              y: sourceY,
              width: sourceWidth,
              height: sourceHeight,
            });
          }
          setProcessing(false);
        },
        outputFormat,
        outputQuality
      );
    } catch (error) {
      console.error('Crop failed:', error);
      setProcessing(false);
    }
  }, [crop, imageDimensions, scale, outputFormat, outputQuality, maxWidth, maxHeight, onCropComplete]);
  
  // ============================================================================
  // 渲染
  // ============================================================================
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full mx-4 overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* 裁剪区域 */}
        <div 
          ref={containerRef}
          className="relative bg-gray-100 dark:bg-gray-900 overflow-hidden"
          style={{ height: '400px' }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {imageLoaded && (
            <>
              {/* 图片 */}
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                className="absolute"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  transformOrigin: 'center center',
                  maxWidth: 'none',
                  maxHeight: 'none',
                }}
                draggable={false}
              />
              
              {/* 裁剪框 */}
              <div
                className="absolute border-2 border-white shadow-lg cursor-move"
                style={{
                  left: crop.x,
                  top: crop.y,
                  width: crop.width,
                  height: crop.height,
                }}
                onMouseDown={handleMouseDown}
              >
                {/* 半透明遮罩（四个角） */}
                <div className="absolute inset-0 border border-white/50" />
                
                {/* 网格线 */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/3 left-0 right-0 h-px bg-white/50" />
                  <div className="absolute top-2/3 left-0 right-0 h-px bg-white/50" />
                  <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/50" />
                  <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/50" />
                </div>
                
                {/* 调整手柄 */}
                {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((direction) => {
                  const isCorner = direction.length === 2;
                  const cursor = {
                    nw: 'cursor-nw-resize',
                    n: 'cursor-n-resize',
                    ne: 'cursor-ne-resize',
                    e: 'cursor-e-resize',
                    se: 'cursor-se-resize',
                    s: 'cursor-s-resize',
                    sw: 'cursor-sw-resize',
                    w: 'cursor-w-resize',
                  }[direction];
                  
                  const position = {
                    nw: '-top-1 -left-1',
                    n: '-top-1 left-1/2 -translate-x-1/2',
                    ne: '-top-1 -right-1',
                    e: 'top-1/2 -right-1 -translate-y-1/2',
                    se: '-bottom-1 -right-1',
                    s: '-bottom-1 left-1/2 -translate-x-1/2',
                    sw: '-bottom-1 -left-1',
                    w: 'top-1/2 -left-1 -translate-y-1/2',
                  }[direction];
                  
                  return (
                    <div
                      key={direction}
                      className={`absolute w-3 h-3 bg-white rounded-full shadow-md hover:bg-blue-100 ${cursor} ${position}`}
                      onMouseDown={(e) => handleResizeStart(e, direction)}
                    />
                  );
                })}
              </div>
            </>
          )}
          
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          )}
        </div>
        
        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleCrop}
            disabled={processing}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                处理中...
              </>
            ) : (
              '确认裁剪'
            )}
          </button>
        </div>
        
        {/* 隐藏的 Canvas */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
});

export default ImageCropper;