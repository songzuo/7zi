import { NextRequest, NextResponse } from 'next/server';
import { FeedbackStatus, FeedbackResponse } from '@/components/FeedbackSystem';

// 模拟数据库
// 注意：在实际应用中，这应该从共享的数据库模块导入
// 这里为了演示，我们使用一个简单的内存存储
const feedbackStore: Record<string, {
  status: FeedbackStatus;
  responses: FeedbackResponse[];
}> = {};

// PATCH /api/feedback/[id] - 更新反馈状态
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, response } = body as {
      status?: FeedbackStatus;
      response?: string;
    };

    // 初始化该反馈的存储
    if (!feedbackStore[id]) {
      feedbackStore[id] = {
        status: 'pending',
        responses: [],
      };
    }

    // 更新状态
    if (status) {
      const validStatuses: FeedbackStatus[] = ['pending', 'reviewing', 'resolved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: '无效的状态值' },
          { status: 400 }
        );
      }
      feedbackStore[id].status = status;
    }

    // 添加回复
    if (response) {
      const newResponse: FeedbackResponse = {
        id: `resp-${Date.now()}`,
        content: response,
        createdAt: new Date().toISOString(),
        isAdmin: true,
      };
      feedbackStore[id].responses.push(newResponse);
    }

    return NextResponse.json({
      success: true,
      data: {
        id,
        ...feedbackStore[id],
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '更新失败' },
      { status: 500 }
    );
  }
}

// GET /api/feedback/[id] - 获取单个反馈详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 从存储中获取
    const storedData = feedbackStore[id];
    
    if (!storedData) {
      return NextResponse.json(
        { success: false, error: '反馈不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id,
        ...storedData,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '获取失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/feedback/[id] - 删除反馈
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!feedbackStore[id]) {
      return NextResponse.json(
        { success: false, error: '反馈不存在' },
        { status: 404 }
      );
    }

    delete feedbackStore[id];

    return NextResponse.json({
      success: true,
      message: '反馈已删除',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '删除失败' },
      { status: 500 }
    );
  }
}
