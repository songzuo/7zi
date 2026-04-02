/**
 * ParticipantList 组件 - 参与者列表
 * @version 1.0.0
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { roomsClient } from '@/lib/api/rooms/client'
import type { RoomParticipant, RoomParticipantRole } from '@/lib/api/rooms/types'

interface ParticipantListProps {
  roomId: string
  currentUserRole?: RoomParticipantRole
  className?: string
}

const roleColors: Record<RoomParticipantRole, string> = {
  owner: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  admin: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  member: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800',
  guest: 'text-gray-500 bg-gray-50 dark:text-gray-500 dark:bg-gray-900/50',
}

const roleLabels: Record<RoomParticipantRole, string> = {
  owner: '创建者',
  admin: '管理员',
  member: '成员',
  guest: '访客',
}

const roleHierarchy: RoomParticipantRole[] = ['owner', 'admin', 'member', 'guest']

// 检查用户是否有权限修改其他用户角色
function canModifyRole(
  currentUserRole: RoomParticipantRole,
  targetRole: RoomParticipantRole
): boolean {
  const currentLevel = roleHierarchy.indexOf(currentUserRole)
  const targetLevel = roleHierarchy.indexOf(targetRole)
  // 只能修改权限低于或等于自己的用户（owner 除外）
  return currentLevel < targetLevel && currentLevel < 2 // owner 或 admin
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  roomId,
  currentUserRole = 'member',
  className,
}) => {
  const [participants, setParticipants] = useState<RoomParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 加载参与者列表
  const loadParticipants = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await roomsClient.getParticipants(roomId)
      setParticipants(response.participants)
    } catch (err) {
      console.error('Failed to load participants:', err)
      setError('加载参与者失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadParticipants()
  }, [roomId])

  // 修改角色
  const handleRoleChange = async (participantId: string, newRole: RoomParticipantRole) => {
    try {
      await roomsClient.updateParticipantRole(roomId, participantId, { role: newRole })
      // 更新本地状态
      setParticipants(prev => prev.map(p => (p.id === participantId ? { ...p, role: newRole } : p)))
    } catch (err) {
      console.error('Failed to update role:', err)
      alert('修改角色失败')
    }
  }

  // 踢出参与者
  const handleKick = async (participantId: string, userName: string) => {
    if (!confirm(`确定要踢出 ${userName} 吗？`)) return

    try {
      await roomsClient.kickParticipant(roomId, participantId)
      setParticipants(prev => prev.filter(p => p.id !== participantId))
    } catch (err) {
      console.error('Failed to kick participant:', err)
      alert('踢出失败')
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={`rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20 ${className}`}
      >
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          参与者 ({participants.length})
        </h3>
        <Button variant="ghost" size="sm" onClick={loadParticipants}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </Button>
      </div>

      <div className="space-y-2">
        {participants.map(participant => (
          <div
            key={participant.id}
            className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50"
          >
            {/* 用户信息 */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-medium text-white">
                  {participant.userName.charAt(0).toUpperCase()}
                </div>
                {/* 在线状态 */}
                {participant.isOnline && (
                  <div className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-gray-800"></div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {participant.userName}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${roleColors[participant.role]}`}
                  >
                    {roleLabels[participant.role]}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  加入时间: {new Date(participant.joinedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* 操作按钮 */}
            {canModifyRole(currentUserRole, participant.role) && (
              <div className="flex items-center gap-2">
                {/* 角色选择 */}
                <select
                  value={participant.role}
                  onChange={e =>
                    handleRoleChange(participant.id, e.target.value as RoomParticipantRole)
                  }
                  className="rounded border border-gray-300 px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                >
                  <option value="admin">管理员</option>
                  <option value="member">成员</option>
                  <option value="guest">访客</option>
                </select>

                {/* 踢出按钮 */}
                {participant.role !== 'owner' && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => handleKick(participant.id, participant.userName)}
                    className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    踢出
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ParticipantList
