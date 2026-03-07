'use client';

import React, { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { useRealtimeNotificationStore } from '@/lib/realtime/store';
import { socketManager } from '@/lib/realtime/socket-client';
import type { UserStatus } from '@/lib/realtime/types';

// ============================================================================
// 类型定义
// ============================================================================

interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: UserStatus;
  avatar?: string;
  currentTask?: string;
  lastActive?: string;
}

interface TeamChannel {
  id: string;
  name: string;
  type: 'public' | 'private' | 'dm';
  unreadCount: number;
  lastMessage?: {
    content: string;
    sender: string;
    timestamp: string;
  };
}

interface TeamActivity {
  id: string;
  type: 'task_completed' | 'task_created' | 'comment' | 'mention' | 'status_change';
  user: string;
  content: string;
  timestamp: string;
  targetUrl?: string;
}

interface TeamCollaborationHubProps {
  className?: string;
  currentUserId?: string;
  onChannelSelect?: (channelId: string) => void;
  onMemberSelect?: (memberId: string) => void;
}

// ============================================================================
// 状态指示器组件
// ============================================================================

const StatusIndicator = memo(function StatusIndicator({ status }: { status: UserStatus }) {
  const statusConfig = {
    online: { color: 'bg-green-500', label: '在线' },
    offline: { color: 'bg-gray-400', label: '离线' },
    away: { color: 'bg-yellow-500', label: '离开' },
    busy: { color: 'bg-red-500', label: '忙碌' },
  };

  const config = statusConfig[status];

  return (
    <span 
      className={`w-2.5 h-2.5 rounded-full ${config.color} ring-2 ring-white dark:ring-gray-800`}
      title={config.label}
      aria-label={config.label}
    />
  );
});

// ============================================================================
// 成员卡片组件
// ============================================================================

interface MemberCardProps {
  member: TeamMember;
  onClick?: () => void;
}

const MemberCard = memo(function MemberCard({ member, onClick }: MemberCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 
                 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 
                        flex items-center justify-center text-white font-medium">
          {member.avatar ? (
            <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full" />
          ) : (
            member.name[0]
          )}
        </div>
        <StatusIndicator status={member.status} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white truncate">{member.name}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{member.role}</span>
        </div>
        {member.currentTask && (
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
            🎯 {member.currentTask}
          </p>
        )}
      </div>
    </button>
  );
});

// ============================================================================
// 频道项组件
// ============================================================================

interface ChannelItemProps {
  channel: TeamChannel;
  isActive?: boolean;
  onClick?: () => void;
}

