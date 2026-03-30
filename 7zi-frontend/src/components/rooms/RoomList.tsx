/**
 * RoomList 组件 - 房间列表
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { RoomCard } from './RoomCard';
import { roomsClient } from '@/lib/api/rooms/client';
import type { Room, RoomVisibility } from '@/lib/api/rooms/types';

// 简单的空状态组件（临时）
const EmptyState: React.FC<{
  icon?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}> = ({ icon, title, description, children }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    {icon && <div className="text-6xl mb-4">{icon}</div>}
    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400 mb-4">{description}</p>
    {children}
  </div>
);

interface RoomListProps {
  onRoomSelect?: (room: Room) => void;
  onCreateRoom?: () => void;
  className?: string;
}

export const RoomList: React.FC<RoomListProps> = ({
  onRoomSelect,
  onCreateRoom,
  className,
}) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    visibility?: RoomVisibility;
    search?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);

  // 加载房间列表
  const loadRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await roomsClient.getRooms(filter);
      setRooms(response.rooms);
    } catch (err) {
      console.error('Failed to load rooms:', err);
      setError('加载房间失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, [filter]);

  // 搜索处理
  const handleSearch = (query: string) => {
    setFilter((prev) => ({ ...prev, search: query || undefined }));
  };

  // 过滤器处理
  const handleFilter = (visibility?: RoomVisibility) => {
    setFilter((prev) => ({ ...prev, visibility }));
  };

  return (
    <div className={className}>
      {/* 顶部操作栏 */}
      <div className="mb-4 space-y-3">
        {/* 搜索框 */}
        <div className="relative">
          <input
            type="text"
            placeholder="搜索房间..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            onChange={(e) => handleSearch(e.target.value)}
          />
          <svg
            className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* 过滤器和操作按钮 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter.visibility === undefined ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleFilter(undefined)}
            >
              全部
            </Button>
            <Button
              variant={filter.visibility === 'public' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleFilter('public')}
            >
              🌐 公开
            </Button>
            <Button
              variant={filter.visibility === 'private' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleFilter('private')}
            >
              🔒 私有
            </Button>
            <Button
              variant={filter.visibility === 'unlisted' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleFilter('unlisted')}
            >
              🔗 不公开
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadRooms} loading={loading}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              刷新
            </Button>
            {onCreateRoom && (
              <Button variant="primary" size="sm" onClick={onCreateRoom}>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                创建房间
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* 空状态 */}
      {!loading && rooms.length === 0 && (
        <EmptyState
          icon="🏠"
          title="暂无房间"
          description="还没有可用的房间，创建一个吧！"
        >
          {onCreateRoom && (
            <Button variant="primary" onClick={onCreateRoom}>
              创建第一个房间
            </Button>
          )}
        </EmptyState>
      )}

      {/* 房间列表 */}
      {!loading && rooms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onClick={() => onRoomSelect?.(room)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomList;
