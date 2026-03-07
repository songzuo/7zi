import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/notifications
 * 获取通知列表
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const filter = searchParams.get('filter') || 'all'; // all, unread, task, system, mention, message, alert
  const search = searchParams.get('search') || '';

  // Mock 数据
  const notifications = [
    {
      id: '1',
      type: 'success',
      category: 'task',
      priority: 'high',
      title: '任务完成',
      message: 'Executor 完成了"实现团队协作功能"任务',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      read: false,
      icon: '✅',
      sender: { id: 'executor', name: 'Executor' },
      actionUrl: '/tasks/123',
      actionText: '查看详情',
    },
    {
      id: '2',
      type: 'info',
      category: 'mention',
      priority: 'normal',
      title: '有人@了你',
      message: '架构师 在"数据库优化"任务评论中提到了你',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      read: false,
      icon: '@',
      sender: { id: 'architect', name: '架构师' },
      actionUrl: '/tasks/456#comment-789',
      actionText: '查看评论',
    },
    {
      id: '3',
      type: 'warning',
      category: 'system',
      priority: 'high',
      title: '系统维护通知',
      message: '系统将于今晚 22:00-23:00 进行例行维护',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      read: true,
      icon: '⚠️',
    },
    {
      id: '4',
      type: 'info',
      category: 'message',
      priority: 'normal',
      title: '新消息',
      message: '咨询师: 你好，关于调研报告有个问题想讨论一下...',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      read: true,
      icon: '💬',
      sender: { id: 'consultant', name: '咨询师' },
      actionUrl: '/messages/dm-consultant',
      actionText: '回复',
    },
    {
      id: '5',
      type: 'error',
      category: 'alert',
      priority: 'urgent',
      title: '部署失败',
      message: '生产环境部署失败，请检查日志并重试',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      read: false,
      icon: '🚨',
      actionUrl: '/deploy/logs',
      actionText: '查看日志',
    },
  ];

  // 过滤
  let filtered = [...notifications];
  
  if (filter === 'unread') {
    filtered = filtered.filter(n => !n.read);
  } else if (filter !== 'all') {
    filtered = filtered.filter(n => n.category === filter);
  }
  
  if (search) {
    const query = search.toLowerCase();
    filtered = filtered.filter(n => 
      n.title.toLowerCase().includes(query) ||
      n.message.toLowerCase().includes(query)
    );
  }

  // 排序：未读优先，然后按优先级和时间
  const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
  filtered.sort((a: any, b: any) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    if (a.priority !== b.priority) {
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // 分页
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  return NextResponse.json({
    success: true,
    data: {
      notifications: paginated,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
      stats: {
        total: notifications.length,
        unread: notifications.filter((n: any) => !n.read).length,
        urgent: notifications.filter((n: any) => n.priority === 'urgent' && !n.read).length,
      },
    },
  });
}

/**
 * POST /api/notifications
 * 创建新通知（内部使用）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证必需字段
    const { type, category, priority, title, message } = body;
    
    if (!type || !category || !priority || !title || !message) {
      return NextResponse.json(
        { success: false, error: '缺少必需字段' },
        { status: 400 }
      );
    }

    // 创建通知
    const notification = {
      id: `notification-${Date.now()}`,
      ...body,
      timestamp: new Date().toISOString(),
      read: false,
      dismissed: false,
    };

    // 在实际应用中，这里应该：
    // 1. 保存到数据库
    // 2. 通过 WebSocket 推送给相关用户
    // 3. 如果是高优先级，可能还需要发送邮件/短信

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '创建通知失败' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * 批量更新通知状态
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, notificationIds } = body;

    if (!action || !notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { success: false, error: '无效的请求参数' },
        { status: 400 }
      );
    }

    let updatedCount = 0;

    switch (action) {
      case 'mark_read':
        // 标记为已读
        updatedCount = notificationIds.length;
        break;
      case 'mark_all_read':
        // 全部标记为已读
        updatedCount = 999; // mock
        break;
      case 'dismiss':
        // 关闭通知
        updatedCount = notificationIds.length;
        break;
      case 'clear_read':
        // 清除已读通知
        updatedCount = 999; // mock
        break;
      default:
        return NextResponse.json(
          { success: false, error: '未知的操作' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: { updatedCount },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '更新通知失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications
 * 删除通知
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ids = searchParams.get('ids')?.split(',') || [];

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: '未指定要删除的通知' },
        { status: 400 }
      );
    }

    // 在实际应用中，从数据库删除

    return NextResponse.json({
      success: true,
      data: { deletedCount: ids.length },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '删除通知失败' },
      { status: 500 }
    );
  }
}