const ChannelItem = memo(function ChannelItem({ channel, isActive, onClick }: ChannelItemProps) {
  const iconMap = {
    public: '#',
    private: '🔒',
    dm: '@',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${isActive 
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
    >
      <span className="text-lg">{iconMap[channel.type]}</span>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium truncate">{channel.name}</span>
          {channel.unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
              {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
            </span>
          )}
        </div>
        
        {channel.lastMessage && (
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
            <span className="font-medium">{channel.lastMessage.sender}: </span>
            {channel.lastMessage.content}
          </p>
        )}
      </div>
    </button>
  );
});

// ============================================================================
// 活动项组件
// ============================================================================

interface ActivityItemProps {
  activity: TeamActivity;
  onClick?: () => void;
}

const ActivityItem = memo(function ActivityItem({ activity, onClick }: ActivityItemProps) {
  const iconMap = {
    task_completed: '✅',
    task_created: '📝',
    comment: '💬',
    mention: '@',
    status_change: '🔄',
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 
                 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <span className="text-lg flex-shrink-0">{iconMap[activity.type]}</span>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white">
          <span className="font-medium">{activity.user}</span>
          {' '}{activity.content}
        </p>
        <time className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {activity.timestamp}
        </time>
      </div>
    </button>
  );
});

// ============================================================================
// 主组件
// ============================================================================

export const TeamCollaborationHub: React.FC<TeamCollaborationHubProps> = memo(function TeamCollaborationHub({
  className = '',
  currentUserId = 'current-user',
  onChannelSelect,
  onMemberSelect,
}) {
  const [activeTab, setActiveTab] = useState<'members' | 'channels' | 'activity'>('members');
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 模拟数据（实际应从 API 或 WebSocket 获取）
  const [members] = useState<TeamMember[]>([
    { id: '1', name: '智能体专家', role: '视角转换', status: 'online', currentTask: '分析市场趋势' },
    { id: '2', name: '咨询师', role: '研究分析', status: 'online', currentTask: '用户调研报告' },
    { id: '3', name: '架构师', role: '系统设计', status: 'busy', currentTask: '数据库优化' },
    { id: '4', name: 'Executor', role: '执行实现', status: 'online', currentTask: '开发新功能' },
    { id: '5', name: '系统管理员', role: '运维部署', status: 'away' },
    { id: '6', name: '测试员', role: '质量保障', status: 'online', currentTask: '自动化测试' },
    { id: '7', name: '设计师', role: 'UI/UX', status: 'offline' },
    { id: '8', name: '推广专员', role: '市场推广', status: 'online' },
    { id: '9', name: '销售客服', role: '客户支持', status: 'online' },
    { id: '10', name: '财务', role: '会计审计', status: 'online' },
    { id: '11', name: '媒体', role: '内容创作', status: 'online' },
  ]);

  const [channels] = useState<TeamChannel[]>([
    { id: 'general', name: '全体公告', type: 'public', unreadCount: 2, 
      lastMessage: { content: '明天上午10点开会', sender: '架构师', timestamp: '10分钟前' } },
    { id: 'dev', name: '开发组', type: 'public', unreadCount: 0,
      lastMessage: { content: '代码已提交', sender: 'Executor', timestamp: '1小时前' } },
    { id: 'design', name: '设计组', type: 'public', unreadCount: 5 },
    { id: 'dm-architect', name: '架构师', type: 'dm', unreadCount: 1,
      lastMessage: { content: '需要讨论一下架构', sender: '架构师', timestamp: '2小时前' } },
  ]);

  const [activities] = useState<TeamActivity[]>([
    { id: '1', type: 'task_completed', user: 'Executor', content: '完成了任务：实现团队协作功能', timestamp: '5分钟前' },
    { id: '2', type: 'comment', user: '咨询师', content: '评论了任务：调研报告', timestamp: '15分钟前' },
    { id: '3', type: 'task_created', user: '架构师', content: '创建了任务：性能优化', timestamp: '30分钟前' },
    { id: '4', type: 'mention', user: '测试员', content: '在评论中@了你', timestamp: '1小时前' },
    { id: '5', type: 'status_change', user: '设计师', content: '状态变更为忙碌', timestamp: '2小时前' },
  ]);

  const { isConnected } = useRealtimeNotificationStore();

  // 统计数据
  const stats = useMemo(() => ({
    online: members.filter(m => m.status === 'online').length,
    busy: members.filter(m => m.status === 'busy').length,
    away: members.filter(m => m.status === 'away').length,
    offline: members.filter(m => m.status === 'offline').length,
    totalUnread: channels.reduce((sum, ch) => sum + ch.unreadCount, 0),
  }), [members, channels]);

  // 过滤
  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members;
    return members.filter(m => 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [members, searchQuery]);

  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channels;
    return channels.filter(ch => 
      ch.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [channels, searchQuery]);

  // 处理频道选择
  const handleChannelClick = useCallback((channelId: string) => {
    setSelectedChannel(channelId);
    onChannelSelect?.(channelId);
  }, [onChannelSelect]);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* 头部 */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {stats.totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 text-xs font-bold bg-red-500 
                                 rounded-full flex items-center justify-center">
                  {stats.totalUnread > 9 ? '9+' : stats.totalUnread}
                </span>
              )}
            </div>
            <h3 className="font-semibold">团队协作</h3>
          </div>
          
          {/* 连接状态 */}
          <span className="flex items-center gap-1.5 text-sm">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-300' : 'bg-yellow-300'} animate-pulse`} />
            {isConnected ? '已连接' : '离线'}
          </span>
        </div>

        {/* 统计摘要 */}
        <div className="flex items-center gap-4 mt-2 text-sm text-white/80">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            {stats.online} 在线
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            {stats.busy} 忙碌
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            {stats.away} 离开
          </span>
        </div>
      </div>

      {/* 标签栏 */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {[
          { key: 'members', label: '成员', count: members.length },
          { key: 'channels', label: '频道', count: channels.length, unread: stats.totalUnread },
          { key: 'activity', label: '动态', count: activities.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors relative
                       ${activeTab === tab.key 
                         ? 'text-indigo-600 dark:text-indigo-400' 
                         : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {tab.label}
            {tab.unread !== undefined && tab.unread > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded-full">
                {tab.unread}
              </span>
            )}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
            )}
          </button>
        ))}
      </div>

      {/* 搜索栏 */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" 
               fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={`搜索${activeTab === 'members' ? '成员' : activeTab === 'channels' ? '频道' : '动态'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 
                       border-0 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-h-[400px] overflow-y-auto">
        {activeTab === 'members' && (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {/* 在线成员 */}
            {filteredMembers.filter(m => m.status === 'online' || m.status === 'busy').length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  在线 ({filteredMembers.filter(m => m.status === 'online' || m.status === 'busy').length})
                </div>
                {filteredMembers
                  .filter(m => m.status === 'online' || m.status === 'busy')
                  .map(member => (
                    <MemberCard 
                      key={member.id} 
                      member={member} 
                      onClick={() => onMemberSelect?.(member.id)}
                    />
                  ))}
              </div>
            )}
            
            {/* 离开 */}
            {filteredMembers.filter(m => m.status === 'away').length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  离开 ({filteredMembers.filter(m => m.status === 'away').length})
                </div>
                {filteredMembers
                  .filter(m => m.status === 'away')
                  .map(member => (
                    <MemberCard 
                      key={member.id} 
                      member={member} 
                      onClick={() => onMemberSelect?.(member.id)}
                    />
                  ))}
              </div>
            )}
            
            {/* 离线 */}
            {filteredMembers.filter(m => m.status === 'offline').length > 0 && (
              <div className="opacity-60">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  离线 ({filteredMembers.filter(m => m.status === 'offline').length})
                </div>
                {filteredMembers
                  .filter(m => m.status === 'offline')
                  .map(member => (
                    <MemberCard 
                      key={member.id} 
                      member={member} 
                      onClick={() => onMemberSelect?.(member.id)}
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'channels' && (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredChannels.map(channel => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isActive={selectedChannel === channel.id}
                onClick={() => handleChannelClick(channel.id)}
              />
            ))}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {activities.map(activity => (
              <ActivityItem 
                key={activity.id} 
                activity={activity}
                onClick={() => activity.targetUrl && window.open(activity.targetUrl, '_blank')}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部快捷操作 */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex gap-2">
          <button 
            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium 
                       text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 4v16m8-8H4" />
            </svg>
            新频道
          </button>
          <button 
            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium 
                       text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border 
                       border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 
                       dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 
                       transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            邀请成员
          </button>
        </div>
      </div>
    </div>
  );
});

export default TeamCollaborationHub;