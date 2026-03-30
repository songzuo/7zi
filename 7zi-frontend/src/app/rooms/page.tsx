/**
 * 房间系统主页面
 * @version 1.0.0
 */

'use client';

import React, { useState } from 'react';
import { RoomList } from '@/components/rooms/RoomList';
import { CreateRoomModal } from '@/components/rooms/CreateRoomModal';
import { RoomJoinModal } from '@/components/rooms/RoomJoinModal';
import { RoomSettings } from '@/components/rooms/RoomSettings';
import { ParticipantList } from '@/components/rooms/ParticipantList';
import { Button } from '@/components/ui/Button';
import { roomsClient } from '@/lib/api/rooms/client';
import type { Room, RoomParticipantRole } from '@/lib/api/rooms/types';

type View = 'list' | 'detail' | 'settings';

export default function RoomsPage() {
  const [view, setView] = useState<View>('list');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [roomToJoin, setRoomToJoin] = useState<Room | null>(null);
  const [userRole, setUserRole] = useState<RoomParticipantRole>('member');

  // 处理房间选择
  const handleRoomSelect = (room: Room) => {
    setSelectedRoom(room);
    // 模拟用户角色（实际应该从用户会话获取）
    setUserRole('admin');
    setView('detail');
  };

  // 处理创建房间
  const handleRoomCreated = (room: Room) => {
    setSelectedRoom(room);
    setUserRole('owner');
    setView('detail');
  };

  // 处理加入房间
  const handleJoinRoom = (room: Room) => {
    setRoomToJoin(room);
    setIsJoinModalOpen(true);
  };

  // 处理加入成功
  const handleJoinSuccess = (room: Room) => {
    setSelectedRoom(room);
    setUserRole('member');
    setView('detail');
    setIsJoinModalOpen(false);
    setRoomToJoin(null);
  };

  // 处理离开房间
  const handleLeaveRoom = async () => {
    if (!selectedRoom) return;

    if (!confirm('确定要离开这个房间吗？')) return;

    try {
      await roomsClient.leaveRoom(selectedRoom.id);
      setSelectedRoom(null);
      setView('list');
    } catch (err) {
      console.error('Failed to leave room:', err);
      alert('离开房间失败');
    }
  };

  // 处理房间更新
  const handleRoomUpdate = (room: Room) => {
    setSelectedRoom(room);
  };

  // 返回列表视图
  const handleBack = () => {
    setView('list');
    setSelectedRoom(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">房间系统</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            创建和加入实时协作房间
          </p>
        </div>

        {/* 列表视图 */}
        {view === 'list' && (
          <RoomList
            onRoomSelect={handleRoomSelect}
            onCreateRoom={() => setIsCreateModalOpen(true)}
          />
        )}

        {/* 详情视图 */}
        {view === 'detail' && selectedRoom && (
          <div className="space-y-6">
            {/* 返回按钮 */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={handleBack}>
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                返回列表
              </Button>
              <div className="flex gap-2">
                {userRole === 'owner' && (
                  <Button variant="outline" onClick={() => setView('settings')}>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    设置
                  </Button>
                )}
                <Button variant="danger" onClick={handleLeaveRoom}>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  离开
                </Button>
              </div>
            </div>

            {/* 房间信息卡片 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {selectedRoom.name}
              </h2>
              {selectedRoom.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {selectedRoom.description}
                </p>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>
                  <span className="font-medium">可见性:</span> {selectedRoom.visibility}
                </span>
                <span>
                  <span className="font-medium">最大参与者:</span> {selectedRoom.maxParticipants}
                </span>
                <span>
                  <span className="font-medium">创建于:</span>{' '}
                  {new Date(selectedRoom.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* 参与者列表 */}
            <ParticipantList roomId={selectedRoom.id} currentUserRole={userRole} />
          </div>
        )}

        {/* 设置视图 */}
        {view === 'settings' && selectedRoom && (
          <div>
            <Button variant="ghost" onClick={handleBack} className="mb-4">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              返回详情
            </Button>
            <RoomSettings
              room={selectedRoom}
              onUpdate={handleRoomUpdate}
              onClose={() => setView('detail')}
            />
          </div>
        )}
      </div>

      {/* 创建房间模态框 */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleRoomCreated}
      />

      {/* 加入房间模态框 */}
      {roomToJoin && (
        <RoomJoinModal
          room={roomToJoin}
          isOpen={isJoinModalOpen}
          onClose={() => {
            setIsJoinModalOpen(false);
            setRoomToJoin(null);
          }}
          onJoinSuccess={handleJoinSuccess}
        />
      )}
    </div>
  );
}
