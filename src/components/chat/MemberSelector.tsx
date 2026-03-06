/**
 * @fileoverview 成员选择器组件
 * @description 用于选择特定的 AI 团队成员进行对话
 */

'use client';

import { TeamMember } from './types';

interface MemberSelectorProps {
  teamMembers: TeamMember[];
  selectedMemberId: string;
  onSelect: (memberId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * 获取状态对应的颜色类名
 */
function getStatusColor(status: TeamMember['status']): string {
  switch (status) {
    case 'online':
      return 'bg-green-400';
    case 'busy':
      return 'bg-yellow-400';
    case 'offline':
      return 'bg-zinc-400';
  }
}

/**
 * 成员选择器组件
 * @param teamMembers - 团队成员列表
 * @param selectedMemberId - 当前选中的成员ID
 * @param onSelect - 选择成员的回调
 * @param isOpen - 是否显示下拉列表
 * @param onToggle - 切换显示状态的回调
 */
export function MemberSelector({
  teamMembers,
  selectedMemberId,
  onSelect,
  isOpen,
  onToggle,
}: MemberSelectorProps) {
  const selectedMember = selectedMemberId
    ? teamMembers.find(m => m.id === selectedMemberId)
    : null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/80">选择 AI 成员:</span>
      <button
        onClick={onToggle}
        className="flex-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs text-white transition-colors flex items-center justify-between"
      >
        {selectedMember ? (
          <span>
            {selectedMember.emoji} {selectedMember.name}
          </span>
        ) : (
          <span>全部成员</span>
        )}
        <span>{isOpen ? '↑' : '↓'}</span>
      </button>

      {/* 下拉列表 */}
      {isOpen && (
        <div className="absolute left-4 right-4 top-full mt-1 max-h-48 overflow-y-auto bg-white/10 rounded-lg p-2 z-10">
          {/* 全部成员选项 */}
          <button
            onClick={() => {
              onSelect('');
              onToggle();
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
              !selectedMemberId ? 'bg-white/30 text-white' : 'text-white/80 hover:bg-white/20'
            }`}
          >
            🤖 全部成员
          </button>
          
          {/* 成员列表 */}
          {teamMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => {
                onSelect(member.id);
                onToggle();
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                selectedMemberId === member.id ? 'bg-white/30 text-white' : 'text-white/80 hover:bg-white/20'
              }`}
            >
              <span>{member.emoji}</span>
              <span className="flex-1">{member.name}</span>
              <span className={`w-2 h-2 rounded-full ${getStatusColor(member.status)}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}