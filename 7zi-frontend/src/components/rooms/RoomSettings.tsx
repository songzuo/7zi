/**
 * RoomSettings 组件 - 房间设置面板
 * @version 1.0.0
 */

'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { roomsClient } from '@/lib/api/rooms/client'
import type { Room, RoomSettings as RoomSettingsType, RoomVisibility } from '@/lib/api/rooms/types'

interface RoomSettingsProps {
  room: Room
  onUpdate?: (room: Room) => void
  onClose?: () => void
  className?: string
}

export const RoomSettings: React.FC<RoomSettingsProps> = ({
  room,
  onUpdate,
  onClose,
  className,
}) => {
  const [settings, setSettings] = useState<RoomSettingsType>(room.settings)
  const [name, setName] = useState(room.name)
  const [description, setDescription] = useState(room.description || '')
  const [visibility, setVisibility] = useState<RoomVisibility>(room.visibility)
  const [maxParticipants, setMaxParticipants] = useState(room.maxParticipants)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // 更新设置
  const handleUpdateSetting = <K extends keyof RoomSettingsType>(
    key: K,
    value: RoomSettingsType[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  // 保存所有更改
  const handleSave = async () => {
    try {
      setLoading(true)
      setError(null)

      const updatedRoom = await roomsClient.updateRoom(room.id, {
        name,
        description: description || undefined,
        visibility,
        maxParticipants,
        settings,
      })

      onUpdate?.(updatedRoom)
      setSaved(true)

      // 3秒后重置保存状态
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      console.error('Failed to update room:', err)
      setError(err.message || '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`rounded-lg bg-white dark:bg-gray-800 ${className}`}>
      <div className="border-b border-gray-200 p-6 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">房间设置</h3>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6 p-6">
        {/* 基本信息 */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium tracking-wide text-gray-700 uppercase dark:text-gray-300">
            基本信息
          </h4>

          {/* 房间名称 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              房间名称 *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value)
                setSaved(false)
              }}
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
              onChange={e => {
                setDescription(e.target.value)
                setSaved(false)
              }}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              placeholder="简单描述一下这个房间..."
            />
          </div>

          {/* 可见性 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  onClick={() => {
                    setVisibility(option.value as RoomVisibility)
                    setSaved(false)
                  }}
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
              onChange={e => {
                setMaxParticipants(parseInt(e.target.value) || 10)
                setSaved(false)
              }}
              min={2}
              max={100}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* 功能设置 */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium tracking-wide text-gray-700 uppercase dark:text-gray-300">
            功能设置
          </h4>

          <div className="space-y-3">
            {/* 允许访客 */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-900 dark:text-white">允许访客</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">允许未登录用户加入房间</p>
              </div>
              <button
                onClick={() => handleUpdateSetting('allowGuests', !settings.allowGuests)}
                className={`relative h-6 w-12 rounded-full transition-colors ${
                  settings.allowGuests ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                    settings.allowGuests ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* 允许聊天 */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-900 dark:text-white">允许聊天</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">启用房间内聊天功能</p>
              </div>
              <button
                onClick={() => handleUpdateSetting('allowChat', !settings.allowChat)}
                className={`relative h-6 w-12 rounded-full transition-colors ${
                  settings.allowChat ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                    settings.allowChat ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* 允许文件共享 */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-900 dark:text-white">允许文件共享</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">允许参与者上传和共享文件</p>
              </div>
              <button
                onClick={() => handleUpdateSetting('allowFileSharing', !settings.allowFileSharing)}
                className={`relative h-6 w-12 rounded-full transition-colors ${
                  settings.allowFileSharing ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                    settings.allowFileSharing ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* 自动踢出不活跃用户 */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-900 dark:text-white">
                  自动踢出不活跃用户
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">一段时间不活跃后自动移出</p>
              </div>
              <button
                onClick={() => handleUpdateSetting('autoKickInactive', !settings.autoKickInactive)}
                className={`relative h-6 w-12 rounded-full transition-colors ${
                  settings.autoKickInactive ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                    settings.autoKickInactive ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* 不活跃超时 */}
            {settings.autoKickInactive && (
              <div className="border-l-2 border-gray-200 pl-4 dark:border-gray-700">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  不活跃超时时间（分钟）
                </label>
                <input
                  type="number"
                  value={settings.inactivityTimeout}
                  onChange={e =>
                    handleUpdateSetting('inactivityTimeout', parseInt(e.target.value) || 30)
                  }
                  min={5}
                  max={1440}
                  className="w-32 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* 欢迎消息 */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium tracking-wide text-gray-700 uppercase dark:text-gray-300">
            欢迎消息
          </h4>
          <textarea
            value={settings.welcomeMessage || ''}
            onChange={e => handleUpdateSetting('welcomeMessage', e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-700 dark:text-white"
            placeholder="新成员加入时显示的消息..."
          />
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* 保存成功提示 */}
        {saved && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
            <p className="text-sm text-green-600 dark:text-green-400">✓ 设置已保存</p>
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900/50">
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
        )}
        <Button variant="primary" onClick={handleSave} loading={loading}>
          保存设置
        </Button>
      </div>
    </div>
  )
}

export default RoomSettings
