/**
 * 图片工具函数
 *
 * 提供图片压缩和格式检测功能
 */

/**
 * 图片压缩选项
 */
export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * 图片压缩函数
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<Blob> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.85,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    const handleReaderError = (error: ProgressEvent<FileReader>) => {
      const err = new Error(`[ImageOptimization] Failed to read file: ${file.name}`);
      console.error(err, error);
      reject(err);
    };

    const handleImageError = () => {
      const err = new Error(`[ImageOptimization] Failed to load image: ${file.name}`);
      console.error(err);
      reject(err);
    };

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    reader.onerror = handleReaderError;
    reader.readAsDataURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // 计算新尺寸
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const err = new Error('[ImageOptimization] Failed to get canvas context');
        console.error(err);
        reject(err);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            const err = new Error(`[ImageOptimization] Failed to compress image: ${file.name}`);
            console.error(err);
            reject(err);
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = handleImageError;
  });
}

/**
 * 支持的图片格式
 */
export interface SupportedImageFormats {
  webp: boolean;
  avif: boolean;
}

/**
 * 检测支持的图片格式
 */
export function getSupportedImageFormats(): SupportedImageFormats {
  const canvas = document.createElement('canvas');

  return {
    webp: canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0,
    avif: canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0,
  };
}

/**
 * 导出所有图片工具函数和类型
 */
export type { CompressImageOptions, SupportedImageFormats };
