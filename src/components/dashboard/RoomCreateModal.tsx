'use client'

/**
 * RoomCreateModal - 房间创建弹窗组件
 *
 * 支持创建不同类型的 WebSocket 房间
 * 可配置房间可见性、最大参与者数等
 * 支持国际化 (i18n)
 */

import React, { useState } from 'react'
import { X, Plus, Users, Eye, EyeOff, Globe, Lock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import type { RoomType, RoomVisibility, RoomConfig } from '@/lib/websocket/rooms'

// ============================================================================
// 类型定义
// ============================================================================

export interface RoomCreateOptions {
  id?: string
  name: string
  type: RoomType
  documentId?: string
  visibility: RoomVisibility
  maxParticipants?: number
  allowGuests?: boolean
  messageHistoryEnabled?: boolean
  autoCleanupMinutes?: number
}

export interface RoomCreateModalProps {
  /** 是否显示弹窗 */
  isOpen: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 提交回调 */
  onSubmit: (options: RoomCreateOptions) => Promise<void> | void
  /** 是否加载中 */
  isLoading?: boolean
  /** 默认文档 ID */
  defaultDocumentId?: string
  /** 是否显示高级选项 */
  showAdvanced?: boolean
  /** 自定义类名 */
  className?: string
}

// ============================================================================
// 房间类型配置
// ============================================================================

const ROOM_TYPES: { type: RoomType; label: string; icon: React.ReactNode; description: string }[] =
  [
    {
      type: 'chat',
      label: '聊天室',
      icon: <Mail className="h-5 w-5" />,
      description: '实时聊天和消息交流',
    },
    {
      type: 'task',
      label: '任务协作',
      icon: <Plus className="h-5 w-5" />,
      description: '任务分配和协作管理',
    },
    {
      type: 'project',
      label: '项目协作',
      icon: <Users className="h-5 w-5" />,
      description: '项目文档和进度跟踪',
    },
    {
      type: 'document',
      label: '文档协作',
      icon: <Lock className="h-5 w-5" />,
      description: '实时文档编辑',
    },
    {
      type: 'voice',
      label: '语音会议',
      icon: <Eye className="h-5 w-5" />,
      description: '实时语音通话',
    },
    {
      type: 'video',
      label: '视频会议',
      icon: <Globe className="h-5 w-5" />,
      description: '视频会议和屏幕共享',
    },
  ]

// ============================================================================
// 可见性配置
// ============================================================================

const VISIBILITY_OPTIONS: {
  type: RoomVisibility
  label: string
  icon: React.ReactNode
  description: string
}[] = [
  {
    type: 'public',
    label: '公开',
    icon: <Globe className="h-4 w-4" />,
    description: '任何人都可以发现并加入',
  },
  {
    type: 'private',
    label: '私有',
    icon: <Lock className="h-4 w-4" />,
    description: '仅邀请用户可以加入',
  },
  {
    type: 'invite-only',
    label: '仅邀请',
    icon: <Mail className="h-4 w-4" />,
    description: '需要邀请码才能加入',
  },
]

// ============================================================================
// 主组件
// ============================================================================

export const RoomCreateModal: React.FC<RoomCreateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  defaultDocumentId,
  showAdvanced = false,
  className = '',
}) => {
  const t = useTranslations('room.create')

  // 表单状态
  const [name, setName] = useState('')
  const [type, setType] = useState<RoomType>('chat')
  const [visibility, setVisibility] = useState<RoomVisibility>('public')
  const [maxParticipants, setMaxParticipants] = useState<number>(100)
  const [documentId, setDocumentId] = useState(defaultDocumentId || '')
  const [allowGuests, setAllowGuests] = useState(true)
  const [messageHistoryEnabled, setMessageHistoryEnabled] = useState(true)
  const [autoCleanupMinutes, setAutoCleanupMinutes] = useState<number>(30)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(showAdvanced)

  // 重置表单
  const resetForm = () => {
    setName('')
    setType('chat')
    setVisibility('public')
    setMaxParticipants(100)
    setDocumentId(defaultDocumentId || '')
    setAllowGuests(true)
    setMessageHistoryEnabled(true)
    setAutoCleanupMinutes(30)
    setShowAdvancedSettings(showAdvanced)
  }

  // 当弹窗打开时重置表单
  React.useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen, showAdvanced, defaultDocumentId])

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      return
    }

    const options: RoomCreateOptions = {
      name: name.trim(),
      type,
      documentId: documentId.trim() || undefined,
      visibility,
      maxParticipants,
      allowGuests,
      messageHistoryEnabled,
      autoCleanupMinutes,
    }

    await onSubmit(options)
    onClose()
  }

  // 生成默认房间 ID
  const generateRoomId = () => {
    return `${type}-${Date.now()}`
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      className={cn('fixed inset-0 z-50 overflow-y-auto', className)}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 弹窗容器 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all dark:bg-zinc-900"
          onClick={e => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
            <div>
              <h3 id="modal-title" className="text-xl font-semibold text-zinc-900 dark:text-white">
                {t('title')}
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 表单内容 */}
          <form
            onSubmit={handleSubmit}
            className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-6"
          >
            {/* 房间名称 */}
            <div>
              <label
                htmlFor="room-name"
                className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                {t('roomName')} <span className="text-red-500">*</span>
              </label>
              <Input
                id="room-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('roomNamePlaceholder')}
                required
                maxLength={100}
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{name.length}/100</p>
            </div>

            {/* 房间类型选择 */}
            <div>
              <label className="mb-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t('roomType')}
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {ROOM_TYPES.map(rt => (
                  <button
                    key={rt.type}
                    type="button"
                    onClick={() => setType(rt.type)}
                    disabled={isLoading}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                      type === rt.type
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                        : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <div
                      className={
                        type === rt.type
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }
                    >
                      {rt.icon}
                    </div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {rt.label}
                    </span>
                    <span className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                      {rt.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 可见性选择 */}
            <div>
              <label className="mb-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t('visibility')}
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {VISIBILITY_OPTIONS.map(vo => (
                  <button
                    key={vo.type}
                    type="button"
                    onClick={() => setVisibility(vo.type)}
                    disabled={isLoading}
                    className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                      visibility === vo.type
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                        : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <div
                      className={
                        visibility === vo.type
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }
                    >
                      {vo.icon}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {vo.label}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {vo.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 高级选项切换 */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                disabled={isLoading}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {showAdvancedSettings ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {showAdvancedSettings ? t('hideAdvanced') : t('showAdvanced')}
              </button>
            </div>

            {/* 高级选项 */}
            {showAdvancedSettings && (
              <div className="space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                {/* 文档 ID */}
                <div>
                  <label
                    htmlFor="document-id"
                    className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    {t('documentId')}
                  </label>
                  <Input
                    id="document-id"
                    value={documentId}
                    onChange={e => setDocumentId(e.target.value)}
                    placeholder={t('documentIdPlaceholder')}
                    disabled={isLoading}
                  />
                </div>

                {/* 最大参与者数 */}
                <div>
                  <label
                    htmlFor="max-participants"
                    className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    {t('maxParticipants')}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="max-participants"
                      type="range"
                      min="2"
                      max="500"
                      value={maxParticipants}
                      onChange={e => setMaxParticipants(parseInt(e.target.value))}
                      disabled={isLoading}
                      className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-blue-600 disabled:opacity-50 dark:bg-zinc-700"
                    />
                    <span className="w-16 text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {maxParticipants}
                    </span>
                  </div>
                </div>

                {/* 选项开关 */}
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center justify-between">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {t('allowGuests')}
                    </span>
                    <input
                      type="checkbox"
                      checked={allowGuests}
                      onChange={e => setAllowGuests(e.target.checked)}
                      disabled={isLoading}
                      className="h-5 w-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {t('messageHistory')}
                    </span>
                    <input
                      type="checkbox"
                      checked={messageHistoryEnabled}
                      onChange={e => setMessageHistoryEnabled(e.target.checked)}
                      disabled={isLoading}
                      className="h-5 w-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </label>
                </div>

                {/* 自动清理时间 */}
                {type !== 'project' && (
                  <div>
                    <label
                      htmlFor="auto-cleanup"
                      className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      {t('autoCleanup')}
                    </label>
                    <select
                      id="auto-cleanup"
                      value={autoCleanupMinutes}
                      onChange={e => setAutoCleanupMinutes(parseInt(e.target.value))}
                      disabled={isLoading}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                    >
                      <option value={0}>{t('neverCleanup')}</option>
                      <option value={5}>5 {t('minutes')}</option>
                      <option value={15}>15 {t('minutes')}</option>
                      <option value={30}>30 {t('minutes')}</option>
                      <option value={60}>1 {t('hour')}</option>
                      <option value={120}>2 {t('hours')}</option>
                      <option value={240}>4 {t('hours')}</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </form>

          {/* 底部按钮 */}
          <div className="flex justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading || !name.trim()}
              loading={isLoading}
            >
              <Plus className="h-4 w-4" />
              {t('create')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoomCreateModal
