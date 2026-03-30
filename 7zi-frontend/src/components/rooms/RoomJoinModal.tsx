/**
 * RoomJoinModal 组件 - 加入房间模态框
 * @version 1.0.0
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { roomsClient } from '@/lib/api/rooms/client';
import type { Room } from '@/lib/api/rooms/types';

interface RoomJoinModalProps {
  room: Room;
  isOpen: boolean;
  onClose: () => void;
  onJoinSuccess: (room: Room) => void;
}

export const RoomJoinModal: React.FC<RoomJoinModalProps> = ({
  room,
  isOpen,
  onClose,
  onJoinSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [requirePassword, setRequirePassword] = useState(false);

  const handleJoin = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await roomsClient.joinRoom(room.id, requirePassword ? { password } : undefined);

      onJoinSuccess(response.room);
      onClose();
    } catch (err: any) {
      console.error('Failed to join room:', err);
      if (err.status === 401) {
        setRequirePassword(true);
        setError('需要密码才能加入此房间');
      } else {
        setError(err.message || '加入房间失败');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* 标题 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            加入房间
          </h3>
        </div>

        {/* 内容 */}
        <div className="px-6 py-4 space-y-4">
          {/* 房间信息 */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white">{room.name}</h4>
            {room.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {room.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span>参与者: {room.participantCount}/{room.maxParticipants}</span>
              <span>创建者: {room.ownerName || 'Unknown'}</span>
            </div>
          </div>

          {/* 密码输入（如果需要） */}
          {requirePassword && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                房间密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入房间密码"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* 按钮 */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button variant="primary" onClick={handleJoin} loading={loading}>
            加入房间
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoomJoinModal;
