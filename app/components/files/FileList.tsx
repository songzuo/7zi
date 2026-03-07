'use client';

import { useState, useEffect } from 'react';
import { Download, Trash2, Search, Filter, FileText, Image, FileSpreadsheet, FileArchive, RefreshCw } from 'lucide-react';

interface FileRecord {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string | null;
  taskId: string | null;
  description: string | null;
  createdAt: string;
}

interface FileStats {
  total: number;
  totalSize: number;
  byType: Record<string, { count: number; size: number }>;
  recentUploads: number;
}

export function FileList() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [stats, setStats] = useState<FileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedType) params.append('mimeType', selectedType);

      const response = await fetch(`/api/files?${params}`);
      const result = await response.json();
      if (result.success) {
        setFiles(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/files?stats=true');
      const result = await response.json();
      setStats(result);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchFiles();
    fetchStats();
  }, [search, selectedType]);

  const handleDownload = async (file: FileRecord) => {
    try {
      const response = await fetch(`/api/files/${file.id}/download`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDelete = async (file: FileRecord) => {
    if (!confirm(`确定要删除 ${file.originalName} 吗？`)) return;

    try {
      const response = await fetch(`/api/files/${file.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        setFiles((prev) => prev.filter((f) => f.id !== file.id));
        fetchStats();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedFiles.size === 0) return;
    if (!confirm(`确定要删除 ${selectedFiles.size} 个文件吗？`)) return;

    for (const id of selectedFiles) {
      await fetch(`/api/files/${id}`, { method: 'DELETE' });
    }
    setSelectedFiles(new Set());
    fetchFiles();
    fetchStats();
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedFiles);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedFiles(newSet);
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5 text-purple-500" />;
    if (mimeType.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <FileArchive className="w-5 h-5 text-yellow-500" />;
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  const getTypeCategory = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('document') || mimeType.includes('word')) return 'document';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet';
    return 'other';
  };

  const typeOptions = [
    { value: '', label: '所有类型' },
    { value: 'image', label: '图片' },
    { value: 'pdf', label: 'PDF' },
    { value: 'document', label: '文档' },
    { value: 'spreadsheet', label: '表格' },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">总文件数</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">总大小</p>
            <p className="text-2xl font-bold">{formatSize(stats.totalSize)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">本周上传</p>
            <p className="text-2xl font-bold">{stats.recentUploads}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">文件类型</p>
            <p className="text-2xl font-bold">{Object.keys(stats.byType).length}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索文件..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
        >
          {typeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => { fetchFiles(); fetchStats(); }}
          className="p-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
        {selectedFiles.size > 0 && (
          <button
            onClick={handleBatchDelete}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            删除 ({selectedFiles.size})
          </button>
        )}
      </div>

      {/* File List */}
      {loading ? (
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          <p className="mt-2 text-gray-500">加载中...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          暂无文件
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFiles(new Set(files.map((f) => f.id)));
                      } else {
                        setSelectedFiles(new Set());
                      }
                    }}
                    checked={selectedFiles.size === files.length && files.length > 0}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">文件名</th>
                <th className="px-4 py-3 text-left text-sm font-medium">类型</th>
                <th className="px-4 py-3 text-left text-sm font-medium">大小</th>
                <th className="px-4 py-3 text-left text-sm font-medium">上传时间</th>
                <th className="px-4 py-3 text-right text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.id)}
                      onChange={() => toggleSelect(file.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getFileIcon(file.mimeType)}
                      <span className="truncate max-w-[200px]" title={file.originalName}>
                        {file.originalName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {getTypeCategory(file.mimeType)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatSize(file.size)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(file.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleDownload(file)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                        title="下载"
                      >
                        <Download className="w-4 h-4 text-blue-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(file)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}