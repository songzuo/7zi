/**
 * RoomJoinModal 组件 - 加入房间模态框
 * @version 1.0.0
 */

'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { roomsClient } from '@/lib/api/rooms/client'
import type { Room } from '@/lib/api/rooms/types'

interface RoomJoinModalProps {
  room: Room
  isOpen: boolean
  onClose: () => void
  onJoinSuccess: (room: Room) => void
}

export const RoomJoinModal: React.FC<RoomJoinModalProps> = ({
  room,
  isOpen,
  onClose,
  onJoinSuccess,
}) => {
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [requirePassword, setRequirePassword] = useState(false)

  const handleJoin = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await roomsClient.joinRoom(
        room.id,
        requirePassword ? { password } : undefined
      )

      onJoinSuccess(response.room)
      onClose()
    } catch (err: any) {
      console.error('Failed to join room:', err)
      if (err.status === 401) {
        setRequirePassword(true)
        setError('需要密码才能加入此房间')
      } else {
        setError(err.message || '加入房间失败')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800">
        {/* 标题 */}
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">加入房间</h3>
        </div>

        {/* 内容 */}
        <div className="space-y-4 px-6 py-4">
          {/* 房间信息 */}
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
            <h4 className="font-medium text-gray-900 dark:text-white">{room.name}</h4>
            {room.description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{room.description}</p>
            )}
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>
                参与者: {room.participantCount}/{room.maxParticipants}
              </span>
              <span>创建者: {room.ownerName || 'Unknown'}</span>
            </div>
          </div>

          {/* 密码输入（如果需要） */}
          {requirePassword && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                房间密码
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="输入房间密码"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* 按钮 */}
        <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900/50">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button variant="primary" onClick={handleJoin} loading={loading}>
            加入房间
          </Button>
        </div>
      </div>
    </div>
  )
}

export default RoomJoinModal
