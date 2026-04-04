/**
 * CreateRoomModal 组件 - 创建房间模态框
 * @version 1.0.0
 */

'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { roomsClient } from '@/lib/api/rooms/client'
import type { Room, RoomVisibility } from '@/lib/api/rooms/types'
import type { ApiError } from '@/types/api'

interface CreateRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (room: Room) => void
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<RoomVisibility>('public')
  const [maxParticipants, setMaxParticipants] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('房间名称不能为空')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await roomsClient.createRoom({
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
        maxParticipants,
      })

      onCreated(response.room)
      onClose()

      // 重置表单
      setName('')
      setDescription('')
      setVisibility('public')
      setMaxParticipants(10)
    } catch (err) {
      const error = err as ApiError
      console.error('Failed to create room:', err)
      setError(error.message || '创建房间失败')
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">创建新房间</h3>
        </div>

        {/* 内容 */}
        <div className="space-y-4 px-6 py-4">
          {/* 房间名称 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              房间名称 *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="输入房间名称"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              描述
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="简单描述一下这个房间"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* 可见性 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              可见性
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'public', label: '公开', icon: '🌐' },
                { value: 'private', label: '私有', icon: '🔒' },
                { value: 'unlisted', label: '不公开', icon: '🔗' },
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setVisibility(option.value as RoomVisibility)}
                  className={`rounded-lg border-2 p-3 transition-all ${
                    visibility === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <span className="text-lg">{option.icon}</span>
                  <span className="mt-1 block text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 最大参与者数 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              最大参与者数
            </label>
            <input
              type="number"
              value={maxParticipants}
              onChange={e => setMaxParticipants(parseInt(e.target.value) || 10)}
              min={2}
              max={100}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-700 dark:text-white"
            />
          </div>

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
          <Button variant="primary" onClick={handleCreate} loading={loading}>
            创建房间
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CreateRoomModal
