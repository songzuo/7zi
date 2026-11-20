/**
 * @fileoverview 聊天头部组件
 * @description 显示聊天窗口标题、在线状态和团队状态切换
 */

'use client'

import { useChatMembers } from '@/contexts/ChatContext'
import { MemberSelector } from './MemberSelector'

interface ChatHeaderProps {
  showTeamStatus: boolean
  onToggleTeamStatus: () => void
  showMemberSelector: boolean
  onToggleMemberSelector: () => void
}

/**
 * 聊天头部组件
 * @param showTeamStatus - 是否显示团队状态
 * @param onToggleTeamStatus - 切换团队状态显示的回调
 * @param showMemberSelector - 是否显示成员选择器
 * @param onToggleMemberSelector - 切换成员选择器显示的回调
 */
export function ChatHeader({
  showTeamStatus,
  onToggleTeamStatus,
  showMemberSelector,
  onToggleMemberSelector,
}: ChatHeaderProps) {
  // 从 context 获取团队成员数据
  const { teamMembers, onlineCount } = useChatMembers()

  return (
    <div className="relative bg-gradient-to-r from-cyan-500 to-purple-600 p-4">
      {/* 标题栏 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-xl">
            🤖
          </div>
          <div>
            <h3 className="font-bold text-white">7zi AI 助手</h3>
            <div className="flex items-center gap-2 text-xs text-white/80">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              {onlineCount} 位成员在线
            </div>
          </div>
        </div>
        <button
          onClick={onToggleTeamStatus}
          className="rounded-lg bg-white/20 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/30"
        >
          {showTeamStatus ? '隐藏状态' : '团队状态'}
        </button>
      </div>

      {/* 成员选择器 */}
      <MemberSelector
        teamMembers={teamMembers}
        selectedMemberId=""
        onSelect={() => {}}
        isOpen={showMemberSelector}
        onToggle={onToggleMemberSelector}
      />
    </div>
  )
}
