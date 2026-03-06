import { NextRequest, NextResponse } from 'next/server';
import { FeedbackItem, FeedbackCategory, FeedbackStatus } from '@/components/FeedbackSystem';

// 模拟数据库存储 (实际应用中应使用真实数据库)
let feedbacks: FeedbackItem[] = [
  {
    id: 'fb-1',
    userId: 'user-1',
    userName: '张三',
    rating: 4,
    category: 'feature',
    title: '希望增加深色模式',
    content: '建议增加深色模式功能，这样在夜间使用时可以减少眼睛疲劳。深色模式应该可以自动跟随系统设置，也支持手动切换。',
    status: 'reviewing',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    tags: ['UI', '用户体验'],
    responses: [
      {
        id: 'resp-1',
        content: '感谢您的建议！我们正在开发深色模式功能，预计下个版本上线。',
        createdAt: new Date(Date.now() - 43200000).toISOString(),
        isAdmin: true,
      },
    ],
  },
  {
    id: 'fb-2',
    userId: 'user-2',
    userName: '李四',
    rating: 2,
    category: 'bug',
    title: '任务列表无法加载',
    content: '在某些情况下，任务列表会一直显示加载中，刷新页面后仍然无法正常显示。浏览器控制台显示网络请求超时错误。',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    tags: ['任务', '性能'],
  },
  {
    id: 'fb-3',
    userId: 'user-3',
    userName: '王五',
    rating: 5,
    category: 'improvement',
    title: '搜索功能体验很好',
    content: '新版本的搜索功能响应速度很快，结果也很准确，大大提高了工作效率。希望能继续保持这种优化。',
    status: 'resolved',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    tags: ['搜索', '性能'],
  },
];

// GET /api/feedback - 获取反馈列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') as FeedbackCategory | null;
  const status = searchParams.get('status') as FeedbackStatus | null;
  const minRating = searchParams.get('minRating');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  // 过滤
  let filtered = [...feedbacks];
  if (category) {
    filtered = filtered.filter((f) => f.category === category);
  }
  if (status) {
    filtered = filtered.filter((f) => f.status === status);
  }
  if (minRating) {
    filtered = filtered.filter((f) => f.rating >= parseFloat(minRating));
  }

  // 排序 (最新的在前)
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // 分页
  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  return NextResponse.json({
    success: true,
    data: paginated,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  });
}

// POST /api/feedback - 创建新反馈
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userName, rating, category, title, content, tags } = body;

    // 验证必填字段
    if (!userId || !title || !content || rating === undefined) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      );
    }

    // 验证评分范围
    if (rating < 0 || rating > 5) {
      return NextResponse.json(
        { success: false, error: '评分必须在 0-5 之间' },
        { status: 400 }
      );
    }

    // 创建新反馈
    const newFeedback: FeedbackItem = {
      id: `fb-${Date.now()}`,
      userId,
      userName,
      rating,
      category: category || 'other',
      title,
      content,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: tags || [],
    };

    feedbacks.unshift(newFeedback);

    return NextResponse.json({
      success: true,
      data: newFeedback,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '创建反馈失败' },
      { status: 500 }
    );
  }
}
