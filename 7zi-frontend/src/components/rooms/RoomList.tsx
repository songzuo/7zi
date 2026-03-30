/**
 * Room List Component
 *
 * Display all rooms the user has joined or created
 * Supports filtering and room management actions
 *
 * Features:
 * - Display all rooms with name, member count, online status, last activity
 * - Create room / Join room / Leave room
 * - Filter: All / My Created / My Joined
 * - Search functionality
 * - Responsive design (mobile-first)
 */

'use client';

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import type { RoomFilter } from '@/stores/room-store';
import { useRoomStore } from '@/stores/room-store';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { RoomStatusIndicator } from './RoomStatusIndicator';
import { RoomTypeSelector, RoomTypeBadge, type RoomType } from './RoomTypeSelector';
import type { CreateRoomRequest, JoinRoomRequest } from '@/types/rooms';

export interface RoomListProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Filter Options
 */
const FILTER_OPTIONS: { value: RoomFilter; label: string }[] = [
  { value: 'all', label: 'all' },
  { value: 'myCreated', label: 'myCreated' },
  { value: 'myJoined', label: 'myJoined' },
];

/**
 * Room List Component
 */
export function RoomList({ className }: RoomListProps) {
  const { t } = useTranslation('rooms');
  const router = useRouter();
  const {
    rooms,
    currentRoom,
    filter,
    searchQuery,
    isLoading,
    error,
    setCurrentRoom,
    setFilter,
    setSearchQuery,
    setLoading,
    setError,
    removeRoom,
    getFilteredRooms,
  } = useRoomStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [createRoomType, setCreateRoomType] = useState<RoomType>('chat');
  const [createForm, setCreateForm] = useState<CreateRoomRequest>({
    name: '',
    description: '',
    password: '',
  });
  const [joinForm, setJoinForm] = useState<JoinRoomRequest>({
    inviteCode: '',
    password: '',
  });

  const filteredRooms = getFilteredRooms();

  // Filter change handler
  const handleFilterChange = (newFilter: RoomFilter) => {
    setFilter(newFilter);
  };

  // Search change handler
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  // Create room handler
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      if (!response.ok) {
        throw new Error(t('messages.error'));
      }

      const newRoom = await response.json();

      // Add room to store
      // This will be replaced with actual WebSocket events
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '', password: '' });

      // Navigate to new room
      router.push(`/rooms/${newRoom.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('messages.error'));
    } finally {
      setLoading(false);
    }
  };

  // Join room handler
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!joinForm.inviteCode.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(joinForm),
      });

      if (!response.ok) {
        throw new Error(t('messages.error'));
      }

      const room = await response.json();

      setShowJoinModal(false);
      setJoinForm({ inviteCode: '', password: '' });

      // Navigate to room
      router.push(`/rooms/${room.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('messages.error'));
    } finally {
      setLoading(false);
    }
  };

  // Leave room handler
  const handleLeaveRoom = async (roomId: string) => {
    if (!confirm(t('leaveConfirm'))) return;

    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/rooms/${roomId}/leave`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(t('messages.error'));
      }

      // Remove from store
      removeRoom(roomId);

      // If current room, clear it
      if (currentRoom?.id === roomId) {
        setCurrentRoom(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('messages.error'));
    } finally {
      setLoading(false);
    }
  };

  // Format time
  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return t('common.today');
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('title')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('subtitle')}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowJoinModal(true)}
          >
            {t('join')}
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            {t('create')}
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <Input
            type="search"
            placeholder={t('placeholder.searchRooms')}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleFilterChange(option.value)}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                filter === option.value
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
              type="button"
            >
              {t(`filter.${option.label}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Room List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('loading')}</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery ? 'No rooms found' : 'No rooms yet'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className={clsx(
                'bg-white dark:bg-gray-800 rounded-lg border transition-all',
                currentRoom?.id === room.id
                  ? 'border-blue-500 dark:border-blue-500 shadow-md ring-2 ring-blue-500 ring-opacity-20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md'
              )}
            >
              <div className="p-4">
                {/* Room Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {room.name}
                    </h3>
                    {room.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                        {room.description}
                      </p>
                    )}
                  </div>

                  <RoomStatusIndicator
                    status="connected"
                    onlineCount={room.onlineCount}
                    totalCount={room.memberCount}
                    size="sm"
                  />
                </div>

                {/* Room Info */}
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">👤</span>
                    <span>{room.memberCount}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-green-500">●</span>
                    <span>{room.onlineCount}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">⏱️</span>
                    <span>{formatTime(room.lastActivityAt)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">👑</span>
                    <span className="truncate max-w-[100px]">{room.ownerName}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant={currentRoom?.id === room.id ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setCurrentRoom(room);
                      router.push(`/rooms/${room.id}`);
                    }}
                  >
                    {currentRoom?.id === room.id ? t('joined') : t('join')}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLeaveRoom(room.id)}
                  >
                    {t('leave')}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Room Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('create')}
      >
        <form onSubmit={handleCreateRoom} className="space-y-4">
          {/* Room Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('roomType')}
            </label>
            <RoomTypeSelector
              selectedType={createRoomType}
              onChange={setCreateRoomType}
              compact
            />
          </div>

          <Input
            label={t('roomName')}
            placeholder={t('placeholder.enterRoomName')}
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            required
          />

          <Input
            label={t('roomDescription')}
            placeholder={t('placeholder.enterDescription')}
            value={createForm.description}
            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
          />

          <Input
            label={t('roomPassword')}
            type="password"
            placeholder={t('placeholder.enterPassword')}
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
          />

          <div className="flex gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowCreateModal(false)}
              type="button"
            >
              {t('cancel')}
            </Button>
            <Button type="submit" loading={isLoading}>
              {t('confirm')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Join Room Modal */}
      <Modal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title={t('join')}
      >
        <form onSubmit={handleJoinRoom} className="space-y-4">
          <Input
            label={t('inviteCode')}
            placeholder={t('placeholder.enterInviteCode')}
            value={joinForm.inviteCode}
            onChange={(e) => setJoinForm({ ...joinForm, inviteCode: e.target.value })}
            required
          />

          <Input
            label={t('roomPassword')}
            type="password"
            placeholder={t('placeholder.enterPassword')}
            value={joinForm.password}
            onChange={(e) => setJoinForm({ ...joinForm, password: e.target.value })}
          />

          <div className="flex gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowJoinModal(false)}
              type="button"
            >
              {t('cancel')}
            </Button>
            <Button type="submit" loading={isLoading}>
              {t('confirm')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default RoomList;
