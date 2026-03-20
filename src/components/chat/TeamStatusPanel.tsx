/**
 * @fileoverview 团队状态面板组件
 * @description 显示所有团队成员的在线状态
 */

'use client';

import { useChatMembers } from '@/contexts/ChatContext';
import { UnifiedTeamMember } from '@/types/members';

/**
 * 获取状态对应的颜色类名
 */
function getStatusColor(status: UnifiedTeamMember['status']): string {
  switch (status) {
    case 'online':
    case 'working':
      return 'bg-green-500';
    case 'busy':
      return 'bg-yellow-500';
    case 'idle':
      return 'bg-zinc-400';
    case 'offline':
      return 'bg-zinc-400';
  }
}

/**
 * 团队状态面板组件
 * 不再接收 teamMembers prop，从 context 中获取
 */
export function TeamStatusPanel() {
  // 从 context 获取团队成员数据
  const { teamMembers } = useChatMembers();

  return (
    <div className="max-h-40 overflow-y-auto bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 p-3">
      <div className="grid grid-cols-3 gap-2">
        {teamMembers.map((member) => (
          <div
            key={member.id}
            className="flex flex-col items-center p-2 rounded-lg bg-white dark:bg-zinc-800 hover:shadow-md transition-shadow"
            title={member.specialty}
          >
            <span className="text-lg">{member.emoji}</span>
            <span className="text-[10px] text-zinc-600 dark:text-zinc-400 truncate w-full text-center">
              {member.name}
            </span>
            <span
              className={`w-2 h-2 rounded-full mt-1 ${getStatusColor(member.status)}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}