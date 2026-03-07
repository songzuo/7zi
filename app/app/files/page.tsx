'use client';

import { useState } from 'react';
import { Upload, List, Layout } from 'lucide-react';
import { FileUpload } from '@/components/files/FileUpload';
import { FileList } from '@/components/files/FileList';

export default function FilesPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'upload'>('list');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          文件管理
        </h1>
        <p className="text-gray-500 mt-1">
          上传、下载和管理您的文件
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'list'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <List className="w-4 h-4" />
          文件列表
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'upload'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Upload className="w-4 h-4" />
          上传文件
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6">
        {activeTab === 'list' ? (
          <FileList />
        ) : (
          <FileUpload onUploadComplete={() => setActiveTab('list')} />
        )}
      </div>
    </div>
  );
}