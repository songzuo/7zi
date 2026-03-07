import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/team/channels
 * 获取团队频道列表
 */
export async function GET(request: NextRequest) {
  const channels = [
    { 
      id: 'general', 
      name: '全体公告', 
      type: 'public', 
      unreadCount: 2,
      lastMessage: { 
        content: '明天上午10点开会', 
        sender: '架构师', 
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString() 
      }
    },
    { 
      id: 'dev', 
      name: '开发组', 
      type: 'public', 
      unreadCount: 0,
      lastMessage: { 
        content: '代码已提交', 
        sender: 'Executor', 
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() 
      }
    },
    { 
      id: 'design', 
      name: '设计组', 
      type: 'public', 
      unreadCount: 5,
      lastMessage: { 
        content: '新的设计稿已上传', 
        sender: '设计师', 
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() 
      }
    },
    { 
      id: 'dm-architect', 
      name: '架构师', 
      type: 'dm', 
      unreadCount: 1,
      lastMessage: { 
        content: '需要讨论一下架构', 
        sender: '架构师', 
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() 
      }
    },
    { 
      id: 'private-core', 
      name: '核心团队', 
      type: 'private', 
      unreadCount: 0,
      lastMessage: { 
        content: '周报已发送', 
        sender: '咨询师', 
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() 
      }
    },
  ];

  const stats = {
    total: channels.length,
    totalUnread: channels.reduce((sum, ch) => sum + ch.unreadCount, 0),
    byType: {
      public: channels.filter(ch => ch.type === 'public').length,
      private: channels.filter(ch => ch.type === 'private').length,
      dm: channels.filter(ch => ch.type === 'dm').length,
    },
  };

  return NextResponse.json({
    success: true,
    data: {
      channels,
      stats,
    },
  });
}

/**
 * POST /api/team/channels
 * 创建新频道
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type = 'public', members = [] } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: '频道名称不能为空' },
        { status: 400 }
      );
    }

    const newChannel = {
      id: `channel-${Date.now()}`,
      name,
      type,
      unreadCount: 0,
      members,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: newChannel,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '创建频道失败' },
      { status: 500 }
    );
  }
}