/**
 * @fileoverview 聊天头部组件
 * @description 显示聊天窗口标题、在线状态和团队状态切换
 */

'use client';

import { useChatMembers } from '@/contexts/ChatContext';
import { MemberSelector } from './MemberSelector';

interface ChatHeaderProps {
  showTeamStatus: boolean;
  onToggleTeamStatus: () => void;
  showMemberSelector: boolean;
  onToggleMemberSelector: () => void;
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
  const { teamMembers, onlineCount } = useChatMembers();

  return (
    <div className="bg-gradient-to-r from-cyan-500 to-purple-600 p-4 relative">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
            🤖
          </div>
          <div>
            <h3 className="font-bold text-white">7zi AI 助手</h3>
            <div className="flex items-center gap-2 text-xs text-white/80">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              {onlineCount} 位成员在线
            </div>
          </div>
        </div>
        <button
          onClick={onToggleTeamStatus}
          className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs text-white transition-colors"
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
  );
}