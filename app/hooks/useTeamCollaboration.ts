'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';

// ============================================================================
// 类型定义
// ============================================================================

type UserStatus = 'online' | 'offline' | 'away' | 'busy';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: UserStatus;
  currentTask?: string;
  avatar?: string;
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

interface TeamStats {
  total: number;
  online: number;
  busy: number;
  away: number;
  offline: number;
}

interface UseTeamCollaborationOptions {
  autoFetch?: boolean;
  fetchInterval?: number;
}

interface UseTeamCollaborationReturn {
  members: TeamMember[];
  channels: TeamChannel[];
  stats: TeamStats | null;
  isLoading: boolean;
  error: Error | null;
  
  fetchMembers: () => Promise<void>;
  fetchChannels: () => Promise<void>;
  
  updateStatus: (status: UserStatus) => Promise<void>;
  createChannel: (name: string, type: 'public' | 'private' | 'dm', members?: string[]) => Promise<void>;
  
  // 过滤
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredMembers: TeamMember[];
  filteredChannels: TeamChannel[];
  
  // 统计
  onlineMembers: TeamMember[];
  totalUnread: number;
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useTeamCollaboration(
  options: UseTeamCollaborationOptions = {}
): UseTeamCollaborationReturn {
  const {
    autoFetch = true,
    fetchInterval = 60000, // 1分钟
  } = options;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [channels, setChannels] = useState<TeamChannel[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 获取成员
  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch('/api/team/members');
      
      if (!response.ok) {
        throw new Error('获取成员列表失败');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setMembers(result.data.members);
        setStats(result.data.stats);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('未知错误'));
    }
  }, []);

  // 获取频道
  const fetchChannels = useCallback(async () => {
    try {
      const response = await fetch('/api/team/channels');
      
      if (!response.ok) {
        throw new Error('获取频道列表失败');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setChannels(result.data.channels);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('未知错误'));
    }
  }, []);

  // 初始加载
  useEffect(() => {
    if (autoFetch) {
      setIsLoading(true);
      Promise.all([fetchMembers(), fetchChannels()])
        .finally(() => setIsLoading(false));
      
      if (fetchInterval > 0) {
        const interval = setInterval(() => {
          fetchMembers();
          fetchChannels();
        }, fetchInterval);
        
        return () => clearInterval(interval);
      }
    }
  }, [autoFetch, fetchInterval, fetchMembers, fetchChannels]);

  // 更新状态
  const updateStatus = useCallback(async (status: UserStatus) => {
    try {
      // 在实际应用中，调用 API 更新状态
      console.log('更新状态:', status);
    } catch (err) {
      console.error('更新状态失败:', err);
    }
  }, []);

  // 创建频道
  const createChannel = useCallback(async (
    name: string, 
    type: 'public' | 'private' | 'dm', 
    members?: string[]
  ) => {
    try {
      const response = await fetch('/api/team/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, members }),
      });
      
      if (!response.ok) {
        throw new Error('创建频道失败');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setChannels(prev => [...prev, result.data]);
      }
    } catch (err) {
      console.error('创建频道失败:', err);
    }
  }, []);

  // 过滤成员
  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members;
    const query = searchQuery.toLowerCase();
    return members.filter(m => 
      m.name.toLowerCase().includes(query) ||
      m.role.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  // 过滤频道
  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channels;
    const query = searchQuery.toLowerCase();
    return channels.filter(ch => 
      ch.name.toLowerCase().includes(query)
    );
  }, [channels, searchQuery]);

  // 在线成员
  const onlineMembers = useMemo(() => 
    members.filter(m => m.status === 'online' || m.status === 'busy'),
    [members]
  );

  // 未读总数
  const totalUnread = useMemo(() => 
    channels.reduce((sum, ch) => sum + ch.unreadCount, 0),
    [channels]
  );

  return {
    members,
    channels,
    stats,
    isLoading,
    error,
    
    fetchMembers,
    fetchChannels,
    
    updateStatus,
    createChannel,
    
    searchQuery,
    setSearchQuery,
    filteredMembers,
    filteredChannels,
    
    onlineMembers,
    totalUnread,
  };
}

export type { 
  TeamMember, 
  TeamChannel, 
  TeamStats, 
  UserStatus,
  UseTeamCollaborationReturn 
};