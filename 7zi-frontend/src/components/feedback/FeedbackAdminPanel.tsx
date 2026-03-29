/**
 * FeedbackAdminPanel - Admin dashboard for managing user feedback
 *
 * Features:
 * - Overview dashboard with statistics
 * - Feedback list with filters and search
 * - Detailed feedback view with conversation
 * - Status management and responses
 * - Analytics and reporting
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Inbox, Clock, AlertCircle, CheckCircle2, XCircle,
  Filter, Search, ChevronDown, MessageSquare, Send,
  Star, TrendingUp, Users, BarChart3, PieChart,
  RefreshCw, Download, Archive, Trash2, Edit2,
  Eye, EyeOff, Reply, MoreVertical, Calendar
} from 'lucide-react';
import type { 
  FeedbackType, 
  FeedbackPriority, 
  FeedbackStatus,
  Feedback 
} from '@/lib/db/feedback-storage';

interface FeedbackAdminPanelProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface FeedbackStats {
  total: number;
  byType: Record<FeedbackType, number>;
  byPriority: Record<FeedbackPriority, number>;
  byStatus: Record<FeedbackStatus, number>;
  averageRating: number;
  resolvedPercentage: number;
  pendingCount: number;
  inProgressCount: number;
}

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  rejected: 'bg-red-100 text-red-800',
};

const PRIORITY_COLORS: Record<FeedbackPriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const TYPE_ICONS: Record<FeedbackType, string> = {
  bug: '🐛',
  feature: '💡',
  improvement: '✨',
  complaint: '⚠️',
  praise: '👍',
  other: '📝',
};

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  pending: '待处理',
  in_progress: '处理中',
  resolved: '已解决',
  closed: '已关闭',
  rejected: '已拒绝',
};

const PRIORITY_LABELS: Record<FeedbackPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: '问题报告',
  feature: '功能建议',
  improvement: '改进建议',
  complaint: '投诉',
  praise: '表扬',
  other: '其他',
};

export default function FeedbackAdminPanel({ currentUser }: FeedbackAdminPanelProps) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState<{
    type?: FeedbackType;
    priority?: FeedbackPriority;
    status?: FeedbackStatus;
    search?: string;
  }>({});
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  // Response form
  const [responseText, setResponseText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');

  // Fetch feedback list
  const fetchFeedbacks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(filters.type && { type: filters.type }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(`/api/feedback?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setFeedbacks(data.data.feedbacks);
        setTotalPages(Math.ceil(data.data.total / pageSize));
      }
    } catch (error) {
      console.error('Failed to fetch feedbacks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, filters]);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/feedback/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
    fetchStats();
  }, [fetchFeedbacks, fetchStats]);

  // Update feedback status
  const updateStatus = async (feedbackId: string, status: FeedbackStatus) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          feedbackId,
          status,
          adminId: currentUser.id,
          adminName: currentUser.name,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchFeedbacks();
        await fetchStats();
        
        if (selectedFeedback?.id === feedbackId) {
          setSelectedFeedback(prev => prev ? { ...prev, status } : null);
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('更新失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  // Send admin response
  const sendResponse = async () => {
    if (!selectedFeedback || !responseText.trim()) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/feedback/response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          feedbackId: selectedFeedback.id,
          response: responseText,
          adminId: currentUser.id,
          adminName: currentUser.name,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResponseText('');
        await fetchFeedbacks();
        
        // Refresh selected feedback
        const updated = feedbacks.find(f => f.id === selectedFeedback.id);
        if (updated) {
          setSelectedFeedback(updated);
        }
      }
    } catch (error) {
      console.error('Failed to send response:', error);
      alert('发送失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  // Export feedbacks
  const exportFeedbacks = async () => {
    try {
      const params = new URLSearchParams({
        ...(filters.type && { type: filters.type }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.status && { status: filters.status }),
      });

      const response = await fetch(`/api/feedback/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedbacks_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export feedbacks:', error);
      alert('导出失败，请重试');
    }
  };

  // Delete feedback
  const deleteFeedback = async (feedbackId: string) => {
    if (!confirm('确定要删除这条反馈吗？此操作不可撤销。')) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/feedback?id=${feedbackId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchFeedbacks();
        await fetchStats();
        setSelectedFeedback(null);
      }
    } catch (error) {
      console.error('Failed to delete feedback:', error);
      alert('删除失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">反馈管理</h1>
            <p className="text-sm text-gray-500 mt-1">管理和处理用户反馈</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                fetchFeedbacks();
                fetchStats();
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
            <Button variant="outline" onClick={exportFeedbacks}>
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="px-6 py-4 grid grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总反馈数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Inbox className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">待处理</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">处理中</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgressCount}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">解决率</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.resolvedPercentage.toFixed(1)}%
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">平均评分</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.averageRating.toFixed(1)}
                </p>
              </div>
              <Star className="w-8 h-8 text-purple-500 fill-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 border-b border-gray-200 bg-white">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'list'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline-block mr-2" />
            反馈列表
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'stats'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline-block mr-2" />
            统计分析
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Feedback List */}
        {activeTab === 'list' && (
          <>
            <div className="w-2/5 bg-white border-r border-gray-200 overflow-y-auto">
              {/* Search and Filters */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="搜索反馈..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="w-full"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  筛选条件
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </Button>

                {showFilters && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">类型</label>
                      <select
                        value={filters.type || ''}
                        onChange={(e) => setFilters(prev => ({ 
                          ...prev, 
                          type: e.target.value as FeedbackType || undefined 
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">全部类型</option>
                        {Object.entries(TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">优先级</label>
                      <select
                        value={filters.priority || ''}
                        onChange={(e) => setFilters(prev => ({ 
                          ...prev, 
                          priority: e.target.value as FeedbackPriority || undefined 
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">全部优先级</option>
                        {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">状态</label>
                      <select
                        value={filters.status || ''}
                        onChange={(e) => setFilters(prev => ({ 
                          ...prev, 
                          status: e.target.value as FeedbackStatus || undefined 
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">全部状态</option>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({})}
                      className="w-full"
                    >
                      清除筛选
                    </Button>
                  </div>
                )}
              </div>

              {/* Feedback Items */}
              <div className="divide-y divide-gray-200">
                {isLoading ? (
                  <div className="p-8 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                    加载中...
                  </div>
                ) : feedbacks.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Inbox className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    暂无反馈
                  </div>
                ) : (
                  feedbacks.map(feedback => (
                    <button
                      key={feedback.id}
                      onClick={() => setSelectedFeedback(feedback)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedFeedback?.id === feedback.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{TYPE_ICONS[feedback.type]}</span>
                          <span className="text-xs font-mono text-gray-400">{feedback.id}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[feedback.status]}`}>
                          {STATUS_LABELS[feedback.status]}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mb-1 truncate">
                        {feedback.title}
                      </h3>
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                        {feedback.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{feedback.userName}</span>
                        <span>{formatDate(feedback.createdAt)}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-gray-200 flex justify-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    上一页
                  </Button>
                  <span className="px-4 py-2 text-sm text-gray-600">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </div>

            {/* Detail Panel */}
            <div className="flex-1 bg-gray-50 overflow-y-auto">
              {selectedFeedback ? (
                <div className="p-6">
                  {/* Feedback Header */}
                  <div className="bg-white rounded-lg shadow p-6 mb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-2xl">{TYPE_ICONS[selectedFeedback.type]}</span>
                          <h2 className="text-xl font-bold text-gray-900">
                            {selectedFeedback.title}
                          </h2>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span className="font-mono">{selectedFeedback.id}</span>
                          <span>•</span>
                          <span>{formatDate(selectedFeedback.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                          STATUS_COLORS[selectedFeedback.status]
                        }`}>
                          {STATUS_LABELS[selectedFeedback.status]}
                        </span>
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                          PRIORITY_COLORS[selectedFeedback.priority]
                        }`}>
                          {PRIORITY_LABELS[selectedFeedback.priority]}
                        </span>
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="flex items-center space-x-4 mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        {selectedFeedback.userName[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedFeedback.userName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedFeedback.userEmail}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">描述</h3>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {selectedFeedback.description}
                      </p>
                    </div>

                    {/* Rating */}
                    {selectedFeedback.rating && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">评分</h3>
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={`w-5 h-5 ${
                                star <= selectedFeedback.rating!
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="ml-2 text-sm font-medium text-gray-700">
                            {selectedFeedback.rating} / 5
                          </span>
                        </div>
                      </div>
                    )}

                    {/* URL */}
                    {selectedFeedback.url && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">相关 URL</h3>
                        <a
                          href={selectedFeedback.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {selectedFeedback.url}
                        </a>
                      </div>
                    )}

                    {/* Attachments */}
                    {selectedFeedback.attachments.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">附件</h3>
                        <div className="grid grid-cols-4 gap-2">
                          {selectedFeedback.attachments.map((url, index) => (
                            <img
                              key={index}
                              src={url}
                              alt={`Attachment ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80"
                              onClick={() => window.open(url, '_blank')}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {selectedFeedback.tags.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">标签</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedFeedback.tags.map(tag => (
                            <span
                              key={tag}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Admin Response */}
                    {selectedFeedback.adminResponse && (
                      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Reply className="w-4 h-4 text-green-600" />
                          <h3 className="text-sm font-medium text-green-900">管理员回复</h3>
                        </div>
                        <p className="text-sm text-green-800 whitespace-pre-wrap">
                          {selectedFeedback.adminResponse}
                        </p>
                        <p className="text-xs text-green-600 mt-2">
                          回复者: {selectedFeedback.adminName}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                      <select
                        value={selectedFeedback.status}
                        onChange={(e) => updateStatus(selectedFeedback.id, e.target.value as FeedbackStatus)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        disabled={isProcessing}
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus(selectedFeedback.id, 'in_progress')}
                        disabled={isProcessing || selectedFeedback.status === 'in_progress'}
                      >
                        开始处理
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus(selectedFeedback.id, 'resolved')}
                        disabled={isProcessing || selectedFeedback.status === 'resolved'}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        标记解决
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus(selectedFeedback.id, 'closed')}
                        disabled={isProcessing || selectedFeedback.status === 'closed'}
                      >
                        <Archive className="w-4 h-4 mr-1" />
                        关闭
                      </Button>
                      
                      <div className="flex-1" />
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteFeedback(selectedFeedback.id)}
                        disabled={isProcessing}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        删除
                      </Button>
                    </div>
                  </div>

                  {/* Response Form */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">添加回复</h3>
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="输入您的回复..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <div className="flex justify-end mt-3">
                      <Button
                        onClick={sendResponse}
                        disabled={!responseText.trim() || isProcessing}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        发送回复
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 mx-auto mb-2 text-gray-300" />
                    <p>选择一条反馈查看详情</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && stats && (
          <div className="flex-1 bg-white p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-lg font-bold text-gray-900 mb-6">反馈统计分析</h2>
              
              {/* By Type */}
              <div className="mb-8">
                <h3 className="text-sm font-medium text-gray-700 mb-3">按类型分布</h3>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(stats.byType).map(([type, count]) => (
                    <div key={type} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{TYPE_ICONS[type as FeedbackType]}</span>
                        <span className="text-sm font-medium text-gray-900">{count}</span>
                      </div>
                      <p className="text-xs text-gray-600">{TYPE_LABELS[type as FeedbackType]}</p>
                      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(count / stats.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Priority */}
              <div className="mb-8">
                <h3 className="text-sm font-medium text-gray-700 mb-3">按优先级分布</h3>
                <div className="grid grid-cols-4 gap-4">
                  {Object.entries(stats.byPriority).map(([priority, count]) => (
                    <div key={priority} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          PRIORITY_COLORS[priority as FeedbackPriority]
                        }`}>
                          {PRIORITY_LABELS[priority as FeedbackPriority]}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{count}</span>
                      </div>
                      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            priority === 'urgent' ? 'bg-red-500' :
                            priority === 'high' ? 'bg-orange-500' :
                            priority === 'medium' ? 'bg-blue-500' : 'bg-gray-400'
                          }`}
                          style={{ width: `${(count / stats.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Status */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">按状态分布</h3>
                <div className="grid grid-cols-5 gap-4">
                  {Object.entries(stats.byStatus).map(([status, count]) => (
                    <div key={status} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          STATUS_COLORS[status as FeedbackStatus]
                        }`}>
                          {STATUS_LABELS[status as FeedbackStatus]}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{count}</span>
                      </div>
                      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            status === 'resolved' ? 'bg-green-500' :
                            status === 'closed' ? 'bg-gray-400' :
                            status === 'in_progress' ? 'bg-blue-500' :
                            status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
