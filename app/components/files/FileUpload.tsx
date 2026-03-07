'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onUploadComplete?: (file: any) => void;
  taskId?: string;
  maxFiles?: number;
  acceptedTypes?: string[];
}

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  response?: any;
}

export function FileUpload({
  onUploadComplete,
  taskId,
  maxFiles = 10,
  acceptedTypes,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles);
    },
    [maxFiles, acceptedTypes]
  );

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  }, []);

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter((file) => {
      // 检查文件类型
      if (acceptedTypes && !acceptedTypes.some((type) => file.type.includes(type))) {
        return false;
      }
      return true;
    });

    setFiles((prev) => {
      const remaining = maxFiles - prev.length;
      const toAdd = validFiles.slice(0, remaining).map((file) => ({
        file,
        progress: 0,
        status: 'pending' as const,
      }));
      return [...prev, ...toAdd];
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (uploadFile: UploadFile, index: number): Promise<void> => {
    const formData = new FormData();
    formData.append('file', uploadFile.file);
    if (taskId) {
      formData.append('taskId', taskId);
    }

    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, status: 'uploading' } : f))
    );

    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setFiles((prev) =>
          prev.map((f, i) =>
            i === index ? { ...f, status: 'success', progress: 100, response: result.data } : f
          )
        );
        onUploadComplete?.(result.data);
      } else {
        setFiles((prev) =>
          prev.map((f, i) =>
            i === index ? { ...f, status: 'error', error: result.error } : f
          )
        );
      }
    } catch (error) {
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, status: 'error', error: 'Upload failed' } : f
        )
      );
    }
  };

  const uploadAll = async () => {
    setIsUploading(true);
    const pendingFiles = files.filter((f) => f.status === 'pending');

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'pending') {
        await uploadFile(files[i], i);
      }
    }

    setIsUploading(false);
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.includes('zip') || type.includes('rar')) return '📦';
    return '📁';
  };

  return (
    <div className="w-full">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
          拖拽文件到这里上传
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          或点击选择文件 (最大 50MB)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept={acceptedTypes?.join(',')}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <span className="text-2xl">{getFileIcon(file.file.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.file.name}</p>
                <p className="text-xs text-gray-500">{formatSize(file.file.size)}</p>
                {file.status === 'uploading' && (
                  <div className="w-full h-1 bg-gray-200 rounded mt-1">
                    <div
                      className="h-full bg-blue-500 rounded transition-all"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
                {file.status === 'error' && (
                  <p className="text-xs text-red-500 mt-1">{file.error}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {file.status === 'success' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {file.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                {file.status === 'pending' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {files.some((f) => f.status === 'pending') && (
        <button
          onClick={uploadAll}
          disabled={isUploading}
          className="mt-4 w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
        >
          {isUploading ? '上传中...' : `上传 ${files.filter((f) => f.status === 'pending').length} 个文件`}
        </button>
      )}
    </div>
  );
}